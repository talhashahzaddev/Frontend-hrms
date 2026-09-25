import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface AddTaxEntryEmployeeOption {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

export interface AddTaxEntryPeriodOption {
  id: string;
  name: string;
}

export interface AddTaxEntryCategoryOption {
  id: string;
  name: string;
}

export interface AddTaxEntryDialogPayload {
  employeeId: string;
  periodId: string;
  categoryId: string;
  grossIncome: number;
  taxableIncome: number;
  taxAmount: number;
  monthlyTax: number;
}

interface AddTaxEntryDialogData {
  employees: AddTaxEntryEmployeeOption[];
  periods: AddTaxEntryPeriodOption[];
  categories: AddTaxEntryCategoryOption[];
}


@Component({
  selector: 'app-add-tax-entry',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedCommonModule,CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-tax-entry.component.html',
  styleUrl: './add-tax-entry.component.scss'
})
export class AddTaxEntryDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<AddTaxEntryDialogComponent, AddTaxEntryDialogPayload | undefined>
  );

  readonly employees = this.data?.employees ?? [];
  readonly periods = this.data?.periods ?? [];
  readonly categories = this.data?.categories ?? [];

  readonly form = this.fb.group({
    employeeId: ['', Validators.required],
    periodId: ['', Validators.required],
    categoryId: ['', Validators.required],
    grossIncome: [null as number | null, [Validators.required, Validators.min(0)]],
    taxableIncome: [null as number | null, [Validators.required, Validators.min(0)]],
    taxAmount: [null as number | null, [Validators.required, Validators.min(0)]],
    monthlyTax: [null as number | null, [Validators.required, Validators.min(0)]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: AddTaxEntryDialogData) {}

  getEmployeeDisplayName(employee: AddTaxEntryEmployeeOption): string {
    const fullName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim();
    return fullName || employee.employeeCode || employee.employeeId;
  }

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.dialogRef.close({
      employeeId: String(raw.employeeId ?? '').trim(),
      periodId: String(raw.periodId ?? '').trim(),
      categoryId: String(raw.categoryId ?? '').trim(),
      grossIncome: this.toNumber(raw.grossIncome),
      taxableIncome: this.toNumber(raw.taxableIncome),
      taxAmount: this.toNumber(raw.taxAmount),
      monthlyTax: this.toNumber(raw.monthlyTax)
    });
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
