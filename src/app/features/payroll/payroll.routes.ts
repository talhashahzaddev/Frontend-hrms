import { Routes } from '@angular/router';

export const payrollRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/payroll-dashboard/payroll-dashboard.component').then(m => m.PayrollDashboardComponent)
  }
];
