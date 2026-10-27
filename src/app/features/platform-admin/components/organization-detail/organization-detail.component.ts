import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SuperAdminService } from '../../services/super-admin.service';
import { OrganizationDetail, SubscriptionHistoryItem } from '../../models/super-admin.models';
import { ManageSubscriptionDialogComponent } from '../manage-subscription-dialog/manage-subscription-dialog.component';
import {
  EntitlementFeature,
  EntitlementPlan,
  FeatureEntitlement,
  TenantEntitlements
} from '@core/models/entitlement.models';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-organization-detail',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './organization-detail.component.html',
  styleUrls: ['./organization-detail.component.scss']
})
export class OrganizationDetailComponent implements OnInit, OnDestroy {
  orgId!: string;
  org: OrganizationDetail | null = null;
  isLoading = true;
  errorMessage = '';

  historyColumns = ['action', 'oldPlan', 'newPlan', 'performedBy', 'createdAt'];
  subscriptionHistory: SubscriptionHistoryItem[] = [];
  tenantEntitlements: TenantEntitlements | null = null;
  entitlementPlans: EntitlementPlan[] = [];
  entitlementFeatures: EntitlementFeature[] = [];
  customFeatures: Record<string, FeatureEntitlement> = {};
  basePlanId = '';
  customPrice: number | null = null;
  customMaxUsers: number | null = null;
  customCurrency = 'BHD';
  customReason = '';
  customStatus = 'active';
  customBillingCycle = 'monthly';
  customEndDate = '';
  customTrialEndDate = '';
  isEntitlementLoading = false;
  isCustomPlanSaving = false;
  entitlementError = '';
  entitlementSuccess = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private superAdminService: SuperAdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.orgId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.orgId) {
      this.router.navigate(['/platform-admin/organizations']);
      return;
    }
    this.loadOrganization();
  }

  loadOrganization(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.superAdminService.getOrganizationDetail(this.orgId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.org = res.data;
            this.subscriptionHistory = res.data.subscriptionHistory || [];
            this.loadEntitlementData();
          } else {
            this.errorMessage = 'Organization not found.';
          }
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load organization details.';
          this.isLoading = false;
        }
      });
  }

  loadEntitlementData(): void {
    this.isEntitlementLoading = true;
    this.entitlementError = '';
    forkJoin({
      tenant: this.superAdminService.getTenantEntitlements(this.orgId),
      plans: this.superAdminService.getEntitlementPlans(false),
      features: this.superAdminService.getEntitlementFeatures()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ tenant, plans, features }) => {
        const tenantData = tenant.data;
        if (!tenant.success || !tenantData || !plans.success || !plans.data || !features.success || !features.data) {
          this.entitlementError = tenant.message || plans.message || features.message || 'Unable to load plan entitlements.';
          this.isEntitlementLoading = false;
          return;
        }

        this.tenantEntitlements = tenantData;
        this.entitlementPlans = plans.data;
        this.entitlementFeatures = features.data;
        const currentPlanIsAssignable = plans.data.some(plan =>
          plan.planId === tenantData.planId && plan.status === 'active'
        );
        this.basePlanId = currentPlanIsAssignable
          ? tenantData.planId || ''
          : (plans.data.find(plan => plan.isRecommended)?.planId || plans.data[0]?.planId || '');
        const selectedBasePlan = plans.data.find(plan => plan.planId === this.basePlanId);
        this.customPrice = currentPlanIsAssignable
          ? tenantData.priceMonthly ?? null
          : selectedBasePlan?.priceMonthly ?? null;
        this.customMaxUsers = currentPlanIsAssignable
          ? tenantData.maxUsers
          : selectedBasePlan?.maxUsers ?? null;
        this.customCurrency = currentPlanIsAssignable
          ? tenantData.currency || 'BHD'
          : selectedBasePlan?.currency || 'BHD';
        this.customStatus = tenantData.subscriptionStatus;
        this.customBillingCycle = tenantData.billingCycle || 'monthly';
        this.customEndDate = tenantData.endDate ? tenantData.endDate.slice(0, 10) : '';
        this.customTrialEndDate = tenantData.trialEndsAt ? tenantData.trialEndsAt.slice(0, 10) : '';
        this.copyEffectiveFeatures(currentPlanIsAssignable
          ? tenantData.features
          : selectedBasePlan?.features ?? {});
        this.isEntitlementLoading = false;
      },
      error: error => {
        this.entitlementError = error?.error?.message || 'Unable to load plan entitlements.';
        this.isEntitlementLoading = false;
      }
    });
  }

  onBasePlanChange(planId: string): void {
    this.basePlanId = planId;
    const plan = this.selectedBasePlan;
    if (!plan) return;

    this.copyEffectiveFeatures(plan.features);
    this.customPrice = plan.priceMonthly;
    this.customMaxUsers = plan.maxUsers;
    this.customCurrency = plan.currency;
    this.entitlementError = '';
  }

  get selectedBasePlan(): EntitlementPlan | undefined {
    return this.entitlementPlans.find(plan => plan.planId === this.basePlanId);
  }

  get customFeatureDiff(): Array<{ featureKey: string; enabled: boolean; limit: number | null }> {
    const baseFeatures = this.selectedBasePlan?.features ?? {};
    return this.entitlementFeatures.flatMap(feature => {
      const base = baseFeatures[feature.key] ?? { enabled: false, limit: null };
      const custom = this.customFeatures[feature.key] ?? { enabled: false, limit: null };
      if (base.enabled === custom.enabled && base.limit === custom.limit) return [];
      return [{ featureKey: feature.key, enabled: custom.enabled, limit: custom.limit }];
    });
  }

  get featureGroups(): Array<{ moduleKey: string; features: EntitlementFeature[] }> {
    const groups = new Map<string, EntitlementFeature[]>();
    this.entitlementFeatures.forEach(feature => {
      const group = groups.get(feature.moduleKey) ?? [];
      group.push(feature);
      groups.set(feature.moduleKey, group);
    });
    return Array.from(groups, ([moduleKey, features]) => ({ moduleKey, features }));
  }

  get hasPlanDowngrade(): boolean {
    const baseFeatures = this.selectedBasePlan?.features ?? {};
    return this.entitlementFeatures.some(feature => {
      const current = this.tenantEntitlements?.features[feature.key];
      const requested = this.customFeatures[feature.key];
      const removesFeature = current?.enabled === true &&
        !baseFeatures[feature.key]?.enabled &&
        !requested?.enabled;
      const lowersLimit = current?.enabled === true &&
        requested?.enabled === true &&
        (current.limit === null
          ? requested.limit !== null
          : requested.limit !== null && requested.limit < current.limit);
      return removesFeature || lowersLimit;
    }) || (this.customMaxUsers !== null && this.tenantEntitlements !== null &&
      (this.tenantEntitlements.maxUsers === null ||
        this.customMaxUsers < this.tenantEntitlements.maxUsers));
  }

  setCustomFeature(featureKey: string, enabled: boolean): void {
    const feature = this.customFeatures[featureKey] ?? { enabled: false, limit: null };
    this.customFeatures[featureKey] = {
      ...feature,
      enabled,
      limit: enabled && feature.limit === null && featureKey === 'ai_assistant' ? 50 : feature.limit
    };
  }

  setCustomLimit(featureKey: string, value: string): void {
    const limit = value === '' ? null : Number(value);
    this.customFeatures[featureKey] = {
      key: featureKey,
      enabled: this.customFeatures[featureKey]?.enabled ?? true,
      limit: limit !== null && Number.isFinite(limit) ? Math.max(0, limit) : null
    };
  }

  saveCustomPlan(): void {
    if (!this.selectedBasePlan || !this.customReason.trim() || this.isCustomPlanSaving) {
      if (!this.selectedBasePlan) {
        this.entitlementError = 'Choose an available active base plan before saving.';
        return;
      }

      this.entitlementError = 'Choose a base plan and provide a reason for the custom changes.';
      return;
    }

    if (this.hasPlanDowngrade && !window.confirm('This change removes access or exceeds the user limit. Continue?')) {
      return;
    }

    this.isCustomPlanSaving = true;
    this.entitlementError = '';
    this.entitlementSuccess = '';
    this.superAdminService.saveTenantCustomPlan(this.orgId, {
      planId: this.basePlanId,
      status: this.customStatus,
      billingCycle: this.customBillingCycle,
      endDate: this.customEndDate ? new Date(this.customEndDate).toISOString() : undefined,
      trialEndsAt: this.customTrialEndDate ? new Date(this.customTrialEndDate).toISOString() : undefined,
      customPrice: this.customPrice === this.selectedBasePlan?.priceMonthly ? null : this.customPrice,
      customMaxUsers: this.customMaxUsers === this.selectedBasePlan?.maxUsers ? null : this.customMaxUsers,
      customCurrency: this.customCurrency,
      reason: this.customReason.trim(),
      features: this.customFeatureDiff
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        if (!response.success) {
          this.entitlementError = response.message || 'Unable to save tenant plan.';
          this.isCustomPlanSaving = false;
          return;
        }
        this.entitlementSuccess = 'Tenant plan and feature overrides saved.';
        this.customReason = '';
        this.isCustomPlanSaving = false;
        this.loadOrganization();
      },
      error: error => {
        this.entitlementError = error?.error?.message || 'Unable to save tenant plan.';
        this.isCustomPlanSaving = false;
      }
    });
  }

  openManageSubscription(): void {
    if (!this.org) return;

    const dialogRef = this.dialog.open(ManageSubscriptionDialogComponent, {
      width: '520px',
      data: {
        organizationId: this.orgId,
        organizationName: this.org.name,
        currentSubscription: this.org.subscription
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result === 'success') {
          this.loadOrganization();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/platform-admin/organizations']);
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: '#4caf50',
      trial: '#9c27b0',
      expired: '#f44336',
      cancelled: '#757575',
      pending: '#ff9800'
    };
    return colors[status?.toLowerCase()] || '#bdbdbd';
  }

  getActionColor(action: string): string {
    const colors: Record<string, string> = {
      upgrade: '#4caf50',
      downgrade: '#ff9800',
      extend: '#2196f3',
      cancel: '#f44336',
      create: '#9c27b0'
    };
    return colors[action?.toLowerCase()] || '#757575';
  }

  private copyEffectiveFeatures(features: Record<string, FeatureEntitlement>): void {
    this.customFeatures = {};
    this.entitlementFeatures.forEach(feature => {
      const value = features[feature.key];
      this.customFeatures[feature.key] = {
        key: feature.key,
        enabled: value?.enabled ?? false,
        limit: value?.limit ?? null
      };
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
