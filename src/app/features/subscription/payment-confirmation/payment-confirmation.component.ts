import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-payment-confirmation',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './payment-confirmation.component.html',
  styleUrls: ['./payment-confirmation.component.scss']
})
export class PaymentConfirmationComponent implements OnInit, OnDestroy {
  transactionId: string = '';
  status: string = '';
  planName: string = '';
  amount: number = 0;
  currency: string = 'USD';
  billingCycle: string = '';
  invoiceNumber: string = '';
  errorMessage: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.transactionId = params['transactionId'] || '';
        this.status = params['status'] || 'unknown';
        this.planName = params['planName'] || '';
        this.amount = parseFloat(params['amount']) || 0;
        this.currency = params['currency'] || 'USD';
        this.billingCycle = params['billingCycle'] || '';
        this.invoiceNumber = params['invoiceNumber'] || '';
        this.errorMessage = params['error'] || '';
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isSuccess(): boolean {
    return this.status === 'completed';
  }

  get formattedAmount(): string {
    return `$${this.amount.toFixed(2)}`;
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToSubscription(): void {
    this.router.navigate(['/subscription']);
  }

  goToBillingHistory(): void {
    this.router.navigate(['/subscription/billing']);
  }

  retryPayment(): void {
    this.router.navigate(['/subscription']);
  }
}
