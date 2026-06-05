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
import { AttendanceService } from '../../services/attendance.service';
import { NotificationService } from '../../../../core/services/notification.service';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-create-employee-overtime-dialog',
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
  <div class="dialog-wrapper">

    <!-- Header -->
    <div class="dialog-header">
      <h2 class="dialog-title">Create Employee Overtime</h2>
      <button class="close-btn" type="button" (click)="onCancel()">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <!-- Body -->
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dialog-body">

      <!-- Overtime Date -->
      <div class="field-group">
        <label class="field-label">Overtime Date</label>
        <div class="input-wrap">
          <input class="field-input" [matDatepicker]="picker" formControlName="overtimeDate"
                 placeholder="mm/dd/yyyy" readonly (click)="picker.open()">
          <mat-datepicker-toggle matSuffix [for]="picker" class="date-toggle"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </div>
      </div>

      <!-- Overtime Type -->
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

      <!-- Start Time & End Time -->
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

      <!-- Reason -->
      <div class="field-group">
        <label class="field-label">Reason</label>
        <textarea class="field-textarea" formControlName="reason" rows="3"
                  placeholder="Provide context for the overtime request..."></textarea>
      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        <button class="btn-cancel" type="button" (click)="onCancel()">Cancel</button>
        <button class="btn-save" type="submit" [disabled]="form.invalid || isSubmitting">Save</button>
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

    /* ── Wrapper ── */
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
      padding: 20px 24px;
      border-bottom: 1px solid #f1f5f9;
      background: #ffffff;
    }

    .dialog-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #0f172a;
      letter-spacing: -0.01em;
      line-height: 28px;
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
    }
    .close-btn:hover { color: #475569; }

    /* ── Body / Form ── */
    .dialog-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* ── Field group ── */
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-label {
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      letter-spacing: 0.02em;
      line-height: 16px;
    }

    /* ── Input wrap (for date with toggle) ── */
    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    /* ── Shared input / select base ── */
    .field-input,
    .field-select {
      width: 100%;
      height: 42px;
      padding: 0 40px 0 16px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      color: #0f172a;
      background: #ffffff;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      appearance: none;
      -webkit-appearance: none;
    }

    .field-input:focus,
    .field-select:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
    }

    /* ── Select wrapper ── */
    .select-wrap {
      position: relative;
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

    /* ── Two-column row ── */
    .row-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    /* ── Textarea ── */
    .field-textarea {
      width: 100%;
      padding: 10px 16px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      color: #0f172a;
      background: #ffffff;
      resize: none;
      box-sizing: border-box;
      outline: none;
      min-height: 80px;
      transition: border-color 0.15s, box-shadow 0.15s;
      line-height: 20px;
    }

    .field-textarea::placeholder { color: #94a3b8; }

    .field-textarea:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
    }

    /* ── Footer ── */
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
      margin: 0 -24px -24px -24px;
    }

    /* ── Buttons ── */
    .btn-cancel,
    .btn-save {
      height: 38px;
      padding: 0 20px;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      transition: background 0.15s, opacity 0.15s;
      line-height: 1;
    }

    .btn-cancel {
      background: transparent;
      color: #475569;
    }
    .btn-cancel:hover { background: #e2e8f0; }

    .btn-save {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(37,99,235,0.25);
    }
    .btn-save:hover { background: #1d4ed8; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

    /* ── Datepicker toggle sizing ── */
    .date-toggle {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
    }

    ::ng-deep .date-toggle .mat-mdc-icon-button {
      width: 32px !important;
      height: 32px !important;
      padding: 0 !important;
      color: #94a3b8 !important;
    }

    ::ng-deep .date-toggle .mat-mdc-icon-button svg,
    ::ng-deep .date-toggle .mat-mdc-icon-button .mat-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateEmployeeOvertimeDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isSubmitting = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private notification: NotificationService,
    private dialogRef: MatDialogRef<CreateEmployeeOvertimeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data?: any
  ) {
    this.form = this.fb.group({
      overtimeDate: [new Date(), Validators.required],
      overtimeType: ['', Validators.required],
      reason: [''],
      overtimeStartTime: ['', Validators.required],
      overtimeEndTime: ['', Validators.required]
    });
  }

  ngOnInit(): void {}

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
      overTimeDate: this.toIsoDate(v.overtimeDate),
      overtimeType: v.overtimeType,
      reason: v.reason || '',
      overtimeStartTime: this.formatTimeForBackend(v.overtimeStartTime),
      overtimeEndTime: this.formatTimeForBackend(v.overtimeEndTime)
    } as any;

    this.attendanceService.createEmployeeOvertime(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.notification.showSuccess('Overtime request created');
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
