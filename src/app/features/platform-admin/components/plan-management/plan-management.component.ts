import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { map, Subject, forkJoin, takeUntil } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SharedCommonModule } from '@shared/shared-common.module';
import {
  EntitlementAuditEntry,
  EntitlementFeature,
  EntitlementPlan,
  FeatureEntitlement
} from '@core/models/entitlement.models';
import { SuperAdminService } from '../../services/super-admin.service';
import { ArchivePlanConfirmationDialogComponent } from './archive-plan-confirmation-dialog.component';

interface FeatureModule {
  key: string;
  features: EntitlementFeature[];
}

@Component({
  selector: 'app-plan-management',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTabsModule,
    MatDialogModule
  ],
  templateUrl: './plan-management.component.html',
  styleUrls: ['./plan-management.component.scss']
})
export class PlanManagementComponent implements OnInit, OnDestroy {
  plans: EntitlementPlan[] = [];
  catalog: EntitlementFeature[] = [];
  auditEntries: EntitlementAuditEntry[] = [];
  isLoading = true;
  isSaving = false;
  editorOpen = false;
  errorMessage = '';
  successMessage = '';
  editingPlan: EntitlementPlan | null = null;
  featureValues: Record<string, FeatureEntitlement> = {};
  planName = '';
  planCode = '';
  monthlyPrice: number | null = null;
  annualPrice: number | null = null;
  currency = 'BHD';
  maxUsers: number | null = null;
  userCountType = 'active_only';
  isPublic = true;
  isRecommended = false;
  auditTenantId = '';
  auditAction = '';
  auditFrom = '';
  auditTo = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private superAdminService: SuperAdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get modules(): FeatureModule[] {
    const groups = new Map<string, EntitlementFeature[]>();
    for (const feature of this.catalog) {
      const current = groups.get(feature.moduleKey) ?? [];
      current.push(feature);
      groups.set(feature.moduleKey, current);
    }
    return [...groups.entries()].map(([key, features]) => ({ key, features }));
  }

  get activePlans(): EntitlementPlan[] {
    return this.plans.filter(plan => plan.status === 'active');
  }

  isAddOnFeature(featureKey: string): boolean {
    return featureKey === 'geo_fencing';
  }

  get selectedPlanFeatureSummary(): string[] {
    return Object.entries(this.featureValues)
      .filter(([, feature]) => feature.enabled)
      .map(([key]) => this.catalog.find(feature => feature.key === key)?.name ?? key);
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    forkJoin({
      plans: this.superAdminService.getEntitlementPlans(true),
      features: this.superAdminService.getEntitlementFeatures()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ plans, features }) => {
        if (!plans.success || !features.success || !plans.data || !features.data) {
          this.errorMessage = plans.message || features.message || 'Unable to load plans.';
        } else {
          this.plans = plans.data;
          this.catalog = features.data;
        }
        this.isLoading = false;
      },
      error: error => {
        this.errorMessage = error?.error?.message || 'Unable to load plans and feature definitions.';
        this.isLoading = false;
      }
    });
  }

  createPlan(): void {
    this.editingPlan = null;
    this.planName = '';
    this.planCode = '';
    this.monthlyPrice = 0;
    this.annualPrice = null;
    this.currency = 'BHD';
    this.maxUsers = null;
    this.userCountType = 'active_only';
    this.isPublic = true;
    this.isRecommended = false;
    this.featureValues = {};
    this.catalog.forEach(feature => this.setFeature(feature.key, false, null));
    this.editorOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  editPlan(plan: EntitlementPlan): void {
    this.editingPlan = plan;
    this.planName = plan.name;
    this.planCode = plan.code;
    this.monthlyPrice = plan.priceMonthly;
    this.annualPrice = plan.priceAnnual;
    this.currency = plan.currency;
    this.maxUsers = plan.maxUsers;
    this.userCountType = plan.userCountType;
    this.isPublic = plan.isPublic;
    this.isRecommended = plan.isRecommended;
    this.featureValues = {};
    this.catalog.forEach(feature => {
      const existing = plan.features[feature.key];
      this.setFeature(feature.key, existing?.enabled ?? false, existing?.limit ?? null);
    });
    this.editorOpen = true;
    this.errorMessage = '';
  }

  savePlan(): void {
    if (!this.planName.trim() || (!this.editingPlan && !this.planCode.trim()) || this.isSaving) {
      this.errorMessage = 'Plan name and code are required.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const features = Object.fromEntries(
      Object.entries(this.featureValues).map(([key, value]) => [key, { ...value, key }])
    );
    const commonRequest = {
      name: this.planName.trim(),
      priceMonthly: this.monthlyPrice,
      priceAnnual: this.annualPrice,
      currency: this.currency,
      maxUsers: this.maxUsers,
      userCountType: this.userCountType,
      isPublic: this.isPublic,
      isRecommended: this.isRecommended,
      features
    };

    const request$ = this.editingPlan
      ? this.superAdminService.updateEntitlementPlan(this.editingPlan.planId, {
          ...commonRequest,
          version: this.editingPlan.version
        })
      : this.superAdminService.createEntitlementPlan({
          ...commonRequest,
          code: this.planCode.trim().toLowerCase(),
          isCustom: false,
          version: 1
        }).pipe(map(response => ({ ...response, data: response.success })));

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        if (!response.success) {
          this.errorMessage = response.message || 'Unable to save plan.';
          this.isSaving = false;
          return;
        }
        this.successMessage = this.editingPlan ? 'Plan updated.' : 'Plan created.';
        this.editorOpen = false;
        this.isSaving = false;
        this.load();
      },
      error: error => {
        this.errorMessage = error?.error?.message || 'Unable to save plan.';
        this.isSaving = false;
      }
    });
  }

  duplicatePlan(plan: EntitlementPlan): void {
    const name = window.prompt('Name for the duplicate plan', `${plan.name} Copy`);
    if (!name?.trim()) return;
    const code = window.prompt('Unique plan code (lowercase letters, digits, underscores)', '');
    if (!code?.trim()) return;

    this.superAdminService.duplicateEntitlementPlan(plan.planId, name.trim(), code.trim().toLowerCase())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response.success) {
            this.successMessage = 'Plan duplicated.';
            this.load();
          } else {
            this.errorMessage = response.message || 'Unable to duplicate plan.';
          }
        },
        error: error => this.errorMessage = error?.error?.message || 'Unable to duplicate plan.'
      });
  }

  archivePlan(plan: EntitlementPlan): void {
    this.dialog.open(ArchivePlanConfirmationDialogComponent, {
      data: { planName: plan.name },
      width: '440px',
      maxWidth: 'calc(100vw - 32px)',
      ariaLabel: `Archive ${plan.name} plan`
    }).afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(confirmed => {
        if (!confirmed) return;

        this.superAdminService.archiveEntitlementPlan(plan.planId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: response => {
              if (response.success) {
                this.successMessage = 'Plan archived.';
                this.load();
              } else {
                this.errorMessage = response.message || 'Unable to archive plan.';
              }
            },
            error: error => this.errorMessage = error?.error?.message || 'Unable to archive plan.'
          });
      });
  }

  reactivatePlan(plan: EntitlementPlan): void {
    this.superAdminService.reactivateEntitlementPlan(plan.planId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response.success) {
            this.successMessage = 'Plan reactivated and available for assignment.';
            this.load();
          } else {
            this.errorMessage = response.message || 'Unable to reactivate plan.';
          }
        },
        error: error => this.errorMessage = error?.error?.message || 'Unable to reactivate plan.'
      });
  }

  setFeature(key: string, enabled: boolean, limit: number | null): void {
    const definition = this.catalog.find(feature => feature.key === key);
    this.featureValues[key] = {
      key,
      enabled,
      limit: definition?.type === 'limit' ? (limit ?? 50) : null
    };
  }

  setFeatureLimit(key: string, value: string): void {
    const parsed = value === '' ? null : Number(value);
    this.featureValues[key] = {
      key,
      enabled: this.featureValues[key]?.enabled ?? true,
      limit: parsed !== null && Number.isFinite(parsed) ? Math.max(0, parsed) : null
    };
  }

  toggleModule(module: FeatureModule, enabled: boolean): void {
    module.features.forEach(feature => this.setFeature(feature.key, enabled, this.featureValues[feature.key]?.limit ?? null));
  }

  moduleEnabled(module: FeatureModule): boolean {
    return module.features.some(feature => this.featureValues[feature.key]?.enabled);
  }

  enabledFeatures(plan: EntitlementPlan): string[] {
    return Object.entries(plan.features)
      .filter(([, feature]) => feature.enabled)
      .map(([key]) => this.catalog.find(feature => feature.key === key)?.name ?? key);
  }

  compareEnabled(plan: EntitlementPlan, featureKey: string): boolean {
    return plan.features[featureKey]?.enabled === true;
  }

  getFeatureLimit(plan: EntitlementPlan, featureKey: string): number | null {
    return plan.features[featureKey]?.limit ?? null;
  }

  loadAudit(): void {
    const filter = {
      tenantId: this.auditTenantId.trim() || undefined,
      action: this.auditAction.trim() || undefined,
      from: this.auditFrom || undefined,
      to: this.auditTo || undefined
    };
    this.superAdminService.getEntitlementAuditLogs(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response.success && response.data) {
            this.auditEntries = response.data;
            this.errorMessage = '';
          } else {
            this.errorMessage = response.message || 'Unable to load audit history.';
          }
        },
        error: error => this.errorMessage = error?.error?.message || 'Unable to load audit history.'
      });
  }

  cancelEdit(): void {
    this.editorOpen = false;
    this.editingPlan = null;
    this.errorMessage = '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
