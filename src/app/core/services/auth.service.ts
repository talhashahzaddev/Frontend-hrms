import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, map, of, forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';
import {
  LoginRequest,
  AuthResponse,
  RefreshTokenRequest,
  User,
  ApiResponse,
  CreateUserRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  UserPermissions,
  UserPermissionsResponse
} from '@core/models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/Auth`;
  private readonly uploadsUrl = `${environment.apiUrl}/uploads`;
  private readonly TOKEN_KEY = environment.auth.tokenKey;
  private readonly REFRESH_TOKEN_KEY = environment.auth.refreshTokenKey;
  private readonly USER_KEY = environment.auth.userKey;
  private readonly PERMISSIONS_KEY = 'userPermissions';
  private readonly PENDING_AUTH_KEY = 'pendingAuthData';
  private readonly LOGOUT_REDIRECT_KEY = 'logoutRedirect';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private permissionsSubject = new BehaviorSubject<UserPermissions | null>(null);
  private isRedirecting = false;
  private isLoggingOut = false;
  private isLoggingOutSubject = new BehaviorSubject<boolean>(false);
  
  public isLoggingOut$ = this.isLoggingOutSubject.asObservable();

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();
  public permissions$ = this.permissionsSubject.asObservable();
  public isAuthenticated$ = this.currentUserSubject.asObservable().pipe(
    map(user => !!user)
  );

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Check for pending auth from subdomain redirect FIRST
    // This must happen before loadStoredAuth() so the auth data is available
    this.completePendingAuthIfExists();

    // Then load any existing auth from localStorage
    this.loadStoredAuth();

    // Delay permission fetch to avoid circular dependency with HTTP interceptors
    // The service must be fully constructed and injected before making HTTP calls
    queueMicrotask(() => {
      this.initializePermissionsIfNeeded();
    });
  }

  /**
   * Internal method to complete pending auth during construction
   */
  private completePendingAuthIfExists(): void {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for logout action
    if (urlParams.get('action') === 'logout') {
      this.clearAuthData();
      this.removeUrlParam('action');
      return;
    }

    // Check for auth transfer data from URL
    const authDataStr = urlParams.get('auth_transfer');
    if (authDataStr) {
      try {
        const authResponse: AuthResponse = JSON.parse(decodeURIComponent(authDataStr));

        const user: User = {
          userId: authResponse.userId,
          employeeId: this.getEmployeeIdFromToken(authResponse.token) || undefined,
          email: authResponse.email,
          firstName: authResponse.firstName,
          lastName: authResponse.lastName,
          roleName: authResponse.roleName,
          organizationName: authResponse.organizationName || " ",
          isActive: true,
          createdAt: new Date().toISOString()
        };

        localStorage.setItem(this.TOKEN_KEY, authResponse.token);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, authResponse.refreshToken);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));

        // Clean up URL
        this.removeUrlParam('auth_transfer');

        // Update subject immediately
        this.currentUserSubject.next(user);
        this.tokenSubject.next(authResponse.token);

        // Fetch user permissions after subdomain redirect
        this.fetchAndStoreUserPermissions(user.userId).subscribe();
      } catch (error) {
        // Failed to complete pending login
      }
    }

    // Fallback: Check sessionStorage (for same-domain redirects if any)
    const pendingAuthJson = sessionStorage.getItem(this.PENDING_AUTH_KEY);
    if (pendingAuthJson) {
      try {
        const authResponse: AuthResponse = JSON.parse(pendingAuthJson);
        const user: User = {
          userId: authResponse.userId,
          employeeId: this.getEmployeeIdFromToken(authResponse.token) || undefined,
          email: authResponse.email,
          firstName: authResponse.firstName,
          lastName: authResponse.lastName,
          roleName: authResponse.roleName,
          organizationName: authResponse.organizationName || " ",
          isActive: true,
          createdAt: new Date().toISOString()
        };

        localStorage.setItem(this.TOKEN_KEY, authResponse.token);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, authResponse.refreshToken);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));

        sessionStorage.removeItem(this.PENDING_AUTH_KEY);
        this.currentUserSubject.next(user);
        this.tokenSubject.next(authResponse.token);

        // Fetch user permissions from sessionStorage redirect path
        this.fetchAndStoreUserPermissions(user.userId).subscribe();
      } catch (error) {
        sessionStorage.removeItem(this.PENDING_AUTH_KEY);
      }
    }
  }

  /**
   * Fetches user permissions from the API and stores in localStorage and subject
   */
  private fetchAndStoreUserPermissions(userId: string): Observable<UserPermissions | null> {
    const endpoint = `${this.API_URL}/get-user-permissions/${userId}`;
    
    return this.http.get<UserPermissionsResponse>(endpoint)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            const permissions = response.data;
            localStorage.setItem(this.PERMISSIONS_KEY, JSON.stringify(permissions));
            this.permissionsSubject.next(permissions);
          }
        }),
        map(response => response.data || null),
        catchError(error => {
          return of(null);
        })
      );
  }

  private removeUrlParam(param: string): void {
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    window.history.replaceState({}, '', url.toString());
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            // Fetch permissions immediately after successful login
            this.fetchAndStoreUserPermissions(response.data.userId).subscribe();
          }
        }),
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Login failed');
          }
          return response.data!;
        }),
        catchError(this.handleError)
      );
  }

  logout(): Observable<any> {
    // Set flags to prevent layout breaking and show loading
    this.isLoggingOut = true;
    this.isRedirecting = true;
    this.isLoggingOutSubject.next(true);

    // Make API call in background (fire and forget) - don't wait for response
    // This ensures smooth logout without delay
    this.http.post<ApiResponse<boolean>>(`${this.API_URL}/logout`, {})
      .pipe(
        catchError(() => {
          // Silently handle errors - we're redirecting anyway
          return throwError(() => new Error('Logout failed'));
        })
      )
      .subscribe({
        next: () => {
          // API call succeeded, but we're already redirecting
        },
        error: () => {
          // API call failed, but we're already redirecting
        }
      });

    // Small delay to ensure loading overlay is visible before redirect
    // This prevents the screen from shrinking
    setTimeout(() => {
      // Clear auth data and redirect immediately for smooth logout experience
      this.clearAuthData();
      
      // Redirect immediately - no delay for smooth transition
      this.redirectToLoginSubdomain();
    }, 100);

    // Return an observable that completes immediately
    return of(true);
  }

  /**
   * Redirects to the login subdomain
   * Replaces current subdomain with "login" subdomain
   */
  private redirectToLoginSubdomain(): void {
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;
    const currentPort = window.location.port ? `:${window.location.port}` : '';

    let baseDomain = '';
    let loginHost = '';

    // Handle localhost (including subdomains like codified.localhost)
    if (currentHost.includes('localhost')) {
      // Always redirect to login.localhost (not login.org.localhost)
      loginHost = 'login.localhost';
    }
    // Handle IP addresses
    else if (currentHost.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      baseDomain = currentHost;
      loginHost = `login.${baseDomain}`;
    }
    // Handle production domains
    else {
      const hostParts = currentHost.split('.');

      if (hostParts.length >= 2) {
        // Extract base domain (last two parts)
        baseDomain = hostParts.slice(-2).join('.');
        loginHost = `login.${baseDomain}`;
      } else {
        // Fallback
        baseDomain = currentHost;
        loginHost = `login.${baseDomain}`;
      }
    }

    // Construct login subdomain URL with logout action
    const loginUrl = `${currentProtocol}//${loginHost}${currentPort}/login?action=logout`;

    // Use replace instead of href for faster, smoother redirect without adding to history
    window.location.replace(loginUrl);
  }


  //Added here Reset Password Function 

  resetPassword(token: string, password: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.API_URL}/reset-password`, {
      token,
      password
    }).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to reset password');
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const request: RefreshTokenRequest = { refreshToken };

    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/refresh`, request)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setAuthData(response.data);
            // Fetch permissions after token refresh
            this.fetchAndStoreUserPermissions(response.data.userId).subscribe();
          }
        }),
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Token refresh failed');
          }
          return response.data!;
        }),
        catchError(error => {
          this.clearAuthData();
          return this.handleError(error);
        })
      );
  }

  /**
   * Stores auth data temporarily in sessionStorage for cross-subdomain transfer
   * This is used when redirecting to a different subdomain during login
   */
  storePendingAuth(authResponse: AuthResponse): void {
    sessionStorage.setItem(this.PENDING_AUTH_KEY, JSON.stringify(authResponse));
  }

  /**
   * Completes the login process after subdomain redirect
   * Retrieves auth data from sessionStorage and sets it in localStorage
   */
  completeLogin(): void {
    const pendingAuthJson = sessionStorage.getItem(this.PENDING_AUTH_KEY);
    if (pendingAuthJson) {
      try {
        const authResponse: AuthResponse = JSON.parse(pendingAuthJson);
        this.setAuthData(authResponse);
        sessionStorage.removeItem(this.PENDING_AUTH_KEY);
      } catch (error) {
        sessionStorage.removeItem(this.PENDING_AUTH_KEY);
      }
    }
  }

  /**
   * Sets authentication data directly (used when no subdomain redirect is needed)
   */
  setAuthDataDirectly(authResponse: AuthResponse): void {
    this.setAuthData(authResponse);
  }

  /**
   * Checks if there is pending auth data from a subdomain redirect
   */
  hasPendingAuth(): boolean {
    return !!sessionStorage.getItem(this.PENDING_AUTH_KEY);
  }

  createUser(request: CreateUserRequest): Observable<User> {
    return this.http.post<ApiResponse<User>>(`${this.API_URL}/users`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'User creation failed');
          }
          return response.data!;
        }),
        catchError(this.handleError)
      );
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.API_URL}/me`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to get current user');
          }
          return response.data!;
        }),
        catchError(this.handleError)
      );
  }

  checkAuthStatus(): void {
    const token = this.getToken();
    const user = this.getStoredUser();

    if (token && user && !this.isTokenExpired(token)) {
      this.currentUserSubject.next(user);
      this.tokenSubject.next(token);
    } else {
      this.clearAuthData();
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user ? user.roleName === role : false;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUserSubject.value;
    return user ? roles.includes(user.roleName) : false;
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/register`, request)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setAuthData(response.data);
            // Fetch permissions immediately after successful registration
            this.fetchAndStoreUserPermissions(response.data.userId).subscribe();
          }
        }),
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Registration failed');
          }
          return response.data!;
        }),
        catchError(this.handleError)
      );
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.API_URL}/forgot-password`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to send reset email');
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /** Upload file through uploads API; returns the hosted URL. */
  uploadProfilePic(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string }>(`${this.uploadsUrl}/files`, formData).pipe(
      map((res) => {
        if (!res?.url) {
          throw new Error('Upload failed');
        }
        return res.url;
      })
    );
  }

  updateProfile(formData: FormData): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.API_URL}/profile`, formData)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            // ✅ Update the current user observable and local storage
            this.currentUserSubject.next(response.data);
            localStorage.setItem(this.USER_KEY, JSON.stringify(response.data));
          }
        }),
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Profile update failed');
          }
          return response.data!;
        }),
        catchError(this.handleError)
      );
  }



  changePassword(request: ChangePasswordRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.API_URL}/change-password`, request)
      .pipe(
        catchError(err => {
          // Optional: map backend error to your ApiResponse type
          const backendMessage = err?.error?.message || 'Failed to update password';
          return throwError(() => new Error(backendMessage));
        })
      );
  }


  private setAuthData(authResponse: AuthResponse): void {
    const user: User = {
      userId: authResponse.userId,
      employeeId: this.getEmployeeIdFromToken(authResponse.token) || undefined,
      email: authResponse.email,
      firstName: authResponse.firstName,
      lastName: authResponse.lastName,
      roleName: authResponse.roleName,
      organizationName: authResponse.organizationName || " ",
      isActive: true,
      createdAt: new Date().toISOString()
    };





    localStorage.setItem(this.TOKEN_KEY, authResponse.token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, authResponse.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));

    this.currentUserSubject.next(user);
    this.tokenSubject.next(authResponse.token);
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.PERMISSIONS_KEY);

    this.currentUserSubject.next(null);
    this.tokenSubject.next(null);
    this.permissionsSubject.next(null);
  }

  private loadStoredAuth(): void {
    // Don't load auth if we're in the middle of a redirect
    if (this.isRedirecting) {
      return;
    }

    const token = localStorage.getItem(this.TOKEN_KEY);
    const userJson = localStorage.getItem(this.USER_KEY);
    const permissionsJson = localStorage.getItem(this.PERMISSIONS_KEY);

    if (token && userJson) {
      try {
        const user: User = JSON.parse(userJson);
        const employeeId = user.employeeId || this.getEmployeeIdFromToken(token);
        if (employeeId && user.employeeId !== employeeId) {
          user.employeeId = employeeId;
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }
        if (!this.isTokenExpired(token)) {
          this.currentUserSubject.next(user);
          this.tokenSubject.next(token);
          
          // Load permissions if available
          if (permissionsJson) {
            try {
              const permissions: UserPermissions = JSON.parse(permissionsJson);
              this.permissionsSubject.next(permissions);
            } catch (e) {
              // Failed to parse stored permissions, will be fetched later
            }
          }
        } else {
          this.clearAuthData();
        }
      } catch (error) {
        this.clearAuthData();
      }
    } else {
      // Ensure we explicitly set the state as not authenticated
      this.currentUserSubject.next(null);
      this.tokenSubject.next(null);
      this.permissionsSubject.next(null);
    }
  }

  private initializePermissionsIfNeeded(): void {
    const user = this.currentUserSubject.value;

    // Always refresh when logged in so role permission changes apply without re-login
    if (user) {
      this.fetchAndStoreUserPermissions(user.userId).subscribe();
    }
  }

  private getStoredUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Decodes the current JWT and returns the employee GUID embedded in it.
   * The backend embeds it as the "EmployeeId" custom claim.
   * Returns null if the token is absent or the claim is not present.
   */
  getEmployeeIdFromToken(tokenOverride?: string | null): string | null {
    const token = tokenOverride ?? this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Try all casing variants the backend may have used
      return payload['EmployeeId']
          || payload['employeeId']
          || payload['employee_id']
          || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/employeeid']
          || null;
    } catch {
      return null;
    }
  }

  /**
   * Gets the current user permissions value
   */
  getUserPermissionsValue(): UserPermissions | null {
    return this.permissionsSubject.value;
  }

  /**
   * Refreshes user permissions from the backend API
   * Called when role permissions are updated via SignalR or other triggers
   * @returns Observable<UserPermissions | null> with the refreshed permissions
   */
  refreshPermissions(): Observable<UserPermissions | null> {
    const user = this.getCurrentUserValue();
    
    if (!user) {
      console.warn('⚠️ [AuthService] No user logged in, cannot refresh permissions');
      return of(null);
    }

    console.log('🔄 [AuthService] Refreshing permissions for user:', user.userId);
    return this.fetchAndStoreUserPermissions(user.userId);
  }

  /**
   * Checks if user has permission for a specific action under a menu/submenu
   * @param menuName - Name of the menu
   * @param subMenuName - Name of the submenu
   * @param actionKey - Key of the action to check
   * @returns true if user has permission, false otherwise
   */
  hasMenuPermission(menuName: string, subMenuName: string, actionKey: string): boolean {
    const permissions = this.permissionsSubject.value;
    if (!permissions) return false;

    const menu = permissions.menus.find(m =>
      m.menuName.toLowerCase() === menuName.toLowerCase()
    );
    if (!menu) return false;

    const normalizedKey = actionKey.toLowerCase();
    const matchingSubMenus = menu.subMenus.filter(sm =>
      sm.subMenuName.toLowerCase() === subMenuName.toLowerCase()
    );

    return matchingSubMenus.some(subMenu =>
      subMenu.actions.some(
        act => act.actionKey.toLowerCase() === normalizedKey && act.hasPermission
      )
    );
  }

  /**
   * Checks permission by action key across all menus/submenus.
   * When the same action key appears under multiple submenus, any granted match wins.
   */
  hasPermissionByActionKey(actionKey: string): boolean {
    const permissions = this.permissionsSubject.value;
    if (!permissions) return false;

    const normalizedKey = actionKey.toLowerCase();
    for (const menu of permissions.menus) {
      for (const subMenu of menu.subMenus) {
        if (subMenu.actions.some(
          act => act.actionKey.toLowerCase() === normalizedKey && act.hasPermission
        )) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Checks if user has any permission under a specific submenu
   * @param menuName - Name of the menu
   * @param subMenuName - Name of the submenu
   * @returns true if user has at least one permission, false otherwise
   */
  hasSubMenuPermission(menuName: string, subMenuName: string): boolean {
    const permissions = this.permissionsSubject.value;
    if (!permissions) {
      return false;
    }

    const menu = permissions.menus.find(m => 
      m.menuName.toLowerCase() === menuName.toLowerCase()
    );
    if (!menu) {
      return false;
    }

    const matchingSubMenus = menu.subMenus.filter(sm =>
      sm.subMenuName.toLowerCase() === subMenuName.toLowerCase()
    );
    if (matchingSubMenus.length === 0) {
      return false;
    }

    return matchingSubMenus.some(subMenu =>
      subMenu.actions.some(action => action.hasPermission)
    );
  }

  /**
   * Checks if user has any permission under a specific menu
   * @param menuName - Name of the menu
   * @returns true if user has at least one permission, false otherwise
   */
  hasMenuParentPermission(menuName: string): boolean {
    const permissions = this.permissionsSubject.value;
    if (!permissions) {
      return false;
    }

    const menu = permissions.menus.find(m => 
      m.menuName.toLowerCase() === menuName.toLowerCase()
    );
    if (!menu) {
      return false;
    }

    // Check if any submenu has any action with permission
    return menu.subMenus.some(subMenu => 
      subMenu.actions.some(action => action.hasPermission)
    );
  }

  /**
   * Checks if user has a specific action permission
   * @param menuName - Name of the parent menu
   * @param subMenuName - Name of the submenu
   * @param actionKey - Key of the action
   * @returns true if user has permission for this specific action
   */
  hasActionPermission(menuName: string, subMenuName: string, actionKey: string): boolean {
    const permissions = this.permissionsSubject.value;
    if (!permissions) {
      return false;
    }

    const menu = permissions.menus.find(m => 
      m.menuName.toLowerCase() === menuName.toLowerCase()
    );
    if (!menu) {
      return false;
    }

    return this.hasMenuPermission(menuName, subMenuName, actionKey);
  }

  getFirstAllowedRoute(): string {
    const permissions = this.permissionsSubject.value;
    if (!permissions) return '/dashboard';

    // Priority-ordered list: menuName → default route to navigate to
    const menuRouteMap: { menuName: string; route: string }[] = [
      { menuName: 'Admin Dashboard',      route: '/dashboard' },
      { menuName: 'Employee Dashboard',   route: '/employee/dashboard' },
      { menuName: 'Employee Management',  route: '/employees' },
      { menuName: 'Attendance',           route: '/attendance' },
      { menuName: 'Leave Management',     route: '/leave' },
      { menuName: 'Holidays',             route: '/holidays' },
      { menuName: 'Assets Management',    route: '/assets' },
      { menuName: 'Performance',          route: '/performance' },
      { menuName: 'Calendar',             route: '/calendar' },
      { menuName: 'AI Assistant',         route: '/ai-assistant' },
      { menuName: 'Subscription',         route: '/subscription' },
      { menuName: 'Billings',             route: '/subscription/billing' },
      { menuName: 'Expense',              route: '/expense' },
      { menuName: 'News',                 route: '/news' },
      { menuName: 'Help Desk',            route: '/help-desk' },
      { menuName: 'Jobs',                 route: '/jobs' },
      { menuName: 'Payroll',              route: '/payroll' },
      { menuName: 'Settings',             route: '/settings' },
    ];

    for (const entry of menuRouteMap) {
      if (this.hasMenuParentPermission(entry.menuName)) {
        return entry.route;
      }
    }

    return '/dashboard'; // absolute fallback
  }

  private normalizeRouteToken(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  private getModuleRouteName(moduleName: string): string | null {
    const normalizedModule = this.normalizeRouteToken(moduleName);

    const moduleAliases: { [key: string]: string } = {
      'employee': 'Employee Dashboard',
      'employees': 'Employee Management',
      'attendance': 'Attendance',
      'leave': 'Leave Management',
      'performance': 'Performance',
      'holiday': 'Holidays',
      'holidays': 'Holidays',
      'news': 'News',
      'expense': 'Expense',
      'timesheet': 'Timesheet',
      'assets': 'Assets Management',
      'subscription': 'Subscription',
      'billing': 'Billings',
      'jobs': 'Jobs',
      'payroll': 'Payroll',
      'settings': 'Settings',
      'help desk': 'Help Desk',
      'help-desk': 'Help Desk'
    };

    return moduleAliases[normalizedModule] ?? null;
  }

  private getMappedSubmenuRoute(menuName: string, subMenuName: string): string | null {
    const routeMap: Array<{ menuName: string; subMenuName: string; route: string }> = [
      { menuName: 'Leave Management', subMenuName: 'My Leaves', route: '/leave/dashboard' },
      { menuName: 'Leave Management', subMenuName: 'Team Leaves', route: '/leave/team' },
      { menuName: 'Leave Management', subMenuName: 'Team Requests', route: '/leave/team-requests' },
      { menuName: 'Leave Management', subMenuName: 'Leave Types', route: '/leave/types' },
      { menuName: 'Attendance', subMenuName: 'My Attendance', route: '/attendance/dashboard' },
      { menuName: 'Attendance', subMenuName: 'Time Tracker', route: '/attendance/time-tracker' },
      { menuName: 'Attendance', subMenuName: 'Team Attendance', route: '/attendance/team-attendance' },
      { menuName: 'Attendance', subMenuName: 'Reports', route: '/attendance/reports' },
      { menuName: 'Attendance', subMenuName: 'Shifts', route: '/attendance/shift' },
      { menuName: 'Attendance', subMenuName: 'Overtime', route: '/attendance/overtime' },
      { menuName: 'Attendance', subMenuName: 'Geo-Fences', route: '/attendance/geo-fences' },
      { menuName: 'Attendance', subMenuName: 'Geo Violations', route: '/attendance/geo-violations' },
      { menuName: 'Employee Management', subMenuName: 'All Employees', route: '/employees' },
      { menuName: 'Employee Management', subMenuName: 'Add Employee', route: '/employees/add' },
      { menuName: 'Employee Management', subMenuName: 'Department', route: '/employees/departments' },
      { menuName: 'Employee Management', subMenuName: 'Positions', route: '/employees/positions' },
      { menuName: 'Performance', subMenuName: 'My Performance', route: '/performance/dashboard' },
      { menuName: 'Performance', subMenuName: 'Performance', route: '/performance/dashboard' },
      { menuName: 'Performance', subMenuName: 'Appraisal Cycles', route: '/performance/cycles' },
      { menuName: 'Performance', subMenuName: 'Appraisals', route: '/performance/appraisals' },
      { menuName: 'Performance', subMenuName: 'Skill Matrix', route: '/performance/skills' },
      { menuName: 'Performance', subMenuName: 'Goals & KRAs', route: '/performance/goals' },
      { menuName: 'Performance', subMenuName: 'Performance Reports', route: '/performance/reports' },
      { menuName: 'Holidays', subMenuName: 'Holiday Management', route: '/holidays' },
      { menuName: 'Holidays', subMenuName: 'My Holidays', route: '/holidays/my-holidays' },
      { menuName: 'News', subMenuName: 'News Dashboard', route: '/news/dashboard' },
      { menuName: 'News', subMenuName: 'Create News', route: '/news/create-news' },
      { menuName: 'Expense', subMenuName: 'Category', route: '/expense/categories' },
      { menuName: 'Expense', subMenuName: 'Claims', route: '/expense/claims' },
      { menuName: 'Expense', subMenuName: 'Recurring Expenses', route: '/expense/recurring' },
      { menuName: 'Expense', subMenuName: 'Reports', route: '/expense/expense-report' },
      { menuName: 'Timesheet', subMenuName: 'Dashboard', route: '/timesheet/dashboard' },
      { menuName: 'Timesheet', subMenuName: 'Periods', route: '/timesheet/periods' },
      { menuName: 'Timesheet', subMenuName: 'Approvals', route: '/timesheet/approvals' },
      { menuName: 'Timesheet', subMenuName: 'Projects', route: '/timesheet/projects' },
      { menuName: 'Timesheet', subMenuName: 'Config', route: '/timesheet/config' },
      { menuName: 'Timesheet', subMenuName: 'Rate Cards', route: '/timesheet/rate-cards' },
      { menuName: 'Timesheet', subMenuName: 'Comp Time', route: '/timesheet/comp-time' },
      { menuName: 'Timesheet', subMenuName: 'Delegation', route: '/timesheet/delegation' },
      { menuName: 'Timesheet', subMenuName: 'Payroll Export', route: '/timesheet/payroll-export' },
      { menuName: 'Assets Management', subMenuName: 'Type of Assets', route: '/assets/types' },
      { menuName: 'Assets Management', subMenuName: 'Assets', route: '/assets/create' },
      { menuName: 'Subscription', subMenuName: 'Subscription', route: '/subscription' },
      { menuName: 'Billings', subMenuName: 'Billing', route: '/subscription/billing' }
    ];

    return routeMap.find(entry =>
      this.normalizeRouteToken(entry.menuName) === this.normalizeRouteToken(menuName) &&
      this.normalizeRouteToken(entry.subMenuName) === this.normalizeRouteToken(subMenuName)
    )?.route ?? null;
  }

  /**
   * Gets the first allowed submenu route in a given module
   * @param moduleName - The module name (e.g., 'attendance', 'leave')
   * @returns Route with first allowed submenu (e.g., '/leave/dashboard') or just module (e.g., '/leave')
   */
  getFirstAllowedRouteInModule(moduleName: string): string {
    const permissions = this.permissionsSubject.value;
    if (!permissions) return `/${moduleName}`;

    const menuName = this.getModuleRouteName(moduleName) ?? moduleName;
    const menu = permissions.menus.find(m =>
      this.normalizeRouteToken(m.menuName) === this.normalizeRouteToken(menuName)
    );

    if (!menu) {
      const baseRoute = this.getFirstAllowedRoute();
      return baseRoute.startsWith(`/${moduleName}`) ? baseRoute : `/${moduleName}`;
    }

    // Find the first submenu with allowed permission and a known route
    for (const subMenu of menu.subMenus) {
      const hasPermission = subMenu.actions.some(action => action.hasPermission);
      if (!hasPermission) continue;

      const mappedRoute = this.getMappedSubmenuRoute(menu.menuName, subMenu.subMenuName);
      if (mappedRoute) {
        return mappedRoute;
      }

      const fallbackRoute = `/${moduleName}/${subMenu.subMenuName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')}`;

      if (fallbackRoute !== `/${moduleName}/`) {
        return fallbackRoute;
      }
    }

    const baseRouteByMenu: { [key: string]: string } = {
      'Employee Dashboard': '/employee/dashboard',
      'Employee Management': '/employees',
      'Attendance': '/attendance',
      'Leave Management': '/leave',
      'Holidays': '/holidays',
      'Performance': '/performance',
      'News': '/news',
      'Expense': '/expense',
      'Timesheet': '/timesheet',
      'Assets Management': '/assets',
      'Subscription': '/subscription',
      'Billings': '/subscription/billing',
      'Help Desk': '/help-desk',
      'Jobs': '/jobs',
      'Payroll': '/payroll',
      'Settings': '/settings'
    };

    return baseRouteByMenu[menu.menuName] ?? `/${moduleName}`;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true;
    }
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.error?.errors?.length > 0) {
      errorMessage = error.error.errors.join(', ');
    }

    return throwError(() => new Error(errorMessage));
  }
  verifyEmail(token: string) {
    return this.http.get<any>(`${this.API_URL}/verify-email?token=${token}`);
  }
}
