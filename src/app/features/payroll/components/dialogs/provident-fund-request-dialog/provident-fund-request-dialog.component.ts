import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type ProvidentFundRequestDialogMode = 'enrollment' | 'percentage-update' | 'withdrawal';
export type ProvidentFundWithdrawalType = 'temporary' | 'permanent';
export interface ProvidentFundWithdrawalRule {
  reason: string;
  minPct: number;
  maxPct: number;
}

export interface ProvidentFundWithdrawalConfig {
  temporary: ProvidentFundWithdrawalRule[];
  permanent: ProvidentFundWithdrawalRule[];
}

export interface ProvidentFundRuleOption {
  ruleId: string;
  ruleName: string;
  defaultEmployeePct: number;
  defaultEmployerPct?: number;
}

export interface ProvidentFundRequestDialogPayload {
  mode: ProvidentFundRequestDialogMode;
  ruleId?: string;
  employeePct?: number;
  effectiveFrom?: string;
  amount?: number;
  withdrawalType?: ProvidentFundWithdrawalType;
  reason?: string;
  remarks?: string;
}

interface ProvidentFundRequestDialogData {
  currencySymbol?: string;
  mode?: ProvidentFundRequestDialogMode;
  rules?: ProvidentFundRuleOption[];
  withdrawalConfig?: ProvidentFundWithdrawalConfig | null;
  withdrawalBaseAmount?: number;
  basicSalary?: number;
  currentRuleId?: string;
  title?: string;
  submitText?: string;
  initialValue?: Partial<ProvidentFundRequestDialogPayload>;
}

@Component({
  selector: 'app-provident-fund-request-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './provident-fund-request-dialog.component.html',
  styleUrl: './provident-fund-request-dialog.component.scss'
})
export class ProvidentFundRequestDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ProvidentFundRequestDialogComponent, ProvidentFundRequestDialogPayload | undefined>);

  readonly currencySymbol = this.data?.currencySymbol ?? 'PKR';
  readonly mode: ProvidentFundRequestDialogMode = this.data?.mode ?? 'enrollment';
  readonly title = this.data?.title ?? this.resolveDefaultTitle();
  readonly submitText = this.data?.submitText ?? this.resolveDefaultSubmitText();
  readonly rules: ProvidentFundRuleOption[] = this.data?.rules ?? [];
  readonly withdrawalConfig: ProvidentFundWithdrawalConfig | null = this.data?.withdrawalConfig ?? null;
  readonly withdrawalBaseAmount = this.toNumber(this.data?.withdrawalBaseAmount ?? 0);
  readonly basicSalary = this.toNumber(this.data?.basicSalary ?? 0);
  readonly currentRuleId = String(this.data?.currentRuleId ?? this.data?.initialValue?.ruleId ?? '').trim();

  readonly form = this.fb.group({
    ruleId: [null as string | null],
    employeePct: [null as number | null],
    effectiveFrom: [this.getTodayDate()],
    amount: [null as number | null],
    withdrawalType: ['temporary' as ProvidentFundWithdrawalType],
    reason: [''],
    remarks: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: ProvidentFundRequestDialogData) {
    this.applyModeValidators();

    if (this.data?.initialValue) {
      this.form.patchValue({
        ruleId: this.data.initialValue.ruleId ?? null,
        employeePct: this.mode === 'enrollment'
          ? this.form.get('employeePct')?.value ?? null
          : this.data.initialValue.employeePct ?? this.form.get('employeePct')?.value ?? null,
        effectiveFrom: this.data.initialValue.effectiveFrom ?? this.getTodayDate(),
        amount: this.data.initialValue.amount ?? null,
        reason: this.data.initialValue.reason ?? '',
        remarks: this.data.initialValue.remarks ?? ''
      });
    }

    if (this.mode === 'enrollment' || this.mode === 'percentage-update') {
      const selectedRuleId = String(this.form.get('ruleId')?.value ?? '').trim();
      if (!selectedRuleId) {
        const fallbackRule = this.firstSelectableRule;
        if (fallbackRule) {
          this.form.patchValue({ ruleId: fallbackRule.ruleId }, { emitEvent: false });
        }
      }
      this.syncSelectedRuleValues(String(this.form.get('ruleId')?.value ?? '').trim() || null);
    }

    if (this.mode === 'percentage-update') {
      const selectedRuleId = String(this.form.get('ruleId')?.value ?? '').trim();
      if (selectedRuleId && selectedRuleId === this.currentRuleId) {
        this.form.patchValue({ ruleId: null, employeePct: null }, { emitEvent: false });
      }
    }

    this.form.get('ruleId')?.valueChanges.subscribe((ruleId) => {
      if (this.mode !== 'enrollment' && this.mode !== 'percentage-update') {
        return;
      }
      const normalizedRuleId = String(ruleId ?? '').trim() || null;
      if (this.mode === 'percentage-update' && normalizedRuleId && normalizedRuleId === this.currentRuleId) {
        this.form.patchValue({ ruleId: null, employeePct: null }, { emitEvent: false });
        return;
      }
      this.syncSelectedRuleValues(normalizedRuleId);
    });
  }

  get selectableRules(): ProvidentFundRuleOption[] {
    if (this.mode !== 'percentage-update' || !this.currentRuleId) {
      return this.rules;
    }
    return this.rules.filter((rule) => rule.ruleId !== this.currentRuleId);
  }

  get firstSelectableRule(): ProvidentFundRuleOption | null {
    return this.selectableRules[0] ?? null;
  }

  get selectedRule(): ProvidentFundRuleOption | null {
    if (this.mode !== 'enrollment' && this.mode !== 'percentage-update') {
      return null;
    }
    const ruleId = String(this.form.get('ruleId')?.value ?? '').trim();
    if (!ruleId) {
      return null;
    }
    return this.rules.find((rule) => rule.ruleId === ruleId) ?? null;
  }

  get selectedEmployeePct(): number {
    if (this.mode === 'enrollment') {
      return this.toNumber(this.selectedRule?.defaultEmployeePct ?? 0);
    }
    return this.toNumber(this.form.get('employeePct')?.value ?? 0);
  }

  get selectedEmployerPct(): number {
    return this.toNumber(this.selectedRule?.defaultEmployerPct ?? 0);
  }

  get employeeContributionAmount(): number {
    return (this.basicSalary * this.selectedEmployeePct) / 100;
  }

  get employerContributionAmount(): number {
    return (this.basicSalary * this.selectedEmployerPct) / 100;
  }

  get totalContributionAmount(): number {
    return this.employeeContributionAmount + this.employerContributionAmount;
  }

  get selectedWithdrawalType(): ProvidentFundWithdrawalType {
    const type = String(this.form.get('withdrawalType')?.value ?? 'temporary').trim().toLowerCase();
    return type === 'permanent' ? 'permanent' : 'temporary';
  }

  get selectedWithdrawalRules(): ProvidentFundWithdrawalRule[] {
    if (!this.withdrawalConfig) {
      return [];
    }
    return this.selectedWithdrawalType === 'permanent'
      ? (this.withdrawalConfig.permanent ?? [])
      : (this.withdrawalConfig.temporary ?? []);
  }

  get minWithdrawalBaseAmount(): number {
    return Math.max(0, this.withdrawalBaseAmount);
  }

  getMinAmountByRule(rule: ProvidentFundWithdrawalRule): number {
    return (this.minWithdrawalBaseAmount * this.toNumber(rule.minPct)) / 100;
  }

  getMaxAmountByRule(rule: ProvidentFundWithdrawalRule): number {
    return (this.minWithdrawalBaseAmount * this.toNumber(rule.maxPct)) / 100;
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
    const payload: ProvidentFundRequestDialogPayload = { mode: this.mode };

    if (this.mode === 'enrollment') {
      payload.ruleId = String(raw.ruleId ?? '');
      payload.employeePct = Number(raw.employeePct ?? 0);
      payload.effectiveFrom = String(raw.effectiveFrom ?? this.getTodayDate());
    }

    if (this.mode === 'percentage-update') {
      payload.ruleId = String(raw.ruleId ?? '');
      payload.employeePct = Number(raw.employeePct ?? 0);
    }

    if (this.mode === 'withdrawal') {
      payload.amount = Number(raw.amount ?? 0);
      payload.withdrawalType = (String(raw.withdrawalType ?? 'temporary').trim().toLowerCase() === 'permanent'
        ? 'permanent'
        : 'temporary');
      payload.reason = String(raw.reason ?? '').trim();
    }

    this.dialogRef.close(payload);
  }

  private applyModeValidators(): void {
    const ruleIdControl = this.form.get('ruleId');
    const employeePctControl = this.form.get('employeePct');
    const effectiveFromControl = this.form.get('effectiveFrom');
    const amountControl = this.form.get('amount');
    const withdrawalTypeControl = this.form.get('withdrawalType');
    const reasonControl = this.form.get('reason');
    const remarksControl = this.form.get('remarks');

    ruleIdControl?.clearValidators();
    employeePctControl?.clearValidators();
    effectiveFromControl?.clearValidators();
    amountControl?.clearValidators();
    withdrawalTypeControl?.clearValidators();
    reasonControl?.clearValidators();
    remarksControl?.clearValidators();

    if (this.mode === 'enrollment') {
      ruleIdControl?.setValidators([Validators.required]);
      employeePctControl?.setValidators([Validators.required, Validators.min(0.01), Validators.max(100)]);
      effectiveFromControl?.setValidators([Validators.required]);
      employeePctControl?.disable({ emitEvent: false });
    } else {
      employeePctControl?.enable({ emitEvent: false });
    }

    if (this.mode === 'percentage-update') {
      ruleIdControl?.setValidators([Validators.required]);
      employeePctControl?.setValidators([Validators.required, Validators.min(0.01), Validators.max(100)]);
      employeePctControl?.disable({ emitEvent: false });
    }

    if (this.mode === 'withdrawal') {
      amountControl?.setValidators([Validators.required, Validators.min(1)]);
      withdrawalTypeControl?.setValidators([Validators.required]);
      reasonControl?.setValidators([Validators.required, Validators.maxLength(500)]);
    }

    ruleIdControl?.updateValueAndValidity({ emitEvent: false });
    employeePctControl?.updateValueAndValidity({ emitEvent: false });
    effectiveFromControl?.updateValueAndValidity({ emitEvent: false });
    amountControl?.updateValueAndValidity({ emitEvent: false });
    withdrawalTypeControl?.updateValueAndValidity({ emitEvent: false });
    reasonControl?.updateValueAndValidity({ emitEvent: false });
    remarksControl?.updateValueAndValidity({ emitEvent: false });
  }

  private resolveDefaultTitle(): string {
    if (this.mode === 'enrollment') return 'New provident fund request';
    if (this.mode === 'percentage-update') return 'Update provident fund percentage';
    if (this.mode === 'withdrawal') return 'Request provident fund withdrawal';
    return 'Provident fund request';
  }

  private resolveDefaultSubmitText(): string {
    if (this.mode === 'enrollment') return 'Submit request';
    if (this.mode === 'percentage-update') return 'Update percentage';
    if (this.mode === 'withdrawal') return 'Submit withdrawal';
    return 'Submit request';
  }

  private syncSelectedRuleValues(ruleId: string | null): void {
    if (!ruleId) {
      this.form.patchValue({ employeePct: null }, { emitEvent: false });
      return;
    }

    const selected = this.rules.find((rule) => rule.ruleId === ruleId);
    this.form.patchValue({
      employeePct: this.toNumber(selected?.defaultEmployeePct ?? 0)
    }, { emitEvent: false });
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
