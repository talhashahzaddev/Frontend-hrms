import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { PayrollService } from '../../services/payroll.service';
import {
  LoanRepaymentType,
  RequestLoanDialogComponent,
  RequestLoanDialogPayload
} from '../dialogs/request-loan-dialog/request-loan-dialog.component';
import {
  RequestSalaryAdvanceDialogComponent,
  RequestSalaryAdvanceDialogPayload
} from '../dialogs/request-salary-advance-dialog/request-salary-advance-dialog.component';

type ModuleTab = 'loans' | 'salary-advance';
type LoanSectionTab = 'active' | 'history';
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
  imports: [CommonModule, MatIconModule],
  templateUrl: './loan-requests.component.html',
  styleUrl: './loan-requests.component.scss'
})
export class LoanRequestsComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly settingsService = inject(SettingsService);
  private readonly authService = inject(AuthService);

  readonly currencySymbol = signal('PKR');

  moduleTab: ModuleTab = 'salary-advance';
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

  ngOnInit(): void {
    this.resolveCurrentUserContext();

    this.localLoanSeed = this.buildLocalLoanSeed();
    this.localLoanPaymentSeed = this.buildLocalLoanPaymentSeed();
    this.localAdvanceSeed = this.buildLocalAdvanceSeed();
    this.localAdvancePaymentSeed = this.buildLocalAdvancePaymentSeed();

    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (code: any) => this.currencySymbol.set(this.settingsService.getCurrencySymbol(code)),
        error: () => this.currencySymbol.set(this.settingsService.getCurrencySymbol())
      });

    this.loadLoans();
    this.loadLoanPayments();
    this.loadSalaryAdvances();
    this.loadAdvancePayments();
  }

  get hasFallbackNotice(): boolean {
    return this.usingLocalLoanData
      || this.usingLocalLoanPaymentData
      || this.usingLocalAdvanceData
      || this.usingLocalAdvancePaymentData;
  }

  get activeLoanRecords(): EmployeeLoanRecord[] {
    return this.loans
      .filter((row) => row.status === 'active' || row.status === 'approved' || row.status === 'pending')
      .sort((a, b) => this.compareDateDesc(a.requestedOn, b.requestedOn));
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

  setLoanSectionTab(tab: LoanSectionTab): void {
    this.loanSectionTab = tab;
  }

  setSalarySectionTab(tab: SalarySectionTab): void {
    this.salarySectionTab = tab;
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

    dialogRef.afterClosed().subscribe((result: RequestLoanDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.submitLoanRequest(result);
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
    if (row.status !== 'pending') {
      return;
    }

    if (this.usingLocalLoanData) {
      this.localLoanSeed = this.localLoanSeed.map((item) => {
        if (item.id !== row.id) {
          return item;
        }

        return { ...item, status: 'cancelled' };
      });

      this.loans = this.filterForCurrentEmployee([...this.localLoanSeed]);
      return;
    }

    this.payrollService.updateLoan(row.id, {
      loanStatus: 'cancelled',
      requestStatus: 'cancelled'
    }).subscribe({
      next: () => this.loadLoans(),
      error: () => {
        this.activateLocalLoanFallback();
        this.cancelLoanRequest(row);
      }
    });
  }

  cancelAdvanceRequest(row: SalaryAdvanceRecord): void {
    if (row.status !== 'pending') {
      return;
    }

    if (this.usingLocalAdvanceData) {
      this.localAdvanceSeed = this.localAdvanceSeed.map((item) => {
        if (item.id !== row.id) {
          return item;
        }

        return { ...item, status: 'cancelled' };
      });

      this.salaryAdvances = this.filterForCurrentEmployee([...this.localAdvanceSeed]);
      return;
    }

    this.payrollService.updateSalaryAdvance(row.id, {
      advanceStatus: 'cancelled',
      requestStatus: 'cancelled'
    }).subscribe({
      next: () => this.loadSalaryAdvances(),
      error: () => {
        this.activateLocalAdvanceFallback();
        this.cancelAdvanceRequest(row);
      }
    });
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
    const count = this.loanHistoryRows.length;
    return `Showing ${count} of ${count} payment records`;
  }

  getAdvanceHistoryCountLabel(): string {
    const count = this.salaryPaymentHistoryRows.length;
    return `Showing ${count} of ${count} payment records`;
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
    if (this.usingLocalLoanData) {
      this.loans = this.filterForCurrentEmployee([...this.localLoanSeed]);
      return;
    }

    this.payrollService.getLoans({ page: 1, pageSize: 300 }).subscribe({
      next: (data: any) => {
        const mapped = this.extractItems(data)
          .map((item: any, index: number) => this.mapLoan(item, index));

        this.loans = this.filterForCurrentEmployee(mapped);
      },
      error: (error: any) => {
        if (this.isUnsupportedEndpointError(error)) {
          this.activateLocalLoanFallback();
          this.loadLoans();
          return;
        }

        this.loans = [];
      }
    });
  }

  private loadLoanPayments(): void {
    if (this.usingLocalLoanPaymentData) {
      this.loanPayments = this.filterForCurrentEmployee([...this.localLoanPaymentSeed]);
      return;
    }

    this.payrollService.getLoanPayments({ page: 1, pageSize: 300 }).subscribe({
      next: (data: any) => {
        const mapped = this.extractItems(data)
          .map((item: any, index: number) => this.mapLoanPayment(item, index));

        this.loanPayments = this.filterForCurrentEmployee(mapped);
      },
      error: (error: any) => {
        if (this.isUnsupportedEndpointError(error)) {
          this.activateLocalLoanPaymentFallback();
          this.loadLoanPayments();
          return;
        }

        this.loanPayments = [];
      }
    });
  }

  private loadSalaryAdvances(): void {
    if (this.usingLocalAdvanceData) {
      this.salaryAdvances = this.filterForCurrentEmployee([...this.localAdvanceSeed]);
      return;
    }

    this.payrollService.getSalaryAdvances({ page: 1, pageSize: 300 }).subscribe({
      next: (data: any) => {
        const mapped = this.extractItems(data)
          .map((item: any, index: number) => this.mapAdvance(item, index));

        this.salaryAdvances = this.filterForCurrentEmployee(mapped);
      },
      error: (error: any) => {
        if (this.isUnsupportedEndpointError(error)) {
          this.activateLocalAdvanceFallback();
          this.loadSalaryAdvances();
          return;
        }

        this.salaryAdvances = [];
      }
    });
  }

  private loadAdvancePayments(): void {
    if (this.usingLocalAdvancePaymentData) {
      this.advancePayments = this.filterForCurrentEmployee([...this.localAdvancePaymentSeed]);
      return;
    }

    this.payrollService.getAdvancePayments({ page: 1, pageSize: 300 }).subscribe({
      next: (data: any) => {
        const mapped = this.extractItems(data)
          .map((item: any, index: number) => this.mapAdvancePayment(item, index));

        this.advancePayments = this.filterForCurrentEmployee(mapped);
      },
      error: (error: any) => {
        if (this.isUnsupportedEndpointError(error)) {
          this.activateLocalAdvancePaymentFallback();
          this.loadAdvancePayments();
          return;
        }

        this.advancePayments = [];
      }
    });
  }

  private submitLoanRequest(payload: RequestLoanDialogPayload): void {
    const effectiveEmployeeId = this.getEffectiveEmployeeId();

    if (this.usingLocalLoanData || !effectiveEmployeeId) {
      this.activateLocalLoanFallback();
      this.createLocalLoanRequest(payload);
      return;
    }

    const totalInstallments = payload.repaymentType === 'full'
      ? 1
      : Math.max(1, Math.floor(payload.totalInstallments || 1));

    const monthlyInstallment = payload.repaymentType === 'full'
      ? payload.totalAmount
      : payload.monthlyInstallment;

    const requestPayload = {
      employeeId: effectiveEmployeeId,
      totalAmount: Number(payload.totalAmount),
      monthlyInstallment: Number(monthlyInstallment),
      totalInstallments,
      paidInstallments: 0,
      remainingAmount: Number(payload.totalAmount),
      startDate: payload.startDate,
      endDate: payload.endDate,
      loanStatus: 'pending',
      requestStatus: 'pending',
      repaymentType: payload.repaymentType,
      description: payload.reason,
      reason: payload.reason
    };

    this.payrollService.createLoan(requestPayload).subscribe({
      next: () => this.loadLoans(),
      error: () => {
        this.activateLocalLoanFallback();
        this.createLocalLoanRequest(payload);
      }
    });
  }

  private submitSalaryAdvanceRequest(payload: RequestSalaryAdvanceDialogPayload): void {
    const effectiveEmployeeId = this.getEffectiveEmployeeId();

    if (this.usingLocalAdvanceData || !effectiveEmployeeId) {
      this.activateLocalAdvanceFallback();
      this.createLocalAdvanceRequest(payload);
      return;
    }

    const requestPayload = {
      employeeId: effectiveEmployeeId,
      totalAmount: Number(payload.totalAmount),
      monthlyDeduction: Number(payload.monthlyDeduction),
      remainingAmount: Number(payload.totalAmount),
      advanceStatus: 'pending',
      requestStatus: 'pending',
      reason: payload.reason
    };

    this.payrollService.createSalaryAdvance(requestPayload).subscribe({
      next: () => this.loadSalaryAdvances(),
      error: () => {
        this.activateLocalAdvanceFallback();
        this.createLocalAdvanceRequest(payload);
      }
    });
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
      startDate: payload.startDate,
      endDate: payload.endDate,
      approvedBy: 'Pending HR approval',
      requestedOn: this.getTodayIsoDate()
    };

    this.localLoanSeed = [nextItem, ...this.localLoanSeed];
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
      requestedOn: this.normalizeDate(item.requestedOn ?? item.createdAt ?? item.startDate)
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
        requestedOn: '2025-01-01'
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
        requestedOn: '2025-10-12'
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

    if (status === 'approved') return 'approved';
    if (status === 'pending') return 'pending';
    if (status === 'completed' || status === 'closed') return 'completed';
    if (status === 'cancelled' || status === 'canceled' || status === 'rejected') return 'cancelled';

    return 'active';
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
