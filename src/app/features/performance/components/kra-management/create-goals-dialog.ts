import { Component, Inject, ChangeDetectionStrategy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { CreateGoalRequest, UpdateGoalRequest, Goal, KRA } from '../../../../core/models/performance.models';
import { PerformanceService } from '../../services/performance.service';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface CreateGoalDialogData {
  goal?: Goal;
  isEditMode: boolean;
}


@Component({
  selector: 'app-create-goals-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>{{ data.isEditMode ? 'edit' : 'add_box' }}</mat-icon>
          </div>
          <div>
            <h2 class="header-title">{{ data.isEditMode ? 'Edit Goal' : 'Add New Goal' }}</h2>
            <p class="header-subtitle">Define a clear, measurable objective.</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-body">
        <form [formGroup]="goalForm" (ngSubmit)="onSubmit()">

          <div class="assign-section">
            <div class="assign-section-header">
              <mat-icon>emoji_events</mat-icon>
              <span>Goal Information</span>
            </div>
            <div class="assign-section-body">

              <div class="assign-field-group">
                <label class="field-label">Goal Title <span class="required">*</span></label>
                <mat-form-field appearance="outline" class="mat-field">
                  <input matInput formControlName="title" placeholder="e.g., Increase department productivity">
                  <mat-error *ngIf="goalForm.get('title')?.hasError('required')">Title is required</mat-error>
                  <mat-error *ngIf="goalForm.get('title')?.hasError('minlength')">Title must be at least 3 characters</mat-error>
                </mat-form-field>
              </div>

              <div class="assign-dates-grid">
                <div class="assign-field-group">
                  <label class="field-label">KRA (Key Result Area) <span class="required">*</span></label>
                  <mat-form-field appearance="outline" class="mat-field">
                    <mat-select formControlName="kraId" (opened)="onKraDropdownOpen()" placeholder="Select KRA">
                      <mat-option *ngIf="isLoadingKRAs" disabled>
                        <mat-spinner diameter="20"></mat-spinner>
                        Loading...
                      </mat-option>
                      <mat-option *ngFor="let kra of kraList" [value]="kra.kraId">
                        {{ kra.title }}
                      </mat-option>
                      <mat-option *ngIf="!isLoadingKRAs && kraList.length === 0" disabled>No KRAs available</mat-option>
                    </mat-select>
                    <mat-error *ngIf="goalForm.get('kraId')?.hasError('required')">KRA is required</mat-error>
                  </mat-form-field>
                </div>

                <div class="assign-field-group">
                  <label class="field-label">Progress Status</label>
                  <mat-form-field appearance="outline" class="mat-field">
                    <mat-select formControlName="progress">
                      <mat-option value="tostart">To Start</mat-option>
                      <mat-option value="inprogress">In Progress</mat-option>
                      <mat-option value="completed">Completed</mat-option>
                      <mat-option value="onhold">On Hold</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>

              <div class="assign-dates-grid">
                <div class="assign-field-group">
                  <label class="field-label">Start Date</label>
                  <mat-form-field appearance="outline" class="mat-field">
                    <input matInput type="date" formControlName="startDate">
                  </mat-form-field>
                </div>
                <div class="assign-field-group">
                  <label class="field-label">End Date</label>
                  <mat-form-field appearance="outline" class="mat-field">
                    <input matInput type="date" formControlName="endDate">
                  </mat-form-field>
                </div>
              </div>

              <div class="assign-field-group">
                <label class="field-label">Description</label>
                <mat-form-field appearance="outline" class="mat-field">
                  <textarea matInput formControlName="description" rows="3" placeholder="Describe the steps and measurable outcomes..."></textarea>
                </mat-form-field>
              </div>

            </div>
          </div>

          <!-- Active Status (Edit Mode Only) -->
          <div class="assign-section" *ngIf="data.isEditMode">
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
                      <p style="margin:0; font-size:12px; color:#64748b;">Enable this Goal</p>
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
        <button mat-flat-button class="btn-submit" (click)="onSubmit()" [disabled]="goalForm.invalid || isSubmitting">
          <mat-icon *ngIf="!isSubmitting">{{ data.isEditMode ? 'save' : 'add_circle' }}</mat-icon>
          <mat-spinner diameter="16" *ngIf="isSubmitting" style="margin-right:8px;"></mat-spinner>
          <span *ngIf="!isSubmitting">{{ data.isEditMode ? 'Update Goal' : 'Save Goal' }}</span>
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
