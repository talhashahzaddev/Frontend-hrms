import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { KRA, CreateSelfAssessmentRequest, Goal } from '../../../../core/models/performance.models';
import { AuthService } from '../../../../core/services/auth.service';
import { PerformanceService } from '../../services/performance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Subject, takeUntil } from 'rxjs';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface SelfAssessmentDialogData {
  goals?: Goal[];
  selectedGoal?: Goal;
}


@Component({
  selector: 'app-self-assessment-dialog',
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
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-wrapper">
      <!-- Modal Header -->
      <div class="dialog-header">
        <h2 class="dialog-title">Self-Assessment</h2>
        <button mat-icon-button mat-dialog-close class="close-button" type="button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="assessmentForm" (ngSubmit)="onSubmit()">
        <mat-dialog-content class="dialog-content">
          
          <div *ngIf="isLoading" class="loading-container">
            <mat-spinner diameter="32"></mat-spinner>
            <p>Loading...</p>
          </div>

          <div *ngIf="!isLoading" class="form-container">
            
            <!-- KRA and Goal Fields (Side by Side) -->
            <div class="fields-grid">
              <!-- KRA Field -->
              <div class="field-group">
                <div class="field-label-row">
                  <label class="field-label">KRA</label>
                  <span *ngIf="assessmentForm.get('kraId')?.value" class="status-badge">
                    <span class="status-dot"></span>
                    COMPLETED
                  </span>
                </div>
                <!-- Read-only display when pre-selected -->
                <div *ngIf="isKRAReadOnly" class="read-only-field">
                  <span class="read-only-value">{{ getSelectedKRAName() }}</span>
                </div>
                <!-- Editable select when not pre-selected -->
                <mat-form-field *ngIf="!isKRAReadOnly" appearance="outline" class="custom-select">
                  <mat-select formControlName="kraId" placeholder="Select KRA">
                    <mat-option [value]="">Select a KRA</mat-option>
                    <mat-option *ngFor="let kra of kras" [value]="kra.kraId">
                      {{ kra.title }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <!-- Goal Field -->
              <div class="field-group">
                <div class="field-label-row">
                  <label class="field-label">GOAL</label>
                </div>
                <!-- Read-only display when pre-selected -->
                <div *ngIf="isGoalReadOnly" class="read-only-field">
                  <span class="read-only-value">{{ getSelectedGoalName() }}</span>
                </div>
                <!-- Editable select when not pre-selected -->
                <mat-form-field *ngIf="!isGoalReadOnly" appearance="outline" class="custom-select">
                  <mat-select formControlName="goalId" placeholder="Select Goal">
                    <mat-option [value]="">Select a Goal</mat-option>
                    <mat-option *ngFor="let goal of goals" [value]="goal.goalId">
                      {{ goal.title }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>

            <!-- Rating Section -->
            <section class="rating-section">
              <label class="section-label">HOW WOULD YOU RATE YOUR ACHIEVEMENT?</label>
              
              <div class="rating-row">
                <div class="rating-input-wrapper">
                  <input
                    type="number"
                    formControlName="selfRating"
                    min="0"
                    max="5"
                    step="0.1"
                    placeholder="0.0"
                    class="rating-input" />
                  <span class="rating-suffix">/ 5.0</span>
                </div>
                <div class="rating-badge" *ngIf="assessmentForm.get('selfRating')?.value >= 4">
                  <mat-icon class="star-icon">star</mat-icon>
                  <span>Excellent</span>
                </div>
              </div>
              <span class="field-error" *ngIf="assessmentForm.get('selfRating')?.touched && assessmentForm.get('selfRating')?.hasError('required')">Rating is required</span>
              <span class="field-error" *ngIf="assessmentForm.get('selfRating')?.touched && assessmentForm.get('selfRating')?.hasError('min')">Rating must be at least 0</span>
              <span class="field-error" *ngIf="assessmentForm.get('selfRating')?.touched && assessmentForm.get('selfRating')?.hasError('max')">Rating must be at most 5</span>
            </section>

            <!-- Comment Section -->
            <section class="comment-section">
              <div class="comment-header">
                <label class="section-label" for="selfComment">SELF-ASSESSMENT COMMENTS</label>
                <span class="char-hint">Min. 50 characters</span>
              </div>
              
              <textarea 
                id="selfComment"
                class="comment-textarea"
                formControlName="selfComment" 
                rows="3" 
                placeholder="Describe your key achievements, challenges faced, and how you contributed..."></textarea>

              <div class="info-box">
                <mat-icon class="info-icon">info</mat-icon>
                <p class="info-text">
                  Tip: Focus on quantifiable outcomes and specific examples.
                </p>
              </div>
            </section>

            <!-- No KRAs Message -->
            <div *ngIf="!isLoading && kras.length === 0" class="no-kras-message">
              <mat-icon>info</mat-icon>
              <p>No KRAs available for assessment.</p>
            </div>

          </div>

        </mat-dialog-content>

        <!-- Footer Actions -->
        <div class="dialog-footer">
          <button 
            mat-button 
            type="button" 
            mat-dialog-close 
            class="cancel-button"
            [disabled]="isSubmitting">
            Cancel
          </button>
          <button 
            mat-raised-button 
            type="submit"
            class="submit-button"
            [disabled]="assessmentForm.invalid || isSubmitting || !assessmentForm.get('kraId')?.value">
            <span *ngIf="!isSubmitting">Submit Assessment</span>
            <span *ngIf="isSubmitting">Submitting...</span>
            <mat-icon *ngIf="!isSubmitting">send</mat-icon>
            <mat-spinner diameter="14" *ngIf="isSubmitting"></mat-spinner>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    /* Dialog Container Overrides */
    ::ng-deep .mat-mdc-dialog-container {
      border-radius: 12px !important;
      padding: 0 !important;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04) !important;
      max-width: 480px !important;
      width: 100% !important;
      background: #ffffff !important;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .dialog-wrapper {
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }

    /* Header */
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(226, 232, 240, 0.3);
      background: #ffffff;
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .close-button {
      color: #94a3b8 !important;
      width: 28px !important;
      height: 28px !important;
      margin: -4px -4px 0 0 !important;
      
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        color: #64748b !important;
        background: transparent !important;
      }
    }

    /* Content */
    .dialog-content {
      padding: 20px 24px !important;
      overflow-y: visible !important;
      max-height: none !important;
    }

    .form-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      gap: 12px;

      p {
        color: #64748b;
        font-size: 13px;
        margin: 0;
      }
    }

    /* Fields Grid */
    .fields-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 12px;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 14px;
      padding-left: 2px;
    }

    .field-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 8px;
      font-weight: 700;
      color: #10b981;
      text-transform: uppercase;
    }

    .status-dot {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background-color: #10b981;
    }

    /* Custom Select Styling */
    ::ng-deep .custom-select {
      width: 100%;

      .mat-mdc-text-field-wrapper {
        background-color: #f8fafc;
        border-radius: 8px;
        padding: 0;
      }

      .mat-mdc-form-field-flex {
        height: 36px;
        align-items: center;
        padding: 0 10px;
      }

      .mat-mdc-form-field-infix {
        padding: 0 !important;
        border: none;
        min-height: auto;
      }

      .mat-mdc-select {
        font-size: 13px;
        font-weight: 500;
        color: #334155;
      }

      .mat-mdc-select-placeholder {
        color: #94a3b8;
        font-size: 13px;
      }

      .mat-mdc-select-arrow {
        color: #64748b;
      }

      .mdc-notched-outline {
        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: #e2e8f0 !important;
          border-width: 1px !important;
        }
      }

      &.mat-focused .mdc-notched-outline {
        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: #6764f2 !important;
          border-width: 2px !important;
        }
      }

      &:hover:not(.mat-focused) .mdc-notched-outline {
        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: #cbd5e1 !important;
        }
      }

      .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }
    }

    /* Read-only Field Styling */
    .read-only-field {
      display: flex;
      align-items: center;
      height: 36px;
      padding: 0 12px;
      background-color: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: default;
    }

    .read-only-value {
      font-size: 13px;
      font-weight: 500;
      color: #334155;
    }

    /* Rating Section */
    .rating-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .section-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
    }

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
      border-radius: 8px;
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

    .field-error {
      font-size: 11px;
      font-weight: 500;
      color: #ef4444;
    }

    /* Comment Section */
    .comment-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .comment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .char-hint {
      font-size: 9px;
      font-weight: 500;
      color: #94a3b8;
    }

    .comment-textarea {
      width: 100%;
      background-color: #f1f5f9;
      border: none;
      border-radius: 8px;
      padding: 12px;
      font-size: 13px;
      font-family: inherit;
      color: #0f172a;
      resize: none;
      transition: all 0.2s ease;
      outline: none;
      line-height: 1.4;

      &::placeholder {
        color: #94a3b8;
        font-size: 12px;
      }

      &:focus {
        background-color: #ffffff;
        box-shadow: 0 0 0 2px rgba(103, 100, 242, 0.2);
      }
    }

    .info-box {
      display: flex;
      gap: 10px;
      padding: 10px;
      background: rgba(238, 242, 255, 0.5);
      border: 1px solid rgba(224, 231, 255, 0.5);
      border-radius: 8px;
      margin-top: 8px;
    }

    .info-icon {
      color: #6366f1;
      font-size: 14px;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .info-text {
      font-size: 11px;
      line-height: 1.4;
      color: #4338ca;
      margin: 0;
    }

    /* No KRAs Message */
    .no-kras-message {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px;
      background: #fef3c7;
      border-radius: 8px;
      border: 1px solid #fde68a;
      color: #92400e;

      mat-icon {
        color: #f59e0b;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      p {
        margin: 0;
        font-size: 13px;
      }
    }

    /* Footer */
    .dialog-footer {
      padding: 16px 24px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      border-top: none;
    }

    .cancel-button {
      padding: 0 20px !important;
      height: 36px !important;
      border-radius: 8px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      text-transform: none !important;
      color: #64748b !important;
      background: transparent !important;
      transition: all 0.2s ease !important;

      &:hover:not([disabled]) {
        background: rgba(148, 163, 184, 0.1) !important;
      }

      &[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .submit-button {
      padding: 0 24px !important;
      height: 36px !important;
      border-radius: 8px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      text-transform: none !important;
      background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%) !important;
      color: white !important;
      box-shadow: 0 4px 16px rgba(139, 92, 246, 0.2) !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      transition: all 0.2s ease !important;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        margin: 0;
      }

      mat-spinner {
        margin: 0;
      }

      &:hover:not([disabled]) {
        opacity: 0.9;
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(139, 92, 246, 0.3) !important;
      }

      &:active:not([disabled]) {
        transform: scale(0.95);
      }

      &[disabled] {
        background: #e2e8f0 !important;
        color: #94a3b8 !important;
        box-shadow: none !important;
        cursor: not-allowed;
      }
    }

    /* Responsive */
    @media (max-width: 640px) {
      ::ng-deep .mat-mdc-dialog-container {
        max-width: 95vw !important;
      }

      .dialog-header,
      .dialog-content,
      .dialog-footer {
        padding-left: 16px !important;
        padding-right: 16px !important;
      }

      .fields-grid {
        grid-template-columns: 1fr;
      }

      .stars-container {
        gap: 2px;
        padding: 0;
      }

      .star-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .star-label {
        font-size: 8px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelfAssessmentDialogComponent implements OnInit, OnDestroy {
  assessmentForm: FormGroup;
  isSubmitting = false;
  isLoading = false;
  goals: Goal[] = [];
  kras: KRA[] = [];
  isGoalReadOnly = false;
  isKRAReadOnly = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SelfAssessmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SelfAssessmentDialogData,
    private performanceService: PerformanceService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    this.assessmentForm = this.fb.group({
      goalId: ['', Validators.required],
      kraId: ['', Validators.required],
      selfRating: [null, [Validators.required, Validators.min(0), Validators.max(5)]],
      selfComment: ['']
    });
  }

  ngOnInit(): void {
    this.loadGoals();
    this.loadKras();
    
    // If a goal is pre-selected, populate the form with its data
    if (this.data?.selectedGoal) {
      this.populateFromSelectedGoal();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private populateFromSelectedGoal(): void {
    const selectedGoal = this.data.selectedGoal;
    if (selectedGoal && selectedGoal.goalId && selectedGoal.kraId) {
      this.assessmentForm.patchValue({
        goalId: selectedGoal.goalId,
        kraId: selectedGoal.kraId
      });
      this.isGoalReadOnly = true;
      this.isKRAReadOnly = true;
    }
  }

  getSelectedGoalName(): string {
    return this.data?.selectedGoal?.title || 'N/A';
  }

  getSelectedKRAName(): string {
    return this.data?.selectedGoal?.kraName || 'N/A';
  }

  loadGoals(): void {
    this.performanceService.getAllGoals()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.goals = response.data || [];
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error loading goals:', error);
          this.notificationService.showWarning('Could not load goals');
        }
      });
  }

  loadKras(): void {
    this.isLoading = true;
    this.performanceService.getKRAs(1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const paginatedData = response.data as any;
            this.kras = (paginatedData.data || paginatedData.items || []).filter((kra: KRA) => kra.isActive);
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading KRAs:', error);
          this.notificationService.showWarning('Could not load KRAs');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onSubmit(): void {
    if (this.assessmentForm.valid) {
      const formValue = this.assessmentForm.value;

      if (!formValue.goalId || !formValue.kraId || !formValue.selfRating) {
        this.notificationService.showError('Please fill in all required fields');
        return;
      }

      this.isSubmitting = true;

      const request: CreateSelfAssessmentRequest = {
        goalId: formValue.goalId,
        kraId: formValue.kraId,
        selfRating: parseFloat(formValue.selfRating),
        selfComment: formValue.selfComment || ''
      };

      this.performanceService.createSelfAssessment(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.showSuccess('Self-assessment created successfully');
              this.dialogRef.close({ success: true });
            } else {
              this.notificationService.showError(response.message || 'Failed to create self-assessment');
              this.isSubmitting = false;
              this.cdr.markForCheck();
            }
          },
          error: (error) => {
            console.error('Error creating self-assessment:', error);
            this.notificationService.showError(error.error?.message || 'Failed to create self-assessment');
            this.isSubmitting = false;
            this.cdr.markForCheck();
          }
        });
    } else {
      Object.keys(this.assessmentForm.controls).forEach(key => {
        const control = this.assessmentForm.get(key);
        if (control) {
          control.markAsTouched();
        }
      });
    }
  }
}
