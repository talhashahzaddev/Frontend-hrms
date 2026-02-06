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
  ServiceResponse
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
}
