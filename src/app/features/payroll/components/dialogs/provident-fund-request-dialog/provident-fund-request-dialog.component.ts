import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type ProvidentFundRequestDialogMode = 'enrollment' | 'percentage-update' | 'withdrawal' | 'settlement';

export interface ProvidentFundRuleOption {
  ruleId: string;
  ruleName: string;
  defaultEmployeePct: number;
}

export interface ProvidentFundRequestDialogPayload {
  mode: ProvidentFundRequestDialogMode;
  ruleId?: string;
  employeePct?: number;
  effectiveFrom?: string;
  amount?: number;
  reason?: string;
  remarks?: string;
}

interface ProvidentFundRequestDialogData {
  currencySymbol?: string;
  mode?: ProvidentFundRequestDialogMode;
  rules?: ProvidentFundRuleOption[];
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

  readonly form = this.fb.group({
    ruleId: [null as string | null],
    employeePct: [null as number | null],
    effectiveFrom: [this.getTodayDate()],
    amount: [null as number | null],
    reason: [''],
    remarks: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: ProvidentFundRequestDialogData) {
    this.applyModeValidators();

    if (this.mode === 'enrollment' && !this.data?.initialValue?.employeePct && this.rules.length > 0) {
      this.form.patchValue({
        employeePct: Number(this.rules[0].defaultEmployeePct ?? 0)
      });
    }

    if (this.data?.initialValue) {
      this.form.patchValue({
        ruleId: this.data.initialValue.ruleId ?? null,
        employeePct: this.data.initialValue.employeePct ?? this.form.get('employeePct')?.value ?? null,
        effectiveFrom: this.data.initialValue.effectiveFrom ?? this.getTodayDate(),
        amount: this.data.initialValue.amount ?? null,
        reason: this.data.initialValue.reason ?? '',
        remarks: this.data.initialValue.remarks ?? ''
      });
    }

    this.form.get('ruleId')?.valueChanges.subscribe((ruleId) => {
      if (this.mode !== 'enrollment' || !ruleId) {
        return;
      }

      const selected = this.rules.find((rule) => rule.ruleId === ruleId);
      if (selected && !this.data?.initialValue?.employeePct) {
        this.form.patchValue({ employeePct: Number(selected.defaultEmployeePct ?? 0) }, { emitEvent: false });
      }
    });
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
      payload.employeePct = Number(raw.employeePct ?? 0);
    }

    if (this.mode === 'withdrawal') {
      payload.amount = Number(raw.amount ?? 0);
      payload.reason = String(raw.reason ?? '').trim();
    }

    if (this.mode === 'settlement') {
      payload.effectiveFrom = String(raw.effectiveFrom ?? this.getTodayDate());
      payload.remarks = String(raw.remarks ?? '').trim();
    }

    this.dialogRef.close(payload);
  }

  private applyModeValidators(): void {
    const ruleIdControl = this.form.get('ruleId');
    const employeePctControl = this.form.get('employeePct');
    const effectiveFromControl = this.form.get('effectiveFrom');
    const amountControl = this.form.get('amount');
    const reasonControl = this.form.get('reason');
    const remarksControl = this.form.get('remarks');

    ruleIdControl?.clearValidators();
    employeePctControl?.clearValidators();
    effectiveFromControl?.clearValidators();
    amountControl?.clearValidators();
    reasonControl?.clearValidators();
    remarksControl?.clearValidators();

    if (this.mode === 'enrollment') {
      ruleIdControl?.setValidators([Validators.required]);
      employeePctControl?.setValidators([Validators.required, Validators.min(0.01), Validators.max(100)]);
      effectiveFromControl?.setValidators([Validators.required]);
    }

    if (this.mode === 'percentage-update') {
      employeePctControl?.setValidators([Validators.required, Validators.min(0.01), Validators.max(100)]);
    }

    if (this.mode === 'withdrawal') {
      amountControl?.setValidators([Validators.required, Validators.min(1)]);
      reasonControl?.setValidators([Validators.required, Validators.maxLength(500)]);
    }

    if (this.mode === 'settlement') {
      effectiveFromControl?.setValidators([Validators.required]);
      remarksControl?.setValidators([Validators.maxLength(500)]);
    }

    ruleIdControl?.updateValueAndValidity({ emitEvent: false });
    employeePctControl?.updateValueAndValidity({ emitEvent: false });
    effectiveFromControl?.updateValueAndValidity({ emitEvent: false });
    amountControl?.updateValueAndValidity({ emitEvent: false });
    reasonControl?.updateValueAndValidity({ emitEvent: false });
    remarksControl?.updateValueAndValidity({ emitEvent: false });
  }

  private resolveDefaultTitle(): string {
    if (this.mode === 'enrollment') return 'New provident fund request';
    if (this.mode === 'percentage-update') return 'Update provident fund percentage';
    if (this.mode === 'withdrawal') return 'Request provident fund withdrawal';
    return 'Request provident fund settlement';
  }

  private resolveDefaultSubmitText(): string {
    if (this.mode === 'enrollment') return 'Submit request';
    if (this.mode === 'percentage-update') return 'Update percentage';
    if (this.mode === 'withdrawal') return 'Submit withdrawal';
    return 'Submit settlement';
  }

  private getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
