import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

export interface PerformanceDialogResult {
  employee: string;
  designation: string;
  payrollPeriod: string;
  performanceId: string;
  score: number;
  rating: 'Excellent' | 'Good' | 'Average' | 'Below average';
  amount: number;
  calculatedAt: string;
}

interface EmployeeOption {
  name: string;
  designation: string;
}

interface PerformanceDialogData {
  mode?: 'create' | 'edit';
  initialValue?: Partial<PerformanceDialogResult>;
  employees?: EmployeeOption[];
}

@Component({
  selector: 'app-add-performance-pay-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './add-performance-pay-dialog.component.html',
  styleUrl: './add-performance-pay-dialog.component.scss'
})
export class AddPerformancePayDialogComponent {
  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';

  readonly employees = this.data?.employees ?? [
    { name: 'Ali Hassan', designation: 'Senior Editor' },
    { name: 'Sara Ahmed', designation: 'Content Strategist' },
    { name: 'Usman Khan', designation: 'HR Associate' },
    { name: 'Fatima Malik', designation: 'Graphic Designer' },
    { name: 'Bilal Raza', designation: 'Copywriter' }
  ];

  readonly form = this.fb.group({
    employee: ['', Validators.required],
    payrollPeriod: ['October 2024', Validators.required],
    performanceId: ['REF-PR-001', Validators.required],
    score: [85, [Validators.required, Validators.min(0), Validators.max(100)]],
    rating: ['Excellent' as const, Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]]
  });

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddPerformancePayDialogComponent, PerformanceDialogResult | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: PerformanceDialogData
  ) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        employee: this.data.initialValue.employee ?? '',
        payrollPeriod: this.data.initialValue.payrollPeriod ?? 'October 2024',
        performanceId: this.data.initialValue.performanceId ?? 'REF-PR-001',
        score: this.data.initialValue.score ?? 85,
        rating: (this.data.initialValue.rating ?? 'Excellent') as 'Excellent',
        amount: this.data.initialValue.amount ?? 0
      });
    }
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit performance pay' : 'Add performance pay';
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
    const selectedEmployee = this.employees.find((employee) => employee.name === value.employee);

    this.dialogRef.close({
      employee: value.employee ?? '',
      designation: this.data?.initialValue?.designation ?? selectedEmployee?.designation ?? 'Employee',
      payrollPeriod: value.payrollPeriod ?? '',
      performanceId: value.performanceId ?? '',
      score: Number(value.score ?? 0),
      rating: (value.rating ?? 'Excellent') as PerformanceDialogResult['rating'],
      amount: Number(value.amount ?? 0),
      calculatedAt: this.data?.initialValue?.calculatedAt ?? '24 Oct, 2024'
    });
  }
}
