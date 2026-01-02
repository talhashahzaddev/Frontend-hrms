import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, map } from 'rxjs';
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

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();
  public isAuthenticated$ = this.currentUserSubject.asObservable().pipe(
    map(user => !!user)
  );

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadStoredAuth();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.setAuthData(response.data);
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
    return this.http.post<ApiResponse<boolean>>(`${this.API_URL}/logout`, {})
      .pipe(
        tap(() => {
          this.clearAuthData();
          this.redirectToLoginSubdomain();
        }),
        catchError(() => {
          // Even if the API call fails, clear local data
          this.clearAuthData();
          this.redirectToLoginSubdomain();
          return throwError(() => new Error('Logout failed'));
        })
      );
  }

  /**
   * Redirects to the login subdomain
   * Replaces current subdomain with "login" subdomain
   */
  private redirectToLoginSubdomain(): void {
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;
    const currentPort = window.location.port ? `:${window.location.port}` : '';
    
    // Extract base domain (e.g., "briskpeople.com" from "shahzad.briskpeople.com")
    const hostParts = currentHost.split('.');
    let baseDomain = '';
    
    if (hostParts.length >= 2) {
      // Get the last two parts (e.g., "briskpeople.com")
      baseDomain = hostParts.slice(-2).join('.');
    } else {
      // Fallback: if we can't extract, use a default base domain
      // In production, this should be "briskpeople.com"
      baseDomain = currentHost.includes('localhost') ? currentHost : 'briskpeople.com';
    }
    
    // Construct login subdomain URL
    const loginUrl = `${currentProtocol}//login.${baseDomain}${currentPort}/login`;
    
    console.log(`Redirecting to login subdomain: ${loginUrl}`);
    
    // Redirect to login subdomain
    window.location.href = loginUrl;
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
      organizationName: authResponse.organizationName|| " " ,
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
}
