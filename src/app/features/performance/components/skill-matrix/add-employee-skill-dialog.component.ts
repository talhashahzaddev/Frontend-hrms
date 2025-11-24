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
import { CreateEmployeeSkillRequest, UpdateEmployeeSkillRequest, EmployeeSkill } from '../../../../core/models/performance.models';
import { SkillSet } from '../../../../core/models/performance.models';
import { Employee } from '../../../../core/models/employee.models';
import { AuthService } from '../../../../core/services/auth.service';
import { PerformanceService } from '../../services/performance.service';
import { Subject, takeUntil } from 'rxjs';

export interface AddEmployeeSkillDialogData {
  employees: Employee[];
  skills: SkillSet[];
  defaultEmployeeId?: string;
  mode?: 'employee' | 'manager'; // 'employee' = add skill, 'manager' = rate existing skills
  existingEmployeeSkills?: EmployeeSkill[]; // Skills already added by the employee
}

@Component({
  selector: 'app-add-employee-skill-dialog',
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
        <mat-icon>{{ isManagerMode ? 'rate_review' : 'person_add' }}</mat-icon>
        {{ isManagerMode ? 'Rate Employee Skills' : 'Add Employee Skill' }}
      </h2>
      <button mat-icon-button mat-dialog-close class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <form [formGroup]="employeeSkillForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        
        <!-- Employee Mode: Add Skill -->
        <div *ngIf="!isManagerMode" class="form-section">
          <h3 class="section-title">
            <mat-icon>info</mat-icon>
            Skill Assignment
          </h3>

          <!-- No Available Skills Message -->
          <div *ngIf="availableSkills.length === 0" class="no-skills-message">
            <mat-icon>info</mat-icon>
            <p>No skills are available to add at this time.</p>
          </div>

          <div class="form-row" *ngIf="availableSkills.length > 0">
            <!-- Skill Selection -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Skill *</mat-label>
              <mat-icon matPrefix>school</mat-icon>
              <mat-select formControlName="skillId">
                <mat-option *ngFor="let skill of availableSkills" 
                           [value]="skill.skillId"
                           [disabled]="isSkillAlreadyAdded(skill.skillId)">
                  {{ skill.skillName }} ({{ skill.category }})
                  <span *ngIf="isSkillAlreadyAdded(skill.skillId)" class="already-added-badge"> - Already Added</span>
                </mat-option>
              </mat-select>
              <mat-error *ngIf="employeeSkillForm.get('skillId')?.hasError('required')">
                Skill is required
              </mat-error>
              <mat-hint *ngIf="!isManagerMode && data.existingEmployeeSkills && data.existingEmployeeSkills.length > 0">
                Skills that are already added are disabled
              </mat-hint>
            </mat-form-field>
          </div>

          <!-- Notes (Employee can add notes) -->
          <div class="form-row" *ngIf="availableSkills.length > 0">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Notes</mat-label>
              <mat-icon matPrefix>note</mat-icon>
              <textarea matInput 
                        formControlName="notes" 
                        rows="3" 
                        placeholder="Optional: Add notes about this skill..."></textarea>
            </mat-form-field>
          </div>
        </div>

        <!-- Manager Mode: Rate Existing Skills -->
        <div *ngIf="isManagerMode" class="form-section">
          <h3 class="section-title">
            <mat-icon>rate_review</mat-icon>
            Rate Employee Skills
          </h3>

          <!-- Employee Selection -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Employee *</mat-label>
              <mat-icon matPrefix>person</mat-icon>
              <mat-select formControlName="employeeId" (selectionChange)="onEmployeeChange($event.value)">
                <mat-option *ngFor="let emp of data.employees" [value]="emp.employeeId">
                  {{ emp.fullName }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="employeeSkillForm.get('employeeId')?.hasError('required')">
                Employee is required
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Loading Employee Skills -->
          <div *ngIf="isLoadingEmployeeSkills" class="loading-container">
            <mat-spinner diameter="30"></mat-spinner>
            <p>Loading employee skills...</p>
          </div>

          <!-- Employee Skills Selection -->
          <div *ngIf="!isLoadingEmployeeSkills && employeeSkills.length > 0" class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Select Skills to Rate</mat-label>
              <mat-icon matPrefix>checklist</mat-icon>
              <mat-select formControlName="selectedSkills" multiple>
                <mat-option *ngFor="let empSkill of employeeSkills" [value]="empSkill.employeeSkillId">
                  {{ empSkill.skillName }}
                </mat-option>
              </mat-select>
              <mat-hint>Select one or more skills to rate</mat-hint>
              <mat-error *ngIf="employeeSkillForm.get('selectedSkills')?.hasError('noSkillsSelected')">
                Please select at least one skill to rate
              </mat-error>
              <mat-error *ngIf="employeeSkillForm.get('selectedSkills')?.hasError('ratingsMissing')">
                Please provide ratings for all selected skills
              </mat-error>
            </mat-form-field>
          </div>

          <!-- No Skills Message -->
          <div *ngIf="!isLoadingEmployeeSkills && employeeSkills.length === 0 && employeeSkillForm.get('employeeId')?.value" class="no-skills-message">
            <mat-icon>info</mat-icon>
            <p>This employee has no skills assigned yet.</p>
          </div>

          <!-- Skill Ratings -->
          <div *ngIf="selectedSkillsArray.length > 0" class="ratings-container">
            <h4 class="ratings-title">Skill Ratings</h4>
            <div class="rating-item" *ngFor="let skillRating of selectedSkillsArray.controls; let i = index">
              <div class="rating-header">
                <span class="rating-label">{{ getSkillName(skillRating.get('employeeSkillId')?.value) }}</span>
                <button type="button" mat-icon-button (click)="removeSkill(i)" class="remove-button">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              <mat-form-field appearance="outline" class="rating-input">
                <mat-label>Proficiency Level (1-5) *</mat-label>
                <mat-icon matPrefix>star</mat-icon>
                <input matInput type="number" [formControl]="getSkillRatingControl(i)" min="1" max="5" step="1" placeholder="Enter rating">
                <mat-error *ngIf="getSkillRatingControl(i).hasError('required')">
                  Rating is required
                </mat-error>
                <mat-error *ngIf="getSkillRatingControl(i).hasError('min')">
                  Minimum level is 1
                </mat-error>
                <mat-error *ngIf="getSkillRatingControl(i).hasError('max')">
                  Maximum level is 5
                </mat-error>
              </mat-form-field>
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
          [disabled]="employeeSkillForm.invalid || isSubmitting || (!isManagerMode && isSkillAlreadyAdded(employeeSkillForm.get('skillId')?.value))">
          <mat-spinner diameter="20" *ngIf="isSubmitting"></mat-spinner>
          <mat-icon *ngIf="!isSubmitting">save</mat-icon>
          {{ isSubmitting ? (isManagerMode ? 'Rating...' : 'Adding...') : (isManagerMode ? 'Rate Skills' : 'Add Skill') }}
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
      max-width: 800px !important;
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
            font-size: 22px !important;
            width: 22px !important;
            height: 22px !important;
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
            font-size: 20px !important;
            width: 20px !important;
            height: 20px !important;
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

    ::ng-deep mat-hint {
      font-size: 12px;
      color: #9ca3af;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      gap: 16px;

      p {
        color: #6b7280;
        font-size: 14px;
        margin: 0;
      }
    }

    .no-skills-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
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

    .already-added-badge {
      color: #9ca3af;
      font-size: 12px;
      font-style: italic;
      margin-left: 8px;
    }

    // Style for disabled mat-options
    ::ng-deep .mat-mdc-select-panel {
      .mat-mdc-option {
        &[aria-disabled="true"] {
          opacity: 0.6;
          cursor: not-allowed;
          background-color: #f9fafb !important;
          
          .mdc-list-item__primary-text {
            color: #9ca3af !important;
          }
        }
      }
    }

    @media (max-width: 768px) {
      .form-row.two-columns {
        grid-template-columns: 1fr;
      }

      ::ng-deep .mat-mdc-dialog-container {
        width: 95vw !important;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddEmployeeSkillDialogComponent implements OnInit, OnDestroy {
  employeeSkillForm: FormGroup;
  isSubmitting = false;
  isManagerMode: boolean;
  employeeSkills: EmployeeSkill[] = [];
  isLoadingEmployeeSkills = false;
  availableSkills: SkillSet[] = []; // Skills that can be added (not already added)
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddEmployeeSkillDialogComponent>,
    private authService: AuthService,
    private performanceService: PerformanceService,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: AddEmployeeSkillDialogData
  ) {
    // Determine mode: if mode is explicitly set, use it; otherwise defaultEmployeeId means employee mode
    this.isManagerMode = data.mode === 'manager';

    if (this.isManagerMode) {
      // Manager mode: rate existing skills
      this.employeeSkillForm = this.fb.group({
        employeeId: ['', Validators.required],
        selectedSkills: [[], [this.validateSkillsSelected.bind(this)]],
        skillRatings: this.fb.array([])
      });

      // Watch for changes in selected skills
      this.employeeSkillForm.get('selectedSkills')?.valueChanges.subscribe((selectedIds: string[]) => {
        this.updateSkillRatingsArray(selectedIds);
        // Re-validate after updating ratings array
        setTimeout(() => {
          this.employeeSkillForm.get('selectedSkills')?.updateValueAndValidity();
        }, 0);
      });

      // Watch for changes in skill ratings to re-validate
      this.selectedSkillsArray.valueChanges.subscribe(() => {
        this.employeeSkillForm.get('selectedSkills')?.updateValueAndValidity();
      });
    } else {
      // Employee mode: add new skill (no rating)
      const currentUser = this.authService.getCurrentUserValue();
      const employeeId = data.defaultEmployeeId || currentUser?.userId || '';

      this.employeeSkillForm = this.fb.group({
        employeeId: [employeeId],
        skillId: ['', Validators.required],
        notes: ['']
        // No proficiencyLevel field - employees can't rate themselves
      });
    }
  }

  ngOnInit(): void {
    // For employee mode, show all active skills (we'll disable already added ones in the template)
    // For manager mode, show all active skills
    this.availableSkills = this.data.skills.filter(skill => skill.isActive);

    // Watch for skill selection changes and validate
    if (!this.isManagerMode) {
      this.employeeSkillForm.get('skillId')?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(skillId => {
          if (skillId && this.isSkillAlreadyAdded(skillId)) {
            // Clear selection if a disabled skill is somehow selected
            this.employeeSkillForm.get('skillId')?.setValue('', { emitEvent: false });
            this.cdr.markForCheck();
          }
        });
    }
  }

  isSkillAlreadyAdded(skillId: string): boolean {
    if (!this.data.existingEmployeeSkills || this.isManagerMode || !skillId) {
      return false;
    }
    // Compare skillIds (handle both string and GUID comparison)
    const isAdded = this.data.existingEmployeeSkills.some(skill => {
      const existingSkillId = skill.skillId?.toString().toLowerCase().trim();
      const checkSkillId = skillId?.toString().toLowerCase().trim();
      return existingSkillId === checkSkillId && existingSkillId !== '';
    });
    return isAdded;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedSkillsArray(): FormArray {
    return this.employeeSkillForm.get('skillRatings') as FormArray;
  }

  onEmployeeChange(employeeId: string): void {
    if (employeeId) {
      this.loadEmployeeSkills(employeeId);
    } else {
      this.employeeSkills = [];
      this.employeeSkillForm.patchValue({ selectedSkills: [] });
      this.cdr.markForCheck();
    }
  }

  loadEmployeeSkills(employeeId: string): void {
    this.isLoadingEmployeeSkills = true;
    this.performanceService.getOtherEmployeeSkills(employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.employeeSkills = response.data;
          } else {
            this.employeeSkills = [];
          }
          this.isLoadingEmployeeSkills = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading employee skills:', error);
          this.employeeSkills = [];
          this.isLoadingEmployeeSkills = false;
          this.cdr.markForCheck();
        }
      });
  }

  updateSkillRatingsArray(selectedIds: string[]): void {
    const skillRatingsArray = this.selectedSkillsArray;
    
    // Remove ratings for unselected skills (iterate backwards to avoid index issues)
    for (let i = skillRatingsArray.length - 1; i >= 0; i--) {
      const employeeSkillId = skillRatingsArray.at(i).get('employeeSkillId')?.value;
      if (!selectedIds.includes(employeeSkillId)) {
        skillRatingsArray.removeAt(i);
      }
    }

    // Add ratings for newly selected skills
    selectedIds.forEach(employeeSkillId => {
      const exists = skillRatingsArray.controls.some(control => control.get('employeeSkillId')?.value === employeeSkillId);
      if (!exists) {
        skillRatingsArray.push(this.fb.group({
          employeeSkillId: [employeeSkillId],
          rating: [null, [Validators.required, Validators.min(1), Validators.max(5)]]
        }));
      }
    });

    this.cdr.markForCheck();
  }

  removeSkill(index: number): void {
    const employeeSkillId = this.selectedSkillsArray.at(index).get('employeeSkillId')?.value;
    const selectedSkills = this.employeeSkillForm.get('selectedSkills')?.value as string[];
    this.employeeSkillForm.patchValue({
      selectedSkills: selectedSkills.filter(id => id !== employeeSkillId)
    });
  }

  getSkillRatingControl(index: number): FormControl {
    return this.selectedSkillsArray.at(index).get('rating') as FormControl;
  }

  getSkillName(employeeSkillId: string): string {
    const empSkill = this.employeeSkills.find(s => s.employeeSkillId === employeeSkillId);
    return empSkill ? empSkill.skillName : 'Unknown Skill';
  }

  validateSkillsSelected(control: FormControl): { [key: string]: any } | null {
    if (this.isManagerMode) {
      const selectedSkills = control.value as string[];
      if (!selectedSkills || selectedSkills.length === 0) {
        return { noSkillsSelected: true };
      }
      
      // Check if all selected skills have ratings
      try {
        const skillRatingsArray = this.employeeSkillForm?.get('skillRatings') as FormArray;
        if (!skillRatingsArray) {
          return { ratingsMissing: true };
        }
        
        const allHaveRatings = selectedSkills.every(skillId => {
          const ratingControl = skillRatingsArray.controls.find(
            c => c.get('employeeSkillId')?.value === skillId
          );
          const ratingValue = ratingControl?.get('rating')?.value;
          return ratingControl && ratingValue !== null && ratingValue !== undefined && 
                 ratingValue !== '' && !isNaN(parseInt(ratingValue));
        });
        
        if (!allHaveRatings) {
          return { ratingsMissing: true };
        }
      } catch (error) {
        // If FormArray is not ready yet, return validation error
        return { ratingsMissing: true };
      }
    }
    return null;
  }

  onSubmit(): void {
    if (this.employeeSkillForm.valid) {
      const formValue = this.employeeSkillForm.value;
      const currentUser = this.authService.getCurrentUserValue();
      const currentUserId = currentUser?.userId;

      if (this.isManagerMode) {
        // Manager mode: validate that skills are selected and rated
        const selectedSkills = formValue.selectedSkills as string[];
        
        if (!selectedSkills || selectedSkills.length === 0) {
          // This should be caught by form validation, but double-check
          return;
        }

        // Manager mode: return array of update requests
        const updateRequests: Array<{ employeeSkillId: string; request: UpdateEmployeeSkillRequest }> = [];
        
        this.selectedSkillsArray.controls.forEach(control => {
          const employeeSkillId = control.get('employeeSkillId')?.value;
          const rating = control.get('rating')?.value;
          
          if (employeeSkillId && rating !== null && rating !== undefined) {
            updateRequests.push({
              employeeSkillId: employeeSkillId,
              request: {
                proficiencyLevel: parseInt(rating),
                assessedBy: currentUserId,
                lastAssessed: new Date().toISOString()
              }
            });
          }
        });

        // Validate that all selected skills have ratings
        if (updateRequests.length === 0 || updateRequests.length !== selectedSkills.length) {
          // Not all selected skills have valid ratings
          return;
        }

        this.dialogRef.close({ mode: 'manager', updates: updateRequests });
      } else {
        // Employee mode: create new skill (no rating)
        const result: CreateEmployeeSkillRequest = {
          employeeId: formValue.employeeId,
          skillId: formValue.skillId,
          proficiencyLevel: 1, // Default to 1, will be rated by manager later
          assessedBy: formValue.employeeId, // Self-assessment
          notes: formValue.notes || undefined
        };
        this.dialogRef.close({ mode: 'employee', request: result });
      }
    }
  }
}

