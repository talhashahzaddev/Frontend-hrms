import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AssetType } from '../../../../core/models/assets.models';

@Component({
  selector: 'app-create-asset-type-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="header-content">
          <div class="header-icon">
            <i class="fas fa-box"></i>
          </div>
          <div class="header-text">
            <h2>{{ isEditMode ? 'Edit Asset Type' : 'Create Asset Type' }}</h2>
            <p>{{ isEditMode ? 'Modify existing asset type details' : 'Add a new asset type to the system' }}</p>
          </div>
        </div>
        <button mat-icon-button class="close-button" (click)="onCancel()" aria-label="Close dialog">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <form [formGroup]="assetForm" class="asset-type-form">
          <div class="form-section">
            <div class="section-header">
              <i class="fas fa-tag"></i>
              <span>Basic Information</span>
            </div>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Asset Type Name</mat-label>
              <input matInput formControlName="name" placeholder="Enter asset type name">
              <mat-error *ngIf="assetForm.get('name')?.invalid && assetForm.get('name')?.touched">
                Name is required and must be less than 100 characters
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Description</mat-label>
              <textarea matInput formControlName="description" placeholder="Enter description (optional)" rows="3"></textarea>
              <mat-error *ngIf="assetForm.get('description')?.invalid && assetForm.get('description')?.touched">
                Description must be less than 500 characters
              </mat-error>
            </mat-form-field>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button (click)="onCancel()">
          <i class="fas fa-times"></i> Cancel
        </button>
        <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="assetForm.invalid">
          <i class="fas fa-save"></i> {{ isEditMode ? 'Save Changes' : 'Create' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    /* ==================== Dialog Container ==================== */
    .dialog-container {
      padding: 0;
      min-width: 500px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    /* ==================== Header ==================== */
    .dialog-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
      position: relative;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .header-text h2 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 600;
    }

    .header-text p {
      margin: 0;
      font-size: 14px;
      opacity: 0.8;
    }

    .close-button {
      position: absolute;
      right: 16px;
      top: 16px;
      width: 36px;
      height: 36px;
      color: rgba(255, 255, 255, 0.8);
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-button:hover {
      background-color: rgba(255, 255, 255, 0.2);
      color: white;
    }

    /* ==================== Form Content ==================== */
    .dialog-content {
      padding: 0;
      background-color: #f8f9fa;
    }

    .asset-type-form {
      display: flex;
      flex-direction: column;
    }

    .form-section {
      background: white;
      padding: 24px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      color: #6c757d;
      font-weight: 500;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-field {
      width: 100%;
      margin-bottom: 20px;
    }

    textarea.mat-mdc-input-element {
      resize: vertical;
      min-height: 80px;
    }

    /* ==================== Actions ==================== */
    .dialog-actions {
      padding: 16px 24px;
      background-color: white;
      border-top: 1px solid #e9ecef;
      gap: 12px;
    }

    .dialog-actions button {
      min-width: 100px;
      height: 40px;
      border-radius: 8px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .dialog-actions button[mat-button] {
      background-color: #f8f9fa;
      color: #6c757d;
      border: 1px solid #dee2e6;
    }

    .dialog-actions button[mat-button]:hover {
      background-color: #e9ecef;
      color: #495057;
    }

    .dialog-actions button[mat-raised-button] {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .dialog-actions button[mat-raised-button]:hover {
      background: linear-gradient(135deg, #5a67d8 0%, #6c5ce7 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }

    .dialog-actions button[mat-raised-button]:disabled {
      background: #e9ecef;
      color: #6c757d;
      box-shadow: none;
      transform: none;
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
      id: [data?.id || ''],
      name: [data?.name || '', [Validators.required, Validators.maxLength(100)]],
      description: [data?.description || '', [Validators.maxLength(500)]]
    });
  }

  onSubmit(): void {
    if (this.assetForm.valid) {
      // Close the dialog and return the form value
      this.dialogRef.close(this.assetForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
