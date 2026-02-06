import { Routes } from '@angular/router';

export const expenseRoutes: Routes = [
  {
    path: '',
    redirectTo: 'categories',
    pathMatch: 'full'
  },
  {
    path: 'categories',
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
    loadComponent: () =>
      import('@features/expense/components/recurring-expense-list/recurring-expense-list.component').then(m => m.RecurringExpenseListComponent),
    title: 'Recurring Expenses - HRMS'
  }
];
