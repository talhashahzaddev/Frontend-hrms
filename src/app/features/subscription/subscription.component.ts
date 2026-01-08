import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, forkJoin, catchError } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PaymentService, SubscriptionPlanDto } from '@core/services/payment.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  monthlyPrice?: number;
  annualPrice?: number;
  pricePeriod: string;
  description: string;
  features: string[];
  isPopular: boolean;
  isCustom: boolean;
  isCurrentPlan?: boolean;
  isExpired?: boolean;
}

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.scss']
})
export class SubscriptionComponent implements OnInit, OnDestroy {
  billingCycle: 'monthly' | 'annual' = 'monthly';
  plans: PricingPlan[] = [];
  allPlans: PricingPlan[] = [];
  displayedPlans: PricingPlan[] = [];
  currentIndex: number = 0;
  itemsPerPage: number = 3;
  isLoading: boolean = true;
  error: string | null = null;
  activePlanId: string | null = null;
  activeBillingCycle: string | null = null;
  isSubscriptionExpired: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private paymentService: PaymentService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.loadSubscriptionPlans();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isSuperAdmin(): boolean {
    return this.authService.hasRole('Super Admin');
  }

  loadSubscriptionPlans(): void {
    this.isLoading = true;
    this.error = null;

    const plans$ = this.paymentService.getActiveSubscriptionPlans();

    // Pass a dummy ID because the backend overwrites it with the logged-in user's organizationId
    const subscriptions$ = this.paymentService.getCompanySubscriptionDetailsByCompanyId('00000000-0000-0000-0000-000000000000')
      .pipe(
        catchError(err => {
          console.error('Error fetching subscriptions or not authorized:', err);
          return []; // Return empty array to allow plans to load
        })
      );

    forkJoin({
      plans: plans$,
      subscriptions: subscriptions$
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ plans, subscriptions }) => {
          // 1. Process Active/Latest Subscription Details
          if (subscriptions) {
            this.activePlanId = subscriptions.planId;
            this.activeBillingCycle = subscriptions.billingCycle?.toLowerCase();
            this.isSubscriptionExpired = subscriptions.isExpired;
          }

          // 2. Process Plans
          this.allPlans = plans.map(plan => this.transformToPricingPlan(plan));

          // Add custom plan template at the end if it doesn't exist
          const hasCustomPlan = this.allPlans.some(p => p.isCustom);
          if (!hasCustomPlan) {
            this.allPlans.push({
              id: 'custom',
              name: 'Enterprise',
              price: 0,
              pricePeriod: 'month',
              description: 'Custom solutions for large organizations',
              features: [
                'All Business features',
                'Single Sign-On (SSO)',
                'Custom Integrations',
                'Dedicated Account Manager',
                '24/7 Premium Support'
              ],
              isPopular: false,
              isCustom: true,
              isCurrentPlan: false
            });
          }

          // Mark middle plan as popular if there are 3 or more plans
          if (this.allPlans.length >= 3 && !this.allPlans.some(p => p.isPopular)) {
            const middleIndex = Math.floor(this.allPlans.length / 2);
            this.allPlans[middleIndex].isPopular = true;
          }

          this.updateDisplayedPlans();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading data:', err);
          this.error = err.message || 'Failed to load data';
          this.isLoading = false;
          this.loadDefaultPlans();
        }
      });
  }

  loadDefaultPlans(): void {
    this.allPlans = [
      {
        id: 'starter',
        name: 'Starter',
        price: 29,
        monthlyPrice: 29,
        annualPrice: 278,
        pricePeriod: 'month',
        description: 'Perfect for small teams getting started',
        features: ['Employee Directory', 'Leave Management', 'Basic Reporting', 'Standard Support'],
        isPopular: false,
        isCustom: false,
        isCurrentPlan: false
      },
      {
        id: 'business',
        name: 'Business',
        price: 79,
        monthlyPrice: 79,
        annualPrice: 758,
        pricePeriod: 'month',
        description: 'For growing teams that need advanced features',
        features: ['All Starter features', 'Performance Management', 'Advanced Reporting', 'Priority Support'],
        isPopular: true,
        isCustom: false,
        isCurrentPlan: false
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 0,
        pricePeriod: 'month',
        description: 'Custom solutions for large organizations',
        features: ['All Business features', 'Single Sign-On (SSO)', 'Custom Integrations', 'Dedicated Account Manager'],
        isPopular: false,
        isCustom: true,
        isCurrentPlan: false
      }
    ];
    this.updateDisplayedPlans();
  }

  transformToPricingPlan(apiPlan: SubscriptionPlanDto): PricingPlan {
    // Extract features from JSONB object or use empty array
    let features: string[] = [];
    if (apiPlan.features) {
      if (Array.isArray(apiPlan.features)) {
        // If features is an array, convert each item to string
        features = apiPlan.features.map((f: any) => String(f));
      } else if (typeof apiPlan.features === 'object' && apiPlan.features !== null) {
        // If features is an object, convert keys/values to strings
        features = Object.entries(apiPlan.features).map(([key, value]) => {
          if (typeof value === 'string') {
            return value;
          }
          return `${key}: ${value}`;
        });
      }
    }

    // If no features from API, use default based on plan name
    if (features.length === 0) {
      features = this.getDefaultFeatures(apiPlan.name, apiPlan.maxUsers);
    }

    const price = this.billingCycle === 'monthly'
      ? (apiPlan.monthlyPrice || 0)
      : (apiPlan.annualPrice || 0);

    return {
      id: apiPlan.planId,
      name: apiPlan.name,
      price: price,
      monthlyPrice: apiPlan.monthlyPrice,
      annualPrice: apiPlan.annualPrice,
      pricePeriod: 'month', // Default, will be determined dynamically
      description: this.getDescription(apiPlan),
      features: features,
      isPopular: false, // Will be set separately
      isCustom: apiPlan.isCustom,
      isCurrentPlan: this.activePlanId === apiPlan.planId && this.activeBillingCycle === this.billingCycle,
      isExpired: this.activePlanId === apiPlan.planId && this.activeBillingCycle === this.billingCycle && this.isSubscriptionExpired
    };
  }

  getDescription(plan: SubscriptionPlanDto): string {
    if (plan.isCustom) {
      return 'Custom solutions for large organizations';
    }

    if (plan.maxUsers) {
      return `Perfect for teams up to ${plan.maxUsers} users`;
    }

    return `Flexible pricing plan for your business needs`;
  }

  getDefaultFeatures(planName: string, maxUsers?: number): string[] {
    const baseFeatures = ['Employee Directory', 'Leave Management', 'Basic Reporting'];

    if (maxUsers) {
      baseFeatures.unshift(`Up to ${maxUsers} users`);
    }

    if (planName.toLowerCase().includes('starter') || planName.toLowerCase().includes('basic')) {
      return [...baseFeatures, 'Standard Support'];
    } else if (planName.toLowerCase().includes('business') || planName.toLowerCase().includes('professional')) {
      return [...baseFeatures, 'Performance Management', 'Advanced Reporting', 'Priority Support'];
    } else if (planName.toLowerCase().includes('enterprise') || planName.toLowerCase().includes('custom')) {
      return [...baseFeatures, 'Performance Management', 'Single Sign-On (SSO)', 'Custom Integrations', 'Dedicated Support'];
    }

    return baseFeatures;
  }

  updateDisplayedPlans(): void {
    // Update prices based on billing cycle
    this.allPlans.forEach(plan => {
      if (!plan.isCustom) {
        plan.price = this.billingCycle === 'monthly'
          ? (plan.monthlyPrice || 0)
          : (plan.annualPrice || 0);

        // Update isCurrentPlan based on both planId AND billingCycle
        plan.isCurrentPlan = this.activePlanId === plan.id &&
          this.activeBillingCycle === this.billingCycle;

        // Update isExpired for the displayed cycle
        plan.isExpired = this.activePlanId === plan.id &&
          this.activeBillingCycle === this.billingCycle &&
          this.isSubscriptionExpired;
      }
    });

    const endIndex = Math.min(this.currentIndex + this.itemsPerPage, this.allPlans.length);
    this.displayedPlans = this.allPlans.slice(this.currentIndex, endIndex);
    this.plans = this.displayedPlans;
  }

  next(): void {
    if (this.canGoNext()) {
      this.currentIndex += this.itemsPerPage;
      this.updateDisplayedPlans();
    }
  }

  previous(): void {
    if (this.canGoPrevious()) {
      this.currentIndex = Math.max(0, this.currentIndex - this.itemsPerPage);
      this.updateDisplayedPlans();
    }
  }

  canGoNext(): boolean {
    return this.currentIndex + this.itemsPerPage < this.allPlans.length;
  }

  canGoPrevious(): boolean {
    return this.currentIndex > 0;
  }

  onBillingCycleChange(cycle: 'monthly' | 'annual'): void {
    this.billingCycle = cycle;
    this.updateDisplayedPlans();
  }

  getPriceLabel(plan: PricingPlan): string {
    if (plan.isCustom) return 'Custom';
    const price = plan.price;
    return `$${price}`;
  }

  getCarouselIndicators(): number[] {
    const totalPages = Math.ceil(this.allPlans.length / this.itemsPerPage);
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  getCurrentPageIndex(): number {
    return Math.floor(this.currentIndex / this.itemsPerPage);
  }

  goToPage(pageIndex: number): void {
    this.currentIndex = pageIndex * this.itemsPerPage;
    this.updateDisplayedPlans();
  }

  isCenterCard(index: number): boolean {
    if (index < 0) return false;

    if (this.itemsPerPage === 3) {
      return index === 1;
    } else if (this.itemsPerPage === 2) {
      return index === 1;
    } else {
      return index === 0;
    }
  }

  selectPlan(plan: PricingPlan): void {
    if (plan.isCustom) return;

    this.isLoading = true;
    this.error = null;

    const startDate = new Date();
    const endDate = new Date(startDate);

    if (this.billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Set time to 11:59:59 PM
    endDate.setHours(23, 59, 59, 0);

    // Format billing cycle to match backend expectation (Title Case)
    // The component uses 'monthly'/'annual' (lowercase)
    // The backend comparison wasn't strict case-wise in my memory, but API usually prefers 'Monthly'/'Annual' or exact string.
    // The prompt said: "if the Annual is selected... then the cycle will go annual and if monthly then monthly will go".
    // I will capitalize it just in case, or send as is if backend handles it.
    // Backend controller didn't seem to enforce enum, just string. I'll send Title Case as it looks nicer in DB.
    // Actually user said "if monthly then monthly will go", so I will keep it as 'monthly'.
    // Wait, let's re-read carefully: "if monthly then monthly will go".
    // I will keep it as is.

    const request = {
      planId: plan.id,
      status: 'active', // Lowercase to match typical DB conventions if needed
      billingCycle: this.billingCycle, // 'monthly' or 'annual'
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };

    this.paymentService.createCompanySubscription(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notificationService.success({
            message: 'Subscription created successfully!',
            duration: 1000
          });
          this.loadSubscriptionPlans();
        },
        error: (err) => {
          this.isLoading = false;
          this.notificationService.error(err.message || 'Failed to create subscription');
        }
      });
  }
}
