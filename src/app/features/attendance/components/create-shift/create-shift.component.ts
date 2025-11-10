
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NotificationService } from '../../../../core/services/notification.service';
import { AttendanceService } from '../../services/attendance.service';
import { MatDialogRef } from '@angular/material/dialog';
import { OverlayModule } from '@angular/cdk/overlay';
import {NgxMaterialTimepickerModule} from 'ngx-material-timepicker'

import { OverlayContainer } from '@angular/cdk/overlay';



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
    MatSlideToggleModule,
    NgxMaterialTimepickerModule,
  ],
  templateUrl: './create-shift.component.html',
  styleUrls: ['./create-shift.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateShiftComponent {
  shiftForm: FormGroup;
  isSubmitting = false;

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
    private dialogRef: MatDialogRef<CreateShiftComponent> ,
    private attendanceService: AttendanceService,
     private overlayContainer: OverlayContainer,
    private notification: NotificationService
  ) {
    this.shiftForm = this.fb.group({
      shiftName: ['', [Validators.required, Validators.minLength(3)]],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      breakDuration: [0, [Validators.min(0)]],
      daysofWeek: [[], Validators.required],
      timezone: ['']
    });
  }

  onSubmit(): void {
    if (!this.shiftForm.valid) return;

    this.isSubmitting = true;

    const formValue = this.shiftForm.value;

   const request = {
  shiftName: formValue.shiftName,
  startTime: formValue.startTime + ':00', // "HH:mm:ss"
  endTime: formValue.endTime + ':00',
  breakDuration: formValue.breakDuration,
  daysofWeek: formValue.daysofWeek,
  timezone: formValue.timezone
};

    this.attendanceService.createShift(request).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.notification.showSuccess('Shift created successfully');
        this.shiftForm.reset();

    // Close the dialog and return 'created'
    this.dialogRef.close('created');
        
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error creating shift:', error);
        this.notification.showError('Failed to create shift');
      }
    });
  }

  convertToTicks(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    const totalSeconds = hours * 3600 + minutes * 60;
    return totalSeconds * 10000000; // 1 tick = 100 nanoseconds
  }
}

