import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  hidePassword = true;
  isLoading = false;

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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading) {
      const credentials = this.loginForm.value;

      this.authService.login(credentials).subscribe({
        next: (response) => {
          // Check if domain is returned and redirect to correct subdomain
          if (response.domain) {
            const subdomain = this.extractSubdomainFromDomain(response.domain);
            if (subdomain) {
              // Store auth data in sessionStorage for retrieval after redirect
              this.authService.storePendingAuth(response);

              // Remove previously stored redirect URL (from guard)
              let redirectUrl = sessionStorage.getItem('redirectUrl');
              sessionStorage.removeItem('redirectUrl');

              // Determine redirect based on role if no stored redirect
              if (!redirectUrl) {
                if (response.roleName === 'Employee' || response.roleName === 'Manager') {
                  redirectUrl = '/performance/dashboard';
                } else {
                  redirectUrl = '/dashboard';
                }
              }

              // Redirect to user's organization subdomain
              this.redirectToSubdomain(subdomain, redirectUrl);
              return;
            }
          }

          // No subdomain redirect needed - complete login normally
          // This happens when user is already on their correct subdomain
          this.notificationService.loginSuccess(response.firstName);

          // Remove previously stored redirect URL (from guard)
          let redirectUrl = sessionStorage.getItem('redirectUrl');
          sessionStorage.removeItem('redirectUrl');

          // Determine redirect based on role if no stored redirect
          if (!redirectUrl) {
            if (response.roleName === 'Employee' || response.roleName === 'Manager') {
              redirectUrl = '/performance/dashboard';
            } else {
              redirectUrl = '/dashboard';
            }
          }

          // Navigate to dashboard
          this.router.navigate([redirectUrl]);
        },
        error: (error) => {
          this.notificationService.error({
            title: 'Login Failed',
            message: error.message || 'Invalid email or password'
          });
        }
      });
    } else {
      this.markFormGroupTouched();
    }
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
   * Redirects to the correct subdomain URL
   * Replaces current subdomain with the user's organization domain
   */
  private redirectToSubdomain(subdomain: string, path: string): void {
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;
    const currentPort = window.location.port ? `:${window.location.port}` : '';

    // Extract base domain (e.g., "briskpeople.com" from "login.briskpeople.com" or "shahzad.briskpeople.com")
    const hostParts = currentHost.split('.');
    let baseDomain = '';

    if (hostParts.length >= 2) {
      // Get the last two parts (e.g., "briskpeople.com")
      // This handles cases like "login.briskpeople.com" or "xyz.briskpeople.com"
      baseDomain = hostParts.slice(-2).join('.');
    } else {
      // Fallback: if we can't extract, use a default base domain
      // In production, this should be "briskpeople.com"
      baseDomain = currentHost.includes('localhost') ? currentHost : 'briskpeople.com';
    }

    // Construct new URL with user's subdomain
    const newUrl = `${currentProtocol}//${subdomain}.${baseDomain}${currentPort}${path}`;

    console.log(`Redirecting to user's organization domain: ${newUrl}`);
    console.log(`From: ${currentHost} -> To: ${subdomain}.${baseDomain}`);

    // Redirect to the new subdomain
    window.location.href = newUrl;
  }


  onForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }
  onsignup(): void {
    this.router.navigate(['/register']);
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

    return '';
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
}
