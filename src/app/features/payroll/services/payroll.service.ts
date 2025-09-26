import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  PayrollSummary,
  PayrollPeriod,
  PayrollEntry,
  PayrollStatus,
  CreatePayrollPeriodRequest,
  UpdatePayrollPeriodRequest,
  ProcessPayrollRequest,
  PayrollFilter,
  PayrollReportFilter,
  Payslip
} from '../../../core/models/payroll.models';
import { ApiResponse, PaginatedResponse, PagedResult } from '../../../core/models/common.models';

@Injectable({
  providedIn: 'root'
})
export class PayrollService {
  private apiUrl = environment.apiUrl;
  private payrollSummarySubject = new BehaviorSubject<PayrollSummary | null>(null);

  public payrollSummary$ = this.payrollSummarySubject.asObservable();

  constructor(private http: HttpClient) {}

  // Payroll Dashboard
  getPayrollSummary(): Observable<ApiResponse<PayrollSummary>> {
    return this.http.get<ApiResponse<PayrollSummary>>(`${this.apiUrl}/payroll/summary`);
  }

  refreshPayrollSummary(): void {
    this.getPayrollSummary().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.payrollSummarySubject.next(response.data);
        }
      },
      error: (error) => {
        console.error('Error refreshing payroll summary:', error);
      }
    });
  }

  // Payroll Periods Management
  getPayrollPeriods(page: number = 1, limit: number = 20, search?: string): Observable<ApiResponse<PayrollPeriod[]>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<ApiResponse<PayrollPeriod[]>>(`${this.apiUrl}/payroll/periods`, { params });
  }

  getCurrentPayrollPeriod(): Observable<ApiResponse<PayrollPeriod>> {
    return this.http.get<ApiResponse<PayrollPeriod>>(`${this.apiUrl}/payroll/periods/current`);
  }

  getPayrollPeriodById(id: string): Observable<ApiResponse<PayrollPeriod>> {
    return this.http.get<ApiResponse<PayrollPeriod>>(`${this.apiUrl}/payroll/periods/${id}`);
  }

  createPayrollPeriod(request: CreatePayrollPeriodRequest): Observable<ApiResponse<PayrollPeriod>> {
    return this.http.post<ApiResponse<PayrollPeriod>>(`${this.apiUrl}/payroll/periods`, request);
  }

  updatePayrollPeriod(id: string, request: UpdatePayrollPeriodRequest): Observable<ApiResponse<PayrollPeriod>> {
    return this.http.put<ApiResponse<PayrollPeriod>>(`${this.apiUrl}/payroll/periods/${id}`, request);
  }

  deletePayrollPeriod(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/payroll/periods/${id}`);
  }

  // Payroll Entries Management
  getPayrollEntries(filter?: PayrollFilter, page: number = 1, limit: number = 20): Observable<ApiResponse<PagedResult<PayrollEntry>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filter) {
      if (filter.payrollPeriodId) params = params.set('payrollPeriodId', filter.payrollPeriodId);
      if (filter.employeeId) params = params.set('employeeId', filter.employeeId);
      if (filter.department) params = params.set('department', filter.department);
      if (filter.status) params = params.set('status', filter.status);
      if (filter.search) params = params.set('search', filter.search);
    }

    return this.http.get<ApiResponse<PagedResult<PayrollEntry>>>(`${this.apiUrl}/payroll/entries`, { params });
  }

  getPayrollEntriesByEmployee(employeeId: string, page: number = 1, limit: number = 10): Observable<ApiResponse<PagedResult<PayrollEntry>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<PagedResult<PayrollEntry>>>(`${this.apiUrl}/payroll/employees/${employeeId}/entries`, { params });
  }

  getPayrollEntryById(id: string): Observable<ApiResponse<PayrollEntry>> {
    return this.http.get<ApiResponse<PayrollEntry>>(`${this.apiUrl}/payroll/entries/${id}`);
  }

  // Payroll Processing
  processPayroll(request: ProcessPayrollRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/payroll/process`, request);
  }

  approvePayrollEntry(entryId: string): Observable<ApiResponse<PayrollEntry>> {
    return this.http.put<ApiResponse<PayrollEntry>>(`${this.apiUrl}/payroll/entries/${entryId}/approve`, {});
  }

  approveMultiplePayrollEntries(entryIds: string[]): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/payroll/entries/approve-multiple`, { entryIds });
  }

  rejectPayrollEntry(entryId: string, reason: string): Observable<ApiResponse<PayrollEntry>> {
    return this.http.put<ApiResponse<PayrollEntry>>(`${this.apiUrl}/payroll/entries/${entryId}/reject`, { reason });
  }

  markPayrollEntryAsPaid(entryId: string): Observable<ApiResponse<PayrollEntry>> {
    return this.http.put<ApiResponse<PayrollEntry>>(`${this.apiUrl}/payroll/entries/${entryId}/mark-paid`, {});
  }

  markMultiplePayrollEntriesAsPaid(entryIds: string[]): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/payroll/entries/mark-paid-multiple`, { entryIds });
  }

  // Payroll Reports
  generatePayrollReport(filter?: PayrollReportFilter): Observable<ApiResponse<any>> {
    let params = new HttpParams();

    if (filter) {
      if (filter.payrollPeriodId) params = params.set('payrollPeriodId', filter.payrollPeriodId);
      if (filter.startDate) params = params.set('startDate', filter.startDate);
      if (filter.endDate) params = params.set('endDate', filter.endDate);
      if (filter.department) params = params.set('department', filter.department);
      if (filter.status) params = params.set('status', filter.status);
    }

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/payroll/reports`, { params });
  }

  exportPayrollReport(filter?: PayrollReportFilter, format: 'pdf' | 'excel' = 'pdf'): Observable<Blob> {
    let params = new HttpParams().set('format', format);

    if (filter) {
      if (filter.payrollPeriodId) params = params.set('payrollPeriodId', filter.payrollPeriodId);
      if (filter.startDate) params = params.set('startDate', filter.startDate);
      if (filter.endDate) params = params.set('endDate', filter.endDate);
      if (filter.department) params = params.set('department', filter.department);
      if (filter.status) params = params.set('status', filter.status);
    }

    return this.http.get(`${this.apiUrl}/payroll/reports/export`, {
      params,
      responseType: 'blob'
    });
  }

  generatePayslips(payrollPeriodId: string, employeeIds?: string[]): Observable<ApiResponse<any>> {
    const body: any = { payrollPeriodId };
    if (employeeIds && employeeIds.length > 0) {
      body.employeeIds = employeeIds;
    }

    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/payroll/generate-payslips`, body);
  }

  downloadPayslip(payrollEntryId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/payroll/entries/${payrollEntryId}/payslip`, {
      responseType: 'blob'
    });
  }

  emailPayslips(payrollPeriodId: string, employeeIds?: string[]): Observable<ApiResponse<any>> {
    const body: any = { payrollPeriodId };
    if (employeeIds && employeeIds.length > 0) {
      body.employeeIds = employeeIds;
    }

    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/payroll/email-payslips`, body);
  }

  // Payroll Statistics
  getPayrollStatistics(startDate?: string, endDate?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();

    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/payroll/statistics`, { params });
  }

  getDepartmentPayrollBreakdown(payrollPeriodId?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();

    if (payrollPeriodId) params = params.set('payrollPeriodId', payrollPeriodId);

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/payroll/department-breakdown`, { params });
  }

  // Tax and Deductions
  calculateTaxDeductions(employeeId: string, grossPay: number, payrollPeriodId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/payroll/calculate-tax`, {
      employeeId,
      grossPay,
      payrollPeriodId
    });
  }

  getDeductionSummary(payrollPeriodId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/payroll/periods/${payrollPeriodId}/deduction-summary`);
  }

  // Employee-specific endpoints
  getMyLatestPayslip(): Observable<ApiResponse<Payslip>> {
    return this.http.get<ApiResponse<Payslip>>(`${this.apiUrl}/payroll/my-payslip/latest`);
  }

  // Dashboard Refresh
  refreshDashboardData(): void {
    this.refreshPayrollSummary();
  }

  // Utility Methods
  calculateNetPay(entry: PayrollEntry): number {
    const grossPay = entry.basicSalary + this.sumObjectValues(entry.allowances) + entry.overtimeAmount + entry.bonusAmount;
    const totalDeductions = this.sumObjectValues(entry.deductions) + entry.taxAmount + entry.otherDeductions;
    return grossPay - totalDeductions;
  }

  private sumObjectValues(obj: { [key: string]: number }): number {
    return Object.values(obj || {}).reduce((sum, value) => sum + (value || 0), 0);
  }

  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  getPayrollStatusColor(status: PayrollStatus): string {
    switch (status) {
      case PayrollStatus.DRAFT:
        return '#6b7280';
      case PayrollStatus.PROCESSING:
        return '#d97706';
      case PayrollStatus.PROCESSED:
        return '#2563eb';
      case PayrollStatus.APPROVED:
        return '#059669';
      case PayrollStatus.PAID:
        return '#16a34a';
      default:
        return '#6b7280';
    }
  }
}
