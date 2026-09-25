import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SharedCommonModule } from '@shared/shared-common.module';
export type RepaymentDialogType = 'loan' | 'advance';

export interface RepaymentEmployeeOption {
  id: string;
  name: string;
}

export interface RepaymentPeriodOption {
  id: string;
  name: string;
}

export interface RepaymentReferenceOption {
  id: string;
  type: RepaymentDialogType;
  employeeId: string;
  label: string;
  remainingAmount: number;
}

export interface RepaymentDialogPayload {
  employeeId: string;
  type: RepaymentDialogType;
  referenceId: string;
  periodId: string;
  amount: number;
  remainingAfter: number;
  paidDate: string | null;
  status: 'pending' | 'deducted' | 'skipped';
}

interface RepaymentDialogData {
  mode?: 'create' | 'edit';
  employees?: RepaymentEmployeeOption[];
  periods?: RepaymentPeriodOption[];
  references?: RepaymentReferenceOption[];
  initialValue?: Partial<RepaymentDialogPayload>;
}


@Component({
  selector: 'app-add-repayment-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedCommonModule,CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-repayment-dialog.component.html',
  styleUrl: './add-repayment-dialog.component.scss'
})
export class AddRepaymentDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddRepaymentDialogComponent, RepaymentDialogPayload | undefined>);

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';
  readonly employees = this.data?.employees ?? [];
  readonly periods = this.data?.periods ?? [];
  readonly references = this.data?.references ?? [];

  readonly form = this.fb.group(
    {
      employeeId: ['', Validators.required],
      type: ['loan' as RepaymentDialogType, Validators.required],
      referenceId: ['', Validators.required],
      periodId: ['', Validators.required],
      amount: [null as number | null, [Validators.required, Validators.min(1)]],
      remainingAfter: [{ value: 0, disabled: true }],
      paidDate: [''],
      status: ['deducted' as 'pending' | 'deducted' | 'skipped', Validators.required]
    },
    { validators: [this.amountValidator()] }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: RepaymentDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        employeeId: this.data.initialValue.employeeId ?? '',
        type: this.data.initialValue.type ?? 'loan',
        referenceId: this.data.initialValue.referenceId ?? '',
        periodId: this.data.initialValue.periodId ?? '',
        amount: this.data.initialValue.amount ?? null,
        paidDate: this.data.initialValue.paidDate ?? '',
        status: this.data.initialValue.status ?? 'deducted'
      });
    }

    this.form.get('employeeId')?.valueChanges.subscribe(() => {
      this.reconcileReferenceSelection();
      this.updateRemainingAfter();
    });
    this.form.get('type')?.valueChanges.subscribe(() => {
      this.reconcileReferenceSelection();
      this.updateRemainingAfter();
    });
    this.form.get('referenceId')?.valueChanges.subscribe(() => this.updateRemainingAfter());
    this.form.get('amount')?.valueChanges.subscribe(() => this.updateRemainingAfter());

    this.updateRemainingAfter();
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit repayment record' : 'Add repayment record';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Update record' : 'Save record';
  }

  get filteredReferences(): RepaymentReferenceOption[] {
    const formValue = this.form.getRawValue();
    const type = (formValue.type ?? 'loan') as RepaymentDialogType;
    const employeeId = String(formValue.employeeId ?? '').trim();

    return this.references.filter((reference) => {
      const typeMatches = reference.type === type;
      const employeeMatches = !employeeId || reference.employeeId === employeeId;
      return typeMatches && employeeMatches;
    });
  }

  get showAmountError(): boolean {
    const amountControl = this.form.get('amount');
    return !!amountControl && (
      (amountControl.touched && (amountControl.hasError('required') || amountControl.hasError('min')))
      || (amountControl.touched && this.form.hasError('amountExceedsRemaining'))
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
      type: (raw.type ?? 'loan') as RepaymentDialogType,
      referenceId: String(raw.referenceId ?? ''),
      periodId: String(raw.periodId ?? ''),
      amount: Number(raw.amount ?? 0),
      remainingAfter: Number(raw.remainingAfter ?? 0),
      paidDate: raw.paidDate ? String(raw.paidDate) : null,
      status: (raw.status ?? 'deducted') as 'pending' | 'deducted' | 'skipped'
    });
  }

  private reconcileReferenceSelection(): void {
    const activeReferenceId = String(this.form.getRawValue().referenceId ?? '');
    if (!activeReferenceId) {
      return;
    }

    const stillExists = this.filteredReferences.some((reference) => reference.id === activeReferenceId);
    if (!stillExists) {
      this.form.patchValue({ referenceId: '' });
    }
  }

  private updateRemainingAfter(): void {
    const raw = this.form.getRawValue();
    const referenceId = String(raw.referenceId ?? '').trim();
    const amount = Number(raw.amount ?? 0);
    const reference = this.references.find((item) => item.id === referenceId);
    const remainingBase = Number(reference?.remainingAmount ?? 0);

    this.form.get('remainingAfter')?.setValue(Math.max(0, remainingBase - Math.max(0, amount)), { emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  private amountValidator(): ValidatorFn {
    return (group): ValidationErrors | null => {
      const referenceId = String(group.get('referenceId')?.value ?? '').trim();
      const amount = Number(group.get('amount')?.value ?? 0);
      const reference = this.references.find((item) => item.id === referenceId);
      const remaining = Number(reference?.remainingAmount ?? 0);

      if (remaining > 0 && amount > remaining) {
        return { amountExceedsRemaining: true };
      }

      return null;
    };
  }
}
