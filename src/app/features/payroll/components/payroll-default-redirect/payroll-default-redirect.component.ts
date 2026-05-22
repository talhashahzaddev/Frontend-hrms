import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

/**
 * Redirects /payroll to the first ledger the user may view (bonus or performance), or dashboard.
 */
@Component({
  selector: 'app-payroll-default-redirect',
  standalone: true,
  template: ''
})
export class PayrollDefaultRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    const routes: { key: string; path: string }[] = [
      { key: 'bonus_entry_view', path: '/payroll/bonus' },
      { key: 'performance_pay_view', path: '/payroll/performance' },
      { key: 'overtime_entry_view', path: '/payroll/time-tracking' },
      { key: 'loan_admin_view', path: '/payroll/loans' },
      { key: 'pf_admin_view', path: '/payroll/provident-fund' },
      { key: 'gratuity_admin_view', path: '/payroll/gratuity' },
      { key: 'compliance_payslip_view', path: '/payroll/payslips' },
      { key: 'my_payslip', path: '/payroll/my-payslips' },
      { key: 'payroll_calculation', path: '/payroll/calculation' },
      { key: 'payroll_result', path: '/payroll/results' },
      { key: 'payroll_period_view', path: '/payroll/periods' },
      { key: 'payroll_rules_view', path: '/payroll/policies' }
    ];

    for (const route of routes) {
      if (this.authService.hasPermissionByActionKey(route.key)) {
        void this.router.navigate([route.path], { replaceUrl: true });
        return;
      }
    }

    void this.router.navigate(['/dashboard'], { replaceUrl: true });
  }
}
