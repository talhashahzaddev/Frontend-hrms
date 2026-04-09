import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { take, forkJoin } from 'rxjs';
import { PayrollService } from '../../services/payroll.service';

import { AuthService } from '@core/services/auth.service';
import { SettingsService } from '../../../settings/services/settings.service';
import {
  LoanRepaymentType,
  RequestLoanDialogComponent,
  RequestLoanDialogPayload
} from '../dialogs/request-loan-dialog/request-loan-dialog.component';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import {
  RequestSalaryAdvanceDialogComponent,
  RequestSalaryAdvanceDialogPayload
} from '../dialogs/request-salary-advance-dialog/request-salary-advance-dialog.component';

type ModuleTab = 'loans' | 'salary-advance';
type LoanSectionTab = 'requested' | 'active' | 'history';
type SalarySectionTab = 'advances' | 'history';

type LoanStatus = 'active' | 'pending' | 'approved' | 'completed' | 'cancelled';
type SalaryAdvanceStatus = 'pending' | 'approved' | 'completed' | 'cancelled';
type PaymentStatus = 'deducted' | 'pending' | 'skipped';

interface EmployeeLoanRecord {
  id: string;
  employeeId: string;
  referenceNo: string;
  totalAmount: number;
  monthlyInstallment: number;
  totalInstallments: number;
  paidInstallments: number;
  remainingAmount: number;
  paidAmount: number;
  progressPercent: number;
  status: LoanStatus;
  repaymentType: LoanRepaymentType;
  reason: string;
  startDate: string;
  endDate: string | null;
  approvedBy: string;
  requestedOn: string;
  ruleId: string;
}

interface LoanPaymentHistoryRecord {
  id: string;
  loanId: string;
  employeeId: string;
  periodLabel: string;
  installmentAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  paidDate: string | null;
}

interface SalaryAdvanceRecord {
  id: string;
  employeeId: string;
  referenceNo: string;
  totalAmount: number;
  monthlyDeduction: number;
  remainingAmount: number;
  recoveredAmount: number;
  status: SalaryAdvanceStatus;
  reason: string;
  periodApplied: string;
  approvedBy: string;
  requestedOn: string;
  progressPercent: number;
}

interface SalaryAdvancePaymentHistoryRecord {
  id: string;
  advanceId: string;
  employeeId: string;
  periodLabel: string;
  deductionAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  paidDate: string | null;
}

@Component({
  selector: 'app-loan-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './loan-requests.component.html',
  styleUrl: './loan-requests.component.scss'
})
export class LoanRequestsComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly payrollService = inject(PayrollService);

  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  moduleTab: ModuleTab = 'loans';
  loanSectionTab: LoanSectionTab = 'active';
  salarySectionTab: SalarySectionTab = 'advances';

  currentEmployeeId = '';
  currentEmployeeName = 'Employee';

  loans: EmployeeLoanRecord[] = [];
  loanPayments: LoanPaymentHistoryRecord[] = [];

  salaryAdvances: SalaryAdvanceRecord[] = [];
  advancePayments: SalaryAdvancePaymentHistoryRecord[] = [];

  private localLoanSeed: EmployeeLoanRecord[] = [];
  private localLoanPaymentSeed: LoanPaymentHistoryRecord[] = [];
  private localAdvanceSeed: SalaryAdvanceRecord[] = [];
  private localAdvancePaymentSeed: SalaryAdvancePaymentHistoryRecord[] = [];

  usingLocalLoanData = false;
  usingLocalLoanPaymentData = false;
  usingLocalAdvanceData = false;
  usingLocalAdvancePaymentData = false;

  pendingLoanHistorySearch = '';
  pendingLoanHistoryStatus: PaymentStatus | '' = '';
  pendingLoanHistoryPeriod = '';

  loanHistorySearch = '';
  loanHistoryStatus: PaymentStatus | '' = '';
  loanHistoryPeriod = '';

  pendingAdvanceHistorySearch = '';
  pendingAdvanceHistoryStatus: PaymentStatus | '' = '';
  pendingAdvanceHistoryPeriod = '';

  advanceHistorySearch = '';
  advanceHistoryStatus: PaymentStatus | '' = '';
  advanceHistoryPeriod = '';

  loanHistoryCurrentPage = 1;
  advanceHistoryCurrentPage = 1;
  readonly historyPageSize = 6;

  ngOnInit(): void {
    this.resolveCurrentUserContext();
    this.applyModuleFromQueryParam();

    this.localLoanSeed = this.buildLocalLoanSeed();
    this.localLoanPaymentSeed = this.buildLocalLoanPaymentSeed();
    this.localAdvanceSeed = this.buildLocalAdvanceSeed();
    this.localAdvancePaymentSeed = this.buildLocalAdvancePaymentSeed();

    this.loadLoans();
    this.loadLoanPayments();
    this.loadSalaryAdvances();
    this.loadAdvancePayments();

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

  private applyModuleFromQueryParam(): void {
    const moduleParam = String(this.route.snapshot.queryParamMap.get('module') ?? '').trim().toLowerCase();

    if (moduleParam === 'salary-advance' || moduleParam === 'advance-salary' || moduleParam === 'salary') {
      this.moduleTab = 'salary-advance';
      this.salarySectionTab = 'advances';
      return;
    }

    if (moduleParam === 'loans' || moduleParam === 'loan') {
      this.moduleTab = 'loans';
      this.loanSectionTab = 'active';
    }
  }

  get hasFallbackNotice(): boolean {
    return this.usingLocalLoanData
      || this.usingLocalLoanPaymentData
      || this.usingLocalAdvanceData
      || this.usingLocalAdvancePaymentData;
  }

  get activeLoanRecords(): EmployeeLoanRecord[] {
    return this.loans
      .filter((row) => row.status === 'active')
      .sort((a, b) => this.compareDateDesc(a.requestedOn, b.requestedOn));
  }

  get requestedLoanRecords(): EmployeeLoanRecord[] {
    return this.loans
      .filter((row) => row.status !== 'active')
      .sort((a, b) => this.compareDateDesc(a.requestedOn, b.requestedOn));
  }

  get loanSectionRecords(): EmployeeLoanRecord[] {
    return this.loanSectionTab === 'requested' ? this.requestedLoanRecords : this.activeLoanRecords;
  }

  get loanHistoryRows(): LoanPaymentHistoryRecord[] {
    return [...this.loanPayments].sort((a, b) => this.compareDateDesc(a.paidDate, b.paidDate));
  }

  get visibleSalaryAdvances(): SalaryAdvanceRecord[] {
    return this.salaryAdvances
      .filter((row) => row.status === 'approved' || row.status === 'pending' || row.status === 'cancelled')
      .sort((a, b) => this.compareDateDesc(a.requestedOn, b.requestedOn));
  }

  get salaryPaymentHistoryRows(): SalaryAdvancePaymentHistoryRecord[] {
    return [...this.advancePayments].sort((a, b) => this.compareDateDesc(a.paidDate, b.paidDate));
  }

  get hasActiveLoanHistoryFilters(): boolean {
    return !!(this.pendingLoanHistorySearch || this.pendingLoanHistoryStatus || this.pendingLoanHistoryPeriod);
  }

  get hasAppliedLoanHistoryFilters(): boolean {
    return !!(this.loanHistorySearch || this.loanHistoryStatus || this.loanHistoryPeriod);
  }

  get loanHistoryPeriods(): string[] {
    return this.uniquePeriods(this.loanHistoryRows.map((row) => row.periodLabel));
  }

  get filteredLoanHistoryRows(): LoanPaymentHistoryRecord[] {
    const search = this.loanHistorySearch.trim().toLowerCase();

    return this.loanHistoryRows.filter((row) => {
      const matchesSearch = !search || row.periodLabel.toLowerCase().includes(search);
      const matchesStatus = !this.loanHistoryStatus || row.status === this.loanHistoryStatus;
      const matchesPeriod = !this.loanHistoryPeriod || row.periodLabel === this.loanHistoryPeriod;
      return matchesSearch && matchesStatus && matchesPeriod;
    });
  }

  get loanHistoryTotalRecords(): number {
    return this.filteredLoanHistoryRows.length;
  }

  get loanHistoryTotalPages(): number {
    return Math.max(1, Math.ceil(this.loanHistoryTotalRecords / this.historyPageSize));
  }

  get loanHistoryPage(): number {
    return Math.min(this.loanHistoryCurrentPage, this.loanHistoryTotalPages);
  }

  get loanHistoryPageRange(): number[] {
    return this.buildPageRange(this.loanHistoryPage, this.loanHistoryTotalPages);
  }

  get loanHistoryFromRecord(): number {
    return this.loanHistoryTotalRecords === 0
      ? 0
      : (this.loanHistoryPage - 1) * this.historyPageSize + 1;
  }

  get loanHistoryToRecord(): number {
    return Math.min(this.loanHistoryPage * this.historyPageSize, this.loanHistoryTotalRecords);
  }

  get loanHistoryView(): LoanPaymentHistoryRecord[] {
    return this.paginateData(this.filteredLoanHistoryRows, this.loanHistoryPage, this.historyPageSize);
  }

  get hasActiveAdvanceHistoryFilters(): boolean {
    return !!(this.pendingAdvanceHistorySearch || this.pendingAdvanceHistoryStatus || this.pendingAdvanceHistoryPeriod);
  }

  get hasAppliedAdvanceHistoryFilters(): boolean {
    return !!(this.advanceHistorySearch || this.advanceHistoryStatus || this.advanceHistoryPeriod);
  }

  get advanceHistoryPeriods(): string[] {
    return this.uniquePeriods(this.salaryPaymentHistoryRows.map((row) => row.periodLabel));
  }

  get filteredAdvanceHistoryRows(): SalaryAdvancePaymentHistoryRecord[] {
    const search = this.advanceHistorySearch.trim().toLowerCase();

    return this.salaryPaymentHistoryRows.filter((row) => {
      const matchesSearch = !search || row.periodLabel.toLowerCase().includes(search);
      const matchesStatus = !this.advanceHistoryStatus || row.status === this.advanceHistoryStatus;
      const matchesPeriod = !this.advanceHistoryPeriod || row.periodLabel === this.advanceHistoryPeriod;
      return matchesSearch && matchesStatus && matchesPeriod;
    });
  }

  get advanceHistoryTotalRecords(): number {
    return this.filteredAdvanceHistoryRows.length;
  }

  get advanceHistoryTotalPages(): number {
    return Math.max(1, Math.ceil(this.advanceHistoryTotalRecords / this.historyPageSize));
  }

  get advanceHistoryPage(): number {
    return Math.min(this.advanceHistoryCurrentPage, this.advanceHistoryTotalPages);
  }

  get advanceHistoryPageRange(): number[] {
    return this.buildPageRange(this.advanceHistoryPage, this.advanceHistoryTotalPages);
  }

  get advanceHistoryFromRecord(): number {
    return this.advanceHistoryTotalRecords === 0
      ? 0
      : (this.advanceHistoryPage - 1) * this.historyPageSize + 1;
  }

  get advanceHistoryToRecord(): number {
    return Math.min(this.advanceHistoryPage * this.historyPageSize, this.advanceHistoryTotalRecords);
  }

  get advanceHistoryView(): SalaryAdvancePaymentHistoryRecord[] {
    return this.paginateData(this.filteredAdvanceHistoryRows, this.advanceHistoryPage, this.historyPageSize);
  }

  get totalBorrowed(): number {
    return this.loans
      .filter((row) => row.status !== 'pending' && row.status !== 'cancelled')
      .reduce((sum, row) => sum + row.totalAmount, 0);
  }

  get amountPaid(): number {
    return this.loans
      .filter((row) => row.status !== 'pending' && row.status !== 'cancelled')
      .reduce((sum, row) => sum + row.paidAmount, 0);
  }

  get remainingLoanAmount(): number {
    return this.loans
      .filter((row) => row.status === 'active' || row.status === 'approved')
      .reduce((sum, row) => sum + row.remainingAmount, 0);
  }

  get monthlyInstallmentTotal(): number {
    return this.loans
      .filter((row) => row.status === 'active' || row.status === 'approved')
      .reduce((sum, row) => sum + row.monthlyInstallment, 0);
  }

  get totalAdvanced(): number {
    return this.salaryAdvances
      .filter((row) => row.status !== 'pending' && row.status !== 'cancelled')
      .reduce((sum, row) => sum + row.totalAmount, 0);
  }

  get recoveredAdvanceAmount(): number {
    return this.salaryAdvances
      .filter((row) => row.status !== 'pending' && row.status !== 'cancelled')
      .reduce((sum, row) => sum + row.recoveredAmount, 0);
  }

  get outstandingAdvanceAmount(): number {
    return this.salaryAdvances
      .filter((row) => row.status === 'approved')
      .reduce((sum, row) => sum + row.remainingAmount, 0);
  }

  get salaryMonthlyDeduction(): number {
    return this.salaryAdvances
      .filter((row) => row.status === 'approved')
      .reduce((sum, row) => sum + row.monthlyDeduction, 0);
  }

  get availableAdvanceLimit(): number {
    return Math.max(0, 125000 - this.outstandingAdvanceAmount);
  }

  setModuleTab(tab: ModuleTab): void {
    this.moduleTab = tab;
  }

  goBackToBenefits(): void {
    this.router.navigate(['/payroll/my-benefits']);
  }

  setLoanSectionTab(tab: LoanSectionTab): void {
    this.loanSectionTab = tab;
  }

  setSalarySectionTab(tab: SalarySectionTab): void {
    this.salarySectionTab = tab;
  }

  applyLoanHistoryFilters(): void {
    this.loanHistorySearch = this.pendingLoanHistorySearch.trim();
    this.loanHistoryStatus = this.pendingLoanHistoryStatus;
    this.loanHistoryPeriod = this.pendingLoanHistoryPeriod;
    this.loanHistoryCurrentPage = 1;
  }

  clearLoanHistoryFilters(): void {
    this.pendingLoanHistorySearch = '';
    this.pendingLoanHistoryStatus = '';
    this.pendingLoanHistoryPeriod = '';
    this.loanHistorySearch = '';
    this.loanHistoryStatus = '';
    this.loanHistoryPeriod = '';
    this.loanHistoryCurrentPage = 1;
  }

  goToLoanHistoryPage(page: number): void {
    if (page < 1 || page > this.loanHistoryTotalPages || page === this.loanHistoryPage) {
      return;
    }

    this.loanHistoryCurrentPage = page;
  }

  prevLoanHistoryPage(): void {
    this.goToLoanHistoryPage(this.loanHistoryPage - 1);
  }

  nextLoanHistoryPage(): void {
    this.goToLoanHistoryPage(this.loanHistoryPage + 1);
  }

  applyAdvanceHistoryFilters(): void {
    this.advanceHistorySearch = this.pendingAdvanceHistorySearch.trim();
    this.advanceHistoryStatus = this.pendingAdvanceHistoryStatus;
    this.advanceHistoryPeriod = this.pendingAdvanceHistoryPeriod;
    this.advanceHistoryCurrentPage = 1;
  }

  clearAdvanceHistoryFilters(): void {
    this.pendingAdvanceHistorySearch = '';
    this.pendingAdvanceHistoryStatus = '';
    this.pendingAdvanceHistoryPeriod = '';
    this.advanceHistorySearch = '';
    this.advanceHistoryStatus = '';
    this.advanceHistoryPeriod = '';
    this.advanceHistoryCurrentPage = 1;
  }

  goToAdvanceHistoryPage(page: number): void {
    if (page < 1 || page > this.advanceHistoryTotalPages || page === this.advanceHistoryPage) {
      return;
    }

    this.advanceHistoryCurrentPage = page;
  }

  prevAdvanceHistoryPage(): void {
    this.goToAdvanceHistoryPage(this.advanceHistoryPage - 1);
  }

  nextAdvanceHistoryPage(): void {
    this.goToAdvanceHistoryPage(this.advanceHistoryPage + 1);
  }

  openLoanRequestDialog(): void {
    const dialogRef = this.dialog.open(RequestLoanDialogComponent, {
      width: '560px',
      panelClass: 'request-loan-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        currencySymbol: this.currencySymbol()
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        // Since the dialog itself calls the API, we just refresh the list
        this.loadLoans();
      }
    });
  }

  openEditLoanRequestDialog(row: EmployeeLoanRecord): void {
    if (row.status !== 'pending' && row.status !== 'approved') {
      return;
    }

    const dialogRef = this.dialog.open(RequestLoanDialogComponent, {
      width: '560px',
      panelClass: 'request-loan-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        currencySymbol: this.currencySymbol(),
        loanId: row.id,
        initialValue: {
          totalAmount: row.totalAmount,
          repaymentType: row.repaymentType,
          monthlyInstallment: row.monthlyInstallment,
          totalInstallments: row.totalInstallments,
          reason: row.reason,
          loanRuleId: row.ruleId,
          returnDate: row.endDate // endDate is used for returnDate in full repayment
        } as any 
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        // Refresh the list if edit was successful
        this.loadLoans();
      }
    });
  }

  openSalaryAdvanceDialog(): void {
    const dialogRef = this.dialog.open(RequestSalaryAdvanceDialogComponent, {
      width: '500px',
      panelClass: 'request-salary-advance-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        currencySymbol: this.currencySymbol()
      }
    });

    dialogRef.afterClosed().subscribe((result: RequestSalaryAdvanceDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.submitSalaryAdvanceRequest(result);
    });
  }

  cancelLoanRequest(row: EmployeeLoanRecord): void {
    if (row.status !== 'pending' && row.status !== 'approved') {
      return;
    }

    const dialogData: ConfirmDeleteData = {
      title: 'Cancel Loan Request',
      message: 'Are you sure you want to cancel this loan request?',
      itemName: row.referenceNo,
      confirmButtonText: 'Yes, Cancel'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.payrollService.deleteLoanRequest(row.id).subscribe({
          next: () => {
            this.loadLoans();
          },
          error: (err: any) => {
            console.error('Error cancelling loan request:', err);
          }
        });
      }
    });
  }

  cancelAdvanceRequest(row: SalaryAdvanceRecord): void {
    if (row.status !== 'pending') {
      return;
    }

    this.activateLocalAdvanceFallback();
    this.localAdvanceSeed = this.localAdvanceSeed.map((item) => {
      if (item.id !== row.id) {
        return item;
      }

      return { ...item, status: 'cancelled' };
    });

    this.salaryAdvances = this.filterForCurrentEmployee([...this.localAdvanceSeed]);
  }

  goToLoanHistory(): void {
    this.moduleTab = 'loans';
    this.loanSectionTab = 'history';
  }

  goToAdvanceHistory(): void {
    this.moduleTab = 'salary-advance';
    this.salarySectionTab = 'history';
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

  getLoanStatusClass(status: LoanStatus): string {
    return `status-${status}`;
  }

  getAdvanceStatusClass(status: SalaryAdvanceStatus): string {
    return `status-${status}`;
  }

  getPaymentStatusClass(status: PaymentStatus): string {
    return `status-${status}`;
  }

  getLoanHistoryCountLabel(): string {
    if (this.loanHistoryTotalRecords === 0) {
      return 'No records found';
    }

    return `Showing ${this.loanHistoryFromRecord} to ${this.loanHistoryToRecord} of ${this.loanHistoryTotalRecords} payment records`;
  }

  getAdvanceHistoryCountLabel(): string {
    if (this.advanceHistoryTotalRecords === 0) {
      return 'No records found';
    }

    return `Showing ${this.advanceHistoryFromRecord} to ${this.advanceHistoryToRecord} of ${this.advanceHistoryTotalRecords} payment records`;
  }

  private buildPageRange(currentPage: number, totalPages: number): number[] {
    const delta = 2;
    const start = Math.max(1, currentPage - delta);
    const end = Math.min(totalPages, currentPage + delta);
    const pages: number[] = [];

    for (let page = start; page <= end; page++) {
      pages.push(page);
    }

    return pages;
  }

  private paginateData<T>(rows: T[], currentPage: number, pageSize: number): T[] {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }

  private uniquePeriods(periods: string[]): string[] {
    return [...new Set(periods.filter((period) => !!String(period ?? '').trim()))];
  }

  private resolveCurrentUserContext(): void {
    const currentUser = this.authService.getCurrentUserValue();

    if (!currentUser) {
      this.currentEmployeeId = '';
      this.currentEmployeeName = 'Employee';
      return;
    }

    this.currentEmployeeId = String(currentUser.userId ?? '').trim();
    const fullName = `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim();

    this.currentEmployeeName = fullName || currentUser.email || 'Employee';
  }

  private loadLoans(): void {
    // We combine pending requests and active loans into a single list
    forkJoin({
      pending: this.payrollService.getMyPendingLoans().pipe(take(1)),
      active: this.payrollService.getMyActiveLoans().pipe(take(1))
    }).subscribe({
      next: (res: any) => {
        const pendingLoans = (res.pending || []).map((item: any, i: number) => this.mapLoan(item, i));
        const activeLoans = (res.active || []).map((item: any, i: number) => this.mapLoan(item, pendingLoans.length + i));
        
        // Combine and dedup by ID if necessary (though they should be distinct)
        const combined = [...pendingLoans, ...activeLoans];
        const unique = Array.from(new Map(combined.map(l => [l.id, l])).values());
        
        this.loans = unique;
        this.usingLocalLoanData = false;
      },
      error: (err) => {
        console.error('Error loading loans:', err);
        // Fallback to local data only if API fails
        this.activateLocalLoanFallback();
        this.loans = this.filterForCurrentEmployee([...this.localLoanSeed]);
      }
    });
  }

  private loadLoanPayments(): void {
    this.activateLocalLoanPaymentFallback();
    this.loanPayments = this.filterForCurrentEmployee([...this.localLoanPaymentSeed]);
  }

  private loadSalaryAdvances(): void {
    this.activateLocalAdvanceFallback();
    this.salaryAdvances = this.filterForCurrentEmployee([...this.localAdvanceSeed]);
  }

  private loadAdvancePayments(): void {
    this.activateLocalAdvancePaymentFallback();
    this.advancePayments = this.filterForCurrentEmployee([...this.localAdvancePaymentSeed]);
  }

  private submitLoanRequest(payload: RequestLoanDialogPayload): void {
    this.activateLocalLoanFallback();
    this.createLocalLoanRequest(payload);
  }

  private submitSalaryAdvanceRequest(payload: RequestSalaryAdvanceDialogPayload): void {
    this.activateLocalAdvanceFallback();
    this.createLocalAdvanceRequest(payload);
  }

  private createLocalLoanRequest(payload: RequestLoanDialogPayload): void {
    const totalInstallments = payload.repaymentType === 'full'
      ? 1
      : Math.max(1, Math.floor(payload.totalInstallments || 1));

    const monthlyInstallment = payload.repaymentType === 'full'
      ? payload.totalAmount
      : payload.monthlyInstallment;

    const nextItem: EmployeeLoanRecord = {
      id: `local-loan-req-${Date.now()}`,
      employeeId: this.getEffectiveEmployeeId() || 'self-local',
      referenceNo: this.generateReference('LOAN'),
      totalAmount: Number(payload.totalAmount),
      monthlyInstallment: Number(monthlyInstallment),
      totalInstallments,
      paidInstallments: 0,
      remainingAmount: Number(payload.totalAmount),
      paidAmount: 0,
      progressPercent: 0,
      status: 'pending',
      repaymentType: payload.repaymentType,
      reason: payload.reason,
      startDate: this.getTodayIsoDate(), // Default to today since field was removed
      endDate: null,
      approvedBy: 'Pending HR approval',
      requestedOn: this.getTodayIsoDate(),
      ruleId: payload.loanRuleId || ''
    };

    this.localLoanSeed = [nextItem, ...this.localLoanSeed];
    this.loans = this.filterForCurrentEmployee([...this.localLoanSeed]);
  }

  private updateLocalLoanRequest(row: EmployeeLoanRecord, payload: RequestLoanDialogPayload): void {
    const totalInstallments = payload.repaymentType === 'full'
      ? 1
      : Math.max(1, Math.floor(payload.totalInstallments || 1));

    const monthlyInstallment = payload.repaymentType === 'full'
      ? payload.totalAmount
      : payload.monthlyInstallment;

    const totalAmount = Number(payload.totalAmount);

    this.activateLocalLoanFallback();
    this.localLoanSeed = this.localLoanSeed.map((item) => {
      if (item.id !== row.id) {
        return item;
      }

      return {
        ...item,
        totalAmount,
        monthlyInstallment: Number(monthlyInstallment),
        totalInstallments,
        paidInstallments: 0,
        remainingAmount: totalAmount,
        paidAmount: 0,
        progressPercent: 0,
        repaymentType: payload.repaymentType,
        reason: payload.reason,
        status: 'pending',
        ruleId: payload.loanRuleId || ''
      };
    });

    this.loans = this.filterForCurrentEmployee([...this.localLoanSeed]);
  }

  private createLocalAdvanceRequest(payload: RequestSalaryAdvanceDialogPayload): void {
    const totalAmount = Number(payload.totalAmount);

    const nextItem: SalaryAdvanceRecord = {
      id: `local-advance-req-${Date.now()}`,
      employeeId: this.getEffectiveEmployeeId() || 'self-local',
      referenceNo: this.generateReference('ADV'),
      totalAmount,
      monthlyDeduction: Number(payload.monthlyDeduction),
      remainingAmount: totalAmount,
      recoveredAmount: 0,
      status: 'pending',
      reason: payload.reason,
      periodApplied: this.getCurrentMonthYear(),
      approvedBy: 'Pending HR approval',
      requestedOn: this.getTodayIsoDate(),
      progressPercent: 0
    };

    this.localAdvanceSeed = [nextItem, ...this.localAdvanceSeed];
    this.salaryAdvances = this.filterForCurrentEmployee([...this.localAdvanceSeed]);
  }

  private mapLoan(item: any, index: number): EmployeeLoanRecord {
    const id = String(item.loanId ?? item.id ?? `loan-${index + 1}`);
    const employeeId = String(item.employeeId ?? item.employee?.employeeId ?? item.employee?.id ?? this.currentEmployeeId ?? '');
    const totalAmount = this.toNumber(item.totalAmount ?? item.loanAmount ?? item.amount);
    const remainingAmount = this.toNumber(item.remainingAmount ?? item.balanceAmount ?? totalAmount);
    const paidAmount = Math.max(0, totalAmount - remainingAmount);
    const monthlyInstallment = this.toNumber(item.monthlyInstallment ?? item.installmentAmount ?? item.monthlyDeduction);

    const totalInstallmentsFromPayload = this.toInteger(item.totalInstallments ?? item.installments);
    const paidInstallmentsFromPayload = this.toInteger(item.paidInstallments ?? item.installmentsPaid);

    const totalInstallments = totalInstallmentsFromPayload > 0
      ? totalInstallmentsFromPayload
      : (monthlyInstallment > 0 ? Math.ceil(totalAmount / monthlyInstallment) : 1);

    const paidInstallments = paidInstallmentsFromPayload > 0
      ? paidInstallmentsFromPayload
      : (monthlyInstallment > 0 ? Math.floor(paidAmount / monthlyInstallment) : 0);

    return {
      id,
      employeeId,
      referenceNo: String(item.referenceNo ?? item.loanNumber ?? this.generateReference('LOAN', index + 1)),
      totalAmount,
      monthlyInstallment,
      totalInstallments,
      paidInstallments,
      remainingAmount,
      paidAmount,
      progressPercent: this.toProgress(paidAmount, totalAmount),
      status: this.normalizeLoanStatus(item.loanStatus ?? item.status ?? item.requestStatus),
      repaymentType: this.normalizeRepaymentType(item.repaymentType ?? item.loanType),
      reason: String(item.reason ?? item.description ?? item.notes ?? 'Loan support'),
      startDate: this.normalizeDate(item.startDate ?? item.createdAt),
      endDate: this.normalizeDateNullable(item.endDate),
      approvedBy: String(item.approvedBy ?? 'HR Manager'),
      requestedOn: this.normalizeDate(item.requestedOn ?? item.createdAt ?? item.startDate),
      ruleId: String(item.ruleId ?? item.loanRuleId ?? '')
    };
  }

  private mapLoanPayment(item: any, index: number): LoanPaymentHistoryRecord {
    return {
      id: String(item.id ?? item.paymentId ?? `loan-payment-${index + 1}`),
      loanId: String(item.loanId ?? item.loan?.id ?? item.loan?.loanId ?? ''),
      employeeId: String(item.employeeId ?? item.employee?.employeeId ?? item.employee?.id ?? this.currentEmployeeId ?? ''),
      periodLabel: String(item.periodName ?? item.period ?? item.payrollPeriodName ?? this.getCurrentMonthYear()),
      installmentAmount: this.toNumber(item.installmentAmount ?? item.paymentAmount ?? item.amount),
      remainingAmount: this.toNumber(item.remainingAmount ?? item.balanceAmount),
      status: this.normalizePaymentStatus(item.paymentStatus ?? item.status),
      paidDate: this.normalizeDateNullable(item.paidDate ?? item.paymentDate ?? item.createdAt)
    };
  }

  private mapAdvance(item: any, index: number): SalaryAdvanceRecord {
    const totalAmount = this.toNumber(item.totalAmount ?? item.advanceAmount ?? item.amount);
    const remainingAmount = this.toNumber(item.remainingAmount ?? item.balanceAmount ?? totalAmount);
    const recoveredAmount = Math.max(0, totalAmount - remainingAmount);

    return {
      id: String(item.advanceId ?? item.id ?? `advance-${index + 1}`),
      employeeId: String(item.employeeId ?? item.employee?.employeeId ?? item.employee?.id ?? this.currentEmployeeId ?? ''),
      referenceNo: String(item.referenceNo ?? item.advanceNumber ?? this.generateReference('ADV', index + 1)),
      totalAmount,
      monthlyDeduction: this.toNumber(item.monthlyDeduction ?? item.installmentAmount),
      remainingAmount,
      recoveredAmount,
      status: this.normalizeAdvanceStatus(item.advanceStatus ?? item.status ?? item.requestStatus),
      reason: String(item.reason ?? item.description ?? item.notes ?? 'Salary advance request'),
      periodApplied: String(item.periodName ?? item.period ?? item.payrollPeriodName ?? this.getCurrentMonthYear()),
      approvedBy: String(item.approvedBy ?? 'HR Manager'),
      requestedOn: this.normalizeDate(item.requestedOn ?? item.createdAt),
      progressPercent: this.toProgress(recoveredAmount, totalAmount)
    };
  }

  private mapAdvancePayment(item: any, index: number): SalaryAdvancePaymentHistoryRecord {
    return {
      id: String(item.id ?? item.paymentId ?? `advance-payment-${index + 1}`),
      advanceId: String(item.advanceId ?? item.salaryAdvanceId ?? item.advance?.id ?? ''),
      employeeId: String(item.employeeId ?? item.employee?.employeeId ?? item.employee?.id ?? this.currentEmployeeId ?? ''),
      periodLabel: String(item.periodName ?? item.period ?? item.payrollPeriodName ?? this.getCurrentMonthYear()),
      deductionAmount: this.toNumber(item.paymentAmount ?? item.installmentAmount ?? item.amount),
      remainingAmount: this.toNumber(item.remainingAmount ?? item.balanceAmount),
      status: this.normalizePaymentStatus(item.paymentStatus ?? item.status),
      paidDate: this.normalizeDateNullable(item.paidDate ?? item.paymentDate ?? item.createdAt)
    };
  }

  private buildLocalLoanSeed(): EmployeeLoanRecord[] {
    return [
      {
        id: 'local-loan-2025-0842',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        referenceNo: 'LOAN-2025-0842',
        totalAmount: 200000,
        monthlyInstallment: 10000,
        totalInstallments: 20,
        paidInstallments: 6,
        remainingAmount: 140000,
        paidAmount: 60000,
        progressPercent: 30,
        status: 'active',
        repaymentType: 'installment',
        reason: 'Medical expenses',
        startDate: '2025-01-01',
        endDate: '2026-12-31',
        approvedBy: 'HR Manager',
        requestedOn: '2025-01-01',
        ruleId: 'local-rule-1'
      },
      {
        id: 'local-loan-2025-1029',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        referenceNo: 'LOAN-2025-1029',
        totalAmount: 120000,
        monthlyInstallment: 10000,
        totalInstallments: 12,
        paidInstallments: 0,
        remainingAmount: 120000,
        paidAmount: 0,
        progressPercent: 0,
        status: 'pending',
        repaymentType: 'installment',
        reason: 'Home renovation',
        startDate: '2025-10-12',
        endDate: '2026-09-12',
        approvedBy: 'Pending HR approval',
        requestedOn: '2025-10-12',
        ruleId: 'local-rule-2'
      }
    ];
  }

  private buildLocalLoanPaymentSeed(): LoanPaymentHistoryRecord[] {
    return [
      {
        id: 'local-loan-payment-1',
        loanId: 'local-loan-2025-0842',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        periodLabel: 'Jan 2025',
        installmentAmount: 10000,
        remainingAmount: 190000,
        status: 'deducted',
        paidDate: '2025-01-30'
      },
      {
        id: 'local-loan-payment-2',
        loanId: 'local-loan-2025-0842',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        periodLabel: 'Feb 2025',
        installmentAmount: 10000,
        remainingAmount: 180000,
        status: 'deducted',
        paidDate: '2025-02-28'
      },
      {
        id: 'local-loan-payment-3',
        loanId: 'local-loan-2025-0842',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        periodLabel: 'Mar 2025',
        installmentAmount: 10000,
        remainingAmount: 170000,
        status: 'deducted',
        paidDate: '2025-03-31'
      },
      {
        id: 'local-loan-payment-4',
        loanId: 'local-loan-2025-0842',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        periodLabel: 'Apr 2025',
        installmentAmount: 10000,
        remainingAmount: 160000,
        status: 'deducted',
        paidDate: '2025-04-30'
      },
      {
        id: 'local-loan-payment-5',
        loanId: 'local-loan-2025-0842',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        periodLabel: 'May 2025',
        installmentAmount: 10000,
        remainingAmount: 150000,
        status: 'deducted',
        paidDate: '2025-05-30'
      },
      {
        id: 'local-loan-payment-6',
        loanId: 'local-loan-2025-0842',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        periodLabel: 'Jun 2025',
        installmentAmount: 10000,
        remainingAmount: 140000,
        status: 'deducted',
        paidDate: '2025-06-30'
      }
    ];
  }

  private buildLocalAdvanceSeed(): SalaryAdvanceRecord[] {
    return [
      {
        id: 'local-advance-2025-0842',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        referenceNo: 'ADV-2025-0842',
        totalAmount: 50000,
        monthlyDeduction: 15000,
        remainingAmount: 35000,
        recoveredAmount: 15000,
        status: 'approved',
        reason: 'Medical emergency',
        periodApplied: 'March 2025',
        approvedBy: 'HR Manager',
        requestedOn: '2025-03-10',
        progressPercent: 30
      },
      {
        id: 'local-advance-2025-0679',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        referenceNo: 'ADV-2025-0679',
        totalAmount: 30000,
        monthlyDeduction: 0,
        remainingAmount: 0,
        recoveredAmount: 30000,
        status: 'completed',
        reason: 'Family support',
        periodApplied: 'January 2025',
        approvedBy: 'HR Manager',
        requestedOn: '2025-01-03',
        progressPercent: 100
      },
      {
        id: 'local-advance-2025-1029',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        referenceNo: 'ADV-2025-1029',
        totalAmount: 30000,
        monthlyDeduction: 10000,
        remainingAmount: 30000,
        recoveredAmount: 0,
        status: 'pending',
        reason: 'Home renovation',
        periodApplied: 'October 2025',
        approvedBy: 'Pending HR approval',
        requestedOn: '2025-10-12',
        progressPercent: 0
      }
    ];
  }

  private buildLocalAdvancePaymentSeed(): SalaryAdvancePaymentHistoryRecord[] {
    return [
      {
        id: 'local-advance-payment-1',
        advanceId: 'local-advance-2025-0842',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        periodLabel: 'Jan 2025',
        deductionAmount: 15000,
        remainingAmount: 65000,
        status: 'deducted',
        paidDate: '2025-01-30'
      },
      {
        id: 'local-advance-payment-2',
        advanceId: 'local-advance-2025-0842',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        periodLabel: 'Feb 2025',
        deductionAmount: 15000,
        remainingAmount: 50000,
        status: 'deducted',
        paidDate: '2025-02-28'
      },
      {
        id: 'local-advance-payment-3',
        advanceId: 'local-advance-2025-0842',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        periodLabel: 'Mar 2025',
        deductionAmount: 15000,
        remainingAmount: 35000,
        status: 'deducted',
        paidDate: '2025-03-31'
      }
    ];
  }

  private activateLocalLoanFallback(): void {
    if (!this.usingLocalLoanData && this.loans.length) {
      this.localLoanSeed = [...this.loans];
    }

    this.usingLocalLoanData = true;
  }

  private activateLocalLoanPaymentFallback(): void {
    if (!this.usingLocalLoanPaymentData && this.loanPayments.length) {
      this.localLoanPaymentSeed = [...this.loanPayments];
    }

    this.usingLocalLoanPaymentData = true;
  }

  private activateLocalAdvanceFallback(): void {
    if (!this.usingLocalAdvanceData && this.salaryAdvances.length) {
      this.localAdvanceSeed = [...this.salaryAdvances];
    }

    this.usingLocalAdvanceData = true;
  }

  private activateLocalAdvancePaymentFallback(): void {
    if (!this.usingLocalAdvancePaymentData && this.advancePayments.length) {
      this.localAdvancePaymentSeed = [...this.advancePayments];
    }

    this.usingLocalAdvancePaymentData = true;
  }

  private filterForCurrentEmployee<T extends { employeeId: string }>(rows: T[]): T[] {
    if (!this.currentEmployeeId) {
      return rows;
    }

    const exactMatches = rows.filter((row) => String(row.employeeId ?? '').trim() === this.currentEmployeeId);
    if (exactMatches.length) {
      return exactMatches;
    }

    return rows;
  }

  private getEffectiveEmployeeId(): string {
    return this.currentEmployeeId || this.loans[0]?.employeeId || this.salaryAdvances[0]?.employeeId || '';
  }

  private normalizeLoanStatus(rawStatus: unknown): LoanStatus {
    const status = String(rawStatus ?? '').trim().toLowerCase();

    if (status === 'active') return 'active';
    if (status === 'pending') return 'pending';
    if (status === 'approved') return 'approved';
    if (status === 'completed' || status === 'closed') return 'completed';
    if (status === 'cancelled' || status === 'canceled' || status === 'rejected') return 'cancelled';
    if (status === 'inactive') return 'pending'; // Inactive loans are typically awaiting approval or disbursement

    return 'pending'; // Default to pending for safety
  }

  private normalizeAdvanceStatus(rawStatus: unknown): SalaryAdvanceStatus {
    const status = String(rawStatus ?? '').trim().toLowerCase();

    if (status === 'approved') return 'approved';
    if (status === 'completed' || status === 'closed') return 'completed';
    if (status === 'cancelled' || status === 'canceled' || status === 'rejected') return 'cancelled';

    return 'pending';
  }

  private normalizePaymentStatus(rawStatus: unknown): PaymentStatus {
    const status = String(rawStatus ?? '').trim().toLowerCase();

    if (status === 'pending') return 'pending';
    if (status === 'skipped' || status === 'failed') return 'skipped';

    return 'deducted';
  }

  private normalizeRepaymentType(rawType: unknown): LoanRepaymentType {
    const type = String(rawType ?? '').trim().toLowerCase();
    return type === 'full' ? 'full' : 'installment';
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

  private isUnsupportedEndpointError(error: any): boolean {
    const status = Number(error?.status ?? 0);
    return status === 0 || status === 404 || status === 405 || status === 501;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toInteger(value: unknown): number {
    const parsed = Math.floor(this.toNumber(value));
    return parsed > 0 ? parsed : 0;
  }

  private toProgress(part: number, total: number): number {
    if (total <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
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

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
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

  private getTodayIsoDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getCurrentMonthYear(): string {
    return new Date().toLocaleDateString(undefined, {
      month: 'short',
      year: 'numeric'
    });
  }

  private generateReference(prefix: 'LOAN' | 'ADV', seed = 0): string {
    const now = new Date();
    const year = now.getFullYear();
    const serial = String(seed || Math.floor(Math.random() * 9000) + 1000).padStart(4, '0');
    return `${prefix}-${year}-${serial}`;
  }
}
