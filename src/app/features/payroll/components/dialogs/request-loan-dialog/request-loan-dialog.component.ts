import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { PayrollService } from '../../../services/payroll.service';
import { Observable, shareReplay, take } from 'rxjs';

export type LoanRepaymentType = 'installment' | 'full';

export interface RequestLoanDialogPayload {
  totalAmount: number;
  repaymentType: LoanRepaymentType;
  monthlyInstallment: number;
  totalInstallments: number;
  loanRuleId: string;
  reason: string;
  returnDate?: string | null;
}

interface RequestLoanDialogData {
  currencySymbol?: string;
  initialValue?: Partial<RequestLoanDialogPayload>;
  loanId?: string;
}

@Component({
  selector: 'app-request-loan-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './request-loan-dialog.component.html',
  styleUrl: './request-loan-dialog.component.scss'
})
export class RequestLoanDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly payrollService = inject(PayrollService);
  private readonly dialogRef = inject(MatDialogRef<RequestLoanDialogComponent, RequestLoanDialogPayload | undefined>);

  readonly currencySymbol = this.data?.currencySymbol ?? 'PKR';
  readonly loanRules$ = this.payrollService.getActiveLoanRules().pipe(
    shareReplay(1)
  );
  private loanRules: any[] = [];
  filteredLoanRules: any[] = [];
  selectedRule: any = null;
  isSubmitting = false;

  readonly form = this.fb.group(
    {
      totalAmount: [null as number | null, [Validators.required, Validators.min(1)]],
      repaymentType: ['installment' as LoanRepaymentType, Validators.required],
      monthlyInstallment: [null as number | null, [Validators.required, Validators.min(1)]],
      totalInstallments: [12 as number | null, [Validators.required, Validators.min(1), Validators.max(240)]],
      loanRuleId: [null as string | null, Validators.required],
      reason: ['', [Validators.required, Validators.maxLength(500)]],
      returnDate: [null as string | null]
    },
    { validators: [this.formValidator()] }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: RequestLoanDialogData) {
    this.loanRules$.subscribe(rules => {
      this.loanRules = rules;
      this.updateFilteredRules();
      const currentId = this.form.get('loanRuleId')?.value;
      if (currentId) {
        this.updateSelectedRule(currentId);
      }
      // Re-trigger validation once rules are loaded
      this.form.updateValueAndValidity();
    });

    if (this.data?.initialValue) {
      this.form.patchValue({
        totalAmount: this.data.initialValue.totalAmount ?? null,
        repaymentType: this.data.initialValue.repaymentType ?? 'installment',
        monthlyInstallment: this.data.initialValue.monthlyInstallment ?? null,
        totalInstallments: this.data.initialValue.totalInstallments ?? 12,
        loanRuleId: (this.data.initialValue as any).loanRuleId ?? null,
        reason: this.data.initialValue.reason ?? '',
        returnDate: (this.data.initialValue as any).returnDate ?? null
      }, { emitEvent: false });
      
      if ((this.data.initialValue as any).loanRuleId) {
        this.updateSelectedRule((this.data.initialValue as any).loanRuleId);
      }
    }

    // Initial UI state
    this.updateFilteredRules();
    this.toggleRepaymentMode(this.form.get('repaymentType')?.value ?? 'installment');

    this.form.get('loanRuleId')?.valueChanges.subscribe((id) => {
      this.updateSelectedRule(id);
    });

    this.form.get('repaymentType')?.valueChanges.subscribe((value) => {
      this.form.get('loanRuleId')?.setValue(null); 
      this.updateFilteredRules();
      this.toggleRepaymentMode((value ?? 'installment') as LoanRepaymentType);
    });

    this.form.get('totalAmount')?.valueChanges.subscribe(() => {
      if (this.isFullRepayment) {
        this.applyFullRepaymentValues();
      }
    });

    this.toggleRepaymentMode((this.form.get('repaymentType')?.value ?? 'installment') as LoanRepaymentType);
  }

  get showInstallmentError(): boolean {
    const control = this.form.get('monthlyInstallment');
    return !!control && (
      (control.touched && (control.hasError('required') || control.hasError('min')))
      || (control.touched && this.form.hasError('installmentExceedsAmount'))
    );
  }

  get showLoanRuleError(): boolean {
    const control = this.form.get('loanRuleId');
    return !!control && control.touched && control.hasError('required');
  }

  get showReturnDateError(): boolean {
    const control = this.form.get('returnDate');
    return !!control && control.touched && control.hasError('required');
  }

  get showAmountError(): boolean {
    const control = this.form.get('totalAmount');
    if (!control) return false;
    return !!(
      (control.touched && (control.hasError('required') || control.hasError('min')))
      || (control.touched && this.form.hasError('maxAmountExceeded'))
    );
  }



  get isFullRepayment(): boolean {
    return this.form.get('repaymentType')?.value === 'full';
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const raw = this.form.getRawValue();

    // Construct backend payload based on CreateLoanRequestDto
    const payload = {
      ruleId: raw.loanRuleId,
      principalAmount: Number(raw.totalAmount ?? 0),
      totalInterest: 0, // Interest is hardcoded to 0
      monthlyInstallment: raw.monthlyInstallment ? Number(raw.monthlyInstallment) : null,
      totalInstallments: Number(raw.totalInstallments ?? 1),
      description: raw.reason ? String(raw.reason).trim() : null,
      repaymentType: raw.repaymentType ?? 'installment',
      returnDate: raw.returnDate ? String(raw.returnDate) : null
    };

    const request$ = this.data?.loanId 
      ? this.payrollService.updateLoanRequest(this.data.loanId, payload)
      : this.payrollService.requestLoan(payload);

    request$.pipe(take(1)).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.dialogRef.close(res);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error saving loan request:', err);
      }
    });
  }

  private toggleRepaymentMode(type: LoanRepaymentType): void {
    const installmentControl = this.form.get('monthlyInstallment');
    const countControl = this.form.get('totalInstallments');
    const returnDateControl = this.form.get('returnDate');

    if (!installmentControl || !countControl || !returnDateControl) {
      return;
    }

    if (type === 'full') {
      this.applyFullRepaymentValues();
      installmentControl.disable({ emitEvent: false });
      countControl.disable({ emitEvent: false });
      returnDateControl.setValidators([Validators.required]);
      returnDateControl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    installmentControl.enable({ emitEvent: false });
    countControl.enable({ emitEvent: false });
    returnDateControl.clearValidators();
    returnDateControl.setValue(null, { emitEvent: false });
    returnDateControl.updateValueAndValidity({ emitEvent: false });

    if (!countControl.value || Number(countControl.value) <= 0) {
      countControl.setValue(12, { emitEvent: false });
    }
  }

  private applyFullRepaymentValues(): void {
    const totalAmount = Number(this.form.get('totalAmount')?.value ?? 0);
    this.form.patchValue(
      {
        monthlyInstallment: totalAmount > 0 ? totalAmount : null,
        totalInstallments: 1
      },
      { emitEvent: false }
    );
  }

  private updateSelectedRule(id: string | null): void {
    if (!id) {
      this.selectedRule = null;
      return;
    }
    this.selectedRule = this.loanRules.find(r => r.ruleId === id || r.id === id);
  }

  private updateFilteredRules(): void {
    const type = this.form.get('repaymentType')?.value;
    if (type === 'full') {
      this.filteredLoanRules = this.loanRules.filter(r => r.maxInstallments === 1);
    } else {
      this.filteredLoanRules = this.loanRules.filter(r => r.maxInstallments > 1 || r.maxInstallments === null);
    }
  }

  private formValidator(): ValidatorFn {
    return (group): ValidationErrors | null => {
      const totalAmount = Number(group.get('totalAmount')?.value ?? 0);
      const monthlyInstallment = Number(group.get('monthlyInstallment')?.value ?? 0);
      const totalInstallments = Number(group.get('totalInstallments')?.value ?? 0);
      const repaymentType = String(group.get('repaymentType')?.value ?? 'installment');

      const errors: ValidationErrors = {};

      if (totalAmount > 0 && monthlyInstallment > totalAmount) {
        errors['installmentExceedsAmount'] = true;
      }

      if (repaymentType === 'full') {
        if (totalInstallments !== 1) {
          errors['invalidFullInstallmentCount'] = true;
        }

        if (totalAmount > 0 && monthlyInstallment !== totalAmount) {
          errors['invalidFullInstallmentAmount'] = true;
        }
      }

      if (repaymentType === 'installment' && totalInstallments < 1) {
        errors['invalidInstallmentCount'] = true;
      }

      const loanRuleId = group.get('loanRuleId')?.value;
      const rule = this.loanRules.find(r => r.ruleId === loanRuleId || r.id === loanRuleId);
      const maxAllowed = rule?.maxLoanAmount;
      if (maxAllowed !== undefined && maxAllowed !== null && totalAmount > maxAllowed) {
        errors['maxAmountExceeded'] = true;
      }

      return Object.keys(errors).length ? errors : null;
    };
  }


}
