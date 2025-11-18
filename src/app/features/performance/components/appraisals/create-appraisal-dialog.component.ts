import { Component, Inject, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { AppraisalCycle, ReviewType, CreateAppraisal, SkillSet, KRA } from '../../../../core/models/performance.models';
import { Employee } from '../../../../core/models/employee.models';
import { PerformanceService } from '../../services/performance.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

export interface CreateAppraisalDialogData {
  appraisalCycles: AppraisalCycle[];
  employees: Employee[];
  reviewTypes: Array<{ value: string; label: string }>;
}

@Component({
  selector: 'app-create-appraisal-dialog',
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
        <mat-icon>assessment</mat-icon>
        Create New Appraisal
      </h2>
      <button mat-icon-button mat-dialog-close class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <form [formGroup]="appraisalForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        
        <div class="form-section">
          <h3 class="section-title">
            <mat-icon>schedule</mat-icon>
            Appraisal Details
          </h3>

          <div class="form-row two-columns">
            <!-- Appraisal Cycle -->
            <mat-form-field appearance="outline">
              <mat-label>Appraisal Cycle *</mat-label>
              <mat-icon matPrefix>schedule</mat-icon>
              <mat-select formControlName="cycleId">
                <mat-option *ngFor="let cycle of data.appraisalCycles" [value]="cycle.cycleId">
                  {{ cycle.cycleName }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="appraisalForm.get('cycleId')?.hasError('required')">
                Cycle is required
              </mat-error>
            </mat-form-field>

            <!-- Employee Selection -->
            <mat-form-field appearance="outline">
              <mat-label>Employee *</mat-label>
              <mat-icon matPrefix>person</mat-icon>
              <mat-select formControlName="employeeId">
                <mat-option *ngFor="let emp of data.employees" [value]="emp.employeeId">
                  {{ emp.fullName }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="appraisalForm.get('employeeId')?.hasError('required')">
                Employee is required
              </mat-error>
            </mat-form-field>

            <!-- Review Type -->
            <mat-form-field appearance="outline">
              <mat-label>Review Type *</mat-label>
              <mat-icon matPrefix>rate_review</mat-icon>
              <mat-select formControlName="reviewType">
                <mat-option *ngFor="let type of data.reviewTypes" [value]="type.value">
                  {{ type.label }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="appraisalForm.get('reviewType')?.hasError('required')">
                Review type is required
              </mat-error>
            </mat-form-field>

            <!-- Overall Rating -->
            <mat-form-field appearance="outline">
              <mat-label>Overall Rating (0-5)</mat-label>
              <mat-icon matPrefix>star</mat-icon>
              <input matInput type="number" formControlName="overallRating" min="0" max="5" step="0.1">
              <mat-error *ngIf="appraisalForm.get('overallRating')?.hasError('min')">
                Rating must be at least 0
              </mat-error>
              <mat-error *ngIf="appraisalForm.get('overallRating')?.hasError('max')">
                Rating must be at most 5
              </mat-error>
            </mat-form-field>
          </div>
          <div class="form-section">
            <h3 class="section-title">
              <mat-icon>target</mat-icon>
              Key Result Areas (KRAs)
            </h3>
  
            <!-- KRA Selection -->
            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Select KRAs</mat-label>
                <mat-icon matPrefix>checklist</mat-icon>
                <mat-select formControlName="selectedKras" multiple>
                  <mat-option *ngFor="let kra of availableKras" [value]="kra.kraId">
                    {{ kra.title }}
                  </mat-option>
                </mat-select>
                <mat-hint>Select one or more KRAs to rate</mat-hint>
              </mat-form-field>
            </div>
  
            <!-- KRA Ratings -->
            <div *ngIf="selectedKrasArray.length > 0" class="ratings-container">
              <h4 class="ratings-title">KRA Ratings</h4>
              <div class="rating-item" *ngFor="let kraRating of selectedKrasArray.controls; let i = index">
                <div class="rating-header">
                  <span class="rating-label">{{ getKraTitle(kraRating.get('kraId')?.value) }}</span>
                  <button type="button" mat-icon-button (click)="removeKra(i)" class="remove-button">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
                <mat-form-field appearance="outline" class="rating-input">
                  <mat-label>Rating (0-5)</mat-label>
                  <mat-icon matPrefix>star</mat-icon>
                  <input matInput type="number" [formControl]="getKraRatingControl(i)" min="0" max="5" step="0.1" placeholder="Enter rating">
                  <mat-error *ngIf="getKraRatingControl(i).hasError('min')">
                    Rating must be at least 0
                  </mat-error>
                  <mat-error *ngIf="getKraRatingControl(i).hasError('max')">
                    Rating must be at most 5
                  </mat-error>
                  <mat-error *ngIf="getKraRatingControl(i).hasError('required')">
                    Rating is required
                  </mat-error>
                </mat-form-field>
              </div>
            </div>
          </div>
  
          <!-- Skills Section -->
          <!-- <div class="form-section">
            <h3 class="section-title">
              <mat-icon>psychology</mat-icon>
              Skills
            </h3> -->
  
            <!-- Skill Selection -->
            <!-- <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Select Skills</mat-label>
                <mat-icon matPrefix>build</mat-icon>
                <mat-select formControlName="selectedSkills" multiple>
                  <mat-option *ngFor="let skill of availableSkills" [value]="skill.skillId">
                    {{ skill.skillName }}
                  </mat-option>
                </mat-select>
                <mat-hint>Select one or more skills to rate</mat-hint>
              </mat-form-field>
            </div> -->
  
            <!-- Skill Ratings -->
            <!-- <div *ngIf="selectedSkillsArray.length > 0" class="ratings-container">
              <h4 class="ratings-title">Skill Ratings</h4>
              <div class="rating-item" *ngFor="let skillRating of selectedSkillsArray.controls; let i = index">
                <div class="rating-header">
                  <span class="rating-label">{{ getSkillName(skillRating.get('skillId')?.value) }}</span>
                  <button type="button" mat-icon-button (click)="removeSkill(i)" class="remove-button">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
                <mat-form-field appearance="outline" class="rating-input">
                  <mat-label>Rating (0-5)</mat-label>
                  <mat-icon matPrefix>star</mat-icon>
                  <input matInput type="number" [formControl]="getSkillRatingControl(i)" min="0" max="5" step="0.1" placeholder="Enter rating">
                  <mat-error *ngIf="getSkillRatingControl(i).hasError('min')">
                    Rating must be at least 0
                  </mat-error>
                  <mat-error *ngIf="getSkillRatingControl(i).hasError('max')">
                    Rating must be at most 5
                  </mat-error>
                  <mat-error *ngIf="getSkillRatingControl(i).hasError('required')">
                    Rating is required
                  </mat-error>
                </mat-form-field>
              </div>
            </div> -->
          <!-- </div> -->

          <!-- Feedback -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Feedback</mat-label>
              <mat-icon matPrefix>feedback</mat-icon>
              <textarea matInput formControlName="feedback" rows="3" placeholder="Enter feedback..."></textarea>
            </mat-form-field>
          </div>

          <!-- Improvement Areas -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Improvement Areas</mat-label>
              <mat-icon matPrefix>trending_up</mat-icon>
              <textarea matInput formControlName="improvementAreas" rows="3" placeholder="Enter areas for improvement..."></textarea>
            </mat-form-field>
          </div>

          <!-- Development Plan -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Development Plan</mat-label>
              <mat-icon matPrefix>assignment</mat-icon>
              <textarea matInput formControlName="developmentPlan" rows="3" placeholder="Enter development plan..."></textarea>
            </mat-form-field>
          </div>
        </div>

        <!-- KRA Section -->

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
          [disabled]="appraisalForm.invalid || isSubmitting">
          <mat-spinner diameter="20" *ngIf="isSubmitting"></mat-spinner>
          <mat-icon *ngIf="!isSubmitting">save</mat-icon>
          {{ isSubmitting ? 'Creating...' : 'Create Appraisal' }}
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

    .form-section {
      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 20px;
        padding-bottom: 12px;
        border-bottom: 2px solid #e5e7eb;

        mat-icon {
          font-size: 1.25rem;
          width: 1.25rem;
          height: 1.25rem;
          color: #667eea;
        }
      }
    }

    .form-row {
      margin-bottom: 16px;

      &.two-columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
    }

    .full-width {
      width: 100%;
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

        // Ensure proper spacing for the input/select area after the icon
        .mat-mdc-form-field-infix {
          margin-left: 0 !important;
          padding-left: 0 !important;
          min-height: 48px;
        }

        // Spacing for select and input fields
        .mat-mdc-select,
        .mat-mdc-input-element,
        .mat-mdc-text-field-input {
          margin-left: 0 !important;
          padding-left: 0 !important;
        }

        // For select trigger specifically
        .mat-mdc-select-trigger {
          padding-left: 0 !important;
          margin-left: 0 !important;
        }

        // Adjust the flex container to ensure proper spacing
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

    ::ng-deep mat-error {
      font-size: 13px;
      font-weight: 500;
      color: #dc2626;
      margin-top: 4px;
    }

    .ratings-container {
      margin-top: 16px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }

    .ratings-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #374151;
      margin: 0 0 16px 0;
    }

    .rating-item {
      margin-bottom: 16px;
      padding: 12px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      transition: all 0.2s ease;

      &:hover {
        border-color: #667eea;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
      }

      &:last-child {
        margin-bottom: 0;
      }
    }

    .rating-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .rating-label {
      font-weight: 600;
      color: #1f2937;
      font-size: 0.95rem;
    }

    .remove-button {
      width: 32px;
      height: 32px;
      color: #dc2626;

      &:hover {
        background: rgba(220, 38, 38, 0.1);
      }
    }

    .rating-input {
      width: 100%;
    }

    @media (max-width: 768px) {
      .form-row.two-columns {
        grid-template-columns: 1fr;
      }

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
export class CreateAppraisalDialogComponent implements OnInit, OnDestroy {
  appraisalForm: FormGroup;
  isSubmitting = false;
  isLoadingKras = false;
  isLoadingSkills = false;
  availableKras: KRA[] = [];
  availableSkills: SkillSet[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateAppraisalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateAppraisalDialogData,
    private performanceService: PerformanceService,
    private cdr: ChangeDetectorRef
  ) {
    this.appraisalForm = this.fb.group({
      cycleId: ['', Validators.required],
      employeeId: ['', Validators.required],
      reviewType: ['manager', Validators.required],
      overallRating: [null, [Validators.min(0), Validators.max(5)]],
      feedback: [''],
      improvementAreas: [''],
      developmentPlan: [''],
      selectedKras: [[]],
      selectedSkills: [[]],
      kraRatings: this.fb.array([]),
      skillRatings: this.fb.array([])
    });

    // Watch for changes in selected KRAs
    this.appraisalForm.get('selectedKras')?.valueChanges.subscribe((selectedIds: string[]) => {
      this.updateKraRatingsArray(selectedIds);
    });

    // Watch for changes in selected Skills
    this.appraisalForm.get('selectedSkills')?.valueChanges.subscribe((selectedIds: string[]) => {
      this.updateSkillRatingsArray(selectedIds);
    });
  }

  ngOnInit(): void {
    this.loadKras();
    this.loadSkills();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedKrasArray(): FormArray {
    return this.appraisalForm.get('kraRatings') as FormArray;
  }

  get selectedSkillsArray(): FormArray {
    return this.appraisalForm.get('skillRatings') as FormArray;
  }

  loadKras(): void {
    this.isLoadingKras = true;
    this.performanceService.getKRAs(1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const paginatedData = response.data as any;
            this.availableKras = (paginatedData.items || paginatedData.data || []).filter((kra: KRA) => kra.isActive);
          }
          this.isLoadingKras = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading KRAs:', error);
          this.isLoadingKras = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadSkills(): void {
    this.isLoadingSkills = true;
    this.performanceService.getSkillsMatrix()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response && response.success) {
            const skills = response.data || [];
            this.availableSkills = (Array.isArray(skills) ? skills : []).filter((skill: SkillSet) => skill.isActive !== false);
          }
          this.isLoadingSkills = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading skills:', error);
          this.isLoadingSkills = false;
          this.cdr.markForCheck();
        }
      });
  }

  updateKraRatingsArray(selectedIds: string[]): void {
    const kraRatingsArray = this.selectedKrasArray;
    
    // Remove ratings for unselected KRAs (iterate backwards to avoid index issues)
    for (let i = kraRatingsArray.length - 1; i >= 0; i--) {
      const kraId = kraRatingsArray.at(i).get('kraId')?.value;
      if (!selectedIds.includes(kraId)) {
        kraRatingsArray.removeAt(i);
      }
    }

    // Add ratings for newly selected KRAs
    selectedIds.forEach(kraId => {
      const exists = kraRatingsArray.controls.some(control => control.get('kraId')?.value === kraId);
      if (!exists) {
        kraRatingsArray.push(this.fb.group({
          kraId: [kraId],
          rating: [null, [Validators.required, Validators.min(0), Validators.max(5)]]
        }));
      }
    });

    this.cdr.markForCheck();
  }

  updateSkillRatingsArray(selectedIds: string[]): void {
    const skillRatingsArray = this.selectedSkillsArray;
    
    // Remove ratings for unselected Skills (iterate backwards to avoid index issues)
    for (let i = skillRatingsArray.length - 1; i >= 0; i--) {
      const skillId = skillRatingsArray.at(i).get('skillId')?.value;
      if (!selectedIds.includes(skillId)) {
        skillRatingsArray.removeAt(i);
      }
    }

    // Add ratings for newly selected Skills
    selectedIds.forEach(skillId => {
      const exists = skillRatingsArray.controls.some(control => control.get('skillId')?.value === skillId);
      if (!exists) {
        skillRatingsArray.push(this.fb.group({
          skillId: [skillId],
          rating: [null, [Validators.required, Validators.min(0), Validators.max(5)]]
        }));
      }
    });

    this.cdr.markForCheck();
  }

  removeKra(index: number): void {
    const kraId = this.selectedKrasArray.at(index).get('kraId')?.value;
    const selectedKras = this.appraisalForm.get('selectedKras')?.value as string[];
    this.appraisalForm.patchValue({
      selectedKras: selectedKras.filter(id => id !== kraId)
    });
  }

  removeSkill(index: number): void {
    const skillId = this.selectedSkillsArray.at(index).get('skillId')?.value;
    const selectedSkills = this.appraisalForm.get('selectedSkills')?.value as string[];
    this.appraisalForm.patchValue({
      selectedSkills: selectedSkills.filter(id => id !== skillId)
    });
  }

  getKraRatingControl(index: number): FormControl {
    return this.selectedKrasArray.at(index).get('rating') as FormControl;
  }

  getSkillRatingControl(index: number): FormControl {
    return this.selectedSkillsArray.at(index).get('rating') as FormControl;
  }

  getKraTitle(kraId: string): string {
    const kra = this.availableKras.find(k => k.kraId === kraId);
    return kra ? kra.title : 'Unknown KRA';
  }

  getSkillName(skillId: string): string {
    const skill = this.availableSkills.find(s => s.skillId === skillId);
    return skill ? skill.skillName : 'Unknown Skill';
  }

  onSubmit(): void {
    if (this.appraisalForm.valid) {
      const formValue = this.appraisalForm.value;
      
      // Build KRA ratings object
      const kraRatings: { [kraId: string]: number } = {};
      this.selectedKrasArray.controls.forEach(control => {
        const kraId = control.get('kraId')?.value;
        const rating = control.get('rating')?.value;
        if (kraId && rating !== null && rating !== undefined) {
          kraRatings[kraId] = parseFloat(rating);
        }
      });

      // Build Skill ratings object
      const skillRatings: { [skillId: string]: number } = {};
      this.selectedSkillsArray.controls.forEach(control => {
        const skillId = control.get('skillId')?.value;
        const rating = control.get('rating')?.value;
        if (skillId && rating !== null && rating !== undefined) {
          skillRatings[skillId] = parseFloat(rating);
        }
      });

      const result: CreateAppraisal = {
        cycleId: formValue.cycleId,
        employeeId: formValue.employeeId,
        reviewType: formValue.reviewType as ReviewType,
        overallRating: formValue.overallRating ? parseFloat(formValue.overallRating) : undefined,
        kraRatings: kraRatings,
        skillRatings: skillRatings,
        feedback: formValue.feedback,
        improvementAreas: formValue.improvementAreas,
        developmentPlan: formValue.developmentPlan
      };
      this.dialogRef.close(result);
    }
  }
}

