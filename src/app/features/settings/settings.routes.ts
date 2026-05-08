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
    children: [
      {
        path: '',
        loadComponent: () => import('../settings/components/roles/role-list.component.').then(m => m.RoleListComponent),
        title: 'Roles & Permissions - HRMS'
      },
      {
        path: 'add',
        loadComponent: () => import('../settings/components/role-form/role-form.component').then(m => m.RoleFormComponent),
        title: 'Add New Role - HRMS',
        data: { mode: 'add' }
      },
      {
        path: ':id/edit',
        loadComponent: () => import('../settings/components/role-form/role-form.component').then(m => m.RoleFormComponent),
        title: 'Edit Role - HRMS',
        data: { mode: 'edit' }
      },
      {
        path: ':id/view',
        loadComponent: () => import('../settings/components/role-form/role-form.component').then(m => m.RoleFormComponent),
        title: 'View Role - HRMS',
        data: { mode: 'view' }
      }
    ]
  }
];

