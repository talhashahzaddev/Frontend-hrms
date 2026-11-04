import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { AuthGuard } from './auth.guard';
import { NoAuthGuard } from './no-auth.guard';
import { FeatureAccessGuard } from './feature-access.guard';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { TenantEntitlementService } from '@core/services/tenant-entitlement.service';
import { provideTestDefaults } from 'src/testing/test-providers';

function route(data: Record<string, unknown> = {}, parentData?: Record<string, unknown>): ActivatedRouteSnapshot {
  return { data, parent: parentData ? { data: parentData } : null } as unknown as ActivatedRouteSnapshot;
}

const state = (url: string) => ({ url } as RouterStateSnapshot);

function result(obs: Observable<boolean>): boolean | undefined {
  let value: boolean | undefined;
  obs.subscribe(v => (value = v));
  return value;
}

describe('Route guards', () => {
  let loggedIn$: BehaviorSubject<boolean>;
  let authStub: jasmine.SpyObj<AuthService> & { isAuthenticated$: Observable<boolean> };
  let notifications: jasmine.SpyObj<NotificationService>;
  let entitlements: jasmine.SpyObj<TenantEntitlementService>;
  let router: Router;

  beforeEach(() => {
    loggedIn$ = new BehaviorSubject<boolean>(false);
    authStub = Object.assign(jasmine.createSpyObj<AuthService>('AuthService', ['hasAnyRole']), {
      isAuthenticated$: loggedIn$.asObservable()
    });
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['permissionDenied']);
    entitlements = jasmine.createSpyObj<TenantEntitlementService>('TenantEntitlementService', ['load']);

    TestBed.configureTestingModule({
      providers: [
        ...provideTestDefaults(),
        { provide: AuthService, useValue: authStub },
        { provide: NotificationService, useValue: notifications },
        { provide: TenantEntitlementService, useValue: entitlements }
      ]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    sessionStorage.clear();
  });

  describe('AuthGuard', () => {
    it('sends anonymous users to /login and remembers where they were going', () => {
      const guard = TestBed.inject(AuthGuard);

      expect(result(guard.canActivate(route(), state('/payroll/runs')))).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      expect(sessionStorage.getItem('redirectUrl')).toBe('/payroll/runs');
    });

    it('lets logged-in users through when no role is required', () => {
      loggedIn$.next(true);
      const guard = TestBed.inject(AuthGuard);

      expect(result(guard.canActivate(route(), state('/dashboard')))).toBeTrue();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('blocks users without a required role and shows 403', () => {
      loggedIn$.next(true);
      authStub.hasAnyRole.and.returnValue(false);
      const guard = TestBed.inject(AuthGuard);

      expect(result(guard.canActivate(route({ roles: ['Super Admin'] }), state('/settings')))).toBeFalse();
      expect(notifications.permissionDenied).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/403']);
    });

    it('allows users with a required role (child routes too)', () => {
      loggedIn$.next(true);
      authStub.hasAnyRole.and.returnValue(true);
      const guard = TestBed.inject(AuthGuard);

      expect(result(guard.canActivateChild(route({ roles: ['HR Manager'] }), state('/leave')))).toBeTrue();
      expect(authStub.hasAnyRole).toHaveBeenCalledWith(['HR Manager']);
    });
  });

  describe('NoAuthGuard', () => {
    it('allows anonymous users onto login/register pages', () => {
      expect(result(TestBed.inject(NoAuthGuard).canActivate(route(), state('/login')))).toBeTrue();
    });

    it('redirects logged-in users to the dashboard', () => {
      loggedIn$.next(true);
      expect(result(TestBed.inject(NoAuthGuard).canActivate(route(), state('/login')))).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('FeatureAccessGuard', () => {
    const plan = (features: Record<string, { enabled: boolean }>) => of({ features } as any);

    it('allows routes that do not declare a feature', () => {
      expect(result(TestBed.inject(FeatureAccessGuard).canActivate(route(), state('/x')))).toBeTrue();
      expect(entitlements.load).not.toHaveBeenCalled();
    });

    it('allows a feature included in the plan', () => {
      entitlements.load.and.returnValue(plan({ payroll: { enabled: true } }));
      expect(result(TestBed.inject(FeatureAccessGuard).canActivate(route({ feature: 'payroll' }), state('/payroll')))).toBeTrue();
    });

    it('sends users to the upgrade page for a disabled or missing feature', () => {
      entitlements.load.and.returnValue(plan({ payroll: { enabled: false } }));
      const guard = TestBed.inject(FeatureAccessGuard);

      expect(result(guard.canActivate(route({ feature: 'payroll' }), state('/payroll')))).toBeFalse();
      expect(result(guard.canActivate(route({ feature: 'geo_fencing' }), state('/geo')))).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/plan-access'], { queryParams: { feature: 'payroll' } });
    });

    it('uses the parent childFeature for child routes', () => {
      entitlements.load.and.returnValue(plan({ ai_assistant: { enabled: true } }));
      const guard = TestBed.inject(FeatureAccessGuard);

      expect(result(guard.canActivateChild(route({}, { childFeature: 'ai_assistant' }), state('/ai')))).toBeTrue();
    });

    it('fails closed when entitlements cannot be loaded', () => {
      entitlements.load.and.returnValue(throwError(() => new Error('network')));
      expect(result(TestBed.inject(FeatureAccessGuard).canActivate(route({ feature: 'payroll' }), state('/payroll')))).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/plan-access'], { queryParams: { error: 'entitlements' } });
    });
  });
});
