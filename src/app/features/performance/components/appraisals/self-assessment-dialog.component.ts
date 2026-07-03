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
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>assessment</mat-icon>
          </div>
          <div>
            <h2 class="header-title">Self-Assessment</h2>
            <p class="header-subtitle">Evaluate your own performance</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-body">
        <form [formGroup]="assessmentForm" (ngSubmit)="onSubmit()">
          
          <div *ngIf="isLoading" class="loading-container" style="display:flex; flex-direction:column; align-items:center; padding:40px;">
            <mat-spinner diameter="32"></mat-spinner>
            <p style="margin-top:12px; color:#64748b;">Loading...</p>
          </div>

          <div *ngIf="!isLoading">
            
            <div class="assign-section">
              <div class="assign-section-header">
                <mat-icon>target</mat-icon>
                <span>Goal Details</span>
              </div>
              <div class="assign-section-body">

                <div class="assign-dates-grid">
                  <div class="assign-field-group">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <label class="field-label">KRA <span class="required">*</span></label>
                      <span *ngIf="assessmentForm.get('kraId')?.value" style="font-size:10px; font-weight:600; color:#10b981; display:flex; align-items:center; gap:4px;">
                        <span style="width:4px; height:4px; border-radius:50%; background:#10b981;"></span> COMPLETED
                      </span>
                    </div>
                    
                    <div *ngIf="isKRAReadOnly" class="readonly-value">
                      {{ getSelectedKRAName() }}
                    </div>
                    
                    <mat-form-field *ngIf="!isKRAReadOnly" appearance="outline" class="mat-field">
                      <mat-select formControlName="kraId" placeholder="Select KRA">
                        <mat-option [value]="">Select a KRA</mat-option>
                        <mat-option *ngFor="let kra of kras" [value]="kra.kraId">
                          {{ kra.title }}
                        </mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>

                  <div class="assign-field-group">
                    <label class="field-label">GOAL <span class="required">*</span></label>
                    
                    <div *ngIf="isGoalReadOnly" class="readonly-value">
                      {{ getSelectedGoalName() }}
                    </div>
                    
                    <mat-form-field *ngIf="!isGoalReadOnly" appearance="outline" class="mat-field">
                      <mat-select formControlName="goalId" placeholder="Select Goal">
                        <mat-option [value]="">Select a Goal</mat-option>
                        <mat-option *ngFor="let goal of goals" [value]="goal.goalId">
                          {{ goal.title }}
                        </mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                </div>

              </div>
            </div>

            <div class="assign-section">
              <div class="assign-section-header">
                <mat-icon>star</mat-icon>
                <span>Achievement Rating</span>
              </div>
              <div class="assign-section-body">
                <div class="assign-field-group">
                  <label class="field-label">How would you rate your achievement? (0 - 5) <span class="required">*</span></label>
                  
                  <div style="display:flex; align-items:center; gap:16px;">
                    <div style="display:flex; align-items:center; gap:8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:8px 12px; width:140px;">
                      <input type="number" formControlName="selfRating" min="0" max="5" step="0.1" placeholder="0.0" style="width:100%; border:none; background:transparent; outline:none; font-size:14px; font-weight:600; color:#334155;">
                      <span style="font-size:14px; font-weight:500; color:#94a3b8; white-space:nowrap;">/ 5.0</span>
                    </div>

                    <div *ngIf="assessmentForm.get('selfRating')?.value >= 4" style="display:flex; align-items:center; gap:6px; background:#fffbeb; border:1px solid #fde68a; border-radius:16px; padding:6px 12px;">
                      <mat-icon style="font-size:16px; width:16px; height:16px; color:#f59e0b;">star</mat-icon>
                      <span style="font-size:12px; font-weight:700; color:#92400e;">Excellent</span>
                    </div>
                  </div>

                  <div *ngIf="assessmentForm.get('selfRating')?.touched" style="margin-top:4px;">
                    <span class="error-text" *ngIf="assessmentForm.get('selfRating')?.hasError('required')">Rating is required</span>
                    <span class="error-text" *ngIf="assessmentForm.get('selfRating')?.hasError('min')">Must be at least 0</span>
                    <span class="error-text" *ngIf="assessmentForm.get('selfRating')?.hasError('max')">Must be at most 5</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="assign-section">
              <div class="assign-section-header">
                <mat-icon>comment</mat-icon>
                <span>Self-Assessment Comments</span>
              </div>
              <div class="assign-section-body">
                <div class="assign-field-group">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <label class="field-label">COMMENTS</label>
                    <span style="font-size:10px; color:#94a3b8;">Min. 50 characters</span>
                  </div>
                  <mat-form-field appearance="outline" class="mat-field">
                    <textarea matInput formControlName="selfComment" rows="3" placeholder="Describe your key achievements, challenges faced, and how you contributed..."></textarea>
                  </mat-form-field>
                  <div style="display:flex; align-items:flex-start; gap:8px; padding:10px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; margin-top:8px;">
                    <mat-icon style="color:#3b82f6; font-size:16px; width:16px; height:16px;">info</mat-icon>
                    <span style="font-size:12px; color:#1e40af; line-height:1.4;">Tip: Focus on quantifiable outcomes and specific examples.</span>
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="!isLoading && kras.length === 0" style="display:flex; align-items:center; gap:8px; padding:12px; background:#fef3c7; border:1px solid #fde68a; border-radius:8px; color:#92400e; margin-top:16px;">
              <mat-icon style="color:#f59e0b;">info</mat-icon>
              <span style="font-size:13px;">No KRAs available for assessment.</span>
            </div>

          </div>
        </form>
      </mat-dialog-content>

      <div class="dialog-footer">
        <button mat-stroked-button class="btn-cancel" mat-dialog-close [disabled]="isSubmitting">Cancel</button>
        <button mat-flat-button class="btn-submit" (click)="onSubmit()" [disabled]="assessmentForm.invalid || isSubmitting || !assessmentForm.get('kraId')?.value">
          <mat-icon *ngIf="!isSubmitting">send</mat-icon>
          <mat-spinner diameter="16" *ngIf="isSubmitting" style="margin-right:8px;"></mat-spinner>
          <span *ngIf="!isSubmitting">Submit Assessment</span>
          <span *ngIf="isSubmitting">Submitting...</span>
        </button>
      </div>
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
