import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type SalaryAdvanceDialogStatus = 'pending' | 'approved' | 'completed' | 'cancelled';

export interface SalaryAdvanceEmployeeOption {
  id: string;
  name: string;
  designation: string;
}

export interface SalaryAdvancePeriodOption {
  id: string;
  name: string;
}

export interface SalaryAdvanceDialogPayload {
  employeeId: string;
  periodId: string;
  status: SalaryAdvanceDialogStatus;
  totalAmount: number;
  monthlyDeduction: number;
  reason: string;
}

interface SalaryAdvanceDialogData {
  mode?: 'create' | 'edit';
  employees?: SalaryAdvanceEmployeeOption[];
  periods?: SalaryAdvancePeriodOption[];
  initialValue?: Partial<SalaryAdvanceDialogPayload>;
}

@Component({
  selector: 'app-add-salary-advance-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-salary-advance-dialog.component.html',
  styleUrl: './add-salary-advance-dialog.component.scss'
})
export class AddSalaryAdvanceDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddSalaryAdvanceDialogComponent, SalaryAdvanceDialogPayload | undefined>);

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';
  readonly employees = this.data?.employees ?? [];
  readonly periods = this.data?.periods ?? [];

  readonly form = this.fb.group(
    {
      employeeId: ['', Validators.required],
      periodId: ['', Validators.required],
      status: ['pending' as SalaryAdvanceDialogStatus, Validators.required],
      totalAmount: [null as number | null, [Validators.required, Validators.min(1)]],
      monthlyDeduction: [null as number | null, [Validators.required, Validators.min(0)]],
      reason: ['', [Validators.required, Validators.maxLength(500)]]
    },
    { validators: [this.amountValidator()] }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: SalaryAdvanceDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        employeeId: this.data.initialValue.employeeId ?? '',
        periodId: this.data.initialValue.periodId ?? '',
        status: this.data.initialValue.status ?? 'pending',
        totalAmount: this.data.initialValue.totalAmount ?? null,
        monthlyDeduction: this.data.initialValue.monthlyDeduction ?? null,
        reason: this.data.initialValue.reason ?? ''
      });
    }

    if (this.mode === 'edit') {
      this.form.get('employeeId')?.disable();
    }
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit salary advance' : 'Add salary advance';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Update record' : 'Save record';
  }

  get showDeductionError(): boolean {
    const deductionControl = this.form.get('monthlyDeduction');
    return !!deductionControl && (
      (deductionControl.touched && (deductionControl.hasError('required') || deductionControl.hasError('min')))
      || (deductionControl.touched && this.form.hasError('deductionGreaterThanAmount'))
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
      periodId: raw.periodId ?? '',
      status: (raw.status ?? 'pending') as SalaryAdvanceDialogStatus,
      totalAmount: Number(raw.totalAmount ?? 0),
      monthlyDeduction: Number(raw.monthlyDeduction ?? 0),
      reason: String(raw.reason ?? '').trim()
    });
  }

  private amountValidator(): ValidatorFn {
    return (group): ValidationErrors | null => {
      const amount = Number(group.get('totalAmount')?.value ?? 0);
      const deduction = Number(group.get('monthlyDeduction')?.value ?? 0);

      if (amount > 0 && deduction > amount) {
        return { deductionGreaterThanAmount: true };
      }

      return null;
    };
  }
}
