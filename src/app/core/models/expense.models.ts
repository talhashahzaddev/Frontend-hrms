// Expense Category - matches API DTOs
export interface ExpenseCategoryDto {
  categoryId: string;
  organizationId: string;
  name: string;
  createdAt?: string | null;
}

export interface CreateExpenseCategoryRequest {
  name: string;
}

export interface UpdateExpenseCategoryRequest {
  name: string;
}

// Expense (Claim) - matches API DTOs
export interface ExpenseDto {
  expenseId: string;
  organizationId: string;
  employeeId: string;
  employeeName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  title: string;
  description?: string | null;
  amount: number;
  billDate: string;
  paymentMethod?: string | null;
  merchant?: string | null;
  receiptUrl?: string | null;
  status: string;
  approvedBy?: string | null;
  approvedName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateExpenseRequest {
  categoryId: string | null;
  title: string;
  description?: string | null;
  amount: number;
  billDate: string;
  paymentMethod?: string | null;
  merchant?: string | null;
  receiptUrl?: string | null;
}

export interface UpdateExpenseRequest {
  categoryId?: string | null;
  title?: string | null;
  description?: string | null;
  amount?: number | null;
  billDate?: string | null;
  paymentMethod?: string | null;
  merchant?: string | null;
  receiptUrl?: string | null;
  status?: string | null;
}

// API wrapper used by Expense controller
export interface ServiceResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

// Recurring Expense - matches API DTOs
export interface RecurringExpenseDto {
  recurringExpenseId: string;
  organizationId: string;
  employeeId: string;
  employeeName?: string | null;
  categoryId: string;
  categoryName?: string | null;
  title: string;
  description?: string | null;
  amount: number;
  rotation: string;
  dayOfMonth?: string | null;
  status: string;
  approvedBy?: string | null;
  approvedByName?: string | null;
  paymentMethod?: string | null;
  merchant?: string | null;
  receiptUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateRecurringExpenseRequest {
  categoryId: string;
  title: string;
  description?: string | null;
  amount: number;
  rotation: string;
  dayOfMonth?: string | null;
  paymentMethod?: string | null;
  merchant?: string | null;
  receiptUrl?: string | null;
}

export interface UpdateRecurringExpenseRequest {
  categoryId?: string | null;
  title?: string | null;
  description?: string | null;
  amount?: number | null;
  rotation?: string | null;
  dayOfMonth?: string | null;
  status?: string | null;
  paymentMethod?: string | null;
  merchant?: string | null;
  receiptUrl?: string | null;
}

/** Pie report item: category cost (categoryId, categoryName, totalCost). */
export interface ExpensePieReportItemDto {
  categoryId: string;
  categoryName: string;
  totalCost: number;
}

/** Line chart item: cost per month (month 1-12). */
export interface ExpenseLineChartItemDto {
  month: number;
  monthName: string;
  cost: number;
}

/** Bar chart item: cost per year. */
export interface ExpenseBarChartItemDto {
  year: number;
  cost: number;
}
