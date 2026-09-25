import { Component, OnInit, ChangeDetectionStrategy, OnDestroy, Inject, HostListener, ElementRef ,ChangeDetectorRef, AfterViewInit, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl, AbstractControl, FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { AttendanceService } from '../../services/attendance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MatDialogRef } from '@angular/material/dialog';
import { Employee, Department } from '@/app/core/models/employee.models';
import { DepartmentEmployee } from '../../../../core/models/attendance.models';
import { PerformanceService } from '@/app/features/performance/services/performance.service';
import { GeoFenceService, GeoFenceDto, ShiftGeoFenceDto } from '../../services/geofence.service';
import { SharedCommonModule } from '@shared/shared-common.module';
declare const L: any;

export interface ShiftDto {
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  daysOfWeek: number[];
  timezone: string;
  isActive: boolean;
}


@Component({
  selector: 'app-assign-shift',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatCheckboxModule,
    MatDialogModule
  ],
  templateUrl: './assign-shift.component.html',
  styleUrls: ['./assign-shift.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignShiftComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('assignShiftFenceMap') assignShiftFenceMap!: ElementRef;

  assignShiftForm: FormGroup;
  employees: Employee[] = [];
  shifts: ShiftDto[] = [];
  departments: Department[] = [];
  departmentEmployees: DepartmentEmployee[] = [];
  departmentControl = new FormControl('');
  isSubmitting = false;
  isManager = false;
  employeeFilter = '';

  // ── Currency-style dropdown state ──────────────────────────
  employeeDropdownOpen = false;
  submitted = false;

  selectedShiftFences: ShiftGeoFenceDto[] = [];
  isFencesLoading = false;
  private shiftFenceMap: any;
  private shiftFenceLayers: any[] = [];
  // ───────────────────────────────────────────────────────────

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private attendanceService: AttendanceService,
    private notification: NotificationService,
    private geoFenceService: GeoFenceService,
    private cdr: ChangeDetectorRef,
    private dialogRef: MatDialogRef<AssignShiftComponent>,
    private performanceService: PerformanceService,
    private elementRef: ElementRef,
    @Inject(MAT_DIALOG_DATA) public data?: { isManager?: boolean }
  ) {
    this.isManager = data?.isManager || false;
    this.assignShiftForm = this.fb.group({
      SelectedEmployees: [[], this.atLeastOneSelected],
      shiftId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadShifts();

    this.assignShiftForm.get('shiftId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((shiftId: string) => {
        setTimeout(() => this.loadShiftFences(shiftId), 0);
      });

    if (this.isManager) {
      this.loadManagerTeamEmployees();
    } else {
      this.loadDepartments();
      this.loadAllEmployees();
      this.departmentControl.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((departmentId) => {
          if (departmentId) {
            this.loadEmployeesByDepartment(departmentId);
          } else {
            this.loadAllEmployees();
            this.assignShiftForm.get('SelectedEmployees')?.setValue([]);
          }
        });
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initShiftFenceMap(), 0);
  }

  private initShiftFenceMap(): void {
    if (!this.assignShiftFenceMap?.nativeElement) return;
    if (typeof L === 'undefined') {
      setTimeout(() => this.initShiftFenceMap(), 200);
      return;
    }

    if (this.shiftFenceMap) {
      this.shiftFenceMap.remove();
      this.shiftFenceMap = null;
    }

    this.shiftFenceMap = L.map(this.assignShiftFenceMap.nativeElement, {
      center: [31.5204, 74.3587],
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this.shiftFenceMap);
  }

  private loadShiftFences(shiftId: string): void {
    if (!shiftId) {
      this.selectedShiftFences = [];
      this.renderShiftFencesOnMap();
      this.cdr.markForCheck();
      return;
    }

    if (!this.shiftFenceMap) {
      this.initShiftFenceMap();
    }

    this.isFencesLoading = true;
    this.geoFenceService.getByShift(shiftId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (linkedFences: ShiftGeoFenceDto[]) => {
          this.selectedShiftFences = linkedFences.filter(f => f.isActive);
          this.isFencesLoading = false;
          this.renderShiftFencesOnMapFromLinked();
          this.cdr.markForCheck();
        },
        error: () => {
          this.selectedShiftFences = [];
          this.isFencesLoading = false;
          this.renderShiftFencesOnMapFromLinked();
          this.cdr.markForCheck();
        }
      });
  }

  
  private renderShiftFencesOnMapFromLinked(): void {
    if (!this.shiftFenceMap) return;

    this.shiftFenceLayers.forEach(layer => this.shiftFenceMap.removeLayer(layer));
    this.shiftFenceLayers = [];

    if (!this.selectedShiftFences.length) {
      this.shiftFenceMap.setView([31.5204, 74.3587], 12);
      return;
    }

    const fenceIds = this.selectedShiftFences.map(f => f.geoFenceId);
    this.geoFenceService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (allFences) => {
          const idSet = new Set(fenceIds);
          const matchedFences = (allFences || []).filter(f => idSet.has(f.geoFenceId));
          const points: [number, number][] = [];

          matchedFences.forEach((fence) => {
            if (!fence.centerLatitude || !fence.centerLongitude) return;
            points.push([fence.centerLatitude, fence.centerLongitude]);
            const circle = L.circle([fence.centerLatitude, fence.centerLongitude], {
              radius: fence.radiusMeters || 200,
              color: '#6C5CE7',
              fillColor: '#6C5CE7',
              fillOpacity: 0.2,
              weight: 2
            }).addTo(this.shiftFenceMap);
            circle.bindPopup(`<b>${fence.name}</b><br>Radius: ${fence.radiusMeters || 0}m`);
            this.shiftFenceLayers.push(circle);
          });

          if (points.length) {
            this.shiftFenceMap.fitBounds(points as any, { padding: [30, 30] });
          }
          this.cdr.markForCheck();
        },
        error: () => { /* map stays at default view */ }
      });
  }

  // Legacy kept for compatibility but no longer called
  private renderShiftFencesOnMap(): void {
    if (!this.shiftFenceMap) return;
    this.shiftFenceLayers.forEach(layer => this.shiftFenceMap.removeLayer(layer));
    this.shiftFenceLayers = [];
    this.shiftFenceMap.setView([31.5204, 74.3587], 12);
  }

  // ── Currency-style dropdown methods ────────────────────────

  openEmployeeDropdown(): void {
    this.employeeFilter = '';
    this.employeeDropdownOpen = true;
  }

  toggleEmployeeDropdown(): void {
    if (this.employeeDropdownOpen) {
      this.closeEmployeeDropdown();
    } else {
      this.openEmployeeDropdown();
    }
  }

  closeEmployeeDropdown(): void {
    this.employeeDropdownOpen = false;
    this.employeeFilter = '';
    this.cdr.markForCheck();
  }

  onEmployeeSearch(value: string): void {
    this.employeeFilter = value;
  }

  toggleEmployee(emp: any): void {
    const control = this.assignShiftForm.get('SelectedEmployees');
    if (!control) return;
    const current: string[] = control.value || [];
    const id: string = emp.employeeId;
    if (current.includes(id)) {
      control.setValue(current.filter((v: string) => v !== id));
    } else {
      control.setValue([...current, id]);
    }
    this.cdr.markForCheck();
  }

  isEmployeeSelected(employeeId: string): boolean {
    const selected: string[] = this.assignShiftForm.get('SelectedEmployees')?.value || [];
    return selected.includes(employeeId);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.employeeDropdownOpen) return;
    const target = event.target as HTMLElement | null;
    if (!target) { this.closeEmployeeDropdown(); return; }
    const insideContainer = !!target.closest('.employee-dropdown-container');
    const insidePanel = !!target.closest('.employee-dropdown-panel');
    if (!insideContainer && !insidePanel) {
      this.closeEmployeeDropdown();
    }
  }

  // ───────────────────────────────────────────────────────────

  private loadDepartments(): void {
    this.employeeService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (departments) => this.departments = departments,
        error: () => this.notification.showError('Failed to load departments')
      });
  }

  private loadAllEmployees(): void {
    this.employeeService.getEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const list = res?.employees || [];
          this.employees = (list || []).filter((e: any) => ((e.status || '').toString().toLowerCase() === 'active'));
        },
        error: () => this.notification.showError('Failed to load employees')
      });
  }

  private loadEmployeesByDepartment(departmentId: string): void {
    this.attendanceService.getDepartmentEmployees(departmentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (deptEmployees) => {
          const list = deptEmployees || [];
          this.departmentEmployees = (list || []).filter((e: any) => ((e.status || '').toString().toLowerCase() === 'active'));
          this.assignShiftForm.get('SelectedEmployees')?.setValue([]);
        },
        error: (err) => {
          const errorMessage = err?.error?.message || err?.message || 'Failed to load employees';
          this.notification.showError(errorMessage);
        }
      });
  }

  private loadManagerTeamEmployees(): void {
    this.performanceService.getMyTeamEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const active = (res.data || []).filter((emp: any) => ((emp.status || '').toString().toLowerCase() === 'active'));
            this.employees = active.map((emp: any) => ({
              employeeId: emp.employeeId ? (typeof emp.employeeId === 'string' ? emp.employeeId : emp.employeeId.toString()) : '',
              organizationId: '',
              employeeCode: emp.employeeCode || '',
              employeeNumber: emp.employeeCode || '',
              firstName: emp.firstName || '',
              lastName: emp.lastName || '',
              fullName: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
              email: emp.email || '',
              phone: emp.phone,
              hireDate: emp.hireDate ? (typeof emp.hireDate === 'string' ? emp.hireDate : new Date(emp.hireDate).toISOString().split('T')[0]) : '',
              status: emp.status || 'active',
              profilePictureUrl: emp.profilePictureUrl || '',
              createdAt: '',
              updatedAt: '',
              workLocation: '',
              basicSalary: 0
            }));
          } else {
            this.employees = [];
          }
        },
        error: () => this.notification.showError('Failed to load team employees')
      });
  }

  private loadShifts(): void {
    this.attendanceService.getShifts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.shifts = res || [],
        error: () => this.notification.showError('Failed to load shifts')
      });
  }

  get filteredEmployees(): any[] {
    const q = (this.employeeFilter || '').toLowerCase().trim();
    const list: any[] = (!this.isManager && this.departmentControl.value) ? this.departmentEmployees : this.employees;
    if (!q) return list || [];
    return (list || []).filter(emp => {
      const name = ((emp.fullName) || ((emp.firstName || '') + ' ' + (emp.lastName || ''))).toString().toLowerCase();
      const code = (emp.employeeCode || emp.employeeNumber || '').toString().toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }

  get selectedButHidden(): any[] {
    const selected: string[] = this.assignShiftForm.get('SelectedEmployees')?.value || [];
    if (!selected.length || !this.employeeFilter) return [];
    const visibleIds = new Set(this.filteredEmployees.map(e => e.employeeId));
    const list: any[] = (!this.isManager && this.departmentControl.value) ? this.departmentEmployees : this.employees;
    return list.filter(emp => selected.includes(emp.employeeId) && !visibleIds.has(emp.employeeId));
  }

  displayName(emp: any): string {
    return emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
  }

  getInitials(emp: any): string {
    const name = emp?.fullName || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim();
    if (!name) return '';
    return name.split(' ').filter(Boolean).map((n: string) => (n && n.length ? n[0] : '')).join('').toUpperCase();
  }

  clearAllEmployees(): void {
    this.assignShiftForm.get('SelectedEmployees')?.setValue([]);
  }

  getAvatarBg(emp: any): string {
    const colors = ['#F44336','#E91E63','#9C27B0','#3F51B5','#2196F3','#03A9F4','#009688','#4CAF50','#8BC34A','#FF9800','#795548','#607D8B'];
    const key = (emp?.employeeId || emp?.email || emp?.fullName || emp?.employeeCode || '').toString();
    if (!key) return colors[0];
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getAvatarColor(emp: any): string {
    const bg = this.getAvatarBg(emp).replace('#','');
    const r = parseInt(bg.substring(0,2),16);
    const g = parseInt(bg.substring(2,4),16);
    const b = parseInt(bg.substring(4,6),16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b)/255;
    return luminance > 0.6 ? '#000000' : '#FFFFFF';
  }

  isAllVisibleSelected(): boolean {
    const selected: string[] = this.assignShiftForm.get('SelectedEmployees')?.value || [];
    const visible = this.filteredEmployees || [];
    if (!visible.length) return false;
    const visibleIds = visible.map(e => e.employeeId);
    return visibleIds.every(id => selected.includes(id));
  }

  toggleSelectAll(): void {
    const control = this.assignShiftForm.get('SelectedEmployees');
    if (!control) return;
    const visible = this.filteredEmployees || [];
    const fallbackList: any[] = (!this.isManager && this.departmentControl.value) ? this.departmentEmployees : this.employees;
    const listToUse = visible.length ? visible : (fallbackList || []);
    const ids = (listToUse || []).map(e => e.employeeId).filter(Boolean);
    const current: string[] = control.value || [];
    const allSelected = ids.length > 0 && ids.every(id => current.includes(id));
    if (allSelected) {
      control.setValue(current.filter((id: string) => !ids.includes(id)));
    } else {
      control.setValue(Array.from(new Set([...(current || []), ...ids])));
    }
    this.cdr.markForCheck();
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.assignShiftForm.invalid) {
      this.markFormGroupTouched(this.assignShiftForm);
      this.notification.showError('Please correct the highlighted fields');
      return;
    }
    this.isSubmitting = true;
    const formValue = this.assignShiftForm.value;
    const payload: any = {
      shiftId: formValue.shiftId,
      SelectedEmployees: formValue.SelectedEmployees || []
    };
    this.attendanceService.assignShift(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notification.showSuccess('Shift assigned successfully');
          this.assignShiftForm.reset({ SelectedEmployees: [], shiftId: '' });
          this.departmentControl.setValue('');
          this.isSubmitting = false;
          this.submitted = false;
          this.dialogRef.close('assigned');
        },
        error: (error) => {
          const errorMessage = error?.error?.message || error?.message || 'Failed to assign shift';
          this.notification.showError(errorMessage);
          this.isSubmitting = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.shiftFenceMap) {
      this.shiftFenceMap.remove();
      this.shiftFenceMap = null;
    }
  }

  private atLeastOneSelected(control: AbstractControl) {
    const val = control.value;
    return Array.isArray(val) && val.length > 0 ? null : { required: true };
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
