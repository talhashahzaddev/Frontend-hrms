import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs';

import { PayrollService } from '../../services/payroll.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { AuthService } from '@core/services/auth.service';
import {
  AddSalaryAdvanceDialogComponent,
  SalaryAdvanceDialogPayload,
  SalaryAdvanceDialogStatus
} from '../dialogs/add-salary-advance-dialog/add-salary-advance-dialog.component';
import { DeleteActionDialogComponent } from '../dialogs/delete-action-dialog/delete-action-dialog.component';

type SalaryAdvanceStatus = SalaryAdvanceDialogStatus;
type SalaryAdvanceTab = 'requests' | 'active' | 'history';

interface EmployeeOption {
  id: string;
  name: string;
  designation: string;
}

interface PeriodOption {
  id: string;
  name: string;
}

interface SalaryAdvanceRow {
  advanceId: string;
  organizationId: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  reason: string;
  status: SalaryAdvanceStatus;
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
  deductedPeriodName: string | null;
  deductedAt: string | null;
}

@Component({
  selector: 'app-salary-advances',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './salary-advances.component.html',
  styleUrl: './salary-advances.component.scss'
})
export class SalaryAdvancesComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly settingsService = inject(SettingsService);
  private readonly authService = inject(AuthService);
  private readonly adminActor = 'Payroll Admin';

  get canAccessSalaryAdvanceAdmin(): boolean {
    return (
      this.hasPermission('salary_advance_admin_list') ||
      this.hasPermission('salary_advance_admin_view') ||
      this.hasPermission('salary_advance_admin_approve') ||
      this.hasPermission('salary_advance_admin_reject') ||
      this.hasPermission('salary_advance_admin_disburse')
    );
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasPermissionByActionKey(actionKey);
  }

  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());
  currentTab: SalaryAdvanceTab = 'requests';

  pendingSalaryAdvanceSearch = '';
  pendingSalaryAdvanceStatusFilter: SalaryAdvanceStatus | '' = '';

  salaryAdvanceSearch = '';
  salaryAdvanceStatusFilter: SalaryAdvanceStatus | '' = '';

  employees: EmployeeOption[] = [];
  periods: PeriodOption[] = [];

  salaryAdvances: SalaryAdvanceRow[] = [];

  private localPeriodsSeed: PeriodOption[] = [];
  private localSalaryAdvancesSeed: SalaryAdvanceRow[] = [];

  usingLocalSalaryAdvanceData = false;

  salaryAdvancesCurrentPage = 1;
  salaryAdvancesPageSize = 10;

  ngOnInit(): void {
    this.loadCurrencySymbol();

    if (!this.canAccessSalaryAdvanceAdmin) {
      return;
    }

    this.localPeriodsSeed = this.buildLocalPeriods();
    this.localSalaryAdvancesSeed = this.buildLocalSalaryAdvances();

    this.loadEmployees();
    this.loadPayrollPeriods();

    if (this.hasPermission('salary_advance_admin_list')) {
      this.loadSalaryAdvances();
    } else {
      this.activateLocalSalaryAdvanceFallback();
      this.applyLocalSalaryAdvances();
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

  get hasActiveSalaryAdvanceFilters(): boolean {
    return !!(this.pendingSalaryAdvanceSearch || this.pendingSalaryAdvanceStatusFilter);
  }

  get hasAppliedSalaryAdvanceFilters(): boolean {
    return !!(this.salaryAdvanceSearch || this.salaryAdvanceStatusFilter);
  }

  get hasFallbackNotice(): boolean {
    return this.usingLocalSalaryAdvanceData;
  }

  get requestsCount(): number {
    return this.requestRows.length;
  }

  get activeCount(): number {
    return this.activeRows.length;
  }

  get totalDisbursedAmount(): number {
    return this.salaryAdvances
      .filter((advance) => advance.status === 'disbursed')
      .reduce((sum, advance) => sum + advance.amount, 0);
  }

  get totalDeductedAmount(): number {
    return this.salaryAdvances
      .filter((advance) => advance.status === 'deducted')
      .reduce((sum, advance) => sum + advance.amount, 0);
  }

  get requestRows(): SalaryAdvanceRow[] {
    return this.salaryAdvances
      .filter((advance) => advance.status === 'pending' || advance.status === 'approved')
      .sort((left, right) => this.compareDateDesc(left.updatedAt, right.updatedAt));
  }

  get activeRows(): SalaryAdvanceRow[] {
    return this.salaryAdvances
      .filter((advance) => advance.status === 'disbursed')
      .sort((left, right) => this.compareDateDesc(left.updatedAt, right.updatedAt));
  }

  get historyRows(): SalaryAdvanceRow[] {
    return this.salaryAdvances
      .filter((advance) => advance.status === 'rejected' || advance.status === 'deducted' || advance.status === 'cancelled')
      .sort((left, right) => this.compareDateDesc(left.updatedAt, right.updatedAt));
  }

  get tabRows(): SalaryAdvanceRow[] {
    if (this.currentTab === 'requests') {
      return this.requestRows;
    }

    if (this.currentTab === 'active') {
      return this.activeRows;
    }

    return this.historyRows;
  }

  get filteredSalaryAdvances(): SalaryAdvanceRow[] {
    const search = this.salaryAdvanceSearch.trim().toLowerCase();

    return this.tabRows.filter((advance) => {
      const matchesSearch = !search
        || advance.employeeName.toLowerCase().includes(search)
        || advance.reason.toLowerCase().includes(search)
        || advance.advanceId.toLowerCase().includes(search);

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

  setTab(tab: SalaryAdvanceTab): void {
    this.currentTab = tab;
    this.salaryAdvancesCurrentPage = 1;

    if (!this.usingLocalSalaryAdvanceData && this.hasPermission('salary_advance_admin_list')) {
      this.loadSalaryAdvances();
    }
  }

  getTabEmptyMessage(): string {
    if (this.currentTab === 'requests') {
      return 'No pending salary advance requests found.';
    }

    if (this.currentTab === 'active') {
      return 'No active salary advances found.';
    }

    return 'No salary advance history records found.';
  }

  applySalaryAdvanceFilters(): void {
    this.salaryAdvanceSearch = this.pendingSalaryAdvanceSearch.trim();
    this.salaryAdvanceStatusFilter = this.pendingSalaryAdvanceStatusFilter;
    this.salaryAdvancesCurrentPage = 1;

    if (!this.usingLocalSalaryAdvanceData && this.hasPermission('salary_advance_admin_list')) {
      this.loadSalaryAdvances();
    }
  }

  clearSalaryAdvanceFilters(): void {
    this.pendingSalaryAdvanceSearch = '';
    this.pendingSalaryAdvanceStatusFilter = '';
    this.salaryAdvanceSearch = '';
    this.salaryAdvanceStatusFilter = '';
    this.salaryAdvancesCurrentPage = 1;

    if (!this.usingLocalSalaryAdvanceData && this.hasPermission('salary_advance_admin_list')) {
      this.loadSalaryAdvances();
    }
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

  openAddSalaryAdvanceDialog(): void {
    if (!this.hasPermission('salary_advance_admin_view')) {
      return;
    }
    const dialogRef = this.dialog.open(AddSalaryAdvanceDialogComponent, {
      width: '620px',
      panelClass: 'salary-advance-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'create',
        canSubmit: this.hasPermission('salary_advance_admin_view'),
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
    if (!this.hasPermission('salary_advance_admin_view')) {
      return;
    }
    const dialogRef = this.dialog.open(AddSalaryAdvanceDialogComponent, {
      width: '620px',
      panelClass: 'salary-advance-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'edit',
        canSubmit: this.hasPermission('salary_advance_admin_view'),
        employees: this.employees.map((employee) => ({
          id: employee.id,
          name: employee.name,
          designation: employee.designation
        })),
        periods: this.getAvailablePeriods(),
        initialValue: {
          employeeId: row.employeeId,
          deductedPeriodId: row.deductedPeriodId,
          status: row.status,
          amount: row.amount,
          reason: row.reason,
          rejectionReason: row.rejectionReason ?? '',
          disbursementNote: row.disbursementNote ?? ''
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
    if (!this.hasPermission('salary_advance_admin_view')) {
      return;
    }
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete salary advance',
        message: `Delete salary advance ${row.advanceId} for ${row.employeeName}?`,
        confirmText: 'Delete advance'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        this.deleteSalaryAdvance(row);
      }
    });
  }

  trackById(_: number, row: { advanceId: string }): string {
    return row.advanceId;
  }

  getAdvanceStatusClass(status: SalaryAdvanceStatus): string {
    return `status-${status}`;
  }

  getAdvanceStatusLabel(status: SalaryAdvanceStatus): string {
    if (status === 'approved') return 'Approved';
    if (status === 'disbursed') return 'Disbursed';
    if (status === 'rejected') return 'Rejected';
    if (status === 'deducted') return 'Deducted';
    if (status === 'cancelled') return 'Cancelled';
    return 'Pending';
  }

  getAdvanceFlowLabel(row: SalaryAdvanceRow): string {
    const deductionPeriod = this.getDeductionPeriodLabel(row);

    if (row.status === 'pending') {
      return `Created ${this.formatDateLabel(row.createdAt)} by ${row.createdBy} (planned deduction: ${deductionPeriod})`;
    }

    if (row.status === 'approved') {
      const approver = row.approvedBy ?? this.adminActor;
      return `Approved ${this.formatDateLabel(row.approvedAt)} by ${approver} (planned deduction: ${deductionPeriod})`;
    }

    if (row.status === 'disbursed') {
      const disburser = row.disbursedBy ?? this.adminActor;
      return `Disbursed ${this.formatDateLabel(row.disbursedAt)} by ${disburser} (planned deduction: ${deductionPeriod})`;
    }

    if (row.status === 'rejected') {
      const reason = row.rejectionReason ? ` (${row.rejectionReason})` : '';
      return `Rejected ${this.formatDateLabel(row.rejectedAt)}${reason}`;
    }

    if (row.status === 'deducted') {
      const period = row.deductedPeriodName ?? 'selected period';
      return `Deducted in ${period} on ${this.formatDateLabel(row.deductedAt)}`;
    }

    return `Cancelled ${this.formatDateLabel(row.updatedAt)}`;
  }

  getDeductionPeriodLabel(row: SalaryAdvanceRow): string {
    return row.deductedPeriodName || 'Not scheduled';
  }

  approveRequest(row: SalaryAdvanceRow): void {
    if (!this.hasPermission('salary_advance_admin_approve')) {
      return;
    }
    if (row.status !== 'pending') {
      return;
    }

    if (!this.usingLocalSalaryAdvanceData) {
      this.payrollService.approveSalaryAdvance(row.advanceId)
        .pipe(take(1))
        .subscribe({
          next: () => this.loadSalaryAdvances(),
          error: (error) => {
            if (this.isUnsupportedEndpointError(error)) {
              this.updateAdvanceStatus(row, 'approved', {
                approvedBy: this.adminActor,
                approvedAt: this.getNowIsoString(),
                rejectedBy: null,
                rejectedAt: null,
                rejectionReason: null
              });
            }
          }
        });
      return;
    }

    this.updateAdvanceStatus(row, 'approved', {
      approvedBy: this.adminActor,
      approvedAt: this.getNowIsoString(),
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null
    });
  }

  rejectRequest(row: SalaryAdvanceRow): void {
    if (!this.hasPermission('salary_advance_admin_reject')) {
      return;
    }
    if (row.status !== 'pending') {
      return;
    }

    if (!this.usingLocalSalaryAdvanceData) {
      this.payrollService.rejectSalaryAdvance(row.advanceId, {
        rejectionReason: row.rejectionReason ?? 'Rejected by payroll admin'
      }).pipe(take(1)).subscribe({
        next: () => this.loadSalaryAdvances(),
        error: (error) => {
          if (this.isUnsupportedEndpointError(error)) {
            this.updateAdvanceStatus(row, 'rejected', {
              rejectedBy: this.adminActor,
              rejectedAt: this.getNowIsoString(),
              rejectionReason: row.rejectionReason ?? 'Rejected by payroll admin'
            });
          }
        }
      });
      return;
    }

    this.updateAdvanceStatus(row, 'rejected', {
      rejectedBy: this.adminActor,
      rejectedAt: this.getNowIsoString(),
      rejectionReason: row.rejectionReason ?? 'Rejected by payroll admin'
    });
  }

  disburseAdvance(row: SalaryAdvanceRow): void {
    if (!this.hasPermission('salary_advance_admin_disburse')) {
      return;
    }
    if (row.status !== 'approved') {
      return;
    }

    if (!this.usingLocalSalaryAdvanceData) {
      this.payrollService.disburseSalaryAdvance(row.advanceId, {
        disbursementNote: row.disbursementNote ?? 'Disbursed via payroll'
      }).pipe(take(1)).subscribe({
        next: () => this.loadSalaryAdvances(),
        error: (error) => {
          if (this.isUnsupportedEndpointError(error)) {
            this.updateAdvanceStatus(row, 'disbursed', {
              disbursedBy: this.adminActor,
              disbursedAt: this.getNowIsoString(),
              disbursementNote: row.disbursementNote ?? 'Disbursed via payroll'
            });
          }
        }
      });
      return;
    }

    this.updateAdvanceStatus(row, 'disbursed', {
      disbursedBy: this.adminActor,
      disbursedAt: this.getNowIsoString(),
      disbursementNote: row.disbursementNote ?? 'Disbursed via payroll'
    });
  }

  markAsDeducted(row: SalaryAdvanceRow): void {
    if (row.status !== 'disbursed') {
      return;
    }

    const defaultPeriod = this.getAvailablePeriods()[0];

    this.updateAdvanceStatus(row, 'deducted', {
      deductedPeriodId: row.deductedPeriodId ?? defaultPeriod?.id ?? null,
      deductedPeriodName: row.deductedPeriodName ?? defaultPeriod?.name ?? null,
      deductedAt: this.getNowIsoString()
    });
  }

  cancelAdvance(row: SalaryAdvanceRow): void {
    if (!this.hasPermission('salary_advance_admin_reject')) {
      return;
    }
    if (row.status !== 'pending' && row.status !== 'approved') {
      return;
    }

    this.updateAdvanceStatus(row, 'cancelled', {});
  }

  private loadEmployees(): void {
    this.employees = this.buildLocalEmployees();
  }

  private loadPayrollPeriods(): void {
    this.payrollService.getPayrollPeriods({ page: 1, pageSize: 100, isDeleted: false })
      .pipe(take(1))
      .subscribe({
        next: (result: any) => {
          const rows = this.extractItems(result);
          const mapped = rows.map((item: any) => ({
            id: String(item.periodId ?? item.id ?? '').trim(),
            name: String(item.periodName ?? item.name ?? '').trim()
          })).filter((row: PeriodOption) => !!row.id && !!row.name);

          if (mapped.length) {
            this.periods = mapped;
            return;
          }

          this.periods = [...this.localPeriodsSeed];
        },
        error: () => {
          this.periods = [...this.localPeriodsSeed];
        }
      });
  }

  private loadSalaryAdvances(): void {
    if (!this.hasPermission('salary_advance_admin_list')) {
      return;
    }

    const params: Record<string, string | number> = {
      page: 1,
      pageSize: 200
    };

    const activeStatusFilter = String(this.salaryAdvanceStatusFilter ?? '').trim();
    if (activeStatusFilter) {
      params['advanceStatus'] = activeStatusFilter;
    }

    this.payrollService.getAllSalaryAdvanceRequests(params)
      .pipe(take(1))
      .subscribe({
        next: (result: any) => {
          const mappedRows = this.extractItems(result).map((item: any, index: number) => this.mapAdminAdvance(item, index));
          const rows = this.dedupeSalaryAdvances(mappedRows);
          this.usingLocalSalaryAdvanceData = false;
          this.salaryAdvances = rows;
        },
        error: (error) => {
          if (!this.isUnsupportedEndpointError(error)) {
            console.error('Failed to load salary advances', error);
          }

          this.activateLocalSalaryAdvanceFallback();
          this.applyLocalSalaryAdvances();
        }
      });
  }

  private saveSalaryAdvance(payload: SalaryAdvanceDialogPayload, editingRow?: SalaryAdvanceRow): void {
    // Existing backend endpoints support employee self-request creation only.
    // Admin-side create/edit is maintained as local UI state until dedicated admin write APIs are available.
    this.activateLocalSalaryAdvanceFallback();
    this.saveLocalSalaryAdvance(payload, editingRow);
  }

  private deleteSalaryAdvance(row: SalaryAdvanceRow): void {
    // No admin delete endpoint exists for salary advances in current backend APIs.
    this.activateLocalSalaryAdvanceFallback();

    this.localSalaryAdvancesSeed = this.localSalaryAdvancesSeed.filter((advance) => advance.advanceId !== row.advanceId);
    this.applyLocalSalaryAdvances();
  }

  private saveLocalSalaryAdvance(payload: SalaryAdvanceDialogPayload, editingRow?: SalaryAdvanceRow): void {
    const employeeName = this.resolveEmployeeName(payload.employeeId, editingRow?.employeeName ?? 'Unknown Employee');
    const now = this.getNowIsoString();
    const normalizedStatus = this.normalizeStatus(payload.status);
    const selectedDeductionPeriodId = String(payload.deductedPeriodId ?? '').trim() || editingRow?.deductedPeriodId || null;
    const selectedDeductionPeriodName = selectedDeductionPeriodId ? this.getPeriodNameById(selectedDeductionPeriodId) : null;

    const approvedBy = normalizedStatus === 'approved' || normalizedStatus === 'disbursed' || normalizedStatus === 'deducted'
      ? (editingRow?.approvedBy ?? this.adminActor)
      : null;
    const approvedAt = normalizedStatus === 'approved' || normalizedStatus === 'disbursed' || normalizedStatus === 'deducted'
      ? (editingRow?.approvedAt ?? now)
      : null;

    const rejectedBy = normalizedStatus === 'rejected'
      ? (editingRow?.rejectedBy ?? this.adminActor)
      : null;
    const rejectedAt = normalizedStatus === 'rejected'
      ? (editingRow?.rejectedAt ?? now)
      : null;
    const rejectionReason = normalizedStatus === 'rejected'
      ? (payload.rejectionReason ?? editingRow?.rejectionReason ?? 'Rejected by payroll admin')
      : null;

    const disbursedBy = normalizedStatus === 'disbursed' || normalizedStatus === 'deducted'
      ? (editingRow?.disbursedBy ?? this.adminActor)
      : null;
    const disbursedAt = normalizedStatus === 'disbursed' || normalizedStatus === 'deducted'
      ? (editingRow?.disbursedAt ?? now)
      : null;
    const disbursementNote = normalizedStatus === 'disbursed' || normalizedStatus === 'deducted'
      ? (payload.disbursementNote ?? editingRow?.disbursementNote ?? null)
      : null;

    const deductedPeriodId = selectedDeductionPeriodId;
    const deductedPeriodName = selectedDeductionPeriodName;
    const deductedAt = normalizedStatus === 'deducted'
      ? (editingRow?.deductedAt ?? now)
      : null;

    const nextRow = this.buildSalaryAdvanceRow({
      advanceId: editingRow?.advanceId ?? `local-advance-${Date.now()}`,
      organizationId: editingRow?.organizationId ?? 'local-org-1',
      employeeId: payload.employeeId,
      employeeName,
      amount: Number(payload.amount ?? payload.totalAmount ?? 0),
      reason: payload.reason,
      status: normalizedStatus,
      createdBy: editingRow?.createdBy ?? this.adminActor,
      createdAt: editingRow?.createdAt ?? now,
      updatedAt: now,
      approvedBy,
      approvedAt,
      rejectedBy,
      rejectedAt,
      rejectionReason,
      disbursedBy,
      disbursedAt,
      disbursementNote,
      deductedPeriodId,
      deductedPeriodName,
      deductedAt
    });

    if (editingRow) {
      this.localSalaryAdvancesSeed = this.localSalaryAdvancesSeed.map((row) => {
        if (row.advanceId !== editingRow.advanceId) {
          return row;
        }

        return nextRow;
      });
    } else {
      this.localSalaryAdvancesSeed = [nextRow, ...this.localSalaryAdvancesSeed];
    }

    this.applyLocalSalaryAdvances();
  }

  private applyLocalSalaryAdvances(): void {
    this.salaryAdvances = this.dedupeSalaryAdvances([...this.localSalaryAdvancesSeed])
      .sort((left, right) => this.compareDateDesc(left.updatedAt, right.updatedAt));
  }

  private dedupeSalaryAdvances(rows: SalaryAdvanceRow[]): SalaryAdvanceRow[] {
    const uniqueRows: SalaryAdvanceRow[] = [];
    const seenIds = new Set<string>();

    for (const row of rows) {
      const key = String(row.advanceId ?? '').trim();

      // Keep records without ids (rare) so we do not accidentally hide valid rows.
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

  private buildSalaryAdvanceRow(source: {
    advanceId: string;
    organizationId: string;
    employeeId: string;
    employeeName: string;
    amount: number;
    reason: string;
    status: SalaryAdvanceStatus;
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
    deductedPeriodName: string | null;
    deductedAt: string | null;
  }): SalaryAdvanceRow {
    const amount = Math.max(0, this.toNumber(source.amount));

    return {
      advanceId: source.advanceId,
      organizationId: source.organizationId,
      employeeId: source.employeeId,
      employeeName: source.employeeName,
      amount,
      reason: source.reason || 'N/A',
      status: this.normalizeStatus(source.status),
      createdBy: source.createdBy || this.adminActor,
      createdAt: this.normalizeDate(source.createdAt),
      updatedAt: this.normalizeDate(source.updatedAt),
      approvedBy: source.approvedBy,
      approvedAt: this.normalizeDateNullable(source.approvedAt),
      rejectedBy: source.rejectedBy,
      rejectedAt: this.normalizeDateNullable(source.rejectedAt),
      rejectionReason: source.rejectionReason,
      disbursedBy: source.disbursedBy,
      disbursedAt: this.normalizeDateNullable(source.disbursedAt),
      disbursementNote: source.disbursementNote,
      deductedPeriodId: source.deductedPeriodId,
      deductedPeriodName: source.deductedPeriodName || (source.deductedPeriodId ? this.getPeriodNameById(source.deductedPeriodId) : null),
      deductedAt: this.normalizeDateNullable(source.deductedAt)
    };
  }

  private buildLocalEmployees(): EmployeeOption[] {
    const byId = new Map<string, EmployeeOption>();

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

  private buildLocalSalaryAdvances(): SalaryAdvanceRow[] {
    return [
      this.buildSalaryAdvanceRow({
        advanceId: 'local-advance-1',
        organizationId: 'local-org-1',
        employeeId: 'local-emp-6',
        employeeName: 'Aisha Noor',
        amount: 45000,
        reason: 'Medical emergency',
        status: 'approved',
        createdBy: 'Employee Self-Service',
        createdAt: '2025-09-03',
        updatedAt: '2025-09-04',
        approvedBy: this.adminActor,
        approvedAt: '2025-09-04',
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        disbursedBy: null,
        disbursedAt: null,
        disbursementNote: null,
        deductedPeriodId: 'local-period-2024-10',
        deductedPeriodName: 'Oct 2024',
        deductedAt: null
      }),
      this.buildSalaryAdvanceRow({
        advanceId: 'local-advance-2',
        organizationId: 'local-org-1',
        employeeId: 'local-emp-5',
        employeeName: 'Bilal Ahmed',
        amount: 30000,
        reason: 'Rent adjustment',
        status: 'pending',
        createdBy: 'Employee Self-Service',
        createdAt: '2025-10-02',
        updatedAt: '2025-10-02',
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        disbursedBy: null,
        disbursedAt: null,
        disbursementNote: null,
        deductedPeriodId: 'local-period-2024-11',
        deductedPeriodName: 'Nov 2024',
        deductedAt: null
      }),
      this.buildSalaryAdvanceRow({
        advanceId: 'local-advance-3',
        organizationId: 'local-org-1',
        employeeId: 'local-emp-4',
        employeeName: 'Zainab Abbas',
        amount: 25000,
        reason: 'Travel support',
        status: 'deducted',
        createdBy: 'Employee Self-Service',
        createdAt: '2025-08-01',
        updatedAt: '2025-10-31',
        approvedBy: this.adminActor,
        approvedAt: '2025-08-02',
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        disbursedBy: this.adminActor,
        disbursedAt: '2025-08-03',
        disbursementNote: 'Disbursed in payroll batch',
        deductedPeriodId: 'local-period-2024-10',
        deductedPeriodName: 'Oct 2024',
        deductedAt: '2025-10-31'
      }),
      this.buildSalaryAdvanceRow({
        advanceId: 'local-advance-4',
        organizationId: 'local-org-1',
        employeeId: 'local-emp-2',
        employeeName: 'Sarah Khan',
        amount: 35000,
        reason: 'School fee support',
        status: 'rejected',
        createdBy: 'Employee Self-Service',
        createdAt: '2025-09-18',
        updatedAt: '2025-09-19',
        approvedBy: null,
        approvedAt: null,
        rejectedBy: this.adminActor,
        rejectedAt: '2025-09-19',
        rejectionReason: 'Maximum limit reached for this month',
        disbursedBy: null,
        disbursedAt: null,
        disbursementNote: null,
        deductedPeriodId: 'local-period-2024-10',
        deductedPeriodName: 'Oct 2024',
        deductedAt: null
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

  private resolveEmployeeName(employeeId: string, fallbackName: string): string {
    if (!employeeId) {
      return fallbackName;
    }

    const employee = this.employees.find((item) => item.id === employeeId);
    return employee?.name ?? fallbackName;
  }

  private updateAdvanceStatus(
    row: SalaryAdvanceRow,
    status: SalaryAdvanceStatus,
    updates: Partial<SalaryAdvanceRow>
  ): void {
    this.activateLocalSalaryAdvanceFallback();

    const normalizedStatus = this.normalizeStatus(status);
    const updatedAt = this.getNowIsoString();

    this.localSalaryAdvancesSeed = this.localSalaryAdvancesSeed.map((item) => {
      if (item.advanceId !== row.advanceId) {
        return item;
      }

      return this.buildSalaryAdvanceRow({
        ...item,
        ...updates,
        status: normalizedStatus,
        updatedAt
      });
    });

    this.applyLocalSalaryAdvances();
  }

  private normalizeStatus(rawStatus: unknown): SalaryAdvanceStatus {
    const status = String(rawStatus ?? '').trim().toLowerCase();

    if (status === 'approved') return 'approved';
    if (status === 'disbursed') return 'disbursed';
    if (status === 'rejected') return 'rejected';
    if (status === 'deducted' || status === 'completed' || status === 'closed') return 'deducted';
    if (status === 'cancelled' || status === 'canceled') return 'cancelled';
    return 'pending';
  }

  private normalizeDate(value: unknown): string {
    const normalized = this.normalizeDateNullable(value);
    return normalized ?? this.getTodayString();
  }

  private normalizeDateNullable(value: unknown): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.slice(0, 10);
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
    const leftTime = left ? new Date(left).getTime() : 0;
    const rightTime = right ? new Date(right).getTime() : 0;
    return rightTime - leftTime;
  }

  private formatDateLabel(dateValue: string | null): string {
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

  private getNowIsoString(): string {
    return this.getTodayString();
  }

  private getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private activateLocalSalaryAdvanceFallback(): void {
    if (!this.usingLocalSalaryAdvanceData && this.salaryAdvances.length) {
      this.localSalaryAdvancesSeed = this.salaryAdvances.map((advance) => ({ ...advance }));
    }
    this.usingLocalSalaryAdvanceData = true;
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

  private toNumber(value: unknown): number {
    const converted = Number(value ?? 0);
    return Number.isFinite(converted) ? converted : 0;
  }

  private mapAdminAdvance(item: any, index: number): SalaryAdvanceRow {
    const advanceId = String(item.advanceId ?? item.id ?? `advance-${index + 1}`);
    const employeeId = String(item.employeeId ?? item.employee?.employeeId ?? item.employee?.id ?? '');
    const deductedPeriodId = String(item.deductedPeriodId ?? '').trim() || null;

    return this.buildSalaryAdvanceRow({
      advanceId,
      organizationId: String(item.organizationId ?? 'org'),
      employeeId,
      employeeName: String(item.employeeName ?? item.employee?.name ?? item.employee?.fullName ?? 'Employee'),
      amount: this.toNumber(item.amount),
      reason: String(item.reason ?? 'Salary advance request'),
      status: this.normalizeStatus(item.advanceStatus ?? item.status ?? item.requestStatus),
      createdBy: String(item.createdByName ?? item.createdBy ?? 'Employee Self-Service'),
      createdAt: this.normalizeDate(item.createdAt),
      updatedAt: this.normalizeDate(item.updatedAt ?? item.createdAt),
      approvedBy: item.approvedBy ? String(item.approvedBy) : null,
      approvedAt: this.normalizeDateNullable(item.approvedAt),
      rejectedBy: item.rejectedBy ? String(item.rejectedBy) : null,
      rejectedAt: this.normalizeDateNullable(item.rejectedAt),
      rejectionReason: item.rejectionReason ? String(item.rejectionReason) : null,
      disbursedBy: item.disbursedBy ? String(item.disbursedBy) : null,
      disbursedAt: this.normalizeDateNullable(item.disbursedAt),
      disbursementNote: item.disbursementNote ? String(item.disbursementNote) : null,
      deductedPeriodId,
      deductedPeriodName: String(
        item.deductedPeriodName
        ?? item.deductionPeriodName
        ?? item.deductedPeriod?.periodName
        ?? (deductedPeriodId ? this.getPeriodNameById(deductedPeriodId) : '')
      ).trim() || null,
      deductedAt: this.normalizeDateNullable(item.deductedAt)
    });
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

    if (Array.isArray(data?.records)) {
      return data.records;
    }

    if (Array.isArray(data?.salaryAdvances)) {
      return data.salaryAdvances;
    }

    if (Array.isArray(data?.salaryAdvanceRequests)) {
      return data.salaryAdvanceRequests;
    }

    if (Array.isArray(data?.requests)) {
      return data.requests;
    }

    if (Array.isArray(data?.result)) {
      return data.result;
    }

    if (Array.isArray(data?.data?.items)) {
      return data.data.items;
    }

    if (Array.isArray(data?.data?.records)) {
      return data.data.records;
    }

    if (Array.isArray(data?.data?.salaryAdvances)) {
      return data.data.salaryAdvances;
    }

    if (Array.isArray(data?.data?.salaryAdvanceRequests)) {
      return data.data.salaryAdvanceRequests;
    }

    return [];
  }

  private isUnsupportedEndpointError(error: any): boolean {
    const status = Number(error?.status ?? 0);
    return status === 0 || status === 404 || status === 405 || status === 501;
  }
}
