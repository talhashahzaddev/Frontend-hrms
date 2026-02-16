import { Routes } from '@angular/router';
//import { RoleGuard } from '../../core/guards/role.guard';

export const newsRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/news-dashbaord/news-dashbaord.component')
      .then(m => m.NewsDashbaordComponent),
  },
];