import { Routes } from '@angular/router';

export const leaveRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/leave-dashboard/leave-dashboard.component').then(m => m.LeaveDashboardComponent)
  }
];
