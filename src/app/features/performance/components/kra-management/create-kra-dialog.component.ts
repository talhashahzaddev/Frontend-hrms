import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CreateKRARequest, UpdateKRARequest, KRA } from '../../../../core/models/performance.models';
import { Position } from '../../../../core/models/employee.models';

export interface CreateKRADialogData {
  positions: Position[];
  kra?: KRA;
  isEditMode: boolean;
}

@Component({
  selector: 'app-create-kra-dialog',
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
    MatCheckboxModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>list_alt</mat-icon>
        {{ data.isEditMode ? 'Edit KRA' : 'Create New KRA' }}
      </h2>
      <button mat-icon-button mat-dialog-close class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <form [formGroup]="kraForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        
        <div class="form-section">
          <h3 class="section-title">
            <mat-icon>info</mat-icon>
            KRA Details
          </h3>

          <div class="form-row two-columns">
            <!-- Position Selection -->
            <mat-form-field appearance="outline">
              <mat-label>Position *</mat-label>
              <mat-icon matPrefix>work</mat-icon>
              <mat-select formControlName="positionId" [disabled]="data.isEditMode">
                <mat-option *ngFor="let position of data.positions" [value]="position.positionId">
                  {{ position.positionTitle }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="kraForm.get('positionId')?.hasError('required')">
                Position is required
              </mat-error>
            </mat-form-field>

            <!-- Weight Percentage -->
            <mat-form-field appearance="outline">
              <mat-label>Weight Percentage (0-100) *</mat-label>
              <mat-icon matPrefix>percent</mat-icon>
              <input matInput 
                     type="number" 
                     formControlName="weight" 
                     min="0" 
                     max="100"
                     placeholder="0-100">
              <mat-error *ngIf="kraForm.get('weight')?.hasError('required')">
                Weight is required
              </mat-error>
              <mat-error *ngIf="kraForm.get('weight')?.hasError('min') || kraForm.get('weight')?.hasError('max')">
                Weight must be between 0 and 100
              </mat-error>
            </mat-form-field>
          </div>

          <!-- KRA Title -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>KRA Title *</mat-label>
              <mat-icon matPrefix>title</mat-icon>
              <input matInput 
                     formControlName="title" 
                     placeholder="Enter KRA title">
              <mat-error *ngIf="kraForm.get('title')?.hasError('required')">
                Title is required
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
                        placeholder="Enter KRA description..."></textarea>
            </mat-form-field>
          </div>

          <!-- Measurement Criteria -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Measurement Criteria</mat-label>
              <mat-icon matPrefix>assessment</mat-icon>
              <textarea matInput 
                        formControlName="measurementCriteria" 
                        rows="3" 
                        placeholder="Enter measurement criteria..."></textarea>
            </mat-form-field>
          </div>

          <!-- Active Status -->
          <div class="form-row">
            <mat-checkbox formControlName="isActive" class="active-checkbox">
              <mat-icon>check_circle</mat-icon>
              <span>Active</span>
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
          [disabled]="kraForm.invalid || isSubmitting">
          <mat-spinner diameter="20" *ngIf="isSubmitting"></mat-spinner>
          <mat-icon *ngIf="!isSubmitting">save</mat-icon>
          {{ isSubmitting ? 'Saving...' : (data.isEditMode ? 'Update KRA' : 'Create KRA') }}
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

    .active-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 8px;
      background: #f9fafb;
      transition: all 0.3s ease;

      &:hover {
        background: #f3f4f6;
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #667eea;
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

    ::ng-deep .mat-mdc-select-panel {
      border-radius: 12px !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
      margin-top: 8px;

      .mat-mdc-option {
        border-radius: 8px !important;
        margin: 4px 8px !important;
        padding: 12px 16px !important;

        &:hover {
          background: rgba(102, 126, 234, 0.1) !important;
        }

        &.mat-mdc-option-active,
        &.mat-selected {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.1) 100%) !important;
          color: #667eea !important;
        }
      }
    }

    ::ng-deep mat-spinner {
      circle {
        stroke: #667eea !important;
      }
    }

    @media (max-width: 768px) {
      .dialog-content {
        padding: 20px !important;
      }
      .form-section {
        .section-title {
          font-size: 1rem;
        }
      }
      .form-row.two-columns {
        grid-template-columns: 1fr;
      }
      .dialog-actions {
        flex-direction: column;
        gap: 12px;
        button {
          width: 100%;
        }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateKRADialogComponent {
  kraForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateKRADialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateKRADialogData
  ) {
    const kra = data.kra;
    
    this.kraForm = this.fb.group({
      positionId: [kra?.positionId || '', data.isEditMode ? [] : Validators.required],
      title: [kra?.title || '', Validators.required],
      description: [kra?.description || ''],
      weight: [kra?.weight || 0, [Validators.required, Validators.min(0), Validators.max(100)]],
      measurementCriteria: [kra?.measurementCriteria || ''],
      isActive: [kra?.isActive !== undefined ? kra.isActive : true]
    });

    if (data.isEditMode && !kra?.positionId) {
      this.kraForm.get('positionId')?.disable();
    }
  }

  onSubmit(): void {
    if (this.kraForm.valid) {
      this.isSubmitting = true;
      const formValue = this.kraForm.value;
      
      if (this.data.isEditMode) {
        const request: UpdateKRARequest = {
          title: formValue.title,
          description: formValue.description,
          weight: formValue.weight,
          measurementCriteria: formValue.measurementCriteria,
          isActive: formValue.isActive
        };
        this.dialogRef.close({ request, isEdit: true, kra: this.data.kra });
      } else {
        const request: CreateKRARequest = {
          positionId: formValue.positionId,
          title: formValue.title,
          description: formValue.description,
          weight: formValue.weight,
          measurementCriteria: formValue.measurementCriteria,
          isActive: formValue.isActive
        };
        this.dialogRef.close({ request, isEdit: false });
      }
    } else {
      this.markFormGroupTouched(this.kraForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}



