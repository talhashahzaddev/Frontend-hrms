import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { take, forkJoin, of } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { PayrollService } from '../../services/payroll.service';
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
  RequestSalaryAdvanceDialogPayload,
  SalaryAdvanceRuleOption
} from '../dialogs/request-salary-advance-dialog/request-salary-advance-dialog.component';

type ModuleTab = 'loans' | 'salary-advance';
type LoanSectionTab = 'requested' | 'active' | 'history';
type SalarySectionTab = 'requested' | 'active' | 'history';

type LoanStatus = 'active' | 'pending' | 'approved' | 'completed' | 'cancelled' | 'accepted' | 'rejected';
type SalaryAdvanceStatus = 'pending' | 'approved' | 'disbursed' | 'rejected' | 'deducted' | 'cancelled';
type PaymentStatus = 'deducted' | 'pending' | 'skipped';
type PaymentMethod = 'cash' | 'payroll_deduction' | 'bank_transfer';

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
  requestStatus: string;
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
  periodId: string;
  periodLabel: string;
  installmentAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  paidDate: string | null;
  paymentMethod?: string;
  installmentNumber?: number;
  loanAmount?: number;
  loanReference?: string;
}

interface SalaryAdvanceRecord {
  id: string;
  employeeId: string;
  referenceNo: string;
  amount: number;
  status: SalaryAdvanceStatus;
  reason: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  disbursedBy: string | null;
  disbursedAt: string | null;
  disbursementNote: string | null;
  deductedPeriodId: string | null;
  deductedPeriodLabel: string | null;
  deductedAt: string | null;
}

@Component({
  selector: 'app-loan-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterModule],
  templateUrl: './loan-requests.component.html',
  styleUrl: './loan-requests.component.scss'
})
export class LoanRequestsComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly payrollService = inject(PayrollService);
  private readonly settingsService = inject(SettingsService);

  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  private readonly loanEmployeePermissionKeys = [
    'loan_employee_list',
    'loan_employee_view',
    'loan_employee_request',
    'loan_employee_edit',
    'loan_employee_delete',
    'loan_employee_active',
    'loan_employee_pending',
    'loan_employee_history',
    'loan_employee_references'
  ];

  private readonly salaryAdvanceEmployeePermissionKeys = [
    'salary_advance_employee_list',
    'salary_advance_employee_view',
    'salary_advance_employee_request',
    'salary_advance_employee_edit',
    'salary_advance_employee_delete',
    'salary_advance_employee_summary'
  ];

  get canAccessLoanEmployee(): boolean {
    return this.loanEmployeePermissionKeys.some((key) => this.hasPermission(key));
  }

  get canAccessSalaryAdvanceEmployee(): boolean {
    return this.salaryAdvanceEmployeePermissionKeys.some((key) => this.hasPermission(key));
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasPermissionByActionKey(actionKey);
  }

  moduleTab: ModuleTab = 'loans';
  loanSectionTab: LoanSectionTab = 'active';
  salarySectionTab: SalarySectionTab = 'requested';

  currentEmployeeId = '';
  currentEmployeeName = 'Employee';

  loans: EmployeeLoanRecord[] = [];
  loanPayments: LoanPaymentHistoryRecord[] = [];

  salaryAdvances: SalaryAdvanceRecord[] = [];

  // Resolved from the backend salary-advance summary. This is the employee's basic
  // salary — the basis every rule cap ("max % of salary") is applied against, and
  // the same value the server validates the requested amount against. Never hardcode.
  salaryAdvanceBasis = 0;
  salaryAdvanceBasisConfigured = false;

  private localLoanSeed: EmployeeLoanRecord[] = [];
  private localLoanPaymentSeed: LoanPaymentHistoryRecord[] = [];
  private localAdvanceSeed: SalaryAdvanceRecord[] = [];

  usingLocalLoanData = false;
  usingLocalLoanPaymentData = false;
  usingLocalAdvanceData = false;

  pendingLoanHistorySearch = '';
  pendingLoanHistoryStatus: PaymentStatus | '' = '';
  pendingLoanHistoryMethod: PaymentMethod | '' = '';
  pendingLoanHistoryPeriod = ''; // Will store periodId
  pendingLoanHistoryReference = ''; // Will store loanId
  payrollPeriods: any[] = [];

  loanHistorySearch = '';
  loanHistoryStatus: PaymentStatus | '' = '';
  loanHistoryMethod: PaymentMethod | '' = '';
  loanHistoryPeriod = '';
  loanHistoryReference = ''; // Will store loanId
  loanHistoryTotalRecordsCount = 0;
  
  loanReferences: any[] = [];

  pendingAdvanceHistorySearch = '';
  pendingAdvanceHistoryStatus: SalaryAdvanceStatus | '' = '';

  advanceHistorySearch = '';
  advanceHistoryStatus: SalaryAdvanceStatus | '' = '';

  loanHistoryCurrentPage = 1;
  advanceHistoryCurrentPage = 1;
  readonly historyPageSize = 6;

  ngOnInit(): void {
    this.resolveCurrentUserContext();
    this.applyModuleFromQueryParam();
    this.ensureModuleAccess();

    this.localLoanSeed = this.buildLocalLoanSeed();
    this.localLoanPaymentSeed = this.buildLocalLoanPaymentSeed();
    this.localAdvanceSeed = this.buildLocalAdvanceSeed();

    if (this.moduleTab === 'loans' && this.canAccessLoanEmployee) {
      this.loadLoans();
      if (this.hasPermission('loan_employee_history')) {
        this.loadLoanPayments();
      }
      if (this.hasPermission('loan_employee_references')) {
        this.loadLoanReferences();
      }
    }

    if (this.moduleTab === 'salary-advance' && this.canAccessSalaryAdvanceEmployee) {
      if (this.hasPermission('salary_advance_employee_list')) {
        this.loadSalaryAdvances();
      }
      if (this.hasPermission('salary_advance_employee_summary')) {
        this.loadSalaryAdvanceSummary();
      }
    }

    this.loadPayrollPeriods();
    this.loadCurrencySymbol();
  }

  private ensureModuleAccess(): void {
    if (this.moduleTab === 'loans' && !this.canAccessLoanEmployee) {
      if (this.canAccessSalaryAdvanceEmployee) {
        this.moduleTab = 'salary-advance';
        this.salarySectionTab = 'requested';
        return;
      }
      this.redirectWhenNoEmployeeModuleAccess();
      return;
    }

    if (this.moduleTab === 'salary-advance' && !this.canAccessSalaryAdvanceEmployee) {
      if (this.canAccessLoanEmployee) {
        this.moduleTab = 'loans';
        this.loanSectionTab = 'requested';
        return;
      }
      this.redirectWhenNoEmployeeModuleAccess();
    }
  }

  private redirectWhenNoEmployeeModuleAccess(): void {
    if (this.authService.hasMenuPermission('Payroll', 'My Benefits', 'my_benefits')) {
      void this.router.navigate(['/payroll/my-benefits'], { replaceUrl: true });
      return;
    }

    void this.router.navigate(['/dashboard'], { replaceUrl: true });
  }

  private loadCurrencySymbol(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode: any) => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol(currencyCode));
        },
        error: (err) => {
          console.error('Error loading organization currency', err);
        }
      });
  }

  private loadPayrollPeriods(): void {
    this.payrollService.getPayrollPeriods()
      .pipe(take(1))
      .subscribe({
        next: (res: any) => {
          // res is response.data which is a PagedResult (contains .data array)
          const rawPeriods = res?.data || [];
          this.payrollPeriods = rawPeriods.map((p: any) => ({
            periodId: p.periodId || p.id,
            periodName: p.periodName || p.name || p.periodLabel
          }));
        },
        error: (err) => {
          console.error('Error loading payroll periods', err);
        }
      });
  }

  private loadLoanReferences(): void {
    if (!this.hasPermission('loan_employee_references')) {
      return;
    }

    this.payrollService.getMyLoanReferences()
      .pipe(take(1))
      .subscribe({
        next: (refs) => {
          this.loanReferences = refs || [];
        },
        error: (err) => {
          console.error('Error loading loan references', err);
        }
      });
  }

  private applyModuleFromQueryParam(): void {
    const moduleParam = String(this.route.snapshot.queryParamMap.get('module') ?? '').trim().toLowerCase();

    if (moduleParam === 'salary-advance' || moduleParam === 'advance-salary' || moduleParam === 'salary') {
      this.moduleTab = 'salary-advance';
      this.salarySectionTab = 'requested';
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
      || this.usingLocalAdvanceData;
  }

  get hasActiveLoanHistoryFilters(): boolean {
    return !!(
      this.pendingLoanHistorySearch
      || this.pendingLoanHistoryStatus
      || this.pendingLoanHistoryMethod
      || this.pendingLoanHistoryPeriod
      || this.pendingLoanHistoryReference
    );
  }

  get hasAppliedLoanHistoryFilters(): boolean {
    return !!(
      this.loanHistorySearch
      || this.loanHistoryStatus
      || this.loanHistoryMethod
      || this.loanHistoryPeriod
      || this.loanHistoryReference
    );
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

  get requestedSalaryAdvances(): SalaryAdvanceRecord[] {
    return this.salaryAdvances
      .filter((row) => row.status === 'pending' || row.status === 'approved')
      .sort((a, b) => this.compareDateDesc(a.updatedAt, b.updatedAt));
  }

  get activeSalaryAdvances(): SalaryAdvanceRecord[] {
    return this.salaryAdvances
      .filter((row) => row.status === 'disbursed')
      .sort((a, b) => this.compareDateDesc(a.updatedAt, b.updatedAt));
  }

  get salarySectionRecords(): SalaryAdvanceRecord[] {
    return this.salarySectionTab === 'requested'
      ? this.requestedSalaryAdvances
      : this.activeSalaryAdvances;
  }

  get advanceHistoryRows(): SalaryAdvanceRecord[] {
    return this.salaryAdvances
      .filter((row) => row.status === 'deducted' || row.status === 'rejected' || row.status === 'cancelled')
      .sort((a, b) => this.compareDateDesc(a.updatedAt, b.updatedAt));
  }

  get loanHistoryPeriods(): any[] {
    return this.payrollPeriods;
  }

  get loanHistoryTotalRecords(): number {
    return this.loanHistoryTotalRecordsCount;
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
    return this.loanPayments;
  }

  get hasActiveAdvanceHistoryFilters(): boolean {
    return !!(this.pendingAdvanceHistorySearch || this.pendingAdvanceHistoryStatus);
  }

  get hasAppliedAdvanceHistoryFilters(): boolean {
    return !!(this.advanceHistorySearch || this.advanceHistoryStatus);
  }

  get filteredAdvanceHistoryRows(): SalaryAdvanceRecord[] {
    const search = this.advanceHistorySearch.trim().toLowerCase();

    return this.advanceHistoryRows.filter((row) => {
      const matchesSearch = !search
        || row.referenceNo.toLowerCase().includes(search)
        || row.reason.toLowerCase().includes(search)
        || this.getAdvanceHistoryDetail(row).toLowerCase().includes(search);
      const matchesStatus = !this.advanceHistoryStatus || row.status === this.advanceHistoryStatus;
      return matchesSearch && matchesStatus;
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

  get advanceHistoryView(): SalaryAdvanceRecord[] {
    return this.paginateData(this.filteredAdvanceHistoryRows, this.advanceHistoryPage, this.historyPageSize);
  }

  get totalBorrowed(): number {
    return this.loans
      .filter((row) => row.status === 'active')
      .reduce((sum, row) => sum + row.totalAmount, 0);
  }

  get amountPaid(): number {
    return this.loans
      .filter((row) => row.status === 'active')
      .reduce((sum, row) => sum + row.paidAmount, 0);
  }

  get remainingLoanAmount(): number {
    return this.loans
      .filter((row) => row.status === 'active')
      .reduce((sum, row) => sum + row.remainingAmount, 0);
  }

  get monthlyInstallmentTotal(): number {
    return this.loans
      .filter((row) => row.status === 'active')
      .reduce((sum, row) => sum + row.monthlyInstallment, 0);
  }

  get totalAdvanced(): number {
    return this.salaryAdvances
      .filter((row) => row.status === 'approved' || row.status === 'disbursed' || row.status === 'deducted')
      .reduce((sum, row) => sum + row.amount, 0);
  }

  get recoveredAdvanceAmount(): number {
    return this.salaryAdvances
      .filter((row) => row.status === 'deducted')
      .reduce((sum, row) => sum + row.amount, 0);
  }

  get outstandingAdvanceAmount(): number {
    return this.salaryAdvances
      .filter((row) => row.status === 'disbursed')
      .reduce((sum, row) => sum + row.amount, 0);
  }

  get disbursedAdvanceAmount(): number {
    return this.salaryAdvances
      .filter((row) => row.status === 'disbursed')
      .reduce((sum, row) => sum + row.amount, 0);
  }

  get activeAdvanceCount(): number {
    return this.salaryAdvances
      .filter((row) => row.status === 'disbursed')
      .length;
  }

  get availableAdvanceLimit(): number {
    // The cap basis the dialog multiplies by each rule's max percentage. Must equal
    // the server's basis (employee basic salary) so the FE preview matches what the
    // backend will actually accept. Stacking is blocked server-side, so we do not
    // net out outstanding here — that would desync the FE cap from the BE cap.
    return Math.max(0, this.salaryAdvanceBasis);
  }

  setModuleTab(tab: ModuleTab): void {
    this.moduleTab = tab;
  }

  goBackToBenefits(): void {
    if (this.authService.hasMenuPermission('Payroll', 'My Benefits', 'my_benefits')) {
      void this.router.navigate(['/payroll/my-benefits']);
      return;
    }

    void this.router.navigate(['/dashboard']);
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
    this.loanHistoryMethod = this.pendingLoanHistoryMethod;
    this.loanHistoryPeriod = this.pendingLoanHistoryPeriod;
    this.loanHistoryReference = this.pendingLoanHistoryReference;
    this.loanHistoryCurrentPage = 1;
    this.loadLoanPayments();
  }

  clearLoanHistoryFilters(): void {
    this.pendingLoanHistorySearch = '';
    this.pendingLoanHistoryStatus = '';
    this.pendingLoanHistoryMethod = '';
    this.pendingLoanHistoryPeriod = '';
    this.pendingLoanHistoryReference = '';
    this.loanHistorySearch = '';
    this.loanHistoryStatus = '';
    this.loanHistoryMethod = '';
    this.loanHistoryPeriod = '';
    this.loanHistoryReference = '';
    this.loanHistoryCurrentPage = 1;
    this.loadLoanPayments();
  }

  goToLoanHistoryPage(page: number): void {
    if (page < 1 || page > this.loanHistoryTotalPages || page === this.loanHistoryCurrentPage) {
      return;
    }

    this.loanHistoryCurrentPage = page;
    this.loadLoanPayments();
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
    this.advanceHistoryCurrentPage = 1;
  }

  clearAdvanceHistoryFilters(): void {
    this.pendingAdvanceHistorySearch = '';
    this.pendingAdvanceHistoryStatus = '';
    this.advanceHistorySearch = '';
    this.advanceHistoryStatus = '';
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
    if (!this.hasPermission('loan_employee_request')) {
      return;
    }
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
    if (!this.hasPermission('loan_employee_edit')) {
      return;
    }
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
    if (!this.hasPermission('salary_advance_employee_request')) {
      return;
    }
    this.payrollService.getActiveSalaryAdvanceRules()
      .pipe(take(1))
      .subscribe({
        next: (rules: any[]) => {
          const mappedRules = this.mapActiveSalaryAdvanceRules(rules);
          if (mappedRules.length > 0) {
            this.openSalaryAdvanceRequestDialog(mappedRules);
            return;
          }

          this.loadSalaryAdvanceRulesFallbackAndOpenDialog();
        },
        error: () => {
          this.loadSalaryAdvanceRulesFallbackAndOpenDialog();
        }
      });
  }

  cancelLoanRequest(row: EmployeeLoanRecord): void {
    if (!this.hasPermission('loan_employee_delete')) {
      return;
    }
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
    if (!this.hasPermission('salary_advance_employee_delete')) {
      return;
    }
    if (row.status !== 'pending') {
      return;
    }

    if (!this.usingLocalAdvanceData) {
      this.payrollService.cancelMySalaryAdvance(row.id)
        .pipe(take(1))
        .subscribe({
          next: () => this.loadSalaryAdvances(),
          error: (error) => {
            if (this.isUnsupportedEndpointError(error)) {
              this.applyLocalAdvanceCancellation(row);
            }
          }
        });
      return;
    }

    this.applyLocalAdvanceCancellation(row);
  }

  private applyLocalAdvanceCancellation(row: SalaryAdvanceRecord): void {
    const now = this.getTodayIsoDate();

    this.activateLocalAdvanceFallback();
    this.localAdvanceSeed = this.localAdvanceSeed.map((item) => {
      if (item.id !== row.id) {
        return item;
      }

      return { ...item, status: 'cancelled', updatedAt: now };
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

  getLoanStatusClass(loan: EmployeeLoanRecord): string {
    if (loan.status === 'active') return 'status-active';
    return `status-${this.normalizeLoanStatus(loan.requestStatus)}`;
  }

  getAdvanceStatusClass(status: SalaryAdvanceStatus): string {
    return `status-${status}`;
  }

  getPaymentStatusClass(status: PaymentStatus): string {
    return `status-${status}`;
  }

  getAdvanceEventDate(row: SalaryAdvanceRecord): string | null {
    if (row.status === 'deducted') {
      return row.deductedAt;
    }

    if (row.status === 'rejected') {
      return row.rejectedAt;
    }

    if (row.status === 'disbursed') {
      return row.disbursedAt;
    }

    if (row.status === 'approved') {
      return row.approvedAt;
    }

    return row.updatedAt || row.createdAt;
  }

  getAdvanceLifecycleNote(row: SalaryAdvanceRecord): string {
    const deductionPeriod = this.getAdvanceDeductionPeriodLabel(row);

    if (row.status === 'pending') {
      return `Requested on ${this.formatDateLabel(row.createdAt)} (planned deduction: ${deductionPeriod})`;
    }

    if (row.status === 'approved') {
      return `Approved by ${row.approvedBy ?? 'Payroll'} on ${this.formatDateLabel(row.approvedAt)} (planned deduction: ${deductionPeriod})`;
    }

    if (row.status === 'disbursed') {
      const note = row.disbursementNote ? ` (${row.disbursementNote})` : '';
      return `Disbursed by ${row.disbursedBy ?? 'Payroll'} on ${this.formatDateLabel(row.disbursedAt)}${note} (planned deduction: ${deductionPeriod})`;
    }

    if (row.status === 'rejected') {
      const reason = row.rejectionReason ? ` (${row.rejectionReason})` : '';
      return `Rejected by ${row.rejectedBy ?? 'Payroll'} on ${this.formatDateLabel(row.rejectedAt)}${reason}`;
    }

    if (row.status === 'deducted') {
      const period = row.deductedPeriodLabel ? ` in ${row.deductedPeriodLabel}` : '';
      return `Deducted${period} on ${this.formatDateLabel(row.deductedAt)}`;
    }

    return `Cancelled on ${this.formatDateLabel(row.updatedAt)}`;
  }

  getAdvanceDeductionPeriodLabel(row: SalaryAdvanceRecord): string {
    return row.deductedPeriodLabel || 'Not scheduled';
  }

  getAdvanceHistoryDetail(row: SalaryAdvanceRecord): string {
    if (row.status === 'deducted') {
      return row.deductedPeriodLabel
        ? `Deducted in ${row.deductedPeriodLabel}`
        : 'Deducted in payroll';
    }

    if (row.status === 'rejected') {
      return row.rejectionReason || 'Rejected by payroll';
    }

    if (row.status === 'cancelled') {
      return 'Cancelled request';
    }

    return this.getAdvanceLifecycleNote(row);
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

    return `Showing ${this.advanceHistoryFromRecord} to ${this.advanceHistoryToRecord} of ${this.advanceHistoryTotalRecords} advance records`;
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
    if (!this.hasPermission('loan_employee_pending') && !this.hasPermission('loan_employee_active')) {
      return;
    }

    // We combine pending requests and active loans into a single list
    forkJoin({
      pending: this.hasPermission('loan_employee_pending')
        ? this.payrollService.getMyPendingLoans().pipe(take(1))
        : of([]),
      active: this.hasPermission('loan_employee_active')
        ? this.payrollService.getMyActiveLoans().pipe(take(1))
        : of([])
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
    if (!this.hasPermission('loan_employee_history')) {
      return;
    }

    const filter = {
      page: this.loanHistoryCurrentPage,
      pageSize: this.historyPageSize,
      status: this.loanHistoryStatus,
      paymentMethod: this.loanHistoryMethod,
      periodId: this.loanHistoryPeriod,
      loanId: this.loanHistoryReference
    };

    this.payrollService.getMyLoanHistory(filter).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.loanPayments = response.data.map((item: any) => ({
            id: item.id,
            loanId: item.loanId,
            employeeId: item.employeeId,
            periodId: item.periodId,
            periodLabel: item.periodLabel || 'N/A', 
            installmentAmount: item.installmentAmount,
            remainingAmount: item.remainingAmount,
            status: item.paymentStatus?.toLowerCase() || 'pending',
            paidDate: item.paymentDate,
            paymentMethod: item.paymentMethod,
            installmentNumber: item.installmentNumber,
            loanAmount: item.loanTotalAmount,
            loanReference: item.loanReferenceId
          }));
          this.loanHistoryTotalRecordsCount = response.totalCount;
        } else {
          this.loanPayments = [];
          this.loanHistoryTotalRecordsCount = 0;
        }
        this.usingLocalLoanPaymentData = false;
      },
      error: (err) => {
        console.error('Error loading loan payments', err);
        // Fallback to local data if needed, but for now just clear
        this.loanPayments = [];
        this.loanHistoryTotalRecordsCount = 0;
      }
    });
  }

  private loadSalaryAdvances(): void {
    if (!this.hasPermission('salary_advance_employee_list')) {
      return;
    }

    this.payrollService.getMySalaryAdvances({ page: 1, pageSize: 200 })
      .pipe(take(1))
      .subscribe({
        next: (result: any) => {
          const rows = this.extractItems(result)
            .map((item, index) => this.mapAdvance(item, index));
          const uniqueRows = this.dedupeSalaryAdvances(rows);

          this.usingLocalAdvanceData = false;
          this.salaryAdvances = this.filterForCurrentEmployee(uniqueRows);
        },
        error: (error) => {
          if (!this.isUnsupportedEndpointError(error)) {
            console.error('Failed to load salary advances', error);
          }

          this.activateLocalAdvanceFallback();
          this.salaryAdvances = this.filterForCurrentEmployee([...this.localAdvanceSeed]);
        }
      });
  }

  private loadSalaryAdvanceSummary(): void {
    if (!this.hasPermission('salary_advance_employee_summary')) {
      return;
    }

    this.payrollService.getMySalaryAdvanceSummary()
      .pipe(take(1))
      .subscribe({
        next: (summary: any) => {
          const basis = Number(summary?.basicSalary ?? 0);
          this.salaryAdvanceBasis = Number.isFinite(basis) && basis > 0 ? basis : 0;
          this.salaryAdvanceBasisConfigured = !!summary?.hasBasicSalary && this.salaryAdvanceBasis > 0;
        },
        error: (error) => {
          if (!this.isUnsupportedEndpointError(error)) {
            console.error('Failed to load salary advance summary', error);
          }
          this.salaryAdvanceBasis = 0;
          this.salaryAdvanceBasisConfigured = false;
        }
      });
  }

  private submitLoanRequest(payload: RequestLoanDialogPayload): void {
    this.activateLocalLoanFallback();
    this.createLocalLoanRequest(payload);
  }

  private submitSalaryAdvanceRequest(payload: RequestSalaryAdvanceDialogPayload): void {
    if (this.usingLocalAdvanceData) {
      this.activateLocalAdvanceFallback();
      this.createLocalAdvanceRequest(payload);
      return;
    }

    const requestBody = {
      ruleId: payload.selectedRuleId || null,
      amount: Number(payload.totalAmount ?? 0),
      reason: String(payload.reason ?? '').trim() || null
    };

    this.payrollService.createSalaryAdvanceRequest(requestBody)
      .pipe(take(1))
      .subscribe({
        next: () => this.loadSalaryAdvances(),
        error: (error) => {
          if (this.isUnsupportedEndpointError(error)) {
            this.activateLocalAdvanceFallback();
            this.createLocalAdvanceRequest(payload);
          }
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
      requestStatus: 'pending',
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
        requestStatus: 'pending',
        ruleId: payload.loanRuleId || ''
      };
    });

    this.loans = this.filterForCurrentEmployee([...this.localLoanSeed]);
  }

  private createLocalAdvanceRequest(payload: RequestSalaryAdvanceDialogPayload): void {
    const amount = Number(payload.totalAmount);
    const now = this.getTodayIsoDate();

    const nextItem: SalaryAdvanceRecord = {
      id: `local-advance-req-${Date.now()}`,
      employeeId: this.getEffectiveEmployeeId() || 'self-local',
      referenceNo: this.generateReference('ADV'),
      amount,
      status: 'pending',
      reason: payload.reason,
      createdBy: this.currentEmployeeName,
      createdAt: now,
      updatedAt: now,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      disbursedBy: null,
      disbursedAt: null,
      disbursementNote: null,
      deductedPeriodId: null,
      deductedPeriodLabel: null,
      deductedAt: null
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
      referenceNo: String(item.referenceId ?? item.referenceNo ?? item.loanNumber ?? this.generateReference('LOAN', index + 1)),
      totalAmount,
      monthlyInstallment,
      totalInstallments,
      paidInstallments,
      remainingAmount,
      paidAmount,
      progressPercent: this.toProgress(paidAmount, totalAmount),
      status: (this.normalizeLoanStatus(item.loanStatus ?? item.status) === 'active') 
        ? 'active' 
        : this.normalizeLoanStatus(item.requestStatus ?? item.loanStatus ?? item.status),
      requestStatus: String(item.requestStatus ?? item.loanStatus ?? item.status ?? 'pending'),
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
      periodId: String(item.periodId ?? item.payrollPeriodId ?? ''),
      periodLabel: String(item.periodName ?? item.period ?? item.payrollPeriodName ?? this.getCurrentMonthYear()),
      installmentAmount: this.toNumber(item.installmentAmount ?? item.paymentAmount ?? item.amount),
      remainingAmount: this.toNumber(item.remainingAmount ?? item.balanceAmount),
      status: this.normalizePaymentStatus(item.paymentStatus ?? item.status),
      paymentMethod: item.paymentMethod,
      installmentNumber: item.installmentNumber,
      paidDate: this.normalizeDateNullable(item.paidDate ?? item.paymentDate ?? item.createdAt)
    };
  }

  private mapAdvance(item: any, index: number): SalaryAdvanceRecord {
    const amount = this.toNumber(item.amount ?? item.totalAmount ?? item.advanceAmount);
    const deductedPeriodId = String(item.deductedPeriodId ?? item.deductionPeriodId ?? '').trim() || null;
    const deductedPeriodLabel = String(
      item.deductedPeriodName
      ?? item.deductionPeriodName
      ?? item.deductedPeriod?.periodName
      ?? item.plannedDeductionPeriodName
      ?? item.periodName
      ?? item.period
      ?? deductedPeriodId
      ?? ''
    ).trim() || null;

    return {
      id: String(item.advanceId ?? item.id ?? `advance-${index + 1}`),
      employeeId: String(item.employeeId ?? item.employee?.employeeId ?? item.employee?.id ?? this.currentEmployeeId ?? ''),
      referenceNo: String(item.referenceNo ?? item.advanceNumber ?? this.generateReference('ADV', index + 1)),
      amount,
      status: this.normalizeAdvanceStatus(item.advanceStatus ?? item.status ?? item.requestStatus),
      reason: String(item.reason ?? item.description ?? item.notes ?? 'Salary advance request'),
      createdBy: String(item.createdByName ?? item.createdBy ?? 'Employee Self-Service'),
      createdAt: this.normalizeDate(item.createdAt ?? item.requestedOn),
      updatedAt: this.normalizeDate(item.updatedAt ?? item.createdAt ?? item.requestedOn),
      approvedBy: item.approvedBy ? String(item.approvedBy) : null,
      approvedAt: this.normalizeDateNullable(item.approvedAt),
      rejectedBy: item.rejectedBy ? String(item.rejectedBy) : null,
      rejectedAt: this.normalizeDateNullable(item.rejectedAt),
      rejectionReason: item.rejectionReason ? String(item.rejectionReason) : null,
      disbursedBy: item.disbursedBy ? String(item.disbursedBy) : null,
      disbursedAt: this.normalizeDateNullable(item.disbursedAt),
      disbursementNote: item.disbursementNote ? String(item.disbursementNote) : null,
      deductedPeriodId,
      deductedPeriodLabel,
      deductedAt: this.normalizeDateNullable(item.deductedAt)
    };
  }

  private loadSalaryAdvanceRulesFallbackAndOpenDialog(): void {
    this.payrollService.getSalaryAdvanceRules()
      .pipe(take(1))
      .subscribe({
        next: (rules: any[]) => {
          const mappedRules = this.mapActiveSalaryAdvanceRules(
            (rules ?? []).filter((rule: any) => rule?.isActive !== false)
          );
          this.openSalaryAdvanceRequestDialog(mappedRules);
        },
        error: () => {
          this.openSalaryAdvanceRequestDialog([]);
        }
      });
  }

  private openSalaryAdvanceRequestDialog(activeRules: SalaryAdvanceRuleOption[]): void {
    const dialogRef = this.dialog.open(RequestSalaryAdvanceDialogComponent, {
      width: '500px',
      panelClass: 'request-salary-advance-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        currencySymbol: this.currencySymbol(),
        availableLimit: this.availableAdvanceLimit,
        activeRules
      }
    });

    dialogRef.afterClosed().subscribe((result: RequestSalaryAdvanceDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.submitSalaryAdvanceRequest(result);
    });
  }

  private mapActiveSalaryAdvanceRules(rules: any[]): SalaryAdvanceRuleOption[] {
    const mapped = (rules ?? [])
      .map((rule: any) => ({
        ruleId: String(rule?.ruleId ?? rule?.id ?? '').trim(),
        ruleName: String(rule?.ruleName ?? rule?.name ?? 'Salary Advance Rule').trim(),
        maxPercentage: this.toNumber(rule?.maxPercentage)
      }))
      .filter((rule: SalaryAdvanceRuleOption) => !!rule.ruleId && rule.maxPercentage > 0)
      .sort((left: SalaryAdvanceRuleOption, right: SalaryAdvanceRuleOption) => right.maxPercentage - left.maxPercentage);

    const uniqueRules: SalaryAdvanceRuleOption[] = [];
    const seenRuleIds = new Set<string>();

    for (const rule of mapped) {
      if (seenRuleIds.has(rule.ruleId)) {
        continue;
      }

      seenRuleIds.add(rule.ruleId);
      uniqueRules.push(rule);
    }

    return uniqueRules;
  }

  private dedupeSalaryAdvances(rows: SalaryAdvanceRecord[]): SalaryAdvanceRecord[] {
    const uniqueRows: SalaryAdvanceRecord[] = [];
    const seenIds = new Set<string>();

    for (const row of rows) {
      const key = String(row.id ?? '').trim();

      if (!key) {
        uniqueRows.push(row);
        continue;
      }

      if (seenIds.has(key)) {
        continue;
      }

      seenIds.add(key);
      uniqueRows.push(row);
    }

    return uniqueRows;
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
        requestStatus: 'active',
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
        requestStatus: 'pending',
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
        periodId: 'local-period-1',
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
        periodId: 'local-period-2',
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
        periodId: 'local-period-3',
        periodLabel: 'Mar 2025',
        installmentAmount: 10000,
        remainingAmount: 170000,
        status: 'deducted',
        paidDate: '2025-03-31',
        installmentNumber: 3,
        paymentMethod: 'payroll_deduction'
      },
      {
        id: 'local-loan-payment-4',
        loanId: 'local-loan-2025-0842',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        periodId: 'local-period-4',
        periodLabel: 'Apr 2025',
        installmentAmount: 10000,
        remainingAmount: 160000,
        status: 'deducted',
        paidDate: '2025-04-30',
        installmentNumber: 4,
        paymentMethod: 'payroll_deduction'
      },
      {
        id: 'local-loan-payment-5',
        loanId: 'local-loan-2025-0842',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        periodId: 'local-period-5',
        periodLabel: 'May 2025',
        installmentAmount: 10000,
        remainingAmount: 150000,
        status: 'deducted',
        paidDate: '2025-05-30',
        installmentNumber: 5,
        paymentMethod: 'payroll_deduction'
      },
      {
        id: 'local-loan-payment-6',
        loanId: 'local-loan-2025-0842',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        periodId: 'local-period-6',
        periodLabel: 'Jun 2025',
        installmentAmount: 10000,
        remainingAmount: 140000,
        status: 'deducted',
        paidDate: '2025-06-30',
        installmentNumber: 6,
        paymentMethod: 'payroll_deduction'
      }
    ];
  }

  private buildLocalAdvanceSeed(): SalaryAdvanceRecord[] {
    return [
      {
        id: 'local-advance-2025-0842',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        referenceNo: 'ADV-2025-0842',
        amount: 50000,
        status: 'disbursed',
        reason: 'Medical emergency',
        createdBy: this.currentEmployeeName,
        createdAt: '2025-03-10',
        updatedAt: '2025-03-12',
        approvedBy: 'HR Manager',
        approvedAt: '2025-03-11',
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        disbursedBy: 'Finance Officer',
        disbursedAt: '2025-03-12',
        disbursementNote: 'Transferred with payroll run',
        deductedPeriodId: 'local-period-2025-04',
        deductedPeriodLabel: 'Apr 2025',
        deductedAt: null
      },
      {
        id: 'local-advance-2025-0679',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        referenceNo: 'ADV-2025-0679',
        amount: 30000,
        status: 'deducted',
        reason: 'Family support',
        createdBy: this.currentEmployeeName,
        createdAt: '2025-01-03',
        updatedAt: '2025-02-28',
        approvedBy: 'HR Manager',
        approvedAt: '2025-01-04',
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        disbursedBy: 'Finance Officer',
        disbursedAt: '2025-01-05',
        disbursementNote: 'Disbursed same week',
        deductedPeriodId: 'local-period-2025-02',
        deductedPeriodLabel: 'Feb 2025',
        deductedAt: '2025-02-28'
      },
      {
        id: 'local-advance-2025-1029',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        referenceNo: 'ADV-2025-1029',
        amount: 30000,
        status: 'pending',
        reason: 'Home renovation',
        createdBy: this.currentEmployeeName,
        createdAt: '2025-10-12',
        updatedAt: '2025-10-12',
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        disbursedBy: null,
        disbursedAt: null,
        disbursementNote: null,
        deductedPeriodId: 'local-period-2025-11',
        deductedPeriodLabel: 'Nov 2025',
        deductedAt: null
      },
      {
        id: 'local-advance-2025-0331',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        referenceNo: 'ADV-2025-0331',
        amount: 22000,
        status: 'rejected',
        reason: 'Travel request',
        createdBy: this.currentEmployeeName,
        createdAt: '2025-04-02',
        updatedAt: '2025-04-03',
        approvedBy: null,
        approvedAt: null,
        rejectedBy: 'HR Manager',
        rejectedAt: '2025-04-03',
        rejectionReason: 'Outstanding advance already exists',
        disbursedBy: null,
        disbursedAt: null,
        disbursementNote: null,
        deductedPeriodId: 'local-period-2025-05',
        deductedPeriodLabel: 'May 2025',
        deductedAt: null
      },
      {
        id: 'local-advance-2025-0220',
        employeeId: this.getEffectiveEmployeeId() || 'self-local',
        referenceNo: 'ADV-2025-0220',
        amount: 18000,
        status: 'approved',
        reason: 'Utility adjustment',
        createdBy: this.currentEmployeeName,
        createdAt: '2025-02-20',
        updatedAt: '2025-02-21',
        approvedBy: 'HR Manager',
        approvedAt: '2025-02-21',
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        disbursedBy: null,
        disbursedAt: null,
        disbursementNote: null,
        deductedPeriodId: 'local-period-2025-03',
        deductedPeriodLabel: 'Mar 2025',
        deductedAt: null
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
    if (status === 'accepted') return 'accepted';
    if (status === 'completed' || status === 'closed') return 'completed';
    if (status === 'rejected') return 'rejected';
    if (status === 'cancelled' || status === 'canceled') return 'cancelled';
    if (status === 'inactive') return 'pending'; // Inactive loans are typically awaiting approval or disbursement

    return 'pending'; // Default to pending for safety
  }

  private normalizeAdvanceStatus(rawStatus: unknown): SalaryAdvanceStatus {
    const status = String(rawStatus ?? '').trim().toLowerCase();

    if (status === 'approved') return 'approved';
    if (status === 'disbursed') return 'disbursed';
    if (status === 'deducted' || status === 'completed' || status === 'closed') return 'deducted';
    if (status === 'rejected') return 'rejected';
    if (status === 'cancelled' || status === 'canceled') return 'cancelled';

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
