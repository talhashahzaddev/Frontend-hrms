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
}
