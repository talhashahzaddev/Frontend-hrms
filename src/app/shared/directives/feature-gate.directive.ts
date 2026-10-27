import { Directive, Input, OnDestroy, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { TenantEntitlementService } from '@core/services/tenant-entitlement.service';

@Directive({
  selector: '[featureGate]',
  standalone: true
})
export class FeatureGateDirective implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private featureKey = '';
  private hasView = false;

  @Input()
  set featureGate(value: string) {
    this.featureKey = value;
    this.render();
  }

  constructor(
    private template: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private entitlements: TenantEntitlementService
  ) {
    this.entitlements.entitlements$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.render());
    this.entitlements.load().subscribe({
      error: error => console.error('Feature gate could not load entitlements.', error)
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private render(): void {
    const enabled = this.featureKey.length > 0 && this.entitlements.isEnabled(this.featureKey);
    if (enabled && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.template);
      this.hasView = true;
    } else if (!enabled && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
