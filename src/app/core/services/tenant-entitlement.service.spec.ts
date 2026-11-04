import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { TenantEntitlementService } from './tenant-entitlement.service';
import { environment } from '@environments/environment';
import { provideTestDefaults } from 'src/testing/test-providers';

describe('TenantEntitlementService', () => {
  const URL = `${environment.apiUrl}/Entitlements/me`;
  let svc: TenantEntitlementService;
  let http: HttpTestingController;

  const plan = { planCode: 'pro', subscriptionStatus: 'active', maxUsers: 50, features: { payroll: { enabled: true } } };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestDefaults()] });
    svc = TestBed.inject(TenantEntitlementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the plan once and serves later calls from memory', () => {
    svc.load().subscribe();
    http.expectOne(URL).flush({ success: true, data: plan, message: '' });

    let second: any;
    svc.load().subscribe(v => (second = v));
    http.expectNone(URL);

    expect(second.planCode).toBe('pro');
    expect(svc.isEnabled('payroll')).toBeTrue();
    expect(svc.isEnabled('geo_fencing')).toBeFalse();
  });

  it('shares one in-flight request between concurrent callers', () => {
    const results: any[] = [];
    svc.load().subscribe(v => results.push(v));
    svc.load().subscribe(v => results.push(v));

    http.expectOne(URL).flush({ success: true, data: plan, message: '' });

    expect(results.length).toBe(2);
  });

  it('errors when the API reports failure, and can retry afterwards', () => {
    spyOn(console, 'error');
    let error: Error | undefined;
    svc.load().subscribe({ error: e => (error = e) });
    http.expectOne(URL).flush({ success: false, message: 'No subscription' });

    expect(error?.message).toBe('No subscription');

    svc.load().subscribe();
    http.expectOne(URL).flush({ success: true, data: plan, message: '' });
    expect(svc.isEnabled('payroll')).toBeTrue();
  });

  it('forceRefresh bypasses the cache and clear() forgets the plan', () => {
    svc.load().subscribe();
    http.expectOne(URL).flush({ success: true, data: plan, message: '' });

    svc.load(true).subscribe();
    http.expectOne(URL).flush({ success: true, data: { ...plan, features: {} }, message: '' });
    expect(svc.isEnabled('payroll')).toBeFalse();

    svc.clear();
    expect(svc.isEnabled('payroll')).toBeFalse();
  });
});
