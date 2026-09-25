import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';

import { EmployeeService } from '../../../employee/services/employee.service';
import { PayrollService } from '../../services/payroll.service';
import { SettingsService } from '../../../settings/services/settings.service';
import {
  AddGratuityRecordDialogComponent,
  GratuityConfigOption,
  GratuityEmployeeOption,
  GratuityPeriodOption,
  GratuityRecordDialogPayload
} from '../dialogs/add-gratuity-record-dialog/add-gratuity-record-dialog.component';
import { DeleteActionDialogComponent } from '../dialogs/delete-action-dialog/delete-action-dialog.component';

import { SharedCommonModule } from '@shared/shared-common.module';
type GratuityTab = 'active' | 'history';

interface GratuityConfigRow {
  id: string;
  configRuleName: string;
  description: string;
  yearsRequired: number;
  calculationType: GratuityConfigOption['calculationType'];
  calculationValue: number;
  isActive: boolean;
  createdAt: string;
}

interface GratuityRecordRow {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  periodId: string | null;
  configId: string | null;
  configRuleName: string | null;
  yearsWorked: number;
  lastSalary: number;
  totalAmount: number;
  paymentMethod: string | null;
  paymentStatus: 'calculated' | 'approved' | 'paid' | 'cancelled';
  approvedBy: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}


@Component({
  selector: 'app-gratuity',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, FormsModule, MatIconModule],
  templateUrl: './gratuity.component.html',
  styleUrl: './gratuity.component.scss'
})
export class GratuityComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly employeeService = inject(EmployeeService);
  private readonly settingsService = inject(SettingsService);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  get canAccessGratuityAdmin(): boolean {
    return this.hasPermission('gratuity_admin_view');
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasPermissionByActionKey(actionKey);
  }

  currentTab: GratuityTab = 'active';

  // ── Records state ──────────────────────────────────────────────────────────
  records: GratuityRecordRow[] = [];
  activeSearch = '';
  pendingActiveSearch = '';
  historySearch = '';
  pendingHistorySearch = '';
  activeCurrentPage = 1;
  historyCurrentPage = 1;
  readonly pageSize = 10;

  // ── Config / Rules state (for dialog dropdown) ────────────────────────────
  configs: GratuityConfigRow[] = [];
  periods: GratuityPeriodOption[] = [];

  // ── Employees for record dialog ────────────────────────────────────────────
  private employees: GratuityEmployeeOption[] = [];

  ngOnInit(): void {
    this.loadCurrencySymbol();
    if (!this.canAccessGratuityAdmin) {
      return;
    }
    this.loadEmployees();
    this.loadRecords();
    this.loadConfigs();
    this.loadPayrollPeriods();
  }

  // ── Tab ────────────────────────────────────────────────────────────────────

  setTab(tab: GratuityTab): void {
    this.currentTab = tab;
  }

  // ── Summary stats ──────────────────────────────────────────────────────────

  get activeCount(): number {
    return this.records.filter(r => r.paymentStatus === 'calculated' || r.paymentStatus === 'approved').length;
  }

  get pendingApprovalCount(): number {
    return this.records.filter(r => r.paymentStatus === 'calculated').length;
  }

  get totalLiability(): number {
    return this.records
      .filter(r => r.paymentStatus === 'calculated' || r.paymentStatus === 'approved')
      .reduce((sum, r) => sum + r.totalAmount, 0);
  }

  get totalPaidAmount(): number {
    return this.records
      .filter(r => r.paymentStatus === 'paid')
      .reduce((sum, r) => sum + r.totalAmount, 0);
  }

  // ── Active tab (calculated + approved) ────────────────────────────────────

  get filteredActiveRecords(): GratuityRecordRow[] {
    const search = this.activeSearch.trim().toLowerCase();
    return this.records.filter(r => {
      const isActive = r.paymentStatus === 'calculated' || r.paymentStatus === 'approved';
      const matchSearch = !search || r.employeeName.toLowerCase().includes(search);
      return isActive && matchSearch;
    });
  }

  get activeTotalRecords(): number { return this.filteredActiveRecords.length; }
  get activeTotalPages(): number { return Math.max(1, Math.ceil(this.activeTotalRecords / this.pageSize)); }
  get activePage(): number { return Math.min(this.activeCurrentPage, this.activeTotalPages); }
  get activePageRange(): number[] { return this.buildPageRange(this.activePage, this.activeTotalPages); }
  get activeFrom(): number { return this.activeTotalRecords === 0 ? 0 : (this.activePage - 1) * this.pageSize + 1; }
  get activeTo(): number { return Math.min(this.activePage * this.pageSize, this.activeTotalRecords); }
  get activeView(): GratuityRecordRow[] { return this.paginate(this.filteredActiveRecords, this.activePage, this.pageSize); }

  get hasActiveSearch(): boolean { return !!(this.pendingActiveSearch); }
  get hasAppliedActiveSearch(): boolean { return !!(this.activeSearch); }

  applyActiveSearch(): void {
    this.activeSearch = this.pendingActiveSearch.trim();
    this.activeCurrentPage = 1;
  }

  clearActiveSearch(): void {
    this.pendingActiveSearch = '';
    this.activeSearch = '';
    this.activeCurrentPage = 1;
  }

  goToActivePage(page: number): void {
    if (page < 1 || page > this.activeTotalPages || page === this.activePage) return;
    this.activeCurrentPage = page;
  }

  prevActivePage(): void { this.goToActivePage(this.activePage - 1); }
  nextActivePage(): void { this.goToActivePage(this.activePage + 1); }

  // ── History tab (paid + cancelled) ────────────────────────────────────────

  get filteredHistoryRecords(): GratuityRecordRow[] {
    const search = this.historySearch.trim().toLowerCase();
    return this.records.filter(r => {
      const isDone = r.paymentStatus === 'paid' || r.paymentStatus === 'cancelled';
      const matchSearch = !search || r.employeeName.toLowerCase().includes(search);
      return isDone && matchSearch;
    });
  }

  get historyTotalRecords(): number { return this.filteredHistoryRecords.length; }
  get historyTotalPages(): number { return Math.max(1, Math.ceil(this.historyTotalRecords / this.pageSize)); }
  get historyPage(): number { return Math.min(this.historyCurrentPage, this.historyTotalPages); }
  get historyPageRange(): number[] { return this.buildPageRange(this.historyPage, this.historyTotalPages); }
  get historyFrom(): number { return this.historyTotalRecords === 0 ? 0 : (this.historyPage - 1) * this.pageSize + 1; }
  get historyTo(): number { return Math.min(this.historyPage * this.pageSize, this.historyTotalRecords); }
  get historyView(): GratuityRecordRow[] { return this.paginate(this.filteredHistoryRecords, this.historyPage, this.pageSize); }

  get hasHistorySearch(): boolean { return !!(this.pendingHistorySearch); }
  get hasAppliedHistorySearch(): boolean { return !!(this.historySearch); }

  applyHistorySearch(): void {
    this.historySearch = this.pendingHistorySearch.trim();
    this.historyCurrentPage = 1;
  }

  clearHistorySearch(): void {
    this.pendingHistorySearch = '';
    this.historySearch = '';
    this.historyCurrentPage = 1;
  }

  goToHistoryPage(page: number): void {
    if (page < 1 || page > this.historyTotalPages || page === this.historyPage) return;
    this.historyCurrentPage = page;
  }

  prevHistoryPage(): void { this.goToHistoryPage(this.historyPage - 1); }
  nextHistoryPage(): void { this.goToHistoryPage(this.historyPage + 1); }

  // ── Status helpers ─────────────────────────────────────────────────────────

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      calculated: 'Calculated',
      approved: 'Approved',
      paid: 'Paid',
      cancelled: 'Cancelled'
    };
    return map[status] ?? status;
  }

  getLifecycleLabel(row: GratuityRecordRow): string {
    const fmt = (d: string | null) =>
      d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    if (row.paymentStatus === 'calculated') return `Calculated on ${fmt(row.createdAt)} — pending HR approval`;
    if (row.paymentStatus === 'approved') return `Approved on ${fmt(row.approvedAt)} — pending payment disbursement`;
    if (row.paymentStatus === 'paid') return `Paid on ${fmt(row.paidAt)}`;
    return `Cancelled on ${fmt(row.updatedAt)}`;
  }

  trackById(_: number, row: { id: string }): string {
    return row.id;
  }

  // ── Dialogs – Records ──────────────────────────────────────────────────────

  openAddRecordDialog(): void {
    if (!this.hasPermission('gratuity_admin_add')) {
      return;
    }
    const dialogRef = this.dialog.open(AddGratuityRecordDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'gratuity-record-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: { mode: 'create', employees: this.employees, configs: this.activeConfigOptions(), periods: this.periods }
    });

    dialogRef.afterClosed().subscribe((result: GratuityRecordDialogPayload | undefined) => {
      if (!result) return;
      this.saveRecord(result);
    });
  }

  openEditRecordDialog(row: GratuityRecordRow): void {
    if (!this.hasPermission('gratuity_admin_edit')) {
      return;
    }
    const dialogRef = this.dialog.open(AddGratuityRecordDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'gratuity-record-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'edit',
        employees: this.employees,
        configs: this.allConfigOptions(),
        periods: this.periods,
        initialValue: {
          configId: row.configId ?? '',
          employeeId: row.employeeId,
          periodId: row.periodId,
          paymentMethod: row.paymentMethod ?? 'payroll_credit',
          yearsWorked: row.yearsWorked,
          lastSalary: row.lastSalary,
          gratuityAmount: row.totalAmount,
          status: row.paymentStatus as any,
          paidDate: row.paidAt ? row.paidAt.substring(0, 10) : null
        }
      }
    });

    dialogRef.afterClosed().subscribe((result: GratuityRecordDialogPayload | undefined) => {
      if (!result) return;
      this.updateRecord(row.id, result);
    });
  }

  requestDeleteRecord(row: GratuityRecordRow): void {
    if (!this.hasPermission('gratuity_admin_delete')) {
      return;
    }
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete gratuity record',
        message: `Delete gratuity record for ${row.employeeName}?`,
        confirmText: 'Delete record'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) this.deleteRecord(row.id);
    });
  }

  approveRecord(row: GratuityRecordRow): void {
    if (!this.hasPermission('gratuity_admin_edit')) {
      return;
    }
    if (row.paymentStatus !== 'calculated') return;
    this.payrollService.approveGratuityTransaction(row.id, {})
      .pipe(take(1))
      .subscribe({
        next: () => this.loadRecords(),
        error: err => {
          console.error('Approve failed', err);
          this.notification.showError(this.resolveErrorMessage(err, 'Failed to approve gratuity record'));
        }
      });
  }

  markPaid(row: GratuityRecordRow): void {
    if (!this.hasPermission('gratuity_admin_edit')) {
      return;
    }
    if (row.paymentStatus !== 'approved') return;
    this.payrollService.markGratuityPaid(row.id, {
      periodId: row.periodId,
      paymentMethod: row.paymentMethod ?? 'payroll_credit'
    })
      .pipe(take(1))
      .subscribe({
        next: () => this.loadRecords(),
        error: err => {
          console.error('Mark paid failed', err);
          this.notification.showError(this.resolveErrorMessage(err, 'Failed to mark gratuity as paid'));
        }
      });
  }

  // ── Private data loaders ───────────────────────────────────────────────────

  private loadCurrencySymbol(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (code: any) => this.currencySymbol.set(this.settingsService.getCurrencySymbol(code)),
        error: () => {}
      });
  }

  private loadEmployees(): void {
    this.employeeService.getEmployees({ page: 1, pageSize: 500 })
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          this.employees = result.employees.map(e => ({
            id: String(e.employeeId),
            name: `${e.firstName} ${e.lastName}`.trim(),
            designation: (e as any).designation ?? (e as any).jobTitle ?? ''
          })).filter(e => !!e.id && !!e.name);
        },
        error: () => {}
      });
  }

  private loadRecords(): void {
    this.payrollService.getGratuityTransactions({ page: 1, pageSize: 500 })
      .pipe(take(1))
      .subscribe({
        next: (result: any) => {
          const items: any[] = Array.isArray(result?.items) ? result.items
            : Array.isArray(result?.data) ? result.data
            : Array.isArray(result) ? result : [];
          this.records = items.map(item => this.mapRecord(item));
        },
        error: err => console.error('Failed to load gratuity records', err)
      });
  }

  private loadConfigs(): void {
    this.payrollService.getGratuityConfigs()
      .pipe(take(1))
      .subscribe({
        next: (result: any) => {
          const items: any[] = Array.isArray(result?.items) ? result.items
            : Array.isArray(result?.data) ? result.data
            : Array.isArray(result) ? result : [];
          this.configs = items.map(item => this.mapConfig(item));
        },
        error: err => console.error('Failed to load gratuity configs', err)
      });
  }

  private loadPayrollPeriods(): void {
    this.payrollService.getPayrollPeriods({ page: 1, pageSize: 500 })
      .pipe(take(1))
      .subscribe({
        next: (result: any) => {
          const items: any[] = Array.isArray(result?.data) ? result.data
            : Array.isArray(result?.items) ? result.items
            : Array.isArray(result) ? result : [];
          this.periods = items.map((item: any) => ({
            id: String(item.periodId ?? item.id ?? ''),
            name: String(item.periodName ?? item.name ?? '')
          })).filter((p: GratuityPeriodOption) => !!p.id && !!p.name);
        },
        error: () => { this.periods = []; }
      });
  }

  private activeConfigOptions(): GratuityConfigOption[] {
    return this.configs
      .filter(c => c.isActive)
      .map(c => this.toConfigOption(c));
  }

  private allConfigOptions(): GratuityConfigOption[] {
    return this.configs.map(c => this.toConfigOption(c));
  }

  private toConfigOption(c: GratuityConfigRow): GratuityConfigOption {
    return {
      id: c.id,
      configRuleName: c.configRuleName,
      calculationType: c.calculationType,
      calculationValue: c.calculationValue,
      yearsRequired: c.yearsRequired
    };
  }

  private normalizeCalculationType(value: any): GratuityConfigOption['calculationType'] {
    const normalized = String(value ?? 'peryear').trim().toLowerCase().replace(/[_\s-]/g, '');
    if (normalized === 'percentage') return 'percentage';
    if (normalized === 'peryear') return 'peryear';
    return 'fixed';
  }

  private saveRecord(payload: GratuityRecordDialogPayload): void {
    const body = {
      configId: payload.configId,
      employeeId: payload.employeeId,
      periodId: payload.periodId,
      paymentMethod: payload.paymentMethod,
      yearsWorked: payload.yearsWorked,
      lastSalary: payload.lastSalary,
      totalAmount: payload.gratuityAmount,
      notes: null
    };
    this.payrollService.createGratuityTransaction(body)
      .pipe(take(1))
      .subscribe({
        next: () => this.loadRecords(),
        error: err => {
          console.error('Create record failed', err);
          this.notification.showError(this.resolveErrorMessage(err, 'Failed to create gratuity record'));
        }
      });
  }

  private updateRecord(id: string, payload: GratuityRecordDialogPayload): void {
    const body = {
      configId: payload.configId,
      periodId: payload.periodId,
      paymentMethod: payload.paymentMethod,
      yearsWorked: payload.yearsWorked,
      lastSalary: payload.lastSalary,
      totalAmount: payload.gratuityAmount,
      paymentStatus: payload.status,
      notes: null
    };
    this.payrollService.updateGratuityTransaction(id, body)
      .pipe(take(1))
      .subscribe({
        next: () => this.loadRecords(),
        error: err => {
          console.error('Update record failed', err);
          this.notification.showError(this.resolveErrorMessage(err, 'Failed to update gratuity record'));
        }
      });
  }

  private deleteRecord(id: string): void {
    this.payrollService.deleteGratuityTransaction(id)
      .pipe(take(1))
      .subscribe({
        next: () => this.loadRecords(),
        error: err => {
          console.error('Delete record failed', err);
          this.notification.showError(this.resolveErrorMessage(err, 'Failed to delete gratuity record'));
        }
      });
  }

  private resolveErrorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.message || fallback;
  }

  // ── Mappers ────────────────────────────────────────────────────────────────

  private mapRecord(item: any): GratuityRecordRow {
    return {
      id: String(item.id ?? ''),
      employeeId: String(item.employeeId ?? ''),
      employeeName: String(item.employeeName ?? ''),
      department: String(item.department ?? ''),
      periodId: item.periodId ? String(item.periodId) : null,
      configId: item.configId ? String(item.configId) : null,
      configRuleName: item.configRuleName ? String(item.configRuleName) : null,
      yearsWorked: Number(item.yearsWorked ?? 0),
      lastSalary: Number(item.lastSalary ?? 0),
      totalAmount: Number(item.totalAmount ?? 0),
      paymentMethod: item.paymentMethod ? String(item.paymentMethod) : null,
      paymentStatus: (item.paymentStatus ?? 'calculated') as GratuityRecordRow['paymentStatus'],
      approvedBy: item.approvedBy ? String(item.approvedBy) : null,
      approvedAt: item.approvedAt ? String(item.approvedAt) : null,
      paidAt: item.paidAt ? String(item.paidAt) : null,
      notes: item.notes ? String(item.notes) : null,
      createdAt: String(item.createdAt ?? ''),
      updatedAt: String(item.updatedAt ?? '')
    };
  }

  private mapConfig(item: any): GratuityConfigRow {
    return {
      id: String(item.id ?? ''),
      configRuleName: String(item.configRuleName ?? ''),
      description: String(item.description ?? ''),
      yearsRequired: Number(item.yearsRequired ?? 5),
      calculationType: this.normalizeCalculationType(item.calculationType),
      calculationValue: Number(item.calculationValue ?? 0),
      isActive: Boolean(item.isActive ?? true),
      createdAt: String(item.createdAt ?? '')
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private paginate<T>(data: T[], page: number, pageSize: number): T[] {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }

  private buildPageRange(current: number, total: number): number[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, -1, total];
    if (current >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
    return [1, -1, current - 1, current, current + 1, -1, total];
  }
}
