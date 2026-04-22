import { Component, Inject, ViewEncapsulation, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
    regimeId?: string;
    ruleName: string;
    description?: string;
    country?: string;
    regimeName?: string;
    startDate?: string;
    endDate?: string;
    overtimeType: string;
    fixedAmount: number | null;
    percentage: number | null;
    halfDayMultiplier?: number;
    graceMinutes?: number;
    minScore?: number;
    maxScore?: number;
    basis?: string;
    employeePercentage?: number;
    employerPercentage?: number;
    withdrawalConfig?: string | null;
    allowPartialWithdraw?: boolean;
    vestingMonths?: number;
    maxLoanAmount?: number;
    maxAdvanceAmount?: number;
    maxPercentage?: number;
    maxInstallments?: number;
    interestRate?: number;
    isActive?: boolean;
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
    MatCheckboxModule,
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
    { id: 10, name: 'Tax regime Policy' },
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
    repaymentType: ['installment'],
    interestRate: [0],
    // Provident Fund fields
    basis: ['basic'],
    employeePercentage: [null as number | null],
    employerPercentage: [null as number | null],
    allowPartialWithdraw: [false],
    temporaryWithdrawals: this.fb.array([]),
    permanentWithdrawals: this.fb.array([]),
    vestingMonths: [0],
    // Salary Advance Policy fields
    maxPercentage: [null as number | null],
    // Tax Regime fields
    taxCountry: [''],
    taxRegimeName: [''],
    taxStartDate: [''],
    taxEndDate: [''],
    // Gratuity Policy fields
    yearsRequired: [null as number | null],
    calculationType: ['peryear'],
    calculationValue: [null as number | null]
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
      if (Number(policy) === 9 && !this.isEditMode && this.temporaryWithdrawals.length === 0 && this.permanentWithdrawals.length === 0) {
        this.setWithdrawalConfig();
      }
    });

    if (this.selectedPolicy) {
      this.updateValidation(this.selectedPolicy);
    }

    // When amount type changes, update validation logic
    this.ruleForm.get('amountType')?.valueChanges.subscribe(() => {
      this.updateAmountValidation();
    });

    this.ruleForm.get('repaymentType')?.valueChanges.subscribe(() => {
      this.updateValidation(this.selectedPolicy);
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

      if (this.data.policyId === 8) {
        this.ruleForm.patchValue({
          maxPercentage: rule.maxPercentage ?? null
        });
      }

      if (this.data.policyId === 9) {
        const parsedWithdrawalConfig = this.parseWithdrawalConfig(rule.withdrawalConfig);
        this.setWithdrawalConfig(parsedWithdrawalConfig);
        this.ruleForm.patchValue({
          basis: (rule.basis || rule.contributionBasis || 'basic').toLowerCase(),
          employeePercentage: rule.employeePercentage ?? rule.defaultEmployeePct ?? null,
          employerPercentage: rule.employerPercentage ?? rule.defaultEmployerPct ?? null,
          allowPartialWithdraw: rule.allowPartialWithdraw ?? !!parsedWithdrawalConfig?.temporary?.length,
          vestingMonths: rule.vestingMonths ?? 0
        });
      }

      if (this.data.policyId === 12) {
        this.ruleForm.patchValue({
          yearsRequired: rule.yearsRequired ?? rule.yearsrequired ?? null,
          calculationType: (rule.calculationType || rule.calculationtype || 'peryear').toLowerCase(),
          calculationValue: rule.calculationValue ?? rule.calculationvalue ?? null
        });
      }

      if (this.data.policyId === 10) {
        this.ruleForm.patchValue({
          taxCountry: rule.country ?? '',
          taxRegimeName: rule.regimeName ?? '',
          taxStartDate: this.toDateInputValue(rule.startDate),
          taxEndDate: this.toDateInputValue(rule.endDate)
        });
      }
    }

    if (!this.isEditMode && this.selectedPolicy === 9) {
      this.setWithdrawalConfig();
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
    const repaymentTypeControl = this.ruleForm.get('repaymentType');
    const maxPercentageControl = this.ruleForm.get('maxPercentage');

    if (Number(policyId) === 7) {
      this.ruleForm.get('ruleName')?.setValidators(Validators.required);
      loanAmountControl?.setValidators([Validators.required, Validators.min(0)]);
      repaymentTypeControl?.setValidators([Validators.required]);

      if (repaymentTypeControl?.value === 'installment') {
        loanInstallmentsControl?.setValidators([Validators.required, Validators.min(1)]);
      } else {
        loanInstallmentsControl?.clearValidators();
      }
    } else {
      loanAmountControl?.clearValidators();
      loanInstallmentsControl?.clearValidators();
      repaymentTypeControl?.clearValidators();
    }
    loanAmountControl?.updateValueAndValidity();
    loanInstallmentsControl?.updateValueAndValidity();
    repaymentTypeControl?.updateValueAndValidity();

    const basisControl = this.ruleForm.get('basis');
    const employeePercentageControl = this.ruleForm.get('employeePercentage');
    const employerPercentageControl = this.ruleForm.get('employerPercentage');
    const allowPartialWithdrawControl = this.ruleForm.get('allowPartialWithdraw');
    const vestingMonthsControl = this.ruleForm.get('vestingMonths');

    if (Number(policyId) === 9) {
      this.ruleForm.get('ruleName')?.setValidators(Validators.required);
      basisControl?.setValidators([Validators.required]);
      employeePercentageControl?.setValidators([Validators.required, Validators.min(0)]);
      employerPercentageControl?.setValidators([Validators.required, Validators.min(0)]);
      allowPartialWithdrawControl?.clearValidators();
      vestingMonthsControl?.setValidators([Validators.required, Validators.min(0)]);
      if (this.temporaryWithdrawals.length === 0 && this.permanentWithdrawals.length === 0) {
        this.setWithdrawalConfig();
      }
    } else {
      basisControl?.clearValidators();
      employeePercentageControl?.clearValidators();
      employerPercentageControl?.clearValidators();
      allowPartialWithdrawControl?.clearValidators();
      vestingMonthsControl?.clearValidators();
    }

    basisControl?.updateValueAndValidity();
    employeePercentageControl?.updateValueAndValidity();
    employerPercentageControl?.updateValueAndValidity();
    allowPartialWithdrawControl?.updateValueAndValidity();
    vestingMonthsControl?.updateValueAndValidity();
    if (Number(policyId) === 8) {
      this.ruleForm.get('ruleName')?.setValidators(Validators.required);
      maxPercentageControl?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
    } else {
      maxPercentageControl?.clearValidators();
    }
    maxPercentageControl?.updateValueAndValidity();

    const taxCountryControl = this.ruleForm.get('taxCountry');
    const taxRegimeNameControl = this.ruleForm.get('taxRegimeName');
    const taxStartDateControl = this.ruleForm.get('taxStartDate');
    const taxEndDateControl = this.ruleForm.get('taxEndDate');

    if (Number(policyId) === 10) {
      taxCountryControl?.setValidators([Validators.required]);
      taxRegimeNameControl?.setValidators([Validators.required]);
      taxStartDateControl?.setValidators([Validators.required]);
      taxEndDateControl?.setValidators([Validators.required]);
    } else {
      taxCountryControl?.clearValidators();
      taxRegimeNameControl?.clearValidators();
      taxStartDateControl?.clearValidators();
      taxEndDateControl?.clearValidators();
    }
    taxCountryControl?.updateValueAndValidity();
    taxRegimeNameControl?.updateValueAndValidity();
    taxStartDateControl?.updateValueAndValidity();
    taxEndDateControl?.updateValueAndValidity();

    const yearsRequiredControl = this.ruleForm.get('yearsRequired');
    const calculationTypeControl = this.ruleForm.get('calculationType');
    const calculationValueControl = this.ruleForm.get('calculationValue');

    if (Number(policyId) === 12) {
      this.ruleForm.get('ruleName')?.setValidators(Validators.required);
      yearsRequiredControl?.setValidators([Validators.required, Validators.min(0)]);
      calculationTypeControl?.setValidators([Validators.required]);
      calculationValueControl?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      yearsRequiredControl?.clearValidators();
      calculationTypeControl?.clearValidators();
      calculationValueControl?.clearValidators();
    }
    yearsRequiredControl?.updateValueAndValidity();
    calculationTypeControl?.updateValueAndValidity();
    calculationValueControl?.updateValueAndValidity();

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

  get temporaryWithdrawals(): FormArray {
    return this.ruleForm.get('temporaryWithdrawals') as FormArray;
  }

  get permanentWithdrawals(): FormArray {
    return this.ruleForm.get('permanentWithdrawals') as FormArray;
  }

  addTemporaryWithdrawal(): void {
    this.temporaryWithdrawals.push(this.createWithdrawalGroup());
  }

  removeTemporaryWithdrawal(index: number): void {
    if (this.temporaryWithdrawals.length > 1) {
      this.temporaryWithdrawals.removeAt(index);
    }
  }

  addPermanentWithdrawal(): void {
    this.permanentWithdrawals.push(this.createWithdrawalGroup());
  }

  removePermanentWithdrawal(index: number): void {
    if (this.permanentWithdrawals.length > 1) {
      this.permanentWithdrawals.removeAt(index);
    }
  }

  private createWithdrawalGroup(entry?: { reason?: string; min_pct?: number; max_pct?: number }): FormGroup {
    return this.fb.group({
      reason: [entry?.reason ?? '', [Validators.required, Validators.maxLength(100)]],
      min_pct: [entry?.min_pct ?? 0, [Validators.required, Validators.min(0), Validators.max(100)]],
      max_pct: [entry?.max_pct ?? 100, [Validators.required, Validators.min(0), Validators.max(100)]]
    });
  }

  private defaultWithdrawalConfig(): { temporary: any[]; permanent: any[] } {
    return {
      temporary: [
        { reason: 'Medical', min_pct: 0, max_pct: 50 },
        { reason: 'Education', min_pct: 0, max_pct: 30 },
        { reason: 'Marriage', min_pct: 0, max_pct: 25 }
      ],
      permanent: [
        { reason: 'Resignation', min_pct: 100, max_pct: 100 },
        { reason: 'Termination', min_pct: 80, max_pct: 100 }
      ]
    };
  }

  private setWithdrawalConfig(config?: { temporary?: any[]; permanent?: any[] } | null): void {
    const source = config ?? this.defaultWithdrawalConfig();
    const temporary = Array.isArray(source.temporary) && source.temporary.length > 0
      ? source.temporary
      : this.defaultWithdrawalConfig().temporary;
    const permanent = Array.isArray(source.permanent) && source.permanent.length > 0
      ? source.permanent
      : this.defaultWithdrawalConfig().permanent;

    this.temporaryWithdrawals.clear();
    this.permanentWithdrawals.clear();

    temporary.forEach((entry) => this.temporaryWithdrawals.push(this.createWithdrawalGroup(entry)));
    permanent.forEach((entry) => this.permanentWithdrawals.push(this.createWithdrawalGroup(entry)));
  }

  private parseWithdrawalConfig(raw: unknown): { temporary?: any[]; permanent?: any[] } | null {
    if (!raw) {
      return null;
    }

    if (typeof raw === 'object') {
      return raw as { temporary?: any[]; permanent?: any[] };
    }

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed !== null
          ? (parsed as { temporary?: any[]; permanent?: any[] })
          : null;
      } catch {
        return null;
      }
    }

    return null;
  }

  private toDateInputValue(value: unknown): string {
    if (!value) {
      return '';
    }

    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toISOString().slice(0, 10);
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
        maxInstallments: formValue.repaymentType === 'full' ? 1 : formValue.maxInstallments,
        interestRate: 0,
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
    } else if (formValue.selectedPolicy === 9) { // 9 is Provident Fund Policy
      const allowPartialWithdraw = !!formValue.allowPartialWithdraw;
      const temporary = allowPartialWithdraw
        ? this.temporaryWithdrawals.controls.map((control) => ({
          reason: String(control.get('reason')?.value ?? '').trim(),
          min_pct: Number(control.get('min_pct')?.value ?? 0),
          max_pct: Number(control.get('max_pct')?.value ?? 0)
        }))
        : [];
      const permanent = allowPartialWithdraw
        ? this.permanentWithdrawals.controls.map((control) => ({
          reason: String(control.get('reason')?.value ?? '').trim(),
          min_pct: Number(control.get('min_pct')?.value ?? 0),
          max_pct: Number(control.get('max_pct')?.value ?? 0)
        }))
        : [];

      if (allowPartialWithdraw && (temporary.some((entry) => !entry.reason) || permanent.some((entry) => !entry.reason))) {
        this.ruleForm.markAllAsTouched();
        this.notification.showError('Withdrawal reason is required for all rows');
        this.isSubmitting.set(false);
        return;
      }

      const payload = {
        ruleName: formValue.ruleName,
        description: formValue.description,
        defaultEmployeePct: formValue.employeePercentage,
        defaultEmployerPct: formValue.employerPercentage,
        contributionBasis: formValue.basis,
        withdrawalConfig: allowPartialWithdraw
          ? JSON.stringify({
            temporary,
            permanent
          })
          : null,
        vestingMonths: formValue.vestingMonths,
        allowPartialWithdraw,
        isActive: this.isEditMode ? (this.data?.rule as any)?.isActive : true
      };

      const request$ = this.isEditMode && (this.data?.rule as any)?.ruleId
        ? this.payrollService.updateProvidentFundRule((this.data.rule as any).ruleId, payload)
        : this.payrollService.createProvidentFundRule(payload);

      request$
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: (res) => {
            this.notification.showSuccess(
              this.isEditMode ? 'Provident fund rule updated successfully' : 'Provident fund rule created successfully'
            );
            this.dialogRef.close({ success: true, data: res, policyId: 9 });
          },
          error: (err: any) => {
            console.error(err);
            this.notification.showError(
              err?.message || (this.isEditMode ? 'Failed to update provident fund rule' : 'Failed to create provident fund rule')
            );
          }
        });
    } else if (formValue.selectedPolicy === 8) { // 8 is Salary Advance Policy
      const payload = {
        ruleName: formValue.ruleName,
        description: formValue.description,
        maxPercentage: formValue.maxPercentage,
        isActive: this.isEditMode ? (this.data?.rule as any)?.isActive : true
      };

      const editRuleId = String((this.data?.rule as any)?.ruleId ?? (this.data?.rule as any)?.id ?? '');
      const request$ = this.isEditMode && editRuleId
        ? this.payrollService.updateSalaryAdvanceRule(editRuleId, payload)
        : this.payrollService.createSalaryAdvanceRule(payload);

      request$
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: (res) => {
            this.notification.showSuccess(
              this.isEditMode
                ? 'Salary advance rule updated successfully'
                : 'Salary advance rule created successfully'
            );
            this.dialogRef.close({ success: true, data: res, policyId: 8 });
          },
          error: (err: any) => {
            console.error(err);
            this.notification.showError(
              err?.message || (this.isEditMode ? 'Failed to update salary advance rule' : 'Failed to create salary advance rule')
            );
          }
        });
    } else if (formValue.selectedPolicy === 10) { // 10 is Tax Regime Policy
      const payload = {
        country: String(formValue.taxCountry ?? '').trim(),
        regimeName: String(formValue.taxRegimeName ?? '').trim(),
        startDate: String(formValue.taxStartDate ?? ''),
        endDate: String(formValue.taxEndDate ?? ''),
        isActive: this.isEditMode ? ((this.data?.rule as any)?.isActive ?? true) : true
      };

      const editRegimeId = String((this.data?.rule as any)?.regimeId ?? (this.data?.rule as any)?.ruleId ?? '');
      const request$ = this.isEditMode && editRegimeId
        ? this.payrollService.updateTaxRegime(editRegimeId, payload)
        : this.payrollService.createTaxRegime(payload);

      request$
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: (res) => {
            this.notification.showSuccess(
              this.isEditMode ? 'Tax regime updated successfully' : 'Tax regime created successfully'
            );
            this.dialogRef.close({ success: true, data: res, policyId: 10 });
          },
          error: (err: any) => {
            console.error(err);
            this.notification.showError(
              err?.message || (this.isEditMode ? 'Failed to update tax regime' : 'Failed to create tax regime')
            );
          }
        });
    } else if (formValue.selectedPolicy === 12) { // 12 is Gratuity Policy
      const payload = {
        configRuleName: formValue.ruleName,
        description: formValue.description,
        yearsRequired: formValue.yearsRequired,
        calculationType: formValue.calculationType,
        calculationValue: formValue.calculationValue,
        isActive: this.isEditMode ? (this.data?.rule as any)?.isActive : true
      };

      const editRuleId = String((this.data?.rule as any)?.id ?? (this.data?.rule as any)?.ruleId ?? '');
      const request$ = this.isEditMode && editRuleId
        ? this.payrollService.updateGratuityConfig(editRuleId, payload)
        : this.payrollService.createGratuityConfig(payload);

      request$
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: (res) => {
            this.notification.showSuccess(
              this.isEditMode ? 'Gratuity rule updated successfully' : 'Gratuity rule created successfully'
            );
            this.dialogRef.close({ success: true, data: res, policyId: 12 });
          },
          error: (err: any) => {
            console.error(err);
            this.notification.showError(
              err?.message || (this.isEditMode ? 'Failed to update gratuity rule' : 'Failed to create gratuity rule')
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
