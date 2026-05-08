import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { take } from 'rxjs';

import { SettingsService } from '../../../settings/services/settings.service';
import { PayrollService } from '../../services/payroll.service';

import {
  AddLoanDialogComponent,
  LoanDialogPayload,
  LoanDialogStatus,
  LoanEmployeeOption
} from '../dialogs/add-loan-dialog/add-loan-dialog.component';
import {
  AddLoanPaymentDialogComponent,
  LoanPaymentDialogPayload,
  LoanPaymentLoanOption
} from '../dialogs/add-loan-payment-dialog/add-loan-payment-dialog.component';
import {
  AddSalaryAdvanceDialogComponent,
  SalaryAdvanceDialogPayload,
  SalaryAdvanceDialogStatus
} from '../dialogs/add-salary-advance-dialog/add-salary-advance-dialog.component';
import {
  AddRepaymentDialogComponent,
  RepaymentDialogPayload,
  RepaymentDialogType,
  RepaymentReferenceOption
} from '../dialogs/add-repayment-dialog/add-repayment-dialog.component';
import { DeleteActionDialogComponent } from '../dialogs/delete-action-dialog/delete-action-dialog.component';
import { LoanRejectionDialogComponent } from '../dialogs/loan-rejection-dialog/loan-rejection-dialog.component';
import { DisburseLoanDialogComponent } from '../dialogs/disburse-loan-dialog/disburse-loan-dialog.component';

type LoanStatus = LoanDialogStatus | 'approved' | 'accepted' | 'rejected';
type LoanTab = 'loans' | 'loan-payments' | 'repayments';
type LoanPaymentStatus = 'pending' | 'deducted' | 'skipped';
type SalaryAdvanceStatus = SalaryAdvanceDialogStatus;
type RepaymentTypeFilter = 'installment' | 'full' | '';
type PaymentMethodFilter = 'cash' | 'bank transfer' | 'payroll deduction' | '';
type RepaymentLoanStatusFilter = 'active' | 'completed' | '';

interface PeriodOption {
  id: string;
  name: string;
}

interface LoanLedgerRow {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  initials: string;
  avatarTone: string;
  totalAmount: number;
  monthlyInstallment: number;
  remainingAmount: number;
  paidAmount: number;
  recoveryPercent: number;
  status: LoanStatus;
  startDate: string;
  endDate: string | null;
  startDateLabel: string;
  totalInstallments: number;
  paidInstallments: number;
  description?: string;
}

interface LoanPaymentRow {
  id: string;
  loanId: string;
  employeeId: string;
  employeeName: string;
  loanLabel: string;
  periodId: string;
  periodName: string;
  installmentNumber: number;
  amount: number;
  remainingAmount: number;
  paidDate: string | null;
  status: LoanPaymentStatus;
}

interface DisbursedLoanRow {
  id: string;
  employeeId: string;
  employeeName: string;
  disbursementDate: string | null;
  endDate: string | null;
  remainingInstallments: number;
  totalInstallments: number;
  disbursementStatus: string;
  totalAmount: number;
  paidAmount: number;
  completionPercent: number;
}

interface SalaryAdvanceRow {
  id: string;
  employeeId: string;
  employeeName: string;
  periodId: string;
  periodName: string;
  totalAmount: number;
  monthlyDeduction: number;
  remainingAmount: number;
  status: SalaryAdvanceStatus;
  reason: string;
}

interface AdvancePaymentRow {
  id: string;
  advanceId: string;
  employeeId: string;
  employeeName: string;
  advanceLabel: string;
  periodId: string;
  periodName: string;
  amount: number;
  remainingAmount: number;
  paidDate: string | null;
  status: LoanPaymentStatus;
}

interface RepaymentLedgerRow {
  id: string;
  sourceId: string;
  type: RepaymentDialogType;
  employeeId: string;
  employeeName: string;
  referenceId: string;
  referenceLabel: string;
  periodId: string;
  periodName: string;
  amount: number;
  remainingAmount: number;
  paidDate: string | null;
  status: LoanPaymentStatus;
  repaymentType: 'installment' | 'full';
  paymentMethod: 'cash' | 'bank transfer' | 'payroll deduction';
  loanStatus: LoanStatus | 'active' | 'completed';
}

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterModule],
  templateUrl: './loans.component.html',
  styleUrl: './loans.component.scss'
})
export class LoansComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly settingsService = inject(SettingsService);
  private readonly payrollService = inject(PayrollService);

  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  currentTab: LoanTab = 'loans';

  pendingSearch = '';
  pendingStatus: LoanStatus | '' = '';

  filterSearch = '';
  filterStatus: LoanStatus | '' = '';

  pendingLoanPaymentSearch = '';
  pendingLoanPaymentStatus: string = '';
  pendingLoanPaymentMinAmount: number | null = null;
  pendingLoanPaymentMaxAmount: number | null = null;
  loanPaymentSearch = '';
  loanPaymentStatus: string = '';
  loanPaymentMinAmount: number | null = null;
  loanPaymentMaxAmount: number | null = null;

  pendingSalaryAdvanceSearch = '';
  pendingSalaryAdvanceStatusFilter: SalaryAdvanceStatus | '' = '';
  salaryAdvanceSearch = '';
  salaryAdvanceStatusFilter: SalaryAdvanceStatus | '' = '';

  pendingRepaymentSearch = '';
  pendingRepaymentTypeFilter: RepaymentTypeFilter = '';
  pendingRepaymentPaymentMethodFilter: PaymentMethodFilter = '';
  pendingRepaymentLoanStatusFilter: RepaymentLoanStatusFilter = '';
  repaymentSearch = '';
  repaymentTypeFilter: RepaymentTypeFilter = '';
  repaymentPaymentMethodFilter: PaymentMethodFilter = '';
  repaymentLoanStatusFilter: RepaymentLoanStatusFilter = '';

  employees: LoanEmployeeOption[] = [];
  periods: PeriodOption[] = [];

  loans: LoanLedgerRow[] = [];
  loanPayments: LoanPaymentRow[] = [];
  disbursedLoans: DisbursedLoanRow[] = [];
  disbursedLoansTotalRecords = 0;
  salaryAdvances: SalaryAdvanceRow[] = [];
  advancePayments: AdvancePaymentRow[] = [];
  repaymentApiRows: RepaymentLedgerRow[] = [];
  repaymentsTotalCount = 0;

  private localPeriodsSeed: PeriodOption[] = [];
  private localLoansSeed: LoanLedgerRow[] = [];
  private localLoanPaymentsSeed: LoanPaymentRow[] = [];
  private localSalaryAdvancesSeed: SalaryAdvanceRow[] = [];
  private localAdvancePaymentsSeed: AdvancePaymentRow[] = [];

  usingLocalLoanData = false;
  usingLocalLoanPaymentsData = false;
  usingLocalSalaryAdvanceData = false;
  usingLocalAdvancePaymentsData = false;

  isLoadingLoans = false;

  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;

  loanPaymentsCurrentPage = 1;
  loanPaymentsPageSize = 10;

  salaryAdvancesCurrentPage = 1;
  salaryAdvancesPageSize = 10;

  repaymentsCurrentPage = 1;
  repaymentsPageSize = 10;

  ngOnInit(): void {
    this.localPeriodsSeed = this.buildLocalPeriods();
    this.localLoansSeed = this.buildLocalLoans();
    this.localLoanPaymentsSeed = this.buildLocalLoanPayments();
    this.localSalaryAdvancesSeed = this.buildLocalSalaryAdvances();
    this.localAdvancePaymentsSeed = this.buildLocalAdvancePayments();

    this.loadEmployees();
    this.loadPayrollPeriods();

    this.loadLoans();
    this.loadLoanPayments();
    this.loadRepayments();

    this.loadCurrencySymbol();
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

  get hasActiveFilters(): boolean {
    return !!(this.pendingSearch || this.pendingStatus);
  }

  get hasAppliedFilters(): boolean {
    return !!(this.filterSearch || this.filterStatus);
  }

  get hasActiveLoanPaymentFilters(): boolean {
    return !!(
      this.pendingLoanPaymentSearch
      || this.pendingLoanPaymentStatus
      || this.pendingLoanPaymentMinAmount !== null
      || this.pendingLoanPaymentMaxAmount !== null
    );
  }

  get hasAppliedLoanPaymentFilters(): boolean {
    return !!(
      this.loanPaymentSearch
      || this.loanPaymentStatus
      || this.loanPaymentMinAmount !== null
      || this.loanPaymentMaxAmount !== null
    );
  }

  get hasActiveSalaryAdvanceFilters(): boolean {
    return !!(this.pendingSalaryAdvanceSearch || this.pendingSalaryAdvanceStatusFilter);
  }

  get hasAppliedSalaryAdvanceFilters(): boolean {
    return !!(this.salaryAdvanceSearch || this.salaryAdvanceStatusFilter);
  }

  get hasActiveRepaymentFilters(): boolean {
    return !!(
      this.pendingRepaymentSearch
      || this.pendingRepaymentTypeFilter
      || this.pendingRepaymentPaymentMethodFilter
      || this.pendingRepaymentLoanStatusFilter
    );
  }

  get hasAppliedRepaymentFilters(): boolean {
    return !!(
      this.repaymentSearch
      || this.repaymentTypeFilter
      || this.repaymentPaymentMethodFilter
      || this.repaymentLoanStatusFilter
    );
  }

  get hasFallbackNotice(): boolean {
    return this.usingLocalLoanData;
  }

  get primaryActionLabel(): string {
    if (this.currentTab === 'loan-payments') return 'Add loan payment';
    if (this.currentTab === 'repayments') return 'Add repayment';
    return 'Add loan';
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
  }

  get pageRange(): number[] {
    const delta = 2;
    const start = Math.max(1, this.currentPage - delta);
    const end = Math.min(this.totalPages, this.currentPage + delta);
    const range: number[] = [];

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    return range;
  }

  get fromRecord(): number {
    return this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  get totalLoansIssued(): number {
    return this.loans.reduce((sum, loan) => sum + loan.totalAmount, 0);
  }

  get totalLoanRequestsCount(): number {
    return this.totalRecords || this.loans.length;
  }

  get pendingLoanRequestsCount(): number {
    return this.loans.filter((loan) => loan.status === 'pending').length;
  }

  get approvedLoanRequestsCount(): number {
    return this.loans.filter((loan) => loan.status === 'approved' || loan.status === 'accepted').length;
  }

  get rejectedLoanRequestsCount(): number {
    return this.loans.filter((loan) => loan.status === 'rejected').length;
  }

  get totalRemaining(): number {
    return this.loans.reduce((sum, loan) => sum + loan.remainingAmount, 0);
  }

  get activeLoansCount(): number {
    return this.loans.filter((loan) => loan.status === 'active').length;
  }

  get monthlyDeductions(): number {
    return this.loans
      .filter((loan) => loan.status === 'active')
      .reduce((sum, loan) => sum + loan.monthlyInstallment, 0);
  }

  get totalLoanPaymentsDeducted(): number {
    return this.disbursedLoans.reduce((sum, loan) => sum + loan.paidAmount, 0);
  }

  get pendingLoanPaymentsCount(): number {
    return this.disbursedLoans.filter((loan) => String(loan.disbursementStatus).toLowerCase() === 'pending').length;
  }

  get skippedLoanPaymentsCount(): number {
    return this.disbursedLoans.filter((loan) => String(loan.disbursementStatus).toLowerCase() === 'failed').length;
  }

  get disbursedTotalAmount(): number {
    return this.disbursedLoans.reduce((sum, loan) => sum + loan.totalAmount, 0);
  }

  get disbursedAverageCompletion(): number {
    if (!this.disbursedLoans.length) {
      return 0;
    }
    const total = this.disbursedLoans.reduce((sum, loan) => sum + loan.completionPercent, 0);
    return Math.round(total / this.disbursedLoans.length);
  }

  get totalSalaryAdvancesIssued(): number {
    return this.salaryAdvances.reduce((sum, advance) => sum + advance.totalAmount, 0);
  }

  get totalSalaryAdvancesRemaining(): number {
    return this.salaryAdvances.reduce((sum, advance) => sum + advance.remainingAmount, 0);
  }

  get activeSalaryAdvancesCount(): number {
    return this.salaryAdvances.filter((advance) => advance.status === 'pending' || advance.status === 'approved').length;
  }

  get totalRepaymentCollected(): number {
    return this.repaymentRows
      .filter((row) => row.status === 'deducted')
      .reduce((sum, row) => sum + row.amount, 0);
  }

  get pendingRepaymentAmount(): number {
    return this.repaymentRows
      .filter((row) => row.status === 'pending')
      .reduce((sum, row) => sum + row.amount, 0);
  }

  get loanRepaymentCount(): number {
    return this.repaymentRows.filter((row) => row.type === 'loan').length;
  }

  get advanceRepaymentCount(): number {
    return this.repaymentRows.filter((row) => row.type === 'advance').length;
  }

  get filteredLoanPayments(): DisbursedLoanRow[] {
    return this.disbursedLoans;
  }

  get loanPaymentsTotalRecords(): number {
    return this.disbursedLoansTotalRecords;
  }

  get loanPaymentsTotalPages(): number {
    return Math.max(1, Math.ceil(this.loanPaymentsTotalRecords / this.loanPaymentsPageSize));
  }

  get loanPaymentsPage(): number {
    return Math.min(this.loanPaymentsCurrentPage, this.loanPaymentsTotalPages);
  }

  get loanPaymentsPageRange(): number[] {
    return this.buildPageRange(this.loanPaymentsPage, this.loanPaymentsTotalPages);
  }

  get loanPaymentsFromRecord(): number {
    return this.loanPaymentsTotalRecords === 0
      ? 0
      : (this.loanPaymentsPage - 1) * this.loanPaymentsPageSize + 1;
  }

  get loanPaymentsToRecord(): number {
    return Math.min(this.loanPaymentsPage * this.loanPaymentsPageSize, this.loanPaymentsTotalRecords);
  }

  get loanPaymentsView(): DisbursedLoanRow[] {
    return this.filteredLoanPayments;
  }

  get filteredSalaryAdvances(): SalaryAdvanceRow[] {
    const search = this.salaryAdvanceSearch.trim().toLowerCase();

    return this.salaryAdvances.filter((advance) => {
      const matchesSearch = !search
        || advance.employeeName.toLowerCase().includes(search)
        || advance.reason.toLowerCase().includes(search)
        || advance.periodName.toLowerCase().includes(search);

      const matchesStatus = !this.salaryAdvanceStatusFilter || advance.status === this.salaryAdvanceStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  get salaryAdvancesTotalRecords(): number {
    return this.filteredSalaryAdvances.length;
  }

  get salaryAdvancesTotalPages(): number {
    return Math.max(1, Math.ceil(this.salaryAdvancesTotalRecords / this.salaryAdvancesPageSize));
  }

  get salaryAdvancesPage(): number {
    return Math.min(this.salaryAdvancesCurrentPage, this.salaryAdvancesTotalPages);
  }

  get salaryAdvancesPageRange(): number[] {
    return this.buildPageRange(this.salaryAdvancesPage, this.salaryAdvancesTotalPages);
  }

  get salaryAdvancesFromRecord(): number {
    return this.salaryAdvancesTotalRecords === 0
      ? 0
      : (this.salaryAdvancesPage - 1) * this.salaryAdvancesPageSize + 1;
  }

  get salaryAdvancesToRecord(): number {
    return Math.min(this.salaryAdvancesPage * this.salaryAdvancesPageSize, this.salaryAdvancesTotalRecords);
  }

  get salaryAdvancesView(): SalaryAdvanceRow[] {
    return this.paginateData(this.filteredSalaryAdvances, this.salaryAdvancesPage, this.salaryAdvancesPageSize);
  }

  get repaymentRows(): RepaymentLedgerRow[] {
    return this.repaymentApiRows;
  }

  get filteredRepayments(): RepaymentLedgerRow[] {
    return this.repaymentRows;
  }

  get repaymentsTotalRecords(): number {
    return this.repaymentsTotalCount;
  }

  get repaymentsTotalPages(): number {
    return Math.max(1, Math.ceil(this.repaymentsTotalRecords / this.repaymentsPageSize));
  }

  get repaymentsPage(): number {
    return Math.min(this.repaymentsCurrentPage, this.repaymentsTotalPages);
  }

  get repaymentsPageRange(): number[] {
    return this.buildPageRange(this.repaymentsPage, this.repaymentsTotalPages);
  }

  get repaymentsFromRecord(): number {
    return this.repaymentsTotalRecords === 0
      ? 0
      : (this.repaymentsPage - 1) * this.repaymentsPageSize + 1;
  }

  get repaymentsToRecord(): number {
    return Math.min(this.repaymentsPage * this.repaymentsPageSize, this.repaymentsTotalRecords);
  }

  get repaymentsView(): RepaymentLedgerRow[] {
    return this.repaymentRows;
  }

  setTab(tab: LoanTab): void {
    this.currentTab = tab;
  }

  openPrimaryDialog(): void {
    if (this.currentTab === 'loan-payments') {
      this.openAddLoanPaymentDialog();
      return;
    }

    if (this.currentTab === 'repayments') {
      this.openAddRepaymentDialog();
      return;
    }

    this.openAddLoanDialog();
  }

  applyFilters(): void {
    this.filterSearch = this.pendingSearch.trim();
    this.filterStatus = this.pendingStatus;
    this.currentPage = 1;
    this.loadLoans();
  }

  clearFilters(): void {
    this.pendingSearch = '';
    this.pendingStatus = '';
    this.filterSearch = '';
    this.filterStatus = '';
    this.currentPage = 1;
    this.loadLoans();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.loadLoans();
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  applyLoanPaymentFilters(): void {
    this.loanPaymentSearch = this.pendingLoanPaymentSearch.trim();
    this.loanPaymentStatus = this.pendingLoanPaymentStatus;
    this.loanPaymentMinAmount = this.pendingLoanPaymentMinAmount;
    this.loanPaymentMaxAmount = this.pendingLoanPaymentMaxAmount;
    this.loanPaymentsCurrentPage = 1;
    this.loadLoanPayments();
  }

  clearLoanPaymentFilters(): void {
    this.pendingLoanPaymentSearch = '';
    this.pendingLoanPaymentStatus = '';
    this.pendingLoanPaymentMinAmount = null;
    this.pendingLoanPaymentMaxAmount = null;
    this.loanPaymentSearch = '';
    this.loanPaymentStatus = '';
    this.loanPaymentMinAmount = null;
    this.loanPaymentMaxAmount = null;
    this.loanPaymentsCurrentPage = 1;
    this.loadLoanPayments();
  }

  goToLoanPaymentPage(page: number): void {
    if (page < 1 || page > this.loanPaymentsTotalPages || page === this.loanPaymentsPage) {
      return;
    }

    this.loanPaymentsCurrentPage = page;
    this.loadLoanPayments();
  }

  prevLoanPaymentPage(): void {
    this.goToLoanPaymentPage(this.loanPaymentsPage - 1);
  }

  nextLoanPaymentPage(): void {
    this.goToLoanPaymentPage(this.loanPaymentsPage + 1);
  }

  applySalaryAdvanceFilters(): void {
    this.salaryAdvanceSearch = this.pendingSalaryAdvanceSearch.trim();
    this.salaryAdvanceStatusFilter = this.pendingSalaryAdvanceStatusFilter;
    this.salaryAdvancesCurrentPage = 1;
  }

  clearSalaryAdvanceFilters(): void {
    this.pendingSalaryAdvanceSearch = '';
    this.pendingSalaryAdvanceStatusFilter = '';
    this.salaryAdvanceSearch = '';
    this.salaryAdvanceStatusFilter = '';
    this.salaryAdvancesCurrentPage = 1;
  }

  goToSalaryAdvancePage(page: number): void {
    if (page < 1 || page > this.salaryAdvancesTotalPages || page === this.salaryAdvancesPage) {
      return;
    }

    this.salaryAdvancesCurrentPage = page;
  }

  prevSalaryAdvancePage(): void {
    this.goToSalaryAdvancePage(this.salaryAdvancesPage - 1);
  }

  nextSalaryAdvancePage(): void {
    this.goToSalaryAdvancePage(this.salaryAdvancesPage + 1);
  }

  applyRepaymentFilters(): void {
    this.repaymentSearch = this.pendingRepaymentSearch.trim();
    this.repaymentTypeFilter = this.pendingRepaymentTypeFilter;
    this.repaymentPaymentMethodFilter = this.pendingRepaymentPaymentMethodFilter;
    this.repaymentLoanStatusFilter = this.pendingRepaymentLoanStatusFilter;
    this.repaymentsCurrentPage = 1;
    this.loadRepayments();
  }

  clearRepaymentFilters(): void {
    this.pendingRepaymentSearch = '';
    this.pendingRepaymentTypeFilter = '';
    this.pendingRepaymentPaymentMethodFilter = '';
    this.pendingRepaymentLoanStatusFilter = '';
    this.repaymentSearch = '';
    this.repaymentTypeFilter = '';
    this.repaymentPaymentMethodFilter = '';
    this.repaymentLoanStatusFilter = '';
    this.repaymentsCurrentPage = 1;
    this.loadRepayments();
  }

  goToRepaymentPage(page: number): void {
    if (page < 1 || page > this.repaymentsTotalPages || page === this.repaymentsPage) {
      return;
    }

    this.repaymentsCurrentPage = page;
    this.loadRepayments();
  }

  prevRepaymentPage(): void {
    this.goToRepaymentPage(this.repaymentsPage - 1);
  }

  nextRepaymentPage(): void {
    this.goToRepaymentPage(this.repaymentsPage + 1);
  }

  openAddLoanDialog(): void {
    const dialogRef = this.dialog.open(AddLoanDialogComponent, {
      width: '520px',
      panelClass: 'loan-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'create',
        employees: this.employees
      }
    });

    dialogRef.afterClosed().subscribe((result: LoanDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.saveLoan(result);
    });
  }

  openEditLoanDialog(row: LoanLedgerRow): void {
    const dialogRef = this.dialog.open(AddLoanDialogComponent, {
      width: '520px',
      panelClass: 'loan-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'edit',
        employees: this.employees,
        initialValue: {
          employeeId: row.employeeId,
          totalAmount: row.totalAmount,
          monthlyInstallment: row.monthlyInstallment,
          startDate: row.startDate,
          endDate: row.endDate,
          status: row.status
        }
      }
    });

    dialogRef.afterClosed().subscribe((result: LoanDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.saveLoan(result, row);
    });
  }

  requestDeleteLoan(row: LoanLedgerRow): void {
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete loan',
        message: `Delete loan record for ${row.employeeName}? This action cannot be undone.`,
        confirmText: 'Delete record'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        this.deleteLoan(row);
      }
    });
  }

  disburseLoan(row: LoanLedgerRow): void {
    const dialogRef = this.dialog.open(DisburseLoanDialogComponent, {
      width: '500px',
      panelClass: 'disburse-loan-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        loanId: row.id,
        employeeName: row.employeeName
      }
    });

    dialogRef.afterClosed().subscribe((res: boolean | undefined) => {
      if (res) {
        this.loadLoans();
      }
    });
  }

  approveLoan(row: LoanLedgerRow): void {
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Approve loan request',
        message: `Are you sure you want to approve ${row.employeeName}'s loan request?`,
        confirmText: 'Approve request',
        cancelText: 'Cancel',
        confirmTheme: 'success'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }

      const data = {
        loanId: row.id,
        requestStatus: 'accepted'
      };

      this.payrollService.updateLoanStatus(data).subscribe({
        next: () => {
          this.loadLoans();
        },
        error: (err) => {
          console.error('Error approving loan:', err);
        }
      });
    });
  }

  requestRejectLoan(row: LoanLedgerRow): void {
    const dialogRef = this.dialog.open(LoanRejectionDialogComponent, {
      width: '460px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Reject loan request',
        message: `Provide the rejection reason for ${row.employeeName}'s loan request.`,
        submitText: 'Reject request'
      }
    });

    dialogRef.afterClosed().subscribe((reason: string | undefined) => {
      if (!reason) {
        return;
      }

      const data = {
        loanId: row.id,
        requestStatus: 'rejected',
        rejectionReason: reason
      };

      this.payrollService.updateLoanStatus(data).subscribe({
        next: () => {
          this.loadLoans();
        },
        error: (err) => {
          console.error('Error rejecting loan:', err);
        }
      });
    });
  }

  openAddSalaryAdvanceDialog(): void {
    const dialogRef = this.dialog.open(AddSalaryAdvanceDialogComponent, {
      width: '620px',
      panelClass: 'salary-advance-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'create',
        employees: this.employees.map((employee) => ({
          id: employee.id,
          name: employee.name,
          designation: employee.designation
        })),
        periods: this.getAvailablePeriods()
      }
    });

    dialogRef.afterClosed().subscribe((result: SalaryAdvanceDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.saveSalaryAdvance(result);
    });
  }

  openEditSalaryAdvanceDialog(row: SalaryAdvanceRow): void {
    const dialogRef = this.dialog.open(AddSalaryAdvanceDialogComponent, {
      width: '620px',
      panelClass: 'salary-advance-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'edit',
        employees: this.employees.map((employee) => ({
          id: employee.id,
          name: employee.name,
          designation: employee.designation
        })),
        periods: this.getAvailablePeriods(),
        initialValue: {
          employeeId: row.employeeId,
          periodId: row.periodId,
          status: row.status,
          totalAmount: row.totalAmount,
          monthlyDeduction: row.monthlyDeduction,
          reason: row.reason
        }
      }
    });

    dialogRef.afterClosed().subscribe((result: SalaryAdvanceDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.saveSalaryAdvance(result, row);
    });
  }

  requestDeleteSalaryAdvance(row: SalaryAdvanceRow): void {
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete salary advance',
        message: `Delete salary advance for ${row.employeeName}? Linked repayments will also be removed.`,
        confirmText: 'Delete advance'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        this.deleteSalaryAdvance(row);
      }
    });
  }

  openAddLoanPaymentDialog(): void {
    const dialogRef = this.dialog.open(AddLoanPaymentDialogComponent, {
      width: '650px',
      panelClass: 'loan-payment-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'create',
        employees: this.employees.map((employee) => ({ id: employee.id, name: employee.name })),
        periods: this.getAvailablePeriods(),
        loans: this.buildLoanPaymentOptions(false)
      }
    });

    dialogRef.afterClosed().subscribe((result: LoanPaymentDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.saveLoanPayment(result);
    });
  }

  openEditLoanPaymentDialog(row: LoanPaymentRow): void {
    const loanOptions = this.ensureLoanPaymentOption(this.buildLoanPaymentOptions(true), row);

    const dialogRef = this.dialog.open(AddLoanPaymentDialogComponent, {
      width: '650px',
      panelClass: 'loan-payment-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'edit',
        employees: this.employees.map((employee) => ({ id: employee.id, name: employee.name })),
        periods: this.getAvailablePeriods(),
        loans: loanOptions,
        initialValue: {
          employeeId: row.employeeId,
          loanId: row.loanId,
          periodId: row.periodId,
          installmentAmount: row.amount,
          remainingAmount: row.remainingAmount,
          paidDate: row.paidDate,
          status: row.status
        }
      }
    });

    dialogRef.afterClosed().subscribe((result: LoanPaymentDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.saveLoanPayment(result, row);
    });
  }

  requestDeleteLoanPayment(row: LoanPaymentRow): void {
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete loan payment',
        message: `Delete loan payment record for ${row.employeeName}? This will roll back the loan outstanding amount.`,
        confirmText: 'Delete payment'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        this.deleteLoanPayment(row);
      }
    });
  }

  openAddRepaymentDialog(): void {
    const dialogRef = this.dialog.open(AddRepaymentDialogComponent, {
      width: '650px',
      maxWidth: '95vw',
      panelClass: 'repayment-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'create',
        employees: this.employees.map((employee) => ({ id: employee.id, name: employee.name })),
        periods: this.getAvailablePeriods(),
        references: this.buildRepaymentReferences(false)
      }
    });

    dialogRef.afterClosed().subscribe((result: RepaymentDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.saveRepayment(result);
    });
  }

  openEditRepaymentDialog(row: RepaymentLedgerRow): void {
    const referenceOptions = this.ensureRepaymentReference(
      this.buildRepaymentReferences(true),
      row
    );

    const dialogRef = this.dialog.open(AddRepaymentDialogComponent, {
      width: '650px',
      maxWidth: '95vw',
      panelClass: 'repayment-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'edit',
        employees: this.employees.map((employee) => ({ id: employee.id, name: employee.name })),
        periods: this.getAvailablePeriods(),
        references: referenceOptions,
        initialValue: {
          employeeId: row.employeeId,
          type: row.type,
          referenceId: row.referenceId,
          periodId: row.periodId,
          amount: row.amount,
          remainingAfter: row.remainingAmount,
          paidDate: row.paidDate,
          status: row.status
        }
      }
    });

    dialogRef.afterClosed().subscribe((result: RepaymentDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.saveRepayment(result, row);
    });
  }

  requestDeleteRepayment(row: RepaymentLedgerRow): void {
    const typeLabel = row.type === 'loan' ? 'loan' : 'salary advance';

    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete repayment record',
        message: `Delete ${typeLabel} repayment record for ${row.employeeName}? Outstanding balance will be restored.`,
        confirmText: 'Delete repayment'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        this.deleteRepayment(row);
      }
    });
  }

  trackById(_: number, row: { id: string }): string {
    return row.id;
  }

  getLoanStatusLabel(status: LoanStatus): string {
    if (status === 'approved' || status === 'accepted') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    if (status === 'completed') return 'Completed';
    if (status === 'cancelled') return 'Cancelled';
    if (status === 'pending') return 'Pending';
    return 'Active';
  }

  getLoanStatusClass(status: LoanStatus): string {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'active') return 'status-active';
    if (normalized === 'pending') return 'status-pending';
    if (normalized === 'approved' || normalized === 'accepted') return 'status-approved';
    if (normalized === 'completed' || normalized === 'closed') return 'status-completed';
    if (normalized === 'rejected' || normalized === 'cancelled' || normalized === 'canceled') return 'status-cancelled';
    return 'status-inactive';
  }

  getLoanPaymentStatusClass(status: LoanPaymentStatus): string {
    return `status-${status}`;
  }

  getLoanPaymentStatusLabel(status: LoanPaymentStatus): string {
    if (status === 'deducted') return 'Deducted';
    if (status === 'pending') return 'Pending';
    return 'Skipped';
  }

  getAdvanceStatusClass(status: SalaryAdvanceStatus): string {
    return `status-${status}`;
  }

  getAdvanceStatusLabel(status: SalaryAdvanceStatus): string {
    if (status === 'approved') return 'Approved';
    if (status === 'completed') return 'Completed';
    if (status === 'cancelled') return 'Cancelled';
    return 'Pending';
  }

  getRepaymentTypeClass(type: RepaymentDialogType): string {
    return `type-${type}`;
  }

  getRepaymentTypeLabel(type: RepaymentDialogType): string {
    return type === 'loan' ? 'Loan' : 'Salary advance';
  }

  formatDateLabel(dateValue: string | null): string {
    if (!dateValue) {
      return '-';
    }

    return this.formatDate(dateValue);
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

  private paginateData<T>(rows: T[], currentPage: number, pageSize: number): T[] {
    const startIndex = (currentPage - 1) * pageSize;
    return rows.slice(startIndex, startIndex + pageSize);
  }

  private loadEmployees(): void {
    this.employees = this.buildLocalEmployees();
  }

  private loadPayrollPeriods(): void {
    this.payrollService.getPayrollPeriods().subscribe({
      next: (response: any) => {
        const items = this.extractItems(response);
        const mapped = items
          .map((item: any, index: number) => this.mapPeriodOption(item, index))
          .filter((period) => !!period.id && !!period.name);

        const uniquePeriods = this.deduplicatePeriods(mapped);
        this.periods = uniquePeriods.length ? uniquePeriods : [...this.localPeriodsSeed];
      },
      error: (err) => {
        this.periods = [...this.localPeriodsSeed];
        console.error('Error loading payroll periods', err);
      }
    });
  }

  private loadLoans(): void {
    this.isLoadingLoans = true;

    const filter = {
      SearchTerm: this.filterSearch || undefined,
      RequestStatus: this.filterStatus || undefined,
      Page: this.currentPage,
      PageSize: this.pageSize
    };

    this.payrollService.getAllLoans(filter).subscribe({
      next: (response: any) => {
        this.isLoadingLoans = false;
        this.usingLocalLoanData = false;

        const items = this.extractItems(response);
        const uniqueItems = this.deduplicateLoanItems(items);
        this.loans = uniqueItems.map((item: any, index: number) => this.mapLoan(item, index));

        const serverTotal = this.extractTotal(response, this.loans.length);
        this.totalRecords = serverTotal === items.length ? this.loans.length : serverTotal;
      },
      error: (err) => {
        this.isLoadingLoans = false;
        this.loans = [];
        this.totalRecords = 0;
        console.error('Error loading loans', err);
      }
    });
  }

  private loadLoanPayments(): void {
    const filter = {
      SearchTerm: this.loanPaymentSearch || undefined,
      LoanStatus: this.loanPaymentStatus || undefined,
      MinTotalAmount: this.loanPaymentMinAmount ?? undefined,
      MaxTotalAmount: this.loanPaymentMaxAmount ?? undefined,
      Page: this.loanPaymentsCurrentPage,
      PageSize: this.loanPaymentsPageSize
    };

    this.payrollService.getDisbursedLoans(filter).subscribe({
      next: (response: any) => {
        this.usingLocalLoanPaymentsData = false;

        const items = this.extractItems(response);
        const uniqueItems = this.deduplicateDisbursedLoanItems(items);
        this.disbursedLoans = uniqueItems.map((item: any, index: number) => this.mapDisbursedLoan(item, index));

        const serverTotal = this.extractTotal(response, this.disbursedLoans.length);
        this.disbursedLoansTotalRecords = serverTotal === items.length ? this.disbursedLoans.length : serverTotal;
      },
      error: (err) => {
        this.disbursedLoans = [];
        this.disbursedLoansTotalRecords = 0;
        console.error('Error loading disbursed loans', err);
      }
    });
  }

  private loadRepayments(): void {
    const filter = {
      SearchTerm: this.repaymentSearch || undefined,
      RepaymentType: this.repaymentTypeFilter || undefined,
      PaymentMethod: this.repaymentPaymentMethodFilter
        ? (this.repaymentPaymentMethodFilter === 'bank transfer' ? 'bank_transfer'
          : this.repaymentPaymentMethodFilter === 'payroll deduction' ? 'payroll_deduction'
          : this.repaymentPaymentMethodFilter)
        : undefined,
      LoanStatus: this.repaymentLoanStatusFilter || undefined,
      Page: this.repaymentsCurrentPage,
      PageSize: this.repaymentsPageSize
    };

    this.payrollService.getAllRepayments(filter).subscribe({
      next: (response: any) => {
        const items = this.extractItems(response);
        const uniqueItems = this.deduplicateRepaymentItems(items);
        this.repaymentApiRows = uniqueItems.map((item: any, index: number) => this.mapRepaymentHistoryRow(item, index));

        const serverTotal = this.extractTotal(response, this.repaymentApiRows.length);
        this.repaymentsTotalCount = serverTotal === items.length ? this.repaymentApiRows.length : serverTotal;
      },
      error: (err) => {
        console.error('Error loading repayments', err);
        this.repaymentApiRows = [];
        this.repaymentsTotalCount = 0;
      }
    });
  }

  private loadSalaryAdvances(): void {
    this.activateLocalSalaryAdvanceFallback();
    this.applyLocalSalaryAdvances();
  }

  private loadAdvancePayments(): void {
    this.activateLocalAdvancePaymentsFallback();
    this.applyLocalAdvancePayments();
  }

  private saveLoan(payload: LoanDialogPayload, editingRow?: LoanLedgerRow): void {
    this.activateLocalLoanFallback();
    this.saveLocalLoan(payload, editingRow);
  }

  private saveSalaryAdvance(payload: SalaryAdvanceDialogPayload, editingRow?: SalaryAdvanceRow): void {
    this.activateLocalSalaryAdvanceFallback();
    this.saveLocalSalaryAdvance(payload, editingRow);
  }

  private saveLoanPayment(payload: LoanPaymentDialogPayload, editingRow?: LoanPaymentRow): void {
    const paymentDate = payload.paidDate ? this.toIsoDateTime(payload.paidDate) : new Date().toISOString();

    const apiPayload = {
      referenceId: payload.loanId,
      employeeId: payload.employeeId,
      periodId: payload.periodId || null,
      installmentNumber: payload.installmentNumber,
      installmentAmount: payload.installmentAmount,
      repaymentType: payload.repaymentType,
      paymentDate,
      paymentMethod: payload.repaymentMethod === 'bank transfer' ? 'bank_transfer' : payload.repaymentMethod,
      paymentStatus: this.resolveLoanPaymentStatusForApi(payload)
    };

    const request$ = editingRow
      ? this.payrollService.updateLoanPayment({
        id: editingRow.id,
        loanId: editingRow.loanId,
        ...apiPayload
      })
      : this.payrollService.addLoanPayment(apiPayload);

    request$.pipe(take(1)).subscribe({
      next: () => {
        this.loadLoans();
        this.loadLoanPayments();
        this.loadRepayments();
      },
      error: (err) => {
        if (this.isUnsupportedEndpointError(err)) {
          this.activateLocalLoanPaymentsFallback();
          this.activateLocalLoanFallback();
          this.saveLocalLoanPayment(payload, editingRow);
          return;
        }

        console.error(editingRow ? 'Error updating loan payment' : 'Error saving loan payment', err);
      }
    });
  }

  private saveAdvancePayment(payload: RepaymentDialogPayload, editingRow?: AdvancePaymentRow): void {
    this.activateLocalAdvancePaymentsFallback();
    this.activateLocalSalaryAdvanceFallback();
    this.saveLocalAdvancePayment(payload, editingRow);
  }

  private saveRepayment(payload: RepaymentDialogPayload, editingRow?: RepaymentLedgerRow): void {
    if (payload.type === 'loan') {
      const existingLoanPayment = editingRow?.type === 'loan'
        ? this.loanPayments.find((payment) => payment.id === editingRow.sourceId)
        : undefined;

      this.saveLoanPayment({
        employeeId: payload.employeeId,
        loanId: payload.referenceId,
        periodId: payload.periodId,
        installmentAmount: payload.amount,
        installmentNumber: existingLoanPayment?.installmentNumber ?? 1,
        paidDate: payload.paidDate,
        repaymentMethod: 'cash',
        repaymentType: 'installment'
      }, existingLoanPayment);
      return;
    }

    const existingAdvancePayment = editingRow?.type === 'advance'
      ? this.advancePayments.find((payment) => payment.id === editingRow.sourceId)
      : undefined;

    this.saveAdvancePayment(payload, existingAdvancePayment);
  }

  private saveLocalLoan(payload: LoanDialogPayload, editingRow?: LoanLedgerRow): void {
    const employee = this.employees.find((item) => item.id === payload.employeeId);
    const employeeName = employee?.name ?? editingRow?.employeeName ?? 'Unknown Employee';
    const designation = employee?.designation ?? editingRow?.designation ?? 'Employee';

    const totalInstallments = payload.monthlyInstallment > 0
      ? Math.max(1, Math.ceil(payload.totalAmount / payload.monthlyInstallment))
      : 0;

    const paidInstallments = payload.status === 'completed'
      ? totalInstallments
      : (editingRow?.paidInstallments ?? 0);

    const remainingAmount = payload.status === 'completed'
      ? 0
      : (editingRow ? Math.min(editingRow.remainingAmount, payload.totalAmount) : payload.totalAmount);

    if (editingRow) {
      this.localLoansSeed = this.localLoansSeed.map((loan) => {
        if (loan.id !== editingRow.id) {
          return loan;
        }

        return this.buildLoanRow({
          id: loan.id,
          employeeId: loan.employeeId,
          employeeName,
          designation,
          totalAmount: payload.totalAmount,
          monthlyInstallment: payload.monthlyInstallment,
          remainingAmount,
          status: payload.status,
          startDate: payload.startDate,
          endDate: payload.endDate,
          totalInstallments,
          paidInstallments
        });
      });
    } else {
      const localId = `local-loan-${Date.now()}`;
      this.localLoansSeed = [
        this.buildLoanRow({
          id: localId,
          employeeId: payload.employeeId,
          employeeName,
          designation,
          totalAmount: payload.totalAmount,
          monthlyInstallment: payload.monthlyInstallment,
          remainingAmount,
          status: payload.status,
          startDate: payload.startDate,
          endDate: payload.endDate,
          totalInstallments,
          paidInstallments
        }),
        ...this.localLoansSeed
      ];
    }

    this.applyLocalLoans();
  }

  private saveLocalSalaryAdvance(payload: SalaryAdvanceDialogPayload, editingRow?: SalaryAdvanceRow): void {
    const employee = this.employees.find((item) => item.id === payload.employeeId);
    const employeeName = employee?.name ?? editingRow?.employeeName ?? 'Unknown Employee';

    let remainingAmount = editingRow
      ? Math.min(editingRow.remainingAmount, payload.totalAmount)
      : payload.totalAmount;

    if (payload.status === 'completed') {
      remainingAmount = 0;
    }

    const periodName = this.getPeriodNameById(payload.periodId);

    const nextRow = this.buildSalaryAdvanceRow({
      id: editingRow?.id ?? `local-advance-${Date.now()}`,
      employeeId: payload.employeeId,
      employeeName,
      periodId: payload.periodId,
      periodName,
      totalAmount: payload.totalAmount,
      monthlyDeduction: payload.monthlyDeduction,
      remainingAmount,
      status: payload.status,
      reason: payload.reason
    });

    if (editingRow) {
      this.localSalaryAdvancesSeed = this.localSalaryAdvancesSeed.map((row) => {
        if (row.id !== editingRow.id) {
          return row;
        }

        return nextRow;
      });
    } else {
      this.localSalaryAdvancesSeed = [nextRow, ...this.localSalaryAdvancesSeed];
    }

    this.applyLocalSalaryAdvances();
  }

  private saveLocalLoanPayment(payload: LoanPaymentDialogPayload, editingRow?: LoanPaymentRow): void {
    const employeeName = this.resolveEmployeeName(payload.employeeId, editingRow?.employeeName ?? 'Unknown Employee');
    const baseLoan = this.localLoansSeed.find((loan) => loan.id === payload.loanId);

    const previousDeductedAmount = editingRow?.status === 'deducted' ? editingRow.amount : 0;
    const baseRemaining = Math.max(0, this.toNumber(baseLoan?.remainingAmount ?? 0) + previousDeductedAmount);
    const shouldDeduct = true;
    const appliedAmount = shouldDeduct ? Math.min(this.toNumber(payload.installmentAmount), baseRemaining) : 0;
    const newRemaining = Math.max(0, baseRemaining - appliedAmount);
    const rowRemaining = shouldDeduct ? newRemaining : baseRemaining;

    if (baseLoan) {
      const deltaPaidInstallments = (shouldDeduct ? 1 : 0) - (editingRow?.status === 'deducted' ? 1 : 0);
      const nextPaidInstallments = Math.max(
        0,
        Math.min(
          Math.max(baseLoan.totalInstallments, baseLoan.paidInstallments + Math.max(0, deltaPaidInstallments)),
          baseLoan.paidInstallments + deltaPaidInstallments
        )
      );

      const nextStatus: LoanStatus = newRemaining <= 0
        ? 'completed'
        : (baseLoan.status === 'completed' ? 'active' : baseLoan.status);

      this.localLoansSeed = this.localLoansSeed.map((loan) => {
        if (loan.id !== baseLoan.id) {
          return loan;
        }

        return this.buildLoanRow({
          id: loan.id,
          employeeId: loan.employeeId,
          employeeName: loan.employeeName,
          designation: loan.designation,
          totalAmount: loan.totalAmount,
          monthlyInstallment: loan.monthlyInstallment,
          remainingAmount: newRemaining,
          status: nextStatus,
          startDate: loan.startDate,
          endDate: loan.endDate,
          totalInstallments: loan.totalInstallments,
          paidInstallments: nextPaidInstallments
        });
      });
    }

    const existingInstallments = this.localLoanPaymentsSeed
      .filter((row) => row.loanId === payload.loanId)
      .map((row) => row.installmentNumber);
    const nextInstallmentNumber = existingInstallments.length
      ? Math.max(...existingInstallments) + 1
      : 1;

    const loanLabel = this.resolveLoanLabel(payload.loanId, editingRow?.loanLabel ?? 'Loan');

    const nextRow = this.buildLoanPaymentRow({
      id: editingRow?.id ?? `local-loan-payment-${Date.now()}`,
      loanId: payload.loanId,
      employeeId: payload.employeeId,
      employeeName,
      loanLabel,
      periodId: payload.periodId,
      periodName: this.getPeriodNameById(payload.periodId),
      installmentNumber: editingRow?.installmentNumber ?? nextInstallmentNumber,
      amount: shouldDeduct ? appliedAmount : payload.installmentAmount,
      remainingAmount: rowRemaining,
      paidDate: shouldDeduct ? (payload.paidDate ?? this.getTodayString()) : payload.paidDate,
      status: 'deducted'
    });

    if (editingRow) {
      this.localLoanPaymentsSeed = this.localLoanPaymentsSeed.map((row) => row.id === editingRow.id ? nextRow : row);
    } else {
      this.localLoanPaymentsSeed = [nextRow, ...this.localLoanPaymentsSeed];
    }

    this.applyLocalLoanPayments();
    this.applyLocalLoans();
  }

  private saveLocalAdvancePayment(payload: RepaymentDialogPayload, editingRow?: AdvancePaymentRow): void {
    const employeeName = this.resolveEmployeeName(payload.employeeId, editingRow?.employeeName ?? 'Unknown Employee');
    const baseAdvance = this.localSalaryAdvancesSeed.find((advance) => advance.id === payload.referenceId);

    const previousDeductedAmount = editingRow?.status === 'deducted' ? editingRow.amount : 0;
    const baseRemaining = Math.max(0, this.toNumber(baseAdvance?.remainingAmount ?? 0) + previousDeductedAmount);
    const shouldDeduct = payload.status === 'deducted';
    const appliedAmount = shouldDeduct ? Math.min(this.toNumber(payload.amount), baseRemaining) : 0;
    const newRemaining = Math.max(0, baseRemaining - appliedAmount);
    const rowRemaining = shouldDeduct ? newRemaining : baseRemaining;

    if (baseAdvance) {
      const nextStatus: SalaryAdvanceStatus = newRemaining <= 0
        ? 'completed'
        : (baseAdvance.status === 'completed' ? 'approved' : baseAdvance.status);

      this.localSalaryAdvancesSeed = this.localSalaryAdvancesSeed.map((advance) => {
        if (advance.id !== baseAdvance.id) {
          return advance;
        }

        return this.buildSalaryAdvanceRow({
          id: advance.id,
          employeeId: advance.employeeId,
          employeeName: advance.employeeName,
          periodId: advance.periodId,
          periodName: advance.periodName,
          totalAmount: advance.totalAmount,
          monthlyDeduction: advance.monthlyDeduction,
          remainingAmount: newRemaining,
          status: nextStatus,
          reason: advance.reason
        });
      });
    }

    const advanceLabel = this.resolveAdvanceLabel(payload.referenceId, editingRow?.advanceLabel ?? 'Salary advance');

    const nextRow = this.buildAdvancePaymentRow({
      id: editingRow?.id ?? `local-advance-payment-${Date.now()}`,
      advanceId: payload.referenceId,
      employeeId: payload.employeeId,
      employeeName,
      advanceLabel,
      periodId: payload.periodId,
      periodName: this.getPeriodNameById(payload.periodId),
      amount: shouldDeduct ? appliedAmount : payload.amount,
      remainingAmount: rowRemaining,
      paidDate: shouldDeduct ? (payload.paidDate ?? this.getTodayString()) : payload.paidDate,
      status: payload.status
    });

    if (editingRow) {
      this.localAdvancePaymentsSeed = this.localAdvancePaymentsSeed.map((row) => row.id === editingRow.id ? nextRow : row);
    } else {
      this.localAdvancePaymentsSeed = [nextRow, ...this.localAdvancePaymentsSeed];
    }

    this.applyLocalAdvancePayments();
    this.applyLocalSalaryAdvances();
  }

  private deleteLoan(row: LoanLedgerRow): void {
    this.activateLocalLoanFallback();
    this.activateLocalLoanPaymentsFallback();

    this.localLoansSeed = this.localLoansSeed.filter((loan) => loan.id !== row.id);
    this.localLoanPaymentsSeed = this.localLoanPaymentsSeed.filter((payment) => payment.loanId !== row.id);
    this.applyLocalLoans();
    this.applyLocalLoanPayments();
  }

  private deleteSalaryAdvance(row: SalaryAdvanceRow): void {
    this.activateLocalSalaryAdvanceFallback();
    this.activateLocalAdvancePaymentsFallback();

    this.localSalaryAdvancesSeed = this.localSalaryAdvancesSeed.filter((advance) => advance.id !== row.id);
    this.localAdvancePaymentsSeed = this.localAdvancePaymentsSeed.filter((payment) => payment.advanceId !== row.id);
    this.applyLocalSalaryAdvances();
    this.applyLocalAdvancePayments();
  }

  private deleteLoanPayment(row: LoanPaymentRow): void {
    this.activateLocalLoanPaymentsFallback();
    this.activateLocalLoanFallback();
    this.deleteLocalLoanPayment(row);
  }

  private deleteAdvancePayment(row: AdvancePaymentRow): void {
    this.activateLocalAdvancePaymentsFallback();
    this.activateLocalSalaryAdvanceFallback();
    this.deleteLocalAdvancePayment(row);
  }

  private deleteRepayment(row: RepaymentLedgerRow): void {
    if (row.type === 'loan') {
      const loanPayment = this.loanPayments.find((payment) => payment.id === row.sourceId);
      if (loanPayment) {
        this.deleteLoanPayment(loanPayment);
      }
      return;
    }

    const advancePayment = this.advancePayments.find((payment) => payment.id === row.sourceId);
    if (advancePayment) {
      this.deleteAdvancePayment(advancePayment);
    }
  }

  private deleteLocalLoanPayment(row: LoanPaymentRow): void {
    const target = this.localLoanPaymentsSeed.find((payment) => payment.id === row.id);

    if (!target) {
      this.localLoanPaymentsSeed = this.localLoanPaymentsSeed.filter((payment) => payment.id !== row.id);
      this.applyLocalLoanPayments();
      return;
    }

    if (target.status === 'deducted') {
      const loan = this.localLoansSeed.find((item) => item.id === target.loanId);
      if (loan) {
        const restoredRemaining = Math.min(loan.totalAmount, loan.remainingAmount + target.amount);
        const nextPaidInstallments = Math.max(0, loan.paidInstallments - 1);
        const nextStatus: LoanStatus = restoredRemaining >= loan.totalAmount
          ? 'active'
          : (loan.status === 'completed' ? 'active' : loan.status);

        this.localLoansSeed = this.localLoansSeed.map((item) => {
          if (item.id !== loan.id) {
            return item;
          }

          return this.buildLoanRow({
            id: item.id,
            employeeId: item.employeeId,
            employeeName: item.employeeName,
            designation: item.designation,
            totalAmount: item.totalAmount,
            monthlyInstallment: item.monthlyInstallment,
            remainingAmount: restoredRemaining,
            status: nextStatus,
            startDate: item.startDate,
            endDate: item.endDate,
            totalInstallments: item.totalInstallments,
            paidInstallments: nextPaidInstallments
          });
        });
      }
    }

    this.localLoanPaymentsSeed = this.localLoanPaymentsSeed.filter((payment) => payment.id !== row.id);
    this.applyLocalLoanPayments();
    this.applyLocalLoans();
  }

  private deleteLocalAdvancePayment(row: AdvancePaymentRow): void {
    const target = this.localAdvancePaymentsSeed.find((payment) => payment.id === row.id);

    if (!target) {
      this.localAdvancePaymentsSeed = this.localAdvancePaymentsSeed.filter((payment) => payment.id !== row.id);
      this.applyLocalAdvancePayments();
      return;
    }

    if (target.status === 'deducted') {
      const advance = this.localSalaryAdvancesSeed.find((item) => item.id === target.advanceId);
      if (advance) {
        const restoredRemaining = Math.min(advance.totalAmount, advance.remainingAmount + target.amount);
        const nextStatus: SalaryAdvanceStatus = restoredRemaining >= advance.totalAmount
          ? 'approved'
          : (advance.status === 'completed' ? 'approved' : advance.status);

        this.localSalaryAdvancesSeed = this.localSalaryAdvancesSeed.map((item) => {
          if (item.id !== advance.id) {
            return item;
          }

          return this.buildSalaryAdvanceRow({
            id: item.id,
            employeeId: item.employeeId,
            employeeName: item.employeeName,
            periodId: item.periodId,
            periodName: item.periodName,
            totalAmount: item.totalAmount,
            monthlyDeduction: item.monthlyDeduction,
            remainingAmount: restoredRemaining,
            status: nextStatus,
            reason: item.reason
          });
        });
      }
    }

    this.localAdvancePaymentsSeed = this.localAdvancePaymentsSeed.filter((payment) => payment.id !== row.id);
    this.applyLocalAdvancePayments();
    this.applyLocalSalaryAdvances();
  }

  private applyLocalLoans(): void {
    const search = this.filterSearch.trim().toLowerCase();

    const filtered = this.localLoansSeed.filter((loan) => {
      const matchesSearch = !search
        || loan.employeeName.toLowerCase().includes(search)
        || loan.designation.toLowerCase().includes(search);
      const matchesStatus = !this.filterStatus || loan.status === this.filterStatus;
      return matchesSearch && matchesStatus;
    });

    this.totalRecords = filtered.length;

    const maxPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    if (this.currentPage > maxPages) {
      this.currentPage = maxPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.loans = filtered.slice(startIndex, endIndex);
  }

  private applyLocalLoanPayments(): void {
    this.loanPayments = [...this.localLoanPaymentsSeed]
      .sort((a, b) => this.compareDatesDesc(a.paidDate, b.paidDate));
  }

  private applyLocalSalaryAdvances(): void {
    this.salaryAdvances = [...this.localSalaryAdvancesSeed];
  }

  private applyLocalAdvancePayments(): void {
    this.advancePayments = [...this.localAdvancePaymentsSeed]
      .sort((a, b) => this.compareDatesDesc(a.paidDate, b.paidDate));
  }

  private mapLoan(item: any, index: number): LoanLedgerRow {
    const totalAmount = this.toNumber(item.totalAmount ?? item.loanAmount ?? item.amount ?? item.principalAmount);
    const remainingAmount = this.toNumber(item.remainingAmount ?? item.balanceAmount);
    const startDate = this.normalizeDateString(item.startDate ?? item.createdAt);
    const totalInstallments = this.toNumber(item.totalInstallments ?? item.totalMonths ?? item.installments);

    const employeeId = String(item.employeeId ?? item.employee?.employeeId ?? item.employee?.id ?? '');
    const employeeName = this.resolveEmployeeName(employeeId, String(item.employeeName ?? item.employee?.name ?? 'Unknown Employee'));
    const endDate = this.resolveLoanEndDate(item, startDate, totalInstallments);

    return this.buildLoanRow({
      id: String(item.loanId ?? item.id ?? `loan-${index + 1}`),
      employeeId,
      employeeName,
      designation: String(item.designation ?? item.positionTitle ?? this.resolveEmployeeDesignation(employeeId, 'Employee')),
      totalAmount,
      monthlyInstallment: this.toNumber(item.monthlyInstallment ?? item.installmentAmount ?? item.monthlyDeduction),
      remainingAmount,
      status: this.normalizeLoanStatus(item.requestStatus ?? item.loanStatus ?? item.status),
      startDate,
      endDate: endDate || null,
      totalInstallments,
      paidInstallments: this.toNumber(item.paidInstallments ?? item.paidMonths ?? item.installmentsPaid),
      description: String(item.description ?? item.notes ?? '')
    });
  }

  private deduplicateLoanItems(items: any[]): any[] {
    if (!items.length) {
      return items;
    }

    const unique = new Map<string, any>();

    items.forEach((item, index) => {
      const key = this.getLoanIdentityKey(item, index);
      const existing = unique.get(key);

      if (!existing) {
        unique.set(key, item);
        return;
      }

      unique.set(key, this.pickRicherLoanItem(existing, item));
    });

    return [...unique.values()];
  }

  private getLoanIdentityKey(item: any, index: number): string {
    const loanId = String(item?.loanId ?? item?.id ?? '').trim();
    if (loanId) {
      return `loan:${loanId}`;
    }

    const employeeId = String(item?.employeeId ?? item?.employee?.employeeId ?? item?.employee?.id ?? '').trim();
    const employeeName = String(item?.employeeName ?? item?.employee?.name ?? '').trim().toLowerCase();
    const totalAmount = this.toNumber(item?.totalAmount ?? item?.loanAmount ?? item?.amount ?? item?.principalAmount);
    const status = String(item?.requestStatus ?? item?.loanStatus ?? item?.status ?? '').trim().toLowerCase();
    const startDate = this.normalizeDateString(item?.startDate ?? item?.createdAt);
    const endDate = this.normalizeDateString(
      item?.endDate
      ?? item?.loanEndDate
      ?? item?.expectedEndDate
      ?? item?.repaymentEndDate
      ?? item?.dueDate
    );

    if ((employeeId || employeeName) && totalAmount > 0) {
      return `sig:${employeeId || employeeName}|amt:${totalAmount}|status:${status}|start:${startDate}|end:${endDate}`;
    }

    return `fallback:${index}`;
  }

  private pickRicherLoanItem(primary: any, secondary: any): any {
    const primaryScore = this.scoreLoanItemCompleteness(primary);
    const secondaryScore = this.scoreLoanItemCompleteness(secondary);
    return secondaryScore > primaryScore ? secondary : primary;
  }

  private scoreLoanItemCompleteness(item: any): number {
    let score = 0;

    if (item?.endDate || item?.loanEndDate || item?.expectedEndDate || item?.repaymentEndDate || item?.dueDate) {
      score += 2;
    }

    if (item?.description || item?.notes) {
      score += 1;
    }

    if (item?.totalInstallments || item?.totalMonths || item?.installments) {
      score += 1;
    }

    if (item?.employeeName || item?.employee?.name) {
      score += 1;
    }

    return score;
  }

  private resolveLoanEndDate(item: any, startDate: string, totalInstallments: number): string {
    const explicitEndDate = this.normalizeDateString(
      item?.endDate
      ?? item?.loanEndDate
      ?? item?.expectedEndDate
      ?? item?.repaymentEndDate
      ?? item?.dueDate
      ?? item?.closingDate
      ?? item?.lastInstallmentDate
    );

    if (explicitEndDate) {
      return explicitEndDate;
    }

    if (startDate && totalInstallments > 0) {
      return this.calculateLoanEndDate(startDate, totalInstallments);
    }

    return '';
  }

  private calculateLoanEndDate(startDate: string, totalInstallments: number): string {
    const [year, month, day] = startDate.split('-').map((part) => Number(part));

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return '';
    }

    const endDate = new Date(year, month - 1, day);
    if (Number.isNaN(endDate.getTime())) {
      return '';
    }

    const monthsToAdd = Math.max(0, Math.floor(totalInstallments) - 1);
    endDate.setMonth(endDate.getMonth() + monthsToAdd);

    const normalizedYear = endDate.getFullYear();
    const normalizedMonth = String(endDate.getMonth() + 1).padStart(2, '0');
    const normalizedDay = String(endDate.getDate()).padStart(2, '0');

    return `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
  }

  private deduplicateDisbursedLoanItems(items: any[]): any[] {
    if (!items.length) {
      return items;
    }

    const unique = new Map<string, any>();

    items.forEach((item, index) => {
      const key = this.getDisbursedLoanIdentityKey(item, index);
      const existing = unique.get(key);

      if (!existing) {
        unique.set(key, item);
        return;
      }

      unique.set(key, this.pickRicherDisbursedLoanItem(existing, item));
    });

    return [...unique.values()];
  }

  private deduplicateRepaymentItems(items: any[]): any[] {
    if (!items.length) {
      return items;
    }

    const unique = new Map<string, any>();

    items.forEach((item, index) => {
      const key = this.getRepaymentIdentityKey(item, index);
      const existing = unique.get(key);

      if (!existing) {
        unique.set(key, item);
        return;
      }

      unique.set(key, this.pickRicherRepaymentItem(existing, item));
    });

    return [...unique.values()];
  }

  private getRepaymentIdentityKey(item: any, index: number): string {
    const repaymentId = String(item?.id ?? item?.repaymentId ?? item?.paymentId ?? '').trim();
    if (repaymentId) {
      return `repayment:${repaymentId}`;
    }

    const referenceId = String(item?.referenceId ?? item?.loanId ?? item?.advanceId ?? item?.salaryAdvanceId ?? '').trim();
    const employeeId = String(item?.employeeId ?? item?.employee?.employeeId ?? item?.employee?.id ?? '').trim();
    const employeeName = String(item?.employeeName ?? item?.employee?.name ?? '').trim().toLowerCase();
    const periodId = String(item?.periodId ?? item?.payrollPeriodId ?? item?.period?.id ?? '').trim();
    const periodName = String(item?.periodName ?? item?.period ?? '').trim().toLowerCase();
    const amount = this.toNumber(item?.installmentAmount ?? item?.paymentAmount ?? item?.amount ?? 0);
    const paymentDate = this.normalizeDateString(item?.paymentDate ?? item?.paidDate ?? item?.createdAt);
    const repaymentType = String(item?.repaymentType ?? item?.loanType ?? '').trim().toLowerCase();

    if (referenceId || (employeeId || employeeName)) {
      return `repayment-sig:${referenceId}|emp:${employeeId || employeeName}|period:${periodId || periodName}|amt:${amount}|date:${paymentDate}|type:${repaymentType}`;
    }

    return `repayment-fallback:${index}`;
  }

  private pickRicherRepaymentItem(primary: any, secondary: any): any {
    const primaryScore = this.scoreRepaymentItemCompleteness(primary);
    const secondaryScore = this.scoreRepaymentItemCompleteness(secondary);
    return secondaryScore > primaryScore ? secondary : primary;
  }

  private scoreRepaymentItemCompleteness(item: any): number {
    let score = 0;

    if (item?.id || item?.repaymentId || item?.paymentId) {
      score += 2;
    }

    if (item?.referenceId || item?.loanId || item?.advanceId || item?.salaryAdvanceId) {
      score += 1;
    }

    if (item?.periodId || item?.payrollPeriodId || item?.period?.id || item?.periodName || item?.period) {
      score += 1;
    }

    if (item?.paymentDate || item?.paidDate || item?.createdAt) {
      score += 1;
    }

    if (item?.paymentStatus || item?.status) {
      score += 1;
    }

    if (item?.paymentMethod) {
      score += 1;
    }

    if (item?.employeeName || item?.employee?.name) {
      score += 1;
    }

    return score;
  }

  private getDisbursedLoanIdentityKey(item: any, index: number): string {
    const loanId = String(item?.loanId ?? item?.id ?? '').trim();
    if (loanId) {
      return `disbursed-loan:${loanId}`;
    }

    const employeeId = String(item?.employeeId ?? item?.employee?.employeeId ?? item?.employee?.id ?? '').trim();
    const employeeName = String(item?.employeeName ?? item?.employee?.name ?? '').trim().toLowerCase();
    const totalAmount = this.toNumber(item?.totalAmount ?? item?.principalAmount ?? item?.amount);
    const disbursementDate = this.normalizeDateString(item?.disbursementDate ?? item?.startDate ?? item?.createdAt);
    const endDate = this.normalizeDateString(
      item?.endDate
      ?? item?.loanEndDate
      ?? item?.expectedEndDate
      ?? item?.repaymentEndDate
      ?? item?.dueDate
    );
    const remainingInstallments = this.toNumber(item?.remainingInstallments ?? item?.remainingInstallment ?? 0);
    const totalInstallments = this.toNumber(item?.totalInstallments ?? item?.installments ?? 0);

    if ((employeeId || employeeName) && totalAmount > 0) {
      return `disbursed-sig:${employeeId || employeeName}|amt:${totalAmount}|disbursed:${disbursementDate}|end:${endDate}|ri:${remainingInstallments}|ti:${totalInstallments}`;
    }

    return `disbursed-fallback:${index}`;
  }

  private pickRicherDisbursedLoanItem(primary: any, secondary: any): any {
    const primaryScore = this.scoreDisbursedLoanCompleteness(primary);
    const secondaryScore = this.scoreDisbursedLoanCompleteness(secondary);
    return secondaryScore > primaryScore ? secondary : primary;
  }

  private scoreDisbursedLoanCompleteness(item: any): number {
    let score = 0;

    if (item?.endDate || item?.loanEndDate || item?.expectedEndDate || item?.repaymentEndDate || item?.dueDate) {
      score += 2;
    }

    if (item?.disbursementDate || item?.startDate || item?.createdAt) {
      score += 1;
    }

    if (item?.paidAmount !== undefined || item?.completedPercentage !== undefined) {
      score += 1;
    }

    if (item?.employeeName || item?.employee?.name) {
      score += 1;
    }

    return score;
  }

  private mapPeriodOption(item: any, index: number): PeriodOption {
    const id = String(
      item?.id
      ?? item?.periodId
      ?? item?.payrollPeriodId
      ?? item?.payrollId
      ?? `period-${index + 1}`
    );

    const name = String(
      item?.name
      ?? item?.periodName
      ?? item?.title
      ?? item?.displayName
      ?? this.getPeriodFallbackName(index)
    );

    return { id, name };
  }

  private mapDisbursedLoan(item: any, index: number): DisbursedLoanRow {
    const totalInstallments = this.toNumber(item.totalInstallments ?? item.installments ?? 0);
    const disbursementDate = this.normalizeDateString(item.disbursementDate ?? item.startDate ?? item.createdAt);
    const endDate = this.resolveLoanEndDate(item, disbursementDate, totalInstallments);

    return {
      id: String(item.loanId ?? item.id ?? `disbursed-loan-${index + 1}`),
      employeeId: String(item.employeeId ?? item.employee?.employeeId ?? item.employee?.id ?? ''),
      employeeName: String(item.employeeName ?? 'Unknown Employee'),
      disbursementDate: disbursementDate || null,
      endDate: endDate || null,
      remainingInstallments: this.toNumber(item.remainingInstallments ?? 0),
      totalInstallments,
      disbursementStatus: String(item.disbursementStatus ?? 'paid'),
      totalAmount: this.toNumber(item.totalAmount ?? item.principalAmount ?? 0),
      paidAmount: this.toNumber(item.paidAmount ?? 0),
      completionPercent: this.toNumber(item.completedPercentage ?? 0)
    };
  }

  private mapRepaymentHistoryRow(item: any, index: number): RepaymentLedgerRow {
    const employeeId = String(item.employeeId ?? '');
    const periodId = String(item.periodId ?? '');
    const normalizedLoanStatus = this.normalizeLoanStatus(item.loanStatus ?? 'active');
    const rawReferenceId = String(item.referenceId ?? '').trim();
    const fallbackReferenceId = String(item.loanId ?? '').trim();
    const resolvedReferenceId = rawReferenceId || fallbackReferenceId;

    return {
      id: String(item.id ?? `repayment-${index + 1}`),
      sourceId: String(item.id ?? `repayment-${index + 1}`),
      type: 'loan',
      employeeId,
      employeeName: this.resolveEmployeeName(employeeId, String(item.employeeName ?? 'Unknown Employee')),
      referenceId: resolvedReferenceId,
      referenceLabel: resolvedReferenceId,
      periodId,
      periodName: String(item.periodName ?? this.getPeriodNameById(periodId)),
      amount: this.toNumber(item.installmentAmount ?? item.amount ?? 0),
      remainingAmount: this.toNumber(item.remainingAmount ?? 0),
      paidDate: this.normalizeDateString(item.paymentDate ?? item.paidDate ?? item.createdAt),
      status: this.normalizeLoanPaymentStatus(item.paymentStatus ?? item.status),
      repaymentType: String(item.repaymentType ?? 'installment').toLowerCase() === 'full' ? 'full' : 'installment',
      paymentMethod: this.normalizePaymentMethod(item.paymentMethod),
      loanStatus: normalizedLoanStatus
    };
  }

  private mapLoanPayment(item: any, index: number): LoanPaymentRow {
    const employeeId = String(item.employeeId ?? item.employee?.employeeId ?? item.employee?.id ?? '');
    const loanId = String(item.loanId ?? item.loan?.loanId ?? item.loan?.id ?? '');
    const fallbackLoanLabel = this.getLoanFallbackLabel(loanId || `loan-${index + 1}`);

    return this.buildLoanPaymentRow({
      id: String(item.id ?? item.paymentId ?? `loan-payment-${index + 1}`),
      loanId,
      employeeId,
      employeeName: this.resolveEmployeeName(employeeId, String(item.employeeName ?? item.employee?.name ?? 'Unknown Employee')),
      loanLabel: String(item.loanLabel ?? item.loanReferenceNo ?? item.loanNumber ?? fallbackLoanLabel),
      periodId: String(item.periodId ?? item.payrollPeriodId ?? item.period?.id ?? ''),
      periodName: String(item.periodName ?? item.period ?? item.payrollPeriodName ?? this.getPeriodNameById(String(item.periodId ?? item.payrollPeriodId ?? ''))),
      installmentNumber: this.toNumber(item.installmentNumber ?? item.sequenceNo ?? 0),
      amount: this.toNumber(item.installmentAmount ?? item.paymentAmount ?? item.amount),
      remainingAmount: this.toNumber(item.remainingAmount ?? item.balanceAmount ?? 0),
      paidDate: this.normalizeDateString(item.paidDate ?? item.paymentDate ?? item.createdAt),
      status: this.normalizeLoanPaymentStatus(item.paymentStatus ?? item.status)
    });
  }

  private mapSalaryAdvance(item: any, index: number): SalaryAdvanceRow {
    const employeeId = String(item.employeeId ?? item.employee?.employeeId ?? item.employee?.id ?? '');
    const periodId = String(item.periodId ?? item.payrollPeriodId ?? item.period?.id ?? '');

    return this.buildSalaryAdvanceRow({
      id: String(item.advanceId ?? item.id ?? `salary-advance-${index + 1}`),
      employeeId,
      employeeName: this.resolveEmployeeName(employeeId, String(item.employeeName ?? item.employee?.name ?? 'Unknown Employee')),
      periodId,
      periodName: String(item.periodName ?? item.period ?? this.getPeriodNameById(periodId)),
      totalAmount: this.toNumber(item.totalAmount ?? item.amount),
      monthlyDeduction: this.toNumber(item.monthlyDeduction ?? item.installmentAmount),
      remainingAmount: this.toNumber(item.remainingAmount ?? item.balanceAmount ?? 0),
      status: this.normalizeSalaryAdvanceStatus(item.advanceStatus ?? item.status),
      reason: String(item.reason ?? item.notes ?? 'N/A')
    });
  }

  private mapAdvancePayment(item: any, index: number): AdvancePaymentRow {
    const employeeId = String(item.employeeId ?? item.employee?.employeeId ?? item.employee?.id ?? '');
    const advanceId = String(item.advanceId ?? item.salaryAdvanceId ?? item.advance?.id ?? '');
    const periodId = String(item.periodId ?? item.payrollPeriodId ?? item.period?.id ?? '');

    return this.buildAdvancePaymentRow({
      id: String(item.id ?? item.paymentId ?? `advance-payment-${index + 1}`),
      advanceId,
      employeeId,
      employeeName: this.resolveEmployeeName(employeeId, String(item.employeeName ?? item.employee?.name ?? 'Unknown Employee')),
      advanceLabel: String(item.advanceLabel ?? item.referenceNo ?? this.getAdvanceFallbackLabel(advanceId || `adv-${index + 1}`)),
      periodId,
      periodName: String(item.periodName ?? item.period ?? this.getPeriodNameById(periodId)),
      amount: this.toNumber(item.paymentAmount ?? item.installmentAmount ?? item.amount),
      remainingAmount: this.toNumber(item.remainingAmount ?? item.balanceAmount ?? 0),
      paidDate: this.normalizeDateString(item.paidDate ?? item.paymentDate ?? item.createdAt),
      status: this.normalizeLoanPaymentStatus(item.paymentStatus ?? item.status)
    });
  }

  private buildLoanRow(source: {
    id: string;
    employeeId: string;
    employeeName: string;
    designation: string;
    totalAmount: number;
    monthlyInstallment: number;
    remainingAmount: number;
    status: LoanStatus;
    startDate: string;
    endDate: string | null;
    totalInstallments: number;
    paidInstallments: number;
    description?: string;
  }): LoanLedgerRow {
    const totalAmount = Math.max(0, this.toNumber(source.totalAmount));
    const remainingAmount = Math.min(totalAmount, Math.max(0, this.toNumber(source.remainingAmount)));
    const paidAmount = Math.max(0, totalAmount - remainingAmount);
    const recoveryPercent = totalAmount > 0
      ? Math.min(100, Math.round((paidAmount / totalAmount) * 100))
      : 0;

    const normalizedStartDate = this.normalizeDateString(source.startDate);

    return {
      id: source.id,
      employeeId: source.employeeId,
      employeeName: source.employeeName,
      designation: source.designation,
      initials: this.toInitials(source.employeeName),
      avatarTone: this.getAvatarTone(source.employeeName),
      totalAmount,
      monthlyInstallment: Math.max(0, this.toNumber(source.monthlyInstallment)),
      remainingAmount,
      paidAmount,
      recoveryPercent,
      status: source.status,
      startDate: normalizedStartDate,
      endDate: source.endDate,
      startDateLabel: this.formatDate(normalizedStartDate),
      totalInstallments: Math.max(0, Math.floor(this.toNumber(source.totalInstallments))),
      paidInstallments: Math.max(0, Math.floor(this.toNumber(source.paidInstallments))),
      description: source.description || ''
    };
  }

  private buildSalaryAdvanceRow(source: {
    id: string;
    employeeId: string;
    employeeName: string;
    periodId: string;
    periodName: string;
    totalAmount: number;
    monthlyDeduction: number;
    remainingAmount: number;
    status: SalaryAdvanceStatus;
    reason: string;
  }): SalaryAdvanceRow {
    const totalAmount = Math.max(0, this.toNumber(source.totalAmount));

    return {
      id: source.id,
      employeeId: source.employeeId,
      employeeName: source.employeeName,
      periodId: source.periodId,
      periodName: source.periodName || this.getPeriodNameById(source.periodId),
      totalAmount,
      monthlyDeduction: Math.max(0, this.toNumber(source.monthlyDeduction)),
      remainingAmount: Math.min(totalAmount, Math.max(0, this.toNumber(source.remainingAmount))),
      status: source.status,
      reason: source.reason || 'N/A'
    };
  }

  private buildLoanPaymentRow(source: {
    id: string;
    loanId: string;
    employeeId: string;
    employeeName: string;
    loanLabel: string;
    periodId: string;
    periodName: string;
    installmentNumber: number;
    amount: number;
    remainingAmount: number;
    paidDate: string | null;
    status: LoanPaymentStatus;
  }): LoanPaymentRow {
    return {
      id: source.id,
      loanId: source.loanId,
      employeeId: source.employeeId,
      employeeName: source.employeeName,
      loanLabel: source.loanLabel,
      periodId: source.periodId,
      periodName: source.periodName || this.getPeriodNameById(source.periodId),
      installmentNumber: Math.max(1, Math.floor(this.toNumber(source.installmentNumber || 1))),
      amount: Math.max(0, this.toNumber(source.amount)),
      remainingAmount: Math.max(0, this.toNumber(source.remainingAmount)),
      paidDate: source.paidDate ? this.normalizeDateString(source.paidDate) : null,
      status: source.status
    };
  }

  private buildAdvancePaymentRow(source: {
    id: string;
    advanceId: string;
    employeeId: string;
    employeeName: string;
    advanceLabel: string;
    periodId: string;
    periodName: string;
    amount: number;
    remainingAmount: number;
    paidDate: string | null;
    status: LoanPaymentStatus;
  }): AdvancePaymentRow {
    return {
      id: source.id,
      advanceId: source.advanceId,
      employeeId: source.employeeId,
      employeeName: source.employeeName,
      advanceLabel: source.advanceLabel,
      periodId: source.periodId,
      periodName: source.periodName || this.getPeriodNameById(source.periodId),
      amount: Math.max(0, this.toNumber(source.amount)),
      remainingAmount: Math.max(0, this.toNumber(source.remainingAmount)),
      paidDate: source.paidDate ? this.normalizeDateString(source.paidDate) : null,
      status: source.status
    };
  }

  private buildLocalEmployees(): LoanEmployeeOption[] {
    const byId = new Map<string, LoanEmployeeOption>();

    const upsert = (id: string, name: string, designation: string): void => {
      const normalizedId = String(id ?? '').trim();
      if (!normalizedId || byId.has(normalizedId)) {
        return;
      }

      byId.set(normalizedId, {
        id: normalizedId,
        name: String(name ?? '').trim() || 'Unknown Employee',
        designation: String(designation ?? '').trim() || 'Employee'
      });
    };

    this.localLoansSeed.forEach((loan) => {
      upsert(loan.employeeId, loan.employeeName, loan.designation);
    });

    this.localSalaryAdvancesSeed.forEach((advance) => {
      upsert(advance.employeeId, advance.employeeName, 'Employee');
    });

    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  private buildLocalPeriods(): PeriodOption[] {
    return [
      { id: 'local-period-2024-07', name: 'Jul 2024' },
      { id: 'local-period-2024-08', name: 'Aug 2024' },
      { id: 'local-period-2024-09', name: 'Sep 2024' },
      { id: 'local-period-2024-10', name: 'Oct 2024' },
      { id: 'local-period-2024-11', name: 'Nov 2024' }
    ];
  }

  private buildLocalLoans(): LoanLedgerRow[] {
    return [
      this.buildLoanRow({
        id: 'local-loan-1',
        employeeId: 'local-emp-1',
        employeeName: 'Ahmed Hassan',
        designation: 'Senior Engineer',
        totalAmount: 150000,
        monthlyInstallment: 12500,
        remainingAmount: 87500,
        status: 'active',
        startDate: '2024-01-12',
        endDate: '2024-12-12',
        totalInstallments: 12,
        paidInstallments: 5
      }),
      this.buildLoanRow({
        id: 'local-loan-2',
        employeeId: 'local-emp-2',
        employeeName: 'Sarah Khan',
        designation: 'HR Associate',
        totalAmount: 80000,
        monthlyInstallment: 8000,
        remainingAmount: 0,
        status: 'completed',
        startDate: '2023-10-05',
        endDate: '2024-07-05',
        totalInstallments: 10,
        paidInstallments: 10
      }),
      this.buildLoanRow({
        id: 'local-loan-3',
        employeeId: 'local-emp-3',
        employeeName: 'Omar Farooq',
        designation: 'Marketing Lead',
        totalAmount: 200000,
        monthlyInstallment: 20000,
        remainingAmount: 140000,
        status: 'active',
        startDate: '2024-03-01',
        endDate: '2025-01-01',
        totalInstallments: 10,
        paidInstallments: 3
      }),
      this.buildLoanRow({
        id: 'local-loan-4',
        employeeId: 'local-emp-4',
        employeeName: 'Zainab Abbas',
        designation: 'Accountant',
        totalAmount: 120000,
        monthlyInstallment: 10000,
        remainingAmount: 100000,
        status: 'active',
        startDate: '2024-02-15',
        endDate: '2025-02-15',
        totalInstallments: 12,
        paidInstallments: 2
      }),
      this.buildLoanRow({
        id: 'local-loan-5',
        employeeId: 'local-emp-5',
        employeeName: 'Bilal Ahmed',
        designation: 'Sales Executive',
        totalAmount: 100000,
        monthlyInstallment: 10000,
        remainingAmount: 84500,
        status: 'active',
        startDate: '2024-03-20',
        endDate: '2025-01-20',
        totalInstallments: 10,
        paidInstallments: 1
      })
    ];
  }

  private buildLocalLoanPayments(): LoanPaymentRow[] {
    return [
      this.buildLoanPaymentRow({
        id: 'local-loan-payment-1',
        loanId: 'local-loan-1',
        employeeId: 'local-emp-1',
        employeeName: 'Ahmed Hassan',
        loanLabel: 'Loan #0001',
        periodId: 'local-period-2024-10',
        periodName: 'Oct 2024',
        installmentNumber: 5,
        amount: 12500,
        remainingAmount: 87500,
        paidDate: '2024-10-31',
        status: 'deducted'
      }),
      this.buildLoanPaymentRow({
        id: 'local-loan-payment-2',
        loanId: 'local-loan-3',
        employeeId: 'local-emp-3',
        employeeName: 'Omar Farooq',
        loanLabel: 'Loan #0003',
        periodId: 'local-period-2024-10',
        periodName: 'Oct 2024',
        installmentNumber: 3,
        amount: 20000,
        remainingAmount: 140000,
        paidDate: '2024-10-31',
        status: 'deducted'
      }),
      this.buildLoanPaymentRow({
        id: 'local-loan-payment-3',
        loanId: 'local-loan-4',
        employeeId: 'local-emp-4',
        employeeName: 'Zainab Abbas',
        loanLabel: 'Loan #0004',
        periodId: 'local-period-2024-11',
        periodName: 'Nov 2024',
        installmentNumber: 3,
        amount: 10000,
        remainingAmount: 90000,
        paidDate: null,
        status: 'pending'
      })
    ];
  }

  private buildLocalSalaryAdvances(): SalaryAdvanceRow[] {
    return [
      this.buildSalaryAdvanceRow({
        id: 'local-advance-1',
        employeeId: 'local-emp-6',
        employeeName: 'Aisha Noor',
        periodId: 'local-period-2024-09',
        periodName: 'Sep 2024',
        totalAmount: 45000,
        monthlyDeduction: 7500,
        remainingAmount: 22500,
        status: 'approved',
        reason: 'Medical emergency'
      }),
      this.buildSalaryAdvanceRow({
        id: 'local-advance-2',
        employeeId: 'local-emp-5',
        employeeName: 'Bilal Ahmed',
        periodId: 'local-period-2024-10',
        periodName: 'Oct 2024',
        totalAmount: 30000,
        monthlyDeduction: 6000,
        remainingAmount: 12000,
        status: 'pending',
        reason: 'Rent adjustment'
      }),
      this.buildSalaryAdvanceRow({
        id: 'local-advance-3',
        employeeId: 'local-emp-4',
        employeeName: 'Zainab Abbas',
        periodId: 'local-period-2024-08',
        periodName: 'Aug 2024',
        totalAmount: 25000,
        monthlyDeduction: 5000,
        remainingAmount: 0,
        status: 'completed',
        reason: 'Travel support'
      })
    ];
  }

  private buildLocalAdvancePayments(): AdvancePaymentRow[] {
    return [
      this.buildAdvancePaymentRow({
        id: 'local-advance-payment-1',
        advanceId: 'local-advance-1',
        employeeId: 'local-emp-6',
        employeeName: 'Aisha Noor',
        advanceLabel: 'Advance #0001',
        periodId: 'local-period-2024-10',
        periodName: 'Oct 2024',
        amount: 7500,
        remainingAmount: 22500,
        paidDate: '2024-10-31',
        status: 'deducted'
      }),
      this.buildAdvancePaymentRow({
        id: 'local-advance-payment-2',
        advanceId: 'local-advance-2',
        employeeId: 'local-emp-5',
        employeeName: 'Bilal Ahmed',
        advanceLabel: 'Advance #0002',
        periodId: 'local-period-2024-11',
        periodName: 'Nov 2024',
        amount: 6000,
        remainingAmount: 12000,
        paidDate: null,
        status: 'pending'
      })
    ];
  }

  private getAvailablePeriods(): PeriodOption[] {
    return this.periods.length ? this.periods : this.localPeriodsSeed;
  }

  private getPeriodNameById(periodId: string): string {
    if (!periodId) {
      return 'N/A';
    }

    const option = this.getAvailablePeriods().find((period) => period.id === periodId);
    return option?.name ?? 'N/A';
  }

  private buildLoanPaymentOptions(includeSettled: boolean): LoanPaymentLoanOption[] {
    const source = this.usingLocalLoanData ? this.localLoansSeed : this.loans;

    const options = source
      .filter((loan) => includeSettled || loan.remainingAmount > 0)
      .map((loan) => ({
        id: loan.id,
        employeeId: loan.employeeId,
        label: `${loan.employeeName} - ${this.currencySymbol()} ${loan.remainingAmount.toLocaleString()} due`,
        remainingAmount: loan.remainingAmount
      }));

    const unique = new Map<string, LoanPaymentLoanOption>();
    options.forEach((option) => {
      if (!unique.has(option.id)) {
        unique.set(option.id, option);
      }
    });

    return [...unique.values()];
  }

  private deduplicatePeriods(periods: PeriodOption[]): PeriodOption[] {
    if (!periods.length) {
      return periods;
    }

    const unique: PeriodOption[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    periods.forEach((period) => {
      const id = String(period.id ?? '').trim();
      const name = String(period.name ?? '').trim();
      const normalizedName = name.toLowerCase();

      if (!id && !name) {
        return;
      }

      if ((id && seenIds.has(id)) || (normalizedName && seenNames.has(normalizedName))) {
        return;
      }

      if (id) {
        seenIds.add(id);
      }

      if (normalizedName) {
        seenNames.add(normalizedName);
      }

      unique.push({ id, name });
    });

    return unique;
  }

  private resolveLoanPaymentStatusForApi(payload: LoanPaymentDialogPayload): string {
    return payload.repaymentType === 'full' ? 'settled' : 'deducted';
  }

  private toIsoDateTime(dateValue: string): string {
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return new Date().toISOString();
    }

    return parsed.toISOString();
  }

  private ensureLoanPaymentOption(options: LoanPaymentLoanOption[], row: LoanPaymentRow): LoanPaymentLoanOption[] {
    if (!row.loanId || options.some((option) => option.id === row.loanId)) {
      return options;
    }

    return [
      {
        id: row.loanId,
        employeeId: row.employeeId,
        label: row.loanLabel,
        remainingAmount: row.remainingAmount
      },
      ...options
    ];
  }

  private buildRepaymentReferences(includeSettled: boolean): RepaymentReferenceOption[] {
    const loanReferences: RepaymentReferenceOption[] = this.buildLoanPaymentOptions(includeSettled).map((loan) => ({
      id: loan.id,
      type: 'loan',
      employeeId: loan.employeeId,
      label: loan.label,
      remainingAmount: loan.remainingAmount
    }));

    const salaryAdvanceSource = this.usingLocalSalaryAdvanceData ? this.localSalaryAdvancesSeed : this.salaryAdvances;
    const advanceReferences: RepaymentReferenceOption[] = salaryAdvanceSource
      .filter((advance) => includeSettled || advance.remainingAmount > 0)
      .map((advance) => ({
        id: advance.id,
        type: 'advance',
        employeeId: advance.employeeId,
        label: `${advance.employeeName} - ${this.currencySymbol()} ${advance.remainingAmount.toLocaleString()} due`,
        remainingAmount: advance.remainingAmount
      }));

    return [...loanReferences, ...advanceReferences];
  }

  private ensureRepaymentReference(
    references: RepaymentReferenceOption[],
    row: RepaymentLedgerRow
  ): RepaymentReferenceOption[] {
    if (references.some((reference) => reference.id === row.referenceId && reference.type === row.type)) {
      return references;
    }

    return [
      {
        id: row.referenceId,
        type: row.type,
        employeeId: row.employeeId,
        label: row.referenceLabel,
        remainingAmount: row.remainingAmount
      },
      ...references
    ];
  }

  private activateLocalLoanFallback(): void {
    if (!this.usingLocalLoanData && this.loans.length) {
      this.localLoansSeed = this.loans.map((loan) => ({ ...loan }));
    }
    this.usingLocalLoanData = true;
  }

  private activateLocalLoanPaymentsFallback(): void {
    if (!this.usingLocalLoanPaymentsData && this.loanPayments.length) {
      this.localLoanPaymentsSeed = this.loanPayments.map((payment) => ({ ...payment }));
    }
    this.usingLocalLoanPaymentsData = true;
  }

  private activateLocalSalaryAdvanceFallback(): void {
    if (!this.usingLocalSalaryAdvanceData && this.salaryAdvances.length) {
      this.localSalaryAdvancesSeed = this.salaryAdvances.map((advance) => ({ ...advance }));
    }
    this.usingLocalSalaryAdvanceData = true;
  }

  private activateLocalAdvancePaymentsFallback(): void {
    if (!this.usingLocalAdvancePaymentsData && this.advancePayments.length) {
      this.localAdvancePaymentsSeed = this.advancePayments.map((payment) => ({ ...payment }));
    }
    this.usingLocalAdvancePaymentsData = true;
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

  private extractTotal(data: any, fallback: number): number {
    return Number(data?.totalCount ?? data?.totalRecords ?? data?.count ?? fallback);
  }

  private resolveEmployeeName(employeeId: string, fallbackName: string): string {
    if (!employeeId) {
      return fallbackName;
    }

    const employee = this.employees.find((item) => item.id === employeeId);
    return employee?.name ?? fallbackName;
  }

  private resolveEmployeeDesignation(employeeId: string, fallbackDesignation: string): string {
    if (!employeeId) {
      return fallbackDesignation;
    }

    const employee = this.employees.find((item) => item.id === employeeId);
    return employee?.designation ?? fallbackDesignation;
  }

  private resolveLoanLabel(loanId: string, fallbackLabel: string): string {
    const source = this.usingLocalLoanData ? this.localLoansSeed : this.loans;
    const loan = source.find((item) => item.id === loanId);

    if (loan) {
      return `${loan.employeeName} - ${this.currencySymbol()} ${loan.remainingAmount.toLocaleString()} due`;
    }

    return fallbackLabel || this.getLoanFallbackLabel(loanId);
  }

  private resolveAdvanceLabel(advanceId: string, fallbackLabel: string): string {
    const source = this.usingLocalSalaryAdvanceData ? this.localSalaryAdvancesSeed : this.salaryAdvances;
    const advance = source.find((item) => item.id === advanceId);

    if (advance) {
      return `${advance.employeeName} - ${this.currencySymbol()} ${advance.remainingAmount.toLocaleString()} due`;
    }

    return fallbackLabel || this.getAdvanceFallbackLabel(advanceId);
  }

  private getLoanFallbackLabel(loanId: string): string {
    const suffix = loanId ? loanId.slice(-6).toUpperCase() : 'N/A';
    return `Loan #${suffix}`;
  }

  private getAdvanceFallbackLabel(advanceId: string): string {
    const suffix = advanceId ? advanceId.slice(-6).toUpperCase() : 'N/A';
    return `Advance #${suffix}`;
  }

  private getPeriodFallbackName(index: number): string {
    const period = this.localPeriodsSeed[index] ?? this.localPeriodsSeed[0];
    return period?.name ?? 'Payroll period';
  }

  private compareDatesDesc(left: string | null, right: string | null): number {
    const leftTime = left ? new Date(left).getTime() : 0;
    const rightTime = right ? new Date(right).getTime() : 0;
    return rightTime - leftTime;
  }

  private getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeLoanStatus(rawStatus: unknown): LoanStatus {
    const normalized = String(rawStatus ?? '').trim().toLowerCase();

    if (normalized === 'approved') {
      return 'approved';
    }

    if (normalized === 'accepted') {
      return 'accepted';
    }

    if (normalized === 'rejected') {
      return 'rejected';
    }

    if (normalized === 'completed' || normalized === 'closed') {
      return 'completed';
    }

    if (normalized === 'cancelled' || normalized === 'canceled') {
      return 'cancelled';
    }

    if (normalized === 'pending') {
      return 'pending';
    }

    return 'active';
  }

  private normalizeLoanPaymentStatus(rawStatus: unknown): LoanPaymentStatus {
    const normalized = String(rawStatus ?? '').trim().toLowerCase();

    if (normalized === 'pending') {
      return 'pending';
    }

    if (normalized === 'skipped' || normalized === 'failed') {
      return 'skipped';
    }

    return 'deducted';
  }

  private normalizePaymentMethod(rawValue: unknown): 'cash' | 'bank transfer' | 'payroll deduction' {
    const value = String(rawValue ?? '').trim().toLowerCase();
    if (value === 'bank transfer' || value === 'bank_transfer') {
      return 'bank transfer';
    }
    if (value === 'payroll deduction' || value === 'payroll_deduction') {
      return 'payroll deduction';
    }
    return 'cash';
  }

  private normalizeSalaryAdvanceStatus(rawStatus: unknown): SalaryAdvanceStatus {
    const normalized = String(rawStatus ?? '').trim().toLowerCase();

    if (normalized === 'approved') {
      return 'approved';
    }

    if (normalized === 'completed') {
      return 'completed';
    }

    if (normalized === 'cancelled' || normalized === 'canceled' || normalized === 'rejected') {
      return 'cancelled';
    }

    return 'pending';
  }

  private toInitials(name: string): string {
    const cleaned = name.trim();
    if (!cleaned) {
      return 'NA';
    }

    return cleaned
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  private getAvatarTone(name: string): string {
    const tones = ['blue', 'peach', 'indigo', 'rose', 'sky', 'brown', 'gray'];
    return tones[name.length % tones.length] ?? 'gray';
  }

  private normalizeDateString(dateValue: unknown): string {
    const trimmed = String(dateValue ?? '').trim();
    if (!trimmed) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDate(dateValue: string): string {
    if (!dateValue) {
      return '-';
    }

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }

    return parsed.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  private toNumber(value: unknown): number {
    const converted = Number(value ?? 0);
    return Number.isFinite(converted) ? converted : 0;
  }

  private isUnsupportedEndpointError(error: any): boolean {
    const status = Number(error?.status ?? 0);
    return status === 0 || status === 404 || status === 405 || status === 501;
  }
}