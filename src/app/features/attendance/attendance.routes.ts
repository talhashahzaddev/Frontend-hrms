import { Routes } from '@angular/router';

export const attendanceRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/attendance-dashboard/attendance-dashboard.component').then(m => m.AttendanceDashboardComponent)
  },
  {
    path: 'time-tracker',
    loadComponent: () => import('./components/time-tracker/time-tracker.component').then(m => m.TimeTrackerComponent)
  },
  {
    path: 'team-attendance',
    loadComponent: () => import('./components/team-attandence/team-attandence.component').then(m => m.TeamAttandenceComponent)
  },
  {
    path: 'reports',
    loadComponent: () => import('./components/reports/reports.component').then(m => m.ReportsComponent)
  },
  { 
    path: 'calendar',
    loadComponent: () => import('./components/attendancce-calendar/attendance-calendar').then(m => m.AttendanceCalendarComponent)
  }
  , 
 { 
    path: 'shift',
    loadComponent: () => import('./components/shift/shift.component').then(m => m.ShiftComponent)
  },
    { 
    path: 'createshift',
    loadComponent: () => import('./components/create-shift/create-shift.component').then(m => m.CreateShiftComponent)
  },
  {
    path: 'manual',
    loadComponent: () => import('./components/manual-attendance/manual-attendance.component').then(m => m.ManualAttendanceComponent)
  },
  {
    path: 'timesheet',
    loadComponent: () => import('./components/timesheet-dashboard/timesheet-dashboard.component').then(m => m.TimesheetDashboardComponent)
  },
  {
    path: 'approvals',
    loadComponent: () => import('./components/attendance-approvals/attendance-approvals.component').then(m => m.AttendanceApprovalsComponent)
  }

];
