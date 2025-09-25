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
  },
   {
    path: 'appraisals',
    loadComponent: () => import('./components/appraisals/appraisals.component').then(m => m.AppraisalsComponent)
  },
   {
    path: 'goals',
    loadComponent: () => import('./components/goals-kras/goals-kras.component').then(m => m.GoalsKRAsComponent)
  },
   {
    path: 'skills',
    loadComponent: () => import('./components/skill-matrix/skill-matrix.component').then(m => m.SkillMatrixComponent)
  },
   {
    path: 'reports',
    loadComponent: () => import('./components/reports/reports.component').then(m => m.ReportsComponent)
  }
];
