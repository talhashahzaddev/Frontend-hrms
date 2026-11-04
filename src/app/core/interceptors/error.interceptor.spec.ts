import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ErrorInterceptor } from './error.interceptor';
import { NotificationService } from '@core/services/notification.service';

describe('ErrorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService',
      ['permissionDenied', 'networkError', 'error', 'validationError']);
    spyOn(console, 'error');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationService, useValue: notifications },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
      ]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('does not show "Access Denied" when a page silently loads data it cannot see', () => {
    http.get('/api/Payroll/loans').subscribe({ error: () => {} });
    backend.expectOne('/api/Payroll/loans').flush({}, { status: 403, statusText: 'Forbidden' });

    expect(notifications.permissionDenied).not.toHaveBeenCalled();
  });

  it('shows "Access Denied" when the user tries to change something', () => {
    http.post('/api/Payroll/loans', {}).subscribe({ error: () => {} });
    backend.expectOne('/api/Payroll/loans').flush({}, { status: 403, statusText: 'Forbidden' });

    expect(notifications.permissionDenied).toHaveBeenCalledTimes(1);
  });

  it('does not retry a GET that was refused (4xx)', () => {
    http.get('/api/Assets').subscribe({ error: () => {} });
    backend.expectOne('/api/Assets').flush({}, { status: 403, statusText: 'Forbidden' });
    backend.expectNone('/api/Assets');
  });

  it('retries a GET once on a server error', fakeAsync(() => {
    let ok = false;
    http.get('/api/Employee').subscribe(() => (ok = true));
    backend.expectOne('/api/Employee').flush({}, { status: 503, statusText: 'Unavailable' });
    tick();
    backend.expectOne('/api/Employee').flush({});
    expect(ok).toBeTrue();
  }));

  it('respects X-Skip-Global-Error', fakeAsync(() => {
    http.get('/api/Dashboard/hr-stats', { headers: { 'X-Skip-Global-Error': 'true' } }).subscribe({ error: () => {} });
    backend.expectOne('/api/Dashboard/hr-stats').flush({}, { status: 500, statusText: 'Server Error' });
    tick();
    backend.expectOne('/api/Dashboard/hr-stats').flush({}, { status: 500, statusText: 'Server Error' });

    expect(notifications.error).not.toHaveBeenCalled();
  }));
});
