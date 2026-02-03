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
