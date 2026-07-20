import { Injectable } from '@angular/core';
import { 
  HttpInterceptor, 
  HttpRequest, 
  HttpHandler, 
  HttpEvent, 
  HttpErrorResponse 
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '@core/services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    // ✅ Add token only for non-auth routes
    if (token && !this.isAuthUrl(request.url)) {
      request = this.addToken(request, token);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // ✅ Never handle 401s when the user is on a platform-admin route.
        // Platform-admin has its own auth system (PlatformAdminAuthService).
        // Intercepting 401s here would incorrectly trigger a logout/redirect.
        if (this.isPlatformAdminRoute()) {
          return throwError(() => error);
        }

        // ✅ Only handle 401 if NOT from auth endpoints
        if (error.status === 401 && !this.isAuthUrl(request.url)) {
          return this.handle401Error(request, next);
        }

        // ❌ Otherwise, pass the error to the component (e.g., invalid credentials)
        return throwError(() => error);
      })
    );
  }

  // ✅ Helper to add Authorization header
  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // ✅ Handle token refresh logic
  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((authResponse: any) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(authResponse.token);
          return next.handle(this.addToken(request, authResponse.token));
        }),
        catchError((error) => {
          this.isRefreshing = false;
          this.authService.logout().subscribe();
          return throwError(() => error);
        })
      );
    } else {
      // Wait for refresh to complete
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(token => next.handle(this.addToken(request, token)))
      );
    }
  }

  // ✅ Detect if the request is for an auth endpoint
  private isAuthUrl(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return (
      lowerUrl.includes('/auth/login') ||
      lowerUrl.includes('/auth/register') ||
      lowerUrl.includes('/auth/refresh') ||
      lowerUrl.includes('/auth/logout') ||
      lowerUrl.includes('/auth/forgot-password')
    );
  }

  /**
   * Returns true when the Angular router is currently on a platform-admin route.
   * In that case the main AuthService is not in use and we must NOT attempt
   * token refresh or logout, as there is no regular user session.
   */
  private isPlatformAdminRoute(): boolean {
    return window.location.pathname.startsWith('/platform-admin');
  }
}