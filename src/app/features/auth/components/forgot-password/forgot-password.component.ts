import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ForgotPasswordRequest } from '../../../../core/models/auth.models';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-forgot-password',
  imports: [
    SharedCommonModule,
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
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

  // ── Slideshow (identical to login) ──────────────────────────
  activeSlide = 0;
  prevSlide = -1;
  private slideInterval: any;

  slides = [
    {
      image: 'https://res.cloudinary.com/dn7o89asj/image/upload/v1769097850/employees_dhrvea.png',
      title: 'Employee Management',
      description: 'Manage employees, managers, and HR roles with department positions in one centralized system.'
    },
    {
      image: 'https://res.cloudinary.com/dn7o89asj/image/upload/v1769097850/general_dqgw1q.png',
      title: 'Attendance',
      description: 'Accurately track employee work hours, leaves, and overtime with our integrated system.'
    },
    {
      image: 'https://res.cloudinary.com/dn7o89asj/image/upload/v1769099992/Leave-Cover_vupfet.png',
      title: 'Leave Management',
      description: 'Streamline employee leave requests, approvals, and balance tracking with a transparent, easy-to-use system.'
    },
    {
      image: 'https://res.cloudinary.com/dn7o89asj/image/upload/v1769097851/managers-decision-making_rdbwdt.png',
      title: 'Timesheets',
      description: 'Log time against projects and tasks for better resource management and billing.'
    },
    {
      image: 'https://res.cloudinary.com/dn7o89asj/image/upload/v1769097850/many-other-features_e9ow5i.png',
      title: 'Performance',
      description: 'Manage employee reviews, set goals, and foster a culture of continuous improvement.'
    }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.startSlideshow();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  // ── Slideshow methods (identical to login) ──────────────────
  startSlideshow(): void {
    this.slideInterval = setInterval(() => {
      this.nextSlide();
    }, 3000);
  }

  nextSlide(): void {
    this.prevSlide = this.activeSlide;
    this.activeSlide = (this.activeSlide + 1) % this.slides.length;
  }

  goToSlide(index: number): void {
    this.prevSlide = this.activeSlide;
    this.activeSlide = index;
    clearInterval(this.slideInterval);
    this.startSlideshow();
  }

  // ── Form ────────────────────────────────────────────────────
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

  resetForm(): void {
    this.isEmailSent = false;
    this.forgotPasswordForm.reset();
    this.forgotPasswordForm.get('email')?.setErrors(null);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.forgotPasswordForm.get(fieldName);
    if (control?.hasError('required')) return 'Email is required';
    if (control?.hasError('email')) return 'Please enter a valid email address';
    if (control?.hasError('maxlength')) return 'Email must not exceed 255 characters';
    if (control?.hasError('notFound')) return 'Email not found';
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.forgotPasswordForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  private markFormGroupTouched(): void {
    Object.keys(this.forgotPasswordForm.controls).forEach(key => {
      this.forgotPasswordForm.get(key)?.markAsTouched();
    });
  }

  onsignup(): void {
    const parent = (window as any)?.APP_SETTINGS?.parentUrl || 'https://www.briskpeople.com';
    const base = typeof parent === 'string' ? parent.replace(/\/+$/, '') : 'https://www.briskpeople.com';
    window.location.href = `${base}/sign-up`;
  }
}
