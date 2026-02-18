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
  {
    path: 'create-news',
    loadComponent: () => import('./components/create-news/create-news.component')
      .then(m => m.CreateNewsComponent),
  },

  {
    path: 'create-news/:id',
    loadComponent: () => import('./components/create-news/create-news.component')
      .then(m => m.CreateNewsComponent),
  },
  {
    path: 'view-news/:id',
    loadComponent: () => import('./components/news-view/news-view.component')
      .then(m => m.NewsViewComponent),
  },

  

];