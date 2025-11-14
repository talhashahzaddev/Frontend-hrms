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
    path: 'skills',
    loadComponent: () => import('./components/skill-matrix/skill-matrix.component').then(m => m.SkillMatrixComponent)
  },
  {
    path: 'reports',
    loadComponent: () => import('./components/reports/reports.component').then(m => m.ReportsComponent)
  },
  {
    path: 'cycles',
    loadComponent: () => import('./components/appraisal-cycles/appraisal-cycles.component').then(m => m.AppraisalCyclesComponent)
  },
  {
    path: 'kras',
    loadComponent: () => import('./components/kra-management/kra-management.component').then(m => m.KRAManagementComponent)
  },
  {
    path: 'goals',
    loadComponent: () => import('./components/kra-management/kra-management.component').then(m => m.KRAManagementComponent)
  },
  {
    path: 'self-assessment',
    loadComponent: () => import('./components/self-assessment/self-assessment.component').then(m => m.SelfAssessmentComponent)
  },
  {
    path: 'manager-review',
    loadComponent: () => import('./components/manager-review/manager-review.component').then(m => m.ManagerReviewComponent)
  },
  {
    path: 'employee/:id/history',
    loadComponent: () => import('./components/employee-performance-history/employee-performance-history.component').then(m => m.EmployeePerformanceHistoryComponent)
  }
];
