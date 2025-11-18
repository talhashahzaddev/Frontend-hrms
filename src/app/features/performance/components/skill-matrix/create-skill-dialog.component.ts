import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { CreateSkillSetRequest } from '../../../../core/models/performance.models';

export interface CreateSkillDialogData {
  categories?: string[];
  existingSkillNames?: string[];
}

@Component({
  selector: 'app-create-skill-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatChipsModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>school</mat-icon>
        Create New Skill
      </h2>
      <button mat-icon-button mat-dialog-close class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <form [formGroup]="skillForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        
        <div class="form-section">
          <h3 class="section-title">
            <mat-icon>info</mat-icon>
            Skill Information
          </h3>

          <div class="form-row two-columns">
            <!-- Skill Name -->
            <mat-form-field appearance="outline">
              <mat-label>Skill Name *</mat-label>
              <mat-icon matPrefix>label</mat-icon>
              <input matInput 
                     formControlName="skillName" 
                     placeholder="e.g., JavaScript, Project Management"
                     maxlength="100">
              <mat-error *ngIf="skillForm.get('skillName')?.hasError('required')">
                Skill name is required
              </mat-error>
              <mat-error *ngIf="skillForm.get('skillName')?.hasError('minlength')">
                Skill name must be at least 2 characters
              </mat-error>
            </mat-form-field>

            <!-- Category -->
            <mat-form-field appearance="outline">
              <mat-label>Category *</mat-label>
              <mat-icon matPrefix>category</mat-icon>
              <input matInput 
                     formControlName="category" 
                     placeholder="e.g., Technical, Soft Skills"
                     maxlength="50"
                     [matAutocomplete]="auto">
              <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayCategory">
                <mat-option *ngFor="let cat of filteredCategories" [value]="cat">
                  {{ cat }}
                </mat-option>
              </mat-autocomplete>
              <mat-error *ngIf="skillForm.get('category')?.hasError('required')">
                Category is required
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Description -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <mat-icon matPrefix>description</mat-icon>
              <textarea matInput 
                        formControlName="description" 
                        rows="3" 
                        placeholder="Enter a brief description of this skill..."></textarea>
            </mat-form-field>
          </div>

          <!-- Skill Level Scale -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Skill Level Scale *</mat-label>
              <mat-icon matPrefix>linear_scale</mat-icon>
              <input matInput 
                     formControlName="skillLevelScaleInput" 
                     placeholder="e.g., 1,2,3,4,5 or Beginner,Intermediate,Advanced,Expert"
                     (input)="onScaleInputChange($event)">
              <mat-hint>Enter comma-separated values (numbers or labels)</mat-hint>
              <mat-error *ngIf="skillForm.get('skillLevelScaleInput')?.hasError('required')">
                Skill level scale is required
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Level Scale Preview -->
          <div class="level-preview" *ngIf="previewLevels.length > 0">
            <h4>Level Scale Preview</h4>
            <div class="level-chips-preview">
              <mat-chip *ngFor="let level of previewLevels">{{ level }}</mat-chip>
            </div>
          </div>

          <!-- Is Active -->
          <div class="form-row">
            <mat-checkbox formControlName="isActive" color="primary">
              <div class="checkbox-content">
                <strong>Active Skill</strong>
                <small>Skill will be available for assignment to employees</small>
              </div>
            </mat-checkbox>
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
          [disabled]="skillForm.invalid || isSubmitting">
          <mat-spinner diameter="20" *ngIf="isSubmitting"></mat-spinner>
          <mat-icon *ngIf="!isSubmitting">save</mat-icon>
          {{ isSubmitting ? 'Creating...' : 'Create Skill' }}
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

    .level-preview {
      margin-top: 16px;
      padding: 16px;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border-radius: 12px;
      border: 1px solid #e5e7eb;

      h4 {
        margin: 0 0 12px;
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
      }

      .level-chips-preview {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;

        ::ng-deep mat-chip {
          font-size: 12px !important;
          font-weight: 600 !important;
          height: 28px !important;
          border-radius: 14px !important;
          padding: 0 12px !important;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.1) 100%) !important;
          color: #667eea !important;
          border: 1px solid rgba(102, 126, 234, 0.3) !important;
        }
      }
    }

    .checkbox-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-left: 8px;

      strong {
        font-size: 14px;
        color: #1f2937;
      }

      small {
        font-size: 12px;
        color: #6b7280;
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

    ::ng-deep mat-hint {
      font-size: 12px;
      color: #9ca3af;
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
export class CreateSkillDialogComponent {
  skillForm: FormGroup;
  isSubmitting = false;
  previewLevels: (string | number)[] = [];
  filteredCategories: string[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateSkillDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateSkillDialogData
  ) {
    this.skillForm = this.fb.group({
      skillName: ['', [Validators.required, Validators.minLength(2)]],
      category: ['', Validators.required],
      description: [''],
      skillLevelScaleInput: ['1,2,3,4,5', Validators.required],
      isActive: [true]
    });

    // Initialize filtered categories
    if (this.data?.categories) {
      this.filteredCategories = [...this.data.categories];
    }

    // Filter categories based on input
    this.skillForm.get('category')?.valueChanges.subscribe(value => {
      if (this.data?.categories) {
        if (value && typeof value === 'string') {
          const searchValue = value.toLowerCase();
          this.filteredCategories = this.data.categories.filter(cat =>
            cat.toLowerCase().includes(searchValue)
          );
        } else {
          this.filteredCategories = [...this.data.categories];
        }
      }
    });

    // Initialize preview
    this.onScaleInputChange({ target: { value: '1,2,3,4,5' } } as any);
  }

  onScaleInputChange(event: any): void {
    const value = event.target?.value || '';
    if (value.trim()) {
      const levels = value
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
      this.previewLevels = levels;
    } else {
      this.previewLevels = [];
    }
  }

  displayCategory(category: string | null): string {
    return category || '';
  }

  onSubmit(): void {
    if (this.skillForm.valid) {
      const formValue = this.skillForm.value;
      
      // Parse skill level scale
      let skillLevelScale: number[] = [];
      if (formValue.skillLevelScaleInput) {
        const parts = formValue.skillLevelScaleInput.split(',').map((s: string) => s.trim());
        skillLevelScale = parts
          .map((part: string) => {
            const num = parseInt(part, 10);
            return isNaN(num) ? null : num;
          })
          .filter((num: number | null) => num !== null) as number[];
      }

      // Default to 1-5 if empty or invalid
      if (skillLevelScale.length === 0) {
        skillLevelScale = [1, 2, 3, 4, 5];
      }

      const result: CreateSkillSetRequest = {
        skillName: formValue.skillName,
        category: formValue.category,
        description: formValue.description || undefined,
        skillLevelScale: skillLevelScale,
        isActive: formValue.isActive !== false
      };
      
      this.dialogRef.close(result);
    }
  }
}

