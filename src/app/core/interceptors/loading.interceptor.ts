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

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private readonly excludeUrls = [
    '/auth/refresh',
    '/attendance/today'
  ];

  constructor(private loadingService: LoadingService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip loading for certain endpoints
    if (this.shouldSkipLoading(request.url)) {
      return next.handle(request);
    }

    // Show loading spinner
    this.loadingService.show();

    return next.handle(request).pipe(
      finalize(() => {
        // Hide loading spinner when request completes (success or error)
        this.loadingService.hide();
      })
    );
  }

  private shouldSkipLoading(url: string): boolean {
    return this.excludeUrls.some(excludeUrl => url.includes(excludeUrl));
  }
}