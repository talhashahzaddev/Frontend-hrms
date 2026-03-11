import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  ApiResponse,
  PagedResult,
  PlatformDashboard,
  OrganizationListItem,
  OrganizationDetail,
  OrganizationFilter,
  ManageSubscriptionRequest,
  SubscriptionHistoryItem,
  SubscriptionPlan
} from '../models/super-admin.models';
import {
  TransactionDto,
  TransactionDetailDto,
  TransactionFilterRequest,
  InvoiceDto,
  InvoiceFilterRequest,
  RefundDto,
  CreateRefundRequest,
  PaymentDashboardDto,
  RevenueAnalyticsDto,
  PagedResult as PaymentPagedResult
} from '@core/models/payment-management.models';

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly API_URL = `${environment.apiUrl}/SuperAdmin`;
  private readonly PAYMENT_URL = `${environment.apiUrl}/Payment`;

  constructor(private http: HttpClient) {}

  // ========== Dashboard ==========
  getDashboard(): Observable<ApiResponse<PlatformDashboard>> {
    return this.http.get<ApiResponse<PlatformDashboard>>(`${this.API_URL}/dashboard`);
  }

  // ========== Organizations ==========
  getOrganizations(filter: OrganizationFilter): Observable<ApiResponse<PagedResult<OrganizationListItem>>> {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.search) params = params.set('search', filter.search);
    if (filter.status) params = params.set('subscriptionStatus', filter.status);
    if (filter.planId) params = params.set('planId', filter.planId);
    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortDirection) params = params.set('sortDirection', filter.sortDirection);

    return this.http.get<ApiResponse<PagedResult<OrganizationListItem>>>(`${this.API_URL}/organizations`, { params });
  }

  getOrganizationDetail(organizationId: string): Observable<ApiResponse<OrganizationDetail>> {
    return this.http.get<ApiResponse<OrganizationDetail>>(`${this.API_URL}/organizations/${organizationId}`);
  }

  // ========== Subscription Management ==========
  manageSubscription(organizationId: string, request: ManageSubscriptionRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.API_URL}/organizations/${organizationId}/subscription`, request);
  }

  getSubscriptionHistory(organizationId: string): Observable<ApiResponse<SubscriptionHistoryItem[]>> {
    return this.http.get<ApiResponse<SubscriptionHistoryItem[]>>(
      `${this.API_URL}/organizations/${organizationId}/subscription-history`
    );
  }

  // ========== Subscription Plans (reuse existing payment endpoint) ==========
  getSubscriptionPlans(): Observable<ApiResponse<SubscriptionPlan[]>> {
    return this.http.get<ApiResponse<SubscriptionPlan[]>>(`${this.PAYMENT_URL}/subscription-plans`);
  }

  // ========== Payment Management (Admin) ==========

  getPaymentDashboard(): Observable<ApiResponse<PaymentDashboardDto>> {
    return this.http.get<ApiResponse<PaymentDashboardDto>>(`${this.API_URL}/payment-dashboard`);
  }

  getTransactions(filter: TransactionFilterRequest): Observable<ApiResponse<PaymentPagedResult<TransactionDto>>> {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.search) params = params.set('search', filter.search);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.gateway) params = params.set('gateway', filter.gateway);
    if (filter.dateFrom) params = params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo) params = params.set('dateTo', filter.dateTo);

    return this.http.get<ApiResponse<PaymentPagedResult<TransactionDto>>>(`${this.API_URL}/transactions`, { params });
  }

  getTransactionDetail(transactionId: string): Observable<ApiResponse<TransactionDetailDto>> {
    return this.http.get<ApiResponse<TransactionDetailDto>>(`${this.API_URL}/transactions/${transactionId}`);
  }

  getInvoices(filter: InvoiceFilterRequest): Observable<ApiResponse<PaymentPagedResult<InvoiceDto>>> {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.search) params = params.set('search', filter.search);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.dateFrom) params = params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo) params = params.set('dateTo', filter.dateTo);

    return this.http.get<ApiResponse<PaymentPagedResult<InvoiceDto>>>(`${this.API_URL}/invoices`, { params });
  }

  createRefund(request: CreateRefundRequest): Observable<ApiResponse<RefundDto>> {
    return this.http.post<ApiResponse<RefundDto>>(`${this.API_URL}/refunds`, request);
  }

  getRevenueAnalytics(months: number = 12): Observable<ApiResponse<RevenueAnalyticsDto>> {
    const params = new HttpParams().set('months', months.toString());
    return this.http.get<ApiResponse<RevenueAnalyticsDto>>(`${this.API_URL}/revenue-analytics`, { params });
  }
}
