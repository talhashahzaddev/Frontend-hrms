import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ApiResponse } from '@core/models/auth.models';

export interface DomainValidationResponse {
  isValid: boolean;
  domain?: string;
  organizationId?: string;
  organizationName?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DomainService {
  private readonly API_URL = `${environment.apiUrl}/Domain`;

  constructor(private http: HttpClient) {}

  /**
   * Validates if the current subdomain exists in the database
   * @param subdomain The subdomain to validate (e.g., "xyz" from "xyz.briskpeople.com")
   * @returns Observable with validation result
   */
  validateDomain(subdomain: string): Observable<DomainValidationResponse> {
    if (!subdomain) {
      return throwError(() => new Error('Subdomain is required'));
    }

    return this.http.get<ApiResponse<DomainValidationResponse>>(`${this.API_URL}/validate/${subdomain}`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Domain validation failed');
          }
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Whitelisted subdomains that don't require validation
   */
  /**
   * Whitelisted subdomains that don't require validation
   */
  private readonly WHITELISTED_SUBDOMAINS = ['frontend-hrms-phi', 'reset-password', 'login'];
  /**
   * Extracts subdomain from current window location
   * @returns The subdomain (e.g., "xyz" from "xyz.briskpeople.com")
   */
  getCurrentSubdomain(): string | null {
    const hostname = window.location.hostname.toLowerCase().replace(/^www\./, '');
    const baseDomain = environment.baseDomain.toLowerCase();

    // On localhost (local dev), no subdomain validation needed
    if (baseDomain === 'localhost' || hostname === 'localhost' || /^127\./.test(hostname) || /^192\.168\./.test(hostname)) {
      return null;
    }

    // If hostname exactly matches the base domain (e.g., briskpeople.com or dev.briskpeople.com)
    // then we are on the main login page — no company subdomain present
    if (hostname === baseDomain) {
      return null;
    }

    // If hostname ends with .{baseDomain}, extract whatever comes before it
    // e.g., hostname = "companyX.briskpeople.com", baseDomain = "briskpeople.com"
    //       -> returns "companyX"
    // e.g., hostname = "companyX.dev.briskpeople.com", baseDomain = "dev.briskpeople.com"
    //       -> returns "companyX"
    if (hostname.endsWith('.' + baseDomain)) {
      const subdomain = hostname.slice(0, hostname.length - baseDomain.length - 1);
      // Only return if it's a single-level subdomain (no dots inside)
      if (subdomain && !subdomain.includes('.')) {
        return subdomain;
      }
    }

    return null;
  }

  /**
   * Checks if a subdomain is whitelisted (doesn't require validation)
   */
  isWhitelistedSubdomain(subdomain: string | null): boolean {
    if (!subdomain) return false;
    return this.WHITELISTED_SUBDOMAINS.includes(subdomain.toLowerCase());
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'Domain validation failed';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}

