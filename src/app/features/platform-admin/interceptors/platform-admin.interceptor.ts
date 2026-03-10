import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlatformAdminAuthService } from '../services/platform-admin-auth.service';

/**
 * HTTP interceptor that attaches the platform admin JWT token
 * to requests going to SuperAdmin or DemoInquiry (admin) endpoints.
 */
@Injectable()
export class PlatformAdminInterceptor implements HttpInterceptor {

  constructor(private platformAuthService: PlatformAdminAuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only intercept requests to platform admin endpoints
    const platformEndpoints = ['/SuperAdmin', '/PlatformAuth'];
    const isPlatformRequest = platformEndpoints.some(ep => req.url.includes(ep));

    // Also intercept DemoInquiry GET/PUT (admin operations, not the public POST)
    const isDemoInquiryAdminRequest = req.url.includes('/DemoInquiry') && req.method !== 'POST';

    if (!isPlatformRequest && !isDemoInquiryAdminRequest) {
      return next.handle(req);
    }

    // Don't override if auth header already set
    if (req.headers.has('Authorization')) {
      return next.handle(req);
    }

    const token = this.platformAuthService.getToken();
    if (token) {
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next.handle(cloned);
    }

    return next.handle(req);
  }
}
