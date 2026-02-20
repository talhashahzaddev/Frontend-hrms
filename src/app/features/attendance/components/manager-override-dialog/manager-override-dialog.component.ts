import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AttendanceService } from '../../services/attendance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ManagerOverrideDto, DailyReviewRecord } from '../../../../core/models/attendance.models';

export interface ManagerOverrideDialogData {
  record: DailyReviewRecord;
  timesheetId: string;
  employeeId: string;
  employeeName: string;
}

@Component({
  selector: 'app-manager-override-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './manager-override-dialog.component.html',
  styleUrls: ['./manager-override-dialog.component.scss']
})
export class ManagerOverrideDialogComponent implements OnInit {
  overrideForm: FormGroup;
  isSubmitting = false;

  statusOptions = [
    { value: 'present', label: 'Present' },
    { value: 'half_day', label: 'Half Day' },
    { value: 'on_leave', label: 'On Leave' },
    { value: 'late', label: 'Late' },
    { value: 'absent', label: 'Absent' }
  ];

  constructor(
    public dialogRef: MatDialogRef<ManagerOverrideDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ManagerOverrideDialogData,
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private notificationService: NotificationService
  ) {
    this.overrideForm = this.fb.group({
      checkIn: [''],
      checkOut: [''],
      status: [''],
      notes: [''],
      reason: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    // Pre-fill form with original values
    const record = this.data.record;
    
    if (record.originalCheckIn) {
      this.overrideForm.patchValue({
        checkIn: this.parseTimeFromDateTime(record.originalCheckIn)
      });
    }
    if (record.originalCheckOut) {
      this.overrideForm.patchValue({
        checkOut: this.parseTimeFromDateTime(record.originalCheckOut)
      });
    }
    if (record.originalStatus) {
      this.overrideForm.patchValue({
        status: record.originalStatus.toLowerCase()
      });
    }
  }

  parseTimeFromDateTime(dateTimeString: string): string {
    if (!dateTimeString) return '';
    try {
      const date = new Date(dateTimeString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onSubmit(): void {
    if (this.overrideForm.invalid) {
      this.overrideForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.overrideForm.value;
    const record = this.data.record;

    // Build the checkIn/checkOut datetime strings using workDate
    const workDateStr = record.date.split('T')[0];

    const dto: ManagerOverrideDto = {
      attendanceId: record.attendanceId || null,
      employeeId: this.data.employeeId,
      timesheetId: this.data.timesheetId,
      workDate: workDateStr,
      reason: formValue.reason,
      notes: formValue.notes || undefined
    };

    // Add checkIn if provided
    if (formValue.checkIn) {
      dto.checkInTime = `${workDateStr}T${formValue.checkIn}:00`;
    }

    // Add checkOut if provided
    if (formValue.checkOut) {
      dto.checkOutTime = `${workDateStr}T${formValue.checkOut}:00`;
    }

    // Add status if provided
    if (formValue.status) {
      dto.status = formValue.status;
    }

    this.attendanceService.applyManagerOverride(dto).subscribe({
      next: (success) => {
        this.isSubmitting = false;
        if (success) {
          this.notificationService.showSuccess('Override applied successfully');
          // Return the full override payload so the parent can do an optimistic
          // update immediately — without waiting for the API reload to surface
          // what the view may not yet return (e.g. absent-day overrides).
          this.dialogRef.close({
            success: true,
            checkInTime:  dto.checkInTime  || null,
            checkOutTime: dto.checkOutTime || null,
            status:        dto.status       || null,
            workDate:      dto.workDate
          });
        } else {
          this.notificationService.showError('Failed to apply override');
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error applying override:', error);
        const errorMessage = error?.error?.message || error?.message || 'Failed to apply override';
        this.notificationService.showError(errorMessage);
      }
    });
  }
}
