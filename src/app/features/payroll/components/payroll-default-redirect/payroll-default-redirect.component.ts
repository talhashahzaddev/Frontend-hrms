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
    const routes: { key: string; path: string; queryParams?: Record<string, string> }[] = [
      { key: 'bonus_entry_view', path: '/payroll/bonus' },
      { key: 'performance_pay_view', path: '/payroll/performance' },
      { key: 'overtime_entry_view', path: '/payroll/time-tracking' },
      { key: 'loan_admin_view', path: '/payroll/loans' },
      { key: 'pf_admin_view', path: '/payroll/provident-fund' },
      { key: 'loan_employee_list', path: '/payroll/loans/requests', queryParams: { module: 'loans' } },
      { key: 'loan_employee_request', path: '/payroll/loans/requests', queryParams: { module: 'loans' } },
      { key: 'salary_advance_employee_list', path: '/payroll/loans/requests', queryParams: { module: 'salary-advance' } },
      { key: 'salary_advance_employee_request', path: '/payroll/loans/requests', queryParams: { module: 'salary-advance' } },
      { key: 'pf_employee_active', path: '/payroll/provident-fund-benefilts' },
      { key: 'pf_employee_enroll', path: '/payroll/provident-fund-benefilts' },
      { key: 'gratuity_employee', path: '/payroll/my-gratuity' },
      { key: 'my_benefits', path: '/payroll/my-benefits' },
      { key: 'salary_advance_admin_list', path: '/payroll/salary-advances' },
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
        void this.router.navigate([route.path], {
          queryParams: route.queryParams,
          replaceUrl: true
        });
        return;
      }
    }

    void this.router.navigate(['/dashboard'], { replaceUrl: true });
  }
}
