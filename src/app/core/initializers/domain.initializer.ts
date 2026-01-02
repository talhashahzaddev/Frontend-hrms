import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';

/**
 * Whitelisted subdomains that don't require validation
 */
const WHITELISTED_SUBDOMAINS = ['frontend-hrms-phi'];

/**
 * Extracts subdomain from current window location
 */
function getCurrentSubdomain(): string | null {
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

/**
 * Shows error page when domain is invalid
 */
function showDomainErrorPage(subdomain: string, message: string): void {
  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      text-align: center;
    ">
      <div style="
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 40px;
        max-width: 600px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      ">
        <div style="font-size: 64px; margin-bottom: 50px;">🚫</div>
        <h1 style="font-size: 32px; margin: 0 0 20px 0; font-weight: 700;">Domain Not Found</h1>
        <p style="font-size: 18px; margin: 0 0 30px 0; opacity: 0.9; line-height: 1.6;">
          The domain <strong>${subdomain}.briskpeople.com</strong> is not available or has been deactivated.
        </p>
        <p style="font-size: 16px; margin: 0 0 30px 0; opacity: 0.8; line-height: 1.6;">
          ${message}
        </p>
        <div style="
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          padding: 20px;
          margin-top: 20px;
        ">
          <p style="font-size: 14px; margin: 0; opacity: 0.9;">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Domain validation initializer
 * This runs BEFORE the Angular app bootstraps
 * If domain is invalid, the app will not load
 */
export function domainInitializer(): () => Promise<void> {
  return async () => {
    const http = inject(HttpClient);
    
    // Get current subdomain
    const subdomain = getCurrentSubdomain();
    
    // Skip validation if no subdomain (development/localhost)
    if (!subdomain) {
      console.warn('No subdomain detected. Skipping domain validation (development mode).');
      return;
    }

    // Skip validation for whitelisted subdomains
    if (WHITELISTED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
      console.log(`Subdomain "${subdomain}" is whitelisted. Skipping domain validation.`);
      return;
    }

    try {
      // Validate domain with backend API
      const apiUrl = `${environment.apiUrl}/Domain/validate/${subdomain}`;
      const response = await firstValueFrom(
        http.get<{ 
          success: boolean; 
          data?: { 
            isValid: boolean; 
            domain?: string;
            organizationId?: string;
            organizationName?: string;
            message?: string 
          }; 
          message?: string 
        }>(apiUrl)
      );

      if (!response.success || !response.data || !response.data.isValid) {
        const errorMessage = response.data?.message || response.message || 'Domain is not valid';
        console.error('Domain validation failed:', errorMessage);
        showDomainErrorPage(subdomain, errorMessage);
        // Prevent app from loading
        throw new Error(`Invalid domain: ${subdomain}`);
      }

      console.log(`Domain validated successfully: ${subdomain}`);
      
      // Store domain info for later use
      localStorage.setItem('currentDomain', subdomain);
      if (response.data.organizationId) {
        localStorage.setItem('organizationId', response.data.organizationId);
      }
    } catch (error: any) {
      console.error('Domain validation error:', error);
      
      // If it's a network error or 404, show error page
      const errorMessage = error?.error?.data?.message || 
                          error?.error?.message || 
                          error?.message || 
                          'Domain validation failed';
      
      showDomainErrorPage(subdomain, errorMessage);
      
      // Prevent app from loading
      throw new Error(`Domain validation failed: ${errorMessage}`);
    }
  };
}

