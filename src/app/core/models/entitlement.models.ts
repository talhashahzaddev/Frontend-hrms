export interface FeatureEntitlement {
  key: string;
  enabled: boolean;
  limit: number | null;
}

export interface TenantEntitlements {
  planCode: string;
  planId?: string;
  subscriptionStatus: string;
  maxUsers: number | null;
  priceMonthly?: number | null;
  currency?: string;
  startDate?: string | null;
  endDate?: string | null;
  trialEndsAt?: string | null;
  billingCycle?: string;
  userCountType: string;
  userCount: number;
  isReadOnly: boolean;
  aiQueriesUsedThisMonth?: number;
  aiQueriesRemaining?: number | null;
  features: Record<string, FeatureEntitlement>;
}

export interface EntitlementFeature {
  featureId: string;
  key: string;
  name: string;
  moduleKey: string;
  description?: string;
  type: 'boolean' | 'limit';
  isActive: boolean;
}

export interface EntitlementPlan {
  planId: string;
  name: string;
  code: string;
  priceMonthly: number | null;
  priceAnnual: number | null;
  currency: string;
  maxUsers: number | null;
  userCountType: string;
  isCustom: boolean;
  isPublic: boolean;
  isRecommended: boolean;
  status: string;
  version: number;
  features: Record<string, FeatureEntitlement>;
}

export interface EntitlementAuditEntry {
  auditId: string;
  tenantId: string | null;
  actor: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  beforeState: string | null;
  afterState: string | null;
  createdAt: string;
}

export interface EntitlementApiResponse<T> {
  data?: T;
  success: boolean;
  message: string;
  errors?: string[];
}
