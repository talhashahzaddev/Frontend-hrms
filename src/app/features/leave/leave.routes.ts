import { Routes } from '@angular/router';
//import { RoleGuard } from '../../core/guards/role.guard';

export const leaveRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/leave-dashboard/leave-dashboard.component')
      .then(m => m.LeaveDashboardComponent),
    title: 'Leave Dashboard - HRMS'
  },
  {
    path: 'apply',
    loadComponent: () => import('./components/apply-leave/apply-leave.component')
      .then(m => m.ApplyLeaveComponent),
    title: 'Apply for Leave - HRMS'
  },
  {
    path: 'apply/:id',
    loadComponent: () => import('./components/apply-leave/apply-leave.component')
      .then(m => m.ApplyLeaveComponent),
    title: 'Edit Leave Request - HRMS'
  },
  {
    path: 'team',
    //canActivate: [RoleGuard],
    data: { roles: ['Super Admin', 'HR Manager', 'Manager'] },
    loadComponent: () => import('./components/team-leaves/team-leaves.component')
      .then(m => m.TeamLeavesComponent),
    title: 'Team Leaves - HRMS'
  },
  {
    path: 'calendar',
    loadComponent: () => import('./components/leave-calendar/leave-calendar.component')
      .then(m => m.LeaveCalendarComponent),
    title: 'Leave Calendar - HRMS'
  },
  {
    path: 'types',
    //canActivate: [RoleGuard],
    data: { roles: ['Super Admin', 'HR Manager'] },
    loadComponent: () => import('./components/leave-types/leave-types.component')
      .then(m => m.LeaveTypesComponent),
    title: 'Leave Types - HRMS'
  }
];