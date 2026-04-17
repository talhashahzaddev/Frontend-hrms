import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { PayrollService } from '../../services/payroll.service';
import { NotificationService } from '@core/services/notification.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-my-benefits',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './my-benefits.component.html',
  styleUrl: './my-benefits.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyBenefitsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly settingsService = inject(SettingsService);

  readonly activeModules = signal<string[]>([]);
  readonly activeModulesSet = computed(() => new Set(this.activeModules()));
  readonly isLoading = signal(true);
  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  ngOnInit(): void {
    this.fetchOverview();
    this.fetchCurrency();
  }

  fetchCurrency(): void {
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
  }

  fetchOverview(): void {
    this.isLoading.set(true);
    this.payrollService.getPayrollOverview().subscribe({
      next: (response: any) => {
        this.activeModules.set(response?.activeModules || []);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error(err);
        this.notification.showError('Failed to load benefits overview');
        this.isLoading.set(false);
      }
    });
  }

  isModuleActive(moduleName: string): boolean {
    return this.activeModulesSet().has(moduleName);
  }

  openBenefit(module: string): void {
    if (module === 'Loan') {
      this.router.navigate(['/payroll/loans/requests'], { queryParams: { module: 'loans' } });
      return;
    }

    if (module === 'Advance Salary') {
      this.router.navigate(['/payroll/loans/requests'], { queryParams: { module: 'salary-advance' } });
      return;
    }

    if (module === 'Provident Fund') {
      this.router.navigate(['/payroll/provident-fund-benefilts']);
      return;
    }

    if (module === 'Gratuity') {
      this.router.navigate(['/payroll/my-gratuity']);
      return;
    }
  }

  onBenefitCardKeydown(event: KeyboardEvent, module: string): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.openBenefit(module);
  }
}
