import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@core/services/notification.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PayrollPeriodDialogComponent } from '../payroll-period-dialog/payroll-period-dialog.component';
import { PayrollService } from '../../services/payroll.service';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { AuthService } from '@core/services/auth.service';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-payroll-period',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, FormsModule, MatIconModule, MatDialogModule],
  templateUrl: './payroll-period.component.html',
  styleUrl: './payroll-period.component.scss'
})
export class PayrollPeriodComponent implements OnInit {
  records: any[] = [];
  page = 1;
  pageSize = 10;
  totalCount = 0;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pageRange(): number[] {
    const delta = 2;
    const start = Math.max(1, this.page - delta);
    const end   = Math.min(this.totalPages, this.page + delta);
    const range: number[] = [];
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }

  get fromRecord(): number {
    return this.totalCount === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  // Summary card stats
  totalPeriods = 0;
  openCount = 0;
  processedCount = 0;
  lockedCount = 0;

  // Pending filter state (bound to UI controls)
  pendingSearch = '';
  pendingStatus = 'All';

  // Applied filter state
  filterSearch = '';
  filterStatus = 'All';

  get hasActiveFilters(): boolean {
    return !!(this.pendingSearch || this.pendingStatus !== 'All');
  }

  get hasAppliedFilters(): boolean {
    return !!(this.filterSearch || this.filterStatus !== 'All');
  }

  constructor(
    private notification: NotificationService,
    private dialog: MatDialog,
    private payrollService: PayrollService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (this.hasPermission('payroll_period_view')) {
      this.loadRecords();
    }
  }

  loadRecords() {
    if (!this.hasPermission('payroll_period_view')) return;

    const params: any = {
       page: this.page,
       pageSize: this.pageSize,
       periodName: this.filterSearch || '',
       status: this.filterStatus === 'All' ? '' : this.filterStatus
    };

    this.payrollService.getPayrollPeriods(params).subscribe({
      next: (res: any) => {
        const rawData = this.extractPeriodItems(res);
        const uniqueData = this.deduplicatePeriods(rawData);

        const serverTotal = Number(res?.totalCount ?? res?.totalRecords ?? res?.count ?? uniqueData.length);
        this.totalCount = serverTotal === rawData.length ? uniqueData.length : serverTotal;

        this.records = uniqueData.map((r: any, index: number) => {
          const status = this.normalizePeriodStatus(r.status);

          return {
            ...r,
            id: String(r.periodId ?? r.id ?? `period-${index + 1}`),
            name: String(r.periodName ?? r.name ?? 'N/A'),
            startDate: this.formatDate(r.startDate),
            endDate: this.formatDate(r.endDate),
            paymentDate: this.formatDate(r.paymentDate),
            status,
            statusClass: `type-${status.toLowerCase()}`
          };
        });

        // Summary counts (Calculated on frontend as requested)
        this.totalPeriods = this.totalCount;
        this.openCount = uniqueData.filter((r: any) => this.normalizePeriodStatus(r.status) === 'Open').length;
        this.processedCount = uniqueData.filter((r: any) => this.normalizePeriodStatus(r.status) === 'Processed').length;
        this.lockedCount = uniqueData.filter((r: any) => {
          const status = this.normalizePeriodStatus(r.status);
          return status === 'Locked' || status === 'Closed';
        }).length;
      },
      error: () => this.notification.showError('Failed to load payroll periods')
    });
  }

  private extractPeriodItems(payload: any): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.items)) {
      return payload.items;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.records)) {
      return payload.records;
    }

    return [];
  }

  private deduplicatePeriods(rows: any[]): any[] {
    if (!rows.length) {
      return rows;
    }

    const unique = new Map<string, any>();

    rows.forEach((row, index) => {
      const key = this.getPeriodIdentityKey(row, index);
      const existing = unique.get(key);

      if (!existing) {
        unique.set(key, row);
        return;
      }

      unique.set(key, this.pickRicherPeriodRow(existing, row));
    });

    return [...unique.values()];
  }

  private getPeriodIdentityKey(row: any, index: number): string {
    const periodId = String(row?.periodId ?? row?.id ?? '').trim();
    if (periodId) {
      return `period:${periodId}`;
    }

    const name = String(row?.periodName ?? row?.name ?? '').trim().toLowerCase();
    const startDate = this.normalizeDateValue(row?.startDate);
    const endDate = this.normalizeDateValue(row?.endDate);
    const paymentDate = this.normalizeDateValue(row?.paymentDate);
    const status = this.normalizePeriodStatus(row?.status).toLowerCase();

    if (name || startDate || endDate || paymentDate) {
      return `period-sig:${name}|start:${startDate}|end:${endDate}|pay:${paymentDate}|status:${status}`;
    }

    return `period-fallback:${index}`;
  }

  private pickRicherPeriodRow(primary: any, secondary: any): any {
    const primaryScore = this.scorePeriodRow(primary);
    const secondaryScore = this.scorePeriodRow(secondary);
    return secondaryScore > primaryScore ? secondary : primary;
  }

  private scorePeriodRow(row: any): number {
    let score = 0;

    if (row?.periodId || row?.id) {
      score += 2;
    }

    if (row?.startDate && row?.endDate && row?.paymentDate) {
      score += 1;
    }

    if (row?.status) {
      score += 1;
    }

    if (row?.description) {
      score += 1;
    }

    return score;
  }

  private normalizeDateValue(value: unknown): string {
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

  private normalizePeriodStatus(status: unknown): string {
    const value = String(status ?? '').trim().toLowerCase();

    if (!value) {
      return 'Open';
    }

    if (value === 'processed') {
      return 'Processed';
    }

    if (value === 'locked') {
      return 'Locked';
    }

    if (value === 'closed') {
      return 'Closed';
    }

    return 'Open';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  applyFilters() {
    this.filterSearch = this.pendingSearch;
    this.filterStatus = this.pendingStatus;
    this.page = 1;
    this.loadRecords();
  }

  clearFilters() {
    this.pendingSearch = '';
    this.pendingStatus = 'All';
    this.filterSearch = '';
    this.filterStatus = 'All';
    this.page = 1;
    this.loadRecords();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.loadRecords();
  }

  prevPage() { this.goToPage(this.page - 1); }
  nextPage() { this.goToPage(this.page + 1); }

  openDialog(mode: 'add' | 'edit', record?: any) {
    if (mode === 'add' && !this.hasPermission('payroll_period_add')) return;
    if (mode === 'edit' && !this.hasPermission('payroll_period_edit')) return;

    const dialogRef = this.dialog.open(PayrollPeriodDialogComponent, {
      width: '500px',
      data: {
        mode: mode,
        record: record ? {
          ...record,
          startDate: this.formatToDateInput(record.startDate),
          endDate: this.formatToDateInput(record.endDate),
          paymentDate: this.formatToDateInput(record.paymentDate)
        } : null
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const payload = {
          periodName: result.name,
          startDate: result.startDate,
          endDate: result.endDate,
          paymentDate: result.paymentDate,
          status: result.status,
          description: result.description
        };

        if (mode === 'add') {
          this.payrollService.createPayrollPeriod(payload).subscribe({
            next: () => {
              this.notification.showSuccess('Payroll period created successfully');
              this.loadRecords();
            },
            error: () => this.notification.showError('Failed to create payroll period')
          });
        } else {
          this.payrollService.updatePayrollPeriod(record.id, { ...payload, isActive: record.isActive ?? true }).subscribe({
            next: () => {
              this.notification.showSuccess('Payroll period updated successfully');
              this.loadRecords();
            },
            error: () => this.notification.showError('Failed to update payroll period')
          });
        }
      }
    });
  }

  private formatToDateInput(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  }

  onDelete(record: any): void {
    if (!this.hasPermission('payroll_period_delete')) return;

    const dialogData: ConfirmDeleteData = {
      title: 'Delete Payroll Period',
      message: `Are you sure you want to delete the payroll period "${record.name}"?`,
      itemName: record.name,
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === true && record.id) {
        this.payrollService.deletePayrollPeriod(record.id).subscribe({
          next: () => {
            this.notification.showSuccess('Payroll period deleted successfully');
            this.loadRecords();
          },
          error: () => this.notification.showError('Failed to delete payroll period')
        });
      }
    });
  }

  onView(record: any): void {
      this.notification.showSuccess(`Viewing details for ${record.name}`);
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Payroll', 'Payroll Period', actionKey);
  }
}
