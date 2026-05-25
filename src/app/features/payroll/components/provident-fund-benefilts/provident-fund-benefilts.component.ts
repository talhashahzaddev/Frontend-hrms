import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { take } from 'rxjs';

import {
  ProvidentFundRequestDialogComponent,
  ProvidentFundRequestDialogPayload,
  ProvidentFundRuleOption,
  ProvidentFundWithdrawalConfig
} from '../dialogs/provident-fund-request-dialog/provident-fund-request-dialog.component';
import { DeleteActionDialogComponent } from '../dialogs/delete-action-dialog/delete-action-dialog.component';
import { PayrollService } from '../../services/payroll.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { NotificationService } from '@core/services/notification.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { AuthService } from '@core/services/auth.service';

type ProvidentFundTab = 'funds' | 'my-requests' | 'history';
type ProvidentFundRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
type ProvidentFundRequestType = 'enrollment' | 'update' | 'withdrawal';
type ProvidentFundWithdrawalType = 'temporary' | 'permanent';

interface ProvidentFundRequestRecord {
  requestId: string;
  requestType: ProvidentFundRequestType;
  status: ProvidentFundRequestStatus;
  ruleId: string | null;
  ruleName: string | null;
  requestedEmployeePct: number | null;
  requestedEmployerPct: number | null;
  effectiveFrom: string | null;
  withdrawalType: ProvidentFundWithdrawalType | null;
  requestedAmount: number | null;
  reason: string | null;
  rejectionReason: string | null;
  createdAt: string | null;
  approvedAt: string | null;
}

interface ProvidentFundHistoryRecord {
  id: string;
  pfRequestId?: string | null;
  periodName: string;
  salaryBasisAmount: number;
  employeePct: number;
  employerPct: number;
  employeeAmount: number;
  employerAmount: number;
  totalAmount: number;
  runningBalance: number;
  transactionType: string;
  createdAt: string;
}

interface ProvidentFundAccountRecord {
  pfId: string;
  ruleId: string;
  ruleName: string;
  employeePct: number;
  employerPct: number;
  effectiveFrom: string;
  pfStatus: string;
  isActive: boolean;
  withdrawalConfig: ProvidentFundWithdrawalConfig | null;
}

@Component({
  selector: 'app-provident-fund-benefilts',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './provident-fund-benefilts.component.html',
  styleUrl: './provident-fund-benefilts.component.scss'
})
export class ProvidentFundBenefiltsComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly payrollService = inject(PayrollService);
  private readonly settingsService = inject(SettingsService);
  private readonly notification = inject(NotificationService);
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);

  private readonly pfEmployeePermissionKeys = [
    'pf_employee_enroll',
    'pf_employee_edit_enroll',
    'pf_employee_update_percentage',
    'pf_employee_withdraw',
    'pf_employee_delete_request',
    'pf_employee_pending_requests',
    'pf_employee_active',
    'pf_employee_transactions'
  ];

  get canAccessPfEmployee(): boolean {
    return this.pfEmployeePermissionKeys.some((key) => this.hasPermission(key));
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasPermissionByActionKey(actionKey);
  }

  tab: ProvidentFundTab = 'funds';
  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());
  readonly isLoading = signal(true);

  activeRules: ProvidentFundRuleOption[] = [];
  activeFund: ProvidentFundAccountRecord | null = null;
  myRequests: ProvidentFundRequestRecord[] = [];
  myRequestsTotalCount = 0;
  myRequestsCurrentPage = 1;
  myRequestsPageSize = 10;
  pendingMyRequestsStatusFilter: '' | ProvidentFundRequestStatus = '';
  myRequestsStatusFilter: '' | ProvidentFundRequestStatus = '';
  pendingMyRequestsTypeFilter: '' | ProvidentFundRequestType = '';
  myRequestsTypeFilter: '' | ProvidentFundRequestType = '';

  transactions: ProvidentFundHistoryRecord[] = [];
  historyTotalCount = 0;
  currentEmployeeBasicSalary = 0;

  pendingHistoryTypeFilter = '';
  historyTypeFilter = '';
  historyCurrentPage = 1;
  historyPageSize = 10;

  get historyRecords(): ProvidentFundHistoryRecord[] {
    return this.transactions;
  }

  get hasActiveHistoryFilters(): boolean {
    return !!this.pendingHistoryTypeFilter;
  }

  get hasAppliedHistoryFilters(): boolean {
    return !!this.historyTypeFilter;
  }

  get historyTotalPages(): number {
    return Math.max(1, Math.ceil(this.historyTotalCount / this.historyPageSize));
  }

  get historyPage(): number {
    return Math.min(this.historyCurrentPage, this.historyTotalPages);
  }

  get historyPageRange(): number[] {
    return this.buildPageRange(this.historyPage, this.historyTotalPages);
  }

  get historyFromRecord(): number {
    return this.historyTotalCount === 0
      ? 0
      : (this.historyPage - 1) * this.historyPageSize + 1;
  }

  get historyToRecord(): number {
    return Math.min(this.historyPage * this.historyPageSize, this.historyTotalCount);
  }

  get totalRequestedAmount(): number {
    const pending = this.myRequests.find((r) => r.status === 'pending' && (r.requestType === 'enrollment' || r.requestType === 'update'));
    const emp = Number(pending?.requestedEmployeePct ?? 0);
    const empr = Number(pending?.requestedEmployerPct ?? 0);
    return emp + empr;
  }

  get activeFundAmount(): number {
    return this.contributionTransactions
      .reduce((sum, row) => sum + Number(row.employeeAmount ?? 0), 0);
  }

  get settledAmount(): number {
    return this.contributionTransactions
      .reduce((sum, row) => sum + Number(row.employerAmount ?? 0), 0);
  }

  get totalContributions(): number {
    return this.contributionTransactions
      .reduce((sum, row) => sum + Number(row.employeeAmount ?? 0) + Number(row.employerAmount ?? 0), 0);
  }

  get canRequestWithdrawal(): boolean {
    const config = this.activeFund?.withdrawalConfig;
    if (!config) {
      return false;
    }
    return (config.temporary?.length ?? 0) > 0 || (config.permanent?.length ?? 0) > 0;
  }

  ngOnInit(): void {
    this.loadCurrencySymbol();

    if (!this.canAccessPfEmployee) {
      this.isLoading.set(false);
      return;
    }

    this.loadCurrentEmployeeBasicSalary();
    this.loadActiveRules();
    this.refreshData();
  }

  goBackToBenefits(): void {
    if (this.authService.hasMenuPermission('Payroll', 'My Benefits', 'my_benefits')) {
      void this.router.navigate(['/payroll/my-benefits']);
      return;
    }

    void this.router.navigate(['/dashboard']);
  }

  setTab(tab: ProvidentFundTab): void {
    this.tab = tab;
  }

  applyMyRequestsFilters(): void {
    this.myRequestsStatusFilter = this.pendingMyRequestsStatusFilter;
    this.myRequestsTypeFilter = this.pendingMyRequestsTypeFilter;
    this.myRequestsCurrentPage = 1;
    this.loadMyRequests();
  }

  clearMyRequestsFilters(): void {
    this.pendingMyRequestsStatusFilter = '';
    this.pendingMyRequestsTypeFilter = '';
    this.myRequestsStatusFilter = '';
    this.myRequestsTypeFilter = '';
    this.myRequestsCurrentPage = 1;
    this.loadMyRequests();
  }

  goToMyRequestsPage(page: number): void {
    const totalPages = Math.max(1, Math.ceil(this.myRequestsTotalCount / this.myRequestsPageSize));
    const nextPage = Math.min(Math.max(1, page), totalPages);
    if (nextPage === this.myRequestsCurrentPage) return;
    this.myRequestsCurrentPage = nextPage;
    this.loadMyRequests();
  }

  applyHistoryFilters(): void {
    this.historyTypeFilter = this.pendingHistoryTypeFilter;
    this.historyCurrentPage = 1;
    this.loadTransactions();
  }

  clearHistoryFilters(): void {
    this.pendingHistoryTypeFilter = '';
    this.historyTypeFilter = '';
    this.historyCurrentPage = 1;
    this.loadTransactions();
  }

  goToHistoryPage(page: number): void {
    if (page < 1 || page > this.historyTotalPages || page === this.historyPage) {
      return;
    }
    this.historyCurrentPage = page;
    this.loadTransactions();
  }

  prevHistoryPage(): void {
    this.goToHistoryPage(this.historyPage - 1);
  }

  nextHistoryPage(): void {
    this.goToHistoryPage(this.historyPage + 1);
  }

  openAddRequestDialog(): void {
    if (!this.hasPermission('pf_employee_enroll')) {
      return;
    }
    if (this.activeRules.length === 0) {
      this.notification.showError('No active provident fund rules found.');
      return;
    }

    const dialogRef = this.dialog.open(ProvidentFundRequestDialogComponent, {
      width: '560px',
      panelClass: 'provident-fund-request-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        currencySymbol: this.currencySymbol(),
        mode: 'enrollment',
        rules: this.activeRules,
        basicSalary: this.currentEmployeeBasicSalary
      }
    });

    dialogRef.afterClosed().subscribe((result: ProvidentFundRequestDialogPayload | undefined) => {
      if (!result || result.mode !== 'enrollment' || !result.ruleId || !result.effectiveFrom) {
        return;
      }

      this.payrollService.createProvidentFundEnrollmentRequest({
        ruleId: result.ruleId,
        employeePct: Number(result.employeePct ?? 0),
        effectiveFrom: result.effectiveFrom
      })
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.notification.showSuccess('Provident fund enrollment request submitted.');
            this.tab = 'my-requests';
            this.refreshData();
          },
          error: (error) => {
            console.error('Failed to create provident fund enrollment request', error);
            this.notification.showError('Failed to submit provident fund request.');
          }
        });
    });
  }

  openEditRequestDialog(row: ProvidentFundRequestRecord): void {
    if (!this.hasPermission('pf_employee_edit_enroll')) {
      return;
    }
    if (row.status !== 'pending' || row.requestType !== 'enrollment') {
      return;
    }

    const dialogRef = this.dialog.open(ProvidentFundRequestDialogComponent, {
      width: '560px',
      panelClass: 'provident-fund-request-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        currencySymbol: this.currencySymbol(),
        mode: 'enrollment',
        rules: this.activeRules,
        basicSalary: this.currentEmployeeBasicSalary,
        title: 'Edit provident fund request',
        submitText: 'Update request',
        initialValue: {
          ruleId: row.ruleId ?? undefined,
          employeePct: Number(row.requestedEmployeePct ?? 0),
          effectiveFrom: row.effectiveFrom ?? undefined
        }
      }
    });

    dialogRef.afterClosed().subscribe((result: ProvidentFundRequestDialogPayload | undefined) => {
      if (!result || result.mode !== 'enrollment' || !result.ruleId || !result.effectiveFrom) {
        return;
      }

      this.payrollService.updateProvidentFundEnrollmentRequest(row.requestId, {
        ruleId: result.ruleId,
        employeePct: Number(result.employeePct ?? 0),
        effectiveFrom: result.effectiveFrom
      })
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.notification.showSuccess('Provident fund request updated.');
            this.refreshData();
          },
          error: (error) => {
            console.error('Failed to update provident fund request', error);
            this.notification.showError('Failed to update provident fund request.');
          }
        });
    });
  }

  cancelRequest(row: ProvidentFundRequestRecord): void {
    if (!this.hasPermission('pf_employee_delete_request')) {
      return;
    }
    if (row.status !== 'pending') {
      return;
    }

    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Cancel provident fund request',
        message: 'Are you sure you want to cancel this provident fund request?',
        confirmText: 'Cancel request',
        cancelText: 'Keep request'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }

      this.payrollService.deleteProvidentFundRequest(row.requestId)
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.notification.showSuccess('Provident fund request cancelled.');
            this.refreshData();
          },
          error: (error) => {
            console.error('Failed to cancel provident fund request', error);
            this.notification.showError('Failed to cancel provident fund request.');
          }
        });
    });
  }

  openPercentageUpdateDialog(): void {
    if (!this.hasPermission('pf_employee_update_percentage')) {
      return;
    }
    const current = this.activeFund;
    if (!current) {
      return;
    }

    const dialogRef = this.dialog.open(ProvidentFundRequestDialogComponent, {
      width: '520px',
      panelClass: 'provident-fund-request-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        currencySymbol: this.currencySymbol(),
        mode: 'percentage-update',
        rules: this.activeRules,
        basicSalary: this.currentEmployeeBasicSalary,
        currentRuleId: current.ruleId,
        initialValue: {
          ruleId: current.ruleId,
          employeePct: current.employeePct
        }
      }
    });

    dialogRef.afterClosed().subscribe((result: ProvidentFundRequestDialogPayload | undefined) => {
      if (!result || result.mode !== 'percentage-update' || !result.ruleId) {
        return;
      }

      this.payrollService.updateProvidentFundPercentage({
        ruleId: String(result.ruleId ?? ''),
        employeePct: Number(result.employeePct ?? 0)
      })
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.notification.showSuccess('Provident fund percentage update requested.');
            this.refreshData();
          },
          error: (error) => {
            console.error('Failed to request provident fund percentage update', error);
            this.notification.showError('Failed to request percentage update.');
          }
        });
    });
  }

  openWithdrawalDialog(): void {
    if (!this.hasPermission('pf_employee_withdraw')) {
      return;
    }
    if (!this.canRequestWithdrawal) {
      this.notification.showError('Withdrawal is not allowed because no withdrawal rules are configured.');
      return;
    }

    const dialogRef = this.dialog.open(ProvidentFundRequestDialogComponent, {
      width: '560px',
      panelClass: 'provident-fund-request-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        currencySymbol: this.currencySymbol(),
        mode: 'withdrawal',
        withdrawalConfig: this.activeFund?.withdrawalConfig ?? null,
        withdrawalBaseAmount: this.totalContributions
      }
    });

    dialogRef.afterClosed().subscribe((result: ProvidentFundRequestDialogPayload | undefined) => {
      if (!result || result.mode !== 'withdrawal') {
        return;
      }

      this.payrollService.createProvidentFundWithdrawalRequest({
        amount: Number(result.amount ?? 0),
        withdrawalType: result.withdrawalType ?? 'temporary',
        reason: String(result.reason ?? '').trim()
      })
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.notification.showSuccess('Provident fund withdrawal request submitted.');
            this.refreshData();
          },
          error: (error) => {
            console.error('Failed to submit provident fund withdrawal request', error);
            this.notification.showError('Failed to submit withdrawal request.');
          }
        });
    });
  }

  getStatusClass(status: ProvidentFundRequestStatus): string {
    return `status-${status}`;
  }

  formatMoney(value: number): string {
    return `${this.currencySymbol()} ${Math.max(0, value).toLocaleString()}`;
  }

  formatDateLabel(value: string | null): string {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }

    return parsed.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  getRequestTypeLabel(value: string): string {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'enrollment') {
      return 'Enrollment';
    }
    if (normalized === 'withdrawal') {
      return 'Withdrawal';
    }
    if (normalized === 'update') {
      return 'Update';
    }
    return 'Request';
  }

  private refreshData(): void {
    this.isLoading.set(true);

    if (this.hasPermission('pf_employee_active')) {
      this.loadActiveFund();
    } else {
      this.activeFund = null;
    }

    if (this.hasPermission('pf_employee_pending_requests')) {
      this.loadMyRequests();
    } else {
      this.myRequests = [];
      this.myRequestsTotalCount = 0;
    }

    if (this.hasPermission('pf_employee_transactions')) {
      this.loadTransactions();
    } else {
      this.transactions = [];
      this.historyTotalCount = 0;
    }

    if (
      !this.hasPermission('pf_employee_active')
      && !this.hasPermission('pf_employee_pending_requests')
      && !this.hasPermission('pf_employee_transactions')
    ) {
      this.isLoading.set(false);
    }
  }

  private loadCurrencySymbol(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode: any) => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol(currencyCode));
        },
        error: () => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol());
        }
      });
  }

  private loadActiveRules(): void {
    this.payrollService.getActiveProvidentFundRules()
      .pipe(take(1))
      .subscribe({
        next: (rules) => {
          this.activeRules = (rules ?? []).map((rule: any) => ({
            ruleId: String(rule.ruleId ?? rule.id ?? ''),
            ruleName: String(rule.ruleName ?? rule.name ?? 'Provident Fund Rule'),
            defaultEmployeePct: Number(rule.defaultEmployeePct ?? rule.employeePct ?? 0),
            defaultEmployerPct: Number(rule.defaultEmployerPct ?? rule.employerPct ?? 0)
          }))
            .filter((item: ProvidentFundRuleOption) => !!item.ruleId);
        },
        error: (error) => {
          console.error('Failed to load active provident fund rules', error);
        }
      });
  }

  private loadCurrentEmployeeBasicSalary(): void {
    const currentUser = this.authService.getCurrentUserValue();
    const employeeId = String(currentUser?.userId ?? '').trim();
    if (!employeeId) {
      this.currentEmployeeBasicSalary = 0;
      return;
    }

    this.employeeService.getEmployee(employeeId)
      .pipe(take(1))
      .subscribe({
        next: (employee: any) => {
          const salary = Number(
            employee?.basicSalary
            ?? employee?.employmentDetails?.baseSalary
            ?? 0
          );
          this.currentEmployeeBasicSalary = Number.isFinite(salary) ? salary : 0;
        },
        error: (error) => {
          console.error('Failed to load current employee salary for provident fund dialog', error);
          this.currentEmployeeBasicSalary = 0;
        }
      });
  }

  private loadActiveFund(): void {
    this.payrollService.getMyActiveProvidentFund()
      .pipe(take(1))
      .subscribe({
        next: (row: any) => {
          this.activeFund = row ? this.mapActiveFund(row) : null;
        },
        error: (error) => {
          const status = Number(error?.status ?? 0);
          if (status !== 404) {
            console.error('Failed to load active provident fund account', error);
          }
          this.activeFund = null;
        }
      });
  }

  private loadMyRequests(): void {
    this.payrollService.getMyProvidentFundRequests({
      requestType: this.myRequestsTypeFilter || null,
      status: this.myRequestsStatusFilter || null,
      page: this.myRequestsCurrentPage,
      pageSize: this.myRequestsPageSize
    })
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          this.myRequests = (result?.items ?? [])
            .map((row: any) => this.mapMyRequest(row))
            .sort((a, b) => this.compareDateDesc(a.createdAt, b.createdAt));
          this.myRequestsTotalCount = Number(result?.totalCount ?? this.myRequests.length);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to load provident fund requests', error);
          this.myRequests = [];
          this.myRequestsTotalCount = 0;
          this.isLoading.set(false);
        }
      });
  }

  private loadTransactions(): void {
    this.payrollService.getMyProvidentFundTransactions({
      transactionType: this.historyTypeFilter || null,
      page: this.historyCurrentPage,
      pageSize: this.historyPageSize
    })
      .pipe(take(1))
      .subscribe({
        next: (result: any) => {
          const rows = this.extractItems(result);
          this.transactions = rows
            .map((item: any, index: number) => this.mapTransaction(item, index))
            .sort((a, b) => this.compareDateDesc(a.createdAt, b.createdAt));
          this.historyTotalCount = this.extractTotalCount(result, this.transactions.length);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to load provident fund transactions', error);
          this.transactions = [];
          this.historyTotalCount = 0;
          this.isLoading.set(false);
        }
      });
  }

  private mapMyRequest(item: any): ProvidentFundRequestRecord {
    const requestType = this.normalizeRequestType(item.requestType);
    return {
      requestId: String(item.requestId ?? item.id ?? ''),
      requestType,
      status: this.normalizeRequestStatus(item.status),
      ruleId: item.ruleId ? String(item.ruleId) : null,
      ruleName: item.ruleName ? String(item.ruleName) : null,
      requestedEmployeePct: item.requestedEmployeePct !== null && item.requestedEmployeePct !== undefined ? Number(item.requestedEmployeePct) : null,
      requestedEmployerPct: item.requestedEmployerPct !== null && item.requestedEmployerPct !== undefined ? Number(item.requestedEmployerPct) : null,
      effectiveFrom: this.normalizeDateNullable(item.effectiveFrom),
      withdrawalType: requestType === 'withdrawal' ? this.normalizeWithdrawalType(item.withdrawalType) : null,
      requestedAmount: item.requestedAmount !== null && item.requestedAmount !== undefined ? Number(item.requestedAmount) : null,
      reason: item.reason ? String(item.reason) : null,
      rejectionReason: item.rejectionReason ? String(item.rejectionReason) : null,
      createdAt: this.normalizeDateNullable(item.createdAt),
      approvedAt: this.normalizeDateNullable(item.approvedAt)
    };
  }

  private mapActiveFund(item: any): ProvidentFundAccountRecord {
    return {
      pfId: String(item.pfId ?? item.id ?? ''),
      ruleId: String(item.ruleId ?? ''),
      ruleName: String(item.ruleName ?? 'N/A'),
      employeePct: Number(item.employeePct ?? 0),
      employerPct: Number(item.employerPct ?? 0),
      effectiveFrom: this.normalizeDate(item.effectiveFrom),
      pfStatus: String(item.pfStatus ?? item.status ?? 'active'),
      isActive: Boolean(item.isActive ?? true),
      withdrawalConfig: this.parseWithdrawalConfig(item.withdrawalConfig)
    };
  }

  private mapTransaction(item: any, index: number): ProvidentFundHistoryRecord {
    return {
      id: String(item.transactionId ?? item.id ?? `pf-tx-${index + 1}`),
      pfRequestId: item.pfRequestId ? String(item.pfRequestId) : (item.pfrequestid ? String(item.pfrequestid) : null),
      periodName: String(item.periodName ?? 'N/A'),
      salaryBasisAmount: Number(item.salaryBasisAmount ?? 0),
      employeePct: Number(item.employeePct ?? 0),
      employerPct: Number(item.employerPct ?? 0),
      employeeAmount: Number(item.employeeAmount ?? 0),
      employerAmount: Number(item.employerAmount ?? 0),
      totalAmount: Number(item.totalAmount ?? 0),
      runningBalance: Number(item.runningBalance ?? 0),
      transactionType: String(item.transactionType ?? 'contribution'),
      createdAt: this.normalizeDate(item.createdAt)
    };
  }

  private normalizeRequestStatus(value: unknown): ProvidentFundRequestStatus {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'pending') return 'pending';
    if (normalized === 'approved') return 'approved';
    if (normalized === 'rejected') return 'rejected';
    if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
    return 'pending';
  }

  private normalizeRequestType(value: unknown): ProvidentFundRequestType {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'update') return 'update';
    if (normalized === 'withdrawal') return 'withdrawal';
    return 'enrollment';
  }

  private normalizeWithdrawalType(value: unknown): ProvidentFundWithdrawalType {
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === 'permanent' ? 'permanent' : 'temporary';
  }

  private extractItems(data: any): any[] {
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.data)) {
      return data.data;
    }
    if (Array.isArray(data?.items)) {
      return data.items;
    }
    return [];
  }

  private extractTotalCount(data: any, fallback: number): number {
    return Number(
      data?.totalCount
      ?? data?.count
      ?? data?.totalRecords
      ?? data?.meta?.totalCount
      ?? data?.meta?.total
      ?? fallback
    );
  }

  private normalizeDate(value: unknown): string {
    const date = this.normalizeDateNullable(value);
    return date || this.getTodayIsoDate();
  }

  private normalizeDateNullable(value: unknown): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return null;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private compareDateDesc(left: string | null, right: string | null): number {
    const leftTs = left ? new Date(left).getTime() : 0;
    const rightTs = right ? new Date(right).getTime() : 0;
    return rightTs - leftTs;
  }

  private buildPageRange(currentPage: number, totalPages: number): number[] {
    const delta = 2;
    const start = Math.max(1, currentPage - delta);
    const end = Math.min(totalPages, currentPage + delta);
    const range: number[] = [];

    for (let page = start; page <= end; page++) {
      range.push(page);
    }

    return range;
  }

  private get contributionTransactions(): ProvidentFundHistoryRecord[] {
    return this.transactions.filter((row) => {
      const type = String(row.transactionType ?? '').trim().toLowerCase();
      return type !== 'settlement';
    });
  }

  private getTodayIsoDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseWithdrawalConfig(value: unknown): ProvidentFundWithdrawalConfig | null {
    let parsed: any = value;

    try {
      if (typeof parsed === 'string' && parsed.trim()) {
        parsed = JSON.parse(parsed);
      }
      if (typeof parsed === 'string' && parsed.trim()) {
        parsed = JSON.parse(parsed);
      }
    } catch {
      return null;
    }

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const normalizeRules = (rules: any): Array<{ reason: string; minPct: number; maxPct: number }> => {
      if (!Array.isArray(rules)) {
        return [];
      }
      return rules
        .map((rule: any) => ({
          reason: String(rule?.reason ?? '').trim(),
          minPct: Number(rule?.min_pct ?? rule?.minPct ?? 0),
          maxPct: Number(rule?.max_pct ?? rule?.maxPct ?? 0)
        }))
        .filter((rule) => rule.reason.length > 0);
    };

    return {
      temporary: normalizeRules((parsed as any).temporary),
      permanent: normalizeRules((parsed as any).permanent)
    };
  }
}
