import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AttendanceService } from '../../services/attendance.service';
import { LeaveService } from '../../../leave/services/leave.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AttendanceUpdateRequestDto, ManualAttendanceRequest } from '../../../../core/models/attendance.models';
import { LeaveType } from '../../../../core/models/leave.models';

export interface AttendanceRequestDialogData {
  attendanceId?: string | null;
  timesheetId?: string;
  employeeId?: string;
  employeeName: string;
  workDate: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  originalStatus?: string;
  originalNotes?: string;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-attendance-request-dialog',
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './attendance-request-dialog.component.html',
  styleUrls: ['./attendance-request-dialog.component.scss']
})
export class AttendanceRequestDialogComponent implements OnInit {
  requestForm: FormGroup;
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

  get isCreateMode(): boolean {
    return this.data.mode === 'create';
  }

  /** True when the requested status is a leave — drives the leave-type dropdown visibility. */
  get isOnLeave(): boolean {
    return (this.requestForm.get('requestedStatus')?.value || '').toLowerCase() === 'on_leave';
  }

  constructor(
    public dialogRef: MatDialogRef<AttendanceRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AttendanceRequestDialogData,
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private leaveService: LeaveService,
    private notificationService: NotificationService
  ) {
    this.requestForm = this.fb.group({
      requestedCheckIn: [''],
      requestedCheckOut: [''],
      requestedStatus: [''],
      // Required only when requestedStatus = 'on_leave' — validator wired in ngOnInit.
      requestedLeaveTypeId: [null],
      // Optional payroll-relevant fields the employee can request to correct.
      requestedOvertimeHours: [null],
      requestedOvertimeType: [null],
      requestedLateMinutes: [null],
      reasonForEdit: ['', [Validators.required, Validators.minLength(10)]],
      requestedNotes: ['']
    });
  }

  ngOnInit(): void {
    // Load leave types so the user can pick paid / unpaid / half-paid when requesting leave.
    this.leaveService.getLeaveTypes().subscribe({
      next: (types) => { this.leaveTypes = types || []; },
      error: () => { this.leaveTypes = []; }
    });

    // Toggle leave-type required validator based on selected status.
    this.requestForm.get('requestedStatus')?.valueChanges.subscribe((status: string) => {
      const ctrl = this.requestForm.get('requestedLeaveTypeId');
      if ((status || '').toLowerCase() === 'on_leave') {
        ctrl?.setValidators([Validators.required]);
      } else {
        ctrl?.clearValidators();
        ctrl?.setValue(null, { emitEvent: false });
      }
      ctrl?.updateValueAndValidity({ emitEvent: false });
    });

    if (this.isCreateMode) {
      this.requestForm.patchValue({
        requestedCheckIn: '09:00',
        requestedCheckOut: '18:00',
        requestedStatus: 'present'
      });
      return;
    }

    if (this.data.originalCheckIn) {
      this.requestForm.patchValue({
        requestedCheckIn: this.parseTimeOnly(this.data.originalCheckIn)
      });
    }
    if (this.data.originalCheckOut) {
      this.requestForm.patchValue({
        requestedCheckOut: this.parseTimeOnly(this.data.originalCheckOut)
      });
    }
    if (this.data.originalStatus) {
      this.requestForm.patchValue({
        requestedStatus: this.data.originalStatus.toLowerCase()
      });
    }
    if (this.data.originalNotes) {
      this.requestForm.patchValue({
        requestedNotes: this.data.originalNotes
      });
    }
  }


  formatDateTimeLocal(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }


  parseTimeOnly(dateTimeString: string): string {
    if (!dateTimeString) return '';
    const tIndex = dateTimeString.indexOf('T');
    if (tIndex !== -1) {
      return dateTimeString.substring(tIndex + 1, tIndex + 6);
    }
    return dateTimeString.substring(0, 5);
  }


  parseDateTime(dateTimeString: string): string {
    return this.parseTimeOnly(dateTimeString);
  }

  formatDateTime(timeOnly: string): string {
    if (!timeOnly) return '';
    const workDatePart = this.data.workDate.split('T')[0];
    return `${workDatePart}T${timeOnly}:00`;
  }

  formatDateForDisplay(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  validateTimeRange(): boolean {
    const checkIn: string = this.requestForm.get('requestedCheckIn')?.value;
    const checkOut: string = this.requestForm.get('requestedCheckOut')?.value;

    if (!checkIn || !checkOut) {
      return true;
    }

    if (checkOut <= checkIn) {
      this.notificationService.showError('Check-out time must be after check-in time');
      return false;
    }

    return true;
  }

  onSubmit(): void {
    try {
      if (this.requestForm.invalid) {
        this.notificationService.showError('Please fill in all required fields');
        Object.keys(this.requestForm.controls).forEach(key => {
          this.requestForm.get(key)?.markAsTouched();
        });
        this.isSubmitting = false;
        return;
      }

      if (!this.validateTimeRange()) {
        this.isSubmitting = false;
        return;
      }

      this.isSubmitting = true;
      const formValue = this.requestForm.value;

      console.log('[AttendanceRequestDialog] Submitting', this.isCreateMode ? 'CREATE' : 'EDIT', formValue);

      const timeout = setTimeout(() => {
        if (this.isSubmitting) {
          this.isSubmitting = false;
          this.notificationService.showError('Request timed out. Please check your connection and try again.');
        }
      }, 15000);

      if (this.isCreateMode) {
        this.submitCreateRequest(formValue, timeout);
      } else {
        this.submitEditRequest(formValue, timeout);
      }
    } catch (err) {
      this.isSubmitting = false;
      this.notificationService.showError('An unexpected error occurred. Please try again.');
      console.error('[AttendanceRequestDialog] Unexpected error:', err);
    }
  }

  private submitCreateRequest(formValue: any, timeout?: any): void {
    if (!this.data.employeeId) {
      this.notificationService.showError('Employee ID is required');
      this.isSubmitting = false;
      return;
    }

    const createDto: ManualAttendanceRequest = {
      employeeId: this.data.employeeId,
      workDate: this.data.workDate,
      date: this.data.workDate,
      checkInTime: formValue.requestedCheckIn ? this.formatDateTime(formValue.requestedCheckIn) : '',
      checkOutTime: formValue.requestedCheckOut ? this.formatDateTime(formValue.requestedCheckOut) : undefined,
      status: formValue.requestedStatus || 'present',
      notes: formValue.requestedNotes || undefined,
      reason: formValue.reasonForEdit
    };

    this.attendanceService.createManualAttendance(createDto).subscribe({
      next: (result) => {
        clearTimeout(timeout);
        this.notificationService.showSuccess('Record created successfully');
        this.dialogRef.close({ success: true, attendanceId: (result as any).attendanceId });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.notificationService.showError(err?.error?.message || 'Submission failed');
      }
    });
  }

  private submitEditRequest(formValue: any, timeout?: any): void {
    const isAbsent = formValue.requestedStatus?.toLowerCase() === 'absent';
    const isOnLeave = formValue.requestedStatus?.toLowerCase() === 'on_leave';
    const requestDto: AttendanceUpdateRequestDto = {
      attendanceId: this.data.attendanceId || null,
      employeeId: this.data.employeeId!,
      timesheetId: this.data.timesheetId || undefined,
      workDate: this.data.workDate,
      requestedCheckIn: (!isAbsent && formValue.requestedCheckIn) ? this.formatDateTime(formValue.requestedCheckIn) : undefined,
      requestedCheckOut: (!isAbsent && formValue.requestedCheckOut) ? this.formatDateTime(formValue.requestedCheckOut) : undefined,
      requestedStatus: formValue.requestedStatus || undefined,
      // Only include the leave-type when requesting an on_leave correction.
      requestedLeaveTypeId: isOnLeave ? (formValue.requestedLeaveTypeId || undefined) : undefined,
      // Only send payroll-counter overrides when the employee actually filled them in.
      requestedOvertimeHours: formValue.requestedOvertimeHours != null && formValue.requestedOvertimeHours !== ''
        ? Number(formValue.requestedOvertimeHours) : undefined,
      requestedOvertimeType:  formValue.requestedOvertimeType || undefined,
      requestedLateMinutes:   formValue.requestedLateMinutes != null && formValue.requestedLateMinutes !== ''
        ? Number(formValue.requestedLateMinutes) : undefined,
      reasonForEdit: formValue.reasonForEdit,
      requestedNotes: formValue.requestedNotes || undefined
    };

    this.attendanceService.submitEditRequest(requestDto).subscribe({
      next: () => {
        clearTimeout(timeout);
        this.notificationService.showSuccess('Correction submitted');
        this.dialogRef.close({ success: true, ...requestDto });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.notificationService.showError('Error submitting correction');
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.requestForm.get(fieldName);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Minimum ${minLength} characters required`;
    }
    return '';
  }
}
