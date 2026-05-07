import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
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
  configs?: SocialSecurityTransactionConfigOption[];
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
  readonly configs = this.data?.configs ?? [];
  readonly rules = this.data?.rules ?? [];

  readonly form = this.fb.group(
    {
      employeeIds: this.fb.nonNullable.control<string[]>([], Validators.required),
      periodId: this.fb.nonNullable.control('', Validators.required),
      configId: this.fb.nonNullable.control(''),
      ruleId: this.fb.nonNullable.control(''),
      actualSalary: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
      isEnrolled: this.fb.nonNullable.control(true),
      requestStatus: this.fb.nonNullable.control('pending', Validators.required)
    },
    { validators: [this.configOrRuleValidator()] }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: SocialSecurityBulkAssignDialogData) {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (code) => this.currencySymbol.set(this.settingsService.getCurrencySymbol(code)),
        error: () => this.currencySymbol.set(this.settingsService.getCurrencySymbol())
      });

    this.form.get('configId')?.valueChanges.subscribe((configId) => {
      const selectedConfig = this.configs.find((config) => config.id === String(configId ?? ''));
      if (!selectedConfig) {
        return;
      }

      if (!this.form.get('ruleId')?.value && selectedConfig.ruleId) {
        const linkedRule = this.rules.find((rule) => rule.ruleId === selectedConfig.ruleId);
        if (this.isRuleActive(linkedRule)) {
          this.form.patchValue({ ruleId: selectedConfig.ruleId }, { emitEvent: false });
        }
      }

      this.form.updateValueAndValidity({ emitEvent: false });
    });

    this.form.get('ruleId')?.valueChanges.subscribe(() => {
      this.form.updateValueAndValidity({ emitEvent: false });
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

  get showConfigOrRuleError(): boolean {
    return this.form.hasError('missingConfigOrRule')
      && (this.form.get('configId')?.touched || this.form.get('ruleId')?.touched || this.form.touched);
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
      configId: raw.configId ? String(raw.configId).trim() : null,
      ruleId: raw.ruleId ? String(raw.ruleId).trim() : null,
      actualSalary: Number(raw.actualSalary ?? 0),
      isEnrolled: !!raw.isEnrolled,
      requestStatus: String(raw.requestStatus ?? 'pending').trim().toLowerCase()
    });
  }

  private configOrRuleValidator(): ValidatorFn {
    return (group): ValidationErrors | null => {
      const configId = String(group.get('configId')?.value ?? '').trim();
      const ruleId = String(group.get('ruleId')?.value ?? '').trim();

      if (!configId && !ruleId) {
        return { missingConfigOrRule: true };
      }

      return null;
    };
  }

  private isRuleActive(rule?: SocialSecurityTransactionRuleOption | null): boolean {
    if (!rule) {
      return false;
    }
    return rule.isActive ?? true;
  }
}
