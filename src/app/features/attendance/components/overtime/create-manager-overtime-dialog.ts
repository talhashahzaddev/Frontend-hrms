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
              <option value="holiday">Holiday </option>
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
        <textarea class="field-textarea" formControlName="reason" rows="4"
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
  styles: [
    `
    /* ── Reset dialog shell ── */
    ::ng-deep .mat-mdc-dialog-container {
      position: fixed !important;
      inset: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      border-radius: 12px !important;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18) !important;
    }
    ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface {
      border-radius: 12px !important;
      padding: 0 !important;
      box-shadow: none !important;
      overflow: visible !important;
      margin: 0 auto !important;
    }

    /* ── Dialog wrapper ── */
    .dialog-wrapper {
      display: flex;
      flex-direction: column;
      width: 520px;
      max-width: 92vw;
      background: #ffffff;
      border-radius: 12px;
      overflow: visible;
      font-family: 'Inter', sans-serif;
      margin: 0 auto;
      box-shadow: 0 8px 30px rgba(2,6,23,0.12);
    }

    /* ── Header ── */
    .dialog-header {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e6eef6;
      background: #ffffff;
    }
    .header-text { display: flex; flex-direction: column; gap: 2px; text-align: center; }
    .dialog-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      line-height: 24px;
    }
    .dialog-subtitle {
      margin: 0;
      font-size: 13px;
      color: #64748b;
      line-height: 18px;
    }
    .close-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      padding: 6px;
      border-radius: 6px;
      transition: color 0.12s;
      flex-shrink: 0;
    }
    .close-btn:hover { color: #334155; }

    /* ── Body / Form ── */
    .dialog-body {
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
      max-height: calc(80vh - 100px);
    }

    /* ── Field group ── */
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .field-label {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    /* ── Input wrapper ── */
    .input-wrap {
      position: relative;
    }
    .field-input {
      width: 100%;
      height: 36px;
      padding: 0 36px 0 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 13px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.12s, box-shadow 0.12s;
      font-family: 'Inter', sans-serif;
    }
    .field-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
    }
    .field-input::placeholder { color: #94a3b8; }

    /* ── Datepicker toggle ── */
    .date-toggle {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
    }
    ::ng-deep .date-toggle .mat-mdc-icon-button {
      width: 28px !important;
      height: 28px !important;
      padding: 0 !important;
      line-height: 28px !important;
    }
    ::ng-deep .date-toggle .mat-icon { font-size: 18px !important; color: #94a3b8; }

    /* ── Select ── */
    .select-wrap {
      position: relative;
    }
    .field-select {
      width: 100%;
      height: 36px;
      padding: 0 34px 0 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 13px;
      color: #0f172a;
      background: #ffffff;
      appearance: none;
      outline: none;
      cursor: pointer;
      box-sizing: border-box;
      transition: border-color 0.12s, box-shadow 0.12s;
      font-family: 'Inter', sans-serif;
    }
    .field-select:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
    }
    .select-icon {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 20px;
      color: #94a3b8;
      pointer-events: none;
    }

    /* ── 2-column grid ── */
    .row-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    /* ── Textarea ── */
    .field-textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 13px;
      color: #0f172a;
      background: #ffffff;
      resize: vertical;
      min-height: 64px;
      outline: none;
      box-sizing: border-box;
      font-family: 'Inter', sans-serif;
      line-height: 1.45;
      transition: border-color 0.12s, box-shadow 0.12s;
    }
    .field-textarea:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
    }
    .field-textarea::placeholder { color: #94a3b8; }

    /* ── Info box ── */
    .info-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      background: #f7fbff;
      border: 1px solid rgba(195,198,215,0.35);
      border-radius: 6px;
    }
    .info-icon {
      font-size: 20px;
      color: #2563eb;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .info-text {
      margin: 0;
      font-size: 13px;
      color: #475569;
      line-height: 1.6;
    }

    /* ── Footer ── */
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
      margin-top: 4px;
    }
    .btn-cancel {
      height: 36px;
      padding: 0 18px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      transition: background 0.12s, border-color 0.12s;
    }
    .btn-cancel:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .btn-save {
      height: 36px;
      padding: 0 20px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
      background: #2563eb;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 2px 6px rgba(37,99,235,0.22);
      transition: background 0.12s;
    }
    .btn-save:hover:not(:disabled) { background: #1d4ed8; }
    .btn-save:disabled { opacity: 0.55; cursor: not-allowed; }
    `
  ],
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