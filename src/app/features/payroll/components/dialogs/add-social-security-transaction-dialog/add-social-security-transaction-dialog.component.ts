import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs';

import { SettingsService } from '../../../../settings/services/settings.service';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface SocialSecurityTransactionEmployeeOption {
  id: string;
  name: string;
  designation?: string;
}

export interface SocialSecurityTransactionPeriodOption {
  id: string;
  name: string;
}

export interface SocialSecurityTransactionConfigOption {
  id: string;
  configName: string;
  employeeContributionPct: number;
  employerContributionPct: number;
  employeeFixedAmount?: number | null;
  employerFixedAmount?: number | null;
  minSalaryLimit?: number | null;
  maxSalaryCap: number | null;
  ruleId?: string | null;
}

export interface SocialSecurityTransactionRuleOption {
  ruleId: string;
  ruleName: string;
  isActive?: boolean;
  employeeDefaultPct?: number;
  employerDefaultPct?: number;
  employeeFixedAmount?: number | null;
  employerFixedAmount?: number | null;
  minSalaryLimit?: number | null;
  maxSalaryLimit?: number | null;
  contributionBasis?: string;
}

export interface SocialSecurityTransactionDialogPayload {
  employeeId: string;
  periodId: string;
  configId: string | null;
  ruleId: string | null;
  actualSalary: number;
  isEnrolled: boolean;
  requestStatus: string;
}

interface SocialSecurityTransactionDialogData {
  mode?: 'create' | 'edit';
  employees?: SocialSecurityTransactionEmployeeOption[];
  periods?: SocialSecurityTransactionPeriodOption[];
  configs?: SocialSecurityTransactionConfigOption[];
  rules?: SocialSecurityTransactionRuleOption[];
  initialValue?: Partial<SocialSecurityTransactionDialogPayload>;
}


@Component({
  selector: 'app-add-social-security-transaction-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedCommonModule,CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-social-security-transaction-dialog.component.html',
  styleUrl: './add-social-security-transaction-dialog.component.scss'
})
export class AddSocialSecurityTransactionDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddSocialSecurityTransactionDialogComponent, SocialSecurityTransactionDialogPayload | undefined>);
  private readonly settingsService = inject(SettingsService);

  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';
  readonly employees = this.data?.employees ?? [];
  readonly periods = this.data?.periods ?? [];
  readonly rules = this.data?.rules ?? [];

  readonly form = this.fb.group({
    employeeId: ['', Validators.required],
    periodId: ['', Validators.required],
    ruleId: ['', Validators.required],
    actualSalary: [0, [Validators.required, Validators.min(1)]],
    isEnrolled: [true],
    requestStatus: ['pending', Validators.required]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: SocialSecurityTransactionDialogData) {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (code) => this.currencySymbol.set(this.settingsService.getCurrencySymbol(code)),
        error: () => this.currencySymbol.set(this.settingsService.getCurrencySymbol())
      });

    if (this.data?.initialValue) {
      this.form.patchValue({
        employeeId: this.data.initialValue.employeeId ?? '',
        periodId: this.data.initialValue.periodId ?? '',
        ruleId: this.data.initialValue.ruleId ?? '',
        actualSalary: this.data.initialValue.actualSalary ?? 0,
        isEnrolled: this.data.initialValue.isEnrolled ?? true,
        requestStatus: this.data.initialValue.requestStatus ?? 'pending'
      });

      const initialRuleId = String(this.data.initialValue.ruleId ?? '');
      if (initialRuleId && !this.isRuleActive(this.rules.find((rule) => rule.ruleId === initialRuleId))) {
        this.form.patchValue({ ruleId: '' }, { emitEvent: false });
      }
    }

    if (this.mode === 'edit') {
      this.form.get('employeeId')?.disable({ emitEvent: false });
      this.form.get('periodId')?.disable({ emitEvent: false });
    }
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit social security transaction' : 'Add social security transaction';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Save changes' : 'Create transaction';
  }

  get selectedRule(): SocialSecurityTransactionRuleOption | null {
    const ruleId = String(this.form.get('ruleId')?.value ?? '');
    const selectedRule = this.rules.find((rule) => rule.ruleId === ruleId) ?? null;
    return this.isRuleActive(selectedRule) ? selectedRule : null;
  }

  get availableRules(): SocialSecurityTransactionRuleOption[] {
    return this.rules.filter((rule) => this.isRuleActive(rule));
  }

  get salaryCapped(): number {
    const actualSalary = Number(this.form.get('actualSalary')?.value ?? 0);

    const minSalaryLimit = this.selectedRule?.minSalaryLimit ?? null;
    if (minSalaryLimit != null && Number(minSalaryLimit) > 0 && actualSalary < Number(minSalaryLimit)) {
      return 0;
    }

    const maxSalaryCap = this.selectedRule?.maxSalaryLimit ?? null;
    if (maxSalaryCap == null || Number(maxSalaryCap) <= 0) {
      return Math.max(0, actualSalary);
    }

    return Math.max(0, Math.min(actualSalary, Number(maxSalaryCap)));
  }

  get employeeAmount(): number {
    const fixedAmount = this.selectedRule?.employeeFixedAmount ?? null;
    if (fixedAmount != null && Number(fixedAmount) > 0) {
      return Number(fixedAmount);
    }

    const contributionPct = this.selectedRule?.employeeDefaultPct ?? null;
    if (contributionPct == null) {
      return 0;
    }

    return Math.max(0, this.salaryCapped * (Number(contributionPct) / 100));
  }

  get employerAmount(): number {
    const fixedAmount = this.selectedRule?.employerFixedAmount ?? null;
    if (fixedAmount != null && Number(fixedAmount) > 0) {
      return Number(fixedAmount);
    }

    const contributionPct = this.selectedRule?.employerDefaultPct ?? null;
    if (contributionPct == null) {
      return 0;
    }

    return Math.max(0, this.salaryCapped * (Number(contributionPct) / 100));
  }

  get totalAmount(): number {
    return this.employeeAmount + this.employerAmount;
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    this.dialogRef.close({
      employeeId: String(raw.employeeId ?? '').trim(),
      periodId: String(raw.periodId ?? '').trim(),
      configId: null,
      ruleId: raw.ruleId ? String(raw.ruleId).trim() : null,
      actualSalary: Number(raw.actualSalary ?? 0),
      isEnrolled: !!raw.isEnrolled,
      requestStatus: String(raw.requestStatus ?? 'pending').trim().toLowerCase()
    });
  }

  private isRuleActive(rule?: SocialSecurityTransactionRuleOption | null): boolean {
    if (!rule) {
      return false;
    }
    return rule.isActive ?? true;
  }
}
