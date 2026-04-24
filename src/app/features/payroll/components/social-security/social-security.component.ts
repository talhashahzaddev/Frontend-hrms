import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of, take } from 'rxjs';

import { NotificationService } from '@core/services/notification.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { SettingsService } from '../../../settings/services/settings.service';
import {
  PayrollService,
  SocialSecurityAuthorityOption,
  SocialSecurityJurisdictionOption,
  SocialSecurityRuleOption,
  SocialSecuritySchemeOption
} from '../../services/payroll.service';
import {
  AddSocialSecurityTransactionDialogComponent,
  SocialSecurityTransactionDialogPayload,
  SocialSecurityTransactionRuleOption,
  SocialSecurityTransactionEmployeeOption,
  SocialSecurityTransactionPeriodOption,
  SocialSecurityTransactionConfigOption
} from '../dialogs/add-social-security-transaction-dialog/add-social-security-transaction-dialog.component';
import {
  AddSocialSecurityBulkAssignDialogComponent,
  SocialSecurityBulkAssignDialogPayload
} from '../dialogs/add-social-security-bulk-assign-dialog/add-social-security-bulk-assign-dialog.component';
import { DeleteActionDialogComponent } from '../dialogs/delete-action-dialog/delete-action-dialog.component';

type SocialTab = 'jurisdictions' | 'authorities' | 'schemes' | 'rules' | 'transactions';

interface SocialTransactionRow {
  id: string;
  employeeId: string;
  employeeName: string;
  periodId: string;
  periodName: string;
  configId: string | null;
  ruleId: string | null;
  configName: string;
  actualSalary: number;
  salaryCapped: number;
  employeeAmount: number;
  employerAmount: number;
  totalAmount: number;
  requestStatus: string;
  isEnrolled: boolean;
}

@Component({
  selector: 'app-social-security',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './social-security.component.html',
  styleUrl: './social-security.component.scss'
})
export class SocialSecurityComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly payrollService = inject(PayrollService);
  private readonly employeeService = inject(EmployeeService);
  private readonly settingsService = inject(SettingsService);
  private readonly notification = inject(NotificationService);

  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  currentTab: SocialTab = 'jurisdictions';

  isMasterLoading = false;

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

  transactionRows: SocialTransactionRow[] = [];
  transactionTotalRecords = 0;
  transactionCurrentPage = 1;
  readonly transactionPageSize = 10;
  transactionIsLoading = false;

  pendingTransactionSearch = '';
  transactionSearch = '';
  pendingTransactionPeriodId = '';
  transactionPeriodId = '';
  pendingTransactionConfigId = '';
  transactionConfigId = '';
  pendingTransactionStatus = '';
  transactionStatus = '';

  employeeOptions: SocialSecurityTransactionEmployeeOption[] = [];
  periodOptions: SocialSecurityTransactionPeriodOption[] = [];
  configOptions: SocialSecurityTransactionConfigOption[] = [];
  ruleOptions: SocialSecurityTransactionRuleOption[] = [];

  ngOnInit(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (code) => this.currencySymbol.set(this.settingsService.getCurrencySymbol(code)),
        error: () => this.currencySymbol.set(this.settingsService.getCurrencySymbol())
      });

    this.loadEmployees();
    this.loadPeriods();
    this.loadSocialMasterData();
    this.loadConfigOptions();
    this.loadSocialTransactions();
  }

  get showPoliciesBackButton(): boolean {
    return this.router.url.includes('/payroll/policies/');
  }

  get jurisdictionsCount(): number {
    return this.jurisdictions.length;
  }

  get authoritiesCount(): number {
    return this.authorities.length;
  }

  get enrolledEmployeesCount(): number {
    return new Set(this.transactionRows.filter((row) => row.isEnrolled).map((row) => row.employeeId)).size;
  }

  get totalContributionAmount(): number {
    return this.transactionRows.reduce((sum, row) => sum + row.totalAmount, 0);
  }

  get employerContributionAmount(): number {
    return this.transactionRows.reduce((sum, row) => sum + row.employerAmount, 0);
  }

  get transactionTotalPages(): number {
    return Math.max(1, Math.ceil(this.transactionTotalRecords / this.transactionPageSize));
  }

  get transactionFromRecord(): number {
    return this.transactionTotalRecords === 0 ? 0 : (this.transactionCurrentPage - 1) * this.transactionPageSize + 1;
  }

  get transactionToRecord(): number {
    return Math.min(this.transactionCurrentPage * this.transactionPageSize, this.transactionTotalRecords);
  }

  get transactionPageRange(): number[] {
    return this.buildPageRange(this.transactionCurrentPage, this.transactionTotalPages);
  }

  setTab(tab: SocialTab): void {
    this.currentTab = tab;
  }

  goBackToPolicies(): void {
    this.router.navigate(['/payroll/policies']);
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
        this.loadSocialMasterData();
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
          this.loadSocialMasterData();
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
        this.loadSocialMasterData();
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
          this.loadSocialMasterData();
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
        this.loadSocialMasterData();
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
          this.loadSocialMasterData();
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
        this.loadSocialMasterData();
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
          this.loadSocialMasterData();
        },
        error: (error) => {
          this.notification.showError(this.resolveErrorMessage(error, 'Failed to delete rule.'));
        }
      });
  }

  hasPendingTransactionFilters(): boolean {
    return !!(
      this.pendingTransactionSearch
      || this.pendingTransactionPeriodId
      || this.pendingTransactionConfigId
      || this.pendingTransactionStatus
    );
  }

  hasAppliedTransactionFilters(): boolean {
    return !!(
      this.transactionSearch
      || this.transactionPeriodId
      || this.transactionConfigId
      || this.transactionStatus
    );
  }

  applyTransactionFilters(): void {
    this.transactionSearch = this.pendingTransactionSearch.trim();
    this.transactionPeriodId = this.pendingTransactionPeriodId;
    this.transactionConfigId = this.pendingTransactionConfigId;
    this.transactionStatus = this.pendingTransactionStatus;
    this.transactionCurrentPage = 1;
    this.loadSocialTransactions();
  }

  clearTransactionFilters(): void {
    this.pendingTransactionSearch = '';
    this.pendingTransactionPeriodId = '';
    this.pendingTransactionConfigId = '';
    this.pendingTransactionStatus = '';
    this.transactionSearch = '';
    this.transactionPeriodId = '';
    this.transactionConfigId = '';
    this.transactionStatus = '';
    this.transactionCurrentPage = 1;
    this.loadSocialTransactions();
  }

  goToTransactionPage(page: number): void {
    if (page < 1 || page > this.transactionTotalPages || page === this.transactionCurrentPage) {
      return;
    }

    this.transactionCurrentPage = page;
    this.loadSocialTransactions();
  }

  previousTransactionPage(): void {
    this.goToTransactionPage(this.transactionCurrentPage - 1);
  }

  nextTransactionPage(): void {
    this.goToTransactionPage(this.transactionCurrentPage + 1);
  }

  openAddTransactionDialog(): void {
    const dialogRef = this.dialog.open(AddSocialSecurityTransactionDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'create',
        employees: this.employeeOptions,
        periods: this.periodOptions,
        configs: this.configOptions,
        rules: this.ruleOptions
      }
    });

    dialogRef.afterClosed().subscribe((payload: SocialSecurityTransactionDialogPayload | undefined) => {
      if (!payload) {
        return;
      }

      this.payrollService.createSocialSecurityTransaction(payload).subscribe({
        next: () => {
          this.notification.showSuccess('Social security transaction created successfully.');
          this.loadSocialTransactions();
        },
        error: (error) => {
          this.notification.showError(this.resolveErrorMessage(error, 'Failed to create social security transaction.'));
        }
      });
    });
  }

  openBulkAssignDialog(): void {
    const dialogRef = this.dialog.open(AddSocialSecurityBulkAssignDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        employees: this.employeeOptions,
        periods: this.periodOptions,
        configs: this.configOptions,
        rules: this.ruleOptions
      }
    });

    dialogRef.afterClosed().subscribe((payload: SocialSecurityBulkAssignDialogPayload | undefined) => {
      if (!payload || !payload.employeeIds.length) {
        return;
      }

      const requests = payload.employeeIds.map((employeeId) => this.payrollService.createSocialSecurityTransaction({
        employeeId,
        periodId: payload.periodId,
        configId: payload.configId,
        ruleId: payload.ruleId,
        actualSalary: payload.actualSalary,
        isEnrolled: payload.isEnrolled,
        requestStatus: payload.requestStatus
      }).pipe(
        map(() => ({ success: true, employeeId })),
        catchError((error) => of({ success: false, employeeId, error }))
      ));

      forkJoin(requests).subscribe((results: Array<{ success: boolean; employeeId: string; error?: any }>) => {
        const successCount = results.filter((result) => result.success).length;
        const failedCount = results.length - successCount;

        if (successCount > 0) {
          this.notification.showSuccess(`Assigned social security to ${successCount} employee(s).`);
          this.loadSocialTransactions();
        }

        if (failedCount > 0) {
          this.notification.showError(`Failed to assign ${failedCount} employee(s). Please review and retry.`);
        }
      });
    });
  }

  openEditTransactionDialog(row: SocialTransactionRow): void {
    const dialogRef = this.dialog.open(AddSocialSecurityTransactionDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'edit',
        employees: this.employeeOptions,
        periods: this.periodOptions,
        configs: this.configOptions,
        rules: this.ruleOptions,
        initialValue: {
          employeeId: row.employeeId,
          periodId: row.periodId,
          configId: row.configId ?? '',
          ruleId: row.ruleId ?? '',
          actualSalary: row.actualSalary,
          isEnrolled: row.isEnrolled,
          requestStatus: row.requestStatus
        }
      }
    });

    dialogRef.afterClosed().subscribe((payload: SocialSecurityTransactionDialogPayload | undefined) => {
      if (!payload) {
        return;
      }

      this.payrollService.updateSocialSecurityTransaction(row.id, {
        configId: payload.configId,
        ruleId: payload.ruleId,
        actualSalary: payload.actualSalary,
        isEnrolled: payload.isEnrolled,
        requestStatus: payload.requestStatus
      }).subscribe({
        next: () => {
          this.notification.showSuccess('Social security transaction updated successfully.');
          this.loadSocialTransactions();
        },
        error: (error) => {
          this.notification.showError(this.resolveErrorMessage(error, 'Failed to update social security transaction.'));
        }
      });
    });
  }

  deleteTransaction(row: SocialTransactionRow): void {
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete social security transaction',
        message: `Delete social security transaction for ${row.employeeName}? This action cannot be undone.`,
        confirmText: 'Delete transaction'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }

      this.payrollService.deleteSocialSecurityTransaction(row.id).subscribe({
        next: () => {
          this.notification.showSuccess('Social security transaction deleted successfully.');
          this.loadSocialTransactions();
        },
        error: (error) => {
          this.notification.showError(this.resolveErrorMessage(error, 'Failed to delete social security transaction.'));
        }
      });
    });
  }

  getStatusClass(status: string): string {
    const normalized = String(status ?? '').trim().toLowerCase();

    if (normalized === 'approved' || normalized === 'deducted') {
      return 'status-active';
    }

    if (normalized === 'rejected' || normalized === 'cancelled') {
      return 'status-cancelled';
    }

    return 'status-pending';
  }

  private loadSocialTransactions(): void {
    this.transactionIsLoading = true;

    const params: any = {
      page: this.transactionCurrentPage,
      pageSize: this.transactionPageSize
    };

    if (this.transactionSearch) {
      params.searchTerm = this.transactionSearch;
    }

    if (this.transactionPeriodId) {
      params.periodId = this.transactionPeriodId;
    }

    if (this.transactionConfigId) {
      params.configId = this.transactionConfigId;
    }

    if (this.transactionStatus) {
      params.requestStatus = this.transactionStatus;
    }

    this.payrollService.getSocialSecurityTransactions(params).subscribe({
      next: (result: any) => {
        const items = this.extractItems(result);
        this.transactionRows = items.map((item: any) => this.mapTransaction(item));
        this.transactionTotalRecords = this.extractTotalCount(result, this.transactionRows.length);
        this.transactionIsLoading = false;
      },
      error: (error: any) => {
        this.transactionRows = [];
        this.transactionTotalRecords = 0;
        this.transactionIsLoading = false;
        this.notification.showError(this.resolveErrorMessage(error, 'Failed to load social security transactions.'));
      }
    });
  }

  private loadEmployees(): void {
    this.employeeService.getEmployees({ page: 1, pageSize: 500 }).pipe(take(1)).subscribe({
      next: (result) => {
        this.employeeOptions = (result?.employees ?? []).map((employee: any) => ({
          id: String(employee.employeeId ?? employee.id ?? ''),
          name: `${employee.firstName ?? employee.firstname ?? ''} ${employee.lastName ?? employee.lastname ?? ''}`.trim(),
          designation: String(employee.designation ?? employee.jobTitle ?? '')
        })).filter((employee: SocialSecurityTransactionEmployeeOption) => !!employee.id && !!employee.name);
      },
      error: () => {
        this.employeeOptions = [];
      }
    });
  }

  private loadPeriods(): void {
    this.payrollService.getPayrollPeriods({ page: 1, pageSize: 500 }).pipe(take(1)).subscribe({
      next: (result: any) => {
        const items = this.extractItems(result);
        this.periodOptions = items.map((item: any) => ({
          id: String(item.periodId ?? item.id ?? ''),
          name: String(item.periodName ?? item.name ?? '')
        })).filter((period: SocialSecurityTransactionPeriodOption) => !!period.id && !!period.name);
      },
      error: () => {
        this.periodOptions = [];
      }
    });
  }

  private loadConfigOptions(): void {
    this.payrollService.getSocialSecurityConfigs({ page: 1, pageSize: 500 }).pipe(take(1)).subscribe({
      next: (result: any) => {
        const items = this.extractItems(result);
        this.configOptions = items.map((item: any) => ({
          id: String(item.id ?? item.configId ?? ''),
          configName: String(item.configName ?? item.configRuleName ?? item.name ?? ''),
          employeeContributionPct: Number(item.employeeContributionPct ?? item.employeePercentage ?? 0),
          employerContributionPct: Number(item.employerContributionPct ?? item.employerPercentage ?? 0),
          employeeFixedAmount: item.employeeFixedAmount == null ? null : Number(item.employeeFixedAmount),
          employerFixedAmount: item.employerFixedAmount == null ? null : Number(item.employerFixedAmount),
          minSalaryLimit: item.minSalaryLimit == null ? null : Number(item.minSalaryLimit),
          maxSalaryCap: item.maxSalaryCap == null && item.maxSalaryCapPkr == null
            ? null
            : Number(item.maxSalaryCap ?? item.maxSalaryCapPkr ?? 0),
          ruleId: item.ruleId ? String(item.ruleId) : null
        })).filter((config: SocialSecurityTransactionConfigOption) => !!config.id && !!config.configName);
      },
      error: () => {
        this.configOptions = [];
      }
    });
  }

  private loadSocialMasterData(): void {
    this.isMasterLoading = true;

    forkJoin({
      jurisdictions: this.payrollService.getSocialSecurityJurisdictions().pipe(catchError(() => of([]))),
      authorities: this.payrollService.getSocialSecurityAuthorities().pipe(catchError(() => of([]))),
      schemes: this.payrollService.getSocialSecuritySchemes().pipe(catchError(() => of([]))),
      rules: this.payrollService.getSocialSecurityRules().pipe(catchError(() => of([])))
    }).pipe(take(1)).subscribe(({ jurisdictions, authorities, schemes, rules }: any) => {
      this.jurisdictions = [...(jurisdictions ?? [])];
      this.authorities = [...(authorities ?? [])];
      this.schemes = [...(schemes ?? [])];

      this.rules = (rules ?? []).map((item: any) => ({
        ruleId: String(item.ruleId ?? ''),
        schemeId: String(item.schemeId ?? ''),
        ruleName: String(item.ruleName ?? ''),
        contributionBasis: item.contributionBasis ? String(item.contributionBasis) : undefined,
        employeeDefaultPct: item.employeeDefaultPct == null ? undefined : Number(item.employeeDefaultPct),
        employerDefaultPct: item.employerDefaultPct == null ? undefined : Number(item.employerDefaultPct),
        employeeFixedAmount: item.employeeFixedAmount == null ? null : Number(item.employeeFixedAmount),
        employerFixedAmount: item.employerFixedAmount == null ? null : Number(item.employerFixedAmount),
        minSalaryLimit: item.minSalaryLimit == null ? null : Number(item.minSalaryLimit),
        maxSalaryLimit: item.maxSalaryLimit == null ? null : Number(item.maxSalaryLimit)
      })).filter((item: SocialSecurityRuleOption) => !!item.ruleId && !!item.ruleName);

      this.ruleOptions = this.rules.map((rule) => ({
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        employeeDefaultPct: rule.employeeDefaultPct,
        employerDefaultPct: rule.employerDefaultPct,
        employeeFixedAmount: rule.employeeFixedAmount,
        employerFixedAmount: rule.employerFixedAmount,
        minSalaryLimit: rule.minSalaryLimit,
        maxSalaryLimit: rule.maxSalaryLimit,
        contributionBasis: rule.contributionBasis
      }));

      this.isMasterLoading = false;
    });
  }

  private mapTransaction(item: any): SocialTransactionRow {
    return {
      id: String(item.id ?? item.socialSecurityTransactionId ?? ''),
      employeeId: String(item.employeeId ?? item.employee?.id ?? ''),
      employeeName: String(item.employeeName ?? item.employee?.name ?? 'Employee'),
      periodId: String(item.periodId ?? item.period?.id ?? ''),
      periodName: String(item.periodName ?? item.periodLabel ?? item.payrollPeriodName ?? '-'),
      configId: item.configId ? String(item.configId) : null,
      ruleId: item.ruleId ? String(item.ruleId) : null,
      configName: String(item.configName ?? item.ruleName ?? item.configRuleName ?? '-'),
      actualSalary: Number(item.actualSalary ?? 0),
      salaryCapped: Number(item.salaryCapped ?? item.maxSalaryCap ?? 0),
      employeeAmount: Number(item.employeeAmount ?? item.employeeShare ?? 0),
      employerAmount: Number(item.employerAmount ?? item.employerShare ?? 0),
      totalAmount: Number(item.totalAmount ?? item.totalContribution ?? 0),
      requestStatus: String(item.requestStatus ?? 'pending').toLowerCase(),
      isEnrolled: !!(item.isEnrolled ?? false)
    };
  }

  private asNullableString(value: string | null | undefined): string | null {
    const parsed = String(value ?? '').trim();
    return parsed ? parsed : null;
  }

  private asNullableNumber(value: number | null | undefined): number | null {
    if (value == null || Number.isNaN(Number(value))) {
      return null;
    }

    return Number(value);
  }

  private extractItems(result: any): any[] {
    if (Array.isArray(result)) {
      return result;
    }

    if (Array.isArray(result?.items)) {
      return result.items;
    }

    if (Array.isArray(result?.data)) {
      return result.data;
    }

    if (Array.isArray(result?.records)) {
      return result.records;
    }

    if (Array.isArray(result?.Data)) {
      return result.Data;
    }

    return [];
  }

  private extractTotalCount(result: any, fallback: number): number {
    return Number(result?.totalCount ?? result?.TotalCount ?? fallback ?? 0);
  }

  private buildPageRange(currentPage: number, totalPages: number): number[] {
    if (totalPages <= 1) {
      return [1];
    }

    const delta = 2;
    const start = Math.max(1, currentPage - delta);
    const end = Math.min(totalPages, currentPage + delta);
    const pages: number[] = [];

    if (start > 1) {
      pages.push(1);
      if (start > 2) {
        pages.push(-1);
      }
    }

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push(-1);
      }
      pages.push(totalPages);
    }

    return pages;
  }

  private resolveErrorMessage(error: any, fallback: string): string {
    const message = error?.error?.message ?? error?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }
}
