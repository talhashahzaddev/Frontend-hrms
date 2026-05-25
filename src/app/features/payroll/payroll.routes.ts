import { Routes } from '@angular/router';

export const payrollRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/payroll-default-redirect/payroll-default-redirect.component').then(
        m => m.PayrollDefaultRedirectComponent
      ),
    pathMatch: 'full'
  },
  {
    path: 'bonus',
    loadComponent: () =>
      import('./components/bonus-pay/bonus-pay.component').then(m => m.BonusPayComponent),
    title: 'Bonus Pay - HRMS'
  },
  {
    path: 'performance',
    loadComponent: () =>
      import('./components/performance-pay/performance-pay.component').then(m => m.PerformancePayComponent),
    title: 'Performance Pay - HRMS'
  },
  {
    path: 'loans',
    loadComponent: () =>
      import('./components/loans/loans.component').then(m => m.LoansComponent),
    title: 'Loans - HRMS'
  },
  {
    path: 'provident-fund',
    loadComponent: () =>
      import('./components/provident-fund/provident-fund.component').then(m => m.ProvidentFundComponent),
    title: 'Provident Funds - HRMS'
  },
  {
    path: 'tax-ledger',
    loadComponent: () =>
      import('./components/tax-ledger/tax-ledger.component').then(m => m.TaxLedgerComponent),
    title: 'Tax Ledger - HRMS'
  },
  {
    path: 'salary-advances',
    loadComponent: () =>
      import('./components/salary-advances/salary-advances.component').then(m => m.SalaryAdvancesComponent),
    title: 'Salary Advances - HRMS'
  },
  {
    path: 'gratuity',
    loadComponent: () =>
      import('./components/gratuity/gratuity.component').then(m => m.GratuityComponent),
    title: 'Gratuity - HRMS'
  },
  {
    path: 'loans/requests',
    loadComponent: () =>
      import('./components/loan-requests/loan-requests.component').then(m => m.LoanRequestsComponent),
    title: 'My Loan & Advance Requests - HRMS'
  },
  {
    path: 'provident-fund-benefilts',
    loadComponent: () =>
      import('./components/provident-fund-benefilts/provident-fund-benefilts.component').then(m => m.ProvidentFundBenefiltsComponent),
    title: 'Provident Fund Benefits - HRMS'
  },
  {
    path: 'social-security',
    loadComponent: () =>
      import('./components/social-security/social-security.component').then(m => m.SocialSecurityComponent),
    title: 'Social Security Management - HRMS'
  },
  {
    path: 'social-security-masters',
    loadComponent: () =>
      import('./components/social-security-masters/social-security-masters.component').then(m => m.SocialSecurityMastersComponent),
    title: 'Social Security Masters - HRMS'
  },
  {
    path: 'loans/requests/compliance',
    redirectTo: 'tax-management',
    pathMatch: 'full'
  },
  {
    path: 'payslips',
    loadComponent: () =>
      import('./components/compliance-payslips/compliance-payslips.component').then(m => m.CompliancePayslipsComponent),
    title: 'Payslip Management - HRMS'
  },
  {
    path: 'loans/requests/compliance/payslips',
    redirectTo: 'payslips',
    pathMatch: 'full'
  },
  {
    path: 'policies',
    loadComponent: () =>
      import('./components/payroll-rules/payroll-rules.component').then(m => m.PayrollRulesComponent),
    title: 'Payroll Policies - HRMS'
  },
  {
    path: 'policies/overtime-rules',
    loadComponent: () =>
      import('./components/overtime-rules/overtime-rules.component').then(m => m.OvertimeRulesComponent),
    title: 'Overtime Rules - HRMS'
  },
  {
    path: 'policies/attendance-deduction-rules',
    loadComponent: () =>
      import('./components/attendance-deduction-rules/attendance-deduction-rules.component').then(m => m.AttendanceDeductionRulesComponent),
    title: 'Attendance Deduction Rules - HRMS'
  },
  {
    path: 'policies/late-arrival-rules',
    loadComponent: () =>
      import('./components/late-arrival-rules/late-arrival-rules.component').then(m => m.LateArrivalRulesComponent),
    title: 'Late Arrival Rules - HRMS'
  },
  {
    path: 'policies/leave-deduction-rules',
    loadComponent: () =>
      import('./components/leave-deduction-rules/leave-deduction-rules.component').then(m => m.LeaveDeductionRulesComponent),
    title: 'Leave Deduction Rules - HRMS'
  },
  {
    path: 'time-tracking',
    loadComponent: () =>
      import('./components/time-tracking/time-tracking.component').then(m => m.TimeTrackingComponent),
    title: 'Time Tracking - HRMS'
  },
  {
    path: 'policies/performance-rules',
    loadComponent: () =>
      import('./components/performance-rules/performance-rules.component').then(m => m.PerformanceRulesComponent),
    title: 'Performance Bonus Policy - HRMS'
  },
  {
    path: 'policies/bonus-rules',
    loadComponent: () =>
      import('./components/bonus-rules/bonus-rules.component').then(m => m.BonusRulesComponent),
    title: 'Bonus Policy - HRMS'
  },
  {
    path: 'policies/loan-rules',
    loadComponent: () =>
      import('./components/loan-rules/loan-rules.component').then(m => m.LoanRulesComponent),
    title: 'Loan Policy - HRMS'
  },
  {
    path: 'policies/provident-fund-rule',
    loadComponent: () =>
      import('./components/provident-fund-rule/provident-fund-rule.component').then(m => m.ProvidentFundRuleComponent),
    title: 'Provident Fund Policy - HRMS'
  },
  {
    path: 'policies/salary-advance-rules',
    loadComponent: () =>
      import('./components/salary-advance-rules/salary-advance-rules.component').then(m => m.SalaryAdvanceRulesComponent),
    title: 'Salary Advance Policy - HRMS'
  },
  {
    path: 'policies/tax-regime-rules',
    loadComponent: () =>
      import('./components/tax-regime-rules/tax-regime-rules.component').then(m => m.TaxRegimeRulesComponent),
    title: 'Tax Regime Policy - HRMS'
  },
  {
    path: 'policies/tax-categories',
    loadComponent: () =>
      import('./components/tax-categories/tax-categories.component').then(m => m.TaxCategoriesComponent),
    title: 'Tax Categories - HRMS'
  },
  {
    path: 'policies/tax-slabs',
    loadComponent: () =>
      import('./components/tax-slabs/tax-slabs.component').then(m => m.TaxSlabsComponent),
    title: 'Tax Slabs - HRMS'
  },
  {
    path: 'policies/tax-rules',
    loadComponent: () =>
      import('./components/tax-rules/tax-rules.component').then(m => m.TaxRulesComponent),
    title: 'Tax Rules - HRMS'
  },
  {
    path: 'policies/social-security-rules',
    loadComponent: () =>
      import('./components/social-security-rules/social-security-rules.component').then(m => m.SocialSecurityRulesComponent),
    title: 'Social Security Policy - HRMS'
  },
  {
    path: 'periods',
    loadComponent: () =>
      import('./components/payroll-period/payroll-period.component').then(m => m.PayrollPeriodComponent),
    title: 'Payroll Periods - HRMS'
  },
  {
    path: 'my-benefits',
    loadComponent: () =>
      import('./components/my-benefits/my-benefits.component').then(m => m.MyBenefitsComponent),
    title: 'My Benefits - HRMS'
  },
  {
    path: 'policies/gratuity-rules',
    loadComponent: () =>
      import('./components/gratuity-rules/gratuity-rules.component').then(m => m.GratuityRulesComponent),
    title: 'Gratuity Policy - HRMS'
  },
  {
    path: 'my-gratuity',
    loadComponent: () =>
      import('./components/my-gratuity/my-gratuity.component').then(m => m.MyGratuityComponent),
    title: 'My Gratuity - HRMS'
  },
  {
    path: 'calculation',
    loadComponent: () =>
      import('./components/payroll-calculation/payroll-calculation.component').then(m => m.PayrollCalculationComponent),
    title: 'Payroll Calculation - HRMS'
  },
  {
    path: 'my-social-security',
    loadComponent: () =>
      import('./components/my-social-security/my-social-security.component').then(m => m.MySocialSecurityComponent),
    title: 'My Social Security - HRMS'
  },
  {
    path: 'results',
    loadComponent: () =>
      import('./components/payroll-result/payroll-result.component').then(m => m.PayrollResultComponent),
    title: 'Payroll Results - HRMS'
  },
  {
    path: 'my-payslips',
    loadComponent: () =>
      import('./components/payslips/payslips.component').then(m => m.PayslipsComponent),
    title: 'My Payslips - HRMS'
  }
];
