import { Routes } from '@angular/router';

export const payrollRoutes: Routes = [
  {
    path: '',
    redirectTo: 'bonus',
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
      import('./components/loans-advances/loans-advances.component').then(m => m.LoansAdvancesComponent),
    title: 'Loans & Salary Advances - HRMS'
  },
  {
    path: 'loans/requests',
    loadComponent: () =>
      import('./components/loan-requests/loan-requests.component').then(m => m.LoanRequestsComponent),
    title: 'My Loan & Advance Requests - HRMS'
  },
  {
    path: 'loans/requests/compliance',
    loadComponent: () =>
      import('./components/loan-request-compliance/loan-request-compliance.component').then(m => m.LoanRequestComplianceComponent),
    title: 'Payroll Compliance - HRMS'
  },
  {
    path: 'loans/requests/compliance/payslips',
    loadComponent: () =>
      import('./components/compliance-payslips/compliance-payslips.component').then(m => m.CompliancePayslipsComponent),
    title: 'Payslip Management - HRMS'
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
    path: 'periods',
    loadComponent: () =>
      import('./components/payroll-period/payroll-period.component').then(m => m.PayrollPeriodComponent),
    title: 'Payroll Periods - HRMS'
  }
];
