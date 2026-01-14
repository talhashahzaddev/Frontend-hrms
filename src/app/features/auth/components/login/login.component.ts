import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { LoadingService } from '@core/services/loading.service';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  loginForm!: FormGroup;
  hidePassword = true;
  isLoading = false;
  isReady = false; // Add ready state to prevent white card flash
  private isSubmitting = false;

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService,
    private loadingService: LoadingService,
    private router: Router
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.subscribeToLoading();
    this.setFavicon();
  }

  ngAfterViewInit(): void {
    // Show card after view is initialized to prevent white card flash
    // Use requestAnimationFrame for smooth transition
    requestAnimationFrame(() => {
      this.isReady = true;
    });
  }

  private setFavicon(): void {
    // Remove ALL existing favicon links
    const existingLinks = document.querySelectorAll('link[rel*="icon"], link[rel*="shortcut"]');
    existingLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && (href.includes('favicon.ico') || !href.includes('hub.png'))) {
        link.remove();
      }
    });

    // Get base href to construct correct path
    const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
    const faviconPath = `${baseHref}hub.png`;

    // Ensure favicon is set
    let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      faviconLink.type = 'image/png';
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = faviconPath;

    // Also set shortcut icon
    let shortcutLink = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
    if (!shortcutLink) {
      shortcutLink = document.createElement('link');
      shortcutLink.rel = 'shortcut icon';
      shortcutLink.type = 'image/png';
      document.head.appendChild(shortcutLink);
    }
    shortcutLink.href = faviconPath;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isSubmitting) {
      this.markFormGroupTouched();
      this.notificationService.showError('Please correct the highlighted fields');
      return;
    }
    this.isSubmitting = true;
    const credentials = this.loginForm.value;
    this.authService.login(credentials)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.domain) {
            const targetSubdomain = this.extractSubdomainFromDomain(response.domain);
            const currentSubdomain = this.getCurrentSubdomain();
            if (targetSubdomain && targetSubdomain !== currentSubdomain) {
              const authData = encodeURIComponent(JSON.stringify(response));
              let redirectUrl = sessionStorage.getItem('redirectUrl');
              sessionStorage.removeItem('redirectUrl');
              if (!redirectUrl) {
                if (response.roleName === 'Employee' || response.roleName === 'Manager') {
                  redirectUrl = '/performance/dashboard';
                } else {
                  redirectUrl = '/dashboard';
                }
              }
              const separator = redirectUrl.includes('?') ? '&' : '?';
              redirectUrl += `${separator}auth_transfer=${authData}`;
              this.isSubmitting = false;
              this.redirectToSubdomain(targetSubdomain, redirectUrl);
              return;
            }
          }
          this.authService.setAuthDataDirectly(response);
          this.notificationService.loginSuccess(response.firstName);
          let redirectUrl = sessionStorage.getItem('redirectUrl');
          sessionStorage.removeItem('redirectUrl');
          if (!redirectUrl) {
            if (response.roleName === 'Employee' || response.roleName === 'Manager') {
              redirectUrl = '/performance/dashboard';
            } else {
              redirectUrl = '/dashboard';
            }
          }
          this.isSubmitting = false;
          this.router.navigate([redirectUrl]);
        },
        error: (error) => {
          const status = (error && typeof error === 'object' && 'status' in error) ? (error as any).status : 0;
          const message = error?.error?.message || error?.message || '';
          if (status === 401 || /invalid email or password/i.test(message)) {
            this.setPasswordAuthError('Invalid email or password');
          } else if (status === 404 || /email not found/i.test(message)) {
            this.setEmailAuthError('Email not found');
          } else {
            this.notificationService.showError(message || 'Login failed. Please try again.');
          }
          this.isSubmitting = false;
        }
      });
  }

  /**
   * Extracts subdomain identifier from domain string
   * Matches the backend normalization logic exactly
   * Examples:
   * - "myorg.com" -> "myorg"
   * - "myorg" -> "myorg"
   * - "www.myorg.com" -> "myorg"
   */
  private extractSubdomainFromDomain(domain: string): string | null {
    if (!domain) return null;

    try {
      // Remove protocol if present
      let cleanDomain = domain.replace(/^https?:\/\//, '');

      // Remove www
      cleanDomain = cleanDomain.replace(/^www\./, '');

      // Remove trailing slash
      cleanDomain = cleanDomain.replace(/\/+$/, '');

      // Extract subdomain (first part before first dot)
      const parts = cleanDomain.split('.');
      if (parts.length > 0) {
        cleanDomain = parts[0];
      }

      // Convert to lowercase
      cleanDomain = cleanDomain.toLowerCase();

      // Remove all special characters except hyphens and alphanumeric
      cleanDomain = cleanDomain.replace(/[^a-z0-9-]/g, '');

      // Remove spaces (though regex above should have handled this)
      cleanDomain = cleanDomain.replace(/\s/g, '');

      // Remove consecutive hyphens
      while (cleanDomain.includes('--')) {
        cleanDomain = cleanDomain.replace(/--/g, '-');
      }

      // Remove leading and trailing hyphens
      cleanDomain = cleanDomain.replace(/^-+|-+$/g, '');

      return cleanDomain || null;
    } catch (error) {
      console.warn('Error extracting subdomain from domain:', error);
      return null;
    }
  }

  /**
   * Gets the current subdomain from the hostname
   */
  private getCurrentSubdomain(): string | null {
    const currentHost = window.location.hostname;

    // Handle plain localhost or IP (no subdomain)
    if (currentHost === 'localhost' || currentHost.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return null;
    }

    const hostParts = currentHost.split('.');

    // Handle localhost with subdomain (e.g., "login.localhost" or "codified.localhost")
    if (currentHost.includes('localhost')) {
      // If it's just "localhost", return null
      if (hostParts.length <= 1) {
        return null;
      }
      // Return the first part (e.g., "login" from "login.localhost")
      return hostParts[0];
    }

    // Handle production domains
    // If only 2 parts (e.g., "briskpeople.com"), no subdomain
    if (hostParts.length <= 2) {
      return null;
    }

    // Return the first part as the subdomain (e.g., "login" from "login.briskpeople.com")
    return hostParts[0];
  }

  /**
   * Redirects to the correct subdomain URL
   * Replaces current subdomain with the user's organization domain
   */
  private redirectToSubdomain(subdomain: string, path: string): void {
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;
    const currentPort = window.location.port ? `:${window.location.port}` : '';

    let newHost = '';

    // Handle localhost (including subdomains like login.localhost)
    if (currentHost.includes('localhost')) {
      // Always redirect to subdomain.localhost (not subdomain.login.localhost)
      newHost = `${subdomain}.localhost`;
    }
    // Handle IP addresses
    else if (currentHost.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      newHost = `${subdomain}.${currentHost}`;
    }
    // Handle production domains
    else {
      const hostParts = currentHost.split('.');

      if (hostParts.length >= 2) {
        // Extract base domain (last two parts)
        const baseDomain = hostParts.slice(-2).join('.');
        newHost = `${subdomain}.${baseDomain}`;
      } else {
        // Fallback
        newHost = `${subdomain}.${currentHost}`;
      }
    }

    // Construct new URL with user's subdomain
    const newUrl = `${currentProtocol}//${newHost}${currentPort}${path}`;

    console.log(`Redirecting to user's organization domain: ${newUrl}`);
    console.log(`From: ${currentHost} -> To: ${newHost}`);

    // Redirect to the new subdomain
    window.location.href = newUrl;
  }


  onForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }
  onsignup(): void {
    const parent = (window as any)?.APP_SETTINGS?.parentUrl || 'https://www.briskpeople.com';
    const base = typeof parent === 'string' ? parent.replace(/\/+$/, '') : 'https://www.briskpeople.com';
    const url = `${base}/sign-up`;
    window.location.href = url;
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);

    if (field?.hasError('required')) {
      return `${this.getFieldDisplayName(fieldName)} is required`;
    }

    if (field?.hasError('email')) {
      return 'Please enter a valid email address';
    }

    if (field?.hasError('minlength')) {
      const minLength = field.errors?.['minlength'].requiredLength;
      return `Password must be at least ${minLength} characters long`;
    }

    if (field?.hasError('invalidCredentials')) {
      return 'Invalid email or password';
    }
    if (field?.hasError('notFound')) {
      return 'Email not found';
    }

    return '';
  }

  private setEmailAuthError(message?: string): void {
    const control = this.loginForm.get('email');
    control?.setErrors({ notFound: true });
    control?.markAsTouched();
    this.notificationService.showError(message || 'Email not found');
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  private createForm(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  private subscribeToLoading(): void {
    this.loadingService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
      });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      email: 'Email',
      password: 'Password'
    };
    return fieldNames[fieldName] || fieldName;
  }

  private setPasswordAuthError(message?: string): void {
    const control = this.loginForm.get('password');
    control?.setErrors({ invalidCredentials: true });
    control?.markAsTouched();
    this.notificationService.showError(message || 'Incorrect password');
  }
}
