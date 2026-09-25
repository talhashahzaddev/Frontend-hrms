import { Component, Inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { CreateKRARequest, UpdateKRARequest, KRA } from '../../../../core/models/performance.models';
import { PerformanceService } from '../../services/performance.service';
import { AppraisalCycle } from '../../../../core/models/performance.models';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface CreateKRADialogData {
  kra?: KRA;
  isEditMode: boolean;
}


@Component({
  selector: 'app-create-kra-dialog',
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
    MatSlideToggleModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>{{ data.isEditMode ? 'edit' : 'add_box' }}</mat-icon>
          </div>
          <div>
            <h2 class="header-title">{{ data.isEditMode ? 'Edit KRA' : 'Add New KRA' }}</h2>
            <p class="header-subtitle">{{ data.isEditMode ? 'Update Key Result Area details' : 'Define a new Key Result Area' }}</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-body">
        <form [formGroup]="kraForm" (ngSubmit)="onSubmit()">
          
          <div class="assign-section">
            <div class="assign-section-header">
              <mat-icon>info</mat-icon>
              <span>KRA Details</span>
            </div>
            <div class="assign-section-body">
              
              <div class="assign-field-group">
                <label class="field-label">KRA Title <span class="required">*</span></label>
                <mat-form-field appearance="outline" class="mat-field">
                  <input matInput formControlName="title" placeholder="e.g. Talent Retention Strategy">
                  <mat-error *ngIf="kraForm.get('title')?.hasError('required')">Title is required</mat-error>
                </mat-form-field>
              </div>

              <div class="assign-field-group">
                <label class="field-label">Appraisal Cycle <span class="required">*</span></label>
                <mat-form-field appearance="outline" class="mat-field">
                  <mat-select formControlName="cycleId" placeholder="Select a cycle">
                    <mat-option *ngFor="let cycle of cycles" [value]="cycle.cycleId">
                      {{ cycle.cycleName }}
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="kraForm.get('cycleId')?.hasError('required')">Cycle is required</mat-error>
                </mat-form-field>
              </div>

              <div class="assign-field-group">
                <label class="field-label">Description</label>
                <mat-form-field appearance="outline" class="mat-field">
                  <textarea matInput formControlName="kraDescription" rows="3" placeholder="Brief overview of the goal objectives..."></textarea>
                </mat-form-field>
              </div>
            </div>
          </div>

          <div class="assign-section">
            <div class="assign-section-header">
              <mat-icon>settings</mat-icon>
              <span>Configuration</span>
            </div>
            <div class="assign-section-body">
              <div class="pm-toggle-list">
                <div class="pm-toggle-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
                  <div class="pm-toggle-info" style="display:flex; align-items:center; gap:12px;">
                    <mat-icon style="color:#94a3b8;">power_settings_new</mat-icon>
                    <div>
                      <p style="margin:0 0 2px; font-size:14px; font-weight:600; color:#334155;">Active Status</p>
                      <p style="margin:0; font-size:12px; color:#64748b;">Enable this KRA for the current appraisal cycle</p>
                    </div>
                  </div>
                  <mat-slide-toggle formControlName="isActive"></mat-slide-toggle>
                </div>
              </div>
            </div>
          </div>

        </form>
      </mat-dialog-content>

      <div class="dialog-footer">
        <button mat-stroked-button class="btn-cancel" mat-dialog-close [disabled]="isSubmitting">Cancel</button>
        <button mat-flat-button class="btn-submit" (click)="onSubmit()" [disabled]="kraForm.invalid || isSubmitting">
          <mat-icon *ngIf="!isSubmitting">{{ data.isEditMode ? 'save' : 'add_circle' }}</mat-icon>
          <mat-spinner diameter="16" *ngIf="isSubmitting" style="margin-right:8px;"></mat-spinner>
          <span *ngIf="!isSubmitting">{{ data.isEditMode ? 'Update KRA' : 'Create KRA' }}</span>
          <span *ngIf="isSubmitting">Saving...</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    @use '../../styles/performance-shared';
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateKRADialogComponent implements OnInit {

  kraForm: FormGroup;
  isSubmitting = false;
  cycles: AppraisalCycle[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateKRADialogComponent>,
    private performanceService: PerformanceService,
    @Inject(MAT_DIALOG_DATA) public data: CreateKRADialogData
  ) {
    const kra = data.kra;

    this.kraForm = this.fb.group({
      title: [kra?.title || '', Validators.required],
      kraDescription: [kra?.kraDescription || ''],
      cycleId: [kra?.cycleId || '', Validators.required],
      isActive: [kra?.isActive !== undefined ? kra.isActive : true]
    });
  }

  ngOnInit(): void {
    this.loadCycles();
  }

  loadCycles(): void {
    this.performanceService.getAppraisalCycles().subscribe({
      next: (res) => {
        this.cycles = res.data || [];
      },
      error: (err) => {
        console.error('Failed to load cycles', err);
      }
    });
  }

  onSubmit(): void {
    if (this.kraForm.valid) {
      this.isSubmitting = true;
      const formValue = this.kraForm.value;

      if (this.data.isEditMode) {
        const request: UpdateKRARequest = {
          title: formValue.title,
          kraDescription: formValue.kraDescription,
          cycleId: formValue.cycleId,
          isActive: formValue.isActive
        };

        this.dialogRef.close({ request, isEdit: true, kra: this.data.kra });
      } else {
        const request: CreateKRARequest = {
          title: formValue.title,
          kraDescription: formValue.kraDescription,
          cycleId: formValue.cycleId,
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
    });
  }
}
