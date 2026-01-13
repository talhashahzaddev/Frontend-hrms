import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ForgotPasswordRequest } from '../../../../core/models/auth.models';

@Component({
    selector: 'app-forgot-password',
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  forgotPasswordForm!: FormGroup;
  isLoading = false;
  isEmailSent = false;
  private isSubmitting = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid || this.isSubmitting) {
      this.markFormGroupTouched();
      this.notificationService.showError('Please enter a valid email address.');
      return;
    }
    this.isSubmitting = true;
    this.isLoading = true;
    const forgotPasswordRequest: ForgotPasswordRequest = {
      email: this.forgotPasswordForm.get('email')?.value
    };
    this.authService.forgotPassword(forgotPasswordRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.isEmailSent = true;
          this.isSubmitting = false;
          this.notificationService.showSuccess('Password reset instructions have been sent to your email address.');
        },
        error: (error) => {
          this.isLoading = false;
          const status = (error && typeof error === 'object' && 'status' in error) ? (error as any).status : 0;
          const errorMessage = error?.error?.message || error?.message || '';
          if (status === 404 || /email not found/i.test(errorMessage)) {
            const control = this.forgotPasswordForm.get('email');
            control?.setErrors({ notFound: true });
            control?.markAsTouched();
            this.notificationService.showError('Email not found');
          } else {
            this.notificationService.showError(errorMessage || 'Failed to send reset instructions. Please try again.');
          }
          this.isSubmitting = false;
        }
      });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.forgotPasswordForm.controls).forEach(key => {
      const control = this.forgotPasswordForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.forgotPasswordForm.get(fieldName);
    if (control?.hasError('required')) {
      return 'Email is required';
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('maxlength')) {
      return 'Email must not exceed 255 characters';
    }
    if (control?.hasError('notFound')) {
      return 'Email not found';
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.forgotPasswordForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  resetForm(): void {
    this.isEmailSent = false;
    this.forgotPasswordForm.reset();
    this.forgotPasswordForm.get('email')?.setErrors(null);
  }

  // Fill demo email
  fillDemoEmail(): void {
    this.forgotPasswordForm.patchValue({
      email: 'admin@democompany.com'
    });
  }

  onsignup(): void {
    const parent = (window as any)?.APP_SETTINGS?.parentUrl || 'https://www.briskpeople.com';
    const base = typeof parent === 'string' ? parent.replace(/\/+$/, '') : 'https://www.briskpeople.com';
    const url = `${base}/sign-up`;
    window.location.href = url;
  }
}
