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
import { NotificationService } from '../../../../core/services/notification.service';
import { takeUntil } from 'rxjs/operators';
import { Subject, firstValueFrom } from 'rxjs';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface CreateAppraisalDialogData {
  appraisalCycles: AppraisalCycle[];
  employees: Employee[];
  reviewTypes: Array<{ value: string; label: string }>;
  preSelectedEmployeeId?: string;
  preSelectedCycleId?: string;
}


@Component({
  selector: 'app-create-appraisal-dialog',
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
    MatChipsModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>assessment</mat-icon>
          </div>
          <div>
            <h2 class="header-title">Create New Appraisal</h2>
            <p class="header-subtitle">Evaluate employee performance</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-body">
        <form [formGroup]="appraisalForm" (ngSubmit)="onSubmit()">

          <!-- Appraisal Details Section -->
          <div class="assign-section">
            <div class="assign-section-header">
              <mat-icon>schedule</mat-icon>
              <span>Appraisal Details</span>
            </div>
            <div class="assign-section-body">

              <div class="assign-dates-grid">
                <div class="assign-field-group">
                  <label class="field-label">Appraisal Cycle <span class="required">*</span></label>
                  <mat-form-field appearance="outline" class="mat-field">
                    <mat-select formControlName="cycleId" placeholder="Select Cycle">
                      <mat-option *ngFor="let cycle of data.appraisalCycles" [value]="cycle.cycleId">
                        {{ cycle.cycleName }}
                      </mat-option>
                    </mat-select>
                    <mat-error *ngIf="appraisalForm.get('cycleId')?.hasError('required')">Cycle is required</mat-error>
                  </mat-form-field>
                </div>

                <div class="assign-field-group">
                  <label class="field-label">Employee <span class="required">*</span></label>
                  <mat-form-field appearance="outline" class="mat-field">
                    <mat-select formControlName="employeeId" placeholder="Select Employee">
                      <mat-option *ngFor="let emp of data.employees" [value]="emp.employeeId">
                        {{ emp.fullName }}
                      </mat-option>
                    </mat-select>
                    <mat-error *ngIf="appraisalForm.get('employeeId')?.hasError('required')">Employee is required</mat-error>
                  </mat-form-field>
                </div>
              </div>

              <div class="assign-dates-grid">
                <div class="assign-field-group">
                  <label class="field-label">Review Type <span class="required">*</span></label>
                  <mat-form-field appearance="outline" class="mat-field">
                    <mat-select formControlName="reviewType" placeholder="Select Type">
                      <mat-option *ngFor="let type of data.reviewTypes" [value]="type.value">
                        {{ type.label }}
                      </mat-option>
                    </mat-select>
                    <mat-error *ngIf="appraisalForm.get('reviewType')?.hasError('required')">Review type is required</mat-error>
                  </mat-form-field>
                </div>

                <div class="assign-field-group">
                  <label class="field-label">Overall Rating (0-5)</label>
                  <mat-form-field appearance="outline" class="mat-field">
                    <input matInput type="number" formControlName="overallRating" min="0" max="5" step="0.1" placeholder="e.g. 4.5">
                    <mat-error *ngIf="appraisalForm.get('overallRating')?.hasError('min')">Must be >= 0</mat-error>
                    <mat-error *ngIf="appraisalForm.get('overallRating')?.hasError('max')">Must be <= 5</mat-error>
                  </mat-form-field>
                </div>
              </div>

            </div>
          </div>

          <!-- KRA Section -->
          <div class="assign-section">
            <div class="assign-section-header">
              <mat-icon>target</mat-icon>
              <span>Key Result Areas (KRAs)</span>
            </div>
            <div class="assign-section-body">

              <div class="assign-field-group">
                <label class="field-label">Select KRAs</label>
                <mat-form-field appearance="outline" class="mat-field">
                  <mat-select formControlName="selectedKras" multiple placeholder="Select KRAs">
                    <mat-option *ngFor="let kra of availableKras" 
                                [value]="kra.kraId"
                                [disabled]="isKraAlreadyRated(kra.kraId)">
                      {{ kra.title }}
                      <span *ngIf="isKraAlreadyRated(kra.kraId)" class="already-rated-badge">(Already Rated)</span>
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="isLoadingExistingRatings">Checking existing ratings...</mat-error>
                </mat-form-field>
              </div>

              <!-- KRA Ratings -->
              <div *ngIf="selectedKrasArray.length > 0" class="ratings-container">
                <div class="ratings-title">KRA Ratings</div>
                <div class="rating-item" *ngFor="let kraRating of selectedKrasArray.controls; let i = index">
                  <div class="rating-header">
                    <span class="rating-label">{{ getKraTitle(kraRating.get('kraId')?.value) }}</span>
                    <button type="button" mat-icon-button (click)="removeKra(i)" class="remove-button" aria-label="Remove">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                  <div class="assign-field-group" style="margin-top: 8px;">
                    <mat-form-field appearance="outline" class="mat-field">
                      <input matInput type="number" [formControl]="getKraRatingControl(i)" min="0" max="5" step="0.1" placeholder="Enter rating">
                      <mat-error *ngIf="getKraRatingControl(i).hasError('min')">Must be >= 0</mat-error>
                      <mat-error *ngIf="getKraRatingControl(i).hasError('max')">Must be <= 5</mat-error>
                      <mat-error *ngIf="getKraRatingControl(i).hasError('required')">Required</mat-error>
                    </mat-form-field>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- Feedback & Plans Section -->
          <div class="assign-section">
            <div class="assign-section-header">
              <mat-icon>feedback</mat-icon>
              <span>Feedback & Development</span>
            </div>
            <div class="assign-section-body">

              <div class="assign-field-group">
                <label class="field-label">Feedback</label>
                <mat-form-field appearance="outline" class="mat-field">
                  <textarea matInput formControlName="feedback" rows="3" placeholder="Enter feedback..."></textarea>
                </mat-form-field>
              </div>

              <div class="assign-field-group">
                <label class="field-label">Improvement Areas</label>
                <mat-form-field appearance="outline" class="mat-field">
                  <textarea matInput formControlName="improvementAreas" rows="3" placeholder="Enter areas for improvement..."></textarea>
                </mat-form-field>
              </div>

              <div class="assign-field-group">
                <label class="field-label">Development Plan</label>
                <mat-form-field appearance="outline" class="mat-field">
                  <textarea matInput formControlName="developmentPlan" rows="3" placeholder="Enter development plan..."></textarea>
                </mat-form-field>
              </div>

            </div>
          </div>

        </form>
      </mat-dialog-content>

      <div class="dialog-footer">
        <button mat-stroked-button class="btn-cancel" mat-dialog-close [disabled]="isSubmitting">Cancel</button>
        <button mat-flat-button class="btn-submit" (click)="onSubmit()" [disabled]="appraisalForm.invalid || isSubmitting">
          <mat-icon *ngIf="!isSubmitting">save</mat-icon>
          <mat-spinner diameter="16" *ngIf="isSubmitting" style="margin-right:8px;"></mat-spinner>
          <span *ngIf="!isSubmitting">Create Appraisal</span>
          <span *ngIf="isSubmitting">Creating...</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    @use '../../styles/performance-shared';

    .ratings-container {
      margin-top: 12px;
      padding: 12px 16px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px dashed #cbd5e1;
    }

    .ratings-title {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 12px;
    }

    .rating-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .rating-item:last-child {
      margin-bottom: 0;
    }

    .rating-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .rating-label {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }

    .remove-button {
      width: 28px !important;
      height: 28px !important;
      padding: 0 !important;
      color: #94a3b8;
      
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        line-height: 18px;
      }

      &:hover {
        color: #ef4444;
        background: #fef2f2;
      }
    }

    .already-rated-badge {
      color: #ef4444;
      font-size: 11px;
      font-weight: 600;
      margin-left: 8px;
    }

    ::ng-deep .mat-mdc-option[aria-disabled="true"] {
      opacity: 0.6;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateAppraisalDialogComponent implements OnInit, OnDestroy {
  appraisalForm: FormGroup;
  isSubmitting = false;
  isLoadingKras = false;
  isLoadingSkills = false;
  isLoadingExistingRatings = false;
  availableKras: KRA[] = [];
  availableSkills: SkillSet[] = [];
  alreadyRatedKraIds: Set<string> = new Set();
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateAppraisalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateAppraisalDialogData,
    private performanceService: PerformanceService,
    private notificationService: NotificationService,
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

    // Watch for changes in employee and cycle to check existing ratings
    this.appraisalForm.get('employeeId')?.valueChanges.subscribe(() => {
      this.checkExistingRatings();
    });

    this.appraisalForm.get('cycleId')?.valueChanges.subscribe(() => {
      this.checkExistingRatings();
    });
  }

  ngOnInit(): void {
    this.loadKras();
    this.loadSkills();
    
    // Pre-select employee and cycle if provided
    if (this.data.preSelectedEmployeeId) {
      this.appraisalForm.patchValue({
        employeeId: this.data.preSelectedEmployeeId
      });
    }
    
    if (this.data.preSelectedCycleId) {
      this.appraisalForm.patchValue({
        cycleId: this.data.preSelectedCycleId
      });
    }

    // Check existing ratings after a short delay to allow form values to be set
    setTimeout(() => {
      this.checkExistingRatings();
    }, 100);
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

  checkExistingRatings(): void {
    const employeeId = this.appraisalForm.get('employeeId')?.value;
    const cycleId = this.appraisalForm.get('cycleId')?.value;

    if (!employeeId || !cycleId) {
      this.alreadyRatedKraIds.clear();
      this.cdr.markForCheck();
      return;
    }

    this.isLoadingExistingRatings = true;
    
    // Only fetch existing manager appraisals (not employee self-assessments)
    // Employee self-assessments should NOT block managers from creating appraisals
    firstValueFrom(this.performanceService.getEmployeeAppraisalsByCycle(cycleId, employeeId))
      .then((appraisalsResponse) => {
        const ratedKraIds = new Set<string>();

        // Extract KRA IDs only from manager appraisals (reviewType === 'manager')
        if (appraisalsResponse?.success && appraisalsResponse.data) {
          appraisalsResponse.data.forEach((appraisal: any) => {
            // Only consider manager appraisals, not employee self-assessments
            if (appraisal.reviewType === 'manager' && appraisal.kraRatings && typeof appraisal.kraRatings === 'object') {
              Object.keys(appraisal.kraRatings).forEach(kraId => {
                ratedKraIds.add(kraId);
              });
            }
          });
        }

        this.alreadyRatedKraIds = ratedKraIds;
        
        // Remove already rated KRAs from current selection
        const currentSelectedKras = this.appraisalForm.get('selectedKras')?.value || [];
        const filteredKras = currentSelectedKras.filter((kraId: string) => !ratedKraIds.has(kraId));
        
        if (filteredKras.length !== currentSelectedKras.length) {
          this.appraisalForm.patchValue({ selectedKras: filteredKras });
          this.notificationService.showWarning('Some KRAs were removed as they are already rated by a manager');
        }

        this.isLoadingExistingRatings = false;
        this.cdr.markForCheck();
      })
      .catch((error) => {
        console.error('Error checking existing ratings:', error);
        this.isLoadingExistingRatings = false;
        this.cdr.markForCheck();
      });
  }

  isKraAlreadyRated(kraId: string): boolean {
    return this.alreadyRatedKraIds.has(kraId);
  }

  onSubmit(): void {
    if (this.appraisalForm.valid) {
      const formValue = this.appraisalForm.value;
      
      // Validate that no already-rated KRAs are selected
      const selectedKras = formValue.selectedKras || [];
      const invalidKras = selectedKras.filter((kraId: string) => this.alreadyRatedKraIds.has(kraId));
      
      if (invalidKras.length > 0) {
        this.notificationService.showError('Cannot rate KRAs that are already rated. Please remove them and try again.');
        return;
      }
      
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

