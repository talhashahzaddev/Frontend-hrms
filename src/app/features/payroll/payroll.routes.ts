import { Routes } from '@angular/router';

export const payrollRoutes: Routes = [
  {
    path: '',
    redirectTo: 'policies',
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
    path: 'time-tracking',
    loadComponent: () =>
      import('./components/time-tracking/time-tracking.component').then(m => m.TimeTrackingComponent),
    title: 'Time Tracking - HRMS'
  }
];
