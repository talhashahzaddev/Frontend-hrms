import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const holidayRoutes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    data: { roles: ['Super Admin', 'HR Manager'] },
    loadComponent: () =>
      import('./components/holiday-management/holiday-management.component').then(m => m.HolidayManagementComponent),
    title: 'Holiday Management - HRMS'
  },
  {
    path: 'my-holidays',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/restricted-holiday-picker/restricted-holiday-picker.component').then(m => m.RestrictedHolidayPickerComponent),
    title: 'My Restricted Holidays - HRMS'
  }
];
