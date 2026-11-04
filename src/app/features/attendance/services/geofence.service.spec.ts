import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { GeoFenceService } from './geofence.service';
import { TenantEntitlementService } from '@core/services/tenant-entitlement.service';
import { provideTestDefaults } from 'src/testing/test-providers';

describe('GeoFenceService.geoClock', () => {
  let service: GeoFenceService;
  let http: HttpTestingController;
  let geoEnabled: boolean;

  beforeEach(() => {
    geoEnabled = false;
    TestBed.configureTestingModule({
      providers: [
        ...provideTestDefaults(),
        { provide: TenantEntitlementService, useValue: { isEnabled: (k: string) => k === 'geo_fencing' && geoEnabled } }
      ]
    });
    service = TestBed.inject(GeoFenceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the plain attendance clock-in when the plan has no geo-fencing', () => {
    let message = '';
    service.geoClock({ action: 'in', matchResult: 'match', latitude: 1, longitude: 2 }).subscribe(r => (message = r.message));

    const req = http.expectOne(r => r.url.endsWith('/Attendance/clock-in'));
    expect(req.request.body).toEqual({ action: 'in', notes: undefined, location: { latitude: 1, longitude: 2 } });
    req.flush({ success: true, data: { success: true, message: 'Clocked in' } });
    expect(message).toBe('Clocked in');
  });

  it('uses clock-out for action "out"', () => {
    service.geoClock({ action: 'out', matchResult: 'match', notes: 'done' }).subscribe();
    http.expectOne(r => r.url.endsWith('/Attendance/clock-out')).flush({ success: true, data: { success: true, message: '' } });
  });

  it('passes the server message through when clock-in is refused', () => {
    let error = '';
    service.geoClock({ action: 'in', matchResult: 'match' }).subscribe({ error: e => (error = e.message) });
    http.expectOne(r => r.url.endsWith('/Attendance/clock-in'))
      .flush({ success: true, data: { success: false, message: 'Already clocked in' } });
    expect(error).toBe('Already clocked in');
  });

  it('uses the GeoFence clock when the plan includes geo-fencing', () => {
    geoEnabled = true;
    service.geoClock({ action: 'in', matchResult: 'match' }).subscribe();
    http.expectOne(r => r.url.endsWith('/GeoFence/clock')).flush({ success: true, data: { success: true, message: '' } });
  });
});
