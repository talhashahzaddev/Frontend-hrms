import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, timer } from 'rxjs';
import { catchError, retry, retryWhen, delay, take, concat, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';
import { LoadingService } from './loading.service';

export interface ApiConnectionStatus {
  isConnected: boolean;
  lastChecked: Date;
  responseTime: number;
  errorCount: number;
}

export interface ApiHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  services: {
    database: boolean;
    authentication: boolean;
    email: boolean;
  };
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition?: (error: HttpErrorResponse) => boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiIntegrationService {
  private apiUrl = environment.apiUrl;
  private connectionStatusSubject = new BehaviorSubject<ApiConnectionStatus>({
    isConnected: true,
    lastChecked: new Date(),
    responseTime: 0,
    errorCount: 0
  });

  private healthCheckInterval: any;
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    retryCondition: (error) => error.status >= 500 || error.status === 0
  };

  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private loadingService: LoadingService
  ) {
    this.initializeHealthChecking();
  }

  /**
   * Initialize periodic health checking
   */
  private initializeHealthChecking(): void {
    this.performHealthCheck();
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Check every minute
  }

  /**
   * Perform health check against the API
   */
  performHealthCheck(): Observable<ApiHealthCheck> {
    const startTime = Date.now();
    
    return this.http.get<ApiHealthCheck>(`${this.apiUrl}/health`).pipe(
      catchError((error) => {
        this.updateConnectionStatus(false, Date.now() - startTime, true);
        return throwError(() => error);
      }),
      switchMap((health) => {
        this.updateConnectionStatus(true, Date.now() - startTime, false);
        return [health];
      })
    );
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(isConnected: boolean, responseTime: number, hasError: boolean): void {
    const currentStatus = this.connectionStatusSubject.value;
    const newStatus: ApiConnectionStatus = {
      isConnected,
      lastChecked: new Date(),
      responseTime,
      errorCount: hasError ? currentStatus.errorCount + 1 : Math.max(0, currentStatus.errorCount - 1)
    };

    this.connectionStatusSubject.next(newStatus);

    // Show notifications for connection issues
    if (!isConnected && currentStatus.isConnected) {
      this.notificationService.error('Lost connection to server. Retrying...');
    } else if (isConnected && !currentStatus.isConnected) {
      this.notificationService.success('Connection to server restored');
    }
  }

  /**
   * Enhanced HTTP GET with retry logic and error handling
   */
  get<T>(endpoint: string, options?: {
    showLoading?: boolean;
    retryConfig?: Partial<RetryConfig>;
    suppressErrors?: boolean;
  }): Observable<T> {
    const config = { ...this.defaultRetryConfig, ...options?.retryConfig };
    
    if (options?.showLoading !== false) {
      this.loadingService.show();
    }

    return this.http.get<T>(`${this.apiUrl}${endpoint}`).pipe(
      retryWhen(errors =>
        errors.pipe(
          delay(config.retryDelay),
          take(config.maxRetries),
          concat(throwError(() => new Error('Max retry limit reached')))
        )
      ),
      catchError((error) => this.handleError(error, options?.suppressErrors)),
      switchMap((response) => {
        if (options?.showLoading !== false) {
          this.loadingService.hide();
        }
        return [response];
      })
    );
  }

  /**
   * Enhanced HTTP POST with retry logic and error handling
   */
  post<T>(endpoint: string, data: any, options?: {
    showLoading?: boolean;
    retryConfig?: Partial<RetryConfig>;
    suppressErrors?: boolean;
  }): Observable<T> {
    const config = { ...this.defaultRetryConfig, ...options?.retryConfig };
    
    if (options?.showLoading !== false) {
      this.loadingService.show();
    }

    return this.http.post<T>(`${this.apiUrl}${endpoint}`, data).pipe(
      retryWhen(errors =>
        errors.pipe(
          delay(config.retryDelay),
          take(config.maxRetries),
          concat(throwError(() => new Error('Max retry limit reached')))
        )
      ),
      catchError((error) => this.handleError(error, options?.suppressErrors)),
      switchMap((response) => {
        if (options?.showLoading !== false) {
          this.loadingService.hide();
        }
        return [response];
      })
    );
  }

  /**
   * Enhanced HTTP PUT with retry logic and error handling
   */
  put<T>(endpoint: string, data: any, options?: {
    showLoading?: boolean;
    retryConfig?: Partial<RetryConfig>;
    suppressErrors?: boolean;
  }): Observable<T> {
    const config = { ...this.defaultRetryConfig, ...options?.retryConfig };
    
    if (options?.showLoading !== false) {
      this.loadingService.show();
    }

    return this.http.put<T>(`${this.apiUrl}${endpoint}`, data).pipe(
      retryWhen(errors =>
        errors.pipe(
          delay(config.retryDelay),
          take(config.maxRetries),
          concat(throwError(() => new Error('Max retry limit reached')))
        )
      ),
      catchError((error) => this.handleError(error, options?.suppressErrors)),
      switchMap((response) => {
        if (options?.showLoading !== false) {
          this.loadingService.hide();
        }
        return [response];
      })
    );
  }

  /**
   * Enhanced HTTP DELETE with retry logic and error handling
   */
  delete<T>(endpoint: string, options?: {
    showLoading?: boolean;
    retryConfig?: Partial<RetryConfig>;
    suppressErrors?: boolean;
  }): Observable<T> {
    const config = { ...this.defaultRetryConfig, ...options?.retryConfig };
    
    if (options?.showLoading !== false) {
      this.loadingService.show();
    }

    return this.http.delete<T>(`${this.apiUrl}${endpoint}`).pipe(
      retryWhen(errors =>
        errors.pipe(
          delay(config.retryDelay),
          take(config.maxRetries),
          concat(throwError(() => new Error('Max retry limit reached')))
        )
      ),
      catchError((error) => this.handleError(error, options?.suppressErrors)),
      switchMap((response) => {
        if (options?.showLoading !== false) {
          this.loadingService.hide();
        }
        return [response];
      })
    );
  }

  /**
   * File upload with progress tracking
   */
  uploadFile(endpoint: string, file: File, additionalData?: any): Observable<any> {
    this.loadingService.show();

    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    return this.http.post(`${this.apiUrl}${endpoint}`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      catchError((error) => this.handleError(error)),
      switchMap((response) => {
        this.loadingService.hide();
        return [response];
      })
    );
  }

  /**
   * Download file
   */
  downloadFile(endpoint: string, filename?: string): Observable<Blob> {
    this.loadingService.show();

    return this.http.get(`${this.apiUrl}${endpoint}`, {
      responseType: 'blob'
    }).pipe(
      catchError((error) => this.handleError(error)),
      switchMap((blob) => {
        this.loadingService.hide();
        
        // Auto-download file
        if (filename) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
        
        return [blob];
      })
    );
  }

  /**
   * Batch API requests
   */
  batchRequests<T>(requests: Observable<T>[]): Observable<T[]> {
    this.loadingService.show();

    return new Observable(observer => {
      const results: T[] = [];
      let completed = 0;

      requests.forEach((request, index) => {
        request.subscribe({
          next: (result) => {
            results[index] = result;
            completed++;
            
            if (completed === requests.length) {
              this.loadingService.hide();
              observer.next(results);
              observer.complete();
            }
          },
          error: (error) => {
            this.loadingService.hide();
            observer.error(error);
          }
        });
      });
    });
  }

  /**
   * Test API connectivity
   */
  testConnection(): Observable<boolean> {
    return this.http.get(`${this.apiUrl}/health`).pipe(
      switchMap(() => [true]),
      catchError(() => [false])
    );
  }

  /**
   * Global error handler
   */
  private handleError(error: HttpErrorResponse, suppressErrors: boolean = false): Observable<never> {
    this.loadingService.hide();

    let errorMessage = 'An unexpected error occurred';
    let errorType = 'error';

    // Update connection status
    this.updateConnectionStatus(false, 0, true);

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Network Error: ${error.error.message}`;
      errorType = 'error';
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Bad Request';
          errorType = 'warning';
          break;
        case 401:
          errorMessage = 'Session expired. Please log in again.';
          errorType = 'warning';
          // Redirect to login or refresh token
          this.handleUnauthorized();
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action';
          errorType = 'error';
          break;
        case 404:
          errorMessage = 'The requested resource was not found';
          errorType = 'warning';
          break;
        case 409:
          errorMessage = error.error?.message || 'Conflict occurred';
          errorType = 'warning';
          break;
        case 422:
          errorMessage = error.error?.message || 'Validation failed';
          errorType = 'warning';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          errorType = 'error';
          break;
        case 0:
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
          errorType = 'error';
          break;
        default:
          errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
          errorType = 'error';
      }
    }

    // Show error notification if not suppressed
    if (!suppressErrors) {
      if (errorType === 'error') {
        this.notificationService.error(errorMessage);
      } else {
        this.notificationService.warning(errorMessage);
      }
    }

    // Log error for debugging
    console.error('API Error:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: errorMessage,
      error: error.error
    });

    return throwError(() => ({
      status: error.status,
      message: errorMessage,
      originalError: error
    }));
  }

  /**
   * Handle unauthorized responses
   */
  private handleUnauthorized(): void {
    // Clear tokens, redirect to login, etc.
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ApiConnectionStatus {
    return this.connectionStatusSubject.value;
  }

  /**
   * Check if API is healthy
   */
  isApiHealthy(): boolean {
    const status = this.getConnectionStatus();
    return status.isConnected && status.errorCount < 3;
  }

  /**
   * Get API base URL
   */
  getApiUrl(): string {
    return this.apiUrl;
  }

  /**
   * Refresh all cached data
   */
  refreshAllData(): void {
    // Emit refresh events to all services
    window.dispatchEvent(new CustomEvent('api-refresh-all'));
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    // Implement cache clearing logic
    localStorage.removeItem('hrms-cache');
    sessionStorage.clear();
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.connectionStatusSubject.complete();
  }
}
