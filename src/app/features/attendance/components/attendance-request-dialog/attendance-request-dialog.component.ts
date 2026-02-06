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
import { NotificationService } from '../../../../core/services/notification.service';
import { AttendanceUpdateRequestDto } from '../../../../core/models/attendance.models';

export interface AttendanceRequestDialogData {
  attendanceId: string;
  timesheetId?: string; // Optional timesheetId for snapshot-based corrections
  employeeName: string;
  workDate: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  originalStatus: string;
  originalNotes?: string;
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

  statusOptions = [
    { value: 'present', label: 'Present' },
    { value: 'half_day', label: 'Half Day' },
    { value: 'on_leave', label: 'On Leave' },
    { value: 'late', label: 'Late' },
    { value: 'absent', label: 'Absent' }
  ];

  constructor(
    public dialogRef: MatDialogRef<AttendanceRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AttendanceRequestDialogData,
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private notificationService: NotificationService
  ) {
    this.requestForm = this.fb.group({
      requestedCheckIn: [''],
      requestedCheckOut: [''],
      requestedStatus: [''],
      reasonForEdit: ['', [Validators.required, Validators.minLength(10)]],
      requestedNotes: ['']
    });
  }

  ngOnInit(): void {
    // Pre-fill form with original values if available
    if (this.data.originalCheckIn) {
      this.requestForm.patchValue({
        requestedCheckIn: this.parseDateTime(this.data.originalCheckIn)
      });
    }
    if (this.data.originalCheckOut) {
      this.requestForm.patchValue({
        requestedCheckOut: this.parseDateTime(this.data.originalCheckOut)
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

  parseDateTime(dateTimeString: string): string {
    // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  formatDateTime(dateTimeLocal: string): string {
    // Convert datetime-local format to ISO string
    if (!dateTimeLocal) return '';
    return new Date(dateTimeLocal).toISOString();
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
    const checkIn = this.requestForm.get('requestedCheckIn')?.value;
    const checkOut = this.requestForm.get('requestedCheckOut')?.value;

    if (!checkIn || !checkOut) {
      return true; // Skip validation if either is empty
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkOutDate <= checkInDate) {
      this.notificationService.showError('Check-out time must be after check-in time');
      return false;
    }

    return true;
  }

  onSubmit(): void {
    // Validate form
    if (this.requestForm.invalid) {
      this.notificationService.showError('Please fill in all required fields');
      Object.keys(this.requestForm.controls).forEach(key => {
        this.requestForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Validate time range
    if (!this.validateTimeRange()) {
      return;
    }

    this.isSubmitting = true;

    const formValue = this.requestForm.value;
    const requestDto: AttendanceUpdateRequestDto = {
      attendanceId: this.data.attendanceId,
      requestedCheckIn: formValue.requestedCheckIn ? this.formatDateTime(formValue.requestedCheckIn) : undefined,
      requestedCheckOut: formValue.requestedCheckOut ? this.formatDateTime(formValue.requestedCheckOut) : undefined,
      requestedStatus: formValue.requestedStatus || undefined,
      reasonForEdit: formValue.reasonForEdit,
      requestedNotes: formValue.requestedNotes || undefined
    };

    this.attendanceService.submitEditRequest(requestDto)
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Attendance correction request submitted successfully');
          this.isSubmitting = false;
          this.dialogRef.close({ success: true });
        },
        error: (error) => {
          console.error('Error submitting request:', error);
          this.notificationService.showError('Failed to submit request. Please try again.');
          this.isSubmitting = false;
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
