import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { PayrollService } from '../../services/payroll.service';
import { NotificationService } from '@core/services/notification.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-my-benefits',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
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
  readonly currencySymbol = signal('PKR');

  ngOnInit(): void {
    this.fetchOverview();
    this.fetchCurrency();
  }

  fetchCurrency(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode) => {
          this.currencySymbol.set(currencyCode || 'PKR');
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

  onViewDetails(module: string): void {
    // Navigate based on module
    console.log('Viewing details for:', module);
  }

  onRequestNew(module: string): void {
      // Logic for requesting new benefit
      console.log('Requesting new:', module);
  }

  completeEnrollment(): void {
      console.log('Navigating to enrollment');
  }
}
