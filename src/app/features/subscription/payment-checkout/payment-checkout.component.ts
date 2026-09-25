import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '@core/services/payment.service';
import { NotificationService } from '@core/services/notification.service';

import { SharedCommonModule } from '@shared/shared-common.module';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

interface PaymentGateway {
  id: 'stripe' | 'razorpay' | 'manual';
  name: string;
  icon: string;
  description: string;
  enabled: boolean;
}


@Component({
  selector: 'app-payment-checkout',
  standalone: true,
  imports: [
    SharedCommonModule,
    PageHeaderComponent,
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './payment-checkout.component.html',
  styleUrls: ['./payment-checkout.component.scss']
})
export class PaymentCheckoutComponent implements OnInit, OnDestroy {
  planId: string = '';
  planName: string = '';
  billingCycle: string = '';
  amount: number = 0;
  selectedGateway: 'stripe' | 'razorpay' | 'manual' = 'stripe';
  isProcessing: boolean = false;
  private destroy$ = new Subject<void>();

  gateways: PaymentGateway[] = [
    {
      id: 'stripe',
      name: 'Stripe',
      icon: 'credit_card',
      description: 'Pay securely with credit/debit card via Stripe',
      enabled: true
    },
    {
      id: 'razorpay',
      name: 'Razorpay',
      icon: 'account_balance',
      description: 'Pay via UPI, cards, netbanking with Razorpay',
      enabled: true
    },
    {
      id: 'manual',
      name: 'Bank Transfer',
      icon: 'account_balance_wallet',
      description: 'Pay via direct bank transfer (manual verification)',
      enabled: true
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.planId = params['planId'] || '';
        this.planName = params['planName'] || '';
        this.billingCycle = params['billingCycle'] || 'monthly';
        this.amount = parseFloat(params['amount']) || 0;

        if (!this.planId) {
          this.router.navigate(['/subscription']);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get formattedAmount(): string {
    return `$${this.amount.toFixed(2)}`;
  }

  get billingLabel(): string {
    return this.billingCycle === 'annual' ? 'per year' : 'per month';
  }

  goBack(): void {
    this.router.navigate(['/subscription']);
  }

  processPayment(): void {
    if (this.isProcessing || !this.planId) return;

    this.isProcessing = true;

    this.paymentService.createCheckoutSession({
      planId: this.planId,
      billingCycle: this.billingCycle as 'monthly' | 'annual',
      gateway: this.selectedGateway
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (session) => {
          // For Stripe/Razorpay, redirect to gateway checkout URL
          // For now (simulated), we auto-verify and go to confirmation
          this.verifyAndConfirm(session.transactionId, session.sessionId, this.selectedGateway);
        },
        error: (err) => {
          this.isProcessing = false;
          this.notificationService.error(err.message || 'Failed to initiate payment');
        }
      });
  }

  private verifyAndConfirm(transactionId: string, sessionId: string, _gateway: string): void {
    this.paymentService.verifyPayment({
      transactionId,
      sessionId
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (confirmation) => {
          this.isProcessing = false;
          this.router.navigate(['/subscription/confirmation'], {
            queryParams: {
              transactionId: confirmation.transactionId,
              status: confirmation.status,
              planName: confirmation.planName,
              amount: confirmation.amountPaid,
              currency: confirmation.currency,
              billingCycle: confirmation.billingCycle,
              invoiceNumber: confirmation.invoiceNumber || ''
            }
          });
        },
        error: (err) => {
          this.isProcessing = false;
          this.router.navigate(['/subscription/confirmation'], {
            queryParams: {
              transactionId,
              status: 'failed',
              planName: this.planName,
              amount: this.amount,
              error: err.message || 'Payment verification failed'
            }
          });
        }
      });
  }
}
