import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { catchError, forkJoin, of, take } from 'rxjs';

import { NotificationService } from '@core/services/notification.service';
import {
  PayrollService,
  SocialSecurityAuthorityOption,
  SocialSecurityJurisdictionOption,
  SocialSecurityRuleOption,
  SocialSecuritySchemeOption
} from '../../services/payroll.service';

import { SharedCommonModule } from '@shared/shared-common.module';
type MasterTab = 'jurisdictions' | 'authorities' | 'schemes' | 'rules';


@Component({
  selector: 'app-social-security-masters',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, FormsModule, MatIconModule],
  templateUrl: './social-security-masters.component.html',
  styleUrl: './social-security-masters.component.scss'
})
export class SocialSecurityMastersComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);

  readonly isLoading = signal(false);
  currentTab: MasterTab = 'jurisdictions';

  jurisdictions: SocialSecurityJurisdictionOption[] = [];
  authorities: SocialSecurityAuthorityOption[] = [];
  schemes: SocialSecuritySchemeOption[] = [];
  rules: SocialSecurityRuleOption[] = [];

  editingJurisdictionId: string | null = null;
  editingAuthorityId: string | null = null;
  editingSchemeId: string | null = null;
  editingRuleId: string | null = null;

  jurisdictionForm = {
    jurisdictionCode: '',
    jurisdictionName: '',
    countryCode: '',
    currency: '',
    isDefault: false
  };

  authorityForm = {
    jurisdictionId: '',
    authorityCode: '',
    authorityName: '',
    portalUrl: '',
    remittanceFrequency: ''
  };

  schemeForm = {
    jurisdictionId: '',
    authorityId: '',
    schemeCode: '',
    schemeName: '',
    schemeType: '',
    mandatoryMode: ''
  };

  ruleForm = {
    schemeId: '',
    ruleName: '',
    contributionBasis: 'gross',
    employeeDefaultPct: 0,
    employerDefaultPct: 0,
    employeeFixedAmount: null as number | null,
    employerFixedAmount: null as number | null,
    minSalaryLimit: null as number | null,
    maxSalaryLimit: null as number | null
  };

  ngOnInit(): void {
    this.loadMasterData();
  }

  setTab(tab: MasterTab): void {
    this.currentTab = tab;
  }

  goBack(): void {
    this.router.navigate(['/payroll/social-security']);
  }

  getJurisdictionName(jurisdictionId?: string): string {
    return this.jurisdictions.find((item) => item.jurisdictionId === jurisdictionId)?.jurisdictionName ?? '-';
  }

  getAuthorityName(authorityId?: string): string {
    return this.authorities.find((item) => item.authorityId === authorityId)?.authorityName ?? '-';
  }

  getSchemeName(schemeId?: string): string {
    return this.schemes.find((item) => item.schemeId === schemeId)?.schemeName ?? '-';
  }

  saveJurisdiction(): void {
    const payload = {
      jurisdictionCode: this.jurisdictionForm.jurisdictionCode.trim(),
      jurisdictionName: this.jurisdictionForm.jurisdictionName.trim(),
      countryCode: this.asNullableString(this.jurisdictionForm.countryCode),
      currency: this.asNullableString(this.jurisdictionForm.currency),
      isDefault: !!this.jurisdictionForm.isDefault
    };

    if (!payload.jurisdictionCode || !payload.jurisdictionName) {
      this.notification.showError('Jurisdiction code and name are required.');
      return;
    }

    const request$ = this.editingJurisdictionId
      ? this.payrollService.updateSocialSecurityJurisdiction(this.editingJurisdictionId, payload)
      : this.payrollService.createSocialSecurityJurisdiction(payload);

    request$.pipe(take(1)).subscribe({
      next: () => {
        this.notification.showSuccess(`Jurisdiction ${this.editingJurisdictionId ? 'updated' : 'created'} successfully.`);
        this.cancelJurisdictionEdit();
        this.loadMasterData();
      },
      error: (error) => {
        this.notification.showError(this.resolveErrorMessage(error, `Failed to ${this.editingJurisdictionId ? 'update' : 'create'} jurisdiction.`));
      }
    });
  }

  editJurisdiction(item: SocialSecurityJurisdictionOption): void {
    this.editingJurisdictionId = item.jurisdictionId;
    this.jurisdictionForm = {
      jurisdictionCode: String(item.jurisdictionCode ?? ''),
      jurisdictionName: String(item.jurisdictionName ?? ''),
      countryCode: String(item.countryCode ?? ''),
      currency: String(item.currency ?? ''),
      isDefault: !!item.isDefault
    };
  }

  cancelJurisdictionEdit(): void {
    this.editingJurisdictionId = null;
    this.jurisdictionForm = {
      jurisdictionCode: '',
      jurisdictionName: '',
      countryCode: '',
      currency: '',
      isDefault: false
    };
  }

  deleteJurisdiction(item: SocialSecurityJurisdictionOption): void {
    if (!window.confirm(`Delete jurisdiction ${item.jurisdictionName}?`)) {
      return;
    }

    this.payrollService.deleteSocialSecurityJurisdiction(item.jurisdictionId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.notification.showSuccess('Jurisdiction deleted successfully.');
          this.loadMasterData();
        },
        error: (error) => {
          this.notification.showError(this.resolveErrorMessage(error, 'Failed to delete jurisdiction.'));
        }
      });
  }

  saveAuthority(): void {
    const payload = {
      jurisdictionId: this.authorityForm.jurisdictionId,
      authorityCode: this.authorityForm.authorityCode.trim(),
      authorityName: this.authorityForm.authorityName.trim(),
      portalUrl: this.asNullableString(this.authorityForm.portalUrl),
      remittanceFrequency: this.asNullableString(this.authorityForm.remittanceFrequency)
    };

    if (!payload.jurisdictionId || !payload.authorityCode || !payload.authorityName) {
      this.notification.showError('Jurisdiction, authority code, and authority name are required.');
      return;
    }

    const request$ = this.editingAuthorityId
      ? this.payrollService.updateSocialSecurityAuthority(this.editingAuthorityId, payload)
      : this.payrollService.createSocialSecurityAuthority(payload);

    request$.pipe(take(1)).subscribe({
      next: () => {
        this.notification.showSuccess(`Authority ${this.editingAuthorityId ? 'updated' : 'created'} successfully.`);
        this.cancelAuthorityEdit();
        this.loadMasterData();
      },
      error: (error) => {
        this.notification.showError(this.resolveErrorMessage(error, `Failed to ${this.editingAuthorityId ? 'update' : 'create'} authority.`));
      }
    });
  }

  editAuthority(item: SocialSecurityAuthorityOption): void {
    this.editingAuthorityId = item.authorityId;
    this.authorityForm = {
      jurisdictionId: String(item.jurisdictionId ?? ''),
      authorityCode: String(item.authorityCode ?? ''),
      authorityName: String(item.authorityName ?? ''),
      portalUrl: String(item.portalUrl ?? ''),
      remittanceFrequency: String(item.remittanceFrequency ?? '')
    };
  }

  cancelAuthorityEdit(): void {
    this.editingAuthorityId = null;
    this.authorityForm = {
      jurisdictionId: '',
      authorityCode: '',
      authorityName: '',
      portalUrl: '',
      remittanceFrequency: ''
    };
  }

  deleteAuthority(item: SocialSecurityAuthorityOption): void {
    if (!window.confirm(`Delete authority ${item.authorityName}?`)) {
      return;
    }

    this.payrollService.deleteSocialSecurityAuthority(item.authorityId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.notification.showSuccess('Authority deleted successfully.');
          this.loadMasterData();
        },
        error: (error) => {
          this.notification.showError(this.resolveErrorMessage(error, 'Failed to delete authority.'));
        }
      });
  }

  saveScheme(): void {
    const payload = {
      jurisdictionId: this.schemeForm.jurisdictionId,
      authorityId: this.asNullableString(this.schemeForm.authorityId),
      schemeCode: this.schemeForm.schemeCode.trim(),
      schemeName: this.schemeForm.schemeName.trim(),
      schemeType: this.asNullableString(this.schemeForm.schemeType),
      mandatoryMode: this.asNullableString(this.schemeForm.mandatoryMode)
    };

    if (!payload.jurisdictionId || !payload.schemeCode || !payload.schemeName) {
      this.notification.showError('Jurisdiction, scheme code, and scheme name are required.');
      return;
    }

    const request$ = this.editingSchemeId
      ? this.payrollService.updateSocialSecurityScheme(this.editingSchemeId, payload)
      : this.payrollService.createSocialSecurityScheme(payload);

    request$.pipe(take(1)).subscribe({
      next: () => {
        this.notification.showSuccess(`Scheme ${this.editingSchemeId ? 'updated' : 'created'} successfully.`);
        this.cancelSchemeEdit();
        this.loadMasterData();
      },
      error: (error) => {
        this.notification.showError(this.resolveErrorMessage(error, `Failed to ${this.editingSchemeId ? 'update' : 'create'} scheme.`));
      }
    });
  }

  editScheme(item: SocialSecuritySchemeOption): void {
    this.editingSchemeId = item.schemeId;
    this.schemeForm = {
      jurisdictionId: String(item.jurisdictionId ?? ''),
      authorityId: String(item.authorityId ?? ''),
      schemeCode: String(item.schemeCode ?? ''),
      schemeName: String(item.schemeName ?? ''),
      schemeType: String(item.schemeType ?? ''),
      mandatoryMode: String(item.mandatoryMode ?? '')
    };
  }

  cancelSchemeEdit(): void {
    this.editingSchemeId = null;
    this.schemeForm = {
      jurisdictionId: '',
      authorityId: '',
      schemeCode: '',
      schemeName: '',
      schemeType: '',
      mandatoryMode: ''
    };
  }

  deleteScheme(item: SocialSecuritySchemeOption): void {
    if (!window.confirm(`Delete scheme ${item.schemeName}?`)) {
      return;
    }

    this.payrollService.deleteSocialSecurityScheme(item.schemeId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.notification.showSuccess('Scheme deleted successfully.');
          this.loadMasterData();
        },
        error: (error) => {
          this.notification.showError(this.resolveErrorMessage(error, 'Failed to delete scheme.'));
        }
      });
  }

  saveRule(): void {
    const payload = {
      schemeId: this.ruleForm.schemeId,
      ruleName: this.ruleForm.ruleName.trim(),
      contributionBasis: this.ruleForm.contributionBasis,
      employeeDefaultPct: Number(this.ruleForm.employeeDefaultPct ?? 0),
      employerDefaultPct: Number(this.ruleForm.employerDefaultPct ?? 0),
      employeeFixedAmount: this.asNullableNumber(this.ruleForm.employeeFixedAmount),
      employerFixedAmount: this.asNullableNumber(this.ruleForm.employerFixedAmount),
      minSalaryLimit: this.asNullableNumber(this.ruleForm.minSalaryLimit),
      maxSalaryLimit: this.asNullableNumber(this.ruleForm.maxSalaryLimit)
    };

    if (!payload.schemeId || !payload.ruleName) {
      this.notification.showError('Scheme and rule name are required.');
      return;
    }

    const request$ = this.editingRuleId
      ? this.payrollService.updateSocialSecurityRule(this.editingRuleId, payload)
      : this.payrollService.createSocialSecurityRule(payload);

    request$.pipe(take(1)).subscribe({
      next: () => {
        this.notification.showSuccess(`Rule ${this.editingRuleId ? 'updated' : 'created'} successfully.`);
        this.cancelRuleEdit();
        this.loadMasterData();
      },
      error: (error) => {
        this.notification.showError(this.resolveErrorMessage(error, `Failed to ${this.editingRuleId ? 'update' : 'create'} rule.`));
      }
    });
  }

  editRule(item: SocialSecurityRuleOption): void {
    this.editingRuleId = item.ruleId;
    this.ruleForm = {
      schemeId: String(item.schemeId ?? ''),
      ruleName: String(item.ruleName ?? ''),
      contributionBasis: String(item.contributionBasis ?? 'gross'),
      employeeDefaultPct: Number(item.employeeDefaultPct ?? 0),
      employerDefaultPct: Number(item.employerDefaultPct ?? 0),
      employeeFixedAmount: item.employeeFixedAmount == null ? null : Number(item.employeeFixedAmount),
      employerFixedAmount: item.employerFixedAmount == null ? null : Number(item.employerFixedAmount),
      minSalaryLimit: item.minSalaryLimit == null ? null : Number(item.minSalaryLimit),
      maxSalaryLimit: item.maxSalaryLimit == null ? null : Number(item.maxSalaryLimit)
    };
  }

  cancelRuleEdit(): void {
    this.editingRuleId = null;
    this.ruleForm = {
      schemeId: '',
      ruleName: '',
      contributionBasis: 'gross',
      employeeDefaultPct: 0,
      employerDefaultPct: 0,
      employeeFixedAmount: null,
      employerFixedAmount: null,
      minSalaryLimit: null,
      maxSalaryLimit: null
    };
  }

  deleteRule(item: SocialSecurityRuleOption): void {
    if (!window.confirm(`Delete rule ${item.ruleName}?`)) {
      return;
    }

    this.payrollService.deleteSocialSecurityRule(item.ruleId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.notification.showSuccess('Rule deleted successfully.');
          this.loadMasterData();
        },
        error: (error) => {
          this.notification.showError(this.resolveErrorMessage(error, 'Failed to delete rule.'));
        }
      });
  }

  private loadMasterData(): void {
    this.isLoading.set(true);

    forkJoin({
      jurisdictions: this.payrollService.getSocialSecurityJurisdictions().pipe(catchError(() => of([]))),
      authorities: this.payrollService.getSocialSecurityAuthorities().pipe(catchError(() => of([]))),
      schemes: this.payrollService.getSocialSecuritySchemes().pipe(catchError(() => of([]))),
      rules: this.payrollService.getSocialSecurityRules().pipe(catchError(() => of([])))
    })
      .pipe(take(1))
      .subscribe(({ jurisdictions, authorities, schemes, rules }: any) => {
        this.jurisdictions = [...(jurisdictions ?? [])];
        this.authorities = [...(authorities ?? [])];
        this.schemes = [...(schemes ?? [])];
        this.rules = [...(rules ?? [])];
        this.isLoading.set(false);
      });
  }

  private asNullableString(value: string | null | undefined): string | null {
    const parsed = String(value ?? '').trim();
    return parsed ? parsed : null;
  }

  private asNullableNumber(value: number | string | null | undefined): number | null {
    if (value == null || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private resolveErrorMessage(error: any, fallback: string): string {
    const message = error?.error?.message ?? error?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }
}
