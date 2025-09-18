import { Routes } from '@angular/router';

export const employeeRoutes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    loadComponent: () => import('./components/employee-list/employee-list.component').then(m => m.EmployeeListComponent)
  },
  {
    path: 'add',
    loadComponent: () => import('./components/employee-form/employee-form.component').then(m => m.EmployeeFormComponent)
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./components/employee-form/employee-form.component').then(m => m.EmployeeFormComponent)
  },
  {
    path: 'view/:id',
    loadComponent: () => import('./components/employee-detail/employee-detail.component').then(m => m.EmployeeDetailComponent)
  },
  {
    path: 'departments',
    loadComponent: () => import('./components/department-list/department-list.component').then(m => m.DepartmentListComponent)
  },
  {
    path: 'positions',
    loadComponent: () => import('./components/position-list/position-list.component').then(m => m.PositionListComponent)
  }
];
