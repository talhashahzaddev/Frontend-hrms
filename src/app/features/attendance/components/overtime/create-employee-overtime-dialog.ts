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
  <div class="dialog-container dialog-wrapper">

    <div class="dialog-header">
      <div class="header-left">
        <div class="header-icon">
          <mat-icon>more_time</mat-icon>
        </div>
        <div class="header-info">
          <h2 class="header-title">Create Employee Overtime</h2>
          <p class="header-subtitle">Submit your overtime request for manager review</p>
        </div>
      </div>
      <button mat-icon-button type="button" class="close-button" (click)="onCancel()">
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
  styleUrls: ['./overtime-dialog.component.scss'],
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
