import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { PayrollService } from '../../services/payroll.service';
import { NotificationService } from '@core/services/notification.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-my-gratuity',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './my-gratuity.component.html',
  styleUrl: './my-gratuity.component.scss'
})
export class MyGratuityComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly settingsService = inject(SettingsService);

  readonly gratuityRecord = signal<any>(null);
  readonly isLoading = signal(true);
  readonly currencySymbol = signal('$');

  ngOnInit(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode) => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol(currencyCode));
        },
        error: () => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol());
        }
      });

    this.fetchMyGratuity();
  }

  fetchMyGratuity(): void {
    this.isLoading.set(true);
    (this.payrollService as any).getMyGratuityStatus().subscribe({
      next: (data: any) => {
        this.gratuityRecord.set(data || null);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error(err);
        if (err?.status !== 404) {
          this.notification.showError('Failed to load gratuity information');
        }
        this.isLoading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/payroll/my-benefits']);
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      calculated: 'Calculated',
      approved: 'Approved',
      paid: 'Paid',
      cancelled: 'Cancelled'
    };
    return map[(status || '').toLowerCase()] || status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      calculated: 'status-pending',
      approved: 'status-approved',
      paid: 'status-completed',
      cancelled: 'status-cancelled'
    };
    return map[(status || '').toLowerCase()] || '';
  }

  getPaymentMethodLabel(paymentMethod?: string | null): string {
    if (!paymentMethod) return 'Not specified';
    return paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getCalcTypeLabel(type: string): string {
    const map: Record<string, string> = {
      peryear: 'Per Year of Service',
      fixed: 'Fixed Amount',
      percentage: 'Percentage of Last Salary'
    };
    return map[(type || '').toLowerCase()] || type;
  }
}
