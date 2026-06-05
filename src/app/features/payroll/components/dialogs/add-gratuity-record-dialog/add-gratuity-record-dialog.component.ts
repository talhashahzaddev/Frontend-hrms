import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SharedCommonModule } from '@shared/shared-common.module';
export type GratuityRecordStatus = 'calculated' | 'approved' | 'paid' | 'cancelled';

export interface GratuityEmployeeOption {
  id: string;
  name: string;
  designation?: string;
}

export interface GratuityConfigOption {
  id: string;
  configRuleName: string;
  calculationType: 'peryear' | 'percentage' | 'fixed';
  calculationValue: number;
  yearsRequired: number;
}

export interface GratuityPeriodOption {
  id: string;
  name: string;
}

export interface GratuityRecordDialogPayload {
  configId: string;
  employeeId: string;
  periodId: string | null;
  paymentMethod: string;
  yearsWorked: number;
  lastSalary: number;
  gratuityAmount: number;
  status: GratuityRecordStatus;
  paidDate: string | null;
}

interface GratuityRecordDialogData {
  mode?: 'create' | 'edit';
  employees?: GratuityEmployeeOption[];
  configs?: GratuityConfigOption[];
  periods?: GratuityPeriodOption[];
  initialValue?: Partial<GratuityRecordDialogPayload>;
}


@Component({
  selector: 'app-add-gratuity-record-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedCommonModule,CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-gratuity-record-dialog.component.html',
  styleUrl: './add-gratuity-record-dialog.component.scss'
})
export class AddGratuityRecordDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddGratuityRecordDialogComponent, GratuityRecordDialogPayload | undefined>);

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';
  readonly employees = this.data?.employees ?? [];
  readonly configs = this.data?.configs ?? [];
  readonly periods = this.data?.periods ?? [];

  readonly form = this.fb.group({
    configId: ['', Validators.required],
    employeeId: ['', Validators.required],
    periodId: [''],
    paymentMethod: ['payroll_credit', Validators.required],
    yearsWorked: [0, [Validators.required, Validators.min(0)]],
    lastSalary: [0, [Validators.required, Validators.min(0)]],
    gratuityAmount: [{ value: 0, disabled: true }],
    status: ['calculated' as GratuityRecordStatus, Validators.required],
    paidDate: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: GratuityRecordDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        configId: this.data.initialValue.configId ?? '',
        employeeId: this.data.initialValue.employeeId ?? '',
        periodId: this.data.initialValue.periodId ?? '',
        paymentMethod: this.data.initialValue.paymentMethod ?? 'payroll_credit',
        yearsWorked: this.data.initialValue.yearsWorked ?? 0,
        lastSalary: this.data.initialValue.lastSalary ?? 0,
        status: this.data.initialValue.status ?? 'calculated',
        paidDate: this.data.initialValue.paidDate ?? ''
      });
    }

    this.form.get('configId')?.valueChanges.subscribe(() => this.updateGratuityAmount());
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

  get selectedConfig(): GratuityConfigOption | null {
    const configId = this.form.get('configId')?.value;
    return this.configs.find(c => c.id === configId) ?? null;
  }

  get calcHint(): string {
    const cfg = this.selectedConfig;
    if (!cfg) return '';
    if (cfg.calculationType === 'peryear') return `${cfg.calculationValue.toLocaleString()} × years worked`;
    if (cfg.calculationType === 'percentage') return `${cfg.calculationValue}% of last salary`;
    return `Fixed: ${cfg.calculationValue.toLocaleString()}`;
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
      configId: String(raw.configId ?? ''),
      employeeId: String(raw.employeeId ?? ''),
      periodId: raw.periodId ? String(raw.periodId) : null,
      paymentMethod: String(raw.paymentMethod ?? 'payroll_credit'),
      yearsWorked: Number(raw.yearsWorked ?? 0),
      lastSalary: Number(raw.lastSalary ?? 0),
      gratuityAmount: Number(raw.gratuityAmount ?? 0),
      status: (raw.status ?? 'calculated') as GratuityRecordStatus,
      paidDate: raw.status === 'paid' && raw.paidDate ? String(raw.paidDate) : null
    });
  }

  private updateGratuityAmount(): void {
    const config = this.selectedConfig;
    const years = Number(this.form.get('yearsWorked')?.value ?? 0);
    const salary = Number(this.form.get('lastSalary')?.value ?? 0);

    let amount = 0;
    if (config) {
      if (config.calculationType === 'peryear') {
        amount = config.calculationValue * Math.max(0, years);
      } else if (config.calculationType === 'percentage') {
        amount = Math.max(0, salary) * config.calculationValue / 100;
      } else {
        amount = config.calculationValue;
      }
    }

    this.form.get('gratuityAmount')?.setValue(Math.max(0, amount), { emitEvent: false });
  }
}
