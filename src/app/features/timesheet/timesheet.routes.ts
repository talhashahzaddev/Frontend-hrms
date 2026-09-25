import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const timesheetRoutes: Routes = [
  { path: '', redirectTo: 'periods', pathMatch: 'full' },
  { path: 'periods', canActivate: [AuthGuard],
    loadComponent: () => import('./components/timesheet-period-list/timesheet-period-list.component').then(m => m.TimesheetPeriodListComponent) },
  { path: 'periods/:periodId', canActivate: [AuthGuard],
    loadComponent: () => import('./components/timesheet-employee-grid/timesheet-employee-grid.component').then(m => m.TimesheetEmployeeGridComponent) },
  { path: 'approvals', canActivate: [AuthGuard],
    loadComponent: () => import('./components/timesheet-approval-panel/timesheet-approval-panel.component').then(m => m.TimesheetApprovalPanelComponent) },
  { path: 'config', canActivate: [AuthGuard],
    loadComponent: () => import('./components/timesheet-config-page/timesheet-config-page.component').then(m => m.TimesheetConfigPageComponent) },
  { path: 'payroll-export', canActivate: [AuthGuard],
    loadComponent: () => import('./components/timesheet-payroll-export/timesheet-payroll-export.component').then(m => m.TimesheetPayrollExportComponent) },
  { path: 'dashboard', canActivate: [AuthGuard],
    loadComponent: () => import('./components/timesheet-dashboard/timesheet-dashboard.component').then(m => m.TimesheetDashboardComponent) },
  { path: 'projects', canActivate: [AuthGuard],
    loadComponent: () => import('./components/timesheet-projects/timesheet-projects.component').then(m => m.TimesheetProjectsComponent) },
  { path: 'rate-cards', canActivate: [AuthGuard],
    loadComponent: () => import('./components/timesheet-rate-cards/timesheet-rate-cards.component').then(m => m.TimesheetRateCardsComponent) },
  { path: 'comp-time', canActivate: [AuthGuard],
    loadComponent: () => import('./components/timesheet-comp-time/timesheet-comp-time.component').then(m => m.TimesheetCompTimeComponent) },
  { path: 'delegation', canActivate: [AuthGuard],
    loadComponent: () => import('./components/timesheet-delegation/timesheet-delegation.component').then(m => m.TimesheetDelegationComponent) }
];
