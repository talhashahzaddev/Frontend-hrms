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
    @Inject(MAT_DIALOG_DATA) public data?: any
  ) {
    this.shiftForm = this.fb.group({
      shiftName: ['', [Validators.required, Validators.minLength(3)]],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],

      breakStartTime: [''],
      breakEndTime: [''],
      overtimeStartTime: [''],
      maxOvertimeInMinutes: [0],

      breakDuration: [0, [Validators.min(0)]],
      daysofWeek: [[], Validators.required],
      timezone: ['UTC']
    });

    if (data) {
      this.isEditMode = true;
      this.shiftId = data.shiftId;
      this.patchForm(data);
    }
  }

  /** Populate form for edit mode */
  private patchForm(data: any): void {
    this.shiftForm.patchValue({
      shiftName: data.shiftName,
      startTime: data.startTime?.substring(0, 5),
      endTime: data.endTime?.substring(0, 5),

      breakStartTime: data.breakStartTime?.substring(0, 5),
      breakEndTime: data.breakEndTime?.substring(0, 5),

      overtimeStartTime: data.overtimeStartTime?.substring(0, 5),
      maxOvertimeInMinutes: data.maxOvertimeInMinutes,

      breakDuration: data.breakDuration,
      daysofWeek: data.daysofWeek,
      timezone: data.timezone
    });
  }

  /** Handle create & update */
  onSubmit(): void {
    if (!this.shiftForm.valid) return;
    this.isSubmitting = true;

    const f = this.shiftForm.value;

    if (this.isEditMode) {
      const updateDto: UpdateShiftDto = {
        shiftId: this.shiftId,
        shiftName: f.shiftName,
        startTime: f.startTime ? `${f.startTime}:00` : '',
        endTime: f.endTime ? `${f.endTime}:00` : '',
        breakStartTime: f.breakStartTime ? `${f.breakStartTime}:00` : '',
        breakEndTime: f.breakEndTime ? `${f.breakEndTime}:00` : '',
        overtimeStartTime: f.overtimeStartTime ? `${f.overtimeStartTime}:00` : '',
        maxOvertimeInMinutes: f.maxOvertimeInMinutes,
        breakDuration: f.breakDuration,
        daysofWeek: f.daysofWeek,
        timezone: f.timezone
      };

      this.attendanceService.updateShift(this.shiftId, updateDto).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.notification.showSuccess('Shift updated successfully');
          this.dialogRef.close('updated');
        },
        error: () => {
          this.isSubmitting = false;
          this.notification.showError('Failed to update shift');
        }
      });

    } else {
      const request = {
        shiftName: f.shiftName,
        startTime: f.startTime + ':00',
        endTime: f.endTime + ':00',
        breakStartTime: f.breakStartTime ? f.breakStartTime + ':00' : null,
        breakEndTime: f.breakEndTime ? f.breakEndTime + ':00' : null,
        overtimeStartTime: f.overtimeStartTime ? f.overtimeStartTime + ':00' : null,
        maxOvertimeInMinutes: f.maxOvertimeInMinutes,
        breakDuration: f.breakDuration,
        daysofWeek: f.daysofWeek,
        timezone: f.timezone
      };

      this.attendanceService.createShift(request).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.notification.showSuccess('Shift created successfully');
          this.dialogRef.close('created');
        },
        error: () => {
          this.isSubmitting = false;
          this.notification.showError('Failed to create shift');
        }
      });
    }
  }
}
