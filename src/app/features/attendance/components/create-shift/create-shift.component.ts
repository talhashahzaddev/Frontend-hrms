

import { Component, ChangeDetectionStrategy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NotificationService } from '../../../../core/services/notification.service';
import { AttendanceService } from '../../services/attendance.service';
import { OverlayModule, OverlayContainer } from '@angular/cdk/overlay';
import { UpdateShiftDto } from '../../../../../app/core/models/attendance.models';

@Component({
  selector: 'app-create-shift',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    OverlayModule,
    MatSlideToggleModule
  ],
  templateUrl: './create-shift.component.html',
  styleUrls: ['./create-shift.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateShiftComponent {
  shiftForm: FormGroup;
  isSubmitting = false;
  isEditMode = false;
  shiftId: string = '';
  userRole: string = '';

  days = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' }
  ];

  timezone = [
    { value: 'UTC', label: 'UTC' },
    { value: 'Asia/Karachi', label: '(GMT+5) Asia/Karachi' },
    { value: 'Asia/Dubai', label: '(GMT+4) Asia/Dubai' },
    { value: 'Europe/London', label: '(GMT+0) Europe/London' },
    { value: 'America/New_York', label: '(GMT-5) America/New_York' },
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateShiftComponent>,
    private attendanceService: AttendanceService,
    private overlayContainer: OverlayContainer,
    private notification: NotificationService,
    @Inject(MAT_DIALOG_DATA) public data?: any,// optional, contains shift for edit
  ) {
    this.shiftForm = this.fb.group({
      shiftName: ['', [Validators.required, Validators.minLength(3)]],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      breakDuration: [0, [Validators.min(0)]],
      daysofWeek: [[], Validators.required],
      timezone: [''],
      marginHours: [0, [Validators.min(0), Validators.max(5)]],
      applyMarginhours: []
    });

    // If data is passed, we are in edit mode
    if (data) {
      this.isEditMode = true;
      this.shiftId = data.shiftId;
      this.patchForm(data);
    }
  }

  /** Populate form when editing */
  private patchForm(data: any): void {
    this.shiftForm.patchValue({
      shiftName: data.shiftName,
      startTime: data.startTime?.substring(0, 5), // HH:mm
      endTime: data.endTime?.substring(0, 5),
      breakDuration: data.breakDuration,
      daysofWeek: data.daysofWeek,
      timezone: data.timezone,
      marginHours: data.marginHours ?? 0,
      applyMarginhours: data.applyMarginhours ?? true


    });
  }

  /** Handle both create & update */
  onSubmit(): void {
    if (!this.shiftForm.valid) {
      this.markFormGroupTouched(this.shiftForm);
      this.notification.showError('Please correct the highlighted fields');
      return;
    }
    this.isSubmitting = true;

    const formValue = this.shiftForm.value;

    if (this.isEditMode) {
      // Edit/Update logic
      const updateDto: UpdateShiftDto = {
        shiftId: this.shiftId,
        shiftName: formValue.shiftName,
        startTime: formValue.startTime ? `${formValue.startTime}:00` : '',
        endTime: formValue.endTime ? `${formValue.endTime}:00` : '',
        breakDuration: formValue.breakDuration,
        daysofWeek: formValue.daysofWeek,
        timezone: formValue.timezone,
        marginHours: formValue.marginHours ?? 0,
        applyMarginhours: formValue.applyMarginhours 

      };

      this.attendanceService.updateShift(this.shiftId, updateDto).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.notification.showSuccess('Shift updated successfully');
          this.dialogRef.close('updated');
        },
        error: (error) => {
          this.isSubmitting = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to update shift';
          this.notification.showError(errorMessage);
        }
      });

    } else {
      // Create logic (unchanged)
      const request = {
        shiftName: formValue.shiftName,
        startTime: formValue.startTime + ':00',
        endTime: formValue.endTime + ':00',
        breakDuration: formValue.breakDuration,
        daysofWeek: formValue.daysofWeek,
        timezone: formValue.timezone,
        marginHours: formValue.marginHours ?? 0,// <-- send marginHours
        applyMarginhours: formValue.applyMarginhours

      };

      this.attendanceService.createShift(request).subscribe({
        next: (response: any) => {
          this.isSubmitting = false;
          this.notification.showSuccess('Shift created successfully');
          this.shiftForm.reset();
          this.dialogRef.close('created');
        },
        error: (error) => {
          this.isSubmitting = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to create shift';
          this.notification.showError(errorMessage);
        }
      });
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
