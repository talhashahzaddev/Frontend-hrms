import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@core/services/notification.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PayrollPeriodDialogComponent } from '../payroll-period-dialog/payroll-period-dialog.component';
import { PayrollService } from '../../services/payroll.service';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-payroll-period',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule],
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
    private payrollService: PayrollService
  ) {}

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords() {
    const params: any = {
       page: this.page,
       pageSize: this.pageSize,
       periodName: this.filterSearch || '',
       status: this.filterStatus === 'All' ? '' : this.filterStatus
    };

    this.payrollService.getPayrollPeriods(params).subscribe({
      next: (res: any) => {
        this.totalCount = res.totalCount || 0;
        
        const rawData = res.data || [];
        this.records = rawData.map((r: any) => ({
          ...r,
          id: r.periodId,
          name: r.periodName,
          startDate: this.formatDate(r.startDate),
          endDate: this.formatDate(r.endDate),
          paymentDate: this.formatDate(r.paymentDate),
          statusClass: `type-${r.status.toLowerCase()}`
        }));

        // Summary counts (Calculated on frontend as requested)
        this.totalCount = res.totalCount || 0;
        this.totalPeriods = this.totalCount; 
        this.openCount = rawData.filter((r: any) => r.status === 'Open').length;
        this.processedCount = rawData.filter((r: any) => r.status === 'Processed').length;
        this.lockedCount = rawData.filter((r: any) => r.status === 'Locked' || r.status === 'Closed').length;
      },
      error: () => this.notification.showError('Failed to load payroll periods')
    });
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
}
