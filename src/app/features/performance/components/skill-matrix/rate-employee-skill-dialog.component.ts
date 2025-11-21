import { Component, Inject, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UpdateEmployeeSkillRequest } from '../../../../core/models/performance.models';
import { AuthService } from '../../../../core/services/auth.service';
import { PerformanceService } from '../../services/performance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Subject, takeUntil } from 'rxjs';

export interface RateEmployeeSkillDialogData {
  employeeId: string;
  employeeName: string;
  skillId: string;
  skillName: string;
  employeeSkillId: string;
  currentProficiencyLevel: number;
}

@Component({
  selector: 'app-rate-employee-skill-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>star</mat-icon>
        Rate Employee Skill
      </h2>
      <button mat-icon-button mat-dialog-close class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <form [formGroup]="ratingForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        <div class="form-section">
          <h3 class="section-title">
            <mat-icon>info</mat-icon>
            Skill Rating Details
          </h3>

          <!-- Employee (Read-only) -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Employee</mat-label>
              <mat-icon matPrefix>person</mat-icon>
              <input matInput [value]="data.employeeName" readonly>
            </mat-form-field>
          </div>

          <!-- Skill (Read-only) -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Skill</mat-label>
              <mat-icon matPrefix>school</mat-icon>
              <input matInput [value]="data.skillName" readonly>
            </mat-form-field>
          </div>

          <!-- Proficiency Level -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Proficiency Level (1-5) *</mat-label>
              <mat-icon matPrefix>star</mat-icon>
              <input matInput 
                     type="number" 
                     formControlName="proficiencyLevel" 
                     min="1" 
                     max="5" 
                     step="1" 
                     placeholder="Enter proficiency level">
              <mat-error *ngIf="ratingForm.get('proficiencyLevel')?.hasError('required')">
                Proficiency level is required
              </mat-error>
              <mat-error *ngIf="ratingForm.get('proficiencyLevel')?.hasError('min')">
                Minimum level is 1
              </mat-error>
              <mat-error *ngIf="ratingForm.get('proficiencyLevel')?.hasError('max')">
                Maximum level is 5
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Notes -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Notes</mat-label>
              <mat-icon matPrefix>note</mat-icon>
              <textarea matInput 
                        formControlName="notes" 
                        rows="3" 
                        placeholder="Optional: Add notes about this rating..."></textarea>
            </mat-form-field>
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
          [disabled]="ratingForm.invalid || isSubmitting">
          <mat-spinner diameter="20" *ngIf="isSubmitting"></mat-spinner>
          <mat-icon *ngIf="!isSubmitting">save</mat-icon>
          {{ isSubmitting ? 'Rating...' : 'Rate Skill' }}
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
      max-width: 600px !important;
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

        .mat-mdc-input-element {
          margin-left: 0 !important;
          padding-left: 0 !important;
        }

        .mat-mdc-form-field-subscript-wrapper {
          margin-top: 4px;
        }

        // Read-only input styling
        input[readonly] {
          background: #f3f4f6 !important;
          cursor: not-allowed;
          color: #6b7280;
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
export class RateEmployeeSkillDialogComponent implements OnInit, OnDestroy {
  ratingForm: FormGroup;
  isSubmitting = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RateEmployeeSkillDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RateEmployeeSkillDialogData,
    private performanceService: PerformanceService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    this.ratingForm = this.fb.group({
      proficiencyLevel: [this.data.currentProficiencyLevel || null, [Validators.required, Validators.min(1), Validators.max(5)]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    // Component initialization
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.ratingForm.valid) {
      const formValue = this.ratingForm.value;
      const currentUser = this.authService.getCurrentUserValue();

      if (!currentUser?.userId) {
        this.notificationService.showError('User information not found');
        return;
      }

      this.isSubmitting = true;

      const request: UpdateEmployeeSkillRequest = {
        proficiencyLevel: parseInt(formValue.proficiencyLevel),
        assessedBy: currentUser.userId,
        lastAssessed: new Date().toISOString(),
        notes: formValue.notes || undefined
      };

      this.performanceService.updateEmployeeSkill(this.data.employeeSkillId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.showSuccess('Skill rated successfully');
              this.dialogRef.close({ success: true });
            } else {
              this.notificationService.showError(response.message || 'Failed to rate skill');
              this.isSubmitting = false;
              this.cdr.markForCheck();
            }
          },
          error: (error) => {
            console.error('Error rating skill:', error);
            this.notificationService.showError('Failed to rate skill');
            this.isSubmitting = false;
            this.cdr.markForCheck();
          }
        });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.ratingForm.controls).forEach(key => {
        const control = this.ratingForm.get(key);
        if (control) {
          control.markAsTouched();
        }
      });
    }
  }
}

