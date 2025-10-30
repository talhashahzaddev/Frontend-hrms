// import { Injectable } from '@angular/core';
// import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
// import { Observable, throwError, BehaviorSubject, filter, take, switchMap, catchError } from 'rxjs';
// import { AuthService } from '@core/services/auth.service';

// @Injectable()
// export class AuthInterceptor implements HttpInterceptor {
//   private isRefreshing = false;
//   private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

//   constructor(private authService: AuthService) {}

//   intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
//     const token = this.authService.getToken();
    
//     if (token && !this.isAuthUrl(request.url)) {
//       request = this.addToken(request, token);
//     }

//     return next.handle(request).pipe(
//       catchError(error => {
//         if (error instanceof HttpErrorResponse && error.status === 401) {
//           return this.handle401Error(request, next);
//         } else {
//           return throwError(() => error);
//         }
//       })
//     );
//   }

//   private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
//     return request.clone({
//       setHeaders: {
//         Authorization: `Bearer ${token}`
//       }
//     });
//   }

//   private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
//     if (!this.isRefreshing) {
//       this.isRefreshing = true;
//       this.refreshTokenSubject.next(null);

//       return this.authService.refreshToken().pipe(
//         switchMap((authResponse: any) => {
//           this.isRefreshing = false;
//           this.refreshTokenSubject.next(authResponse.token);
//           return next.handle(this.addToken(request, authResponse.token));
//         }),
//         catchError((error) => {
//           this.isRefreshing = false;
//           this.authService.logout().subscribe();
//           return throwError(() => error);
//         })
//       );
//     } else {
//       return this.refreshTokenSubject.pipe(
//         filter(token => token != null),
//         take(1),
//         switchMap(token => {
//           return next.handle(this.addToken(request, token));
//         })
//       );
//     }
//   }

//   private isAuthUrl(url: string): boolean {
//     return url.includes('/auth/login') || 
//            url.includes('/auth/refresh') || 
//            url.includes('/auth/register') ||
//            url.includes('/auth/forgot-password');
//   }
// }






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

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    // ✅ Add token only for non-auth routes
    if (token && !this.isAuthUrl(request.url)) {
      request = this.addToken(request, token);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
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
}