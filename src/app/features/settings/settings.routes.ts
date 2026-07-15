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
        pathMatch: 'full',
        loadComponent: () => import('./components/roles/role-list.component').then(m => m.RoleListComponent),
        title: 'Roles & Permissions - HRMS'
      },
      {
        path: 'add',
        loadComponent: () => import('./components/role-form/role-form.component').then(m => m.RoleFormComponent),
        title: 'Add New Role - HRMS',
        data: { mode: 'add' }
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./components/role-form/role-form.component').then(m => m.RoleFormComponent),
        title: 'Edit Role - HRMS',
        data: { mode: 'edit' }
      },
      {
        path: ':id/view',
        loadComponent: () => import('./components/role-form/role-form.component').then(m => m.RoleFormComponent),
        title: 'View Role - HRMS',
        data: { mode: 'view' }
      }
    ]
  },
  {
    path: 'policies',
    children: [
      {
        path: '',
        loadComponent: () => import('./components/company-policies/policy-list.component').then(m => m.PolicyListComponent),
        title: 'Company Policies - HRMS'
      },
      // {
      //   path: 'add',
      //   loadComponent: () => import('./components/company-policies/policy-form.component').then(m => m.PolicyFormComponent),
      //   title: 'Create Policy - HRMS',
      //   data: { mode: 'add' }
      // },
      // {
      //   path: ':id/edit',
      //   loadComponent: () => import('./components/company-policies/policy-form.component').then(m => m.PolicyFormComponent),
      //   title: 'Edit Policy - HRMS',
      //   data: { mode: 'edit' }
      // },
      // {
      //   path: ':id/view',
      //   loadComponent: () => import('./components/company-policies/policy-form.component').then(m => m.PolicyFormComponent),
      //   title: 'View Policy - HRMS',
      //   data: { mode: 'view' }
      // }
    ]
  },
  {
    path: 'onboarding-configuration',
    loadComponent: () => import('./components/onboarding-configuration/onboarding-configuration.component').then(m => m.OnboardingConfigurationComponent),
    title: 'Onboarding Configuration - HRMS'
  },
  {
    path: 'payslip-template',
    loadComponent: () => import('./components/payslip-template/payslip-template.component').then(m => m.PayslipTemplateComponent),
    title: 'Payslip Template - HRMS'
  }
];

