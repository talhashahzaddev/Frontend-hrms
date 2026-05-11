import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs';

import { SettingsService } from '../../../../settings/services/settings.service';

export type SocialSecurityConfigStatus = 'active' | 'inactive';

export interface SocialSecurityConfigDialogPayload {
  configName: string;
  description: string | null;
  jurisdictionId: string | null;
  authorityId: string | null;
  schemeId: string | null;
  ruleId: string | null;
  contributionBasis: string;
  employeeContributionPct: number;
  employerContributionPct: number;
  employeeFixedAmount: number | null;
  employerFixedAmount: number | null;
  minSalaryLimit: number | null;
  maxSalaryCapPkr: number;
  isStatutory: boolean;
  allowVoluntary: boolean;
  allowWithdrawal: boolean;
  metadata: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SocialSecurityConfigStatus;
}

export interface SocialSecurityConfigDialogJurisdictionOption {
  jurisdictionId: string;
  jurisdictionCode: string;
  jurisdictionName: string;
}

export interface SocialSecurityConfigDialogAuthorityOption {
  authorityId: string;
  jurisdictionId: string;
  authorityCode: string;
  authorityName: string;
  portalUrl?: string;
}

export interface SocialSecurityConfigDialogSchemeOption {
  schemeId: string;
  jurisdictionId: string;
  authorityId?: string;
  schemeCode: string;
  schemeName: string;
}

export interface SocialSecurityConfigDialogRuleOption {
  ruleId: string;
  schemeId: string;
  ruleName: string;
  isActive?: boolean;
  contributionBasis?: string;
  employeeDefaultPct?: number;
  employerDefaultPct?: number;
  employeeFixedAmount?: number | null;
  employerFixedAmount?: number | null;
  minSalaryLimit?: number | null;
  maxSalaryLimit?: number | null;
}

interface SocialSecurityConfigDialogData {
  mode?: 'create' | 'edit';
  initialValue?: Partial<SocialSecurityConfigDialogPayload>;
  jurisdictions?: SocialSecurityConfigDialogJurisdictionOption[];
  authorities?: SocialSecurityConfigDialogAuthorityOption[];
  schemes?: SocialSecurityConfigDialogSchemeOption[];
  rules?: SocialSecurityConfigDialogRuleOption[];
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
  private readonly settingsService = inject(SettingsService);

  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';
  readonly jurisdictions = this.data?.jurisdictions ?? [];
  readonly authorities = this.data?.authorities ?? [];
  readonly schemes = this.data?.schemes ?? [];
  readonly rules = this.data?.rules ?? [];

  readonly form = this.fb.group(
    {
      configName: ['', [Validators.required, Validators.maxLength(150)]],
      description: [''],
      jurisdictionId: ['', Validators.required],
      authorityId: [''],
      schemeId: ['', Validators.required],
      ruleId: [''],
      contributionBasis: ['gross', Validators.required],
      employeeContributionPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      employerContributionPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      employeeFixedAmount: [null as number | null, [Validators.min(0)]],
      employerFixedAmount: [null as number | null, [Validators.min(0)]],
      minSalaryLimit: [null as number | null, [Validators.min(0)]],
      maxSalaryCapPkr: [0, [Validators.required, Validators.min(0)]],
      isStatutory: [true],
      allowVoluntary: [false],
      allowWithdrawal: [true],
      metadata: [''],
      effectiveFrom: ['', Validators.required],
      effectiveTo: [''],
      status: ['active' as SocialSecurityConfigStatus, Validators.required]
    },
    { validators: [this.dateRangeValidator()] }
  );

  constructor(@Inject(MAT_DIALOG_DATA) public data: SocialSecurityConfigDialogData) {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (code) => this.currencySymbol.set(this.settingsService.getCurrencySymbol(code)),
        error: () => this.currencySymbol.set(this.settingsService.getCurrencySymbol())
      });

    if (this.data?.initialValue) {
      this.form.patchValue({
        configName: this.data.initialValue.configName ?? '',
        description: this.data.initialValue.description ?? '',
        jurisdictionId: this.data.initialValue.jurisdictionId ?? '',
        authorityId: this.data.initialValue.authorityId ?? '',
        schemeId: this.data.initialValue.schemeId ?? '',
        ruleId: this.data.initialValue.ruleId ?? '',
        contributionBasis: this.data.initialValue.contributionBasis ?? 'gross',
        employeeContributionPct: this.data.initialValue.employeeContributionPct ?? 0,
        employerContributionPct: this.data.initialValue.employerContributionPct ?? 0,
        employeeFixedAmount: this.data.initialValue.employeeFixedAmount ?? null,
        employerFixedAmount: this.data.initialValue.employerFixedAmount ?? null,
        minSalaryLimit: this.data.initialValue.minSalaryLimit ?? null,
        maxSalaryCapPkr: this.data.initialValue.maxSalaryCapPkr ?? 0,
        isStatutory: this.data.initialValue.isStatutory ?? true,
        allowVoluntary: this.data.initialValue.allowVoluntary ?? false,
        allowWithdrawal: this.data.initialValue.allowWithdrawal ?? true,
        metadata: this.data.initialValue.metadata ?? '',
        effectiveFrom: this.data.initialValue.effectiveFrom ?? '',
        effectiveTo: this.data.initialValue.effectiveTo ?? '',
        status: this.data.initialValue.status ?? 'active'
      });

      const initialRuleId = String(this.data.initialValue.ruleId ?? '');
      if (initialRuleId && !this.isRuleActive(this.rules.find((rule) => rule.ruleId === initialRuleId))) {
        this.form.patchValue({ ruleId: '' }, { emitEvent: false });
      }
    }

    this.form.get('ruleId')?.valueChanges.subscribe((ruleId) => {
      const selectedRule = this.availableRules.find((rule) => rule.ruleId === String(ruleId ?? ''));
      if (!selectedRule) {
        return;
      }

      this.form.patchValue({
        contributionBasis: selectedRule.contributionBasis ?? this.form.get('contributionBasis')?.value ?? 'gross',
        employeeContributionPct: selectedRule.employeeDefaultPct ?? this.form.get('employeeContributionPct')?.value ?? 0,
        employerContributionPct: selectedRule.employerDefaultPct ?? this.form.get('employerContributionPct')?.value ?? 0,
        employeeFixedAmount: selectedRule.employeeFixedAmount ?? null,
        employerFixedAmount: selectedRule.employerFixedAmount ?? null,
        minSalaryLimit: selectedRule.minSalaryLimit ?? null,
        maxSalaryCapPkr: selectedRule.maxSalaryLimit == null ? (this.form.get('maxSalaryCapPkr')?.value ?? 0) : Number(selectedRule.maxSalaryLimit)
      }, { emitEvent: false });
    });
  }

  get availableAuthorities(): SocialSecurityConfigDialogAuthorityOption[] {
    const jurisdictionId = String(this.form.get('jurisdictionId')?.value ?? '');
    if (!jurisdictionId) {
      return this.authorities;
    }

    return this.authorities.filter((authority) => authority.jurisdictionId === jurisdictionId);
  }

  get availableSchemes(): SocialSecurityConfigDialogSchemeOption[] {
    const jurisdictionId = String(this.form.get('jurisdictionId')?.value ?? '');
    const authorityId = String(this.form.get('authorityId')?.value ?? '');

    return this.schemes.filter((scheme) => {
      const jurisdictionMatch = !jurisdictionId || scheme.jurisdictionId === jurisdictionId;
      const authorityMatch = !authorityId || !scheme.authorityId || scheme.authorityId === authorityId;
      return jurisdictionMatch && authorityMatch;
    });
  }

  get availableRules(): SocialSecurityConfigDialogRuleOption[] {
    const schemeId = String(this.form.get('schemeId')?.value ?? '');
    const activeRules = this.rules.filter((rule) => this.isRuleActive(rule));
    if (!schemeId) {
      return activeRules;
    }

    return activeRules.filter((rule) => rule.schemeId === schemeId);
  }

  onJurisdictionChanged(): void {
    const jurisdictionId = String(this.form.get('jurisdictionId')?.value ?? '');
    const authorityId = String(this.form.get('authorityId')?.value ?? '');
    const schemeId = String(this.form.get('schemeId')?.value ?? '');

    if (authorityId && !this.availableAuthorities.some((authority) => authority.authorityId === authorityId)) {
      this.form.patchValue({ authorityId: '' });
    }

    if (schemeId && !this.availableSchemes.some((scheme) => scheme.schemeId === schemeId)) {
      this.form.patchValue({ schemeId: '', ruleId: '' });
    }
  }

  onAuthorityChanged(): void {
    const schemeId = String(this.form.get('schemeId')?.value ?? '');
    if (schemeId && !this.availableSchemes.some((scheme) => scheme.schemeId === schemeId)) {
      this.form.patchValue({ schemeId: '', ruleId: '' });
    }
  }

  onSchemeChanged(): void {
    const ruleId = String(this.form.get('ruleId')?.value ?? '');
    if (ruleId && !this.availableRules.some((rule) => rule.ruleId === ruleId)) {
      this.form.patchValue({ ruleId: '' });
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
      description: raw.description ? String(raw.description).trim() : null,
      jurisdictionId: raw.jurisdictionId ? String(raw.jurisdictionId) : null,
      authorityId: raw.authorityId ? String(raw.authorityId) : null,
      schemeId: raw.schemeId ? String(raw.schemeId) : null,
      ruleId: raw.ruleId ? String(raw.ruleId) : null,
      contributionBasis: String(raw.contributionBasis ?? 'gross').trim().toLowerCase(),
      employeeContributionPct: Number(raw.employeeContributionPct ?? 0),
      employerContributionPct: Number(raw.employerContributionPct ?? 0),
      employeeFixedAmount: raw.employeeFixedAmount == null ? null : Number(raw.employeeFixedAmount),
      employerFixedAmount: raw.employerFixedAmount == null ? null : Number(raw.employerFixedAmount),
      minSalaryLimit: raw.minSalaryLimit == null ? null : Number(raw.minSalaryLimit),
      maxSalaryCapPkr: Number(raw.maxSalaryCapPkr ?? 0),
      isStatutory: !!raw.isStatutory,
      allowVoluntary: !!raw.allowVoluntary,
      allowWithdrawal: !!raw.allowWithdrawal,
      metadata: raw.metadata ? String(raw.metadata) : null,
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

  private isRuleActive(rule?: SocialSecurityConfigDialogRuleOption | null): boolean {
    if (!rule) {
      return false;
    }
    return rule.isActive ?? true;
  }
}
