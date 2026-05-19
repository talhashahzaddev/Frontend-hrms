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
import {
  AddSocialSecurityJurisdictionDialogComponent,
  SocialSecurityJurisdictionDialogPayload
} from '../dialogs/add-social-security-jurisdiction-dialog/add-social-security-jurisdiction-dialog.component';
import {
  AddSocialSecurityAuthorityDialogComponent,
  SocialSecurityAuthorityDialogPayload
} from '../dialogs/add-social-security-authority-dialog/add-social-security-authority-dialog.component';
import {
  AddSocialSecuritySchemeDialogComponent,
  SocialSecuritySchemeDialogPayload
} from '../dialogs/add-social-security-scheme-dialog/add-social-security-scheme-dialog.component';
import {
  AddSocialSecurityRuleDialogComponent,
  SocialSecurityRuleDialogPayload
} from '../dialogs/add-social-security-rule-dialog/add-social-security-rule-dialog.component';
import {
  SocialSecurityAdminActionDialogComponent,
  SocialSecurityAdminActionDialogData,
  SocialSecurityAdminActionResult
} from '../dialogs/social-security-admin-action-dialog/social-security-admin-action-dialog.component';
import { DeleteActionDialogComponent } from '../dialogs/delete-action-dialog/delete-action-dialog.component';
import {
  SocialSecurityDocumentsDialogComponent,
  SocialSecurityDocumentsDialogData
} from '../dialogs/social-security-documents-dialog/social-security-documents-dialog.component';
import {
  SocialSecurityClaim,
  SocialSecurityEnrollmentRequest,
  SocialSecurityEnrollmentRoster
} from '../../services/payroll.service';

type SocialTab = 'jurisdictions' | 'authorities' | 'schemes' | 'rules' | 'requests' | 'enrollments' | 'transactions' | 'claims';

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

  // Admin: enrollment requests
  enrollmentRequests: SocialSecurityEnrollmentRequest[] = [];
  enrollmentRequestsTotal = 0;
  enrollmentRequestsPage = 1;
  readonly enrollmentRequestsPageSize = 10;
  enrollmentRequestsLoading = false;
  enrollmentRequestStatusFilter = '';
  enrollmentRequestTypeFilter = '';

  // Admin: enrollment roster
  enrollments: SocialSecurityEnrollmentRoster[] = [];
  enrollmentsTotal = 0;
  enrollmentsPage = 1;
  readonly enrollmentsPageSize = 10;
  enrollmentsLoading = false;
  enrollmentStatusFilter = '';
  enrollmentSearch = '';

  // Admin: claims
  benefitClaims: SocialSecurityClaim[] = [];
  benefitClaimsTotal = 0;
  benefitClaimsPage = 1;
  readonly benefitClaimsPageSize = 10;
  benefitClaimsLoading = false;
  benefitClaimStatusFilter = '';
  benefitClaimTypeFilter = '';

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
    this.loadEnrollmentRequests();
    this.loadEnrollments();
    this.loadBenefitClaims();
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

  openCreateJurisdictionDialog(): void {
    this.openJurisdictionDialog('create');
  }

  openEditJurisdictionDialog(item: SocialSecurityJurisdictionOption): void {
    this.openJurisdictionDialog('edit', item);
  }

  private openJurisdictionDialog(mode: 'create' | 'edit', item?: SocialSecurityJurisdictionOption): void {
    const dialogRef = this.dialog.open(AddSocialSecurityJurisdictionDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode,
        initialValue: item
          ? {
              jurisdictionCode: String(item.jurisdictionCode ?? ''),
              jurisdictionName: String(item.jurisdictionName ?? ''),
              countryCode: String(item.countryCode ?? ''),
              currency: String(item.currency ?? ''),
              isDefault: !!item.isDefault
            }
          : undefined
      }
    });

    dialogRef.afterClosed().subscribe((payload: SocialSecurityJurisdictionDialogPayload | undefined) => {
      if (!payload) {
        return;
      }

      const request$ = mode === 'edit' && item
        ? this.payrollService.updateSocialSecurityJurisdiction(item.jurisdictionId, payload)
        : this.payrollService.createSocialSecurityJurisdiction(payload);

      request$.pipe(take(1)).subscribe({
        next: () => {
          this.notification.showSuccess(`Jurisdiction ${mode === 'edit' ? 'updated' : 'created'} successfully.`);
          this.loadSocialMasterData();
        },
        error: (error) => {
          this.notification.showError(this.resolveErrorMessage(error, `Failed to ${mode === 'edit' ? 'update' : 'create'} jurisdiction.`));
        }
      });
    });
  }

  deleteJurisdiction(item: SocialSecurityJurisdictionOption): void {
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete jurisdiction',
        message: `Delete jurisdiction ${item.jurisdictionName}? This action cannot be undone.`,
        confirmText: 'Delete jurisdiction'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
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
    });
  }

  openCreateAuthorityDialog(): void {
    this.openAuthorityDialog('create');
  }

  openEditAuthorityDialog(item: SocialSecurityAuthorityOption): void {
    this.openAuthorityDialog('edit', item);
  }

  private openAuthorityDialog(mode: 'create' | 'edit', item?: SocialSecurityAuthorityOption): void {
    const dialogRef = this.dialog.open(AddSocialSecurityAuthorityDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode,
        jurisdictions: this.jurisdictions,
        initialValue: item
          ? {
              jurisdictionId: String(item.jurisdictionId ?? ''),
              authorityCode: String(item.authorityCode ?? ''),
              authorityName: String(item.authorityName ?? ''),
              portalUrl: String(item.portalUrl ?? ''),
              remittanceFrequency: String(item.remittanceFrequency ?? '')
            }
          : undefined
      }
    });

    dialogRef.afterClosed().subscribe((payload: SocialSecurityAuthorityDialogPayload | undefined) => {
      if (!payload) {
        return;
      }

      const request$ = mode === 'edit' && item
        ? this.payrollService.updateSocialSecurityAuthority(item.authorityId, payload)
        : this.payrollService.createSocialSecurityAuthority(payload);

      request$.pipe(take(1)).subscribe({
        next: () => {
          this.notification.showSuccess(`Authority ${mode === 'edit' ? 'updated' : 'created'} successfully.`);
          this.loadSocialMasterData();
        },
        error: (error) => {
          this.notification.showError(this.resolveErrorMessage(error, `Failed to ${mode === 'edit' ? 'update' : 'create'} authority.`));
        }
      });
    });
  }

  deleteAuthority(item: SocialSecurityAuthorityOption): void {
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete authority',
        message: `Delete authority ${item.authorityName}? This action cannot be undone.`,
        confirmText: 'Delete authority'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
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
    });
  }

  openCreateSchemeDialog(): void {
    this.openSchemeDialog('create');
  }

  openEditSchemeDialog(item: SocialSecuritySchemeOption): void {
    this.openSchemeDialog('edit', item);
  }

  private openSchemeDialog(mode: 'create' | 'edit', item?: SocialSecuritySchemeOption): void {
    const dialogRef = this.dialog.open(AddSocialSecuritySchemeDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode,
        jurisdictions: this.jurisdictions,
        authorities: this.authorities,
        initialValue: item
          ? {
              jurisdictionId: String(item.jurisdictionId ?? ''),
              authorityId: String(item.authorityId ?? ''),
              schemeCode: String(item.schemeCode ?? ''),
              schemeName: String(item.schemeName ?? ''),
              schemeType: String(item.schemeType ?? ''),
              mandatoryMode: String(item.mandatoryMode ?? '')
            }
          : undefined
      }
    });

    dialogRef.afterClosed().subscribe((payload: SocialSecuritySchemeDialogPayload | undefined) => {
      if (!payload) {
        return;
      }

      const request$ = mode === 'edit' && item
        ? this.payrollService.updateSocialSecurityScheme(item.schemeId, payload)
        : this.payrollService.createSocialSecurityScheme(payload);

      request$.pipe(take(1)).subscribe({
        next: () => {
          this.notification.showSuccess(`Scheme ${mode === 'edit' ? 'updated' : 'created'} successfully.`);
          this.loadSocialMasterData();
        },
        error: (error) => {
          this.notification.showError(this.resolveErrorMessage(error, `Failed to ${mode === 'edit' ? 'update' : 'create'} scheme.`));
        }
      });
    });
  }

  deleteScheme(item: SocialSecuritySchemeOption): void {
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete scheme',
        message: `Delete scheme ${item.schemeName}? This action cannot be undone.`,
        confirmText: 'Delete scheme'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
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
    });
  }

  openCreateRuleDialog(): void {
    this.openRuleDialog('create');
  }

  openEditRuleDialog(item: SocialSecurityRuleOption): void {
    this.openRuleDialog('edit', item);
  }

  private openRuleDialog(mode: 'create' | 'edit', item?: SocialSecurityRuleOption): void {
    const dialogRef = this.dialog.open(AddSocialSecurityRuleDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode,
        schemes: this.schemes,
        initialValue: item
          ? {
              schemeId: String(item.schemeId ?? ''),
              ruleName: String(item.ruleName ?? ''),
              contributionBasis: String(item.contributionBasis ?? 'gross'),
              employeeDefaultPct: Number(item.employeeDefaultPct ?? 0),
              employerDefaultPct: Number(item.employerDefaultPct ?? 0),
              employeeFixedAmount: item.employeeFixedAmount == null ? null : Number(item.employeeFixedAmount),
              employerFixedAmount: item.employerFixedAmount == null ? null : Number(item.employerFixedAmount),
              minSalaryLimit: item.minSalaryLimit == null ? null : Number(item.minSalaryLimit),
              maxSalaryLimit: item.maxSalaryLimit == null ? null : Number(item.maxSalaryLimit)
            }
          : undefined
      }
    });

    dialogRef.afterClosed().subscribe((payload: SocialSecurityRuleDialogPayload | undefined) => {
      if (!payload) {
        return;
      }

      const request$ = mode === 'edit' && item
        ? this.payrollService.updateSocialSecurityRule(item.ruleId, payload)
        : this.payrollService.createSocialSecurityRule(payload);

      request$.pipe(take(1)).subscribe({
        next: () => {
          this.notification.showSuccess(`Rule ${mode === 'edit' ? 'updated' : 'created'} successfully.`);
          this.loadSocialMasterData();
        },
        error: (error) => {
          this.notification.showError(this.resolveErrorMessage(error, `Failed to ${mode === 'edit' ? 'update' : 'create'} rule.`));
        }
      });
    });
  }

  deleteRule(item: SocialSecurityRuleOption): void {
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete rule',
        message: `Delete rule ${item.ruleName}? This action cannot be undone.`,
        confirmText: 'Delete rule'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
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

  // ── Enrollment requests (admin) ──────────────────────────────────────────

  loadEnrollmentRequests(): void {
    this.enrollmentRequestsLoading = true;
    const params: any = { page: this.enrollmentRequestsPage, pageSize: this.enrollmentRequestsPageSize };
    if (this.enrollmentRequestStatusFilter) params.requestStatus = this.enrollmentRequestStatusFilter;
    if (this.enrollmentRequestTypeFilter) params.requestType = this.enrollmentRequestTypeFilter;

    this.payrollService.getSocialSecurityEnrollmentRequests(params).pipe(take(1)).subscribe({
      next: (result: any) => {
        this.enrollmentRequests = this.extractItems(result) as SocialSecurityEnrollmentRequest[];
        this.enrollmentRequestsTotal = this.extractTotalCount(result, this.enrollmentRequests.length);
        this.enrollmentRequestsLoading = false;
      },
      error: (err) => {
        this.enrollmentRequests = [];
        this.enrollmentRequestsTotal = 0;
        this.enrollmentRequestsLoading = false;
        this.notification.showError(this.resolveErrorMessage(err, 'Failed to load enrollment requests.'));
      }
    });
  }

  applyEnrollmentRequestFilters(): void {
    this.enrollmentRequestsPage = 1;
    this.loadEnrollmentRequests();
  }

  // ── Enrollment roster (admin) ────────────────────────────────────────────

  loadEnrollments(): void {
    this.enrollmentsLoading = true;
    const params: any = { page: this.enrollmentsPage, pageSize: this.enrollmentsPageSize };
    if (this.enrollmentStatusFilter) params.enrollmentStatus = this.enrollmentStatusFilter;
    if (this.enrollmentSearch && this.enrollmentSearch.trim()) params.searchTerm = this.enrollmentSearch.trim();

    this.payrollService.getSocialSecurityEnrollments(params).pipe(take(1)).subscribe({
      next: (result: any) => {
        this.enrollments = this.extractItems(result) as SocialSecurityEnrollmentRoster[];
        this.enrollmentsTotal = this.extractTotalCount(result, this.enrollments.length);
        this.enrollmentsLoading = false;
      },
      error: (err) => {
        this.enrollments = [];
        this.enrollmentsTotal = 0;
        this.enrollmentsLoading = false;
        this.notification.showError(this.resolveErrorMessage(err, 'Failed to load enrollments.'));
      }
    });
  }

  applyEnrollmentFilters(): void {
    this.enrollmentsPage = 1;
    this.loadEnrollments();
  }

  clearEnrollmentFilters(): void {
    this.enrollmentSearch = '';
    this.enrollmentStatusFilter = '';
    this.enrollmentsPage = 1;
    this.loadEnrollments();
  }

  effectiveEmployeePct(e: SocialSecurityEnrollmentRoster): number {
    return Number(e.employeeCustomPct ?? e.ruleEmployeeDefaultPct ?? 0);
  }

  effectiveEmployerPct(e: SocialSecurityEnrollmentRoster): number {
    return Number(e.employerCustomPct ?? e.ruleEmployerDefaultPct ?? 0);
  }

  // ── Supporting documents (admin view + verify) ───────────────────────────

  openRequestDocuments(req: SocialSecurityEnrollmentRequest): void {
    const data: SocialSecurityDocumentsDialogData = {
      requestId: req.requestId,
      title: `Documents — ${req.employeeName} (${req.requestType})`,
      canVerify: true
    };
    const ref = this.dialog.open(SocialSecurityDocumentsDialogComponent, {
      width: '640px', maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false, restoreFocus: false, data
    });
    ref.afterClosed().subscribe((changed: boolean | undefined) => {
      if (changed) this.loadEnrollmentRequests();
    });
  }

  openClaimDocuments(claim: SocialSecurityClaim): void {
    if (!claim.requestId) {
      this.notification.showError('This claim has no linked document set.');
      return;
    }
    const data: SocialSecurityDocumentsDialogData = {
      requestId: claim.requestId,
      title: `Documents — ${claim.employeeName} (${claim.claimType} claim)`,
      canVerify: true
    };
    const ref = this.dialog.open(SocialSecurityDocumentsDialogComponent, {
      width: '640px', maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false, restoreFocus: false, data
    });
    ref.afterClosed().subscribe((changed: boolean | undefined) => {
      if (changed) this.loadBenefitClaims();
    });
  }

  approveEnrollmentRequest(req: SocialSecurityEnrollmentRequest): void {
    const linkedRule = req.ruleId
      ? this.rules.find((rule) => rule.ruleId === req.ruleId)
      : undefined;

    const data: SocialSecurityAdminActionDialogData = {
      mode: 'approve-request',
      subject: `${req.employeeName} — ${req.requestType}`,
      defaultEmployeePct: req.requestedEmployeePct ?? null,
      defaultEmployerPct: req.requestedEmployerPct ?? null,
      ruleEmployeePct: linkedRule?.employeeDefaultPct ?? null,
      ruleEmployerPct: linkedRule?.employerDefaultPct ?? null,
      ruleName: linkedRule?.ruleName ?? req.ruleName ?? null,
      defaultSalaryCap: req.requestedSalaryCap ?? null,
      defaultEffectiveDate: req.requestedEffectiveDate ? String(req.requestedEffectiveDate).slice(0, 10) : null
    };

    const ref = this.dialog.open(SocialSecurityAdminActionDialogComponent, {
      width: '560px', maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false, restoreFocus: false, data
    });

    ref.afterClosed().subscribe((result: SocialSecurityAdminActionResult | undefined) => {
      if (!result) return;
      this.payrollService.approveSocialSecurityEnrollmentRequest(req.requestId, {
        remarks: result.remarks ?? null,
        overrideEmployeePct: result.overrideEmployeePct ?? null,
        overrideEmployerPct: result.overrideEmployerPct ?? null,
        overrideSalaryCap: result.overrideSalaryCap ?? null,
        effectiveDate: result.effectiveDate ?? null
      }).subscribe({
        next: () => {
          this.notification.showSuccess('Enrollment request approved.');
          this.loadEnrollmentRequests();
        },
        error: (err) => this.notification.showError(this.resolveErrorMessage(err, 'Failed to approve request.'))
      });
    });
  }

  rejectEnrollmentRequest(req: SocialSecurityEnrollmentRequest): void {
    const data: SocialSecurityAdminActionDialogData = {
      mode: 'reject-request',
      subject: `${req.employeeName} — ${req.requestType}`
    };

    const ref = this.dialog.open(SocialSecurityAdminActionDialogComponent, {
      width: '480px', maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false, restoreFocus: false, data
    });

    ref.afterClosed().subscribe((result: SocialSecurityAdminActionResult | undefined) => {
      if (!result) return;
      this.payrollService.rejectSocialSecurityEnrollmentRequest(req.requestId, {
        rejectionReason: result.rejectionReason ?? null
      }).subscribe({
        next: () => {
          this.notification.showSuccess('Enrollment request rejected.');
          this.loadEnrollmentRequests();
        },
        error: (err) => this.notification.showError(this.resolveErrorMessage(err, 'Failed to reject request.'))
      });
    });
  }

  // ── Benefit claims (admin) ───────────────────────────────────────────────

  loadBenefitClaims(): void {
    this.benefitClaimsLoading = true;
    const params: any = { page: this.benefitClaimsPage, pageSize: this.benefitClaimsPageSize };
    if (this.benefitClaimStatusFilter) params.claimStatus = this.benefitClaimStatusFilter;
    if (this.benefitClaimTypeFilter) params.claimType = this.benefitClaimTypeFilter;

    this.payrollService.getSocialSecurityClaims(params).pipe(take(1)).subscribe({
      next: (result: any) => {
        this.benefitClaims = this.extractItems(result) as SocialSecurityClaim[];
        this.benefitClaimsTotal = this.extractTotalCount(result, this.benefitClaims.length);
        this.benefitClaimsLoading = false;
      },
      error: (err) => {
        this.benefitClaims = [];
        this.benefitClaimsTotal = 0;
        this.benefitClaimsLoading = false;
        this.notification.showError(this.resolveErrorMessage(err, 'Failed to load benefit claims.'));
      }
    });
  }

  applyClaimFilters(): void {
    this.benefitClaimsPage = 1;
    this.loadBenefitClaims();
  }

  approveBenefitClaim(claim: SocialSecurityClaim): void {
    const data: SocialSecurityAdminActionDialogData = {
      mode: 'approve-claim',
      subject: `${claim.employeeName} — ${claim.claimType}`,
      claimedAmount: claim.claimedAmount ?? 0
    };

    const ref = this.dialog.open(SocialSecurityAdminActionDialogComponent, {
      width: '560px', maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false, restoreFocus: false, data
    });

    ref.afterClosed().subscribe((result: SocialSecurityAdminActionResult | undefined) => {
      if (!result) return;
      this.payrollService.approveSocialSecurityClaim(claim.claimId, {
        approvedAmount: Number(result.approvedAmount ?? 0),
        decisionNotes: result.remarks ?? null
      }).subscribe({
        next: () => {
          this.notification.showSuccess('Claim approved.');
          this.loadBenefitClaims();
        },
        error: (err) => this.notification.showError(this.resolveErrorMessage(err, 'Failed to approve claim.'))
      });
    });
  }

  rejectBenefitClaim(claim: SocialSecurityClaim): void {
    const data: SocialSecurityAdminActionDialogData = {
      mode: 'reject-claim',
      subject: `${claim.employeeName} — ${claim.claimType}`
    };

    const ref = this.dialog.open(SocialSecurityAdminActionDialogComponent, {
      width: '480px', maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false, restoreFocus: false, data
    });

    ref.afterClosed().subscribe((result: SocialSecurityAdminActionResult | undefined) => {
      if (!result) return;
      this.payrollService.rejectSocialSecurityClaim(claim.claimId, {
        rejectionReason: result.rejectionReason ?? null
      }).subscribe({
        next: () => {
          this.notification.showSuccess('Claim rejected.');
          this.loadBenefitClaims();
        },
        error: (err) => this.notification.showError(this.resolveErrorMessage(err, 'Failed to reject claim.'))
      });
    });
  }

  markBenefitClaimPaid(claim: SocialSecurityClaim): void {
    const data: SocialSecurityAdminActionDialogData = {
      mode: 'mark-claim-paid',
      subject: `${claim.employeeName} — ${claim.claimType}`,
      approvedAmount: claim.approvedAmount ?? claim.claimedAmount ?? 0
    };

    const ref = this.dialog.open(SocialSecurityAdminActionDialogComponent, {
      width: '560px', maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false, restoreFocus: false, data
    });

    ref.afterClosed().subscribe((result: SocialSecurityAdminActionResult | undefined) => {
      if (!result) return;
      this.payrollService.markSocialSecurityClaimPaid(claim.claimId, {
        paidAmount: Number(result.paidAmount ?? 0),
        paymentDate: String(result.paymentDate ?? new Date().toISOString().slice(0, 10)),
        paymentReference: result.paymentReference ?? null,
        authorityReference: result.authorityReference ?? null
      }).subscribe({
        next: () => {
          this.notification.showSuccess('Claim marked as paid.');
          this.loadBenefitClaims();
        },
        error: (err) => this.notification.showError(this.resolveErrorMessage(err, 'Failed to mark claim paid.'))
      });
    });
  }
}
