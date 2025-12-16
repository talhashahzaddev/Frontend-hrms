import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PayrollService } from '../../services/payroll.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CreatePayrollPeriodRequest } from '../../../../core/models/payroll.models';

export interface CreatePayrollPeriodDialogData {
  mode: 'create' | 'edit';
  period?: any;
}

@Component({
  selector: 'app-create-payroll-period-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>payments</mat-icon>
        {{ data.mode === 'create' ? 'Create New Payroll Period' : 'Edit Payroll Period' }}
      </h2>
      <button mat-icon-button mat-dialog-close class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="periodForm" class="period-form">
        
        <!-- Period Name -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Period Name *</mat-label>
          <input matInput 
                 formControlName="periodName" 
                 placeholder="e.g., March 2024, Q1 2024"
                 maxlength="100">
          <mat-hint>Required field</mat-hint>
          <mat-error *ngIf="periodForm.get('periodName')?.hasError('required')">
            Period name is required
          </mat-error>
          <mat-error *ngIf="periodForm.get('periodName')?.hasError('minlength')">
            Period name must be at least 3 characters
          </mat-error>
        </mat-form-field>

        <!-- Date Range -->
        <div class="date-row">
          <mat-form-field appearance="outline" class="date-field">
            <mat-label>Start Date *</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate">
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
            <mat-hint>Required field</mat-hint>
            <mat-error *ngIf="periodForm.get('startDate')?.hasError('required')">
              Start date is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="date-field">
            <mat-label>End Date *</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate" [min]="getMinEndDate()" [matDatepickerFilter]="endDateFilter">
            <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
            <mat-hint>Required field - Must be after start date</mat-hint>
            <mat-error *ngIf="periodForm.get('endDate')?.hasError('required')">
              End date is required
            </mat-error>
            <mat-error *ngIf="periodForm.get('endDate')?.hasError('dateRange')">
              End date must be after start date
            </mat-error>
          </mat-form-field>
        </div>

        <!-- Pay Date -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Pay Date</mat-label>
          <input matInput [matDatepicker]="payPicker" formControlName="payDate" [min]="getMinPayDate()" [matDatepickerFilter]="payDateFilter">
          <mat-datepicker-toggle matSuffix [for]="payPicker"></mat-datepicker-toggle>
          <mat-datepicker #payPicker></mat-datepicker>
          <mat-hint>Optional - Must be after end date</mat-hint>
          <mat-error *ngIf="periodForm.get('payDate')?.hasError('payDateBeforeEnd')">
            Pay date must be after end date
          </mat-error>
        </mat-form-field>

        <!-- Period Preview -->
        <div class="period-preview" *ngIf="periodForm.valid">
          <h4>Period Preview</h4>
          <div class="preview-details">
            <div class="preview-item">
              <mat-icon>schedule</mat-icon>
              <span>{{ getPeriodDuration() }} days</span>
            </div>
            <div class="preview-item">
              <mat-icon>calendar_month</mat-icon>
              <span>{{ getFormattedDateRange() }}</span>
            </div>
            <div class="preview-item" *ngIf="periodForm.get('payDate')?.value">
              <mat-icon>payments</mat-icon>
              <span>Pay Date: {{ periodForm.get('payDate')?.value | date:'mediumDate' }}</span>
            </div>
          </div>
        </div>

      </form>
    </mat-dialog-content>

    <div class="dialog-actions">
      <button mat-stroked-button (click)="onCancel()" [disabled]="isSubmitting">
        Cancel
      </button>
      <button mat-raised-button 
              color="primary" 
              class="submit-button"
              (click)="onSubmit()" 
              [disabled]="!periodForm.valid || isSubmitting">
        <mat-spinner diameter="20" *ngIf="isSubmitting"></mat-spinner>
        <mat-icon *ngIf="!isSubmitting">{{ data.mode === 'create' ? 'add' : 'save' }}</mat-icon>
        {{ data.mode === 'create' ? 'Create Period' : 'Update Period' }}
      </button>
    </div>
  `,
  styleUrls: ['./create-payroll-period-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreatePayrollPeriodDialogComponent {
  periodForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private notificationService: NotificationService,
    private dialogRef: MatDialogRef<CreatePayrollPeriodDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreatePayrollPeriodDialogData
  ) {
    this.periodForm = this.fb.group({
      periodName: [
        data.period?.periodName || '', 
        [Validators.required, Validators.minLength(3)]
      ],
      startDate: [
        data.period?.startDate ? new Date(data.period.startDate) : '', 
        Validators.required
      ],
      endDate: [
        data.period?.endDate ? new Date(data.period.endDate) : '', 
        Validators.required
      ],
      payDate: [
        data.period?.payDate ? new Date(data.period.payDate) : '',
        [this.payDateValidator.bind(this)]
      ]
    });

    // Add custom validator for date range
    this.periodForm.setValidators(this.dateRangeValidator.bind(this));
    
    // Update validators when dates change
    this.periodForm.get('startDate')?.valueChanges.subscribe(() => {
      this.periodForm.get('endDate')?.updateValueAndValidity();
      this.periodForm.get('payDate')?.updateValueAndValidity();
    });
    
    this.periodForm.get('endDate')?.valueChanges.subscribe(() => {
      this.periodForm.get('payDate')?.updateValueAndValidity();
    });
  }

  private dateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const form = control as FormGroup;
    const startDate = form.get('startDate')?.value;
    const endDate = form.get('endDate')?.value;
    const payDate = form.get('payDate')?.value;

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      form.get('endDate')?.setErrors({ dateRange: true });
      return { dateRange: true };
    }

    if (endDate && payDate && new Date(payDate) <= new Date(endDate)) {
      form.get('payDate')?.setErrors({ payDateBeforeEnd: true });
      return { payDateBeforeEnd: true };
    }

    return null;
  }

  private payDateValidator(control: AbstractControl): ValidationErrors | null {
    const payDate = control.value;
    const endDate = this.periodForm?.get('endDate')?.value;

    if (payDate && endDate && new Date(payDate) <= new Date(endDate)) {
      return { payDateBeforeEnd: true };
    }

    return null;
  }

  getMinEndDate(): Date | null {
    const startDate = this.periodForm?.get('startDate')?.value;
    if (startDate) {
      const minDate = new Date(startDate);
      minDate.setDate(minDate.getDate() + 1); // Add 1 day to ensure end date is after start date
      return minDate;
    }
    return null;
  }

  getMinPayDate(): Date | null {
    const endDate = this.periodForm?.get('endDate')?.value;
    if (endDate) {
      const minDate = new Date(endDate);
      minDate.setDate(minDate.getDate() + 1); // Add 1 day to ensure pay date is after end date
      return minDate;
    }
    return null;
  }

  // Date filter functions for datepicker
  endDateFilter = (date: Date | null): boolean => {
    if (!date) return false;
    const startDate = this.periodForm?.get('startDate')?.value;
    if (startDate) {
      const minDate = new Date(startDate);
      minDate.setDate(minDate.getDate() + 1); // End date must be at least 1 day after start date
      return date >= minDate;
    }
    return true;
  };

  payDateFilter = (date: Date | null): boolean => {
    if (!date) return false;
    const endDate = this.periodForm?.get('endDate')?.value;
    if (endDate) {
      const minDate = new Date(endDate);
      minDate.setDate(minDate.getDate() + 1); // Pay date must be at least 1 day after end date
      return date >= minDate;
    }
    return true;
  };

  onSubmit(): void {
    if (!this.periodForm.valid) return;

    this.isSubmitting = true;

    const formValue = this.periodForm.value;
    const request: CreatePayrollPeriodRequest = {
      periodName: formValue.periodName,
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      payDate: formValue.payDate || undefined
    };

    if (this.data.mode === 'create') {
      this.payrollService.createPayrollPeriod(request)
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.showSuccess('Payroll period created successfully');
              this.dialogRef.close(response.data);
            } else {
              this.notificationService.showError(response.message || 'Failed to create payroll period');
            }
            this.isSubmitting = false;
          },
          error: (error) => {
            console.error('Error creating period:', error);
            this.notificationService.showError('Failed to create payroll period');
            this.isSubmitting = false;
          }
        });
    } else {
      // Edit mode
      this.payrollService.updatePayrollPeriod(this.data.period.periodId, {
        periodName: request.periodName,
        startDate: request.startDate,
        endDate: request.endDate,
        status: this.data.period.status
      })
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.showSuccess('Payroll period updated successfully');
              this.dialogRef.close(response.data);
            } else {
              this.notificationService.showError(response.message || 'Failed to update payroll period');
            }
            this.isSubmitting = false;
          },
          error: (error) => {
            console.error('Error updating period:', error);
            this.notificationService.showError('Failed to update payroll period');
            this.isSubmitting = false;
          }
        });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getPeriodDuration(): number {
    const startDate = this.periodForm.get('startDate')?.value;
    const endDate = this.periodForm.get('endDate')?.value;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    return 0;
  }

  getFormattedDateRange(): string {
    const startDate = this.periodForm.get('startDate')?.value;
    const endDate = this.periodForm.get('endDate')?.value;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }

    return '';
  }
}
