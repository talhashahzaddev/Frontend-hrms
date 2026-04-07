import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type LoanPaymentDialogStatus = 'pending' | 'deducted' | 'skipped';

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
  remainingAmount: number;
  paidDate: string | null;
  status: LoanPaymentDialogStatus;
}

interface LoanPaymentDialogData {
  mode?: 'create' | 'edit';
  employees?: LoanPaymentEmployeeOption[];
  periods?: LoanPaymentPeriodOption[];
  loans?: LoanPaymentLoanOption[];
  initialValue?: Partial<LoanPaymentDialogPayload>;
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

  readonly form = this.fb.group(
    {
      employeeId: ['', Validators.required],
      loanId: ['', Validators.required],
      periodId: ['', Validators.required],
      installmentAmount: [null as number | null, [Validators.required, Validators.min(1)]],
      remainingAmount: [{ value: 0, disabled: true }],
      paidDate: [''],
      status: ['pending' as LoanPaymentDialogStatus, Validators.required]
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
        status: this.data.initialValue.status ?? 'pending'
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
      this.updateRemainingAmount();
    });

    this.form.get('loanId')?.valueChanges.subscribe(() => this.updateRemainingAmount());
    this.form.get('installmentAmount')?.valueChanges.subscribe(() => this.updateRemainingAmount());

    this.updateRemainingAmount();
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
      remainingAmount: Number(raw.remainingAmount ?? 0),
      paidDate: raw.paidDate ? String(raw.paidDate) : null,
      status: (raw.status ?? 'pending') as LoanPaymentDialogStatus
    });
  }

  private updateRemainingAmount(): void {
    const selectedLoanId = String(this.form.getRawValue().loanId ?? '').trim();
    const installment = Number(this.form.get('installmentAmount')?.value ?? 0);

    const selectedLoan = this.loans.find((loan) => loan.id === selectedLoanId);
    const baseRemaining = Number(selectedLoan?.remainingAmount ?? 0);
    const remainingAfter = Math.max(0, baseRemaining - Math.max(0, installment));

    this.form.get('remainingAmount')?.setValue(remainingAfter, { emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
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
