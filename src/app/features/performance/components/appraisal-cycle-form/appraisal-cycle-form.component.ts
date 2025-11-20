

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { PerformanceService } from '../../services/performance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AppraisalCycle, UpdateAppraisalCycleRequest } from '../../../../core/models/performance.models';

@Component({
  selector: 'app-appraisal-cycle-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatCardModule,
    MatSnackBarModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  templateUrl: './appraisal-cycle-form.component.html',
  styleUrls: ['./appraisal-cycle-form.component.scss']
})

export class AppraisalCycleFormComponent {
  cycleForm: FormGroup;
  isSaving = false;
  isEditMode = false;
  cycleId?: string;

  constructor(
    private fb: FormBuilder,
    private performanceService: PerformanceService,
    private notificationService: NotificationService,
    private dialogRef: MatDialogRef<AppraisalCycleFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = !!data?.cycle;
    this.cycleId = data?.cycle?.cycleId;

    this.cycleForm = this.fb.group({
      cycleName: [data?.cycle?.cycleName || '', Validators.required],
      description: [data?.cycle?.description || ''],
      startDate: [data?.cycle?.startDate ? new Date(data.cycle.startDate) : '', Validators.required],
      endDate: [data?.cycle?.endDate ? new Date(data.cycle.endDate) : '', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.cycleForm.valid) {
      this.isSaving = true;
      const formValue = this.cycleForm.value;
      
      // Format dates
      const request = {
        cycleName: formValue.cycleName,
        description: formValue.description || '',
        startDate: formValue.startDate instanceof Date 
          ? formValue.startDate.toISOString().split('T')[0]
          : formValue.startDate,
        endDate: formValue.endDate instanceof Date
          ? formValue.endDate.toISOString().split('T')[0]
          : formValue.endDate
      };

      if (this.isEditMode && this.cycleId) {
        const updateRequest: UpdateAppraisalCycleRequest = {
          ...request,
          status: this.data.cycle.status
        };
        this.performanceService.updateAppraisalCycle(this.cycleId, updateRequest).subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.showSuccess('Appraisal cycle updated successfully');
              this.dialogRef.close('saved');
            } else {
              this.notificationService.showError(response.message || 'Failed to update cycle');
            }
            this.isSaving = false;
          },
          error: (err) => {
            console.error('Error updating cycle:', err);
            this.notificationService.showError(err.error?.message || 'Failed to update appraisal cycle');
            this.isSaving = false;
          }
        });
      } else {
        this.performanceService.createAppraisalCycle(request).subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.showSuccess('Appraisal cycle created successfully');
              this.dialogRef.close('saved');
            } else {
              this.notificationService.showError(response.message || 'Failed to create cycle');
            }
            this.isSaving = false;
          },
          error: (err) => {
            console.error('Error creating cycle:', err);
            this.notificationService.showError(err.error?.message || 'Failed to create appraisal cycle');
            this.isSaving = false;
          }
        });
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
