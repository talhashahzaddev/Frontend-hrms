import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { TransactionDetailDto } from '@core/models/payment-management.models';

@Component({
  selector: 'app-transaction-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>receipt_long</mat-icon>
      Transaction Details
    </h2>

    <mat-dialog-content>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="label">Transaction ID</span>
          <span class="value mono">{{ data.transactionId | slice:0:24 }}...</span>
        </div>
        <div class="detail-item">
          <span class="label">Company</span>
          <span class="value bold">{{ data.companyName }}</span>
        </div>
        <div class="detail-item">
          <span class="label">Plan</span>
          <span class="value">{{ data.planName }}</span>
        </div>
        <div class="detail-item">
          <span class="label">Amount</span>
          <span class="value bold">\${{ data.amount | number:'1.2-2' }} {{ data.currency }}</span>
        </div>
        <div class="detail-item">
          <span class="label">Billing Cycle</span>
          <span class="value">{{ data.billingCycle | titlecase }}</span>
        </div>
        <div class="detail-item">
          <span class="label">Gateway</span>
          <span class="value">{{ data.gateway | titlecase }}</span>
        </div>
        <div class="detail-item">
          <span class="label">Status</span>
          <span class="value status" [attr.data-status]="getStatusColor(data.status)">
            {{ data.status | titlecase }}
          </span>
        </div>
        @if (data.paymentMethod) {
          <div class="detail-item">
            <span class="label">Payment Method</span>
            <span class="value">{{ data.paymentMethod | titlecase }}</span>
          </div>
        }
        @if (data.cardLast4) {
          <div class="detail-item">
            <span class="label">Card</span>
            <span class="value mono">{{ data.cardBrand | titlecase }} •••• {{ data.cardLast4 }}</span>
          </div>
        }
        @if (data.gatewayTransactionId) {
          <div class="detail-item">
            <span class="label">Gateway Txn ID</span>
            <span class="value mono small">{{ data.gatewayTransactionId }}</span>
          </div>
        }
        <div class="detail-item">
          <span class="label">Date</span>
          <span class="value">{{ data.createdAt | date:'medium' }}</span>
        </div>
        @if (data.failureReason) {
          <div class="detail-item full-width">
            <span class="label">Failure Reason</span>
            <span class="value error">{{ data.failureReason }}</span>
          </div>
        }
      </div>

      <!-- Invoice -->
      @if (data.invoice) {
        <mat-divider></mat-divider>
        <h3 class="section-title">
          <mat-icon>description</mat-icon>
          Invoice
        </h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">Invoice #</span>
            <span class="value mono highlight">{{ data.invoice.invoiceNumber }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Total</span>
            <span class="value bold">\${{ data.invoice.totalAmount | number:'1.2-2' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Status</span>
            <span class="value">{{ data.invoice.status | titlecase }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Issued</span>
            <span class="value">{{ data.invoice.issuedAt | date:'mediumDate' }}</span>
          </div>
        </div>
      }

      <!-- Refunds -->
      @if (data.refunds.length) {
        <mat-divider></mat-divider>
        <h3 class="section-title">
          <mat-icon>replay</mat-icon>
          Refunds ({{ data.refunds.length }})
        </h3>
        @for (refund of data.refunds; track refund.refundId) {
          <div class="refund-item">
            <div class="refund-row">
              <span class="label">Amount</span>
              <span class="value bold">\${{ refund.amount | number:'1.2-2' }}</span>
            </div>
            <div class="refund-row">
              <span class="label">Reason</span>
              <span class="value">{{ refund.reason }}</span>
            </div>
            <div class="refund-row">
              <span class="label">Status</span>
              <span class="value">{{ refund.status | titlecase }}</span>
            </div>
            <div class="refund-row">
              <span class="label">Date</span>
              <span class="value">{{ refund.createdAt | date:'medium' }}</span>
            </div>
          </div>
        }
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;

      mat-icon {
        color: #3b82f6;
      }
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 16px 0;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 2px;

      &.full-width {
        grid-column: 1 / -1;
      }

      .label {
        font-size: 0.75rem;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .value {
        font-size: 0.9rem;
        color: #1e293b;

        &.bold { font-weight: 700; }
        &.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.82rem; }
        &.small { font-size: 0.75rem; }
        &.highlight { color: #6366f1; font-weight: 600; }
        &.error { color: #dc2626; }

        &.status {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 0.78rem;
          font-weight: 600;
          width: fit-content;
        }

        &[data-status="success"] { background: #dcfce7; color: #16a34a; }
        &[data-status="warning"] { background: #fef3c7; color: #d97706; }
        &[data-status="error"] { background: #fee2e2; color: #dc2626; }
        &[data-status="info"] { background: #e0e7ff; color: #4f46e5; }
      }
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.95rem;
      font-weight: 600;
      margin: 16px 0 8px;
      color: #475569;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .refund-item {
      background: #f8fafc;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;

      .refund-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;

        .label { font-size: 0.8rem; color: #64748b; }
        .value { font-size: 0.85rem; color: #1e293b; &.bold { font-weight: 600; } }
      }
    }

    mat-divider {
      margin: 16px 0;
    }
  `]
})
export class TransactionDetailDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<TransactionDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TransactionDetailDto
  ) {}

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed': case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'failed': case 'cancelled': return 'error';
      case 'refunded': return 'info';
      default: return 'default';
    }
  }
}
