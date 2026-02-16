import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Router } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import { environment } from '@environments/environment';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private notificationService: NotificationService
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      retry(this.shouldRetry(request) ? 1 : 0),
      catchError((error: HttpErrorResponse) => {
        this.handleHttpError(error);
        return throwError(() => error);
      })
    );
  }

  private handleHttpError(error: HttpErrorResponse): void {
    let errorMessage = 'An unexpected error occurred';
    
    switch (error.status) {
      case 0:
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
        this.notificationService.networkError();
        break;
        
      case 400:
        errorMessage = this.extractErrorMessage(error) || 'Invalid request. Please check your input.';
        break;
        
      case 401:
        errorMessage = 'Your session has expired. Please login again.';
        // Don't show notification for 401 as AuthInterceptor handles it
        break;
        
      case 403:
        errorMessage = 'You do not have permission to perform this action.';
        this.notificationService.permissionDenied();
        // Only navigate to 403 page for non-API 403 (e.g. route guard). For API 403, stay on current page and show toast.
        if (!this.isApiCall(error.url)) {
          this.router.navigate(['/403']);
        }
        break;
        
      case 404:
        errorMessage = 'The requested resource was not found.';
        if (!this.isApiCall(error.url)) {
          this.router.navigate(['/404']);
        }
        break;
        
      case 422:
        errorMessage = this.extractErrorMessage(error) || 'Validation failed. Please check your input.';
        this.notificationService.validationError(errorMessage);
        break;
        
      case 500:
        errorMessage = 'Internal server error. Please try again later.';
        this.notificationService.error({
          title: 'Server Error',
          message: errorMessage
        });
        if (!this.isApiCall(error.url)) {
          this.router.navigate(['/500']);
        }
        break;
        
      case 502:
      case 503:
      case 504:
        errorMessage = 'Server is temporarily unavailable. Please try again later.';
        this.notificationService.error({
          title: 'Service Unavailable',
          message: errorMessage
        });
        break;
        
      default:
        errorMessage = `Error ${error.status}: ${error.message}`;
        this.notificationService.error(errorMessage);
        break;
    }

    // Log error in development mode
    if (!environment.production) {
      console.error('HTTP Error:', error);
      console.error('Error details:', {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        message: errorMessage,
        error: error.error
      });
    }
  }

  private extractErrorMessage(error: HttpErrorResponse): string | null {
    if (error.error?.message) {
      return error.error.message;
    }
    
    if (error.error?.errors && Array.isArray(error.error.errors)) {
      return error.error.errors.join(', ');
    }
    
    if (error.error?.title) {
      return error.error.title;
    }
    
    if (typeof error.error === 'string') {
      return error.error;
    }
    
    return null;
  }

  private shouldRetry(request: HttpRequest<any>): boolean {
    // Only retry GET requests
    return request.method === 'GET';
  }

  private isApiCall(url: string | null): boolean {
    return url ? url.includes('/api/') : false;
  }
}
