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
  ProvidentFundRuleOption
} from '../dialogs/provident-fund-request-dialog/provident-fund-request-dialog.component';
import { DeleteActionDialogComponent } from '../dialogs/delete-action-dialog/delete-action-dialog.component';
import { PayrollService } from '../../services/payroll.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { NotificationService } from '@core/services/notification.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { AuthService } from '@core/services/auth.service';

type ProvidentFundTab = 'request' | 'history';
type ProvidentFundRequestStatus = 'pending' | 'approved' | 'active' | 'inactive' | 'completed' | 'rejected' | 'cancelled' | 'update';

interface ProvidentFundRequestRecord {
  id: string;
  pfId: string;
  ruleId: string;
  ruleName: string;
  requestType: string;
  employeePct: number;
  employerPct: number;
  effectiveFrom: string;
  remarks: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  updatedAt: string;
  createdAt: string;
  isActive: boolean;
  status: ProvidentFundRequestStatus;
}

interface ProvidentFundHistoryRecord {
  id: string;
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

interface ProvidentFundActiveRecord {
  pfId: string;
  ruleId: string;
  ruleName: string;
  requestType: string;
  employeePct: number;
  employerPct: number;
  effectiveFrom: string;
  approvedAt: string | null;
  updatedAt: string;
  remarks: string | null;
  status: ProvidentFundRequestStatus;
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

  tab: ProvidentFundTab = 'request';
  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());
  readonly isLoading = signal(true);

  activeRules: ProvidentFundRuleOption[] = [];
  pendingRequest: ProvidentFundRequestRecord | null = null;
  activeRequest: ProvidentFundRequestRecord | null = null;
  transactions: ProvidentFundHistoryRecord[] = [];
  historyTotalCount = 0;
  currentEmployeeBasicSalary = 0;

  pendingHistoryTypeFilter = '';
  historyTypeFilter = '';
  historyCurrentPage = 1;
  historyPageSize = 10;

  get requestedRecords(): ProvidentFundRequestRecord[] {
    return this.pendingRequest ? [this.pendingRequest] : [];
  }

  get activeRecords(): ProvidentFundActiveRecord[] {
    if (!this.activeRequest) {
      return [];
    }

    const status = String(this.activeRequest.status ?? '').trim().toLowerCase();
    const isActiveOrInactiveStatus = status === 'active' || status === 'inactive';
    if (!isActiveOrInactiveStatus) {
      return [];
    }

    return [
      {
        pfId: this.activeRequest.pfId,
        ruleId: this.activeRequest.ruleId,
        ruleName: this.activeRequest.ruleName,
        requestType: this.activeRequest.requestType,
        employeePct: this.activeRequest.employeePct,
        employerPct: this.activeRequest.employerPct,
        effectiveFrom: this.activeRequest.effectiveFrom,
        approvedAt: this.activeRequest.approvedAt,
        updatedAt: this.activeRequest.updatedAt,
        remarks: this.activeRequest.remarks,
        status: this.activeRequest.status
      }
    ];
  }

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
    if (!this.pendingEnrollmentRequest) {
      return 0;
    }
    return this.pendingEnrollmentRequest.employeePct + this.pendingEnrollmentRequest.employerPct;
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

  ngOnInit(): void {
    this.loadCurrencySymbol();
    this.loadCurrentEmployeeBasicSalary();
    this.loadActiveRules();
    this.refreshData();
  }

  goBackToBenefits(): void {
    this.router.navigate(['/payroll/my-benefits']);
  }

  setTab(tab: ProvidentFundTab): void {
    this.tab = tab;
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

  get pendingEnrollmentRequest(): ProvidentFundRequestRecord | null {
    if (!this.pendingRequest) {
      return null;
    }

    const requestType = String(this.pendingRequest.requestType ?? '').trim().toLowerCase();
    const status = String(this.pendingRequest.status ?? '').trim().toLowerCase();
    return requestType === 'enrollment' && status === 'pending' ? this.pendingRequest : null;
  }

  get activeLikeRequestRecord(): ProvidentFundActiveRecord | null {
    if (this.activeRecords.length > 0) {
      return this.activeRecords[0];
    }

    if (!this.pendingRequest) {
      return null;
    }

    const requestType = String(this.pendingRequest.requestType ?? '').trim().toLowerCase();

    if (requestType !== 'enrollment') {
      return {
        pfId: this.pendingRequest.pfId,
        ruleId: this.pendingRequest.ruleId,
        ruleName: this.pendingRequest.ruleName,
        requestType: this.pendingRequest.requestType,
        employeePct: this.pendingRequest.employeePct,
        employerPct: this.pendingRequest.employerPct,
        effectiveFrom: this.pendingRequest.effectiveFrom,
        approvedAt: this.pendingRequest.approvedAt,
        updatedAt: this.pendingRequest.updatedAt,
        remarks: this.pendingRequest.remarks,
        status: this.pendingRequest.status
      };
    }

    return null;
  }

  openAddRequestDialog(): void {
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
            this.tab = 'request';
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
    if (row.status !== 'pending' && row.status !== 'approved') {
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
          ruleId: row.ruleId,
          employeePct: row.employeePct,
          effectiveFrom: row.effectiveFrom
        }
      }
    });

    dialogRef.afterClosed().subscribe((result: ProvidentFundRequestDialogPayload | undefined) => {
      if (!result || result.mode !== 'enrollment' || !result.ruleId || !result.effectiveFrom) {
        return;
      }

      this.payrollService.updateProvidentFundEnrollmentRequest(row.pfId, {
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

      this.payrollService.deleteProvidentFundRequest(row.pfId)
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
    const current = this.activeLikeRequestRecord;
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
    const dialogRef = this.dialog.open(ProvidentFundRequestDialogComponent, {
      width: '560px',
      panelClass: 'provident-fund-request-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        currencySymbol: this.currencySymbol(),
        mode: 'withdrawal'
      }
    });

    dialogRef.afterClosed().subscribe((result: ProvidentFundRequestDialogPayload | undefined) => {
      if (!result || result.mode !== 'withdrawal') {
        return;
      }

      this.payrollService.createProvidentFundWithdrawalRequest({
        amount: Number(result.amount ?? 0),
        reason: result.reason ?? ''
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

  openSettlementDialog(): void {
    const dialogRef = this.dialog.open(ProvidentFundRequestDialogComponent, {
      width: '560px',
      panelClass: 'provident-fund-request-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        currencySymbol: this.currencySymbol(),
        mode: 'settlement'
      }
    });

    dialogRef.afterClosed().subscribe((result: ProvidentFundRequestDialogPayload | undefined) => {
      if (!result || result.mode !== 'settlement' || !result.effectiveFrom) {
        return;
      }

      this.payrollService.createProvidentFundSettlementRequest({
        effectiveFrom: result.effectiveFrom,
        remarks: result.remarks ?? ''
      })
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.notification.showSuccess('Provident fund settlement request submitted.');
            this.refreshData();
          },
          error: (error) => {
            console.error('Failed to submit provident fund settlement request', error);
            this.notification.showError('Failed to submit settlement request.');
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
    if (normalized === 'settlement') {
      return 'Settlement';
    }
    if (normalized === 'update') {
      return 'Update';
    }
    return 'Request';
  }

  private refreshData(): void {
    this.isLoading.set(true);
    this.loadPendingRequest();
    this.loadActiveRequest();
    this.loadTransactions();
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

  private loadPendingRequest(): void {
    this.payrollService.getMyPendingProvidentFundRequest()
      .pipe(take(1))
      .subscribe({
        next: (row: any) => {
          this.pendingRequest = row ? this.mapPendingRequest(row) : null;
        },
        error: (error) => {
          const status = Number(error?.status ?? 0);
          if (status !== 404) {
            console.error('Failed to load pending provident fund request', error);
          }
          this.pendingRequest = null;
        }
      });
  }

  private loadActiveRequest(): void {
    this.payrollService.getMyActiveProvidentFundRequest()
      .pipe(take(1))
      .subscribe({
        next: (row: any) => {
          this.activeRequest = row ? this.mapPendingRequest(row) : null;
        },
        error: (error) => {
          const status = Number(error?.status ?? 0);
          if (status !== 404) {
            console.error('Failed to load active provident fund request', error);
          }
          this.activeRequest = null;
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

  private mapPendingRequest(item: any): ProvidentFundRequestRecord {
    return {
      id: String(item.pfId ?? item.id ?? ''),
      pfId: String(item.pfId ?? item.id ?? ''),
      ruleId: String(item.ruleId ?? ''),
      ruleName: String(item.ruleName ?? item.ruleId ?? 'N/A'),
      requestType: String(item.requestType ?? 'enrollment'),
      employeePct: Number(item.employeePct ?? 0),
      employerPct: Number(item.employerPct ?? 0),
      effectiveFrom: this.normalizeDate(item.effectiveFrom),
      remarks: item.remarks ? String(item.remarks) : null,
      rejectionReason: item.rejectionReason ? String(item.rejectionReason) : null,
      approvedAt: this.normalizeDateNullable(item.approvedAt),
      updatedAt: this.normalizeDate(item.updatedAt),
      createdAt: this.normalizeDate(item.createdAt),
      isActive: Boolean(item.isActive),
      status: this.normalizeStatus(item.pfStatus ?? item.status)
    };
  }

  private mapTransaction(item: any, index: number): ProvidentFundHistoryRecord {
    return {
      id: String(item.transactionId ?? item.id ?? `pf-tx-${index + 1}`),
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

  private normalizeStatus(value: unknown): ProvidentFundRequestStatus {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'pending') return 'pending';
    if (normalized === 'approved') return 'approved';
    if (normalized === 'rejected') return 'rejected';
    if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
    if (normalized === 'completed' || normalized === 'closed') return 'completed';
    if (normalized === 'update') return 'update';
    if (normalized === 'inactive') return 'inactive';
    return 'active';
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
}
