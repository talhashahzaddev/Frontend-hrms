import { Routes } from '@angular/router';

export const performanceRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/performance-dashboard/performance-dashboard.component').then(m => m.PerformanceDashboardComponent)
  }
];
