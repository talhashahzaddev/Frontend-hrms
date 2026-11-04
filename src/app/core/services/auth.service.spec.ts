import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '@environments/environment';
import { AuthResponse, UserPermissions } from '@core/models/auth.models';
import { fakeJwt, provideTestDefaults } from 'src/testing/test-providers';

describe('AuthService', () => {
  const API = `${environment.apiUrl}/Auth`;
  const keys = environment.auth;

  let http: HttpTestingController;

  const futureExp = () => Math.floor(Date.now() / 1000) + 3600;
  const pastExp = () => Math.floor(Date.now() / 1000) - 60;

  const authResponse = (overrides: Partial<AuthResponse> = {}): AuthResponse => ({
    userId: 'u-1',
    email: 'ali@test.com',
    firstName: 'Ali',
    lastName: 'Khan',
    roleName: 'HR Manager',
    organizationName: 'Codified',
    token: fakeJwt({ exp: futureExp(), EmployeeId: 'emp-1' }),
    refreshToken: 'refresh-1',
    tokenExpiration: new Date().toISOString(),
    ...overrides
  } as AuthResponse);

  const permissions: UserPermissions = {
    userId: 'u-1',
    userName: null,
    email: 'ali@test.com',
    roleId: 'r-1',
    roleName: 'HR Manager',
    menus: [
      {
        menuName: 'Leave Management',
        subMenus: [
          {
            subMenuName: 'Team Leaves',
            actions: [
              { actionKey: 'approve_leave', hasPermission: true },
              { actionKey: 'delete_leave', hasPermission: false }
            ]
          }
        ]
      },
      {
        menuName: 'Payroll',
        subMenus: [{ subMenuName: 'Runs', actions: [{ actionKey: 'run_payroll', hasPermission: false }] }]
      }
    ]
  } as unknown as UserPermissions;

  function create(): AuthService {
    TestBed.configureTestingModule({ providers: [...provideTestDefaults()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  /** Answers the permissions call that follows login/refresh. */
  function flushPermissions() {
    http.match(r => r.url.includes('permissions')).forEach(r =>
      r.flush({ success: true, data: permissions, message: '', errors: null }));
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  describe('restoring a session', () => {
    it('starts logged out when nothing is stored', () => {
      const svc = create();
      expect(svc.isAuthenticated()).toBeFalse();
      expect(svc.getToken()).toBeNull();
    });

    it('restores a stored, unexpired session', () => {
      localStorage.setItem(keys.tokenKey, fakeJwt({ exp: futureExp() }));
      localStorage.setItem(keys.userKey, JSON.stringify({ userId: 'u-1', roleName: 'HR Manager' }));

      const svc = create();

      expect(svc.isAuthenticated()).toBeTrue();
      expect(svc.hasRole('HR Manager')).toBeTrue();
    });

    it('clears a stored session whose token has expired', () => {
      localStorage.setItem(keys.tokenKey, fakeJwt({ exp: pastExp() }));
      localStorage.setItem(keys.userKey, JSON.stringify({ userId: 'u-1' }));

      const svc = create();

      expect(svc.isAuthenticated()).toBeFalse();
      expect(localStorage.getItem(keys.tokenKey)).toBeNull();
    });

    it('clears a corrupted stored user', () => {
      localStorage.setItem(keys.tokenKey, fakeJwt({ exp: futureExp() }));
      localStorage.setItem(keys.userKey, '{not json');

      const svc = create();

      expect(svc.isAuthenticated()).toBeFalse();
    });
  });

  describe('login', () => {
    it('stores tokens and user on success', () => {
      const svc = create();
      let result: AuthResponse | undefined;

      svc.login({ email: 'ali@test.com', password: 'x' }).subscribe(r => (result = r));
      http.expectOne(`${API}/login`).flush({ success: true, data: authResponse() });
      flushPermissions();

      expect(result?.userId).toBe('u-1');
      expect(svc.isAuthenticated()).toBeTrue();
      expect(svc.getRefreshToken()).toBe('refresh-1');
      expect(svc.getCurrentUserValue()?.employeeId).toBe('emp-1');
    });

    it('surfaces the server message on failure and stays logged out', () => {
      const svc = create();
      let error: Error | undefined;

      svc.login({ email: 'ali@test.com', password: 'bad' }).subscribe({ error: e => (error = e) });
      http.expectOne(`${API}/login`).flush({ message: 'Invalid password' }, { status: 401, statusText: 'Unauthorized' });

      expect(error?.message).toBe('Invalid password');
      expect(svc.isAuthenticated()).toBeFalse();
    });

    it('treats success=false as a failure', () => {
      const svc = create();
      let error: Error | undefined;

      svc.login({ email: 'a', password: 'b' }).subscribe({ error: e => (error = e) });
      http.expectOne(`${API}/login`).flush({ success: false, message: 'Please verify your email' });

      expect(error?.message).toBe('Please verify your email');
    });
  });

  describe('refreshToken', () => {
    it('errors immediately when there is no refresh token', () => {
      const svc = create();
      let error: Error | undefined;
      svc.refreshToken().subscribe({ error: e => (error = e) });
      expect(error?.message).toContain('No refresh token');
      http.expectNone(`${API}/refresh`);
    });

    it('sends the stored refresh token and saves the new pair', () => {
      localStorage.setItem(keys.refreshTokenKey, 'old-refresh');
      const svc = create();

      svc.refreshToken().subscribe();
      const req = http.expectOne(`${API}/refresh`);
      expect(req.request.body).toEqual({ refreshToken: 'old-refresh' });
      req.flush({ success: true, data: authResponse({ refreshToken: 'new-refresh' }) });
      flushPermissions();

      expect(svc.getRefreshToken()).toBe('new-refresh');
      expect(svc.isAuthenticated()).toBeTrue();
    });

    it('clears the session when refresh is rejected', () => {
      localStorage.setItem(keys.refreshTokenKey, 'old-refresh');
      const svc = create();

      svc.refreshToken().subscribe({ error: () => {} });
      http.expectOne(`${API}/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });

      expect(svc.getRefreshToken()).toBeNull();
    });
  });

  describe('logout', () => {
    it('clears all stored credentials and goes to /login', () => {
      localStorage.setItem(keys.tokenKey, fakeJwt({ exp: futureExp() }));
      localStorage.setItem(keys.userKey, JSON.stringify({ userId: 'u-1' }));
      const svc = create();
      const router = TestBed.inject(Router);
      spyOn(router, 'navigate').and.resolveTo(true);
      http.match(() => true); // drop the startup permissions call

      svc.logout().subscribe();

      expect(svc.isAuthenticated()).toBeFalse();
      expect(localStorage.getItem(keys.tokenKey)).toBeNull();
      expect(localStorage.getItem('userPermissions')).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
    });
  });

  describe('permissions', () => {
    function loggedInWithPermissions(): AuthService {
      localStorage.setItem(keys.tokenKey, fakeJwt({ exp: futureExp() }));
      localStorage.setItem(keys.userKey, JSON.stringify({ userId: 'u-1', roleName: 'HR Manager' }));
      localStorage.setItem('userPermissions', JSON.stringify(permissions));
      return create();
    }

    it('denies everything when no permissions are loaded', () => {
      const svc = create();
      expect(svc.hasPermissionByActionKey('approve_leave')).toBeFalse();
      expect(svc.hasMenuParentPermission('Leave Management')).toBeFalse();
    });

    it('checks a granted action case-insensitively', () => {
      const svc = loggedInWithPermissions();
      expect(svc.hasMenuPermission('leave management', 'TEAM LEAVES', 'Approve_Leave')).toBeTrue();
      expect(svc.hasPermissionByActionKey('APPROVE_LEAVE')).toBeTrue();
    });

    it('does not grant actions that are listed but not allowed', () => {
      const svc = loggedInWithPermissions();
      expect(svc.hasMenuPermission('Leave Management', 'Team Leaves', 'delete_leave')).toBeFalse();
      expect(svc.hasPermissionByActionKey('run_payroll')).toBeFalse();
    });

    it('only shows a menu when at least one action inside it is granted', () => {
      const svc = loggedInWithPermissions();
      expect(svc.hasMenuParentPermission('Leave Management')).toBeTrue();
      expect(svc.hasMenuParentPermission('Payroll')).toBeFalse();
      expect(svc.hasSubMenuPermission('Payroll', 'Runs')).toBeFalse();
    });

    it('picks the first allowed landing route', () => {
      const svc = loggedInWithPermissions();
      expect(svc.getFirstAllowedRoute()).toBe('/leave');
    });

    it('checks roles', () => {
      const svc = loggedInWithPermissions();
      expect(svc.hasAnyRole(['Employee', 'HR Manager'])).toBeTrue();
      expect(svc.hasAnyRole(['Employee'])).toBeFalse();
    });
  });

  describe('getEmployeeIdFromToken', () => {
    it('reads the employee id claim in any supported casing', () => {
      const svc = create();
      expect(svc.getEmployeeIdFromToken(fakeJwt({ employeeId: 'e-2' }))).toBe('e-2');
      expect(svc.getEmployeeIdFromToken(fakeJwt({ employee_id: 'e-3' }))).toBe('e-3');
    });

    it('returns null for a malformed token', () => {
      const svc = create();
      expect(svc.getEmployeeIdFromToken('garbage')).toBeNull();
    });
  });
});
