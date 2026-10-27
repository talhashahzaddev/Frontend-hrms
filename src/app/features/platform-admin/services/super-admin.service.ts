import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
  EntitlementAuditEntry,
  EntitlementFeature,
  EntitlementPlan,
  EntitlementApiResponse,
  TenantEntitlements
} from '@core/models/entitlement.models';
import {
  GlobalRole,
  CreateGlobalRoleRequest,
  UpdateGlobalRoleRequest
} from '../models/global-role.models';
import { MenusResponse } from '../../../core/models/role.models';
import {
  InviteUserRequest,
  UserInvitation,
  UserInvitationFilter
} from '../models/user-invitation.models';
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

const unavailableEntitlementFeatureKeys = new Set(['lms', 'air_ticket_management']);

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

  getEntitlementPlans(includeArchived = false): Observable<EntitlementApiResponse<EntitlementPlan[]>> {
    return this.http.get<EntitlementApiResponse<EntitlementPlan[]>>(
      `${environment.apiUrl}/Entitlements/plans`,
      { params: { includeArchived } }
    ).pipe(map(response => ({
      ...response,
      data: response.data?.map(plan => ({
        ...plan,
        features: Object.fromEntries(
          Object.entries(plan.features).filter(([key]) => !unavailableEntitlementFeatureKeys.has(key))
        )
      }))
    })));
  }

  getEntitlementFeatures(): Observable<EntitlementApiResponse<EntitlementFeature[]>> {
    return this.http.get<EntitlementApiResponse<EntitlementFeature[]>>(
      `${environment.apiUrl}/Entitlements/features`
    ).pipe(map(response => ({
      ...response,
      data: response.data?.filter(feature => !unavailableEntitlementFeatureKeys.has(feature.key))
    })));
  }

  createEntitlementPlan(request: Record<string, unknown>): Observable<EntitlementApiResponse<string>> {
    return this.http.post<EntitlementApiResponse<string>>(`${environment.apiUrl}/Entitlements/plans`, request);
  }

  updateEntitlementPlan(planId: string, request: Record<string, unknown>): Observable<EntitlementApiResponse<boolean>> {
    return this.http.put<EntitlementApiResponse<boolean>>(
      `${environment.apiUrl}/Entitlements/plans/${planId}`,
      request
    );
  }

  duplicateEntitlementPlan(planId: string, name: string, code: string): Observable<EntitlementApiResponse<boolean>> {
    return this.http.post<EntitlementApiResponse<boolean>>(
      `${environment.apiUrl}/Entitlements/plans/${planId}/duplicate`,
      { name, code }
    );
  }

  archiveEntitlementPlan(planId: string): Observable<EntitlementApiResponse<boolean>> {
    return this.http.post<EntitlementApiResponse<boolean>>(
      `${environment.apiUrl}/Entitlements/plans/${planId}/archive`,
      {}
    );
  }

  reactivateEntitlementPlan(planId: string): Observable<EntitlementApiResponse<boolean>> {
    return this.http.post<EntitlementApiResponse<boolean>>(
      `${environment.apiUrl}/Entitlements/plans/${planId}/reactivate`,
      {}
    );
  }

  getTenantEntitlements(tenantId: string): Observable<EntitlementApiResponse<TenantEntitlements>> {
    return this.http.get<EntitlementApiResponse<TenantEntitlements>>(
      `${environment.apiUrl}/Entitlements/tenants/${tenantId}`
    );
  }

  saveTenantFeatureOverrides(
    tenantId: string,
    reason: string,
    features: Array<{ featureKey: string; enabled: boolean; limit: number | null }>
  ): Observable<EntitlementApiResponse<boolean>> {
    return this.http.put<EntitlementApiResponse<boolean>>(
      `${environment.apiUrl}/Entitlements/tenants/${tenantId}/overrides`,
      { reason, features }
    );
  }

  assignEntitlementPlan(
    tenantId: string,
    request: {
      planId: string;
      status: string;
      billingCycle: string;
      startDate?: string;
      endDate?: string;
      trialEndsAt?: string;
      customPrice?: number | null;
      customMaxUsers?: number | null;
      customCurrency?: string;
    }
  ): Observable<EntitlementApiResponse<boolean>> {
    return this.http.put<EntitlementApiResponse<boolean>>(
      `${environment.apiUrl}/Entitlements/tenants/${tenantId}/subscription`,
      request
    );
  }

  saveTenantCustomPlan(
    tenantId: string,
    request: {
      planId: string;
      status: string;
      billingCycle: string;
      startDate?: string;
      endDate?: string;
      trialEndsAt?: string;
      customPrice: number | null;
      customMaxUsers: number | null;
      customCurrency: string;
      reason: string;
      features: Array<{ featureKey: string; enabled: boolean; limit: number | null }>;
    }
  ): Observable<EntitlementApiResponse<boolean>> {
    return this.http.put<EntitlementApiResponse<boolean>>(
      `${environment.apiUrl}/Entitlements/tenants/${tenantId}/custom-plan`,
      request
    );
  }

  getEntitlementAuditLogs(filter: {
    tenantId?: string;
    from?: string;
    to?: string;
    action?: string;
  }): Observable<EntitlementApiResponse<EntitlementAuditEntry[]>> {
    return this.http.get<EntitlementApiResponse<EntitlementAuditEntry[]>>(
      `${environment.apiUrl}/Entitlements/audit`,
      { params: { ...filter } }
    );
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

  // ========== Global Role Menus ==========

  /** GET /SuperAdmin/menus - Retrieve all menus, submenus and their actions for global roles */
  getMenus(): Observable<MenusResponse> {
    return this.http.get<MenusResponse>(`${this.API_URL}/menus`);
  }

  // ========== Global Roles ==========

  /** GET /SuperAdmin/global-roles */
  getGlobalRoles(): Observable<GlobalRole[]> {
    return this.http.get<ApiResponse<GlobalRole[]>>(`${this.API_URL}/global-roles`)
      .pipe(map(res => res.data ?? []));
  }

  /** POST /SuperAdmin/create-global-role */
  createGlobalRole(payload: CreateGlobalRoleRequest): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/create-global-role`, payload)
      .pipe(map(res => res.data));
  }

  /** PUT /SuperAdmin/update-global-role */
  updateGlobalRole(roleId: string, payload: CreateGlobalRoleRequest): Observable<any> {
    const body: UpdateGlobalRoleRequest = { ...payload, roleId };
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/update-global-role`, body)
      .pipe(map(res => res.data));
  }

  /** DELETE /SuperAdmin/delete-global-role/{roleId} */
  deleteGlobalRole(roleId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.API_URL}/delete-global-role/${roleId}`)
      .pipe(map(res => res.data ?? false));
  }

  // ========== User Invitations ==========

  /** POST /SuperAdmin/invite-user */
  inviteUser(request: InviteUserRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.API_URL}/invite-user`, request);
  }

  /** GET /SuperAdmin/invitations */
  getInvitations(filter: UserInvitationFilter): Observable<ApiResponse<PagedResult<UserInvitation>>> {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.search) params = params.set('search', filter.search);
    if (filter.status) params = params.set('status', filter.status);

    return this.http.get<ApiResponse<PagedResult<UserInvitation>>>(`${this.API_URL}/invitations`, { params });
  }

  /** POST /SuperAdmin/invitations/{id}/resend */
  resendInvitation(invitationId: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.API_URL}/invitations/${invitationId}/resend`, {});
  }

  /** DELETE /SuperAdmin/invitations/{id} */
  deleteInvitation(invitationId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.API_URL}/invitations/${invitationId}`);
  }
}
