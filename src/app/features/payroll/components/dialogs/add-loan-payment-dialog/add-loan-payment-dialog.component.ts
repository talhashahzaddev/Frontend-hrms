import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { PayrollService } from '../../../services/payroll.service';
import { AuthService } from '@core/services/auth.service';

import { SharedCommonModule } from '@shared/shared-common.module';
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
  imports: [
    SharedCommonModule,CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-loan-payment-dialog.component.html',
  styleUrl: './add-loan-payment-dialog.component.scss'
})
export class AddLoanPaymentDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly payrollService = inject(PayrollService);
  private readonly authService = inject(AuthService);
  private readonly dialogRef = inject(MatDialogRef<AddLoanPaymentDialogComponent, LoanPaymentDialogPayload | undefined>);

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';
  employees = this.data?.employees ?? [];
  readonly periods = this.deduplicatePeriodOptions(this.data?.periods ?? []);
  loans = this.deduplicateLoanOptions(this.data?.loans ?? []);
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
    if (this.mode === 'create') {
      this.loadActiveDisbursedLoans();
    }

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

  private loadActiveDisbursedLoans(): void {
    this.payrollService.getDisbursedActiveLoans({ Page: 1, PageSize: 500 }).subscribe({
      next: (response: any) => {
        const rows = this.extractItems(response);

        const employeesMap = new Map<string, LoanPaymentEmployeeOption>();
        const loansMap = new Map<string, LoanPaymentLoanOption>();

        rows.forEach((item: any) => {
          const employeeId = String(item.employeeId ?? '').trim();
          const employeeName = String(item.employeeName ?? '').trim();
          const referenceId = String(item.referenceId ?? '').trim();
          const remainingAmount = Number(item.remainingAmount ?? item.balanceAmount ?? 0);

          if (employeeId && employeeName && !employeesMap.has(employeeId)) {
            employeesMap.set(employeeId, { id: employeeId, name: employeeName });
          }

          if (employeeId && referenceId) {
            const existingLoan = loansMap.get(referenceId);
            const nextOption: LoanPaymentLoanOption = {
              id: referenceId,
              employeeId,
              label: referenceId,
              remainingAmount: Number.isFinite(remainingAmount) ? remainingAmount : 0
            };

            if (!existingLoan || nextOption.remainingAmount > existingLoan.remainingAmount) {
              loansMap.set(referenceId, nextOption);
            }
          }
        });

        this.employees = Array.from(employeesMap.values());
        this.loans = this.deduplicateLoanOptions(Array.from(loansMap.values()));

        // Clear stale selections if they are no longer valid after refresh.
        const selectedEmployee = String(this.form.get('employeeId')?.value ?? '').trim();
        const selectedLoan = String(this.form.get('loanId')?.value ?? '').trim();
        if (selectedEmployee && !this.employees.some((item) => item.id === selectedEmployee)) {
          this.form.patchValue({ employeeId: '', loanId: '' }, { emitEvent: false });
        } else if (selectedLoan && !this.loans.some((item) => item.id === selectedLoan)) {
          this.form.patchValue({ loanId: '' }, { emitEvent: false });
        }

        this.form.updateValueAndValidity({ emitEvent: false });
      },
      error: (err) => {
        console.error('Error loading active disbursed loans for payment dialog:', err);
      }
    });
  }

  private deduplicatePeriodOptions(periods: LoanPaymentPeriodOption[]): LoanPaymentPeriodOption[] {
    if (!periods.length) {
      return periods;
    }

    const unique: LoanPaymentPeriodOption[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    periods.forEach((period) => {
      const id = String(period?.id ?? '').trim();
      const name = String(period?.name ?? '').trim();
      const normalizedName = name.toLowerCase();

      if (!id && !name) {
        return;
      }

      if ((id && seenIds.has(id)) || (normalizedName && seenNames.has(normalizedName))) {
        return;
      }

      if (id) {
        seenIds.add(id);
      }

      if (normalizedName) {
        seenNames.add(normalizedName);
      }

      unique.push({ id, name });
    });

    return unique;
  }

  private deduplicateLoanOptions(loans: LoanPaymentLoanOption[]): LoanPaymentLoanOption[] {
    if (!loans.length) {
      return loans;
    }

    const unique = new Map<string, LoanPaymentLoanOption>();

    loans.forEach((loan) => {
      const id = String(loan?.id ?? '').trim();
      if (!id) {
        return;
      }

      const existing = unique.get(id);
      if (!existing || (loan.remainingAmount ?? 0) > (existing.remainingAmount ?? 0)) {
        unique.set(id, {
          id,
          employeeId: String(loan.employeeId ?? '').trim(),
          label: String(loan.label ?? id).trim() || id,
          remainingAmount: Number.isFinite(Number(loan.remainingAmount)) ? Number(loan.remainingAmount) : 0
        });
      }
    });

    return Array.from(unique.values());
  }

  private extractItems(payload: any): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.items)) {
      return payload.items;
    }

    if (Array.isArray(payload?.records)) {
      return payload.records;
    }

    return [];
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

  get canSubmit(): boolean {
    if (this.mode === 'edit') {
      return this.authService.hasPermissionByActionKey('loan_admin_edit');
    }
    return this.authService.hasPermissionByActionKey('loan_admin_add');
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (!this.canSubmit) {
      return;
    }
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
