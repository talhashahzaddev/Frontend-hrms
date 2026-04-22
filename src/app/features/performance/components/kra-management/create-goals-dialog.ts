import { Component, Inject, ChangeDetectionStrategy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { CreateGoalRequest, UpdateGoalRequest, Goal, KRA } from '../../../../core/models/performance.models';
import { PerformanceService } from '../../services/performance.service';

export interface CreateGoalDialogData {
  goal?: Goal;
  isEditMode: boolean;
}

@Component({
  selector: 'app-create-goals-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
  ],
  template: `
    <div class="goal-modal">

      <!-- Modal Header -->
      <div class="modal-header">
        <div>
          <h2 class="modal-title">{{ data.isEditMode ? 'Edit Goal' : 'Add New Goal' }}</h2>
          <p class="modal-subtitle">Define a clear, measurable objective.</p>
        </div>
        <button class="close-btn" mat-dialog-close>
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Modal Body -->
      <form [formGroup]="goalForm" (ngSubmit)="onSubmit()">
        <div class="modal-body">

          <!-- Goal Title -->
          <div class="field-group">
            <label class="field-label" for="goal-title">Goal Title</label>
            <input
              id="goal-title"
              class="field-input"
              [class.field-input--error]="goalForm.get('title')?.invalid && goalForm.get('title')?.touched"
              type="text"
              formControlName="title"
              placeholder="e.g., Increase department productivity"
            />
            <span class="field-error" *ngIf="goalForm.get('title')?.hasError('required') && goalForm.get('title')?.touched">
              Title is required
            </span>
            <span class="field-error" *ngIf="goalForm.get('title')?.hasError('minlength') && goalForm.get('title')?.touched">
              Title must be at least 3 characters
            </span>
          </div>

          <!-- KRA Selector -->
          <div class="field-group">
            <label class="field-label" for="kra">KRA (Key Result Area)</label>
            <div class="select-wrapper">
              <select
                id="kra"
                class="field-select"
                [class.field-input--error]="goalForm.get('kraId')?.invalid && goalForm.get('kraId')?.touched"
                formControlName="kraId"
                (focus)="onKraDropdownOpen()"
              >
                <option value="">Select KRA</option>
                <ng-container *ngIf="isLoadingKRAs">
                  <option disabled>Loading KRAs...</option>
                </ng-container>
                <ng-container *ngIf="!isLoadingKRAs">
                  <option *ngFor="let kra of kraList" [value]="kra.kraId">
                    {{ kra.title }}
                  </option>
                  <option *ngIf="kraList.length === 0" disabled>No KRAs available</option>
                </ng-container>
              </select>
              <span class="select-icon material-symbols-outlined">expand_more</span>
              <mat-spinner *ngIf="isLoadingKRAs" diameter="18" class="select-spinner"></mat-spinner>
            </div>
            <span class="field-error" *ngIf="goalForm.get('kraId')?.hasError('required') && goalForm.get('kraId')?.touched">
              KRA is required
            </span>
          </div>

          <!-- Progress Status -->
          <div class="field-group">
            <label class="field-label" for="progress">Progress Status</label>
            <div class="select-wrapper">
              <select
                id="progress"
                class="field-select"
                formControlName="progress"
              >
                <option value="tostart">To Start</option>
                <option value="inprogress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="onhold">On Hold</option>
              </select>
              <span class="select-icon material-symbols-outlined">expand_more</span>
            </div>
          </div>

          <!-- Start Date & End Date -->
          <div class="date-row">
            <div class="field-group">
              <label class="field-label" for="start-date">Start Date</label>
              <input
                id="start-date"
                class="field-input"
                type="date"
                formControlName="startDate"
              />
            </div>
            <div class="field-group">
              <label class="field-label" for="end-date">End Date</label>
              <input
                id="end-date"
                class="field-input"
                type="date"
                formControlName="endDate"
              />
            </div>
          </div>

          <!-- Description -->
          <div class="field-group">
            <label class="field-label" for="description">Description</label>
            <textarea
              id="description"
              class="field-textarea"
              formControlName="description"
              rows="3"
              placeholder="Describe the steps and measurable outcomes..."
            ></textarea>
          </div>

          <!-- Active Status (Edit Mode Only) -->
          <div class="field-group" *ngIf="data.isEditMode">
            <mat-checkbox formControlName="isActive" class="active-check">
              Active Goal
            </mat-checkbox>
          </div>

        </div>

        <!-- Modal Footer -->
        <div class="modal-footer">
          <button type="button" class="btn-cancel" mat-dialog-close [disabled]="isSubmitting">
            Cancel
          </button>
          <button
            type="submit"
            class="btn-save"
            [disabled]="goalForm.invalid || isSubmitting"
          >
            <mat-spinner *ngIf="isSubmitting" diameter="16" class="btn-spinner"></mat-spinner>
            <span>{{ isSubmitting ? 'Saving...' : (data.isEditMode ? 'Update Goal' : 'Save Goal') }}</span>
          </button>
        </div>
      </form>

    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

    :host {
      display: block;
      font-family: 'Inter', sans-serif;
    }

    /* ── Modal Shell ───────────────────────────────────── */
    .goal-modal {
      width: 100%;
      max-width: 350px;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ────────────────────────────────────────── */
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px 20px 12px;
      border-bottom: 1px solid #f1f5f9;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 2px 0;
      line-height: 1.3;
    }

    .modal-subtitle {
      font-size: 12px;
      color: #94a3b8;
      margin: 0;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #94a3b8;
      transition: background 0.15s;
      flex-shrink: 0;
      margin-left: 10px;

      &:hover {
        background: #f1f5f9;
        color: #475569;
      }

      .material-symbols-outlined {
        font-size: 18px;
      }
    }

    /* ── Body ──────────────────────────────────────────── */
    .modal-body {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* ── Field Groups ──────────────────────────────────── */
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .field-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
    }

    /* Shared input/select/textarea base */
    %field-base {
      width: 100%;
      padding: 8px 11px;
      border-radius: 8px;
      background: #f1f5f9;
      border: none;
      outline: none;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      color: #0f172a;
      transition: box-shadow 0.15s, background 0.15s;
      box-sizing: border-box;

      &::placeholder {
        color: #94a3b8;
      }

      &:focus {
        background: #eef0f8;
        box-shadow: 0 0 0 3px rgba(99, 100, 242, 0.15);
      }
    }

    .field-input {
      @extend %field-base;

      &--error {
        box-shadow: 0 0 0 2px #ef4444 !important;
      }
    }

    .field-textarea {
      @extend %field-base;
      resize: none;
      line-height: 1.6;
    }

    .field-error {
      font-size: 11.5px;
      color: #ef4444;
      margin-top: 2px;
    }

    /* ── Select ────────────────────────────────────────── */
    .select-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .field-select {
      @extend %field-base;
      appearance: none;
      -webkit-appearance: none;
      cursor: pointer;
      padding-right: 36px;
    }

    .select-icon {
      position: absolute;
      right: 10px;
      font-size: 20px;
      color: #94a3b8;
      pointer-events: none;
      font-family: 'Material Symbols Outlined', sans-serif;
    }

    .select-spinner {
      position: absolute;
      right: 10px;
    }

    /* ── Date Row ──────────────────────────────────────── */
    .date-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    /* ── Active Checkbox ───────────────────────────────── */
    .active-check {
      font-size: 12px;
      color: #475569;
    }

    /* ── Footer ────────────────────────────────────────── */
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px 20px;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
    }

    .btn-cancel {
      padding: 7px 18px;
      border-radius: 8px;
      border: none;
      background: transparent;
      font-size: 12.5px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      color: #475569;
      cursor: pointer;
      transition: background 0.15s;

      &:hover:not(:disabled) {
        background: #e2e8f0;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-save {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 24px;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
      color: #ffffff;
      font-size: 12.5px;
      font-weight: 700;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);
      transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;

      &:hover:not(:disabled) {
        transform: scale(1.02);
        box-shadow: 0 4px 14px rgba(99, 102, 241, 0.45);
      }

      &:active:not(:disabled) {
        transform: scale(0.97);
      }

      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        transform: none;
      }
    }

    .btn-spinner {
      display: inline-flex;
    }

    /* ── Mat overrides ─────────────────────────────────── */
    ::ng-deep .goal-modal {
      .mat-mdc-dialog-surface {
        border-radius: 16px !important;
        padding: 0 !important;
      }

      .mdc-checkbox__background {
        border-color: #8b5cf6 !important;
      }

      .mdc-checkbox--selected .mdc-checkbox__background {
        background: #8b5cf6 !important;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateGoalDialogComponent implements OnInit {

  goalForm: FormGroup;
  isSubmitting = false;
  isLoadingKRAs = false;
  kraList: KRA[] = [];
  private krasLoaded = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateGoalDialogComponent>,
    private performanceService: PerformanceService,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: CreateGoalDialogData
  ) {
    const goal = data.goal;

    this.goalForm = this.fb.group({
      title: [goal?.title || '', [Validators.required, Validators.minLength(3)]],
      description: [goal?.description || ''],
      kraId: [goal?.kraId || '', Validators.required],
      progress: [goal?.progress || 'tostart', Validators.required],
      startDate: [goal?.startDate || ''],
      endDate: [goal?.endDate || ''],
      isActive: [goal?.isActive !== undefined ? goal.isActive : true]
    });
  }

  ngOnInit(): void {
    console.log('CreateGoalDialogComponent - ngOnInit called');
    this.loadKRAs();
  }

  onKraDropdownOpen(): void {
    console.log('KRA Dropdown opened');
    if (!this.krasLoaded && !this.isLoadingKRAs) {
      console.log('KRAs not yet loaded, loading now...');
      this.loadKRAs();
    }
  }

  loadKRAs(): void {
    console.log('🔄 Starting to load KRAs...');
    this.isLoadingKRAs = true;
    this.cdr.markForCheck();

    this.performanceService.getKRAs(1, 1000, '').subscribe({
      next: (response) => {
        console.log('✅ KRA API Response received:', response);

        if (response.success && response.data) {
          const paginatedData = response.data as any;
          this.kraList = paginatedData.data || paginatedData.items || [];

          console.log('✅ KRAs loaded successfully:', this.kraList);
          console.log('✅ Total KRAs loaded:', this.kraList.length);

          this.krasLoaded = true;
        } else {
          console.warn('⚠️ API response success is false or no data:', response);
          this.kraList = [];
        }

        this.isLoadingKRAs = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('❌ Failed to load KRAs - Error:', err);
        console.error('Error details:', {
          message: err.message,
          status: err.status,
          statusText: err.statusText,
          url: err.url
        });
        this.kraList = [];
        this.isLoadingKRAs = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSubmit(): void {
    if (this.goalForm.valid) {
      this.isSubmitting = true;
      const formValue = this.goalForm.value;

      const formatDateForAPI = (dateValue: any) => {
        if (!dateValue) return undefined;
        if (typeof dateValue === 'string') return dateValue;
        if (dateValue instanceof Date) {
          return dateValue.toISOString().split('T')[0];
        }
        return undefined;
      };

      if (this.data.isEditMode) {
        const request: UpdateGoalRequest = {
          goalId: this.data.goal?.goalId || '',
          title: formValue.title,
          description: formValue.description,
          kraId: formValue.kraId,
          progress: formValue.progress,
          startDate: formatDateForAPI(formValue.startDate),
          endDate: formatDateForAPI(formValue.endDate),
          isActive: formValue.isActive
        };

        this.dialogRef.close({ request, isEdit: true, goal: this.data.goal });
      } else {
        const request: CreateGoalRequest = {
          title: formValue.title,
          description: formValue.description,
          kraId: formValue.kraId,
          progress: formValue.progress,
          startDate: formatDateForAPI(formValue.startDate),
          endDate: formatDateForAPI(formValue.endDate)
        };

        this.dialogRef.close({ request, isEdit: false });
      }
    } else {
      this.markFormGroupTouched(this.goalForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}