import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type ProvidentFundPaymentRepaymentMethod = 'cash' | 'bank transfer' | 'payroll deduction';
export type ProvidentFundPaymentRepaymentType = 'installment' | 'full';

export interface ProvidentFundPaymentEmployeeOption {
  id: string;
  name: string;
}

export interface ProvidentFundPaymentPeriodOption {
  id: string;
  name: string;
}

export interface ProvidentFundPaymentOption {
  id: string;
  employeeId: string;
  label: string;
  remainingAmount: number;
}

export interface ProvidentFundPaymentDialogPayload {
  employeeId: string;
  providentFundId: string;
  periodId: string;
  installmentAmount: number;
  installmentNumber: number;
  paidDate: string | null;
  repaymentMethod: ProvidentFundPaymentRepaymentMethod;
  repaymentType: ProvidentFundPaymentRepaymentType;
}

interface ProvidentFundPaymentDialogData {
  mode?: 'create' | 'edit';
  employees?: ProvidentFundPaymentEmployeeOption[];
  periods?: ProvidentFundPaymentPeriodOption[];
  providentFunds?: ProvidentFundPaymentOption[];
  initialValue?: Partial<ProvidentFundPaymentDialogPayload>;
  currencySymbol?: string;
}

@Component({
  selector: 'app-add-provident-fund-payment-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-provident-fund-payment-dialog.component.html',
  styleUrl: './add-provident-fund-payment-dialog.component.scss'
})
export class AddProvidentFundPaymentDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<AddProvidentFundPaymentDialogComponent, ProvidentFundPaymentDialogPayload | undefined>
  );

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';
  readonly employees = this.data?.employees ?? [];
  readonly periods = this.data?.periods ?? [];
  readonly providentFunds = this.data?.providentFunds ?? [];
  readonly currencySymbol = this.data?.currencySymbol ?? 'PKR';

  readonly form = this.fb.group(
    {
      employeeId: ['', Validators.required],
      providentFundId: ['', Validators.required],
      periodId: [''],
      installmentAmount: [null as number | null, [Validators.required, Validators.min(1)]],
      installmentNumber: [1, [Validators.required, Validators.min(1)]],
      paidDate: [''],
      repaymentMethod: ['cash' as ProvidentFundPaymentRepaymentMethod, Validators.required],
      repaymentType: ['installment' as ProvidentFundPaymentRepaymentType, Validators.required]
    },
    { validators: [this.installmentValidator()] }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: ProvidentFundPaymentDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        employeeId: this.data.initialValue.employeeId ?? '',
        providentFundId: this.data.initialValue.providentFundId ?? '',
        periodId: this.data.initialValue.periodId ?? '',
        installmentAmount: this.data.initialValue.installmentAmount ?? null,
        installmentNumber: this.data.initialValue.installmentNumber ?? 1,
        paidDate: this.data.initialValue.paidDate ?? '',
        repaymentMethod: this.data.initialValue.repaymentMethod ?? 'cash',
        repaymentType: this.data.initialValue.repaymentType ?? 'installment'
      });
    }

    if (this.mode === 'edit') {
      this.form.get('employeeId')?.disable();
      this.form.get('providentFundId')?.disable();
    }

    this.form.get('employeeId')?.valueChanges.subscribe(() => {
      const currentFundId = String(this.form.get('providentFundId')?.value ?? '');
      const stillExists = this.filteredProvidentFunds.some((item) => item.id === currentFundId);
      if (currentFundId && !stillExists) {
        this.form.patchValue({ providentFundId: '' });
      }
      this.form.updateValueAndValidity({ emitEvent: false });
    });

    this.form.get('providentFundId')?.valueChanges.subscribe(() => this.form.updateValueAndValidity({ emitEvent: false }));
    this.form.get('installmentAmount')?.valueChanges.subscribe(() => this.form.updateValueAndValidity({ emitEvent: false }));
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  get filteredProvidentFunds(): ProvidentFundPaymentOption[] {
    const selectedEmployeeId = String(this.form.getRawValue().employeeId ?? '').trim();
    if (!selectedEmployeeId) {
      return this.providentFunds;
    }
    return this.providentFunds.filter((item) => item.employeeId === selectedEmployeeId);
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit provident fund payment' : 'Add provident fund payment';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Update payment' : 'Save payment';
  }

  get showInstallmentError(): boolean {
    const amountControl = this.form.get('installmentAmount');
    return !!amountControl && (
      (amountControl.touched && (amountControl.hasError('required') || amountControl.hasError('min')))
      || (amountControl.touched && this.form.hasError('installmentExceedsRemaining'))
    );
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
      employeeId: String(raw.employeeId ?? ''),
      providentFundId: String(raw.providentFundId ?? ''),
      periodId: String(raw.periodId ?? ''),
      installmentAmount: Number(raw.installmentAmount ?? 0),
      installmentNumber: Number(raw.installmentNumber ?? 1),
      paidDate: raw.paidDate ? String(raw.paidDate) : null,
      repaymentMethod: (raw.repaymentMethod ?? 'cash') as ProvidentFundPaymentRepaymentMethod,
      repaymentType: (raw.repaymentType ?? 'installment') as ProvidentFundPaymentRepaymentType
    });
  }

  private installmentValidator(): ValidatorFn {
    return (group): ValidationErrors | null => {
      const providentFundId = String(group.get('providentFundId')?.value ?? '').trim();
      const installmentAmount = Number(group.get('installmentAmount')?.value ?? 0);
      const selected = this.providentFunds.find((item) => item.id === providentFundId);
      const remaining = Number(selected?.remainingAmount ?? 0);

      if (remaining > 0 && installmentAmount > remaining) {
        return { installmentExceedsRemaining: true };
      }

      return null;
    };
  }
}
