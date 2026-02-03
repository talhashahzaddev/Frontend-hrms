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

  // Claims (expenses) - Get my expenses, CRUD
  getMyExpenses(): Observable<ExpenseDto[]> {
    return this.http
      .get<ServiceResponse<ExpenseDto[]>>(`${this.apiUrl}/expenses/me`)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) return [];
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
