import { Component, Inject, ViewEncapsulation, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { PayrollService } from '../../../services/payroll.service';
import { finalize } from 'rxjs/operators';
import { NotificationService } from '@core/services/notification.service';
import { SettingsService } from '../../../../settings/services/settings.service';
import { take } from 'rxjs';

export interface RuleDialogData {
  // Pass any initial data if needed, e.g., for edit mode
  mode?: 'create' | 'edit';
  policyId?: number;
  rule?: {
    ruleId: string;
    ruleName: string;
    description?: string;
    overtimeType: string;
    fixedAmount: number | null;
    percentage: number | null;
    halfDayMultiplier?: number;
    graceMinutes?: number;
    minScore?: number;
    maxScore?: number;
  };
}

@Component({
  selector: 'app-rule-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './rule-dialog.component.html',
  styleUrls: ['./rule-dialog.component.scss']
})
export class RuleDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly payrollService = inject(PayrollService);
  private readonly settingsService = inject(SettingsService);
  private readonly dialogRef = inject(MatDialogRef<RuleDialogComponent>);
  private readonly injectedData = inject<RuleDialogData | null>(MAT_DIALOG_DATA, { optional: true });
  public readonly data: RuleDialogData = this.injectedData ?? {};
  private readonly notification = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly currencySymbol = signal('$');

  readonly policies = [
    { id: 1, name: 'Overtime Policy' },
    { id: 2, name: 'Attendance Deduction Policy' },
    { id: 3, name: 'Late Arrival Policy' },
    { id: 4, name: 'Leave Deduction Policy' },
    { id: 5, name: 'Performance Bonus Policy' },
    { id: 6, name: 'Bonus' },
    { id: 7, name: 'Employee Loan Policy' },
    { id: 8, name: 'Salary Advance Policy' },
    { id: 9, name: 'Provident Fund Policy' },
    { id: 10, name: 'Income Tax Policy' },
    { id: 11, name: 'Social Security Policy' },
    { id: 12, name: 'Gratuity Policy' }
  ];

  readonly overtimeTypes = ['regular', 'holiday', 'weekend'];

  get isEditMode(): boolean {
    return this.data?.mode === 'edit';
  }

  readonly ruleForm = this.fb.group({
    selectedPolicy: [this.data?.policyId || '', Validators.required],
    // Overtime Policy fields
    ruleName: [''],
    description: [''],
    overtimeType: [''],
    amountType: ['fixed'],
    fixedAmount: [null as number | null],
    percentage: [null as number | null],
    halfDayMultiplier: [0.5, [Validators.required, Validators.min(0)]],
    graceMinutes: [0, [Validators.required, Validators.min(0)]],
    unpaidMultiplier: [1.00, [Validators.required, Validators.min(0)]],
    halfPaidMultiplier: [0.50, [Validators.required, Validators.min(0)]],
    minScore: [0, [Validators.required, Validators.min(0)]],
    maxScore: [5, [Validators.required, Validators.min(0)]],
    // Loan Policy fields
    maxLoanAmount: [null as number | null],
    maxInstallments: [null as number | null],
    interestRate: [null as number | null]
  });

  ngOnInit(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode) => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol(currencyCode));
        },
        error: () => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol());
        }
      });

    // When policy selection changes, update validators dynamically if needed
    this.ruleForm.get('selectedPolicy')?.valueChanges.subscribe(policy => {
      this.updateValidation(policy);
    });

    if (this.selectedPolicy) {
      this.updateValidation(this.selectedPolicy);
    }

    // When amount type changes, update validation logic
    this.ruleForm.get('amountType')?.valueChanges.subscribe(() => {
      this.updateAmountValidation();
    });

    if (this.isEditMode && this.data?.rule) {
      const rule = this.data.rule as any;
      const fixedVal = rule.fixedAmount !== undefined ? rule.fixedAmount : rule.fixedDeduction;
      const percentVal = rule.percentage !== undefined ? rule.percentage : rule.percentageDeduction;

      const isFixedAmount = fixedVal !== null && fixedVal !== undefined;

      this.ruleForm.patchValue({
        selectedPolicy: this.data.policyId || 1,
        ruleName: rule.ruleName || '',
        description: rule.description || '',
        overtimeType: (rule.overtimeType || '').toLowerCase(),
        amountType: isFixedAmount ? 'fixed' : 'percentage',
        fixedAmount: isFixedAmount ? fixedVal : null,
        percentage: isFixedAmount ? null : percentVal,
        halfDayMultiplier: rule.halfDayMultiplier ?? 0.5,
        graceMinutes: rule.graceMinutes ?? 0,
        unpaidMultiplier: rule.unpaidMultiplier ?? 1.00,
        halfPaidMultiplier: rule.halfPaidMultiplier ?? 0.50,
        minScore: rule.minScore ?? 0,
        maxScore: rule.maxScore ?? 5
      });

      if (this.data.policyId === 6) {
        const bonusAmount = rule.bonusAmount;
        const bonusPercent = rule.bonusPercentage;
        const isFixedBonus = bonusAmount !== null && bonusAmount !== undefined;

        this.ruleForm.patchValue({
          amountType: isFixedBonus ? 'fixed' : 'percentage',
          fixedAmount: isFixedBonus ? bonusAmount : null,
          percentage: isFixedBonus ? null : bonusPercent
        });
      }

      if (this.data.policyId === 7) {
        this.ruleForm.patchValue({
          maxLoanAmount: rule.maxLoanAmount ?? null,
          maxInstallments: rule.maxInstallments ?? null,
          interestRate: rule.interestRate ?? null
        });
      }
    }
  }

  get selectedPolicy(): number {
    return Number(this.ruleForm.get('selectedPolicy')?.value) || 0;
  }

  private updateValidation(policyId: number | string | null | undefined) {
    const isOvertime = Number(policyId) === 1;

    const overtimeControls = ['ruleName', 'overtimeType', 'amountType'];

    overtimeControls.forEach(ctrl => {
      const control = this.ruleForm.get(ctrl);
      if (isOvertime) {
        control?.setValidators(Validators.required);
      } else {
        control?.clearValidators();
      }
      control?.updateValueAndValidity();
    });

    this.updateAmountValidation();

    const halfDayControl = this.ruleForm.get('halfDayMultiplier');
    if (Number(policyId) === 2) {
      this.ruleForm.get('ruleName')?.setValidators(Validators.required);
      halfDayControl?.setValidators([Validators.required, Validators.min(0)]);
    } else if (Number(policyId) !== 1) {
      halfDayControl?.clearValidators();
    }
    this.ruleForm.get('ruleName')?.updateValueAndValidity();
    halfDayControl?.updateValueAndValidity();

    const graceControl = this.ruleForm.get('graceMinutes');
    if (Number(policyId) === 3) {
      this.ruleForm.get('ruleName')?.setValidators(Validators.required);
      graceControl?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      graceControl?.clearValidators();
    }
    graceControl?.updateValueAndValidity();

    const unpaidControl = this.ruleForm.get('unpaidMultiplier');
    const halfPaidLeaveControl = this.ruleForm.get('halfPaidMultiplier');
    if (Number(policyId) === 4) {
      this.ruleForm.get('ruleName')?.setValidators(Validators.required);
      unpaidControl?.setValidators([Validators.required, Validators.min(0)]);
      halfPaidLeaveControl?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      unpaidControl?.clearValidators();
      halfPaidLeaveControl?.clearValidators();
    }
    unpaidControl?.updateValueAndValidity();
    halfPaidLeaveControl?.updateValueAndValidity();

    const minScoreControl = this.ruleForm.get('minScore');
    const maxScoreControl = this.ruleForm.get('maxScore');
    if (Number(policyId) === 5) {
      this.ruleForm.get('ruleName')?.setValidators(Validators.required);
      minScoreControl?.setValidators([Validators.required, Validators.min(0)]);
      maxScoreControl?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      minScoreControl?.clearValidators();
      maxScoreControl?.clearValidators();
    }
    minScoreControl?.updateValueAndValidity();
    maxScoreControl?.updateValueAndValidity();

    if (Number(policyId) === 6) {
      this.ruleForm.get('ruleName')?.setValidators(Validators.required);
      this.ruleForm.get('amountType')?.setValidators(Validators.required);
    }

    const loanAmountControl = this.ruleForm.get('maxLoanAmount');
    const loanInstallmentsControl = this.ruleForm.get('maxInstallments');
    const loanInterestControl = this.ruleForm.get('interestRate');

    if (Number(policyId) === 7) {
      this.ruleForm.get('ruleName')?.setValidators(Validators.required);
      loanAmountControl?.setValidators([Validators.required, Validators.min(0)]);
      loanInstallmentsControl?.setValidators([Validators.required, Validators.min(1)]);
      loanInterestControl?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      loanAmountControl?.clearValidators();
      loanInstallmentsControl?.clearValidators();
      loanInterestControl?.clearValidators();
    }
    loanAmountControl?.updateValueAndValidity();
    loanInstallmentsControl?.updateValueAndValidity();
    loanInterestControl?.updateValueAndValidity();

    this.ruleForm.get('ruleName')?.updateValueAndValidity();
    this.ruleForm.get('amountType')?.updateValueAndValidity();
  }

  private updateAmountValidation() {
    const isSpecialPolicy = this.selectedPolicy === 1 || this.selectedPolicy === 2 || this.selectedPolicy === 3 || this.selectedPolicy === 5 || this.selectedPolicy === 6;
    const amountType = this.ruleForm.get('amountType')?.value;

    const fixedControl = this.ruleForm.get('fixedAmount');
    const percentControl = this.ruleForm.get('percentage');

    if (isSpecialPolicy) {
      if (amountType === 'fixed') {
        fixedControl?.setValidators(Validators.required);
        percentControl?.clearValidators();
        percentControl?.setValue(null);
      } else if (amountType === 'percentage') {
        percentControl?.setValidators(Validators.required);
        fixedControl?.clearValidators();
        fixedControl?.setValue(null);
      }
    } else {
      fixedControl?.clearValidators();
      percentControl?.clearValidators();
    }

    fixedControl?.updateValueAndValidity();
    percentControl?.updateValueAndValidity();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.ruleForm.invalid || this.isSubmitting()) {
      this.ruleForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.ruleForm.getRawValue();

    // We only send back the relevant fields based on the selected policy
    let resultPayload: any = {
      policyId: formValue.selectedPolicy
    };

    if (formValue.selectedPolicy === 1) { // 1 is Overtime Policy
      resultPayload = {
        ruleName: formValue.ruleName,
        description: formValue.description,
        overtimeType: formValue.overtimeType,
        fixedAmount: formValue.amountType === 'fixed' ? formValue.fixedAmount : null,
        percentage: formValue.amountType === 'percentage' ? formValue.percentage : null
      };
      const request$ = this.isEditMode && this.data?.rule?.ruleId
        ? this.payrollService.updateOvertimeRule(this.data.rule.ruleId, resultPayload)
        : this.payrollService.createOvertimeRule(resultPayload);

      request$
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: (res) => {
            this.notification.showSuccess(
              this.isEditMode ? 'Overtime rule updated successfully' : 'Overtime rule created successfully'
            );
            this.dialogRef.close({ success: true, data: res, policyId: 1 });
          },
          error: (err: any) => {
            this.notification.showError(
              err?.message || (this.isEditMode ? 'Failed to update overtime rule' : 'Failed to create overtime rule')
            );
          }
        });
    } else if (formValue.selectedPolicy === 2) { // 2 is Attendance Deduction Policy
      const payload = {
        ruleName: formValue.ruleName,
        description: formValue.description,
        fixedDeduction: formValue.amountType === 'fixed' ? formValue.fixedAmount : null,
        percentageDeduction: formValue.amountType === 'percentage' ? formValue.percentage : null,
        halfDayMultiplier: formValue.halfDayMultiplier,
        isActive: this.isEditMode ? (this.data?.rule as any)?.isActive : true
      };

      const request$ = this.isEditMode && (this.data?.rule as any)?.ruleId
        ? this.payrollService.updateAttendanceDeductionRule((this.data.rule as any).ruleId, payload)
        : this.payrollService.createAttendanceDeductionRule(payload);

      request$
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: (res) => {
            this.notification.showSuccess(
              this.isEditMode ? 'Attendance deduction rule updated successfully' : 'Attendance deduction rule created successfully'
            );
            this.dialogRef.close({ success: true, data: res, policyId: 2 });
          },
          error: (err: any) => {
            console.error(err);
            this.notification.showError(
              err?.message || (this.isEditMode ? 'Failed to update rule' : 'Failed to create rule')
            );
          }
        });
    } else if (formValue.selectedPolicy === 3) { // 3 is Late Arrival Policy
      const payload = {
        ruleName: formValue.ruleName,
        description: formValue.description,
        fixedDeduction: formValue.amountType === 'fixed' ? formValue.fixedAmount : null,
        percentageDeduction: formValue.amountType === 'percentage' ? formValue.percentage : null,
        graceMinutes: formValue.graceMinutes,
        isActive: this.isEditMode ? (this.data?.rule as any)?.isActive : true
      };

      const request$ = this.isEditMode && (this.data?.rule as any)?.ruleId
        ? this.payrollService.updateLateArrivalRule((this.data.rule as any).ruleId, payload)
        : this.payrollService.createLateArrivalRule(payload);

      request$
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: (res) => {
            this.notification.showSuccess(
              this.isEditMode ? 'Late arrival rule updated successfully' : 'Late arrival rule created successfully'
            );
            this.dialogRef.close({ success: true, data: res, policyId: 3 });
          },
          error: (err: any) => {
            console.error(err);
            this.notification.showError(
              err?.message || (this.isEditMode ? 'Failed to update rule' : 'Failed to create rule')
            );
          }
        });
    } else if (formValue.selectedPolicy === 4) { // 4 is Leave Deduction Policy
      const payload = {
        ruleName: formValue.ruleName,
        description: formValue.description,
        unpaidMultiplier: formValue.unpaidMultiplier,
        halfPaidMultiplier: formValue.halfPaidMultiplier,
        isActive: this.isEditMode ? (this.data?.rule as any)?.isActive : true
      };

      const request$ = this.isEditMode && (this.data?.rule as any)?.ruleId
        ? this.payrollService.updateLeaveRule((this.data.rule as any).ruleId, payload)
        : this.payrollService.createLeaveRule(payload);

      request$
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: (res) => {
            this.notification.showSuccess(
              this.isEditMode ? 'Leave deduction rule updated successfully' : 'Leave deduction rule created successfully'
            );
            this.dialogRef.close({ success: true, data: res, policyId: 4 });
          },
          error: (err: any) => {
            console.error(err);
            this.notification.showError(
              err?.message || (this.isEditMode ? 'Failed to update rule' : 'Failed to create rule')
            );
          }
        });
    } else if (formValue.selectedPolicy === 5) { // 5 is Performance Bonus Policy
      const payload = {
        ruleName: formValue.ruleName,
        description: formValue.description,
        minScore: formValue.minScore,
        maxScore: formValue.maxScore,
        fixedAmount: formValue.amountType === 'fixed' ? formValue.fixedAmount : null,
        percentage: formValue.amountType === 'percentage' ? formValue.percentage : null,
        isActive: this.isEditMode ? (this.data?.rule as any)?.isActive : true
      };

      const request$ = this.isEditMode && (this.data?.rule as any)?.ruleId
        ? this.payrollService.updatePerformanceRule((this.data.rule as any).ruleId, payload)
        : this.payrollService.createPerformanceRule(payload);

      request$
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: (res) => {
            this.notification.showSuccess(
              this.isEditMode ? 'Performance bonus rule updated successfully' : 'Performance bonus rule created successfully'
            );
            this.dialogRef.close({ success: true, data: res, policyId: 5 });
          },
          error: (err: any) => {
            console.error(err);
            this.notification.showError(
              err?.message || (this.isEditMode ? 'Failed to update rule' : 'Failed to create rule')
            );
          }
        });
    } else if (formValue.selectedPolicy === 6) { // 6 is Bonus
      const payload = {
        ruleName: formValue.ruleName,
        description: formValue.description,
        bonusType: formValue.amountType,
        bonusAmount: formValue.amountType === 'fixed' ? formValue.fixedAmount : null,
        bonusPercentage: formValue.amountType === 'percentage' ? formValue.percentage : null,
        isActive: this.isEditMode ? (this.data?.rule as any)?.isActive : true
      };

      const request$ = this.isEditMode && (this.data?.rule as any)?.ruleId
        ? this.payrollService.updateBonusRule((this.data.rule as any).ruleId, payload)
        : this.payrollService.createBonusRule(payload);

      request$
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: (res) => {
            this.notification.showSuccess(
              this.isEditMode ? 'Bonus rule updated successfully' : 'Bonus rule created successfully'
            );
            this.dialogRef.close({ success: true, data: res, policyId: 6 });
          },
          error: (err: any) => {
            console.error(err);
            this.notification.showError(
              err?.message || (this.isEditMode ? 'Failed to update rule' : 'Failed to create rule')
            );
          }
        });
    } else if (formValue.selectedPolicy === 7) { // 7 is Employee Loan Policy
      const payload = {
        ruleName: formValue.ruleName,
        description: formValue.description,
        maxLoanAmount: formValue.maxLoanAmount,
        maxInstallments: formValue.maxInstallments,
        interestRate: formValue.interestRate,
        isActive: this.isEditMode ? (this.data?.rule as any)?.isActive : true
      };

      const request$ = this.isEditMode && (this.data?.rule as any)?.ruleId
        ? this.payrollService.updateLoanRule((this.data.rule as any).ruleId, payload)
        : this.payrollService.createLoanRule(payload);

      request$
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: (res) => {
            this.notification.showSuccess(
              this.isEditMode ? 'Loan rule updated successfully' : 'Loan rule created successfully'
            );
            this.dialogRef.close({ success: true, data: res, policyId: 7 });
          },
          error: (err: any) => {
            console.error(err);
            this.notification.showError(
              err?.message || (this.isEditMode ? 'Failed to update loan rule' : 'Failed to create loan rule')
            );
          }
        });
    } else {
      // Simulate API call for now or pass back to parent (Not Implemented)
      setTimeout(() => {
        this.isSubmitting.set(false);
        this.dialogRef.close(resultPayload);
      }, 500);
    }
  }
}
