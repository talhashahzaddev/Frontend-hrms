import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, map, of } from 'rxjs';
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
  ChangePasswordRequest
} from '@core/models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/Auth`;
  private readonly TOKEN_KEY = environment.auth.tokenKey;
  private readonly REFRESH_TOKEN_KEY = environment.auth.refreshTokenKey;
  private readonly USER_KEY = environment.auth.userKey;
  private readonly PENDING_AUTH_KEY = 'pendingAuthData';
  private readonly LOGOUT_REDIRECT_KEY = 'logoutRedirect';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private isRedirecting = false;
  private isLoggingOut = false;
  private isLoggingOutSubject = new BehaviorSubject<boolean>(false);
  
  public isLoggingOut$ = this.isLoggingOutSubject.asObservable();

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();
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
  }

  /**
   * Internal method to complete pending auth during construction
   */
  private completePendingAuthIfExists(): void {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for logout action
    if (urlParams.get('action') === 'logout') {
      console.log('Logout redirect detected');
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

        console.log('Completed login after subdomain redirect for user:', user.firstName);

        // Clean up URL
        this.removeUrlParam('auth_transfer');

        // Update subject immediately
        this.currentUserSubject.next(user);
        this.tokenSubject.next(authResponse.token);
      } catch (error) {
        console.error('Failed to complete pending login from URL:', error);
      }
    }

    // Fallback: Check sessionStorage (for same-domain redirects if any)
    const pendingAuthJson = sessionStorage.getItem(this.PENDING_AUTH_KEY);
    if (pendingAuthJson) {
      try {
        const authResponse: AuthResponse = JSON.parse(pendingAuthJson);
        const user: User = {
          userId: authResponse.userId,
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
      } catch (error) {
        sessionStorage.removeItem(this.PENDING_AUTH_KEY);
      }
    }
  }

  private removeUrlParam(param: string): void {
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    window.history.replaceState({}, '', url.toString());
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/login`, credentials)
      .pipe(
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

    console.log(`Redirecting to login subdomain: ${loginUrl}`);

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
        console.error('Failed to complete login:', error);
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

    this.currentUserSubject.next(null);
    this.tokenSubject.next(null);
  }

  private loadStoredAuth(): void {
    // Don't load auth if we're in the middle of a redirect
    if (this.isRedirecting) {
      return;
    }

    const token = localStorage.getItem(this.TOKEN_KEY);
    const userJson = localStorage.getItem(this.USER_KEY);

    if (token && userJson) {
      try {
        const user: User = JSON.parse(userJson);
        if (!this.isTokenExpired(token)) {
          this.currentUserSubject.next(user);
          this.tokenSubject.next(token);
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
