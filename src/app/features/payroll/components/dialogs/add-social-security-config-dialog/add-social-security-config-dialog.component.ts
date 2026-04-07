import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type SocialSecurityConfigStatus = 'active' | 'inactive';

export interface SocialSecurityConfigDialogPayload {
  configName: string;
  employeeContributionPct: number;
  employerContributionPct: number;
  maxSalaryCapPkr: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SocialSecurityConfigStatus;
}

interface SocialSecurityConfigDialogData {
  mode?: 'create' | 'edit';
  initialValue?: Partial<SocialSecurityConfigDialogPayload>;
}

@Component({
  selector: 'app-add-social-security-config-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-social-security-config-dialog.component.html',
  styleUrl: './add-social-security-config-dialog.component.scss'
})
export class AddSocialSecurityConfigDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddSocialSecurityConfigDialogComponent, SocialSecurityConfigDialogPayload | undefined>);

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';

  readonly form = this.fb.group(
    {
      configName: ['', [Validators.required, Validators.maxLength(150)]],
      employeeContributionPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      employerContributionPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      maxSalaryCapPkr: [0, [Validators.required, Validators.min(0)]],
      effectiveFrom: ['', Validators.required],
      effectiveTo: [''],
      status: ['active' as SocialSecurityConfigStatus, Validators.required]
    },
    { validators: [this.dateRangeValidator()] }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: SocialSecurityConfigDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        configName: this.data.initialValue.configName ?? '',
        employeeContributionPct: this.data.initialValue.employeeContributionPct ?? 0,
        employerContributionPct: this.data.initialValue.employerContributionPct ?? 0,
        maxSalaryCapPkr: this.data.initialValue.maxSalaryCapPkr ?? 0,
        effectiveFrom: this.data.initialValue.effectiveFrom ?? '',
        effectiveTo: this.data.initialValue.effectiveTo ?? '',
        status: this.data.initialValue.status ?? 'active'
      });
    }
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit social security config' : 'Add social security config';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Save changes' : 'Save config';
  }

  get showDateRangeError(): boolean {
    const fromControl = this.form.get('effectiveFrom');
    const toControl = this.form.get('effectiveTo');

    return !!(
      this.form.hasError('invalidDateRange')
      && ((fromControl?.touched ?? false) || (toControl?.touched ?? false))
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
      configName: String(raw.configName ?? '').trim(),
      employeeContributionPct: Number(raw.employeeContributionPct ?? 0),
      employerContributionPct: Number(raw.employerContributionPct ?? 0),
      maxSalaryCapPkr: Number(raw.maxSalaryCapPkr ?? 0),
      effectiveFrom: String(raw.effectiveFrom ?? ''),
      effectiveTo: raw.effectiveTo ? String(raw.effectiveTo) : null,
      status: (raw.status ?? 'active') as SocialSecurityConfigStatus
    });
  }

  private dateRangeValidator(): ValidatorFn {
    return (group): ValidationErrors | null => {
      const from = String(group.get('effectiveFrom')?.value ?? '');
      const to = String(group.get('effectiveTo')?.value ?? '');

      if (from && to && to < from) {
        return { invalidDateRange: true };
      }

      return null;
    };
  }
}
