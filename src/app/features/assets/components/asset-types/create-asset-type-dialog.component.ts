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
    <div class="dialog-container">
      <!-- ── Header ─────────────────────────────────────────────── -->
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>inventory_2</mat-icon>
          </div>
          <div class="header-info">
            <h2 class="header-title">{{ isEditMode ? 'Edit Asset Type' : 'Create Asset Type' }}</h2>
            <p class="header-subtitle">{{ isEditMode ? 'Update the asset type details' : 'Add a new category to the system' }}</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- ── Content ────────────────────────────────────────────── -->
      <div class="dialog-body">
        <form [formGroup]="assetForm">
          <div class="form-row">
            <label class="field-label">Asset Type Name <span class="required">*</span></label>
            <mat-form-field appearance="outline" class="mat-field">
              <input matInput formControlName="name" placeholder="e.g. Laptop" maxlength="100">
              <mat-error *ngIf="assetForm.get('name')?.hasError('required')">Name is required</mat-error>
            </mat-form-field>
          </div>

          <div class="form-row">
            <label class="field-label">Description</label>
            <mat-form-field appearance="outline" class="mat-field">
              <textarea matInput formControlName="description"
                        placeholder="Enter description (optional)"
                        rows="3"
                        maxlength="500"></textarea>
            </mat-form-field>
          </div>
        </form>
      </div>

      <!-- ── Actions ────────────────────────────────────────────── -->
      <div class="dialog-footer">
        <button mat-stroked-button mat-dialog-close class="btn-cancel">Cancel</button>
        <button mat-flat-button class="btn-submit" (click)="onSubmit()" [disabled]="assetForm.invalid || isSubmitting">
          <mat-icon>{{ isEditMode ? 'save' : 'add_circle' }}</mat-icon>
          {{ isEditMode ? 'Save Changes' : 'Create Type' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    @use '../../../attendance/styles/attendance-dialog' as ad;
    :host { @include ad.ad-scroll-host; }
    @include ad.ad-panel-shell;
    .form-row { width: 100%; display: flex; flex-direction: column; }
  `]
})
export class CreateAssetTypeDialogComponent {
  assetForm: FormGroup;
  isEditMode = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateAssetTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { assetType?: AssetType }
  ) {
    this.isEditMode = !!data?.assetType;

    this.assetForm = this.fb.group({
      name: [data?.assetType?.name || '', [Validators.required, Validators.maxLength(100)]],
      description: [data?.assetType?.description || '', [Validators.maxLength(500)]]
    });
  }

  onSubmit() {
    if (this.assetForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.dialogRef.close(this.assetForm.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
