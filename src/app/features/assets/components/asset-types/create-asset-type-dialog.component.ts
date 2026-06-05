import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AssetType } from '../../../../core/models/assets.models';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-create-asset-type-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <!-- ── Header ─────────────────────────────────────────────── -->
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>inventory_2</mat-icon>
        {{ isEditMode ? 'Edit Asset Type' : 'Create Asset Type' }}
      </h2>
    </div>

    <!-- ── Content ────────────────────────────────────────────── -->
    <mat-dialog-content class="dialog-content">
      <form [formGroup]="assetForm" class="department-form">

        <!-- Asset Type Name -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Asset Type Name **</mat-label>
          <input matInput formControlName="name" placeholder="Enter asset type name" maxlength="100">
          <mat-hint>Required field</mat-hint>
          <mat-error *ngIf="assetForm.get('name')?.hasError('required')">
            Asset type name is required
          </mat-error>
          <mat-error *ngIf="assetForm.get('name')?.hasError('maxlength')">
            Name cannot exceed 100 characters
          </mat-error>
        </mat-form-field>

        <!-- Description -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description"
            placeholder="Enter description (optional)"
            rows="3" maxlength="500"></textarea>
          <mat-hint>Optional - Brief description of the asset type</mat-hint>
          <mat-error *ngIf="assetForm.get('description')?.hasError('maxlength')">
            Description cannot exceed 500 characters
          </mat-error>
        </mat-form-field>

      </form>
    </mat-dialog-content>

    <!-- ── Actions ────────────────────────────────────────────── -->
    <mat-dialog-actions class="dialog-actions">
      <button mat-stroked-button type="button" (click)="onCancel()">
        Cancel
      </button>
      <button mat-flat-button
              class="submit-button"
              [disabled]="assetForm.invalid"
              (click)="onSubmit()">
        {{ isEditMode ? 'Save Changes' : 'Create Asset Type' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    /* ── Dialog Container ──────────────────────────────────────── */
    ::ng-deep .mat-mdc-dialog-container {
      border-radius: 12px !important;
      padding: 0 !important;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.10) !important;
    }

    /* ── Dialog Header ─────────────────────────────────────────── */
    .dialog-header {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      padding: 18px 24px;
      background: #ffffff;
      border-bottom: 1px solid #ebebeb;

      h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        color: #111827;
        font-family: 'DM Sans', 'Segoe UI', sans-serif;
        letter-spacing: -0.2px;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      }
    }

    /* ── Dialog Content ────────────────────────────────────────── */
    .dialog-content {
      padding: 20px 24px !important;
      min-width: 480px;
      max-width: 560px;
      background: #f7f8fa;

      .department-form {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .full-width {
          width: 100%;
          margin-bottom: 4px;

          &:last-child { margin-bottom: 0; }
        }

        ::ng-deep mat-form-field {
          &.mat-form-field-appearance-outline {

            .mat-mdc-text-field-wrapper {
              background: #ffffff;
              border-radius: 8px !important;
              transition: background 0.15s ease;
            }

            .mat-mdc-form-field-flex { padding: 0 14px; }
            .mat-mdc-form-field-infix { padding: 11px 0 !important; min-height: unset; }

            .mdc-notched-outline__leading,
            .mdc-notched-outline__notch,
            .mdc-notched-outline__trailing {
              border-color: #e5e7eb !important;
              transition: border-color 0.15s ease;
            }

            &:hover {
              .mdc-notched-outline__leading,
              .mdc-notched-outline__notch,
              .mdc-notched-outline__trailing {
                border-color: #c4b5fd !important;
              }
            }

            &.mat-focused {
              .mat-mdc-text-field-wrapper { background: #ffffff; }

              .mdc-notched-outline__leading,
              .mdc-notched-outline__notch,
              .mdc-notched-outline__trailing {
                border-color: #6366f1 !important;
                border-width: 2px !important;
              }

              label { color: #6366f1 !important; }
            }

            .mat-mdc-form-field-label, label {
              font-size: 13px;
              color: #6b7280;
              font-weight: 500;
            }

            input, textarea {
              font-size: 13.5px;
              color: #111827;
              font-weight: 500;
            }

            textarea { resize: vertical; }

            &.mat-form-field-invalid {
              .mdc-notched-outline__leading,
              .mdc-notched-outline__notch,
              .mdc-notched-outline__trailing {
                border-color: #ef4444 !important;
              }
              label { color: #ef4444 !important; }
            }

            .mat-mdc-form-field-hint {
              font-size: 11.5px;
              color: #9ca3af;
              font-weight: 400;
            }
          }
        }
      }
    }

    /* ── Dialog Actions ────────────────────────────────────────── */
    .dialog-actions {
      padding: 14px 24px !important;
      background: #ffffff;
      border-top: 1px solid #ebebeb;
      display: flex;
      justify-content: flex-end;
      gap: 10px;

      button {
        height: 38px;
        padding: 0 20px !important;
        border-radius: 8px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        text-transform: none !important;
        transition: all 0.15s ease !important;

        /* Cancel */
        &[mat-stroked-button] {
          background: #ffffff !important;
          color: #374151 !important;
          border-color: #d1d5db !important;

          &:hover {
            background: #f9fafb !important;
            border-color: #9ca3af !important;
          }
        }

        /* Submit */
        &.submit-button:not([disabled]) {
          background: #111827 !important;
          color: #ffffff !important;
          border: none !important;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15) !important;

          &:hover {
            background: #1f2937 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
          }
        }

        /* Disabled */
        &[disabled] {
          background: #f3f4f6 !important;
          color: #9ca3af !important;
          border: 1px solid #e5e7eb !important;
          box-shadow: none !important;
          cursor: not-allowed;
        }
      }
    }

    /* ── Error Messages ────────────────────────────────────────── */
    ::ng-deep mat-error {
      font-size: 11.5px;
      font-weight: 500;
      color: #dc2626;
      margin-top: 2px;
    }

    /* ── Responsive ────────────────────────────────────────────── */
    @media (max-width: 600px) {
      .dialog-header {
        padding: 16px 18px 14px;
        h2 { font-size: 16px; }
      }

      .dialog-content {
        min-width: unset;
        padding: 14px 14px !important;
      }

      .dialog-actions {
        flex-direction: column;
        gap: 8px;
        padding: 12px 14px !important;

        button {
          width: 100%;
          justify-content: center;
          height: 40px !important;
        }
      }
    }
  `]
})
export class CreateAssetTypeDialogComponent {
  assetForm: FormGroup;
  isEditMode: boolean;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateAssetTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AssetType | null
  ) {
    this.isEditMode = !!data;
    this.assetForm = this.fb.group({
      id:          [data?.id || ''],
      name:        [data?.name || '',        [Validators.required, Validators.maxLength(100)]],
      description: [data?.description || '', [Validators.maxLength(500)]]
    });
  }

  onSubmit(): void {
    if (this.assetForm.valid) {
      this.dialogRef.close(this.assetForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
