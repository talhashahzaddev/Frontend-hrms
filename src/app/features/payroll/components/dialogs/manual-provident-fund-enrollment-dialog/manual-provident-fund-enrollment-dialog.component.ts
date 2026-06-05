import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface ManualPfEnrollmentEmployeeOption {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

export interface ManualPfEnrollmentRuleOption {
  ruleId: string;
  ruleName: string;
  employeePct: number;
  employerPct: number;
}

export interface ManualPfEnrollmentDialogPayload {
  employeeId: string;
  ruleId: string;
  employeePct: number;
  employerPct: number;
  effectiveFrom: string;
}

interface ManualPfEnrollmentDialogData {
  employees: ManualPfEnrollmentEmployeeOption[];
  rules: ManualPfEnrollmentRuleOption[];
}


@Component({
  selector: 'app-manual-provident-fund-enrollment-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedCommonModule,CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './manual-provident-fund-enrollment-dialog.component.html',
  styleUrl: './manual-provident-fund-enrollment-dialog.component.scss'
})
export class ManualProvidentFundEnrollmentDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly dialogRef = inject(
    MatDialogRef<ManualProvidentFundEnrollmentDialogComponent, ManualPfEnrollmentDialogPayload | undefined>
  );

  readonly employees = this.data?.employees ?? [];
  readonly rules = this.data?.rules ?? [];

  readonly form = this.fb.group({
    employeeId: ['', Validators.required],
    ruleId: ['', Validators.required],
    employeePct: [{ value: null as number | null, disabled: true }],
    employerPct: [{ value: null as number | null, disabled: true }],
    effectiveFrom: [this.getTodayDate(), Validators.required]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: ManualPfEnrollmentDialogData) {
    this.form.get('ruleId')?.valueChanges.subscribe((ruleId) => {
      const selectedRule = this.rules.find((rule) => rule.ruleId === String(ruleId ?? '').trim());
      this.form.patchValue(
        {
          employeePct: selectedRule ? this.toNumber(selectedRule.employeePct) : null,
          employerPct: selectedRule ? this.toNumber(selectedRule.employerPct) : null
        },
        { emitEvent: false }
      );
    });
  }

  getEmployeeDisplayName(employee: ManualPfEnrollmentEmployeeOption): string {
    const fullName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim();
    return fullName || employee.employeeCode || employee.employeeId;
  }

  get canSubmit(): boolean {
    return this.authService.hasPermissionByActionKey('pf_admin_add');
  }

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (!this.canSubmit) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.dialogRef.close({
      employeeId: String(raw.employeeId ?? '').trim(),
      ruleId: String(raw.ruleId ?? '').trim(),
      employeePct: this.toNumber(raw.employeePct),
      employerPct: this.toNumber(raw.employerPct),
      effectiveFrom: String(raw.effectiveFrom ?? '').trim()
    });
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
