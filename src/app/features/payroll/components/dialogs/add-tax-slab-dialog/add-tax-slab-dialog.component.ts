import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SharedCommonModule } from '@shared/shared-common.module';
export type TaxSlabStatus = 'active' | 'inactive';

export interface TaxSlabDialogPayload {
  slabName: string;
  fiscalYear: string;
  status: TaxSlabStatus;
  minIncomePkr: number;
  maxIncomePkr: number | null;
  fixedAmountPkr: number;
  percentage: number;
}

interface TaxSlabDialogData {
  mode?: 'create' | 'edit';
  fiscalYears?: string[];
  initialValue?: Partial<TaxSlabDialogPayload>;
}


@Component({
  selector: 'app-add-tax-slab-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedCommonModule,CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-tax-slab-dialog.component.html',
  styleUrl: './add-tax-slab-dialog.component.scss'
})
export class AddTaxSlabDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddTaxSlabDialogComponent, TaxSlabDialogPayload | undefined>);

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';
  readonly fiscalYears = this.data?.fiscalYears?.length
    ? this.data.fiscalYears
    : ['2023-2024', '2024-2025', '2025-2026'];

  readonly form = this.fb.group(
    {
      slabName: ['', [Validators.required, Validators.maxLength(120)]],
      fiscalYear: ['2024-2025', Validators.required],
      status: ['active' as TaxSlabStatus, Validators.required],
      minIncomePkr: [0, [Validators.required, Validators.min(0)]],
      maxIncomePkr: [null as number | null, [Validators.min(0)]],
      fixedAmountPkr: [0, [Validators.required, Validators.min(0)]],
      percentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
    },
    { validators: [this.rangeValidator()] }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: TaxSlabDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        slabName: this.data.initialValue.slabName ?? '',
        fiscalYear: this.data.initialValue.fiscalYear ?? '2024-2025',
        status: this.data.initialValue.status ?? 'active',
        minIncomePkr: this.data.initialValue.minIncomePkr ?? 0,
        maxIncomePkr: this.data.initialValue.maxIncomePkr ?? null,
        fixedAmountPkr: this.data.initialValue.fixedAmountPkr ?? 0,
        percentage: this.data.initialValue.percentage ?? 0
      });
    }
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit slab' : 'Add slab';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Save changes' : 'Save slab';
  }

  get showRangeError(): boolean {
    const minControl = this.form.get('minIncomePkr');
    const maxControl = this.form.get('maxIncomePkr');

    return !!(
      this.form.hasError('invalidIncomeRange')
      && ((minControl?.touched ?? false) || (maxControl?.touched ?? false))
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
    const maxIncomeRaw = raw.maxIncomePkr;

    this.dialogRef.close({
      slabName: String(raw.slabName ?? '').trim(),
      fiscalYear: String(raw.fiscalYear ?? ''),
      status: (raw.status ?? 'active') as TaxSlabStatus,
      minIncomePkr: Number(raw.minIncomePkr ?? 0),
      maxIncomePkr: maxIncomeRaw == null ? null : Number(maxIncomeRaw),
      fixedAmountPkr: Number(raw.fixedAmountPkr ?? 0),
      percentage: Number(raw.percentage ?? 0)
    });
  }

  private rangeValidator(): ValidatorFn {
    return (group): ValidationErrors | null => {
      const minIncome = Number(group.get('minIncomePkr')?.value ?? 0);
      const maxIncomeRaw = group.get('maxIncomePkr')?.value;
      const maxIncome = maxIncomeRaw == null ? null : Number(maxIncomeRaw);

      if (maxIncome != null && maxIncome < minIncome) {
        return { invalidIncomeRange: true };
      }

      return null;
    };
  }
}
