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
import { MatChipsModule } from '@angular/material/chips';
import { AppraisalCycle, KRA, CreateSelfAssessmentRequest } from '../../../../core/models/performance.models';
import { AuthService } from '../../../../core/services/auth.service';
import { PerformanceService } from '../../services/performance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';

export interface SelfAssessmentDialogData {
  appraisalCycles: AppraisalCycle[];
}

@Component({
  selector: 'app-self-assessment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>rate_review</mat-icon>
        Self-Assessment Appraisal
      </h2>
      <button mat-icon-button mat-dialog-close class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <form [formGroup]="assessmentForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        
        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading assessment data...</p>
        </div>

        <div *ngIf="!isLoading" class="form-section">
          <!-- Cycle Selection -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Appraisal Cycle *</mat-label>
              <mat-icon matPrefix>schedule</mat-icon>
              <mat-select formControlName="cycleId">
                <mat-option *ngFor="let cycle of data.appraisalCycles" [value]="cycle.cycleId">
                  {{ cycle.cycleName }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="assessmentForm.get('cycleId')?.hasError('required')">
                Cycle is required
              </mat-error>
            </mat-form-field>
          </div>

          <!-- KRA Selection Section -->
          <div class="form-section" *ngIf="availableKras.length > 0">
            <h3 class="section-title">
              <mat-icon>target</mat-icon>
              Key Result Area (KRA)
            </h3>
            <p class="section-description">Select a KRA and rate your performance (1-5 scale)</p>

            <!-- KRA Selection -->
            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Select KRA *</mat-label>
                <mat-icon matPrefix>checklist</mat-icon>
                <mat-select formControlName="kraId">
                  <mat-option [value]="">Select a KRA</mat-option>
                  <mat-option *ngFor="let kra of availableKras" 
                              [value]="kra.kraId"
                              [disabled]="isKraAlreadyRated(kra.kraId)">
                    {{ kra.title }}
                    <span *ngIf="isKraAlreadyRated(kra.kraId)" class="already-rated-badge">(Already Rated)</span>
                  </mat-option>
                </mat-select>
                <mat-hint *ngIf="!isLoadingExistingRatings">KRAs already rated are disabled</mat-hint>
                <mat-error *ngIf="assessmentForm.get('kraId')?.hasError('required')">
                  KRA selection is required
                </mat-error>
                <mat-error *ngIf="isLoadingExistingRatings">Checking existing ratings...</mat-error>
              </mat-form-field>
            </div>

            <!-- Rating -->
            <div class="form-row" *ngIf="assessmentForm.get('kraId')?.value">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Rating (1-5) *</mat-label>
                <mat-icon matPrefix>star</mat-icon>
                <input matInput 
                       type="number" 
                       formControlName="rating" 
                       min="1" 
                       max="5" 
                       step="1" 
                       placeholder="Enter rating">
                <mat-error *ngIf="assessmentForm.get('rating')?.hasError('required')">
                  Rating is required
                </mat-error>
                <mat-error *ngIf="assessmentForm.get('rating')?.hasError('min')">
                  Minimum rating is 1
                </mat-error>
                <mat-error *ngIf="assessmentForm.get('rating')?.hasError('max')">
                  Maximum rating is 5
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- No KRAs Message -->
          <div *ngIf="!isLoading && availableKras.length === 0" class="no-kras-message">
            <mat-icon>info</mat-icon>
            <p>No KRAs available for assessment. Please contact your manager or HR.</p>
          </div>

          <!-- Comments and Evidence Section -->
          <div class="form-section">
            <h3 class="section-title">
              <mat-icon>comment</mat-icon>
              Additional Information
            </h3>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Comments</mat-label>
                <mat-icon matPrefix>notes</mat-icon>
                <textarea matInput 
                          formControlName="comments" 
                          rows="4" 
                          placeholder="Enter your comments..."></textarea>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Add Evidence URL</mat-label>
                <mat-icon matPrefix>add_link</mat-icon>
                <input matInput 
                       #evidenceUrlInput
                       type="url" 
                       placeholder="Enter evidence URL and press Enter or click Add"
                       (keyup.enter)="addEvidenceUrl(evidenceUrlInput)">
                <button matSuffix mat-icon-button (click)="addEvidenceUrl(evidenceUrlInput)" type="button" color="primary">
                  <mat-icon>add</mat-icon>
                </button>
                <mat-hint>Add evidence URLs to support your assessment</mat-hint>
              </mat-form-field>
            </div>

            <!-- Evidence URLs Display -->
            <div class="form-row" *ngIf="evidenceUrlsArray.length > 0">
              <div class="evidence-urls-container">
                <label class="evidence-label">Evidence URLs:</label>
                <div class="evidence-chips">
                  <mat-chip *ngFor="let url of evidenceUrlsArray" (removed)="removeEvidenceUrl(url)">
                    <a [href]="url" target="_blank" rel="noopener noreferrer" class="evidence-link">
                      {{ url }}
                    </a>
                    <button matChipRemove>
                      <mat-icon>cancel</mat-icon>
                    </button>
                  </mat-chip>
                </div>
              </div>
            </div>
          </div>
        </div>

      </mat-dialog-content>

      <div class="dialog-actions">
        <button mat-stroked-button type="button" mat-dialog-close [disabled]="isSubmitting">
          Cancel
        </button>
        <button 
          mat-raised-button 
          color="primary" 
          class="submit-button"
          type="submit"
          [disabled]="assessmentForm.invalid || isSubmitting || !assessmentForm.get('kraId')?.value">
          <mat-spinner diameter="20" *ngIf="isSubmitting"></mat-spinner>
          <mat-icon *ngIf="!isSubmitting">send</mat-icon>
          {{ isSubmitting ? 'Creating...' : 'Create Self-Assessment' }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    ::ng-deep .mat-mdc-dialog-container {
      border-radius: 16px !important;
      padding: 0 !important;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
      max-width: 900px !important;
      width: 90vw !important;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;

      h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        color: white;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          color: white;
        }
      }

      .close-button {
        color: white;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: rotate(90deg);
        }
      }
    }

    .dialog-content {
      padding: 28px !important;
      max-height: 70vh;
      overflow-y: auto;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      gap: 16px;

      p {
        color: #6b7280;
        font-size: 14px;
        margin: 0;
      }
    }

    .form-section {
      margin-bottom: 24px;

      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 12px;
        padding-bottom: 12px;
        border-bottom: 2px solid #e5e7eb;

        mat-icon {
          font-size: 1.25rem;
          width: 1.25rem;
          height: 1.25rem;
          color: #667eea;
        }
      }

      .section-description {
        color: #6b7280;
        font-size: 14px;
        margin: 0 0 16px;
      }
    }

    .form-row {
      margin-bottom: 16px;
    }

    .full-width {
      width: 100%;
    }

    .evidence-urls-container {
      width: 100%;
      margin-top: 8px;

      .evidence-label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: #6b7280;
        margin-bottom: 12px;
      }

      .evidence-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        ::ng-deep mat-chip {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.05) 100%) !important;
          border: 1px solid rgba(102, 126, 234, 0.3) !important;
          color: #667eea !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          height: auto !important;
          padding: 8px 12px !important;
          border-radius: 8px !important;

          .evidence-link {
            color: #667eea;
            text-decoration: none;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            display: inline-block;
            margin-right: 8px;

            &:hover {
              text-decoration: underline;
            }
          }

          button[matChipRemove] {
            color: #dc2626 !important;
            opacity: 0.7;
            transition: opacity 0.2s ease;

            &:hover {
              opacity: 1;
            }

            mat-icon {
              font-size: 16px;
              width: 16px;
              height: 16px;
            }
          }
        }
      }
    }

    .no-kras-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px;
      background: #fef3c7;
      border-radius: 8px;
      border: 1px solid #fde68a;
      color: #92400e;

      mat-icon {
        color: #f59e0b;
      }

      p {
        margin: 0;
        font-size: 14px;
      }
    }

    ::ng-deep mat-form-field {
      &.mat-form-field-appearance-outline {
        .mat-mdc-text-field-wrapper {
          background: #f9fafb;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .mat-mdc-form-field-flex {
          padding: 0 16px;
        }

        .mat-mdc-notch-piece {
          border-color: #e5e7eb !important;
          transition: border-color 0.3s ease;
        }

        &:hover .mat-mdc-text-field-wrapper {
          background: white;
        }

        &:hover .mat-mdc-notch-piece {
          border-color: #667eea !important;
        }

        &.mat-focused {
          .mat-mdc-text-field-wrapper {
            background: white;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          .mat-mdc-notch-piece {
            border-color: #667eea !important;
            border-width: 2px !important;
          }
        }

        .mat-mdc-form-field-label {
          color: #6b7280;
          font-weight: 500;
        }

        &.mat-focused .mat-mdc-form-field-label {
          color: #667eea;
        }

        input,
        textarea {
          color: #1f2937;
          font-weight: 500;
        }

        &.mat-form-field-invalid {
          .mat-mdc-notch-piece {
            border-color: #dc2626 !important;
          }

          .mat-mdc-form-field-label {
            color: #dc2626;
          }
        }

        .mat-mdc-form-field-icon-prefix {
          padding-right: 20px !important;
          margin-right: 4px !important;
          width: auto !important;
          min-width: 44px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          
          mat-icon {
            color: #667eea;
            margin-right: 0 !important;
            margin-left: 0 !important;
            flex-shrink: 0;
          }
        }

        .mat-mdc-form-field-infix {
          margin-left: 0 !important;
          padding-left: 0 !important;
          min-height: 48px;
        }

        .mat-mdc-select,
        .mat-mdc-input-element,
        .mat-mdc-text-field-input {
          margin-left: 0 !important;
          padding-left: 0 !important;
        }

        .mat-mdc-select-trigger {
          padding-left: 0 !important;
          margin-left: 0 !important;
        }

        .mat-mdc-form-field-flex {
          align-items: center;
          gap: 0;
        }

        .mat-mdc-form-field-subscript-wrapper {
          margin-top: 4px;
        }
      }
    }

    .dialog-actions {
      padding: 20px 28px !important;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 12px;

      button {
        height: 44px;
        padding: 0 28px !important;
        border-radius: 12px !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        text-transform: none !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        display: flex;
        align-items: center;
        gap: 8px;

        &[mat-stroked-button] {
          background: white !important;
          color: #6b7280 !important;
          border: 2px solid #e5e7eb !important;

          &:hover:not([disabled]) {
            background: #f9fafb !important;
            border-color: #cbd5e1 !important;
            color: #374151 !important;
          }
        }

        &.submit-button:not([disabled]) {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          border: none !important;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3) !important;
          position: relative;
          overflow: hidden;

          &::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.5s;
          }

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;

            &::before {
              left: 100%;
            }
          }

          &:active {
            transform: translateY(0);
          }

          mat-icon {
            margin-right: 0;
          }

          mat-spinner {
            margin-right: 0;
          }
        }

        &[disabled] {
          background: #f3f4f6 !important;
          color: #9ca3af !important;
          border: 1px solid #e5e7eb !important;
          cursor: not-allowed;
          box-shadow: none !important;

          &:hover {
            transform: none !important;
          }
        }
      }
    }

    .already-rated-badge {
      color: #dc2626;
      font-size: 0.75rem;
      font-weight: 600;
      margin-left: 8px;
      font-style: italic;
    }

    ::ng-deep .mat-mdc-option[aria-disabled="true"] {
      opacity: 0.6;
      cursor: not-allowed;
    }

    ::ng-deep mat-error {
      font-size: 13px;
      font-weight: 500;
      color: #dc2626;
      margin-top: 4px;
    }

    @media (max-width: 768px) {
      ::ng-deep .mat-mdc-dialog-container {
        width: 95vw !important;
        max-width: 95vw !important;
      }

      .dialog-content {
        max-height: 80vh;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelfAssessmentDialogComponent implements OnInit, OnDestroy {
  assessmentForm: FormGroup;
  isSubmitting = false;
  isLoading = false;
  isLoadingExistingRatings = false;
  availableKras: KRA[] = [];
  alreadyRatedKraIds: Set<string> = new Set();
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
      cycleId: ['', Validators.required],
      kraId: ['', Validators.required],
      rating: [null, [Validators.required, Validators.min(1), Validators.max(5)]],
      comments: [''],
      evidenceUrls: [[]]
    });
  }

  ngOnInit(): void {
    this.loadKras();
    
    // Watch for cycle changes to check existing ratings
    this.assessmentForm.get('cycleId')?.valueChanges.subscribe(() => {
      this.checkExistingRatings();
    });
  }

  checkExistingRatings(): void {
    const cycleId = this.assessmentForm.get('cycleId')?.value;
    const currentUser = this.authService.getCurrentUserValue();

    if (!cycleId || !currentUser?.userId) {
      this.alreadyRatedKraIds.clear();
      this.cdr.markForCheck();
      return;
    }

    this.isLoadingExistingRatings = true;
    
    // Fetch existing appraisals and self-assessments
    Promise.all([
      firstValueFrom(this.performanceService.getEmployeeAppraisalsByCycle(cycleId, currentUser.userId)),
      firstValueFrom(this.performanceService.getSelfAssessments(currentUser.userId, cycleId))
    ]).then(([appraisalsResponse, selfAssessmentsResponse]) => {
      const ratedKraIds = new Set<string>();

      // Extract KRA IDs from existing appraisals
      if (appraisalsResponse?.success && appraisalsResponse.data) {
        appraisalsResponse.data.forEach((appraisal: any) => {
          if (appraisal.kraRatings && typeof appraisal.kraRatings === 'object') {
            Object.keys(appraisal.kraRatings).forEach(kraId => {
              ratedKraIds.add(kraId);
            });
          }
        });
      }

      // Extract KRA IDs from existing self-assessments
      if (selfAssessmentsResponse?.success && selfAssessmentsResponse.data) {
        selfAssessmentsResponse.data.forEach((assessment: any) => {
          if (assessment.kraId) {
            ratedKraIds.add(assessment.kraId);
          }
        });
      }

      this.alreadyRatedKraIds = ratedKraIds;
      
      // Clear selected KRA if it's already rated
      const currentKraId = this.assessmentForm.get('kraId')?.value;
      if (currentKraId && ratedKraIds.has(currentKraId)) {
        this.assessmentForm.patchValue({ kraId: '' });
        this.notificationService.showWarning('This KRA is already rated. Please select a different KRA.');
      }

      this.isLoadingExistingRatings = false;
      this.cdr.markForCheck();
    }).catch((error) => {
      console.error('Error checking existing ratings:', error);
      this.isLoadingExistingRatings = false;
      this.cdr.markForCheck();
    });
  }

  isKraAlreadyRated(kraId: string): boolean {
    return this.alreadyRatedKraIds.has(kraId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  loadKras(): void {
    this.isLoading = true;
    this.performanceService.getKRAs(1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const paginatedData = response.data as any;
            this.availableKras = (paginatedData.items || paginatedData.data || []).filter((kra: KRA) => kra.isActive);
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading KRAs:', error);
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }


  evidenceUrlsArray: string[] = [];

  addEvidenceUrl(input: HTMLInputElement): void {
    const url = input.value.trim();
    if (url && this.isValidUrl(url)) {
      if (!this.evidenceUrlsArray.includes(url)) {
        this.evidenceUrlsArray.push(url);
        this.assessmentForm.patchValue({
          evidenceUrls: [...this.evidenceUrlsArray]
        });
        input.value = '';
        this.cdr.markForCheck();
      } else {
        this.notificationService.showWarning('This URL is already added');
      }
    } else if (url) {
      this.notificationService.showWarning('Please enter a valid URL');
    }
  }

  removeEvidenceUrl(url: string): void {
    this.evidenceUrlsArray = this.evidenceUrlsArray.filter(u => u !== url);
    this.assessmentForm.patchValue({
      evidenceUrls: [...this.evidenceUrlsArray]
    });
    this.cdr.markForCheck();
  }

  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  onSubmit(): void {
    if (this.assessmentForm.valid) {
      const formValue = this.assessmentForm.value;
      const currentUser = this.authService.getCurrentUserValue();

      if (!currentUser?.userId) {
        this.notificationService.showError('User information not found');
        return;
      }

      if (!formValue.kraId || !formValue.rating) {
        this.notificationService.showError('Please select a KRA and provide a rating');
        return;
      }

      // Validate that the selected KRA is not already rated
      if (this.alreadyRatedKraIds.has(formValue.kraId)) {
        this.notificationService.showError('This KRA is already rated. Please select a different KRA.');
        return;
      }

      this.isSubmitting = true;

      // Create single self-assessment request
      const request: CreateSelfAssessmentRequest = {
        employeeId: currentUser.userId,
        cycleId: formValue.cycleId,
        kraId: formValue.kraId,
        rating: parseFloat(formValue.rating),
        comments: formValue.comments || undefined,
        evidenceUrls: formValue.evidenceUrls && formValue.evidenceUrls.length > 0 
          ? formValue.evidenceUrls 
          : undefined,
        status: 'submitted'
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
            this.notificationService.showError('Failed to create self-assessment');
            this.isSubmitting = false;
            this.cdr.markForCheck();
          }
        });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.assessmentForm.controls).forEach(key => {
        const control = this.assessmentForm.get(key);
        if (control) {
          control.markAsTouched();
        }
      });
    }
  }
}

