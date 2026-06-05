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
    <div class="dialog-header">
      <h2 mat-dialog-title>Manager Review</h2>
      <button mat-icon-button mat-dialog-close class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <form [formGroup]="reviewForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">

        <!-- Info Cards Grid -->
        <div class="info-cards">
          <div class="info-card">
            <p class="info-label">Employee Name</p>
            <p class="info-value">{{ data.employeeName }}</p>
          </div>
          <div class="info-card">
            <p class="info-label">Appraisal Cycle Name</p>
            <p class="info-value">{{ data.cycleName }}</p>
          </div>
          <div class="info-card">
            <p class="info-label">KRA Name</p>
            <p class="info-value">{{ data.kraName }}</p>
          </div>
          <div class="info-card">
            <p class="info-label">Goal Name</p>
            <p class="info-value">{{ data.goalName }}</p>
          </div>
        </div>

        <!-- Input Section -->
        <div class="input-section">

          <!-- Rating -->
          <div class="field-group">
            <label class="field-label">Rating</label>
            <div class="rating-row">
              <div class="rating-input-wrapper">
                <input
                  type="number"
                  formControlName="rating"
                  min="0"
                  max="5"
                  step="0.1"
                  placeholder="0.0"
                  class="rating-input" />
                <span class="rating-suffix">/ 5.0</span>
              </div>
              <div class="rating-badge" *ngIf="reviewForm.get('rating')?.value >= 4">
                <mat-icon class="star-icon">star</mat-icon>
                <span>Excellent</span>
              </div>
            </div>
            <span class="field-error" *ngIf="reviewForm.get('rating')?.touched && reviewForm.get('rating')?.hasError('required')">Rating is required</span>
            <span class="field-error" *ngIf="reviewForm.get('rating')?.touched && reviewForm.get('rating')?.hasError('min')">Rating must be at least 0</span>
            <span class="field-error" *ngIf="reviewForm.get('rating')?.touched && reviewForm.get('rating')?.hasError('max')">Rating must be at most 5</span>
          </div>

          <!-- Feedback -->
          <div class="field-group">
            <label class="field-label">Feedback</label>
            <textarea
              formControlName="feedback"
              rows="3"
              placeholder="Provide detailed performance feedback..."
              class="field-textarea"></textarea>
          </div>

          <!-- Improvement Area -->
          <div class="field-group">
            <label class="field-label">Improvement Area</label>
            <textarea
              formControlName="improvementArea"
              rows="2"
              placeholder="Identify specific areas for growth and development..."
              class="field-textarea"></textarea>
          </div>

          <!-- Status -->
          <div class="field-group">
            <label class="field-label">Status</label>
            <mat-form-field appearance="outline" class="status-field">
              <mat-select formControlName="status">
                <mat-option value="SUBMITTED">Submitted</mat-option>
                <mat-option value="DRAFT">Draft</mat-option>
                <mat-option value="APPROVED">Approved</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

        </div>
      </mat-dialog-content>

      <div class="dialog-actions">
        <button mat-button type="button" mat-dialog-close class="btn-cancel" [disabled]="isSubmitting">
          Cancel
        </button>
        <button mat-stroked-button type="button" class="btn-draft" [disabled]="isSubmitting">
          Save Draft
        </button>
        <button
          mat-raised-button
          type="submit"
          class="btn-submit"
          [disabled]="reviewForm.invalid || isSubmitting">
          <mat-spinner diameter="16" *ngIf="isSubmitting"></mat-spinner>
          {{ isSubmitting ? 'Submitting...' : 'Submit Review' }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    /* ── Dialog Container ── */
    ::ng-deep .mat-mdc-dialog-container {
      border-radius: 16px !important;
      padding: 0 !important;
      overflow: hidden !important;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08) !important;
      max-width: 580px !important;
      width: 90vw !important;
    }

    /* ── Header ── */
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #e2e8f0;
      background: #ffffff;

      h2 {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
        color: #0f172a;
        letter-spacing: -0.01em;
      }

      .close-button {
        color: #94a3b8;
        width: 32px;
        height: 32px;
        line-height: 32px;
        border-radius: 50%;
        transition: background 0.2s;

        &:hover {
          background: #f1f5f9;
          color: #64748b;
        }

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    /* ── Content ── */
    .dialog-content {
      padding: 16px 24px !important;
      overflow: hidden !important;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    /* ── Info Cards Grid ── */
    .info-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .info-card {
      padding: 10px 12px;
      background: #f8fafc;
      border-radius: 10px;
      border: 1px solid #e2e8f0;

      .info-label {
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
        margin: 0 0 3px;
      }

      .info-value {
        font-size: 13px;
        font-weight: 600;
        color: #334155;
        margin: 0;
        word-break: break-word;
        line-height: 1.3;
      }
    }

    /* ── Input Section ── */
    .input-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* ── Field Group ── */
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .field-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
    }

    /* ── Rating ── */
    .rating-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .rating-input-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #f1f5f9;
      border: 1px solid rgba(148, 163, 184, 0.5);
      border-radius: 10px;
      padding: 7px 12px;
      width: 120px;
      transition: all 0.2s;

      &:focus-within {
        border-color: #6764f2;
        box-shadow: 0 0 0 2px rgba(103, 100, 242, 0.12);
        background: #ffffff;
      }

      .rating-input {
        width: 100%;
        background: transparent;
        border: none;
        outline: none;
        font-size: 13px;
        font-weight: 600;
        color: #334155;
        padding: 0;

        &::placeholder { color: #94a3b8; }

        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        -moz-appearance: textfield;
      }

      .rating-suffix {
        font-size: 13px;
        font-weight: 500;
        color: #94a3b8;
        white-space: nowrap;
      }
    }

    .rating-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 9999px;
      padding: 4px 10px;

      .star-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
        color: #f59e0b;
      }

      span {
        font-size: 11px;
        font-weight: 700;
        color: #92400e;
      }
    }

    /* ── Textarea ── */
    .field-textarea {
      width: 100%;
      background: #f1f5f9;
      border: 1px solid rgba(148, 163, 184, 0.5);
      border-radius: 10px;
      font-size: 13px;
      color: #334155;
      padding: 10px 12px;
      resize: none;
      font-family: inherit;
      transition: all 0.2s;
      box-sizing: border-box;
      line-height: 1.5;

      &::placeholder { color: #94a3b8; }

      &:focus {
        outline: none;
        border-color: #6764f2;
        box-shadow: 0 0 0 2px rgba(103, 100, 242, 0.12);
        background: #ffffff;
      }
    }

    /* ── Status Select ── */
    .status-field {
      width: 100%;

      ::ng-deep {
        .mat-mdc-text-field-wrapper {
          background: #f1f5f9 !important;
          border-radius: 10px !important;
          padding: 0 12px !important;
        }

        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: rgba(148, 163, 184, 0.5) !important;
        }

        &.mat-focused {
          .mdc-notched-outline__leading,
          .mdc-notched-outline__notch,
          .mdc-notched-outline__trailing { border-color: #6764f2 !important; }

          .mat-mdc-text-field-wrapper {
            background: #ffffff !important;
            box-shadow: 0 0 0 2px rgba(103, 100, 242, 0.12) !important;
          }
        }

        .mat-mdc-select-value-text {
          font-size: 13px;
          font-weight: 500;
          color: #334155;
        }

        .mat-mdc-form-field-infix {
          min-height: 36px;
          padding-top: 7px;
          padding-bottom: 7px;
        }

        .mat-mdc-form-field-subscript-wrapper {
          display: none;
        }
      }
    }

    /* ── Field Error ── */
    .field-error {
      font-size: 11px;
      font-weight: 500;
      color: #ef4444;
    }

    /* ── Dialog Actions / Footer ── */
    .dialog-actions {
      padding: 14px 24px !important;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      margin: 0 !important;

      .btn-cancel {
        height: 36px;
        padding: 0 18px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #475569 !important;
        background: transparent !important;
        border: none !important;
        text-transform: none !important;
        transition: background 0.15s !important;
        letter-spacing: 0 !important;

        &:hover:not([disabled]) { background: #f1f5f9 !important; }
      }

      .btn-draft {
        height: 36px;
        padding: 0 18px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #6764f2 !important;
        border: 1px solid #6764f2 !important;
        background: transparent !important;
        text-transform: none !important;
        letter-spacing: 0 !important;
        transition: all 0.15s !important;

        &:hover:not([disabled]) { background: rgba(103, 100, 242, 0.05) !important; }
        &:active { transform: scale(0.97); }
      }

      .btn-submit {
        height: 36px;
        padding: 0 24px !important;
        border-radius: 8px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%) !important;
        border: none !important;
        text-transform: none !important;
        letter-spacing: 0 !important;
        box-shadow: 0 3px 10px rgba(99, 102, 241, 0.35) !important;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s !important;

        &:hover:not([disabled]) { box-shadow: 0 5px 16px rgba(99, 102, 241, 0.45) !important; }
        &:active { transform: scale(0.97); }

        &[disabled] {
          background: #e2e8f0 !important;
          color: #94a3b8 !important;
          box-shadow: none !important;
        }
      }
    }

    /* ── Responsive ── */
    @media (max-width: 600px) {
      .info-cards { grid-template-columns: 1fr; }

      ::ng-deep .mat-mdc-dialog-container {
        width: 95vw !important;
        max-width: 95vw !important;
      }
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
