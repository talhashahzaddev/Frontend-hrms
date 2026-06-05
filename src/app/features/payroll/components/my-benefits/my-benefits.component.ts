import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { PayrollService } from '../../services/payroll.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { take } from 'rxjs';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-my-benefits',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './my-benefits.component.html',
  styleUrl: './my-benefits.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyBenefitsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(SettingsService);

  readonly activeModules = signal<string[]>([]);
  readonly activeModulesSet = computed(() => new Set(this.activeModules()));
  readonly isLoading = signal(true);
  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  private readonly benefitPermissionKeys: Record<string, string[]> = {
    Loan: [
      'loan_employee_list',
      'loan_employee_view',
      'loan_employee_request',
      'loan_employee_edit',
      'loan_employee_delete',
      'loan_employee_active',
      'loan_employee_pending',
      'loan_employee_history',
      'loan_employee_references'
    ],
    'Advance Salary': [
      'salary_advance_employee_list',
      'salary_advance_employee_view',
      'salary_advance_employee_request',
      'salary_advance_employee_edit',
      'salary_advance_employee_delete',
      'salary_advance_employee_summary'
    ],
    'Provident Fund': [
      'pf_employee_enroll',
      'pf_employee_edit_enroll',
      'pf_employee_update_percentage',
      'pf_employee_withdraw',
      'pf_employee_delete_request',
      'pf_employee_pending_requests',
      'pf_employee_active',
      'pf_employee_transactions'
    ],
    Gratuity: ['gratuity_employee']
  };

  get canAccessMyBenefits(): boolean {
    return this.hasMyBenefitsPermission();
  }

  ngOnInit(): void {
    this.fetchCurrency();

    if (!this.canAccessMyBenefits) {
      this.isLoading.set(false);
      return;
    }

    this.fetchOverview();
  }

  hasMyBenefitsPermission(): boolean {
    return this.authService.hasMenuPermission('Payroll', 'My Benefits', 'my_benefits');
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasPermissionByActionKey(actionKey);
  }

  hasAnyEmployeeBenefitPermission(): boolean {
    return Object.values(this.benefitPermissionKeys)
      .flat()
      .some((key) => this.hasPermission(key));
  }

  canShowBenefitModule(moduleName: string): boolean {
    if (!this.isModuleActive(moduleName)) {
      return false;
    }

    const keys = this.benefitPermissionKeys[moduleName];
    if (!keys?.length) {
      return true;
    }

    return keys.some((key) => this.hasPermission(key));
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
    if (!this.hasMyBenefitsPermission()) {
      return false;
    }
    return this.activeModulesSet().has(moduleName);
  }

  openBenefit(module: string): void {
    if (!this.canShowBenefitModule(module)) {
      return;
    }

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

    if (module === 'Social Security') {
      this.router.navigate(['/payroll/my-social-security']);
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
