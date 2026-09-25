import { Component, OnInit, ChangeDetectionStrategy, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { Employee } from '@/app/core/models/employee.models';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { AttendanceService } from '../../services/attendance.service';
import { NotificationService } from '../../../../core/services/notification.service';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-create-manager-overtime-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule
  ],
  template: `
  <div class="dialog-container dialog-wrapper">

    <div class="dialog-header">
      <div class="header-left">
        <div class="header-icon">
          <mat-icon>more_time</mat-icon>
        </div>
        <div class="header-info">
          <h2 class="header-title">Create Manager Overtime</h2>
          <p class="header-subtitle">Submit a new overtime request for team member review.</p>
        </div>
      </div>
      <button mat-icon-button type="button" class="close-button" (click)="onCancel()">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <!-- Body -->
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dialog-body">

      <!-- Employee Name -->
      <div class="field-group">
        <label class="field-label">Employee Name</label>
        <div class="select-wrap">
          <select class="field-select" formControlName="employeeId" (click)="onEmployeeDropdownOpen()" (focus)="onEmployeeDropdownOpen()">
            <option value="" disabled>Select an employee...</option>
            <option *ngIf="isLoadingEmployees" disabled>Loading employees...</option>
            <option *ngFor="let e of employees" [value]="e.employeeId">
              {{ e.fullName || (e.firstName + ' ' + e.lastName) }} ({{ e.employeeCode || e.employeeNumber }})
            </option>
          </select>
          <mat-icon class="select-icon">expand_more</mat-icon>
        </div>
      </div>

      <!-- Overtime Date + Overtime Type -->
      <div class="row-2col">
        <div class="field-group">
          <label class="field-label">Overtime Date</label>
          <div class="input-wrap">
            <input class="field-input" [matDatepicker]="picker" formControlName="overtimeDate"
                   placeholder="mm/dd/yyyy" readonly (click)="picker.open()">
            <mat-datepicker-toggle matSuffix [for]="picker" class="date-toggle"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Overtime Type</label>
          <div class="select-wrap">
            <select class="field-select" formControlName="overtimeType">
              <option value="" disabled>Select type...</option>
              <option value="regular">Regular</option>
              <option value="holiday">Holiday</option>
              <option value="weekend">Weekend</option>
            </select>
            <mat-icon class="select-icon">expand_more</mat-icon>
          </div>
        </div>
      </div>

      <!-- Start Time + End Time -->
      <div class="row-2col">
        <div class="field-group">
          <label class="field-label">Start Time</label>
          <div class="input-wrap">
            <input class="field-input" type="time" formControlName="overtimeStartTime">
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">End Time</label>
          <div class="input-wrap">
            <input class="field-input" type="time" formControlName="overtimeEndTime">
          </div>
        </div>
      </div>

      <!-- Reason for Overtime -->
      <div class="field-group">
        <label class="field-label">Reason for Overtime</label>
        <textarea class="field-textarea" formControlName="reason" rows="3"
                  placeholder="Briefly describe the project or task that required additional hours..."></textarea>
      </div>

      <!-- Info Box -->
      <div class="info-box">
        <mat-icon class="info-icon">info</mat-icon>
        <p class="info-text">
          Overtime requests submitted after the 25th of the month will be processed in the
          next payroll cycle. Ensure all times align with site access logs.
        </p>
      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        <button class="btn-cancel" type="button" (click)="onCancel()">Cancel</button>
        <button class="btn-save" type="submit" [disabled]="form.invalid || isSubmitting">Save Request</button>
      </div>

    </form>
  </div>
  `,
  styleUrls: ['./overtime-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateManagerOvertimeDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;
  employees: Employee[] = [];
  isSubmitting = false;
  isLoadingEmployees = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private attendanceService: AttendanceService,
    private notification: NotificationService,
    private dialogRef: MatDialogRef<CreateManagerOvertimeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data?: any
  ) {
    this.form = this.fb.group({
      employeeId: ['', Validators.required],
      overtimeDate: [new Date(), Validators.required],
      overtimeType: ['', Validators.required],
      reason: [''],
      overtimeStartTime: ['', Validators.required],
      overtimeEndTime: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadEmployees();
  }

  private loadEmployees(): void {
    if (this.isLoadingEmployees) return;
    if (this.employees && this.employees.length) return;
    this.isLoadingEmployees = true;
    this.employeeService.getEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const list = res?.employees || [];
          this.employees = (list || []).filter((e: any) => ((e.status || '').toString().toLowerCase() === 'active'));
          this.isLoadingEmployees = false;
        },
        error: () => {
          this.isLoadingEmployees = false;
          this.notification.showError('Failed to load employees');
        }
      });
  }

  onEmployeeDropdownOpen(): void {
    if (!this.employees || this.employees.length === 0) {
      this.loadEmployees();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private formatTimeForBackend(timeValue: string): string {
    if (!timeValue) return '';
    return timeValue.length === 5 ? `${timeValue}:00` : timeValue;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.showError('Please correct the highlighted fields');
      return;
    }
    this.isSubmitting = true;
    const v = this.form.value;

    const payload = {
      employeeId: v.employeeId,
      overtimeDate: this.toIsoDate(v.overtimeDate),
      overtimeType: v.overtimeType,
      reason: v.reason || '',
      overtimeStartTime: this.formatTimeForBackend(v.overtimeStartTime),
      overtimeEndTime: this.formatTimeForBackend(v.overtimeEndTime)
    } as any;

    this.attendanceService.createManagerOvertime(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.notification.showSuccess('Overtime created successfully');
          this.isSubmitting = false;
          this.dialogRef.close(res ?? 'created');
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || 'Failed to create overtime';
          this.notification.showError(msg);
          this.isSubmitting = false;
        }
      });
  }

  private toIsoDate(dt: any): string {
    if (!dt) return '';
    const d = (dt instanceof Date) ? dt : new Date(dt);
    const y = d.getFullYear();
    const m = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${y}-${m}-${day}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
