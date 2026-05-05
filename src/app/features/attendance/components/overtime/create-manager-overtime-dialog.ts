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

@Component({
  selector: 'app-create-manager-overtime-dialog',
  standalone: true,
  imports: [
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
  <div class="dialog-wrapper">

    <!-- Header -->
    <div class="dialog-header">
      <div class="header-text">
        <h2 class="dialog-title">Create Manager Overtime</h2>
        <p class="dialog-subtitle">Submit a new overtime request for team member review.</p>
      </div>
      <button class="close-btn" type="button" (click)="onCancel()">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <!-- Body -->
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dialog-body">

      <!-- Employee Name -->
      <div class="field-group">
        <label class="field-label">Employee Name</label>
        <div class="select-wrap">
          <select class="field-select" formControlName="employeeId">
            <option value="" disabled>Select an employee...</option>
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
  styles: [`

    /* ── Reset Material dialog surface ── */
    ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface {
      border-radius: 12px !important;
      padding: 0 !important;
      overflow: hidden !important;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18) !important;
      border: 1px solid #e2e8f0 !important;
    }

    /* ── Dialog wrapper ── */
    .dialog-wrapper {
      display: flex;
      flex-direction: column;
      width: 512px;
      max-width: 100%;
      background: #ffffff;
      font-family: 'Inter', sans-serif;
      border-radius: 12px;
      overflow: hidden;
    }

    /* ── Header ── */
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid #f1f5f9;
      background: #ffffff;
    }

    .header-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .dialog-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      letter-spacing: -0.01em;
      line-height: 22px;
    }

    .dialog-subtitle {
      margin: 0;
      font-size: 11.5px;
      color: #64748b;
      line-height: 16px;
      font-weight: 400;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: color 0.15s;
      flex-shrink: 0;
    }
    .close-btn:hover { color: #475569; }

    /* ── Body / Form ── */
    .dialog-body {
      padding: 14px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow: hidden;
    }

    /* ── Field group ── */
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .field-label {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      letter-spacing: 0.05em;
      line-height: 14px;
      text-transform: uppercase;
    }

    /* ── Input wrap ── */
    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    /* ── Shared input base ── */
    .field-input {
      width: 100%;
      height: 34px;
      padding: 0 36px 0 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      color: #0f172a;
      background: #ffffff;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      appearance: none;
      -webkit-appearance: none;
    }

    .field-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
    }

    .field-input::placeholder { color: #94a3b8; }

    /* ── Select wrapper ── */
    .select-wrap {
      position: relative;
    }

    .field-select {
      width: 100%;
      height: 34px;
      padding: 0 36px 0 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      color: #0f172a;
      background: #ffffff;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      appearance: none;
      -webkit-appearance: none;
      cursor: pointer;
    }

    .field-select:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
    }

    .select-icon {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
      color: #94a3b8;
      pointer-events: none;
    }

    /* ── Two-column row ── */
    .row-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    /* ── Textarea ── */
    .field-textarea {
      width: 100%;
      padding: 7px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      color: #0f172a;
      background: #ffffff;
      resize: none;
      box-sizing: border-box;
      outline: none;
      min-height: 58px;
      max-height: 58px;
      transition: border-color 0.15s, box-shadow 0.15s;
      line-height: 18px;
    }

    .field-textarea::placeholder { color: #94a3b8; }

    .field-textarea:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
    }

    /* ── Info box ── */
    .info-box {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 12px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
    }

    .info-icon {
      font-size: 16px;
      color: #2563eb;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .info-text {
      margin: 0;
      font-size: 11.5px;
      color: #475569;
      line-height: 1.55;
      font-family: 'Inter', sans-serif;
    }

    /* ── Footer ── */
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
      margin: 0 -20px -14px -20px;
    }

    /* ── Buttons ── */
    .btn-cancel,
    .btn-save {
      height: 34px;
      padding: 0 18px;
      font-size: 13px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      line-height: 1;
    }

    .btn-cancel {
      background: transparent;
      border: none;
      color: #475569;
    }
    .btn-cancel:hover { background: #e2e8f0; }

    .btn-save {
      background: #2563eb;
      border: none;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(37,99,235,0.25);
    }
    .btn-save:hover:not(:disabled) { background: #1d4ed8; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

    /* ── Datepicker toggle sizing ── */
    .date-toggle {
      position: absolute;
      right: 2px;
      top: 50%;
      transform: translateY(-50%);
    }

    ::ng-deep .date-toggle .mat-mdc-icon-button {
      width: 28px !important;
      height: 28px !important;
      padding: 0 !important;
      color: #94a3b8 !important;
    }

    ::ng-deep .date-toggle .mat-mdc-icon-button svg,
    ::ng-deep .date-toggle .mat-mdc-icon-button .mat-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateManagerOvertimeDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;
  employees: Employee[] = [];
  isSubmitting = false;

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