import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type LoanRepaymentType = 'installment' | 'full';

export interface RequestLoanDialogPayload {
  totalAmount: number;
  repaymentType: LoanRepaymentType;
  monthlyInstallment: number;
  totalInstallments: number;
  startDate: string;
  endDate: string | null;
  reason: string;
}

interface RequestLoanDialogData {
  currencySymbol?: string;
  initialValue?: Partial<RequestLoanDialogPayload>;
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
  private readonly dialogRef = inject(MatDialogRef<RequestLoanDialogComponent, RequestLoanDialogPayload | undefined>);

  readonly currencySymbol = this.data?.currencySymbol ?? 'PKR';

  readonly form = this.fb.group(
    {
      totalAmount: [null as number | null, [Validators.required, Validators.min(1)]],
      repaymentType: ['installment' as LoanRepaymentType, Validators.required],
      monthlyInstallment: [null as number | null, [Validators.required, Validators.min(1)]],
      totalInstallments: [12 as number | null, [Validators.required, Validators.min(1), Validators.max(240)]],
      startDate: [this.getTodayIsoDate(), Validators.required],
      endDate: [''],
      reason: ['', [Validators.required, Validators.maxLength(500)]]
    },
    { validators: [this.formValidator()] }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: RequestLoanDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        totalAmount: this.data.initialValue.totalAmount ?? null,
        repaymentType: this.data.initialValue.repaymentType ?? 'installment',
        monthlyInstallment: this.data.initialValue.monthlyInstallment ?? null,
        totalInstallments: this.data.initialValue.totalInstallments ?? 12,
        startDate: this.data.initialValue.startDate ?? this.getTodayIsoDate(),
        endDate: this.data.initialValue.endDate ?? '',
        reason: this.data.initialValue.reason ?? ''
      });
    }

    this.form.get('repaymentType')?.valueChanges.subscribe((value) => {
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

  get showDateRangeError(): boolean {
    const startControl = this.form.get('startDate');
    const endControl = this.form.get('endDate');

    return !!(
      this.form.hasError('invalidDateRange')
      && ((startControl?.touched ?? false) || (endControl?.touched ?? false))
    );
  }

  get isFullRepayment(): boolean {
    return this.form.get('repaymentType')?.value === 'full';
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
      totalAmount: Number(raw.totalAmount ?? 0),
      repaymentType: (raw.repaymentType ?? 'installment') as LoanRepaymentType,
      monthlyInstallment: Number(raw.monthlyInstallment ?? 0),
      totalInstallments: Number(raw.totalInstallments ?? 1),
      startDate: String(raw.startDate ?? this.getTodayIsoDate()),
      endDate: raw.endDate ? String(raw.endDate) : null,
      reason: String(raw.reason ?? '').trim()
    });
  }

  private toggleRepaymentMode(type: LoanRepaymentType): void {
    const installmentControl = this.form.get('monthlyInstallment');
    const countControl = this.form.get('totalInstallments');

    if (!installmentControl || !countControl) {
      return;
    }

    if (type === 'full') {
      this.applyFullRepaymentValues();
      installmentControl.disable({ emitEvent: false });
      countControl.disable({ emitEvent: false });
      return;
    }

    installmentControl.enable({ emitEvent: false });
    countControl.enable({ emitEvent: false });

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

  private formValidator(): ValidatorFn {
    return (group): ValidationErrors | null => {
      const totalAmount = Number(group.get('totalAmount')?.value ?? 0);
      const monthlyInstallment = Number(group.get('monthlyInstallment')?.value ?? 0);
      const totalInstallments = Number(group.get('totalInstallments')?.value ?? 0);
      const repaymentType = String(group.get('repaymentType')?.value ?? 'installment');
      const startDate = String(group.get('startDate')?.value ?? '');
      const endDate = String(group.get('endDate')?.value ?? '');

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

      if (startDate && endDate && endDate < startDate) {
        errors['invalidDateRange'] = true;
      }

      return Object.keys(errors).length ? errors : null;
    };
  }

  private getTodayIsoDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
