import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface RequestSalaryAdvanceDialogPayload {
  totalAmount: number;
  monthlyDeduction: number;
  reason: string;
}

interface RequestSalaryAdvanceDialogData {
  currencySymbol?: string;
  initialValue?: Partial<RequestSalaryAdvanceDialogPayload>;
}

@Component({
  selector: 'app-request-salary-advance-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './request-salary-advance-dialog.component.html',
  styleUrl: './request-salary-advance-dialog.component.scss'
})
export class RequestSalaryAdvanceDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<RequestSalaryAdvanceDialogComponent, RequestSalaryAdvanceDialogPayload | undefined>);

  readonly currencySymbol = this.data?.currencySymbol ?? 'PKR';

  readonly form = this.fb.group(
    {
      totalAmount: [null as number | null, [Validators.required, Validators.min(1)]],
      monthlyDeduction: [null as number | null, [Validators.required, Validators.min(1)]],
      reason: ['', [Validators.required, Validators.maxLength(500)]]
    },
    { validators: [this.formValidator()] }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: RequestSalaryAdvanceDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        totalAmount: this.data.initialValue.totalAmount ?? null,
        monthlyDeduction: this.data.initialValue.monthlyDeduction ?? null,
        reason: this.data.initialValue.reason ?? ''
      });
    }
  }

  get showDeductionError(): boolean {
    const control = this.form.get('monthlyDeduction');
    return !!control && (
      (control.touched && (control.hasError('required') || control.hasError('min')))
      || (control.touched && this.form.hasError('deductionExceedsAmount'))
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
      totalAmount: Number(raw.totalAmount ?? 0),
      monthlyDeduction: Number(raw.monthlyDeduction ?? 0),
      reason: String(raw.reason ?? '').trim()
    });
  }

  private formValidator(): ValidatorFn {
    return (group): ValidationErrors | null => {
      const amount = Number(group.get('totalAmount')?.value ?? 0);
      const deduction = Number(group.get('monthlyDeduction')?.value ?? 0);

      if (amount > 0 && deduction > amount) {
        return { deductionExceedsAmount: true };
      }

      return null;
    };
  }
}
