import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { StageMasterDto, CreateStageMasterRequest, UpdateStageMasterRequest } from '@core/models/jobs.models';
import { JobsService } from '../../services/jobs.service';
import { NotificationService } from '@core/services/notification.service';

export interface StageFormDialogData {
  mode: 'create' | 'edit';
  stage?: StageMasterDto;
}

@Component({
  selector: 'app-stage-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './stage-form-dialog.component.html',
  styleUrls: ['./stage-form-dialog.component.scss']
})
export class StageFormDialogComponent {
  stageForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private jobsService: JobsService,
    private dialogRef: MatDialogRef<StageFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StageFormDialogData,
    private notification: NotificationService
  ) {
    this.stageForm = this.fb.group({
      stageName: ['', [Validators.required, Validators.maxLength(100)]],
      stageOrder: [null as number | null, []]
    });
    if (data.mode === 'edit' && data.stage) {
      this.stageForm.patchValue({
        stageName: data.stage.stageName,
        stageOrder: data.stage.stageOrder ?? null
      });
    }
  }

  onSubmit(): void {
    if (this.stageForm.invalid) {
      this.stageForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    const v = this.stageForm.value;
    if (this.data.mode === 'create') {
      const request: CreateStageMasterRequest = {
        stageName: v.stageName.trim(),
        stageOrder: v.stageOrder != null && v.stageOrder !== '' ? Number(v.stageOrder) : undefined
      };
      this.jobsService.createStage(request).subscribe({
        next: () => {
          this.notification.showSuccess('Stage created successfully');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.notification.showError(err?.message || 'Failed to create stage');
          this.isSubmitting = false;
        }
      });
    } else if (this.data.stage) {
      const request: UpdateStageMasterRequest = {
        stageName: v.stageName.trim(),
        stageOrder: v.stageOrder != null && v.stageOrder !== '' ? Number(v.stageOrder) : undefined
      };
      this.jobsService.updateStage(this.data.stage.stageId, request).subscribe({
        next: () => {
          this.notification.showSuccess('Stage updated successfully');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.notification.showError(err?.message || 'Failed to update stage');
          this.isSubmitting = false;
        }
      });
    }
  }
}
