import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { TenantEntitlementService } from '@core/services/tenant-entitlement.service';

@Injectable({ providedIn: 'root' })
export class FeatureAccessGuard implements CanActivate, CanActivateChild {
  constructor(
    private entitlements: TenantEntitlementService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<boolean> {
    return this.checkFeature(route.data['feature'] as string | undefined);
  }

  canActivateChild(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<boolean> {
    const featureKey = route.data['feature'] as string | undefined ??
      route.parent?.data['childFeature'] as string | undefined;
    return this.checkFeature(featureKey);
  }

  private checkFeature(featureKey: string | undefined): Observable<boolean> {
    if (!featureKey) {
      return of(true);
    }

    return this.entitlements.load().pipe(
      map(value => {
        if (value.features[featureKey]?.enabled) {
          return true;
        }
        this.router.navigate(['/plan-access'], { queryParams: { feature: featureKey } });
        return false;
      }),
      catchError(() => {
        this.router.navigate(['/plan-access'], { queryParams: { error: 'entitlements' } });
        return of(false);
      })
    );
  }
}
