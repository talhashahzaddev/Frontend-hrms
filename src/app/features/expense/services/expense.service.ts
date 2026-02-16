import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  ExpenseCategoryDto,
  CreateExpenseCategoryRequest,
  UpdateExpenseCategoryRequest,
  ExpenseDto,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  ServiceResponse,
  RecurringExpenseDto,
  CreateRecurringExpenseRequest,
  UpdateRecurringExpenseRequest,
  ExpensePieReportItemDto,
  ExpenseLineChartItemDto,
  ExpenseBarChartItemDto
} from '../../../core/models/expense.models';
import { PagedResult } from '../../../core/models/common.models';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private readonly apiUrl = `${environment.apiUrl}/Expense`;
  private readonly uploadsUrl = `${environment.apiUrl}/uploads`;

  constructor(private http: HttpClient) {}

  getExpenseCategories(): Observable<ExpenseCategoryDto[]> {
    return this.http
      .get<ServiceResponse<ExpenseCategoryDto[]>>(`${this.apiUrl}/categories`)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) return [];
          return res.data;
        })
      );
  }

  getExpenseCategoryById(id: string): Observable<ExpenseCategoryDto | null> {
    return this.http
      .get<ServiceResponse<ExpenseCategoryDto>>(`${this.apiUrl}/categories/${id}`)
      .pipe(
        map((res) => (res.success && res.data ? res.data : null))
      );
  }

  createExpenseCategory(request: CreateExpenseCategoryRequest): Observable<ExpenseCategoryDto> {
    return this.http
      .post<ServiceResponse<ExpenseCategoryDto>>(`${this.apiUrl}/categories`, request)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to create expense category');
          }
          return res.data;
        })
      );
  }

  updateExpenseCategory(id: string, request: UpdateExpenseCategoryRequest): Observable<ExpenseCategoryDto> {
    return this.http
      .put<ServiceResponse<ExpenseCategoryDto>>(`${this.apiUrl}/categories/${id}`, request)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to update expense category');
          }
          return res.data;
        })
      );
  }

  deleteExpenseCategory(id: string): Observable<boolean> {
    return this.http
      .delete<ServiceResponse<boolean>>(`${this.apiUrl}/categories/${id}`)
      .pipe(
        map((res) => res.success && res.data === true)
      );
  }

  // Claims (expenses) - Get my expenses (paged), CRUD
  getMyExpenses(pageNumber: number = 1, pageSize: number = 10): Observable<PagedResult<ExpenseDto>> {
    const params: Record<string, string> = {
      pageNumber: String(pageNumber),
      pageSize: String(pageSize)
    };
    return this.http
      .get<ServiceResponse<PagedResult<ExpenseDto>>>(`${this.apiUrl}/expenses/me`, { params })
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            return { data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false };
          }
          return res.data;
        })
      );
  }

  /** Get all expenses (Super Admin) with pagination. Optional: employeeId, status. */
  getExpenses(
    employeeId?: string | null,
    status?: string | null,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedResult<ExpenseDto>> {
    const params: Record<string, string> = {
      pageNumber: String(pageNumber),
      pageSize: String(pageSize)
    };
    if (employeeId != null && employeeId !== '') params['employeeId'] = employeeId;
    if (status != null && status !== '') params['status'] = status;
    return this.http
      .get<ServiceResponse<PagedResult<ExpenseDto>>>(`${this.apiUrl}/expenses`, { params })
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            return { data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false };
          }
          return res.data;
        })
      );
  }

  getExpenseById(id: string): Observable<ExpenseDto | null> {
    return this.http
      .get<ServiceResponse<ExpenseDto>>(`${this.apiUrl}/expenses/${id}`)
      .pipe(
        map((res) => (res.success && res.data ? res.data : null))
      );
  }

  createExpense(request: CreateExpenseRequest): Observable<ExpenseDto> {
    return this.http
      .post<ServiceResponse<ExpenseDto>>(`${this.apiUrl}/expenses`, request)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to create expense');
          }
          return res.data;
        })
      );
  }

  /** Approve or reject a claim (Super Admin). Action: 'approve' | 'reject'. */
  requestAction(expenseId: string, action: 'approve' | 'reject'): Observable<ExpenseDto> {
    return this.http
      .put<ServiceResponse<ExpenseDto>>(`${this.apiUrl}/expenses/${expenseId}/request-action`, { action })
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || `Failed to ${action} claim`);
          }
          return res.data;
        })
      );
  }

  updateExpense(id: string, request: UpdateExpenseRequest): Observable<ExpenseDto> {
    return this.http
      .put<ServiceResponse<ExpenseDto>>(`${this.apiUrl}/expenses/${id}`, request)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to update expense');
          }
          return res.data;
        })
      );
  }

  deleteExpense(id: string): Observable<boolean> {
    return this.http
      .delete<ServiceResponse<boolean>>(`${this.apiUrl}/expenses/${id}`)
      .pipe(
        map((res) => res.success && res.data === true)
      );
  }

  /** Upload receipt file through uploads API; returns the hosted URL. */
  uploadReceipt(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string }>(`${this.uploadsUrl}/files`, formData).pipe(
      map((res) => {
        if (!res?.url) {
          throw new Error('Upload failed');
        }
        return res.url;
      })
    );
  }

  // ==================== Recurring Expenses ====================
  /** Get my recurring expenses (paged). Super Admin & HR Manager. */
  getMyRecurringExpenses(pageNumber: number = 1, pageSize: number = 10): Observable<PagedResult<RecurringExpenseDto>> {
    const params: Record<string, string> = {
      pageNumber: String(pageNumber),
      pageSize: String(pageSize)
    };
    return this.http
      .get<ServiceResponse<PagedResult<RecurringExpenseDto>>>(`${this.apiUrl}/recurring/me`, { params })
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            return { data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false };
          }
          return res.data;
        })
      );
  }

  /** Get all recurring expenses (Super Admin only). Optional: employeeId, status. */
  getRecurringExpenses(
    employeeId?: string | null,
    status?: string | null,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedResult<RecurringExpenseDto>> {
    const params: Record<string, string> = {
      pageNumber: String(pageNumber),
      pageSize: String(pageSize)
    };
    if (employeeId != null && employeeId !== '') params['employeeId'] = employeeId;
    if (status != null && status !== '') params['status'] = status;
    return this.http
      .get<ServiceResponse<PagedResult<RecurringExpenseDto>>>(`${this.apiUrl}/recurring`, { params })
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            return { data: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false };
          }
          return res.data;
        })
      );
  }

  getRecurringExpenseById(id: string): Observable<RecurringExpenseDto | null> {
    return this.http
      .get<ServiceResponse<RecurringExpenseDto>>(`${this.apiUrl}/recurring/${id}`)
      .pipe(
        map((res) => (res.success && res.data ? res.data : null))
      );
  }

  /** Approve or reject a recurring expense (Super Admin). */
  recurringRequestAction(recurringExpenseId: string, action: 'approve' | 'reject'): Observable<RecurringExpenseDto> {
    return this.http
      .put<ServiceResponse<RecurringExpenseDto>>(`${this.apiUrl}/recurring/${recurringExpenseId}/request-action`, { action })
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || `Failed to ${action} recurring expense`);
          }
          return res.data;
        })
      );
  }

  createRecurringExpense(request: CreateRecurringExpenseRequest): Observable<RecurringExpenseDto> {
    return this.http
      .post<ServiceResponse<RecurringExpenseDto>>(`${this.apiUrl}/recurring`, request)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to create recurring expense');
          }
          return res.data;
        })
      );
  }

  updateRecurringExpense(id: string, request: UpdateRecurringExpenseRequest): Observable<RecurringExpenseDto> {
    return this.http
      .put<ServiceResponse<RecurringExpenseDto>>(`${this.apiUrl}/recurring/${id}`, request)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to update recurring expense');
          }
          return res.data;
        })
      );
  }

  deleteRecurringExpense(id: string): Observable<boolean> {
    return this.http
      .delete<ServiceResponse<boolean>>(`${this.apiUrl}/recurring/${id}`)
      .pipe(
        map((res) => res.success && res.data === true)
      );
  }

  /**
   * Get expense pie report (Super Admin): category-wise cost.
   * Optional: fromDate, toDate (ISO date string); expense, recurring (boolean).
   * If no dates, API uses current year.
   */
  getExpensePieReport(params: {
    fromDate?: string | null;
    toDate?: string | null;
    expense?: boolean | null;
    recurring?: boolean | null;
  } = {}): Observable<ExpensePieReportItemDto[]> {
    const queryParams: Record<string, string> = {};
    if (params.fromDate != null && params.fromDate !== '') queryParams['fromDate'] = params.fromDate;
    if (params.toDate != null && params.toDate !== '') queryParams['toDate'] = params.toDate;
    if (params.expense != null) queryParams['expense'] = String(params.expense);
    if (params.recurring != null) queryParams['recurring'] = String(params.recurring);

    return this.http
      .get<ServiceResponse<ExpensePieReportItemDto[]>>(`${this.apiUrl}/pie-report`, { params: queryParams })
      .pipe(
        map((res) => {
          if (!res.success || !res.data) return [];
          return res.data;
        })
      );
  }

  /**
   * Get expense line chart (Super Admin): cost per month for a year.
   * Params: year (optional, default current), expense, recurring (boolean).
   */
  getExpenseLineChart(params: {
    year?: number | null;
    expense?: boolean;
    recurring?: boolean;
  } = {}): Observable<ExpenseLineChartItemDto[]> {
    const queryParams: Record<string, string> = {};
    if (params.year != null) queryParams['year'] = String(params.year);
    if (params.expense != null) queryParams['expense'] = String(params.expense);
    if (params.recurring != null) queryParams['recurring'] = String(params.recurring);

    return this.http
      .get<ServiceResponse<ExpenseLineChartItemDto[]>>(`${this.apiUrl}/line-chart`, { params: queryParams })
      .pipe(
        map((res) => {
          if (!res.success || !res.data) return [];
          return res.data;
        })
      );
  }

  /**
   * Get expense bar chart (Super Admin): cost per year for last N years.
   * Params: years (optional, default 5), expense, recurring (boolean).
   */
  getExpenseBarChart(params: {
    years?: number | null;
    expense?: boolean;
    recurring?: boolean;
  } = {}): Observable<ExpenseBarChartItemDto[]> {
    const queryParams: Record<string, string> = {};
    if (params.years != null) queryParams['years'] = String(params.years);
    if (params.expense != null) queryParams['expense'] = String(params.expense);
    if (params.recurring != null) queryParams['recurring'] = String(params.recurring);

    return this.http
      .get<ServiceResponse<ExpenseBarChartItemDto[]>>(`${this.apiUrl}/bar-chart`, { params: queryParams })
      .pipe(
        map((res) => {
          if (!res.success || !res.data) return [];
          return res.data;
        })
      );
  }
}
