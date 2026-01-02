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
   * Extracts subdomain from current window location
   * @returns The subdomain (e.g., "xyz" from "xyz.briskpeople.com")
   */
  getCurrentSubdomain(): string | null {
    const hostname = window.location.hostname;
    
    // Remove protocol if present
    let cleanHostname = hostname.replace(/^https?:\/\//, '');
    
    // Remove www if present
    cleanHostname = cleanHostname.replace(/^www\./, '');
    
    // Split by dots
    const parts = cleanHostname.split('.');
    
    // If we have at least 3 parts (subdomain.domain.tld), return the first part
    // Example: "xyz.briskpeople.com" -> ["xyz", "briskpeople", "com"] -> "xyz"
    if (parts.length >= 3) {
      return parts[0].toLowerCase();
    }
    
    // If we have 2 parts, check if it's a subdomain pattern
    // For localhost or IP addresses, return null
    if (parts.length === 2) {
      // Check if it's localhost or an IP address
      if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
        return null;
      }
      // For development, might be "subdomain.localhost" or similar
      return parts[0].toLowerCase();
    }
    
    // For localhost or single-part domains, return null (skip validation in development)
    if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.')) {
      return null;
    }
    
    return null;
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

