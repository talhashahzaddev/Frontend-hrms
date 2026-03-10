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
    path: 'create',
    loadComponent: () =>
      import('./components/create-job-dialog/create-job-dialog.component').then(m => m.CreateJobDialogComponent),
    title: 'Create Job - HRMS'
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./components/create-job-dialog/create-job-dialog.component').then(m => m.CreateJobDialogComponent),
    title: 'Edit Job - HRMS'
  },
  {
    path: 'applied',
    loadComponent: () =>
      import('./components/applied-jobs/applied-jobs.component').then(m => m.AppliedJobsComponent),
    title: 'Applied Jobs - HRMS'
  },
  {
    path: 'stage',
    loadComponent: () =>
      import('./components/stage-list/stage-list.component').then(m => m.StageListComponent),
    title: 'Stages - HRMS'
  }
];
