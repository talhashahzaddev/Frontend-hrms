import { Component, OnInit, ChangeDetectionStrategy, OnDestroy, Inject, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
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
import { AttendanceService } from '@/app/features/attendance/services/attendance.service';
import { PerformanceService } from '../../services/performance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MatDialogRef } from '@angular/material/dialog';
import { Employee, Department } from '@/app/core/models/employee.models';
import { DepartmentEmployee } from '../../../../core/models/attendance.models';
import { Goal } from '../../../../core/models/performance.models';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface AssignGoalPayload {
  goalId: string;
  assignedTo: string;
}


@Component({
  selector: 'app-assign-goals-dialog',
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
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>flag</mat-icon>
          </div>
          <div>
            <h2 class="header-title">Assign Goal</h2>
            <p class="header-subtitle">Assign a goal to a team member</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-body">
        <form [formGroup]="assignGoalsForm" (ngSubmit)="onSubmit()">

          <div class="assign-section">
            <div class="assign-section-header">
              <mat-icon>person_add</mat-icon>
              <span>Assignment Details</span>
            </div>
            <div class="assign-section-body">

              <!-- Goal Display (read-only text) -->
              <div class="assign-field-group">
                <label class="field-label">Goal</label>
                <div class="goal-display-card">
                  <div class="goal-display-text">
                    <span class="goal-title">{{ getGoalTitle(assignGoalsForm.get('goalId')?.value) || 'No goal selected' }}</span>
                  </div>
                </div>
              </div>

              <!-- Department Dropdown (only for non-managers) -->
              <div class="assign-field-group" *ngIf="!isManager">
                <label class="field-label">Filter by Department</label>
                <mat-form-field appearance="outline" class="mat-field">
                  <mat-select [formControl]="departmentControl" placeholder="All Departments">
                    <mat-option value="">All Departments</mat-option>
                    <mat-option *ngFor="let dept of departments" [value]="dept.departmentId">
                      {{ dept.departmentName }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <!-- Employee Selection -->
              <div class="assign-field-group" style="position: relative;">
                <label class="field-label">Assign To <span class="required">*</span></label>

                <div style="display: flex; flex-direction: column; width: 100%;">
                  <!-- Search input -->
                  <div class="employee-search-box" (click)="openEmployeeDropdown()" [class.open]="employeeDropdownOpen" [class.has-error]="assignGoalsForm.get('selectedEmployee')?.hasError('required') && submitted">
                    <mat-icon class="search-icon">search</mat-icon>
                    <input
                      type="text"
                      class="employee-search-input"
                      placeholder="Search by name or code..."
                      [(ngModel)]="employeeFilter"
                      (ngModelChange)="onEmployeeSearch($event)"
                      (focus)="openEmployeeDropdown()"
                      [ngModelOptions]="{standalone: true}"
                    />
                    <button type="button" class="search-clear-btn" *ngIf="employeeFilter" (click)="employeeFilter = ''; cdr.markForCheck()">
                      <mat-icon>close</mat-icon>
                    </button>
                    <mat-icon class="chevron" [class.rotated]="employeeDropdownOpen">expand_more</mat-icon>
                  </div>

                  <!-- Dropdown Panel -->
                  <div class="employee-dropdown-panel" *ngIf="employeeDropdownOpen">
                    <div class="dropdown-header" *ngIf="filteredEmployees.length > 0">
                      <span class="dropdown-count">{{ filteredEmployees.length }} employee{{ filteredEmployees.length !== 1 ? 's' : '' }}</span>
                    </div>
                    <div class="employee-list" *ngIf="filteredEmployees.length > 0">
                      <div
                        class="employee-option"
                        *ngFor="let emp of filteredEmployees"
                        (click)="selectEmployee(emp)"
                        [class.is-selected]="assignGoalsForm.get('selectedEmployee')?.value === emp.employeeId"
                      >
                        <div class="emp-avatar"
                             [style.backgroundColor]="getAvatarBg(emp)"
                             [style.color]="getAvatarColor(emp)">
                          {{ getInitials(emp) }}
                        </div>
                        <div class="emp-info">
                          <span class="emp-name">{{ displayName(emp) }}</span>
                          <span class="emp-code">{{ emp.employeeCode }}</span>
                        </div>
                        <mat-icon class="check-icon" *ngIf="assignGoalsForm.get('selectedEmployee')?.value === emp.employeeId">check_circle</mat-icon>
                      </div>
                    </div>
                    <div class="empty-state" *ngIf="filteredEmployees.length === 0">
                      <mat-icon>person_search</mat-icon>
                      <p>No employees found</p>
                    </div>
                  </div>
                </div>

                <!-- Selected Employee Chip -->
                <div class="selected-employee-chip" *ngIf="getSelectedEmployee() && !employeeDropdownOpen">
                  <div class="emp-avatar chip-avatar"
                       [style.backgroundColor]="getAvatarBg(getSelectedEmployee()!)"
                       [style.color]="getAvatarColor(getSelectedEmployee()!)">
                    {{ getInitials(getSelectedEmployee()!) }}
                  </div>
                  <div class="emp-info">
                    <span class="emp-name">{{ displayName(getSelectedEmployee()!) }}</span>
                    <span class="emp-code">{{ getSelectedEmployee()?.employeeCode }}</span>
                  </div>
                  <button type="button" class="chip-remove" (click)="resetEmployeeSelection()">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>

                <span class="field-error" *ngIf="assignGoalsForm.get('selectedEmployee')?.hasError('required') && submitted" style="color: #ef4444; font-size: 11px; margin-top: 4px;">
                  Please select an employee
                </span>
              </div>

            </div>
          </div>

        </form>
      </mat-dialog-content>

      <div class="dialog-footer">
        <button mat-stroked-button class="btn-cancel" mat-dialog-close [disabled]="isSubmitting">Cancel</button>
        <button mat-flat-button class="btn-submit" (click)="onSubmit()" [disabled]="isSubmitting">
          <mat-icon *ngIf="!isSubmitting">assignment_turned_in</mat-icon>
          <mat-spinner diameter="16" *ngIf="isSubmitting" style="margin-right:8px;"></mat-spinner>
          <span *ngIf="!isSubmitting">Assign Goal</span>
          <span *ngIf="isSubmitting">Assigning...</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    @use '../../styles/performance-shared';

    .dialog-body {
      overflow: visible !important;
    }

    /* ── Goal Display Card ──────────────────────────────── */
    .goal-display-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: #f8f9ff;
      border: 1px solid #e8eaf6;
      border-radius: 8px;
    }

    .goal-display-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .goal-title {
      font-size: 14px;
      font-weight: 500;
      color: #1a1a2e;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Employee Search Box ─────────────────────────────── */
    .employee-search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      height: 44px;
      border: 1.5px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
      cursor: text;
      transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    }

    .employee-search-box:hover {
      border-color: #bdbdbd;
      background: #f5f5f5;
    }

    .employee-search-box.open {
      border-color: #3f51b5;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.1);
      border-radius: 8px 8px 0 0;
    }

    .employee-search-box.has-error {
      border-color: #f44336;
    }

    .search-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #9e9e9e;
      flex-shrink: 0;
    }

    .employee-search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 14px;
      color: #212121;
      outline: none;
      min-width: 0;
    }

    .search-clear-btn {
      background: none;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      color: #9e9e9e;
      padding: 0;
      flex-shrink: 0;
    }

    .chevron {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #9e9e9e;
      transition: transform 0.2s ease;
      flex-shrink: 0;
    }

    .chevron.rotated {
      transform: rotate(180deg);
    }

    /* ── Dropdown Panel ──────────────────────────────────── */
    .employee-dropdown-panel {
      border: 1.5px solid #3f51b5;
      border-top: none;
      border-radius: 0 0 8px 8px;
      background: #fff;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
      max-height: 240px;
      overflow-y: auto;
      width: 100%;
    }

    .dropdown-header {
      padding: 8px 14px;
      background: #f8f9ff;
      border-bottom: 1px solid #e8eaf6;
    }

    .dropdown-count {
      font-size: 11px;
      font-weight: 600;
      color: #7986cb;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .employee-list {
      display: flex;
      flex-direction: column;
    }

    .employee-option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      cursor: pointer;
      transition: background 0.12s;
      border-bottom: 1px solid #fafafa;
    }

    .employee-option:hover {
      background: #f5f6ff;
    }

    .employee-option.is-selected {
      background: #ede7f6;
    }

    .check-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #5c6bc0;
      margin-left: auto;
      flex-shrink: 0;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 28px 16px;
      gap: 8px;
      color: #bdbdbd;
    }

    /* ── Avatar ──────────────────────────────────────────── */
    .emp-avatar {
      width: 34px;
      height: 34px;
      min-width: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .chip-avatar {
      width: 32px;
      height: 32px;
      min-width: 32px;
      font-size: 11px;
    }

    /* ── Employee Info ────────────────────────────────────── */
    .emp-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .emp-name {
      font-size: 13px;
      font-weight: 500;
      color: #212121;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .emp-code {
      font-size: 11px;
      color: #bdbdbd;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Selected Employee Chip ──────────────────────────── */
    .selected-employee-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: #ede7f6;
      border: 1px solid #ce93d8;
      border-radius: 8px;
      margin-top: 6px;
    }

    .chip-remove {
      background: none;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      color: #9e9e9e;
      padding: 0;
      margin-left: auto;
      flex-shrink: 0;
      border-radius: 4px;
    }

    .chip-remove:hover {
      color: #f44336;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignGoalsDialogComponent implements OnInit, OnDestroy {
  assignGoalsForm: FormGroup;
  employees: Employee[] = [];
  goals: Goal[] = [];
  departments: Department[] = [];
  departmentEmployees: DepartmentEmployee[] = [];
  departmentControl = new FormControl('');
  isSubmitting = false;
  isManager = false;
  employeeFilter = '';
  employeeDropdownOpen = false;
  submitted = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private attendanceService: AttendanceService,
    private performanceService: PerformanceService,
    private notification: NotificationService,
    public cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<AssignGoalsDialogComponent>,
    private elementRef: ElementRef,
    @Inject(MAT_DIALOG_DATA) public data?: { isManager?: boolean; goal?: Goal }
  ) {
    this.isManager = data?.isManager || false;
    const preselectedGoalId = data?.goal?.goalId || '';
    this.assignGoalsForm = this.fb.group({
      goalId: [preselectedGoalId, Validators.required],
      selectedEmployee: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadGoals();

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
            this.resetEmployeeSelection();
          }
        });
    }
  }

  // ── Employee dropdown methods ────────────────────────

  openEmployeeDropdown(): void {
    this.employeeDropdownOpen = true;
    this.cdr.markForCheck();
  }

  closeEmployeeDropdown(): void {
    this.employeeDropdownOpen = false;
    this.employeeFilter = '';
    this.cdr.markForCheck();
  }

  onEmployeeSearch(value: string): void {
    this.employeeFilter = value;
    this.employeeDropdownOpen = true;
    this.cdr.markForCheck();
  }

  selectEmployee(emp: any): void {
    this.assignGoalsForm.get('selectedEmployee')?.setValue(emp.employeeId);
    this.closeEmployeeDropdown();
    this.cdr.markForCheck();
  }

  getSelectedEmployee(): Employee | undefined {
    const selectedId = this.assignGoalsForm.get('selectedEmployee')?.value;
    const list: any[] = (!this.isManager && this.departmentControl.value) ? this.departmentEmployees : this.employees;
    return list.find(emp => emp.employeeId === selectedId);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.employeeDropdownOpen) return;
    const target = event.target as HTMLElement | null;
    if (!target) { this.closeEmployeeDropdown(); return; }
    // Check if click was inside the assign-field-group containing the dropdown
    const insideContainer = !!target.closest('.assign-field-group');
    if (!insideContainer) {
      this.closeEmployeeDropdown();
    }
  }

  // ── Data loading ──────────────────────────────────────

  private loadDepartments(): void {
    this.employeeService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (departments) => {
          this.departments = departments;
          this.cdr.markForCheck();
        },
        error: () => this.notification.showError('Failed to load departments')
      });
  }

  private loadAllEmployees(): void {
    this.employeeService.getEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const list = res?.employees || [];
          this.employees = list.filter((e: any) => (e.status || '').toString().toLowerCase() === 'active' || e.isActive === true);
          this.cdr.markForCheck();
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
          this.departmentEmployees = list.filter((e: any) => (e.status || '').toString().toLowerCase() === 'active' || e.isActive === true);
          this.resetEmployeeSelection();
          this.cdr.markForCheck();
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || 'Failed to load employees';
          this.notification.showError(msg);
        }
      });
  }

  private loadManagerTeamEmployees(): void {
    this.performanceService.getMyTeamEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const active = (res.data || []).filter((emp: any) => (emp.status || '').toString().toLowerCase() === 'active' || emp.isActive === true);
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
          this.cdr.markForCheck();
        },
        error: () => this.notification.showError('Failed to load team employees')
      });
  }

  private loadGoals(): void {
    this.performanceService.getAllGoals()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const list = res?.data || [];
          this.goals = list.filter((g: any) => g.isActive);
          this.cdr.markForCheck();
        },
        error: () => this.notification.showError('Failed to load goals')
      });
  }

  // ── Computed ──────────────────────────────────────────

  get filteredEmployees(): any[] {
    const q = (this.employeeFilter || '').toLowerCase().trim();
    const list: any[] = (!this.isManager && this.departmentControl.value) ? this.departmentEmployees : this.employees;
    if (!q) return list || [];
    return (list || []).filter(emp => {
      const name = (emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`).toLowerCase();
      const code = (emp.employeeCode || emp.employeeNumber || '').toString().toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }

  displayName(emp: any): string {
    return emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
  }

  getInitials(emp: any): string {
    const name = emp?.fullName || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim();
    if (!name) return '';
    return name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarBg(emp: any): string {
    const colors = ['#F44336', '#E91E63', '#9C27B0', '#3F51B5', '#2196F3', '#03A9F4', '#009688', '#4CAF50', '#8BC34A', '#FF9800', '#795548', '#607D8B'];
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
    const bg = this.getAvatarBg(emp).replace('#', '');
    const r = parseInt(bg.substring(0, 2), 16);
    const g = parseInt(bg.substring(2, 4), 16);
    const b = parseInt(bg.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#000000' : '#FFFFFF';
  }

  getGoalTitle(goalId: string): string {
    if (!goalId) return '';
    const goal = this.goals.find(g => g.goalId === goalId);
    return goal?.title || '';
  }

  resetEmployeeSelection(): void {
    this.assignGoalsForm.get('selectedEmployee')?.setValue('');
    this.employeeFilter = '';
    this.cdr.markForCheck();
  }

  // ── Submit ────────────────────────────────────────────

  onSubmit(): void {
    this.submitted = true;

    if (this.assignGoalsForm.invalid) {
      this.markFormGroupTouched(this.assignGoalsForm);
      this.notification.showError('Please select both goal and employee');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.assignGoalsForm.value;
    const payload: AssignGoalPayload = {
      goalId: formValue.goalId,
      assignedTo: formValue.selectedEmployee
    };

    this.performanceService.assignGoal(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notification.showSuccess('Goal assigned successfully');
          this.assignGoalsForm.reset({ goalId: '', selectedEmployee: '' });
          this.departmentControl.setValue('');
          this.isSubmitting = false;
          this.submitted = false;
          this.dialogRef.close('assigned');
        },
        error: (error) => {
          const errorMessage = error?.error?.message || error?.message || 'Failed to assign goal';
          this.notification.showError(errorMessage);
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
