import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type LoanPaymentRepaymentMethod = 'cash' | 'bank transfer';
export type LoanPaymentRepaymentType = 'installment' | 'full';

export interface LoanPaymentEmployeeOption {
  id: string;
  name: string;
}

export interface LoanPaymentPeriodOption {
  id: string;
  name: string;
}

export interface LoanPaymentLoanOption {
  id: string;
  employeeId: string;
  label: string;
  remainingAmount: number;
}

export interface LoanPaymentDialogPayload {
  employeeId: string;
  loanId: string;
  periodId: string;
  installmentAmount: number;
  installmentNumber: number;
  paidDate: string | null;
  repaymentMethod: LoanPaymentRepaymentMethod;
  repaymentType: LoanPaymentRepaymentType;
}

interface LoanPaymentDialogData {
  mode?: 'create' | 'edit';
  employees?: LoanPaymentEmployeeOption[];
  periods?: LoanPaymentPeriodOption[];
  loans?: LoanPaymentLoanOption[];
  initialValue?: Partial<LoanPaymentDialogPayload>;
  currencySymbol?: string;
}

@Component({
  selector: 'app-add-loan-payment-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-loan-payment-dialog.component.html',
  styleUrl: './add-loan-payment-dialog.component.scss'
})
export class AddLoanPaymentDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddLoanPaymentDialogComponent, LoanPaymentDialogPayload | undefined>);

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';
  readonly employees = this.data?.employees ?? [];
  readonly periods = this.data?.periods ?? [];
  readonly loans = this.data?.loans ?? [];
  readonly currencySymbol = this.data?.currencySymbol ?? 'PKR';

  readonly form = this.fb.group(
    {
      employeeId: ['', Validators.required],
      loanId: ['', Validators.required],
      periodId: [''],
      installmentAmount: [null as number | null, [Validators.required, Validators.min(1)]],
      installmentNumber: [1, [Validators.required, Validators.min(1)]],
      paidDate: [''],
      repaymentMethod: ['cash' as LoanPaymentRepaymentMethod, Validators.required],
      repaymentType: ['installment' as LoanPaymentRepaymentType, Validators.required]
    },
    { validators: [this.installmentValidator()] }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: LoanPaymentDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        employeeId: this.data.initialValue.employeeId ?? '',
        loanId: this.data.initialValue.loanId ?? '',
        periodId: this.data.initialValue.periodId ?? '',
        installmentAmount: this.data.initialValue.installmentAmount ?? null,
        paidDate: this.data.initialValue.paidDate ?? '',
        installmentNumber: this.data.initialValue.installmentNumber ?? 1,
        repaymentMethod: this.data.initialValue.repaymentMethod ?? 'cash',
        repaymentType: this.data.initialValue.repaymentType ?? 'installment'
      });
    }

    if (this.mode === 'edit') {
      this.form.get('employeeId')?.disable();
      this.form.get('loanId')?.disable();
    }

    this.form.get('employeeId')?.valueChanges.subscribe((employeeId) => {
      const activeLoanId = String(this.form.get('loanId')?.value ?? '');
      const stillValid = this.filteredLoans.some((loan) => loan.id === activeLoanId);
      if (activeLoanId && !stillValid) {
        this.form.patchValue({ loanId: '' });
      }
      this.form.updateValueAndValidity({ emitEvent: false });
    });

    this.form.get('loanId')?.valueChanges.subscribe(() => this.form.updateValueAndValidity({ emitEvent: false }));
    this.form.get('installmentAmount')?.valueChanges.subscribe(() => this.form.updateValueAndValidity({ emitEvent: false }));

    this.form.updateValueAndValidity({ emitEvent: false });
  }

  get filteredLoans(): LoanPaymentLoanOption[] {
    const selectedEmployeeId = String(this.form.getRawValue().employeeId ?? '').trim();
    if (!selectedEmployeeId) {
      return this.loans;
    }

    return this.loans.filter((loan) => loan.employeeId === selectedEmployeeId);
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit payment record' : 'Add payment record';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Update record' : 'Save record';
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
      loanId: String(raw.loanId ?? ''),
      periodId: String(raw.periodId ?? ''),
      installmentAmount: Number(raw.installmentAmount ?? 0),
      installmentNumber: Number(raw.installmentNumber ?? 1),
      paidDate: raw.paidDate ? String(raw.paidDate) : null,
      repaymentMethod: (raw.repaymentMethod ?? 'cash') as LoanPaymentRepaymentMethod,
      repaymentType: (raw.repaymentType ?? 'installment') as LoanPaymentRepaymentType
    });
  }

  private installmentValidator(): ValidatorFn {
    return (group): ValidationErrors | null => {
      const loanId = String(group.get('loanId')?.value ?? '').trim();
      const installment = Number(group.get('installmentAmount')?.value ?? 0);
      const selectedLoan = this.loans.find((loan) => loan.id === loanId);
      const remaining = Number(selectedLoan?.remainingAmount ?? 0);

      if (remaining > 0 && installment > remaining) {
        return { installmentExceedsRemaining: true };
      }

      return null;
    };
  }
}
