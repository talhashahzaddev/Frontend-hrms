import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
export const expenseRoutes: Routes = [
  {
    path: '',
    redirectTo: 'categories',
    pathMatch: 'full'
  },
  {
    path: 'categories',
    canActivate: [AuthGuard],
    data: { roles: ['Super Admin', 'HR Manager'] },
    loadComponent: () =>
      import('@features/expense/components/category-list/category-list.component').then(m => m.CategoryListComponent),
    title: 'Expense Categories - HRMS'
  },
  {
    path: 'claims',
    loadComponent: () =>
      import('@features/expense/components/claim-list/claim-list.component').then(m => m.ClaimListComponent),
    title: 'My Claims - HRMS'
  },
  {
    path: 'recurring',
    canActivate: [AuthGuard],
    data: { roles: ['Super Admin', 'HR Manager'] },
    loadComponent: () =>
      import('@features/expense/components/recurring-expense-list/recurring-expense-list.component').then(m => m.RecurringExpenseListComponent),
    title: 'Recurring Expenses - HRMS'
  },
  {
    path: 'expense-report',
    canActivate: [AuthGuard],
    data: { roles: ['Super Admin', 'HR Manager'] },
    loadComponent: () =>
      import('@features/expense/components/expense-report/expense-report.component').then(m => m.ExpenseReportComponent),
    title: 'Reports - HRMS'
  }
];
