// ========== Platform Dashboard ==========
export interface PlatformDashboard {
  totalOrganizations: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  trialAccounts: number;
  totalActiveEmployees: number;
  monthlyRecurringRevenue: number;
  newOrganizationsThisMonth: number;
  totalDemoInquiries: number;
  pendingInquiries: number;
}

// ========== Organization List / Detail ==========
export interface OrganizationListItem {
  organizationId: string;
  name: string;
  industry?: string;
  country?: string;
  subscriptionPlanName?: string;
  subscriptionStatus?: string;
  subscriptionExpiryDate?: string;
  totalActiveEmployees: number;
  createdAt: string;
}

export interface OrganizationDetail {
  organizationId: string;
  name: string;
  subdomain?: string;
  industry?: string;
  country?: string;
  adminEmail?: string;
  companySize?: string;
  createdAt: string;
  subscription?: SubscriptionDetail;
  totalEmployees: number;
  activeEmployees: number;
  subscriptionHistory: SubscriptionHistoryItem[];
}

export interface SubscriptionDetail {
  subscriptionId: string;
  planId: string;
  planName: string;
  billingCycle: string;
  status: string;
  amount: number;
  startDate?: string;
  endDate?: string;
}

export interface SubscriptionHistoryItem {
  historyId: string;
  action: string;
  oldPlanName?: string;
  newPlanName?: string;
  oldEndDate?: string;
  newEndDate?: string;
  performedByName?: string;
  notes?: string;
  createdAt: string;
}

// ========== Subscription Management ==========
export interface ManageSubscriptionRequest {
  action: 'upgrade' | 'downgrade' | 'extend' | 'cancel';
  newPlanId?: string;
  newEndDate?: string;
  notes?: string;
}

// ========== Demo Inquiry ==========
export interface DemoInquiry {
  inquiryId: string;
  fullName: string;
  email: string;
  phone?: string;
  companyName?: string;
  companySize?: string;
  industry?: string;
  country?: string;
  message?: string;
  status: string;
  notes?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDemoInquiryRequest {
  fullName: string;
  email: string;
  phone?: string;
  companyName?: string;
  companySize?: string;
  industry?: string;
  country?: string;
  message?: string;
}

export interface UpdateDemoInquiryStatusRequest {
  status: string;
  notes?: string;
}

// ========== Platform Admin Auth ==========
export interface PlatformAdminLoginRequest {
  email: string;
  password: string;
}

export interface PlatformAdminAuthResponse {
  adminId: string;
  email: string;
  fullName: string;
  role: string;
  token: string;
  tokenExpiration: string;
}

// ========== Filters ==========
export interface OrganizationFilter {
  search?: string;
  status?: string;
  plan?: string;
  planId?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface DemoInquiryFilter {
  search?: string;
  status?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

// ========== API Response Wrappers ==========
export interface ApiResponse<T> {
  data?: T;
  success: boolean;
  message: string;
  errors?: string[];
}

export interface PagedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ========== Subscription Plan (reused from payment) ==========
export interface SubscriptionPlan {
  planId: string;
  name: string;
  monthlyPrice?: number;
  annualPrice?: number;
  maxUsers?: number;
  features?: Record<string, any>;
  isCustom: boolean;
  isActive: boolean;
}

// Re-export payment management models for convenience
export type {
  TransactionDto,
  TransactionDetailDto,
  TransactionFilterRequest,
  InvoiceDto,
  InvoiceFilterRequest,
  RefundDto,
  CreateRefundRequest,
  PaymentDashboardDto,
  RevenueAnalyticsDto,
  MonthlyRevenueDto,
  PlanRevenueDto,
  CycleRevenueDto
} from '@core/models/payment-management.models';
