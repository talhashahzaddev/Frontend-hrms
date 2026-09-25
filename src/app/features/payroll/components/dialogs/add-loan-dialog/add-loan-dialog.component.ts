import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SharedCommonModule } from '@shared/shared-common.module';
export type LoanDialogStatus = 'active' | 'pending' | 'completed' | 'cancelled';

export interface LoanEmployeeOption {
  id: string;
  name: string;
  designation: string;
}

export interface LoanDialogPayload {
  employeeId: string;
  totalAmount: number;
  monthlyInstallment: number;
  startDate: string;
  endDate: string | null;
  status: LoanDialogStatus;
}

interface LoanDialogData {
  mode?: 'create' | 'edit';
  employees?: LoanEmployeeOption[];
  initialValue?: Partial<LoanDialogPayload>;
}


@Component({
  selector: 'app-add-loan-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedCommonModule,CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-loan-dialog.component.html',
  styleUrl: './add-loan-dialog.component.scss'
})
export class AddLoanDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddLoanDialogComponent, LoanDialogPayload | undefined>);

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';
  readonly employees: LoanEmployeeOption[] = this.data?.employees ?? [];

  readonly form = this.fb.group(
    {
      employeeId: ['', Validators.required],
      totalAmount: [null as number | null, [Validators.required, Validators.min(1)]],
      monthlyInstallment: [null as number | null, [Validators.required, Validators.min(1)]],
      startDate: ['', Validators.required],
      endDate: [''],
      status: ['active' as LoanDialogStatus, Validators.required]
    },
    { validators: [this.loanFormValidator()] }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: LoanDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        employeeId: this.data.initialValue.employeeId ?? '',
        totalAmount: this.data.initialValue.totalAmount ?? null,
        monthlyInstallment: this.data.initialValue.monthlyInstallment ?? null,
        startDate: this.data.initialValue.startDate ?? '',
        endDate: this.data.initialValue.endDate ?? '',
        status: this.data.initialValue.status ?? 'active'
      });
    }

    if (this.mode === 'edit') {
      this.form.get('employeeId')?.disable();
    }
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit loan' : 'Add loan';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Update record' : 'Save record';
  }

  get showInstallmentError(): boolean {
    const control = this.form.get('monthlyInstallment');
    return !!control && (
      (control.touched && (control.hasError('required') || control.hasError('min')))
      || (this.form.hasError('installmentGreaterThanTotal') && control.touched)
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
      employeeId: raw.employeeId ?? '',
      totalAmount: Number(raw.totalAmount ?? 0),
      monthlyInstallment: Number(raw.monthlyInstallment ?? 0),
      startDate: String(raw.startDate ?? ''),
      endDate: raw.endDate ? String(raw.endDate) : null,
      status: (raw.status ?? 'active') as LoanDialogStatus
    });
  }

  private loanFormValidator(): ValidatorFn {
    return (group): ValidationErrors | null => {
      const totalAmountRaw = group.get('totalAmount')?.value;
      const installmentRaw = group.get('monthlyInstallment')?.value;
      const startDateRaw = group.get('startDate')?.value;
      const endDateRaw = group.get('endDate')?.value;

      const totalAmount = Number(totalAmountRaw ?? 0);
      const installment = Number(installmentRaw ?? 0);
      const startDate = startDateRaw ? String(startDateRaw) : '';
      const endDate = endDateRaw ? String(endDateRaw) : '';

      const errors: ValidationErrors = {};

      if (totalAmount > 0 && installment > totalAmount) {
        errors['installmentGreaterThanTotal'] = true;
      }

      if (startDate && endDate && endDate < startDate) {
        errors['invalidDateRange'] = true;
      }

      return Object.keys(errors).length ? errors : null;
    };
  }
}
