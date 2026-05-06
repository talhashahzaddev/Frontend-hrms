import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SocialSecuritySchemeOption } from '../../../services/payroll.service';

export interface SocialSecurityRuleDialogPayload {
  schemeId: string;
  ruleName: string;
  contributionBasis: string;
  employeeDefaultPct: number;
  employerDefaultPct: number;
  employeeFixedAmount: number | null;
  employerFixedAmount: number | null;
  minSalaryLimit: number | null;
  maxSalaryLimit: number | null;
}

interface SocialSecurityRuleDialogData {
  mode?: 'create' | 'edit';
  schemes?: SocialSecuritySchemeOption[];
  initialValue?: Partial<SocialSecurityRuleDialogPayload>;
}

@Component({
  selector: 'app-add-social-security-rule-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-social-security-rule-dialog.component.html',
  styleUrl: '../add-social-security-transaction-dialog/add-social-security-transaction-dialog.component.scss'
})
export class AddSocialSecurityRuleDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddSocialSecurityRuleDialogComponent, SocialSecurityRuleDialogPayload | undefined>);

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';
  readonly schemes = this.data?.schemes ?? [];

  readonly form = this.fb.group({
    schemeId: ['', [Validators.required]],
    ruleName: ['', [Validators.required]],
    contributionBasis: ['gross', [Validators.required]],
    employeeDefaultPct: [0, [Validators.min(0), Validators.max(100)]],
    employerDefaultPct: [0, [Validators.min(0), Validators.max(100)]],
    employeeFixedAmount: [null as number | null, [Validators.min(0)]],
    employerFixedAmount: [null as number | null, [Validators.min(0)]],
    minSalaryLimit: [null as number | null, [Validators.min(0)]],
    maxSalaryLimit: [null as number | null, [Validators.min(0)]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: SocialSecurityRuleDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        schemeId: this.data.initialValue.schemeId ?? '',
        ruleName: this.data.initialValue.ruleName ?? '',
        contributionBasis: this.data.initialValue.contributionBasis ?? 'gross',
        employeeDefaultPct: Number(this.data.initialValue.employeeDefaultPct ?? 0),
        employerDefaultPct: Number(this.data.initialValue.employerDefaultPct ?? 0),
        employeeFixedAmount: this.data.initialValue.employeeFixedAmount ?? null,
        employerFixedAmount: this.data.initialValue.employerFixedAmount ?? null,
        minSalaryLimit: this.data.initialValue.minSalaryLimit ?? null,
        maxSalaryLimit: this.data.initialValue.maxSalaryLimit ?? null
      });
    }
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit rule' : 'Add rule';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Save changes' : 'Create rule';
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
      schemeId: String(raw.schemeId ?? '').trim(),
      ruleName: String(raw.ruleName ?? '').trim(),
      contributionBasis: String(raw.contributionBasis ?? 'gross'),
      employeeDefaultPct: Number(raw.employeeDefaultPct ?? 0),
      employerDefaultPct: Number(raw.employerDefaultPct ?? 0),
      employeeFixedAmount: this.toNullableNumber(raw.employeeFixedAmount),
      employerFixedAmount: this.toNullableNumber(raw.employerFixedAmount),
      minSalaryLimit: this.toNullableNumber(raw.minSalaryLimit),
      maxSalaryLimit: this.toNullableNumber(raw.maxSalaryLimit)
    });
  }

  private toNullableNumber(value: number | null | undefined): number | null {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return null;
    }
    return Number(value);
  }
}
