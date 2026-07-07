import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PaymentService } from '@core/services/payment.service';
import { TransactionDto, InvoiceDto, PagedResult } from '@core/models/payment-management.models';
import { AuthService } from '@core/services/auth.service';



import { SharedCommonModule } from '@shared/shared-common.module';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
@Component({
  selector: 'app-billing-history',
  standalone: true,
  imports: [
    SharedCommonModule,
    PageHeaderComponent,
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './billing-history.component.html',
  styleUrls: ['./billing-history.component.scss']
})
export class BillingHistoryComponent implements OnInit, OnDestroy {
  // Transactions
  transactions: TransactionDto[] = [];
  transactionTotalCount: number = 0;
  transactionPage: number = 1;
  transactionPageSize: number = 10;
  isLoadingTransactions: boolean = true;

  // Invoices
  invoices: InvoiceDto[] = [];
  invoiceTotalCount: number = 0;
  invoicePage: number = 1;
  invoicePageSize: number = 10;
  isLoadingInvoices: boolean = true;

  activeTabIndex: number = 0;

  transactionColumns: string[] = ['date', 'plan', 'amount', 'gateway', 'status', 'method'];
  invoiceColumns: string[] = ['invoiceNumber', 'date', 'plan', 'amount', 'status'];

  private destroy$ = new Subject<void>();

  constructor(
    private paymentService: PaymentService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadTransactions();
    this.loadInvoices();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTransactions(): void {
    this.isLoadingTransactions = true;
    this.paymentService.getMyTransactions(this.transactionPage, this.transactionPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: PagedResult<TransactionDto>) => {
          this.transactions = result.data;
          this.transactionTotalCount = result.totalCount;
          this.isLoadingTransactions = false;
        },
        error: () => {
          this.transactions = [];
          this.isLoadingTransactions = false;
        }
      });
  }

  loadInvoices(): void {
    this.isLoadingInvoices = true;
    this.paymentService.getMyInvoices(this.invoicePage, this.invoicePageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: PagedResult<InvoiceDto>) => {
          this.invoices = result.data;
          this.invoiceTotalCount = result.totalCount;
          this.isLoadingInvoices = false;
        },
        error: () => {
          this.invoices = [];
          this.isLoadingInvoices = false;
        }
      });
  }

  onTransactionPageChange(event: PageEvent): void {
    this.transactionPage = event.pageIndex + 1;
    this.transactionPageSize = event.pageSize;
    this.loadTransactions();
  }

  onInvoicePageChange(event: PageEvent): void {
    this.invoicePage = event.pageIndex + 1;
    this.invoicePageSize = event.pageSize;
    this.loadInvoices();
  }

  onTabChange(index: number): void {
    this.activeTabIndex = index;
  }

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

  getGatewayIcon(gateway: string): string {
    switch (gateway?.toLowerCase()) {
      case 'stripe': return 'credit_card';
      case 'razorpay': return 'account_balance';
      case 'manual': return 'account_balance_wallet';
      default: return 'payment';
    }
  }
    hasPermission(actionKey: string): boolean {
        // Menu and subMenu naming: use 'Billings' for both
        return this.authService.hasMenuPermission('Billings', 'Billings', actionKey);
    }

  goBack(): void {
    this.router.navigate(['/subscription']);
  }
}
