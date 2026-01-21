// import { Injectable } from '@angular/core';
// import { 
//   HttpInterceptor, 
//   HttpRequest, 
//   HttpHandler, 
//   HttpEvent 
// } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { finalize } from 'rxjs/operators';
// import { LoadingService } from '@core/services/loading.service';

// @Injectable()
// export class LoadingInterceptor implements HttpInterceptor {
//   private readonly excludeUrls = [
//     '/auth/refresh',
//     '/dashboard/stats',
//     '/attendance/today'
//   ];

//   constructor(private loadingService: LoadingService) {}

//   intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
//     // Skip loading for certain endpoints to avoid too many spinners
//     if (this.shouldSkipLoading(request.url)) {
//       return next.handle(request);
//     }

//     // Show loading spinner
//     this.loadingService.show();

//     return next.handle(request).pipe(
//       finalize(() => {
//         // Hide loading spinner when request completes (success or error)
//         this.loadingService.hide();
//       })
//     );
//   }

//   private shouldSkipLoading(url: string): boolean {
//     return this.excludeUrls.some(excludeUrl => url.includes(excludeUrl));
//   }
// }




import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '@core/services/loading.service';
import { ProgressBarService } from '@core/services/progress-bar.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private readonly excludeUrls = [
    '/auth/refresh',
    '/attendance/today',
    '/Chat/message', // Exclude chat API to show typing indicator instead
    '/chat/message' // Case-insensitive fallback
  ];

  constructor(
    private loadingService: LoadingService,
    private progressBarService: ProgressBarService
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip loading for certain endpoints
    if (this.shouldSkipLoading(request.url)) {
      return next.handle(request);
    }

    // Determine if this is a user action (POST, PUT, DELETE, PATCH)
    const isUserAction = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
    
    // Only show full-screen spinner for user actions (form submissions, deletions, etc.)
    // For GET requests, only show progress bar (no full-screen spinner)
    if (isUserAction) {
      this.loadingService.show();
    }
    
    // Always show progress bar for API calls
    this.progressBarService.start();

    return next.handle(request).pipe(
      finalize(() => {
        // Hide loading spinner only if it was shown (user actions)
        if (isUserAction) {
          this.loadingService.hide();
        }
        
        // Complete progress bar
        this.progressBarService.complete();
      })
    );
  }

  private shouldSkipLoading(url: string): boolean {
    return this.excludeUrls.some(excludeUrl => url.includes(excludeUrl));
  }
}