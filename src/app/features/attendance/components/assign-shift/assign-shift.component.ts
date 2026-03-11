import { Component, OnInit, ChangeDetectionStrategy, OnDestroy, Inject, HostListener, ElementRef } from '@angular/core';
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
export class AssignShiftComponent implements OnInit, OnDestroy {
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
  // ───────────────────────────────────────────────────────────

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private attendanceService: AttendanceService,
    private notification: NotificationService,
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

  // ── Currency-style dropdown methods ────────────────────────

  /** Opens the dropdown and clears the search so the user types fresh */
  openEmployeeDropdown(): void {
    this.employeeFilter = '';
    this.employeeDropdownOpen = true;
  }

  /** Toggles open/close — used by the chevron icon click */
  toggleEmployeeDropdown(): void {
    if (this.employeeDropdownOpen) {
      this.closeEmployeeDropdown();
    } else {
      this.openEmployeeDropdown();
    }
  }

  /** Closes the dropdown and resets the search filter */
  closeEmployeeDropdown(): void {
    this.employeeDropdownOpen = false;
    this.employeeFilter = '';
  }

  /** Fires on every keystroke inside the search input */
  onEmployeeSearch(value: string): void {
    this.employeeFilter = value;
  }

  /** Toggles a single employee in/out of the selected list */
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
  }

  /** Returns true if a given employeeId is in the current selection */
  isEmployeeSelected(employeeId: string): boolean {
    const selected: string[] = this.assignShiftForm.get('SelectedEmployees')?.value || [];
    return selected.includes(employeeId);
  }

  /** Closes dropdown when user clicks outside the component */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.employeeDropdownOpen) return;

    const target = event.target as HTMLElement | null;
    if (!target) {
      this.closeEmployeeDropdown();
      return;
    }

    // If the click happened inside the input/container/panel, keep it open
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

  // Returns selected employees that are NOT currently visible in the filtered list
  // so we can render them as hidden options to prevent mat-select from deselecting them
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
    return name
      .split(' ')
      .filter(Boolean)
      .map((n: string) => (n && n.length ? n[0] : ''))
      .join('')
      .toUpperCase();
  }

  clearAllEmployees(): void {
    this.assignShiftForm.get('SelectedEmployees')?.setValue([]);
  }

  // Deterministic background color for avatar based on employee id/email
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

  // Choose a readable text color (black/white) based on bg luminance
  getAvatarColor(emp: any): string {
    const bg = this.getAvatarBg(emp).replace('#','');
    const r = parseInt(bg.substring(0,2),16);
    const g = parseInt(bg.substring(2,4),16);
    const b = parseInt(bg.substring(4,6),16);
    // Perceived luminance
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
    // Fallback to department/employees if filter returns nothing
    const fallbackList: any[] = (!this.isManager && this.departmentControl.value) ? this.departmentEmployees : this.employees;
    const listToUse = visible.length ? visible : (fallbackList || []);
    const ids = (listToUse || []).map(e => e.employeeId).filter(Boolean);

    const current: string[] = control.value || [];
    const allSelected = ids.length > 0 && ids.every(id => current.includes(id));

    if (allSelected) {
      // Deselect visible ids
      const remaining = current.filter((id: string) => !ids.includes(id));
      control.setValue(remaining);
    } else {
      // Add visible ids to selection (avoid duplicates)
      const next = Array.from(new Set([...(current || []), ...ids]));
      control.setValue(next);
    }
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