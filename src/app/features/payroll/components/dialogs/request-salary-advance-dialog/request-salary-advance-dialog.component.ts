import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface SalaryAdvanceRuleOption {
  ruleId: string;
  ruleName: string;
  maxPercentage: number;
}

export interface RequestSalaryAdvanceDialogPayload {
  selectedRuleId: string;
  selectedRuleName: string;
  selectedRulePercentage: number;
  maxAllowedAmount: number;
  totalAmount: number;
  reason: string;
}

interface RequestSalaryAdvanceDialogData {
  currencySymbol?: string;
  availableLimit?: number;
  activeRules?: SalaryAdvanceRuleOption[];
  initialValue?: Partial<RequestSalaryAdvanceDialogPayload>;
}

@Component({
  selector: 'app-request-salary-advance-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './request-salary-advance-dialog.component.html',
  styleUrl: './request-salary-advance-dialog.component.scss'
})
export class RequestSalaryAdvanceDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<RequestSalaryAdvanceDialogComponent, RequestSalaryAdvanceDialogPayload | undefined>);

  // Caller supplies the org currency (resolved from SettingsService). Fall back to
  // the system-wide neutral default rather than a country-specific symbol.
  readonly currencySymbol = this.data?.currencySymbol ?? '$';
  readonly availableLimit = Math.max(0, Number(this.data?.availableLimit ?? 0));
  readonly activeRules = (this.data?.activeRules ?? [])
    .filter((rule) => !!String(rule?.ruleId ?? '').trim())
    .map((rule) => ({
      ruleId: String(rule.ruleId).trim(),
      ruleName: String(rule.ruleName ?? '').trim() || 'Salary Advance Rule',
      maxPercentage: Number(rule.maxPercentage ?? 0)
    }))
    .filter((rule) => Number.isFinite(rule.maxPercentage) && rule.maxPercentage > 0)
    .sort((left, right) => right.maxPercentage - left.maxPercentage);

  readonly form = this.fb.group(
    {
      selectedRuleId: ['', Validators.required],
      totalAmount: [null as number | null, [Validators.required, Validators.min(1)]],
      reason: ['', [Validators.required, Validators.maxLength(500)]]
    },
    { validators: [this.amountCapValidator()] }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: RequestSalaryAdvanceDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        selectedRuleId: this.data.initialValue.selectedRuleId ?? '',
        totalAmount: this.data.initialValue.totalAmount ?? null,
        reason: this.data.initialValue.reason ?? ''
      });
    }

    if (!this.form.get('selectedRuleId')?.value && this.activeRules.length > 0) {
      this.form.patchValue({ selectedRuleId: this.activeRules[0].ruleId });
    }
  }

  get hasActiveRules(): boolean {
    return this.activeRules.length > 0;
  }

  get selectedRule(): SalaryAdvanceRuleOption | null {
    const selectedRuleId = String(this.form.get('selectedRuleId')?.value ?? '').trim();
    if (!selectedRuleId) {
      return null;
    }

    return this.activeRules.find((rule) => rule.ruleId === selectedRuleId) ?? null;
  }

  get selectedRuleMaxAmount(): number {
    const rule = this.selectedRule;
    if (!rule) {
      return 0;
    }

    return Number(((this.availableLimit * rule.maxPercentage) / 100).toFixed(2));
  }

  get showAmountLimitError(): boolean {
    const amountControl = this.form.get('totalAmount');
    return !!amountControl
      && (amountControl.touched || amountControl.dirty)
      && this.form.hasError('exceedsSelectedRuleLimit');
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
    const selectedRule = this.selectedRule;

    if (!selectedRule) {
      this.form.get('selectedRuleId')?.markAsTouched();
      return;
    }

    this.dialogRef.close({
      selectedRuleId: selectedRule.ruleId,
      selectedRuleName: selectedRule.ruleName,
      selectedRulePercentage: selectedRule.maxPercentage,
      maxAllowedAmount: this.selectedRuleMaxAmount,
      totalAmount: Number(raw.totalAmount ?? 0),
      reason: String(raw.reason ?? '').trim()
    });
  }

  private amountCapValidator(): ValidatorFn {
    return (group): ValidationErrors | null => {
      const selectedRuleId = String(group.get('selectedRuleId')?.value ?? '').trim();
      const amount = Number(group.get('totalAmount')?.value ?? 0);

      if (!selectedRuleId || amount <= 0) {
        return null;
      }

      const selectedRule = this.activeRules.find((rule) => rule.ruleId === selectedRuleId);
      if (!selectedRule) {
        return null;
      }

      const maxAllowedAmount = (this.availableLimit * selectedRule.maxPercentage) / 100;
      if (amount > maxAllowedAmount) {
        return { exceedsSelectedRuleLimit: true };
      }

      return null;
    };
  }
}
