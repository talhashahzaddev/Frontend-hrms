import { Component, Inject, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="modal-wrapper">

      <!-- Header -->
      <div class="modal-header">
        <div class="header-text">
          <h2 class="modal-title">HR Appraisal Review</h2>
          <p class="modal-subtitle">Provide final HR feedback and rating for this employee performance review</p>
        </div>
        <button type="button" mat-dialog-close class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="hrReviewForm" (ngSubmit)="onSubmit()">
        <mat-dialog-content class="modal-body">

          <!-- Context Grid -->
          <div class="context-grid">

            <div class="field-group">
              <label class="field-label">
                <mat-icon class="lbl-icon">person</mat-icon>
                Employee Name
              </label>
              <select
                class="native-select"
                [value]="hrReviewForm.get('employeeId')?.value"
                (change)="onSelectChange('employeeId', $any($event.target).value)">
                <option value="">-- Select Employee --</option>
                <option *ngFor="let emp of availableEmployees" [value]="emp.employeeId">
                  {{ emp.fullName }}
                </option>
              </select>
              <span class="err" *ngIf="hrReviewForm.get('employeeId')?.touched && hrReviewForm.get('employeeId')?.hasError('required')">Required</span>
            </div>

            <div class="field-group">
              <label class="field-label">
                <mat-icon class="lbl-icon">event_repeat</mat-icon>
                Appraisal Cycle
              </label>
              <select
                class="native-select"
                [value]="hrReviewForm.get('cycleId')?.value"
                (change)="onSelectChange('cycleId', $any($event.target).value)">
                <option value="">-- Select Cycle --</option>
                <option *ngFor="let cycle of data.appraisalCycles" [value]="cycle.cycleId">
                  {{ cycle.cycleName }}
                </option>
              </select>
              <span class="err" *ngIf="hrReviewForm.get('cycleId')?.touched && hrReviewForm.get('cycleId')?.hasError('required')">Required</span>
            </div>

          </div>

          <!-- HR Comment -->
          <div class="field-group">
            <label class="textarea-label">HR Comment</label>
            <textarea
              class="native-textarea"
              formControlName="hrComments"
              rows="2"
              placeholder="Internal notes regarding the employee's behavior and cultural fit...">
            </textarea>
          </div>

          <!-- Final Feedback -->
          <div class="field-group">
            <label class="textarea-label">Final Feedback / Remarks</label>
            <textarea
              class="native-textarea"
              formControlName="feedback"
              rows="2"
              placeholder="Comprehensive summary of performance strengths and areas of recognition...">
            </textarea>
          </div>

          <!-- Rating + Improvement -->
          <div class="bottom-row">

            <div class="field-group">
              <label class="textarea-label">Final Rating</label>
              <div class="rating-input-wrapper">
                <input
                  type="number"
                  formControlName="finalRating"
                  min="0"
                  max="5"
                  step="0.1"
                  placeholder="0.0"
                  class="rating-input" />
                <span class="rating-suffix">/ 5.0</span>
              </div>
              <span class="err" *ngIf="hrReviewForm.get('finalRating')?.touched && hrReviewForm.get('finalRating')?.hasError('required')">Rating is required</span>
              <span class="err" *ngIf="hrReviewForm.get('finalRating')?.touched && hrReviewForm.get('finalRating')?.hasError('min')">Rating must be at least 0</span>
              <span class="err" *ngIf="hrReviewForm.get('finalRating')?.touched && hrReviewForm.get('finalRating')?.hasError('max')">Rating must be at most 5</span>
            </div>

            <div class="field-group">
              <label class="textarea-label">Improvement Areas</label>
              <textarea
                class="native-textarea improvement-textarea"
                formControlName="improvementArea"
                rows="1"
                placeholder="Specify technical or soft skills needed...">
              </textarea>
            </div>

          </div>

        </mat-dialog-content>

        <!-- Footer -->
        <div class="modal-footer">
          <button type="button" mat-dialog-close class="btn-cancel" [disabled]="isSubmitting">
            Cancel
          </button>
          <button type="submit" class="btn-submit" [disabled]="hrReviewForm.invalid || isSubmitting">
            <mat-spinner diameter="16" *ngIf="isSubmitting"></mat-spinner>
            <mat-icon *ngIf="!isSubmitting">verified</mat-icon>
            {{ isSubmitting ? 'Submitting...' : 'Submit HR Review' }}
          </button>
        </div>

      </form>
    </div>
  `,
  styles: [`
    /* ─────────────────────────────────────────
       FORCE DIALOG SIZE — override Material
    ───────────────────────────────────────── */
    ::ng-deep .mat-mdc-dialog-container {
      padding: 0 !important;
      border-radius: 12px !important;
      overflow: hidden !important;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.10) !important;
    }

    ::ng-deep .mat-mdc-dialog-surface {
      padding: 0 !important;
      border-radius: 12px !important;
      overflow: hidden !important;
      width: 480px !important;
      max-width: 480px !important;
      min-width: 0 !important;
    }

    /* Kill Material's default dialog content padding/margin */
    ::ng-deep .mat-mdc-dialog-content {
      padding: 0 !important;
      margin: 0 !important;
      max-height: none !important;
      overflow: visible !important;
    }

    /* ─────────────────────────────────────────
       WRAPPER
    ───────────────────────────────────────── */
    .modal-wrapper {
      font-family: 'Inter', sans-serif;
      background: #fff;
      display: flex;
      flex-direction: column;
      width: 480px;
      max-width: 480px;
      box-sizing: border-box;
      overflow: hidden;
    }

    /* ─────────────────────────────────────────
       HEADER
    ───────────────────────────────────────── */
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 14px 16px 12px;
      border-bottom: 1px solid #e2e8f0;
      background: #fff;
      box-sizing: border-box;
      width: 100%;
      gap: 8px;
    }

    .header-text {
      flex: 1;
      min-width: 0;
    }

    .modal-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .modal-subtitle {
      font-size: 11px;
      color: #64748b;
      margin: 2px 0 0;
      line-height: 1.3;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      flex-shrink: 0;
      transition: background 0.2s;

      &:hover {
        background: #f1f5f9;
        color: #64748b;
      }

      mat-icon {
        font-size: 16px !important;
        width: 16px !important;
        height: 16px !important;
        line-height: 16px !important;
      }
    }

    /* ─────────────────────────────────────────
       BODY
    ───────────────────────────────────────── */
    .modal-body {
      padding: 12px 16px !important;
      background: #fff;
      display: flex !important;
      flex-direction: column !important;
      gap: 8px !important;
      box-sizing: border-box !important;
      width: 100% !important;
      overflow: visible !important;
      max-height: none !important;
    }

    /* ─────────────────────────────────────────
       CONTEXT GRID (employee + cycle)
    ───────────────────────────────────────── */
    .context-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      padding: 10px;
      box-sizing: border-box;
      width: 100%;
    }

    /* ─────────────────────────────────────────
       SHARED FIELD GROUP
    ───────────────────────────────────────── */
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
    }

    .field-label {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #94a3b8;
    }

    .textarea-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #64748b;
    }

    .lbl-icon {
      font-size: 11px !important;
      width: 11px !important;
      height: 11px !important;
      line-height: 11px !important;
    }

    /* ─────────────────────────────────────────
       INPUTS — equal height 32px
    ───────────────────────────────────────── */
    .native-select {
      width: 100%;
      height: 32px;
      padding: 0 8px;
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 12px;
      font-family: 'Inter', sans-serif;
      color: #334155;
      cursor: pointer;
      appearance: auto;
      box-sizing: border-box;
      transition: border-color 0.15s, box-shadow 0.15s;
      display: block;

      &:focus {
        outline: none;
        border-color: #6764f2;
        box-shadow: 0 0 0 2px rgba(103,100,242,0.12);
      }
    }

    .native-textarea {
      width: 100%;
      padding: 7px 9px;
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 12px;
      font-family: 'Inter', sans-serif;
      color: #334155;
      resize: none;
      box-sizing: border-box;
      line-height: 1.4;
      transition: border-color 0.15s, box-shadow 0.15s;
      display: block;
      height: 54px;

      &::placeholder {
        color: #cbd5e1;
        font-size: 11px;
      }

      &:focus {
        outline: none;
        border-color: #6764f2;
        box-shadow: 0 0 0 2px rgba(103,100,242,0.12);
      }
    }

    /* improvement area matches 32px input height */
    .improvement-textarea {
      height: 32px !important;
      padding: 6px 9px !important;
      overflow: hidden;
    }

    .err {
      font-size: 10px;
      font-weight: 500;
      color: #ef4444;
      margin-top: 1px;
    }

    /* ─────────────────────────────────────────
       BOTTOM ROW — rating | improvement
    ───────────────────────────────────────── */
    .bottom-row {
      display: grid;
      grid-template-columns: 130px 1fr;
      gap: 8px;
      align-items: flex-start;
      box-sizing: border-box;
      width: 100%;
    }

    .rating-input-wrapper {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0 10px;
      height: 32px;
      box-sizing: border-box;
      width: 100%;
      transition: all 0.2s;

      &:focus-within {
        border-color: #6764f2;
        box-shadow: 0 0 0 2px rgba(103,100,242,0.12);
        background: #fff;
      }
    }

    .rating-input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: none;
      outline: none;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      padding: 0;
      font-family: 'Inter', sans-serif;

      &::placeholder { color: #94a3b8; }

      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      -moz-appearance: textfield;
    }

    .rating-suffix {
      font-size: 12px;
      font-weight: 500;
      color: #94a3b8;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ─────────────────────────────────────────
       FOOTER
    ───────────────────────────────────────── */
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      box-sizing: border-box;
      width: 100%;
    }

    .btn-cancel {
      height: 32px;
      padding: 0 14px;
      background: transparent;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      color: #475569;
      cursor: pointer;
      transition: background 0.15s;
      white-space: nowrap;
      flex-shrink: 0;
      line-height: 32px;

      &:hover:not([disabled]) { background: #f1f5f9; }
      &[disabled] { opacity: 0.5; cursor: not-allowed; }
    }

    .btn-submit {
      display: flex;
      align-items: center;
      gap: 5px;
      height: 32px;
      padding: 0 16px;
      background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      color: #fff;
      cursor: pointer;
      box-shadow: 0 3px 10px rgba(99,102,241,0.30);
      transition: all 0.15s;
      white-space: nowrap;
      flex-shrink: 0;

      mat-icon {
        font-size: 14px !important;
        width: 14px !important;
        height: 14px !important;
        line-height: 14px !important;
      }

      &:hover:not([disabled]) { box-shadow: 0 5px 16px rgba(99,102,241,0.45); }
      &:active:not([disabled]) { transform: scale(0.97); }
      &[disabled] { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    }

    /* ─────────────────────────────────────────
       RESPONSIVE
    ───────────────────────────────────────── */
    @media (max-width: 520px) {
      ::ng-deep .mat-mdc-dialog-surface {
        width: 94vw !important;
        max-width: 94vw !important;
      }

      .modal-wrapper {
        width: 94vw;
        max-width: 94vw;
      }

      .bottom-row {
        grid-template-columns: 1fr;
      }

      .improvement-textarea {
        height: 54px !important;
      }
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
