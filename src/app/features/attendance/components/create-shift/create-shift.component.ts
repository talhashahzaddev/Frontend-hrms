
import { takeUntil } from 'rxjs';
import { Component, ChangeDetectionStrategy, Inject ,OnInit, OnDestroy} from '@angular/core';
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
import { ChangeDetectorRef } from '@angular/core';
import { MatTimepickerModule } from '@dhutaryan/ngx-mat-timepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { SettingsService } from '@/app/features/settings/services/settings.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-create-shift',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTimepickerModule,
    MatNativeDateModule,
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
export class CreateShiftComponent  implements OnInit,OnDestroy {
  shiftForm: FormGroup;
  isSubmitting = false;
  isEditMode = false;
  shiftId: string = '';
  userRole: string = '';
  timezone: { value: string; label: string }[] = [];
  timeSlots: string[] = []; 
  organizationTimeZone: string = 'UTC';
private destroy$ = new Subject<void>();
  days = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' }
  ];
  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateShiftComponent>,
    private attendanceService: AttendanceService,
    private overlayContainer: OverlayContainer,
    private  settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
    private notification: NotificationService,
    @Inject(MAT_DIALOG_DATA) public data?: any,
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

    if (data) {
      this.isEditMode = true;
      this.shiftId = data.shiftId;
      this.patchForm(data);
    }
  }
ngOnInit(): void {
   this.loadInitialData();
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}

  private patchForm(data: any): void {
    this.shiftForm.patchValue({
      shiftName: data.shiftName,
      startTime: data.startTime?.substring(0, 5),
      endTime: data.endTime?.substring(0, 5),
      breakDuration: data.breakDuration,
      daysofWeek: data.daysofWeek,
      timezone: data.timezone,
      marginHours: data.marginHours ?? 0,
      applyMarginhours: data.applyMarginhours ?? true


    });
  }

private loadInitialData(): void {

  this.settingsService.getOrganizationSettings()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (settings) => {

        this.organizationTimeZone = settings.timeZone || 'UTC';

        // ⭐ IMPORTANT: form control me set karo
        this.shiftForm.patchValue({
          timezone: this.organizationTimeZone
        });

        this.cdr.markForCheck();

      },
      error: (error) => {
        console.error('Error loading organization timezone:', error);

        this.organizationTimeZone = 'UTC';

        this.shiftForm.patchValue({
          timezone: 'UTC'
        });

        this.cdr.markForCheck();
      }
    });
}


  onSubmit(): void {
    if (!this.shiftForm.valid) {
      this.markFormGroupTouched(this.shiftForm);
      this.notification.showError('Please correct the highlighted fields');
      return;
    }
    this.isSubmitting = true;

    const formValue = this.shiftForm.value;

    if (this.isEditMode) {
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
      const request = {
        shiftName: formValue.shiftName,
        startTime: formValue.startTime + ':00',
        endTime: formValue.endTime + ':00',
        breakDuration: formValue.breakDuration,
        daysofWeek: formValue.daysofWeek,
        timezone: formValue.timezone,
        marginHours: formValue.marginHours ?? 0,
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

toggleDay(value: number): void {
  const control = this.shiftForm.get('daysofWeek');
  if (!control) return;
  
  const current: number[] = control.value ?? [];
  const updated = current.includes(value)
    ? current.filter(d => d !== value)
    : [...current, value];
  
  control.setValue(updated);
  control.markAsTouched();
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
