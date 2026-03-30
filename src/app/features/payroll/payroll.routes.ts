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
    path: 'time-tracking',
    loadComponent: () =>
      import('./components/time-tracking/time-tracking.component').then(m => m.TimeTrackingComponent),
    title: 'Time Tracking - HRMS'
  }
];
