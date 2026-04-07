import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type GratuityRecordStatus = 'calculated' | 'approved' | 'paid';

export interface GratuityEmployeeOption {
  id: string;
  name: string;
  designation?: string;
}

export interface GratuityRecordDialogPayload {
  employeeId: string;
  yearsWorked: number;
  lastSalary: number;
  gratuityAmount: number;
  status: GratuityRecordStatus;
  paidDate: string | null;
}

interface GratuityRecordDialogData {
  mode?: 'create' | 'edit';
  employees?: GratuityEmployeeOption[];
  initialValue?: Partial<GratuityRecordDialogPayload>;
}

@Component({
  selector: 'app-add-gratuity-record-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-gratuity-record-dialog.component.html',
  styleUrl: './add-gratuity-record-dialog.component.scss'
})
export class AddGratuityRecordDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddGratuityRecordDialogComponent, GratuityRecordDialogPayload | undefined>);

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';
  readonly employees = this.data?.employees ?? [];

  readonly form = this.fb.group({
    employeeId: ['', Validators.required],
    yearsWorked: [0, [Validators.required, Validators.min(0)]],
    lastSalary: [0, [Validators.required, Validators.min(0)]],
    gratuityAmount: [{ value: 0, disabled: true }],
    status: ['calculated' as GratuityRecordStatus, Validators.required],
    paidDate: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: GratuityRecordDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        employeeId: this.data.initialValue.employeeId ?? '',
        yearsWorked: this.data.initialValue.yearsWorked ?? 0,
        lastSalary: this.data.initialValue.lastSalary ?? 0,
        status: this.data.initialValue.status ?? 'calculated',
        paidDate: this.data.initialValue.paidDate ?? ''
      });
    }

    this.form.get('yearsWorked')?.valueChanges.subscribe(() => this.updateGratuityAmount());
    this.form.get('lastSalary')?.valueChanges.subscribe(() => this.updateGratuityAmount());
    this.form.get('status')?.valueChanges.subscribe((status) => {
      if (status !== 'paid') {
        this.form.patchValue({ paidDate: '' }, { emitEvent: false });
      }
    });

    this.updateGratuityAmount();
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit gratuity record' : 'Add gratuity record';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Save changes' : 'Save record';
  }

  get isPaidStatus(): boolean {
    return this.form.get('status')?.value === 'paid';
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
      yearsWorked: Number(raw.yearsWorked ?? 0),
      lastSalary: Number(raw.lastSalary ?? 0),
      gratuityAmount: Number(raw.gratuityAmount ?? 0),
      status: (raw.status ?? 'calculated') as GratuityRecordStatus,
      paidDate: raw.status === 'paid' && raw.paidDate ? String(raw.paidDate) : null
    });
  }

  private updateGratuityAmount(): void {
    const yearsWorked = Number(this.form.get('yearsWorked')?.value ?? 0);
    const lastSalary = Number(this.form.get('lastSalary')?.value ?? 0);
    const gratuityAmount = Math.max(0, yearsWorked) * Math.max(0, lastSalary);

    this.form.get('gratuityAmount')?.setValue(gratuityAmount, { emitEvent: false });
  }
}
