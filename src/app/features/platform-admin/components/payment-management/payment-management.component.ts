import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';

import { SuperAdminService } from '../../services/super-admin.service';
import {
  TransactionDto,
  TransactionDetailDto,
  TransactionFilterRequest,
  InvoiceDto,
  InvoiceFilterRequest,
  PaymentDashboardDto,
  RevenueAnalyticsDto
} from '@core/models/payment-management.models';
import { TransactionDetailDialogComponent } from '../transaction-detail-dialog/transaction-detail-dialog.component';
import { RefundDialogComponent } from '../refund-dialog/refund-dialog.component';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-payment-management',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule
  ],
  templateUrl: './payment-management.component.html',
  styleUrls: ['./payment-management.component.scss']
})
export class PaymentManagementComponent implements OnInit, OnDestroy {
  // Dashboard
  dashboard: PaymentDashboardDto | null = null;
  isLoadingDashboard = true;

  // Transactions
  transactions: TransactionDto[] = [];
  transactionTotalCount = 0;
  transactionFilter: TransactionFilterRequest = { page: 1, pageSize: 10 };
  isLoadingTransactions = true;
  transactionColumns = ['date', 'company', 'plan', 'amount', 'gateway', 'status', 'actions'];

  // Invoices
  invoices: InvoiceDto[] = [];
  invoiceTotalCount = 0;
  invoiceFilter: InvoiceFilterRequest = { page: 1, pageSize: 10 };
  isLoadingInvoices = true;
  invoiceColumns = ['invoiceNumber', 'date', 'company', 'plan', 'amount', 'status'];

  // Revenue Analytics
  analytics: RevenueAnalyticsDto | null = null;
  isLoadingAnalytics = true;
  analyticsMonths = 12;

  activeTabIndex = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: SuperAdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.loadTransactions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabChange(index: number): void {
    this.activeTabIndex = index;
    if (index === 0 && !this.dashboard) this.loadDashboard();
    if (index === 1 && this.transactions.length === 0) this.loadTransactions();
    if (index === 2 && this.invoices.length === 0) this.loadInvoices();
    if (index === 3 && !this.analytics) this.loadAnalytics();
  }

  // ========== Dashboard ==========
  loadDashboard(): void {
    this.isLoadingDashboard = true;
    this.adminService.getPaymentDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.dashboard = res.data;
          }
          this.isLoadingDashboard = false;
        },
        error: () => {
          this.isLoadingDashboard = false;
        }
      });
  }

  // ========== Transactions ==========
  loadTransactions(): void {
    this.isLoadingTransactions = true;
    this.adminService.getTransactions(this.transactionFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.transactions = res.data.data;
            this.transactionTotalCount = res.data.totalCount;
          }
          this.isLoadingTransactions = false;
        },
        error: () => {
          this.transactions = [];
          this.isLoadingTransactions = false;
        }
      });
  }

  onTransactionSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.transactionFilter.search = value || undefined;
    this.transactionFilter.page = 1;
    this.loadTransactions();
  }

  onTransactionStatusFilter(status: string): void {
    this.transactionFilter.status = status || undefined;
    this.transactionFilter.page = 1;
    this.loadTransactions();
  }

  onTransactionGatewayFilter(gateway: string): void {
    this.transactionFilter.gateway = gateway || undefined;
    this.transactionFilter.page = 1;
    this.loadTransactions();
  }

  onTransactionPageChange(event: PageEvent): void {
    this.transactionFilter.page = event.pageIndex + 1;
    this.transactionFilter.pageSize = event.pageSize;
    this.loadTransactions();
  }

  viewTransactionDetail(txn: TransactionDto): void {
    this.adminService.getTransactionDetail(txn.transactionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.dialog.open(TransactionDetailDialogComponent, {
              width: '600px',
              data: res.data
            });
          }
        }
      });
  }

  initiateRefund(txn: TransactionDto): void {
    const dialogRef = this.dialog.open(RefundDialogComponent, {
      width: '450px',
      data: { transactionId: txn.transactionId, amount: txn.amount, companyName: txn.companyName }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result === 'success') {
          this.loadTransactions();
          this.loadDashboard();
        }
      });
  }

  // ========== Invoices ==========
  loadInvoices(): void {
    this.isLoadingInvoices = true;
    this.adminService.getInvoices(this.invoiceFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.invoices = res.data.data;
            this.invoiceTotalCount = res.data.totalCount;
          }
          this.isLoadingInvoices = false;
        },
        error: () => {
          this.invoices = [];
          this.isLoadingInvoices = false;
        }
      });
  }

  onInvoiceSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.invoiceFilter.search = value || undefined;
    this.invoiceFilter.page = 1;
    this.loadInvoices();
  }

  onInvoiceStatusFilter(status: string): void {
    this.invoiceFilter.status = status || undefined;
    this.invoiceFilter.page = 1;
    this.loadInvoices();
  }

  onInvoicePageChange(event: PageEvent): void {
    this.invoiceFilter.page = event.pageIndex + 1;
    this.invoiceFilter.pageSize = event.pageSize;
    this.loadInvoices();
  }

  // ========== Revenue Analytics ==========
  loadAnalytics(): void {
    this.isLoadingAnalytics = true;
    this.adminService.getRevenueAnalytics(this.analyticsMonths)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.analytics = res.data;
          }
          this.isLoadingAnalytics = false;
        },
        error: () => {
          this.isLoadingAnalytics = false;
        }
      });
  }

  onAnalyticsMonthsChange(months: number): void {
    this.analyticsMonths = months;
    this.loadAnalytics();
  }

  // ========== Helpers ==========
  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed': case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'failed': case 'cancelled': return 'error';
      case 'refunded': return 'info';
      default: return 'default';
    }
  }

  getStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed': case 'paid': return 'check_circle';
      case 'pending': return 'schedule';
      case 'failed': return 'cancel';
      case 'refunded': return 'replay';
      case 'cancelled': return 'block';
      default: return 'help';
    }
  }

  formatCurrency(amount: number): string {
    return `$${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getMaxRevenueBarWidth(amount: number): string {
    if (!this.analytics || !this.analytics.monthlyRevenue?.length) return '0%';
    const max = Math.max(...this.analytics.monthlyRevenue.map(m => m.revenue));
    if (max === 0) return '0%';
    return `${(amount / max) * 100}%`;
  }
}
