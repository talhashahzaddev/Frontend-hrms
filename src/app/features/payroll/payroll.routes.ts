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
  }
];
