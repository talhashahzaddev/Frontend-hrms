import { Component, Inject, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { KRA, Goal } from '../../../../core/models/performance.models';
import { Employee } from '../../../../core/models/employee.models';
import { PerformanceService } from '../../services/performance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface ManagerReviewDialogueData {
  employeeId: string;
  employeeName: string;
  cycleId: string;
  cycleName: string;
  kraId: string;
  kraName: string;
  goalId: string;
  goalName: string;
}

export interface ManagerReviewRequest {
  employeeId: string;
  cycleId: string;
  kraId: string;
  goalId: string;
  rating: number;
  feedback?: string;
  improvementArea?: string;
  status: string;
}


@Component({
  selector: 'app-manager-review-dialogue',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatCardModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>rate_review</mat-icon>
          </div>
          <div>
            <h2 class="header-title">Manager Review</h2>
            <p class="header-subtitle">Evaluate and provide feedback</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="reviewForm" (ngSubmit)="onSubmit()">
        <mat-dialog-content class="dialog-body">

          <!-- Info Section -->
          <div class="assign-section">
            <div class="assign-section-header">
              <mat-icon>info</mat-icon>
              <span>Review Details</span>
            </div>
            <div class="assign-section-body">
              <div class="assign-dates-grid">
                <div class="assign-field-group">
                  <label class="field-label">Employee Name</label>
                  <div class="readonly-value">{{ data.employeeName }}</div>
                </div>
                <div class="assign-field-group">
                  <label class="field-label">Appraisal Cycle Name</label>
                  <div class="readonly-value">{{ data.cycleName }}</div>
                </div>
              </div>
              <div class="assign-dates-grid">
                <div class="assign-field-group">
                  <label class="field-label">KRA Name</label>
                  <div class="readonly-value">{{ data.kraName }}</div>
                </div>
                <div class="assign-field-group">
                  <label class="field-label">Goal Name</label>
                  <div class="readonly-value">{{ data.goalName }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Input Section -->
          <div class="assign-section">
            <div class="assign-section-header">
              <mat-icon>edit_note</mat-icon>
              <span>Manager Evaluation</span>
            </div>
            <div class="assign-section-body">

              <div class="assign-dates-grid">
                <div class="assign-field-group">
                  <label class="field-label">Rating (0 - 5) <span class="required">*</span></label>
                  
                  <div style="display:flex; align-items:center; gap:16px;">
                    <div style="display:flex; align-items:center; gap:8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:8px 12px; width:140px;">
                      <input type="number" formControlName="rating" min="0" max="5" step="0.1" placeholder="0.0" style="width:100%; border:none; background:transparent; outline:none; font-size:14px; font-weight:600; color:#334155;">
                      <span style="font-size:14px; font-weight:500; color:#94a3b8; white-space:nowrap;">/ 5.0</span>
                    </div>

                    <div *ngIf="reviewForm.get('rating')?.value >= 4" style="display:flex; align-items:center; gap:6px; background:#fffbeb; border:1px solid #fde68a; border-radius:16px; padding:6px 12px;">
                      <mat-icon style="font-size:16px; width:16px; height:16px; color:#f59e0b;">star</mat-icon>
                      <span style="font-size:12px; font-weight:700; color:#92400e;">Excellent</span>
                    </div>
                  </div>
                  
                  <div *ngIf="reviewForm.get('rating')?.touched" style="margin-top:4px;">
                    <span class="error-text" *ngIf="reviewForm.get('rating')?.hasError('required')">Rating is required</span>
                    <span class="error-text" *ngIf="reviewForm.get('rating')?.hasError('min')">Rating must be at least 0</span>
                    <span class="error-text" *ngIf="reviewForm.get('rating')?.hasError('max')">Rating must be at most 5</span>
                  </div>
                </div>

                <div class="assign-field-group">
                  <label class="field-label">Status <span class="required">*</span></label>
                  <mat-form-field appearance="outline" class="mat-field">
                    <mat-select formControlName="status">
                      <mat-option value="SUBMITTED">Submitted</mat-option>
                      <mat-option value="DRAFT">Draft</mat-option>
                      <mat-option value="APPROVED">Approved</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              <div class="assign-field-group">
                <label class="field-label">Feedback</label>
                <mat-form-field appearance="outline" class="mat-field">
                  <textarea matInput formControlName="feedback" rows="3" placeholder="Provide detailed performance feedback..."></textarea>
                </mat-form-field>
              </div>

              <div class="assign-field-group">
                <label class="field-label">Improvement Area</label>
                <mat-form-field appearance="outline" class="mat-field">
                  <textarea matInput formControlName="improvementArea" rows="2" placeholder="Identify specific areas for growth and development..."></textarea>
                </mat-form-field>
              </div>

            </div>
          </div>
        </mat-dialog-content>

        <div class="dialog-footer">
          <button mat-stroked-button class="btn-cancel" type="button" mat-dialog-close [disabled]="isSubmitting">Cancel</button>
          <button mat-flat-button class="btn-submit" type="submit" [disabled]="reviewForm.invalid || isSubmitting">
            <mat-icon *ngIf="!isSubmitting">save</mat-icon>
            <mat-spinner diameter="16" *ngIf="isSubmitting" style="margin-right:8px;"></mat-spinner>
            <span *ngIf="!isSubmitting">Submit Review</span>
            <span *ngIf="isSubmitting">Submitting...</span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    @use '../../styles/performance-shared';

    .readonly-value {
      font-size: 14px;
      color: #1e293b;
      font-weight: 500;
      padding: 8px 12px;
      background: #f1f5f9;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      min-height: 20px;
    }

    .error-text {
      font-size: 11px;
      color: #ef4444;
      display: block;
    }

    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { 
      -webkit-appearance: none; 
      margin: 0; 
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManagerReviewDialogueComponent implements OnInit, OnDestroy {
  reviewForm: FormGroup;
  isSubmitting = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ManagerReviewDialogueComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ManagerReviewDialogueData,
    private performanceService: PerformanceService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    this.reviewForm = this.fb.group({
      rating: [null, [Validators.required, Validators.min(0), Validators.max(5)]],
      feedback: [''],
      improvementArea: [''],
      status: ['SUBMITTED', Validators.required]
    });
  }

  ngOnInit(): void {
    // Initialize form if needed
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.reviewForm.valid) {
      this.isSubmitting = true;
      const formValue = this.reviewForm.value;

      const request: ManagerReviewRequest = {
        employeeId: this.data.employeeId,
        cycleId: this.data.cycleId,
        kraId: this.data.kraId,
        goalId: this.data.goalId,
        rating: parseFloat(formValue.rating),
        feedback: formValue.feedback || undefined,
        improvementArea: formValue.improvementArea || undefined,
        status: formValue.status
      };

      // Call the API endpoint
      this.performanceService.submitManagerReview(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            this.cdr.markForCheck();

            if (response.success) {
              this.notificationService.showSuccess('Manager review submitted successfully');
              this.dialogRef.close(response.data);
            } else {
              this.notificationService.showError(response.message || 'Failed to submit review');
            }
          },
          error: (error) => {
            this.isSubmitting = false;
            this.cdr.markForCheck();
            console.error('Error submitting review:', error);
            this.notificationService.showError('Error submitting review. Please try again.');
          }
        });
    }
  }
}
