import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { NoAuthGuard } from './core/guards/no-auth.guard';
import { PlatformAdminGuard } from './features/platform-admin/guards/platform-admin.guard';
// import { RoleRedirectGuard } from './core/guards/role-redirect.guard';
// import { EmptyRouteComponent } from './shared/components/Empty-Component/empty-route.component';

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
  {
    path: 'employee/dashboard',
    canActivate: [AuthGuard],
    data: { roles: ['Employee','Manager'] },
    loadComponent: () =>
      import('./features/employee-dashboard/employee-dashboard.component').then(m => m.EmployeeDashboardComponent),
    pathMatch: 'full'
  },
  // Redirect old path for backward compatibility
  // {
  //   path: 'employee-dashboard',
  //   redirectTo: 'employee/dashboard',
  //   pathMatch: 'full'
  // },



  {
    path: 'reset-password',
    canActivate: [NoAuthGuard],
    loadComponent: () =>
      import('./features/auth/components/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },

  // Protected Routes (require authentication)
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('../app/features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Dashboard - HRMS'
  },
  // Employee Management Routes
  {
    path: 'employees',
    canActivate: [AuthGuard],
    data: { roles: ['Super Admin', 'HR Manager'] },
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
  // Assets Management Routes
  {
    path: 'assets',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/assets/assets.routes').then(m => m.assetsRoutes)
  },

  // Leave Management Routes
  {
    path: 'leave',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/leave/leave.routes').then(m => m.leaveRoutes)
  },

  // Payroll Management Routes (SuperAdmin only)
  {
    path: 'payroll',
    canActivate: [AuthGuard],
    data: { roles: ['Super Admin'] },
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

  // Calendar Route (Unified View)
  {
    path: 'calendar',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/calendar/calendar.routes').then(m => m.calendarRoutes),
    title: 'Calendar - HRMS'
  },
  {
    path: 'news',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/news/news.routes').then(m => m.newsRoutes),
    title: 'Company News - HRMS'
  },

  // Jobs Module Routes (all roles)
  {
    path: 'jobs',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/jobs/jobs.routes').then(m => m.jobsRoutes),
    title: 'Jobs - HRMS'
  },

  // Public Career Routes (no authentication required)
  {
    path: 'career',
    loadChildren: () =>
      import('./features/jobs/public-career.routes').then(m => m.publicCareerRoutes),
    title: 'Careers - Codified Labs'
  },

  // AI Assistant Route (accessible to all roles)
  {
    path: 'ai-assistant',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/ai-assistant/ai-assistant.component').then(m => m.AiAssistantComponent),
    title: 'AI Assistant - HRMS'
  },

  // Subscription Route (Super Admin only)
  {
    path: 'subscription',
    canActivate: [AuthGuard],
    data: { roles: ['Super Admin'] },
    loadComponent: () =>
      import('./features/subscription/subscription.component').then(m => m.SubscriptionComponent),
    title: 'Subscription Plans - HRMS'
  },

  // Expense Management Routes (HR Manager, Employee)
  {
    path: 'expense',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/expense/expense.routes').then(m => m.expenseRoutes),
  },

  // Profile Management
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/profile/components/profile/profile.component').then(m => m.ProfileComponent),
    title: 'My Profile - HRMS'
  },
  // Profile Management
  {
    path: 'change-password',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/profile/components/change-password/change-password.component').then(m => m.ChangePasswordComponent),
    title: 'Change Password - HRMS'
  },

  // Settings
  {
    path: 'settings',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/settings/settings.routes').then(m => m.settingsRoutes)
  },

  // Verify Email Route
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./features/auth/components/verify-email/verify-email.component').then(m => m.VerifyEmailComponent)
  },
  {
    path: 'platform-admin/login',
    loadComponent: () =>
      import('./features/platform-admin/components/platform-login/platform-login.component').then(m => m.PlatformLoginComponent),
    title: 'Platform Admin Login - Brisk People'
  },
  {
    path: 'platform-admin',
    canActivate: [PlatformAdminGuard],
    loadComponent: () =>
      import('./features/platform-admin/layout/platform-layout.component').then(m => m.PlatformLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/platform-admin/components/platform-dashboard/platform-dashboard.component').then(m => m.PlatformDashboardComponent),
        title: 'Platform Dashboard - Brisk People'
      },
      {
        path: 'organizations',
        loadComponent: () =>
          import('./features/platform-admin/components/organization-list/organization-list.component').then(m => m.OrganizationListComponent),
        title: 'Organizations - Brisk People'
      },
      {
        path: 'organizations/:id',
        loadComponent: () =>
          import('./features/platform-admin/components/organization-detail/organization-detail.component').then(m => m.OrganizationDetailComponent),
        title: 'Organization Details - Brisk People'
      },
      {
        path: 'inquiries',
        loadComponent: () =>
          import('./features/platform-admin/components/inquiry-list/inquiry-list.component').then(m => m.InquiryListComponent),
        title: 'Demo Inquiries - Brisk People'
      }
    ]
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
