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
  },
  {
    path: 'my-applications',
    loadComponent: () =>
      import('./components/my-applications/my-applications.component').then(m => m.MyApplicationsComponent),
    title: 'My Applications - HRMS'
  },
  {
    path: 'stage',
    loadComponent: () =>
      import('./components/stage-list/stage-list.component').then(m => m.StageListComponent),
    title: 'Stages - HRMS'
  }
];
