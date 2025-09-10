import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { NoAuthGuard } from './core/guards/no-auth.guard';

export const appRoutes: Routes = [
  // Redirect empty path to dashboard
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  
  // Authentication Routes (accessible only when not authenticated)
  {
    path: 'login',
    canActivate: [NoAuthGuard],
    loadComponent: () => 
      import('./features/auth/components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [NoAuthGuard],
    loadComponent: () => 
      import('./features/auth/components/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'forgot-password',
    canActivate: [NoAuthGuard],
    loadComponent: () => 
      import('./features/auth/components/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  
  // Protected Routes (require authentication)
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadComponent: () => 
      import('./features/dashboard/components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Dashboard - HRMS'
  },
  
  // Employee Management Routes
  {
    path: 'employees',
    canActivate: [AuthGuard],
    loadChildren: () => 
      import('./features/employee/employee.routes').then(m => m.employeeRoutes)
  },
  
  // Attendance Management Routes
  {
    path: 'attendance',
    canActivate: [AuthGuard],
    loadChildren: () => 
      import('./features/attendance/attendance.routes').then(m => m.attendanceRoutes)
  },
  
  // Leave Management Routes
  {
    path: 'leave',
    canActivate: [AuthGuard],
    loadChildren: () => 
      import('./features/leave/leave.routes').then(m => m.leaveRoutes)
  },
  
  // Payroll Management Routes
  {
    path: 'payroll',
    canActivate: [AuthGuard],
    loadChildren: () => 
      import('./features/payroll/payroll.routes').then(m => m.payrollRoutes)
  },
  
  // Performance Management Routes
  {
    path: 'performance',
    canActivate: [AuthGuard],
    loadChildren: () => 
      import('./features/performance/performance.routes').then(m => m.performanceRoutes)
  },
  
  // Profile Management
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadComponent: () => 
      import('./features/profile/components/profile/profile.component').then(m => m.ProfileComponent),
    title: 'My Profile - HRMS'
  },
  
  // Settings
  {
    path: 'settings',
    canActivate: [AuthGuard],
    loadChildren: () => 
      import('./features/settings/settings.routes').then(m => m.settingsRoutes)
  },
  
  // Error Pages
  {
    path: '404',
    loadComponent: () => 
      import('./shared/components/not-found/not-found.component').then(m => m.NotFoundComponent),
    title: 'Page Not Found - HRMS'
  },
  {
    path: '403',
    loadComponent: () => 
      import('./shared/components/forbidden/forbidden.component').then(m => m.ForbiddenComponent),
    title: 'Access Forbidden - HRMS'
  },
  {
    path: '500',
    loadComponent: () => 
      import('./shared/components/server-error/server-error.component').then(m => m.ServerErrorComponent),
    title: 'Server Error - HRMS'
  },
  
  // Catch all route - redirect to 404
  {
    path: '**',
    redirectTo: '/404'
  }
];
