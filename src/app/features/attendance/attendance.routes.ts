import { Routes } from '@angular/router';

export const attendanceRoutes: Routes = [
  {
    path: '',
    redirectTo: 'reports',
    pathMatch: 'full'
  },

  {
    path: 'dashboard',
    loadComponent: () => import('./components/attendance-dashboard/attendance-dashboard.component').then(m => m.AttendanceDashboardComponent)
  },


  {
    path: 'reports',
    loadComponent: () => import('./components/reports/reports.component').then(m => m.ReportsComponent)
  },

     {
    path: 'team-attendance',
    loadComponent: () => import('./components/team-attandence/team-attandence.component').then(m => m.TeamAttandenceComponent)
  },

     {
    path: 'time-tracker',
    loadComponent: () => import('./components/time-tracker/time-tracker.component').then(m => m.TimeTrackerComponent)
  },
];
