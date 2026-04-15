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
import { MatCheckboxModule } from '@angular/material/checkbox';

import { CreateKRARequest, UpdateKRARequest, KRA } from '../../../../core/models/performance.models';
import { PerformanceService } from '../../services/performance.service';
import { AppraisalCycle } from '../../../../core/models/performance.models';

export interface CreateKRADialogData {
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
    <div class="kra-dialog-wrapper">

      <!-- Header -->
      <div class="kra-dialog-header">
        <h2 class="kra-dialog-title">
          {{ data.isEditMode ? 'Edit KRA' : 'Add New KRA' }}
        </h2>
        <button class="kra-close-btn" mat-dialog-close type="button" aria-label="Close">
          <span class="kra-close-icon">&#x2715;</span>
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="kraForm" (ngSubmit)="onSubmit()" class="kra-dialog-form">

        <!-- KRA Title -->
        <div class="kra-field-group">
          <label class="kra-label">KRA Title</label>
          <input
            class="kra-input"
            [class.kra-input--error]="kraForm.get('title')?.invalid && kraForm.get('title')?.touched"
            formControlName="title"
            type="text"
            placeholder="e.g. Talent Retention Strategy"
            autocomplete="off"
          />
          <span class="kra-error" *ngIf="kraForm.get('title')?.hasError('required') && kraForm.get('title')?.touched">
            Title is required
          </span>
        </div>

        <!-- Appraisal Cycle -->
        <div class="kra-field-group">
          <label class="kra-label">Appraisal Cycle</label>
          <div class="kra-select-wrapper">
            <select
              class="kra-select"
              [class.kra-input--error]="kraForm.get('cycleId')?.invalid && kraForm.get('cycleId')?.touched"
              formControlName="cycleId"
            >
              <option value="" disabled selected>Select a cycle</option>
              <option *ngFor="let cycle of cycles" [value]="cycle.cycleId">
                {{ cycle.cycleName }}
              </option>
            </select>
            <span class="kra-select-chevron">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </div>
          <span class="kra-error" *ngIf="kraForm.get('cycleId')?.hasError('required') && kraForm.get('cycleId')?.touched">
            Cycle is required
          </span>
        </div>

        <!-- Description -->
        <div class="kra-field-group">
          <label class="kra-label">Description</label>
          <textarea
            class="kra-textarea"
            formControlName="kraDescription"
            rows="3"
            placeholder="Brief overview of the goal objectives..."
          ></textarea>
        </div>

        <!-- Active Status Toggle -->
        <div class="kra-toggle-row">
          <div class="kra-toggle-info">
            <span class="kra-toggle-title">Active Status</span>
            <span class="kra-toggle-subtitle">Enable this KRA for the current appraisal cycle</span>
          </div>
          <label class="kra-toggle-switch">
            <input
              type="checkbox"
              formControlName="isActive"
              class="kra-toggle-input"
            />
            <span class="kra-toggle-track">
              <span class="kra-toggle-thumb"></span>
            </span>
          </label>
        </div>

        <!-- Actions -->
        <div class="kra-dialog-actions">
          <button
            type="button"
            class="kra-btn kra-btn--cancel"
            mat-dialog-close
            [disabled]="isSubmitting"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="kra-btn kra-btn--submit"
            [disabled]="kraForm.invalid || isSubmitting"
          >
            <span *ngIf="isSubmitting" class="kra-spinner"></span>
            <span *ngIf="!isSubmitting">
              {{ data.isEditMode ? 'Update KRA' : 'Save KRA' }}
            </span>
            <span *ngIf="isSubmitting">Saving...</span>
          </button>
        </div>

      </form>
    </div>
  `,
  styles: [`
    /* ─── Host & Overlay Reset ─────────────────────────────── */
    :host {
      display: contents;
    }

    /* ─── Dialog Wrapper ───────────────────────────────────── */
    .kra-dialog-wrapper {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;      max-width: 480px;      overflow: hidden;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.14), 0 4px 16px rgba(0, 0, 0, 0.06);
    }

    /* ─── Header ───────────────────────────────────────────── */
    .kra-dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 28px 32px 12px 32px;
    }

    .kra-dialog-title {
      font-size: 1.375rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 0;
      line-height: 1.2;
    }

    .kra-close-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      transition: background 0.15s ease, color 0.15s ease;
      line-height: 1;
    }

    .kra-close-btn:hover {
      background: #f1f5f9;
      color: #475569;
    }

    .kra-close-icon {
      font-size: 1rem;
      font-style: normal;
    }

    /* ─── Form ─────────────────────────────────────────────── */
    .kra-dialog-form {
      padding: 8px 32px 32px 32px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* ─── Field Group ──────────────────────────────────────── */
    .kra-field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* ─── Label ────────────────────────────────────────────── */
    .kra-label {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    /* ─── Input ────────────────────────────────────────────── */
    .kra-input,
    .kra-textarea,
    .kra-select {
      width: 100%;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 0.875rem;
      color: #0f172a;
      font-family: inherit;
      outline: none;
      transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
      box-sizing: border-box;
    }

    .kra-input::placeholder,
    .kra-textarea::placeholder {
      color: #94a3b8;
    }

    .kra-input:focus,
    .kra-textarea:focus,
    .kra-select:focus {
      border-color: #6764f2;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(103, 100, 242, 0.12);
    }

    .kra-input--error {
      border-color: #ef4444 !important;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.10) !important;
    }

    /* ─── Textarea ─────────────────────────────────────────── */
    .kra-textarea {
      resize: none;
      line-height: 1.55;
    }

    /* ─── Select ───────────────────────────────────────────── */
    .kra-select-wrapper {
      position: relative;
    }

    .kra-select {
      appearance: none;
      -webkit-appearance: none;
      padding-right: 40px;
      cursor: pointer;
    }

    .kra-select-chevron {
      position: absolute;
      right: 13px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      pointer-events: none;
      display: flex;
      align-items: center;
    }

    /* ─── Error ────────────────────────────────────────────── */
    .kra-error {
      font-size: 0.75rem;
      color: #ef4444;
      font-weight: 500;
    }

    /* ─── Toggle Row ───────────────────────────────────────── */
    .kra-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
      border-radius: 10px;
      padding: 12px 14px;
      gap: 12px;
    }

    .kra-toggle-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .kra-toggle-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: #0f172a;
    }

    .kra-toggle-subtitle {
      font-size: 0.75rem;
      color: #64748b;
      line-height: 1.4;
    }

    /* ─── Toggle Switch ────────────────────────────────────── */
    .kra-toggle-switch {
      position: relative;
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      flex-shrink: 0;
    }

    .kra-toggle-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .kra-toggle-track {
      width: 44px;
      height: 24px;
      background: #e2e8f0;
      border-radius: 9999px;
      position: relative;
      transition: background 0.22s ease;
      display: block;
    }

    .kra-toggle-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: #ffffff;
      border-radius: 9999px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
      transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .kra-toggle-input:checked + .kra-toggle-track {
      background: #6764f2;
    }

    .kra-toggle-input:checked + .kra-toggle-track .kra-toggle-thumb {
      transform: translateX(20px);
    }

    /* ─── Actions ──────────────────────────────────────────── */
    .kra-dialog-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-top: 4px;
    }

    .kra-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: none;
      border-radius: 10px;
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      padding: 11px 20px;
      transition: all 0.18s ease;
      letter-spacing: 0.01em;
    }

    .kra-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .kra-btn--cancel {
      flex: 1;
      background: transparent;
      color: #475569;
    }

    .kra-btn--cancel:hover:not(:disabled) {
      background: #f1f5f9;
      color: #1e293b;
    }

    .kra-btn--submit {
      flex: 2;
      background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
      color: #ffffff;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.28);
    }

    .kra-btn--submit:hover:not(:disabled) {
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.38);
      transform: translateY(-1px);
    }

    .kra-btn--submit:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.22);
    }

    /* ─── Spinner ──────────────────────────────────────────── */
    .kra-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: kra-spin 0.7s linear infinite;
    }

    @keyframes kra-spin {
      to { transform: rotate(360deg); }
    }
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