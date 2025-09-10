import { Routes } from '@angular/router';

export const attendanceRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/attendance-dashboard/attendance-dashboard.component').then(m => m.AttendanceDashboardComponent)
  }
];
