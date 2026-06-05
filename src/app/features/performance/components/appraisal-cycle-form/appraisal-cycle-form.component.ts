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
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle'; import { SharedCommonModule } from '@shared/shared-common.module';
// ← replaced MatCheckboxModule
import { PerformanceService } from '../../services/performance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  AppraisalCycleDto,
  UpdateAppraisalCycleRequest,
  CreateAppraisalCycleRequest
} from '../../../../core/models/performance.models';


@Component({
  selector: 'app-appraisal-cycle-form',
  standalone: true,
  imports: [
    SharedCommonModule,
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
    MatDialogModule,
    MatSelectModule,
    MatSlideToggleModule // ← replaced MatCheckboxModule
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
    @Inject(MAT_DIALOG_DATA) public data: { cycle?: AppraisalCycleDto }
  ) {
    this.isEditMode = !!data?.cycle;
    this.cycleId = data?.cycle?.cycleId;

    // Initialize reactive form with existing data if in edit mode
    this.cycleForm = this.fb.group({
      cycleName: [data?.cycle?.cycleName || '', Validators.required],
      cycleType: [data?.cycle?.cycleType || ''],
      description: [(data as any)?.cycle?.description || ''],
      status: [data?.cycle?.status || 'upcoming'],
      startDate: [data?.cycle?.startDate ? new Date(data.cycle.startDate) : '', Validators.required],
      endDate: [data?.cycle?.endDate ? new Date(data.cycle.endDate) : '', Validators.required],
      reviewStartDate: [data?.cycle?.reviewStartDate ? new Date(data.cycle.reviewStartDate) : ''],
      reviewEndDate: [data?.cycle?.reviewEndDate ? new Date(data.cycle.reviewEndDate) : ''],
      isSelfAssessmentEnable: [data?.cycle?.selfReviewEnabled || false],
      managerReview: [data?.cycle?.managerReviewEnabled || false],
      isAppraisalEnable: [data?.cycle?.appraisalEnabled || false]
    });
  }

  onSubmit(): void {
    if (!this.cycleForm.valid) return;

    this.isSaving = true;
    const f = this.cycleForm.value;

    // Map form values to backend DTO
    const request: UpdateAppraisalCycleRequest | CreateAppraisalCycleRequest = {
      cycleName: f.cycleName,
      cycleType: f.cycleType || null,
      startDate: f.startDate instanceof Date ? f.startDate.toISOString() : f.startDate,
      endDate: f.endDate instanceof Date ? f.endDate.toISOString() : f.endDate,
      reviewStartDate: f.reviewStartDate instanceof Date ? f.reviewStartDate.toISOString() : f.reviewStartDate,
      reviewEndDate: f.reviewEndDate instanceof Date ? f.reviewEndDate.toISOString() : f.reviewEndDate,
      isSelfAssessmentEnable: f.isSelfAssessmentEnable,
      managerReview: f.managerReview,
      isAppraisalEnable: f.isAppraisalEnable,
      description: f.description || null,
      status: f.status || (this.isEditMode ? this.data.cycle?.status || 'upcoming' : 'upcoming')
    };

    // Call create or update service method
    const request$ = this.isEditMode && this.cycleId
      ? this.performanceService.updateAppraisalCycle(this.cycleId, request)
      : this.performanceService.createAppraisalCycle(request);

    request$.subscribe({
      next: (res: any) => {
        if (res.success) {
          this.notificationService.showSuccess(
            this.isEditMode
              ? 'Appraisal cycle updated successfully'
              : 'Appraisal cycle created successfully'
          );
          this.dialogRef.close('saved');
        } else {
          this.notificationService.showError(res.message || 'Operation failed');
        }
        this.isSaving = false;
      },
      error: (err: any) => {
        console.error(err);
        this.notificationService.showError(err.error?.message || 'Operation failed');
        this.isSaving = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
