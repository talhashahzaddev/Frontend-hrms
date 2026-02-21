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
import { AttendanceUpdateRequestDto, ManualAttendanceRequest } from '../../../../core/models/attendance.models';

export interface AttendanceRequestDialogData {
  attendanceId?: string | null; // Optional - null for 'create' mode or when no GUID exists
  timesheetId?: string; // Optional timesheetId for snapshot-based corrections
  employeeId?: string; // Required for 'create' mode
  employeeName: string;
  workDate: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  originalStatus?: string;
  originalNotes?: string;
  mode: 'create' | 'edit'; // Task 3: Mode to determine dialog behavior
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

  // Task 3: Check if dialog is in create mode
  get isCreateMode(): boolean {
    return this.data.mode === 'create';
  }

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
    // Task 3: For create mode, initialize with default values for the selected date
    if (this.isCreateMode) {
      // Pre-fill with sensible defaults for a new record
      // type="time" inputs expect plain HH:mm
      this.requestForm.patchValue({
        requestedCheckIn: '09:00',
        requestedCheckOut: '18:00',
        requestedStatus: 'present'
      });
      return;
    }
    
    // Edit mode: Pre-fill form with original values if available
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

  /** @deprecated — use parseTimeOnly for type="time" inputs */
  formatDateTimeLocal(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Extracts HH:mm from an ISO / "HH:mm" / "HH:mm:ss" string.
   * Safe against timezone shifts: reads the raw time segment from the string
   * instead of constructing a JS Date object (which converts to local time).
   */
  parseTimeOnly(dateTimeString: string): string {
    if (!dateTimeString) return '';
    // ISO string: "2026-02-18T09:30:00" or "2026-02-18T09:30:00+05:00"
    const tIndex = dateTimeString.indexOf('T');
    if (tIndex !== -1) {
      return dateTimeString.substring(tIndex + 1, tIndex + 6); // "HH:mm"
    }
    // Already "HH:mm" or "HH:mm:ss"
    return dateTimeString.substring(0, 5);
  }

  /** @deprecated — kept for backwards compat, use parseTimeOnly instead */
  parseDateTime(dateTimeString: string): string {
    return this.parseTimeOnly(dateTimeString);
  }

  // Combines workDate (YYYY-MM-DD) with a HH:mm time string into a local ISO-like
  // datetime string WITHOUT UTC conversion (no .toISOString()).
  // Using .toISOString() shifts the time by the browser's UTC offset, causing the
  // card to display wrong times after saving a draft.
  formatDateTime(timeOnly: string): string {
    if (!timeOnly) return '';
    const workDatePart = this.data.workDate.split('T')[0];
    // Return a plain local datetime string: "YYYY-MM-DDTHH:mm:00"
    // The backend accepts ISO-like strings and formatTime() on the card parses
    // the "T" substring directly — both work correctly with local time.
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
      return true; // Skip validation if either is empty
    }

    // Inputs are type="time" so values are "HH:mm" — compare as strings (lexicographic is correct for same day)
    if (checkOut <= checkIn) {
      this.notificationService.showError('Check-out time must be after check-in time');
      return false;
    }

    return true;
  }

  onSubmit(): void {
    try {
      // Validate form
      if (this.requestForm.invalid) {
        this.notificationService.showError('Please fill in all required fields');
        Object.keys(this.requestForm.controls).forEach(key => {
          this.requestForm.get(key)?.markAsTouched();
        });
        this.isSubmitting = false;
        return;
      }

      // Validate time range
      if (!this.validateTimeRange()) {
        this.isSubmitting = false;
        return;
      }

      this.isSubmitting = true;
      const formValue = this.requestForm.value;

      // Debug: Log submit mode and payload
      console.log('[AttendanceRequestDialog] Submitting', this.isCreateMode ? 'CREATE' : 'EDIT', formValue);

      // Add a timeout to reset isSubmitting if API call takes too long (e.g., 15s)
      const timeout = setTimeout(() => {
        if (this.isSubmitting) {
          this.isSubmitting = false;
          this.notificationService.showError('Request timed out. Please check your connection and try again.');
        }
      }, 15000);

      // Task 2: Route to Create or Edit API based on mode
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

  // Task 2: Create new attendance record (POST /api/Attendance/manual)
  // 2. Updated Create Request Logic
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
      // Use the fixed formatting logic
      checkInTime: formValue.requestedCheckIn ? this.formatDateTime(formValue.requestedCheckIn) : '',
      checkOutTime: formValue.requestedCheckOut ? this.formatDateTime(formValue.requestedCheckOut) : undefined,
      status: formValue.requestedStatus || 'present',
      notes: formValue.requestedNotes || undefined,
      reason: formValue.reasonForEdit // Ensure this matches your BE 'reason' property
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

  // Edit existing attendance record
  // 3. Updated Edit Request Logic
  private submitEditRequest(formValue: any, timeout?: any): void {
    const isAbsent = formValue.requestedStatus?.toLowerCase() === 'absent';
    const requestDto: AttendanceUpdateRequestDto = {
      attendanceId: this.data.attendanceId || null,
      employeeId: this.data.employeeId!,
      workDate: this.data.workDate,
      requestedCheckIn: (!isAbsent && formValue.requestedCheckIn) ? this.formatDateTime(formValue.requestedCheckIn) : undefined,
      requestedCheckOut: (!isAbsent && formValue.requestedCheckOut) ? this.formatDateTime(formValue.requestedCheckOut) : undefined,
      requestedStatus: formValue.requestedStatus || undefined,
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
