import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SharedCommonModule } from '@shared/shared-common.module';
export type SalaryAdvanceDialogStatus =
  | 'pending'
  | 'approved'
  | 'disbursed'
  | 'rejected'
  | 'deducted'
  | 'cancelled'
  | 'completed';

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
  status: SalaryAdvanceDialogStatus;
  amount: number;
  reason: string;
  rejectionReason?: string;
  deductedPeriodId?: string | null;
  disbursementNote?: string;

  // Legacy compatibility fields used by older payroll screens.
  periodId: string;
  totalAmount: number;
  monthlyDeduction: number;
}

interface SalaryAdvanceDialogData {
  mode?: 'create' | 'edit';
  employees?: SalaryAdvanceEmployeeOption[];
  periods?: SalaryAdvancePeriodOption[];
  initialValue?: Partial<SalaryAdvanceDialogPayload>;
  canSubmit?: boolean;
}


@Component({
  selector: 'app-add-salary-advance-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedCommonModule,CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
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
      status: ['pending' as SalaryAdvanceDialogStatus, Validators.required],
      amount: [null as number | null, [Validators.required, Validators.min(1)]],
      reason: ['', [Validators.required, Validators.maxLength(500)]],
      rejectionReason: [''],
      deductedPeriodId: [''],
      disbursementNote: ['']
    },
    { validators: [this.schemaFlowValidator()] }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: SalaryAdvanceDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        employeeId: this.data.initialValue.employeeId ?? '',
        status: this.data.initialValue.status ?? 'pending',
        amount: this.data.initialValue.amount ?? this.data.initialValue.totalAmount ?? null,
        reason: this.data.initialValue.reason ?? '',
        rejectionReason: this.data.initialValue.rejectionReason ?? '',
        deductedPeriodId: this.data.initialValue.deductedPeriodId ?? this.data.initialValue.periodId ?? '',
        disbursementNote: this.data.initialValue.disbursementNote ?? ''
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

  get showRejectedReasonField(): boolean {
    const status = this.form.get('status')?.value;
    return status === 'rejected';
  }

  get showDisbursementNoteField(): boolean {
    const status = this.form.get('status')?.value;
    return status === 'disbursed';
  }

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  get canSubmit(): boolean {
    return this.data?.canSubmit !== false;
  }

  get showRejectedReasonError(): boolean {
    const status = this.form.get('status')?.value;
    const control = this.form.get('rejectionReason');
    return status === 'rejected' && !!control && (control.touched || control.dirty) && this.form.hasError('rejectionReasonRequired');
  }

  get showDeductedPeriodError(): boolean {
    const status = this.form.get('status')?.value;
    const control = this.form.get('deductedPeriodId');
    return this.isEditMode
      && this.isDeductionPeriodRequired(String(status ?? ''))
      && !!control
      && (control.touched || control.dirty)
      && this.form.hasError('deductedPeriodRequired');
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
      employeeId: raw.employeeId ?? '',
      status: (raw.status ?? 'pending') as SalaryAdvanceDialogStatus,
      amount: Number(raw.amount ?? 0),
      reason: String(raw.reason ?? '').trim(),
      rejectionReason: String(raw.rejectionReason ?? '').trim() || undefined,
      deductedPeriodId: String(raw.deductedPeriodId ?? '').trim() || null,
      disbursementNote: String(raw.disbursementNote ?? '').trim() || undefined,

      // Legacy compatibility values for screens that still expect old names.
      periodId: String(raw.deductedPeriodId ?? '').trim(),
      totalAmount: Number(raw.amount ?? 0),
      monthlyDeduction: 0
    });
  }

  private schemaFlowValidator(): ValidatorFn {
    return (group): ValidationErrors | null => {
      if (!this.isEditMode) {
        return null;
      }

      const status = String(group.get('status')?.value ?? '').trim().toLowerCase();
      const rejectionReason = String(group.get('rejectionReason')?.value ?? '').trim();
      const deductedPeriodId = String(group.get('deductedPeriodId')?.value ?? '').trim();

      if (status === 'rejected' && !rejectionReason) {
        return { rejectionReasonRequired: true };
      }

      if (this.isDeductionPeriodRequired(status) && !deductedPeriodId) {
        return { deductedPeriodRequired: true };
      }

      return null;
    };
  }

  private isDeductionPeriodRequired(status: string): boolean {
    return status === 'deducted';
  }
}
