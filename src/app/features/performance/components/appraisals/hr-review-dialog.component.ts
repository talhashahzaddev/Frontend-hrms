import { Component, Inject, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import {
  AppraisalCycle
} from '../../../../core/models/performance.models';
import { Employee } from '../../../../core/models/employee.models';
import { PerformanceService } from '../../services/performance.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { NotificationService } from '../../../../core/services/notification.service';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface HrReviewDialogData {
  appraisalCycles: AppraisalCycle[];
  employees?: Employee[];
  preSelectedEmployeeId?: string;
  preSelectedCycleId?: string;
}


@Component({
  selector: 'app-hr-review-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    SharedCommonModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>fact_check</mat-icon>
          </div>
          <div>
            <h2 class="header-title">HR Appraisal Review</h2>
            <p class="header-subtitle">Provide final HR feedback and rating</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="hrReviewForm" (ngSubmit)="onSubmit()">
        <mat-dialog-content class="dialog-body">

          <!-- Context Section -->
          <div class="assign-section">
            <div class="assign-section-header">
              <mat-icon>info</mat-icon>
              <span>Employee Details</span>
            </div>
            <div class="assign-section-body">
              <div class="assign-dates-grid">
                <div class="assign-field-group">
                  <label class="field-label">Employee Name <span class="required">*</span></label>
                  <mat-form-field appearance="outline" class="mat-field">
                    <mat-select formControlName="employeeId" placeholder="Select Employee">
                      <mat-option *ngFor="let emp of availableEmployees" [value]="emp.employeeId">
                        {{ emp.fullName }}
                      </mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
                <div class="assign-field-group">
                  <label class="field-label">Appraisal Cycle <span class="required">*</span></label>
                  <mat-form-field appearance="outline" class="mat-field">
                    <mat-select formControlName="cycleId" placeholder="Select Cycle">
                      <mat-option *ngFor="let cycle of data.appraisalCycles" [value]="cycle.cycleId">
                        {{ cycle.cycleName }}
                      </mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>
            </div>
          </div>

          <!-- Input Section -->
          <div class="assign-section">
            <div class="assign-section-header">
              <mat-icon>edit_note</mat-icon>
              <span>HR Evaluation</span>
            </div>
            <div class="assign-section-body">
              
              <div class="assign-field-group">
                <label class="field-label">HR Comment</label>
                <mat-form-field appearance="outline" class="mat-field">
                  <textarea matInput formControlName="hrComments" rows="2" placeholder="Internal notes regarding the employee's behavior and cultural fit..."></textarea>
                </mat-form-field>
              </div>

              <div class="assign-field-group">
                <label class="field-label">Final Feedback / Remarks</label>
                <mat-form-field appearance="outline" class="mat-field">
                  <textarea matInput formControlName="feedback" rows="2" placeholder="Comprehensive summary of performance strengths and areas of recognition..."></textarea>
                </mat-form-field>
              </div>

              <div class="assign-dates-grid">
                <div class="assign-field-group">
                  <label class="field-label">Final Rating (0 - 5) <span class="required">*</span></label>
                  
                  <div style="display:flex; align-items:center; gap:16px;">
                    <div style="display:flex; align-items:center; gap:8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:8px 12px; width:140px;">
                      <input type="number" formControlName="finalRating" min="0" max="5" step="0.1" placeholder="0.0" style="width:100%; border:none; background:transparent; outline:none; font-size:14px; font-weight:600; color:#334155;">
                      <span style="font-size:14px; font-weight:500; color:#94a3b8; white-space:nowrap;">/ 5.0</span>
                    </div>

                    <div *ngIf="hrReviewForm.get('finalRating')?.value >= 4" style="display:flex; align-items:center; gap:6px; background:#fffbeb; border:1px solid #fde68a; border-radius:16px; padding:6px 12px;">
                      <mat-icon style="font-size:16px; width:16px; height:16px; color:#f59e0b;">star</mat-icon>
                      <span style="font-size:12px; font-weight:700; color:#92400e;">Excellent</span>
                    </div>
                  </div>
                  
                  <div *ngIf="hrReviewForm.get('finalRating')?.touched" style="margin-top:4px;">
                    <span class="error-text" *ngIf="hrReviewForm.get('finalRating')?.hasError('required')">Rating is required</span>
                    <span class="error-text" *ngIf="hrReviewForm.get('finalRating')?.hasError('min')">Rating must be at least 0</span>
                    <span class="error-text" *ngIf="hrReviewForm.get('finalRating')?.hasError('max')">Rating must be at most 5</span>
                  </div>
                </div>

                <div class="assign-field-group">
                  <label class="field-label">Improvement Areas</label>
                  <mat-form-field appearance="outline" class="mat-field">
                    <textarea matInput formControlName="improvementArea" rows="2" placeholder="Specify technical or soft skills needed..."></textarea>
                  </mat-form-field>
                </div>
              </div>

            </div>
          </div>
        </mat-dialog-content>

        <div class="dialog-footer">
          <button mat-stroked-button class="btn-cancel" type="button" mat-dialog-close [disabled]="isSubmitting">Cancel</button>
          <button mat-flat-button class="btn-submit" type="submit" [disabled]="hrReviewForm.invalid || isSubmitting">
            <mat-icon *ngIf="!isSubmitting">verified</mat-icon>
            <mat-spinner diameter="16" *ngIf="isSubmitting" style="margin-right:8px;"></mat-spinner>
            <span *ngIf="!isSubmitting">Submit HR Review</span>
            <span *ngIf="isSubmitting">Submitting...</span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    @use '../../styles/performance-shared';

    .error-text {
      font-size: 11px;
      color: #ef4444;
      display: block;
    }

    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { 
      -webkit-appearance: none; 
      margin: 0; 
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HrReviewDialogComponent implements OnInit, OnDestroy {
  hrReviewForm: FormGroup;
  isSubmitting = false;
  availableEmployees: Employee[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private dialogRef: MatDialogRef<HrReviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HrReviewDialogData,
    private performanceService: PerformanceService,
    private employeeService: EmployeeService,
    private notificationService: NotificationService
  ) {
    this.hrReviewForm = this.fb.group({
      employeeId:  [data.preSelectedEmployeeId || '', Validators.required],
      cycleId:     [data.preSelectedCycleId    || '', Validators.required],
      finalRating: [null, [Validators.required, Validators.min(0), Validators.max(5)]],
      hrComments:  [''],
      feedback:    [''],
      improvementArea: ['']
    });
  }

  ngOnInit(): void {
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSelectChange(controlName: string, value: string): void {
    this.hrReviewForm.get(controlName)?.setValue(value);
    this.hrReviewForm.get(controlName)?.markAsTouched();
    this.cdr.markForCheck();
  }

  private loadEmployees(): void {
    if (this.data.employees && this.data.employees.length > 0) {
      this.availableEmployees = [...this.data.employees];
      this.cdr.markForCheck();
    } else {
      this.employeeService.getEmployees()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: any) => {
            let employees: Employee[] = [];
            if (Array.isArray(res)) {
              employees = res;
            } else if (res.employees && Array.isArray(res.employees)) {
              employees = res.employees;
            } else if (res.data) {
              if (Array.isArray(res.data)) {
                employees = res.data;
              } else if (res.data.employees) {
                employees = res.data.employees;
              }
            }

            if (employees.length > 0) {
              this.availableEmployees = [...employees];
              this.cdr.markForCheck();
            }
          },
          error: (err: any) => {
            console.error('Error loading employees:', err);
            this.notificationService.showError('Failed to load employees');
          }
        });
    }
  }

  onSubmit(): void {
    if (this.hrReviewForm.invalid) {
      this.hrReviewForm.markAllAsTouched();
      this.notificationService.showError('Please fill in all required fields');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.hrReviewForm.value;

    const request = {
      employeeId:      formValue.employeeId,
      cycleId:         formValue.cycleId,
      finalRating:     formValue.finalRating,
      hrComments:      formValue.hrComments || '',
      feedback:        formValue.feedback || '',
      improvementArea: formValue.improvementArea || '',
      status: 'SUBMITTED'
    };

    this.performanceService.submitHrReview(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.notificationService.showSuccess('HR Review submitted successfully');
          this.dialogRef.close({ success: true, data: response.data });
        },
        error: (error: any) => {
          this.isSubmitting = false;
          console.error('Error submitting HR review:', error);
          const errorMsg = error?.error?.message || 'Failed to submit HR review';
          this.notificationService.showError(errorMsg);
        }
      });
  }
}
