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
import { LeaveService } from '../../../leave/services/leave.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ManagerOverrideDto, DailyReviewRecord } from '../../../../core/models/attendance.models';
import { LeaveType } from '../../../../core/models/leave.models';

import { SharedCommonModule } from '@shared/shared-common.module';
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
    SharedCommonModule,
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
  leaveTypes: LeaveType[] = [];

  statusOptions = [
    { value: 'present', label: 'Present' },
    { value: 'half_day', label: 'Half Day' },
    { value: 'on_leave', label: 'On Leave' },
    { value: 'late', label: 'Late' },
    { value: 'absent', label: 'Absent' }
  ];

  overtimeTypeOptions = [
    { value: 'regular', label: 'Regular' },
    { value: 'weekend', label: 'Weekend' },
    { value: 'holiday', label: 'Holiday' }
  ];

  /** Drives visibility of the leave-type dropdown. */
  get isOnLeave(): boolean {
    return (this.overrideForm.get('status')?.value || '').toLowerCase() === 'on_leave';
  }

  constructor(
    public dialogRef: MatDialogRef<ManagerOverrideDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ManagerOverrideDialogData,
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private leaveService: LeaveService,
    private notificationService: NotificationService
  ) {
    this.overrideForm = this.fb.group({
      checkIn: [''],
      checkOut: [''],
      status: [''],
      // Only required when status === 'on_leave' (validator wired in ngOnInit).
      leaveTypeId: [null],
      // Optional manager-supplied corrections to payroll-relevant counters.
      overtimeHours: [null],
      overtimeType: [null],
      lateMinutes: [null],
      notes: [''],
      reason: ['']
    });
  }

  ngOnInit(): void {
    const record = this.data.record;

    // Load leave types so the manager can classify on_leave overrides.
    this.leaveService.getLeaveTypes().subscribe({
      next: (types) => { this.leaveTypes = types || []; },
      error: () => { this.leaveTypes = []; }
    });

    // Make leaveTypeId required when status flips to on_leave; clear otherwise.
    this.overrideForm.get('status')?.valueChanges.subscribe((status: string) => {
      const ctrl = this.overrideForm.get('leaveTypeId');
      if ((status || '').toLowerCase() === 'on_leave') {
        ctrl?.setValidators([Validators.required]);
      } else {
        ctrl?.clearValidators();
        ctrl?.setValue(null, { emitEvent: false });
      }
      ctrl?.updateValueAndValidity({ emitEvent: false });
    });

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
    // Pre-fill payroll-relevant counters from the record so the manager edits deltas.
    if (record.overtimeHours != null) {
      this.overrideForm.patchValue({ overtimeHours: record.overtimeHours });
    }
    if (record.overtimeType) {
      this.overrideForm.patchValue({ overtimeType: record.overtimeType });
    }
    if (record.lateMinutes != null) {
      this.overrideForm.patchValue({ lateMinutes: record.lateMinutes });
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

    const workDateStr = record.date.split('T')[0];

    const isOnLeave = (formValue.status || '').toLowerCase() === 'on_leave';

    const dto: ManagerOverrideDto = {
      attendanceId: record.attendanceId || null,
      employeeId: this.data.employeeId,
      timesheetId: this.data.timesheetId,
      workDate: workDateStr,
      reason: formValue.reason,
      notes: formValue.notes || undefined,
      // Only send leaveTypeId for on_leave overrides; backend derives leave_pay_type from it.
      leaveTypeId: isOnLeave ? (formValue.leaveTypeId || undefined) : undefined,
      // Send OT / late only when the manager actually filled them in.
      overtimeHours: formValue.overtimeHours != null && formValue.overtimeHours !== ''
        ? Number(formValue.overtimeHours)
        : undefined,
      overtimeType: formValue.overtimeType || undefined,
      lateMinutes: formValue.lateMinutes != null && formValue.lateMinutes !== ''
        ? Number(formValue.lateMinutes)
        : undefined
    };

    if (formValue.checkIn) {
      dto.checkInTime = `${workDateStr}T${formValue.checkIn}:00`;
    }

    if (formValue.checkOut) {
      dto.checkOutTime = `${workDateStr}T${formValue.checkOut}:00`;
    }

    if (formValue.status) {
      dto.status = formValue.status;
    }

    this.attendanceService.applyManagerOverride(dto).subscribe({
      next: (success) => {
        this.isSubmitting = false;
        if (success) {
          this.notificationService.showSuccess('Override applied successfully');
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
