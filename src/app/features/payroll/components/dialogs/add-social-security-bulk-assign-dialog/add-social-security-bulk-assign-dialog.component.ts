import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs';

import {
  SocialSecurityTransactionConfigOption,
  SocialSecurityTransactionEmployeeOption,
  SocialSecurityTransactionPeriodOption,
  SocialSecurityTransactionRuleOption
} from '../add-social-security-transaction-dialog/add-social-security-transaction-dialog.component';
import { SettingsService } from '../../../../settings/services/settings.service';

export interface SocialSecurityBulkAssignDialogPayload {
  employeeIds: string[];
  periodId: string;
  configId: string | null;
  ruleId: string | null;
  actualSalary: number;
  isEnrolled: boolean;
  requestStatus: string;
}

interface SocialSecurityBulkAssignDialogData {
  employees?: SocialSecurityTransactionEmployeeOption[];
  periods?: SocialSecurityTransactionPeriodOption[];
  configs?: SocialSecurityTransactionConfigOption[]; // legacy; ignored
  rules?: SocialSecurityTransactionRuleOption[];
}

@Component({
  selector: 'app-add-social-security-bulk-assign-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-social-security-bulk-assign-dialog.component.html',
  styleUrl: './add-social-security-bulk-assign-dialog.component.scss'
})
export class AddSocialSecurityBulkAssignDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddSocialSecurityBulkAssignDialogComponent, SocialSecurityBulkAssignDialogPayload | undefined>);
  private readonly settingsService = inject(SettingsService);

  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  readonly employees = this.data?.employees ?? [];
  readonly periods = this.data?.periods ?? [];
  readonly rules = this.data?.rules ?? [];

  readonly form = this.fb.group({
    employeeIds: this.fb.nonNullable.control<string[]>([], Validators.required),
    periodId: this.fb.nonNullable.control('', Validators.required),
    ruleId: this.fb.nonNullable.control('', Validators.required),
    actualSalary: this.fb.nonNullable.control(0, [Validators.required, Validators.min(1)]),
    isEnrolled: this.fb.nonNullable.control(true),
    requestStatus: this.fb.nonNullable.control('pending', Validators.required)
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: SocialSecurityBulkAssignDialogData) {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (code) => this.currencySymbol.set(this.settingsService.getCurrencySymbol(code)),
        error: () => this.currencySymbol.set(this.settingsService.getCurrencySymbol())
      });

    const initialRuleId = String(this.form.get('ruleId')?.value ?? '');
    if (initialRuleId && !this.isRuleActive(this.rules.find((rule) => rule.ruleId === initialRuleId))) {
      this.form.patchValue({ ruleId: '' }, { emitEvent: false });
    }
  }

  get availableRules(): SocialSecurityTransactionRuleOption[] {
    return this.rules.filter((rule) => this.isRuleActive(rule));
  }

  get selectedEmployeesCount(): number {
    return (this.form.get('employeeIds')?.value ?? []).length;
  }

  get showEmployeeError(): boolean {
    const control = this.form.get('employeeIds');
    return !!control && control.invalid && (control.touched || this.form.touched);
  }

  toggleEmployee(employeeId: string): void {
    const current = [...(this.form.get('employeeIds')?.value ?? [])] as string[];
    const index = current.indexOf(employeeId);

    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(employeeId);
    }

    this.form.patchValue({ employeeIds: current });
    this.form.get('employeeIds')?.markAsTouched();
  }

  isEmployeeSelected(employeeId: string): boolean {
    const selected = this.form.get('employeeIds')?.value ?? [];
    return selected.includes(employeeId);
  }

  selectAllEmployees(): void {
    this.form.patchValue({ employeeIds: this.employees.map((employee) => employee.id) });
    this.form.get('employeeIds')?.markAsTouched();
  }

  clearEmployees(): void {
    this.form.patchValue({ employeeIds: [] });
    this.form.get('employeeIds')?.markAsTouched();
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
      employeeIds: [...(raw.employeeIds ?? [])].map((value) => String(value)),
      periodId: String(raw.periodId ?? '').trim(),
      configId: null,
      ruleId: raw.ruleId ? String(raw.ruleId).trim() : null,
      actualSalary: Number(raw.actualSalary ?? 0),
      isEnrolled: !!raw.isEnrolled,
      requestStatus: String(raw.requestStatus ?? 'pending').trim().toLowerCase()
    });
  }

  private isRuleActive(rule?: SocialSecurityTransactionRuleOption | null): boolean {
    if (!rule) {
      return false;
    }
    return rule.isActive ?? true;
  }
}
