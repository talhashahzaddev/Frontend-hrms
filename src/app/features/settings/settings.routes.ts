import { Routes } from '@angular/router';

export const settingsRoutes: Routes = [
  {
    path: '',
    redirectTo: 'general',
    pathMatch: 'full'
  },
  {
    path: 'general',
    loadComponent: () => import('./components/settings-general/settings-general.component').then(m => m.SettingsGeneralComponent)
  },
  {
    path: 'ip-address',
    loadComponent: () => import('../attendance/components/manage-office-ips-dialog/manage-office-ips-dialog.component').then(m => m.ManageOfficeIPsComponent)
  },
  {
    path: 'career-management',
    loadComponent: () => import('./components/career-management/career-management.component').then(m => m.CareerManagementComponent)
  },
 {
    path: 'roles',
    loadComponent: () => import('./components/roles/role-list.component.').then(m => m.RoleListComponent),
    title: 'Roles & Permissions - HRMS'
  }
];

