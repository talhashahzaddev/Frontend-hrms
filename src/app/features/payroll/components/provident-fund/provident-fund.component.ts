import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin, take } from 'rxjs';

import { PayrollService } from '../../services/payroll.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { NotificationService } from '@core/services/notification.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { AuthService } from '@core/services/auth.service';
import { Employee } from '../../../../core/models/employee.models';
import { DeleteActionDialogComponent } from '../dialogs/delete-action-dialog/delete-action-dialog.component';
import { LoanRejectionDialogComponent } from '../dialogs/loan-rejection-dialog/loan-rejection-dialog.component';
import {
  AddPfFundsComponent,
  AddPfFundsDialogPayload,
  PfFundsEmployeeOption
} from '../dialogs/add-pf-funds/add-pf-funds.component';
import {
  ManualPfEnrollmentDialogPayload,
  ManualPfEnrollmentEmployeeOption,
  ManualPfEnrollmentRuleOption,
  ManualProvidentFundEnrollmentDialogComponent
} from '../dialogs/manual-provident-fund-enrollment-dialog/manual-provident-fund-enrollment-dialog.component';

import { SharedCommonModule } from '@shared/shared-common.module';
type ProvidentFundTab = 'requests' | 'payments' | 'repayments';
type ProvidentFundStatus = 'pending' | 'approved' | 'rejected';
type ProvidentFundFundStatus = 'active' | 'closed' | 'pending';
type ProvidentFundTransactionType = 'monthly' | 'withdrawal' | 'settlement' | 'profit' | 'adjustment' | string;

interface PeriodOption {
  id: string;
  name: string;
}

interface ProvidentFundRequestRow {
  id: string;
  employeeId: string;
  employeeName: string;
  requestType: string;
  basicSalary: number;
  employeePct: number;
  employerPct: number;
  ruleName: string;
  effectiveFrom: string | null;
  approvedAt: string | null;
  remarks: string;
  rejectionReason: string;
  withdrawalType: string;
  reason: string;
  requestedAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  initials: string;
  avatarTone: string;
  status: ProvidentFundStatus;
}

interface ProvidentFundPaymentRow {
  id: string;
  employeeId: string;
  employeeName: string;
  ruleName: string;
  basicSalary: number;
  employeePct: number;
  employerPct: number;
  effectiveFrom: string;
  status: ProvidentFundFundStatus;
}

interface ProvidentFundRepaymentRow {
  transactionId: string;
  employeeId: string;
  employeeName: string;
  pfId: string;
  ruleName: string;
  periodId: string;
  periodName: string;
  employeePct: number;
  employeeAmount: number;
  employerPct: number;
  employerAmount: number;
  runningBalance: number;
  totalAmount: number;
  transactionType: ProvidentFundTransactionType;
  pfStatus: string;
  createdAt: string | null;
}


@Component({
  selector: 'app-provident-fund',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, FormsModule, MatIconModule],
  templateUrl: './provident-fund.component.html',
  styleUrl: './provident-fund.component.scss'
})
export class ProvidentFundComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly settingsService = inject(SettingsService);
  private readonly notification = inject(NotificationService);
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);

  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  currentTab: ProvidentFundTab = 'requests';

  pendingSearch = '';
  pendingStatus: ProvidentFundStatus | '' = '';
  filterSearch = '';
  filterStatus: ProvidentFundStatus | '' = '';

  pendingPaymentSearch = '';
  pendingPaymentStatus: ProvidentFundFundStatus | '' = '';
  paymentSearch = '';
  paymentStatus: ProvidentFundFundStatus | '' = '';

  pendingRepaymentSearch = '';
  pendingRepaymentPeriodId = '';
  pendingRepaymentTransactionTypeFilter = '';
  pendingRepaymentPfStatusFilter = '';
  repaymentSearch = '';
  repaymentPeriodId = '';
  repaymentTransactionTypeFilter = '';
  repaymentPfStatusFilter = '';

  requestCurrentPage = 1;
  requestPageSize = 5;

  paymentCurrentPage = 1;
  paymentPageSize = 5;

  repaymentCurrentPage = 1;
  repaymentPageSize = 10;

  periods: PeriodOption[] = [];
  private localPeriodsSeed: PeriodOption[] = [];
  requestRows: ProvidentFundRequestRow[] = [];
  requestTotalCount = 0;
  paymentRowsData: ProvidentFundPaymentRow[] = [];
  paymentTotalCount = 0;
  repaymentRows: ProvidentFundRepaymentRow[] = [];
  repaymentTotalCount = 0;
  isLoadingRequests = false;
  isLoadingRepayments = false;

  get canAccessPfAdmin(): boolean {
    return this.hasPermission('pf_admin_view');
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasPermissionByActionKey(actionKey);
  }

  ngOnInit(): void {
    this.currentTab = this.getDefaultTab();
    this.loadCurrencySymbol();
    this.localPeriodsSeed = this.buildLocalPeriods();
    this.loadPayrollPeriods();

    if (this.hasPermission('pf_admin_view')) {
      this.loadProvidentFundRequests();
      this.loadProvidentFundAccounts();
      this.loadProvidentFundRepayments();
    }
  }

  private getDefaultTab(): ProvidentFundTab {
    return 'requests';
  }

  get hasActiveFilters(): boolean {
    return !!(this.pendingSearch || this.pendingStatus);
  }

  get hasAppliedFilters(): boolean {
    return !!(this.filterSearch || this.filterStatus);
  }

  get hasActivePaymentFilters(): boolean {
    return !!(
      this.pendingPaymentSearch
      || this.pendingPaymentStatus
    );
  }

  get hasAppliedPaymentFilters(): boolean {
    return !!(
      this.paymentSearch
      || this.paymentStatus
    );
  }

  get hasActiveRepaymentFilters(): boolean {
    return !!(
      this.pendingRepaymentSearch
      || this.pendingRepaymentPeriodId
      || this.pendingRepaymentTransactionTypeFilter
      || this.pendingRepaymentPfStatusFilter
    );
  }

  get hasAppliedRepaymentFilters(): boolean {
    return !!(
      this.repaymentSearch
      || this.repaymentPeriodId
      || this.repaymentTransactionTypeFilter
      || this.repaymentPfStatusFilter
    );
  }

  get totalRequestsCount(): number {
    return this.requestTotalCount;
  }

  get pendingRequestsCount(): number {
    // Current-page count (API doesn't return breakdown counts)
    return this.requestRows.filter((row) => row.status === 'pending').length;
  }

  get approvedRequestsCount(): number {
    return this.requestRows.filter((row) => row.status === 'approved').length;
  }

  get rejectedRequestsCount(): number {
    return this.requestRows.filter((row) => row.status === 'rejected').length;
  }

  get paymentRows(): ProvidentFundPaymentRow[] {
    return this.paymentRowsData;
  }

  get totalPaymentProfilesCount(): number {
    return this.paymentTotalCount;
  }

  get approvedPaymentProfilesCount(): number {
    return this.paymentRows.filter((row) => row.status === 'active').length;
  }

  get activeFundsCount(): number {
    return this.paymentRows.filter((row) => row.status === 'active').length;
  }

  get completedPaymentProfilesCount(): number {
    return this.paymentRows.filter((row) => row.status === 'closed').length;
  }

  get totalRepaymentCollected(): number {
    return this.repaymentRows
      .filter((row) => String(row.transactionType).toLowerCase() !== 'settlement')
      .reduce((sum, row) => sum + row.totalAmount, 0);
  }

  get pendingRepaymentAmount(): number {
    return this.repaymentRows
      .filter((row) => String(row.transactionType).toLowerCase() !== 'settlement')
      .reduce((sum, row) => sum + row.runningBalance, 0);
  }

  get installmentRepaymentCount(): number {
    return this.repaymentRows.filter((row) => String(row.transactionType).toLowerCase() === 'monthly').length;
  }

  get fullRepaymentCount(): number {
    return this.repaymentRows.filter((row) => String(row.transactionType).toLowerCase() === 'settlement').length;
  }

  get filteredRequests(): ProvidentFundRequestRow[] {
    // Server-side filtering + pagination; rows already represent the current page.
    return this.requestRows;
  }

  get requestTotalPages(): number {
    return Math.max(1, Math.ceil(this.requestTotalCount / this.requestPageSize));
  }

  get requestPage(): number {
    return Math.min(this.requestCurrentPage, this.requestTotalPages);
  }

  get requestPageRange(): number[] {
    return this.buildPageRange(this.requestPage, this.requestTotalPages);
  }

  get requestsFromRecord(): number {
    return this.requestTotalCount === 0 ? 0 : (this.requestPage - 1) * this.requestPageSize + 1;
  }

  get requestsToRecord(): number {
    return Math.min(this.requestPage * this.requestPageSize, this.requestTotalCount);
  }

  get requestView(): ProvidentFundRequestRow[] {
    return this.filteredRequests;
  }

  get filteredPayments(): ProvidentFundPaymentRow[] {
    return this.paymentRows;
  }

  get paymentsTotalPages(): number {
    return Math.max(1, Math.ceil(this.paymentTotalCount / this.paymentPageSize));
  }

  get paymentsPage(): number {
    return Math.min(this.paymentCurrentPage, this.paymentsTotalPages);
  }

  get paymentPageRange(): number[] {
    return this.buildPageRange(this.paymentsPage, this.paymentsTotalPages);
  }

  get paymentsFromRecord(): number {
    return this.paymentTotalCount === 0 ? 0 : (this.paymentsPage - 1) * this.paymentPageSize + 1;
  }

  get paymentsToRecord(): number {
    return Math.min(this.paymentsPage * this.paymentPageSize, this.paymentTotalCount);
  }

  get paymentView(): ProvidentFundPaymentRow[] {
    return this.filteredPayments;
  }

  get filteredRepayments(): ProvidentFundRepaymentRow[] {
    return this.repaymentRows;
  }

  get repaymentsTotalPages(): number {
    return Math.max(1, Math.ceil(this.repaymentTotalCount / this.repaymentPageSize));
  }

  get repaymentsPage(): number {
    return Math.min(this.repaymentCurrentPage, this.repaymentsTotalPages);
  }

  get repaymentPageRange(): number[] {
    return this.buildPageRange(this.repaymentsPage, this.repaymentsTotalPages);
  }

  get repaymentsFromRecord(): number {
    return this.repaymentTotalCount === 0 ? 0 : (this.repaymentsPage - 1) * this.repaymentPageSize + 1;
  }

  get repaymentsToRecord(): number {
    return Math.min(this.repaymentsPage * this.repaymentPageSize, this.repaymentTotalCount);
  }

  get repaymentView(): ProvidentFundRepaymentRow[] {
    return this.repaymentRows;
  }

  setTab(tab: ProvidentFundTab): void {
    if (!this.hasPermission('pf_admin_view')) {
      return;
    }
    this.currentTab = tab;
    if (tab === 'payments' && !this.paymentRows.length) {
      this.loadProvidentFundAccounts();
    }
    if (tab === 'repayments' && !this.repaymentRows.length) {
      this.loadProvidentFundRepayments();
    }
  }

  applyFilters(): void {
    this.filterSearch = this.pendingSearch.trim();
    this.filterStatus = this.pendingStatus;
    this.requestCurrentPage = 1;
    this.loadProvidentFundRequests();
  }

  clearFilters(): void {
    this.pendingSearch = '';
    this.pendingStatus = '';
    this.filterSearch = '';
    this.filterStatus = '';
    this.requestCurrentPage = 1;
    this.loadProvidentFundRequests();
  }

  applyPaymentFilters(): void {
    this.paymentSearch = this.pendingPaymentSearch.trim();
    this.paymentStatus = this.pendingPaymentStatus;
    this.paymentCurrentPage = 1;
    this.loadProvidentFundAccounts();
  }

  clearPaymentFilters(): void {
    this.pendingPaymentSearch = '';
    this.pendingPaymentStatus = '';
    this.paymentSearch = '';
    this.paymentStatus = '';
    this.paymentCurrentPage = 1;
    this.loadProvidentFundAccounts();
  }

  openAddPfFundsDialog(): void {
    if (!this.hasPermission('pf_admin_add')) {
      return;
    }
    const employees = this.getDialogEmployees();
    const periods = this.getAvailablePeriods();

    if (!employees.length) {
      this.notification.showError('No employees found to create provident fund funds entry.');
      return;
    }

    if (!periods.length) {
      this.notification.showError('No payroll periods found.');
      return;
    }

    const dialogRef = this.dialog.open(AddPfFundsComponent, {
      width: '520px',
      panelClass: 'pf-funds-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        employees,
        periods
      }
    });

    dialogRef.afterClosed().subscribe((result: AddPfFundsDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.payrollService.addProvidentFundMonthlyTransaction({
        employeeId: result.employeeId,
        periodId: result.periodId
      })
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.notification.showSuccess('Provident fund monthly transaction added successfully.');
            this.loadProvidentFundRequests();
            this.loadProvidentFundRepayments();
          },
          error: (error) => {
            console.error('Failed to add provident fund monthly transaction', error);
            this.notification.showError('Failed to add provident fund monthly transaction.');
          }
        });
    });
  }

  openManualEnrollmentDialog(): void {
    if (!this.hasPermission('pf_admin_add')) {
      return;
    }
    forkJoin({
      employeesResult: this.employeeService.getEmployees({ page: 1, pageSize: 1000 } as any),
      rulesResult: this.payrollService.getActiveProvidentFundRules()
    })
      .pipe(take(1))
      .subscribe({
        next: ({ employeesResult, rulesResult }) => {
          const employees = this.mapManualEnrollmentEmployees(employeesResult?.employees ?? []);
          const rules = this.mapManualEnrollmentRules(rulesResult ?? []);

          if (!employees.length) {
            this.notification.showError('No employees found for provident fund enrollment.');
            return;
          }

          if (!rules.length) {
            this.notification.showError('No active provident fund rules found.');
            return;
          }

          const dialogRef = this.dialog.open(ManualProvidentFundEnrollmentDialogComponent, {
            width: '620px',
            panelClass: 'manual-provident-fund-enrollment-dialog-panel',
            autoFocus: false,
            restoreFocus: false,
            data: {
              employees,
              rules
            }
          });

          dialogRef.afterClosed().subscribe((result: ManualPfEnrollmentDialogPayload | undefined) => {
            if (!result) {
              return;
            }

            this.payrollService.manualProvidentFundEnrollment({
              employeeId: result.employeeId,
              ruleId: result.ruleId,
              employeePct: result.employeePct,
              employerPct: result.employerPct,
              effectiveFrom: result.effectiveFrom
            })
              .pipe(take(1))
              .subscribe({
                next: () => {
                  this.notification.showSuccess('Employee enrolled in provident fund successfully.');
                  this.loadProvidentFundRequests();
                  this.loadProvidentFundAccounts();
                },
                error: (error) => {
                  console.error('Failed to manually enroll employee in provident fund', error);
                  this.notification.showError('Failed to enroll employee in provident fund.');
                }
              });
          });
        },
        error: (error) => {
          console.error('Failed to load manual provident fund enrollment dependencies', error);
          this.notification.showError('Failed to load employees or provident fund rules.');
        }
      });
  }

  applyRepaymentFilters(): void {
    this.repaymentSearch = this.pendingRepaymentSearch.trim();
    this.repaymentPeriodId = this.pendingRepaymentPeriodId;
    this.repaymentTransactionTypeFilter = this.pendingRepaymentTransactionTypeFilter;
    this.repaymentPfStatusFilter = this.pendingRepaymentPfStatusFilter;
    this.repaymentCurrentPage = 1;
    this.loadProvidentFundRepayments();
  }

  clearRepaymentFilters(): void {
    this.pendingRepaymentSearch = '';
    this.pendingRepaymentPeriodId = '';
    this.pendingRepaymentTransactionTypeFilter = '';
    this.pendingRepaymentPfStatusFilter = '';
    this.repaymentSearch = '';
    this.repaymentPeriodId = '';
    this.repaymentTransactionTypeFilter = '';
    this.repaymentPfStatusFilter = '';
    this.repaymentCurrentPage = 1;
    this.loadProvidentFundRepayments();
  }

  goToRequestPage(page: number): void {
    if (page < 1 || page > this.requestTotalPages || page === this.requestPage) {
      return;
    }
    this.requestCurrentPage = page;
    this.loadProvidentFundRequests();
  }

  prevRequestPage(): void {
    this.goToRequestPage(this.requestPage - 1);
  }

  nextRequestPage(): void {
    this.goToRequestPage(this.requestPage + 1);
  }

  goToPaymentPage(page: number): void {
    if (page < 1 || page > this.paymentsTotalPages || page === this.paymentsPage) {
      return;
    }
    this.paymentCurrentPage = page;
    this.loadProvidentFundAccounts();
  }

  prevPaymentPage(): void {
    this.goToPaymentPage(this.paymentsPage - 1);
  }

  nextPaymentPage(): void {
    this.goToPaymentPage(this.paymentsPage + 1);
  }

  goToRepaymentPage(page: number): void {
    if (page < 1 || page > this.repaymentsTotalPages || page === this.repaymentsPage) {
      return;
    }
    this.repaymentCurrentPage = page;
    this.loadProvidentFundRepayments();
  }

  prevRepaymentPage(): void {
    this.goToRepaymentPage(this.repaymentsPage - 1);
  }

  nextRepaymentPage(): void {
    this.goToRepaymentPage(this.repaymentsPage + 1);
  }

  approveRequest(row: ProvidentFundRequestRow): void {
    if (!this.hasPermission('pf_admin_edit')) {
      return;
    }
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Approve provident fund request',
        message: `Are you sure you want to approve ${row.employeeName}'s provident fund request?`,
        confirmText: 'Approve request',
        cancelText: 'Cancel',
        confirmTheme: 'success'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }

      this.payrollService.approveProvidentFundRequest({
        requestId: row.id
      })
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.notification.showSuccess('Provident fund request approved.');
            this.loadProvidentFundRequests();
          },
          error: (err) => {
            console.error('Error approving provident fund request:', err);
            this.notification.showError('Failed to approve provident fund request.');
          }
        });
    });
  }

  rejectRequest(row: ProvidentFundRequestRow): void {
    if (!this.hasPermission('pf_admin_delete')) {
      return;
    }
    const dialogRef = this.dialog.open(LoanRejectionDialogComponent, {
      width: '460px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Reject provident fund request',
        message: `Provide the rejection reason for ${row.employeeName}'s provident fund request.`,
        submitText: 'Reject request'
      }
    });

    dialogRef.afterClosed().subscribe((reason: string | undefined) => {
      if (!reason) {
        return;
      }

      this.payrollService.rejectProvidentFundRequest(row.id, { remarks: reason })
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.notification.showSuccess('Provident fund request rejected.');
            this.loadProvidentFundRequests();
          },
          error: (err) => {
            console.error('Error rejecting provident fund request:', err);
            this.notification.showError('Failed to reject provident fund request.');
          }
        });
    });
  }

  getFundStatusClass(status: string): string {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'active') return 'status-active';
    if (normalized === 'closed') return 'status-completed';
    if (normalized === 'pending') return 'status-pending';
    if (normalized === 'approved') return 'status-approved';
    if (normalized === 'rejected') return 'status-cancelled';
    return 'status-pending';
  }

  getFundStatusLabel(status: string): string {
    if (status === 'active') return 'Active';
    if (status === 'closed') return 'Closed';
    if (status === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    if (status === 'pending') return 'Pending';
    return 'Pending';
  }

  formatDateLabel(dateValue: string | null): string {
    if (!dateValue) {
      return '-';
    }
    return new Date(dateValue).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  getRequestTypeLabel(requestType: string): string {
    const normalized = String(requestType ?? '').trim().toLowerCase();
    if (normalized === 'enrollment') return 'Enrollment';
    if (normalized === 'withdrawal') return 'Withdrawal';
    if (normalized === 'update') return 'Update';
    return 'Request';
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

  private loadPayrollPeriods(): void {
    this.payrollService.getPayrollPeriods({ page: 1, pageSize: 200, isDeleted: false })
      .pipe(take(1))
      .subscribe({
        next: (result: any) => {
          const rows = this.extractItems(result)
            .map((item: any, index: number) => this.mapPeriodOption(item, index))
            .filter((period: PeriodOption) => !!period.id && !!period.name);

          this.periods = rows.length ? rows : [...this.localPeriodsSeed];
        },
        error: (error) => {
          console.error('Error loading payroll periods for provident fund', error);
          this.periods = [...this.localPeriodsSeed];
        }
      });
  }

  private loadProvidentFundRequests(): void {
    if (!this.hasPermission('pf_admin_view')) {
      return;
    }
    this.isLoadingRequests = true;
    const filter = {
      SearchTerm: this.filterSearch || undefined,
      Status: this.filterStatus || undefined,
      Page: this.requestCurrentPage,
      PageSize: this.requestPageSize
    };

    this.payrollService.getAllProvidentFundRequests(filter)
      .pipe(take(1))
      .subscribe({
        next: (response: any) => {
          const items = this.extractItems(response);
          this.requestRows = items.map((item: any) => this.mapRequestRow(item));
          this.requestTotalCount = this.extractTotalCount(response, this.requestRows.length);
          this.isLoadingRequests = false;
        },
        error: (err) => {
          console.error('Error loading provident fund requests', err);
          this.notification.showError('Failed to load provident fund requests. Showing preview data.');
          this.requestRows = this.buildLocalRequests();
          this.requestTotalCount = this.requestRows.length;
          this.isLoadingRequests = false;
        }
      });
  }

  private loadProvidentFundAccounts(): void {
    if (!this.hasPermission('pf_admin_view')) {
      return;
    }
    const filter = {
      SearchTerm: this.paymentSearch || undefined,
      PfStatus: this.paymentStatus || undefined,
      Page: this.paymentCurrentPage,
      PageSize: this.paymentPageSize
    };

    this.payrollService.getAllProvidentFundAccounts(filter)
      .pipe(take(1))
      .subscribe({
        next: (response: any) => {
          const items = this.extractItems(response);
          this.paymentRowsData = items.map((item: any) => this.mapPaymentRow(item));
          this.paymentTotalCount = this.extractTotalCount(response, this.paymentRowsData.length);
        },
        error: (err) => {
          console.error('Error loading provident fund accounts', err);
          this.notification.showError('Failed to load provident fund accounts. Showing preview data.');
          this.paymentRowsData = this.buildLocalPaymentRows();
          this.paymentTotalCount = this.paymentRowsData.length;
        }
      });
  }

  private loadProvidentFundRepayments(): void {
    if (!this.hasPermission('pf_admin_view')) {
      return;
    }
    this.isLoadingRepayments = true;

    this.payrollService.getAllProvidentFundRepayments({
      searchTerm: this.repaymentSearch || undefined,
      periodId: this.repaymentPeriodId || undefined,
      transactionType: this.repaymentTransactionTypeFilter || undefined,
      pfStatus: this.repaymentPfStatusFilter || undefined,
      page: this.repaymentCurrentPage,
      pageSize: this.repaymentPageSize
    })
      .pipe(take(1))
      .subscribe({
        next: (response: any) => {
          const items = this.extractItems(response);
          this.repaymentRows = items.map((item: any) => this.mapRepaymentRow(item));
          this.repaymentTotalCount = this.extractTotalCount(response, this.repaymentRows.length);
          this.isLoadingRepayments = false;
        },
        error: (err) => {
          console.error('Error loading provident fund repayments', err);
          this.notification.showError('Failed to load provident fund repayments. Showing preview data.');
          this.repaymentRows = this.buildLocalRepayments();
          this.repaymentTotalCount = this.repaymentRows.length;
          this.isLoadingRepayments = false;
        }
      });
  }

  private mapRequestRow(item: any): ProvidentFundRequestRow {
    const employeeName = String(item.employeeName ?? item.employee?.name ?? 'Unknown Employee');
    const status = this.normalizeStatus(item.status);
    const requestType = this.normalizeRequestType(item.requestType);

    const fallbackId = `${String(item.employeeId ?? 'emp')}-${this.normalizeDateString(item.createdAt) || Date.now()}`;

    return {
      id: String(item.requestId ?? item.id ?? fallbackId),
      employeeId: String(item.employeeId ?? ''),
      employeeName,
      requestType,
      basicSalary: this.toNumber(item.basicSalary ?? item.salaryBasisAmount ?? 0),
      employeePct: this.toNumber(item.requestedEmployeePct ?? 0),
      employerPct: this.toNumber(item.requestedEmployerPct ?? 0),
      ruleName: String(item.ruleName ?? '').trim(),
      effectiveFrom: this.normalizeNullableDateString(item.effectiveFrom),
      approvedAt: this.normalizeNullableDateString(item.approvedAt),
      remarks: String(item.remarks ?? '').trim(),
      rejectionReason: String(item.rejectionReason ?? '').trim(),
      withdrawalType: String(item.withdrawalType ?? '').trim(),
      reason: String(item.reason ?? '').trim(),
      requestedAmount: this.toNumber(item.requestedAmount ?? 0),
      isActive: Boolean(item.isActive),
      createdAt: this.normalizeDateString(item.createdAt),
      updatedAt: this.normalizeDateString(item.updatedAt),
      initials: this.toInitials(employeeName),
      avatarTone: this.getAvatarTone(employeeName),
      status
    };
  }

  private mapRepaymentRow(item: any): ProvidentFundRepaymentRow {
    return {
      transactionId: String(item.transactionId ?? item.id ?? ''),
      employeeId: String(item.employeeId ?? ''),
      employeeName: String(item.employeeName ?? item.employee?.name ?? 'Unknown Employee'),
      pfId: String(item.pfId ?? ''),
      ruleName: String(item.ruleName ?? ''),
      periodId: String(item.periodId ?? ''),
      periodName: String(item.periodName ?? ''),
      employeePct: this.toNumber(item.employeePct ?? 0),
      employeeAmount: this.toNumber(item.employeeAmount ?? 0),
      employerPct: this.toNumber(item.employerPct ?? 0),
      employerAmount: this.toNumber(item.employerAmount ?? 0),
      runningBalance: this.toNumber(item.runningBalance ?? 0),
      totalAmount: this.toNumber(item.totalAmount ?? 0),
      transactionType: String(item.transactionType ?? '').trim().toLowerCase() || 'monthly',
      pfStatus: String(item.pfStatus ?? '').trim().toLowerCase(),
      createdAt: this.normalizeNullableDateString(item.createdAt)
    };
  }

  private mapPaymentRow(item: any): ProvidentFundPaymentRow {
    return {
      id: String(item.pfId ?? item.id ?? ''),
      employeeId: String(item.employeeId ?? ''),
      employeeName: String(item.employeeName ?? item.employee?.name ?? 'Unknown Employee'),
      ruleName: String(item.ruleName ?? 'N/A'),
      basicSalary: this.toNumber(item.basicSalary ?? 0),
      employeePct: this.toNumber(item.employeePct ?? 0),
      employerPct: this.toNumber(item.employerPct ?? 0),
      effectiveFrom: this.normalizeDateString(item.effectiveFrom),
      status: this.normalizeFundStatus(item.pfStatus)
    };
  }

  private normalizeStatus(rawStatus: unknown): ProvidentFundStatus {
    const normalized = String(rawStatus ?? '').trim().toLowerCase();
    if (normalized === 'pending') return 'pending';
    if (normalized === 'approved') return 'approved';
    if (normalized === 'rejected') return 'rejected';
    return 'pending';
  }

  private normalizeRequestType(rawType: unknown): string {
    const normalized = String(rawType ?? '').trim().toLowerCase();
    if (normalized === 'enrollment' || normalized === 'withdrawal' || normalized === 'update') {
      return normalized;
    }
    return 'enrollment';
  }

  private normalizeFundStatus(rawStatus: unknown): ProvidentFundFundStatus {
    const normalized = String(rawStatus ?? '').trim().toLowerCase();
    if (normalized === 'active') return 'active';
    if (normalized === 'closed') return 'closed';
    return 'pending';
  }

  private extractItems(data: any): any[] {
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.items)) {
      return data.items;
    }
    if (Array.isArray(data?.data)) {
      return data.data;
    }
    if (Array.isArray(data?.records)) {
      return data.records;
    }
    return [];
  }

  private extractTotalCount(data: any, fallback: number): number {
    const candidates = [
      data?.totalCount,
      data?.TotalCount,
      data?.pagination?.totalCount,
      data?.meta?.totalCount
    ];

    for (const value of candidates) {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) {
        return n;
      }
    }

    const items = this.extractItems(data);
    const firstItemCount = Number(items[0]?.totalCount ?? items[0]?.TotalCount);
    if (Number.isFinite(firstItemCount) && firstItemCount >= 0) {
      return firstItemCount;
    }

    return fallback;
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

  private paginate<T>(rows: T[], page: number, pageSize: number): T[] {
    const startIndex = (page - 1) * pageSize;
    return rows.slice(startIndex, startIndex + pageSize);
  }

  private buildLocalPeriods(): PeriodOption[] {
    return [
      { id: 'period-2024-08', name: 'Aug 2024' },
      { id: 'period-2024-09', name: 'Sep 2024' },
      { id: 'period-2024-10', name: 'Oct 2024' },
      { id: 'period-2024-11', name: 'Nov 2024' },
      { id: 'period-2024-12', name: 'Dec 2024' }
    ];
  }

  private buildLocalRequests(): ProvidentFundRequestRow[] {
    const rows: Array<
      Omit<ProvidentFundRequestRow, 'initials' | 'avatarTone'>
    > = [
      {
        id: 'pf-1001',
        employeeId: 'emp-1001',
        employeeName: 'Ahmed Hassan',
        requestType: 'enrollment',
        basicSalary: 150000,
        employeePct: 10,
        employerPct: 10,
        ruleName: 'Standard PF Rule',
        effectiveFrom: '2024-01-01',
        approvedAt: '2024-01-05',
        remarks: 'Standard provident fund enrollment',
        rejectionReason: '',
        withdrawalType: '',
        reason: '',
        requestedAmount: 0,
        isActive: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-05',
        status: 'approved',
      },
      {
        id: 'pf-1002',
        employeeId: 'emp-1002',
        employeeName: 'Sarah Khan',
        requestType: 'enrollment',
        basicSalary: 100000,
        employeePct: 8,
        employerPct: 8,
        ruleName: 'Standard PF Rule',
        effectiveFrom: '2024-03-01',
        approvedAt: '2024-03-03',
        remarks: 'Approved request awaiting activation',
        rejectionReason: '',
        withdrawalType: '',
        reason: '',
        requestedAmount: 0,
        isActive: false,
        createdAt: '2024-03-01',
        updatedAt: '2024-03-03',
        status: 'approved',
      },
      {
        id: 'pf-1003',
        employeeId: 'emp-1003',
        employeeName: 'Omar Farooq',
        requestType: 'enrollment',
        basicSalary: 90000,
        employeePct: 10,
        employerPct: 10,
        ruleName: 'Legacy PF Rule',
        effectiveFrom: '2023-11-01',
        approvedAt: '2023-11-02',
        remarks: 'Contribution cycle completed',
        rejectionReason: '',
        withdrawalType: '',
        reason: '',
        requestedAmount: 0,
        isActive: false,
        createdAt: '2023-11-01',
        updatedAt: '2024-08-01',
        status: 'approved',
      },
      {
        id: 'pf-1004',
        employeeId: 'emp-1004',
        employeeName: 'Zainab Abbas',
        requestType: 'enrollment',
        basicSalary: 140000,
        employeePct: 10,
        employerPct: 10,
        ruleName: 'Standard PF Rule',
        effectiveFrom: '2024-11-01',
        approvedAt: null,
        remarks: 'Pending review',
        rejectionReason: '',
        withdrawalType: '',
        reason: '',
        requestedAmount: 0,
        isActive: false,
        createdAt: '2024-10-29',
        updatedAt: '2024-10-29',
        status: 'pending',
      },
      {
        id: 'pf-1005',
        employeeId: 'emp-1005',
        employeeName: 'Bilal Ahmed',
        requestType: 'enrollment',
        basicSalary: 100000,
        employeePct: 10,
        employerPct: 10,
        ruleName: 'Standard PF Rule',
        effectiveFrom: '2024-10-01',
        approvedAt: null,
        remarks: '',
        rejectionReason: 'Rejected due to incomplete documents',
        withdrawalType: '',
        reason: '',
        requestedAmount: 0,
        isActive: false,
        createdAt: '2024-09-28',
        updatedAt: '2024-10-02',
        status: 'rejected',
      }
    ];

    return rows.map((row) => ({
      ...row,
      initials: this.toInitials(row.employeeName),
      avatarTone: this.getAvatarTone(row.employeeName)
    }));
  }

  private buildLocalRepayments(): ProvidentFundRepaymentRow[] {
    return [
      {
        transactionId: 'pf-txn-1',
        employeeId: 'emp-1001',
        employeeName: 'Ahmed Hassan',
        pfId: 'pf-1001',
        ruleName: 'Standard PF Rule',
        periodId: 'period-2024-10',
        periodName: 'Oct 2024',
        employeePct: 10,
        employeeAmount: 15000,
        employerPct: 10,
        employerAmount: 15000,
        runningBalance: 90000,
        totalAmount: 30000,
        transactionType: 'monthly',
        pfStatus: 'active',
        createdAt: '2024-10-31'
      },
      {
        transactionId: 'pf-txn-2',
        employeeId: 'emp-1002',
        employeeName: 'Sarah Khan',
        pfId: 'pf-1002',
        ruleName: 'Standard PF Rule',
        periodId: 'period-2024-11',
        periodName: 'Nov 2024',
        employeePct: 8,
        employeeAmount: 10000,
        employerPct: 8,
        employerAmount: 10000,
        runningBalance: 40000,
        totalAmount: 20000,
        transactionType: 'monthly',
        pfStatus: 'approved',
        createdAt: '2024-11-30'
      },
      {
        transactionId: 'pf-txn-3',
        employeeId: 'emp-1003',
        employeeName: 'Omar Farooq',
        pfId: 'pf-1003',
        ruleName: 'Legacy PF Rule',
        periodId: 'period-2024-08',
        periodName: 'Aug 2024',
        employeePct: 10,
        employeeAmount: 9000,
        employerPct: 10,
        employerAmount: 9000,
        runningBalance: 0,
        totalAmount: 18000,
        transactionType: 'settlement',
        pfStatus: 'closed',
        createdAt: '2024-08-30'
      }
    ];
  }

  private buildLocalPaymentRows(): ProvidentFundPaymentRow[] {
    return [
      {
        id: 'pf-1001',
        employeeId: 'emp-1001',
        employeeName: 'Ahmed Hassan',
        ruleName: 'Standard PF Rule',
        basicSalary: 150000,
        employeePct: 10,
        employerPct: 10,
        effectiveFrom: '2024-01-01',
        status: 'active'
      },
      {
        id: 'pf-1002',
        employeeId: 'emp-1002',
        employeeName: 'Sarah Khan',
        ruleName: 'Standard PF Rule',
        basicSalary: 100000,
        employeePct: 8,
        employerPct: 8,
        effectiveFrom: '2024-03-01',
        status: 'active'
      },
      {
        id: 'pf-1003',
        employeeId: 'emp-1003',
        employeeName: 'Omar Farooq',
        ruleName: 'Legacy PF Rule',
        basicSalary: 90000,
        employeePct: 10,
        employerPct: 10,
        effectiveFrom: '2023-11-01',
        status: 'closed'
      }
    ];
  }

  private getAvailablePeriods(): PeriodOption[] {
    return this.periods.length ? this.periods : this.localPeriodsSeed;
  }

  private getDialogEmployees(): PfFundsEmployeeOption[] {
    const byId = new Map<string, PfFundsEmployeeOption>();
    this.paymentRows.forEach((row) => {
      const employeeId = String(row.employeeId ?? '').trim();
      const employeeName = String(row.employeeName ?? '').trim();
      if (employeeId && employeeName && !byId.has(employeeId)) {
        byId.set(employeeId, { id: employeeId, name: employeeName });
      }
    });

    // Fallback to all request rows if payment projection has no entries yet.
    if (!byId.size) {
      this.requestRows.forEach((row) => {
        const employeeId = String(row.employeeId ?? '').trim();
        const employeeName = String(row.employeeName ?? '').trim();
        if (employeeId && employeeName && !byId.has(employeeId)) {
          byId.set(employeeId, { id: employeeId, name: employeeName });
        }
      });
    }

    return [...byId.values()];
  }

  private mapPeriodOption(item: any, index: number): PeriodOption {
    const id = String(item?.periodId ?? item?.id ?? `period-${index + 1}`).trim();
    const name = String(item?.periodName ?? item?.name ?? '').trim();
    return { id, name };
  }

  private mapManualEnrollmentEmployees(rows: Employee[]): ManualPfEnrollmentEmployeeOption[] {
    return (rows ?? [])
      .map((employee) => ({
        employeeId: String(employee?.employeeId ?? '').trim(),
        employeeCode: String(employee?.employeeCode ?? '').trim(),
        firstName: String(employee?.firstName ?? '').trim(),
        lastName: String(employee?.lastName ?? '').trim()
      }))
      .filter((employee) => !!employee.employeeId)
      .sort((left, right) => {
        const leftName = `${left.firstName} ${left.lastName}`.trim().toLowerCase();
        const rightName = `${right.firstName} ${right.lastName}`.trim().toLowerCase();
        return leftName.localeCompare(rightName);
      });
  }

  private mapManualEnrollmentRules(rows: any[]): ManualPfEnrollmentRuleOption[] {
    return (rows ?? [])
      .map((rule) => ({
        ruleId: String(rule?.ruleId ?? rule?.id ?? '').trim(),
        ruleName: String(rule?.ruleName ?? rule?.name ?? 'Provident Fund Rule').trim(),
        employeePct: this.toNumber(rule?.defaultEmployeePct ?? rule?.employeePct ?? 0),
        employerPct: this.toNumber(rule?.defaultEmployerPct ?? rule?.employerPct ?? 0)
      }))
      .filter((rule) => !!rule.ruleId);
  }

  private toNumber(value: unknown): number {
    const converted = Number(value ?? 0);
    return Number.isFinite(converted) ? converted : 0;
  }

  private normalizeDateString(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '';
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeNullableDateString(value: unknown): string | null {
    const normalized = this.normalizeDateString(value);
    return normalized || null;
  }

  private getAvatarTone(name: string): string {
    const tones = ['blue', 'peach', 'indigo', 'rose', 'sky', 'brown', 'gray'];
    return tones[name.length % tones.length] ?? 'gray';
  }

  private toInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

}
