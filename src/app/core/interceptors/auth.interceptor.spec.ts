import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '@core/services/auth.service';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  let token: string | null;

  beforeEach(() => {
    token = 'access-1';
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getToken', 'refreshToken', 'logout'], {
      isLoggingOutNow: false
    });
    auth.getToken.and.callFake(() => token);
    auth.logout.and.returnValue(of(true));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
      ]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('adds the bearer token to API calls', () => {
    http.get('/api/Employee').subscribe();
    expect(backend.expectOne('/api/Employee').request.headers.get('Authorization')).toBe('Bearer access-1');
  });

  it('does not attach the token to login/refresh calls', () => {
    http.post('/api/Auth/login', {}).subscribe();
    http.post('/api/Auth/refresh', {}).subscribe();
    expect(backend.expectOne('/api/Auth/login').request.headers.has('Authorization')).toBeFalse();
    expect(backend.expectOne('/api/Auth/refresh').request.headers.has('Authorization')).toBeFalse();
  });

  it('sends no header when the user is logged out', () => {
    token = null;
    http.get('/api/Employee').subscribe();
    expect(backend.expectOne('/api/Employee').request.headers.has('Authorization')).toBeFalse();
  });

  it('on 401 refreshes the token once and retries the request with the new token', () => {
    auth.refreshToken.and.returnValue(of({ token: 'access-2' } as any));
    let body: unknown;

    http.get('/api/Leave').subscribe(b => (body = b));
    backend.expectOne('/api/Leave').flush({}, { status: 401, statusText: 'Unauthorized' });

    const retry = backend.expectOne('/api/Leave');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush({ ok: true });

    expect(body).toEqual({ ok: true });
    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
  });

  it('logs the user out when the refresh fails', () => {
    auth.refreshToken.and.returnValue(throwError(() => new Error('expired')));
    let failed = false;

    http.get('/api/Leave').subscribe({ error: () => (failed = true) });
    backend.expectOne('/api/Leave').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBeTrue();
    expect(auth.logout).toHaveBeenCalled();
  });

  it('passes a 401 from the login endpoint straight to the caller (wrong password)', () => {
    let status = 0;
    http.post('/api/Auth/login', {}).subscribe({ error: e => (status = e.status) });
    backend.expectOne('/api/Auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(auth.refreshToken).not.toHaveBeenCalled();
  });

  it('does not try to refresh on other errors', () => {
    let status = 0;
    http.get('/api/Payroll').subscribe({ error: e => (status = e.status) });
    backend.expectOne('/api/Payroll').flush({}, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
    expect(auth.refreshToken).not.toHaveBeenCalled();
  });
});
