import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

export interface BonusDialogResult {
  employee: string;
  payrollPeriod: string;
  type: 'Fixed' | 'Performance' | 'Festival' | 'Referral';
  amount: number;
  status: 'Active' | 'Cancelled';
  description: string;
}

interface BonusDialogData {
  mode?: 'create' | 'edit';
  initialValue?: Partial<BonusDialogResult>;
  employees?: string[];
}

@Component({
  selector: 'app-add-bonus-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './add-bonus-dialog.component.html',
  styleUrl: './add-bonus-dialog.component.scss'
})
export class AddBonusDialogComponent {
  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';

  readonly employees = this.data?.employees ?? [
    'Ali Hassan',
    'Sara Ahmed',
    'Usman Khan',
    'Fatima Malik',
    'Bilal Raza',
    'Nadia Qureshi',
    'Kamran Tariq'
  ];

  readonly form = this.fb.group({
    employee: ['', Validators.required],
    payrollPeriod: ['Oct 2023', Validators.required],
    type: ['Fixed' as const, Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    status: ['Active' as const, Validators.required],
    description: ['', [Validators.required, Validators.maxLength(250)]]
  });

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddBonusDialogComponent, BonusDialogResult | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: BonusDialogData
  ) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        employee: this.data.initialValue.employee ?? '',
        payrollPeriod: this.data.initialValue.payrollPeriod ?? 'Oct 2023',
        type: (this.data.initialValue.type ?? 'Fixed') as 'Fixed',
        amount: this.data.initialValue.amount ?? null,
        status: (this.data.initialValue.status ?? 'Active') as 'Active',
        description: this.data.initialValue.description ?? ''
      });
    }
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit bonus record' : 'Add bonus record';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Update record' : 'Save record';
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.dialogRef.close({
      employee: value.employee ?? '',
      payrollPeriod: value.payrollPeriod ?? '',
      type: (value.type ?? 'Fixed') as BonusDialogResult['type'],
      amount: Number(value.amount ?? 0),
      status: (value.status ?? 'Active') as BonusDialogResult['status'],
      description: value.description ?? ''
    });
  }
}
