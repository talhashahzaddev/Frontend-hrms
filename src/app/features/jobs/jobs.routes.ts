import { Routes } from '@angular/router';

export const jobsRoutes: Routes = [
  {
    path: '',
    redirectTo: 'openings',
    pathMatch: 'full'
  },
  {
    path: 'openings',
    loadComponent: () =>
      import('./components/openings/openings.component').then(m => m.OpeningsComponent),
    title: 'Job Openings - HRMS'
  },
  {
    path: 'applied',
    loadComponent: () =>
      import('./components/applied-jobs/applied-jobs.component').then(m => m.AppliedJobsComponent),
    title: 'Applied Jobs - HRMS'
  }
];
