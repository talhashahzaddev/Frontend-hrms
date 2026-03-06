import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';
import {
  PlatformAdminLoginRequest,
  PlatformAdminAuthResponse,
  ApiResponse
} from '../models/super-admin.models';

@Injectable({ providedIn: 'root' })
export class PlatformAdminAuthService {
  private readonly API_URL = `${environment.apiUrl}/PlatformAuth`;
  private readonly PLATFORM_TOKEN_KEY = 'platform_admin_token';
  private readonly PLATFORM_USER_KEY = 'platform_admin_user';

  private currentAdminSubject = new BehaviorSubject<PlatformAdminAuthResponse | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public currentAdmin$ = this.currentAdminSubject.asObservable();
  public isAuthenticated$ = this.currentAdminSubject.pipe(map(admin => !!admin));

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredAuth();
  }

  login(request: PlatformAdminLoginRequest): Observable<ApiResponse<PlatformAdminAuthResponse>> {
    return this.http.post<ApiResponse<PlatformAdminAuthResponse>>(`${this.API_URL}/login`, request).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setAuthData(response.data);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.PLATFORM_TOKEN_KEY);
    localStorage.removeItem(this.PLATFORM_USER_KEY);
    this.currentAdminSubject.next(null);
    this.tokenSubject.next(null);
    this.router.navigate(['/platform-admin/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.PLATFORM_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Check token expiration
    const admin = this.getCurrentAdmin();
    if (admin && admin.tokenExpiration) {
      return new Date(admin.tokenExpiration) > new Date();
    }
    return false;
  }

  getCurrentAdmin(): PlatformAdminAuthResponse | null {
    return this.currentAdminSubject.value;
  }

  isPlatformAdmin(): boolean {
    const admin = this.getCurrentAdmin();
    return admin?.role === 'Platform Admin';
  }

  getAdminName(): string {
    const admin = this.getCurrentAdmin();
    return admin?.fullName || 'Admin';
  }

  private setAuthData(data: PlatformAdminAuthResponse): void {
    localStorage.setItem(this.PLATFORM_TOKEN_KEY, data.token);
    localStorage.setItem(this.PLATFORM_USER_KEY, JSON.stringify(data));
    this.tokenSubject.next(data.token);
    this.currentAdminSubject.next(data);
  }

  private loadStoredAuth(): void {
    const token = localStorage.getItem(this.PLATFORM_TOKEN_KEY);
    const userStr = localStorage.getItem(this.PLATFORM_USER_KEY);

    if (token && userStr) {
      try {
        const admin = JSON.parse(userStr) as PlatformAdminAuthResponse;
        if (new Date(admin.tokenExpiration) > new Date()) {
          this.tokenSubject.next(token);
          this.currentAdminSubject.next(admin);
        } else {
          this.logout();
        }
      } catch {
        this.logout();
      }
    }
  }
}
