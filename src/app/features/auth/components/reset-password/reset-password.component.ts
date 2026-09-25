import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-reset-password',
  standalone: true,
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
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  resetPasswordForm!: FormGroup;
  token!: string;
  isLoading = false;
  hidePassword = true;
  hideConfirmPassword = true;
  private destroy$ = new Subject<void>();

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
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.initializeForm();
    this.setupPasswordValidation();
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
    this.resetPasswordForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: this.passwordsMatch }
    );
  }

  private passwordsMatch(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  private setupPasswordValidation(): void {
    this.resetPasswordForm.get('password')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.resetPasswordForm.get('confirmPassword')?.updateValueAndValidity({ emitEvent: false });
      });

    this.resetPasswordForm.get('confirmPassword')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.resetPasswordForm.updateValueAndValidity({ emitEvent: false });
      });
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid) {
      this.markFormGroupTouched(this.resetPasswordForm);
      this.notificationService.showError('Please fill valid password fields.');
      return;
    }

    this.isLoading = true;
    const newPassword = this.resetPasswordForm.value.password;

    this.authService.resetPassword(this.token, newPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.notificationService.showSuccess('Password reset successfully!');
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.isLoading = false;
          const msg = error?.error?.message || error?.message || 'Failed to reset password.';
          this.notificationService.showError(msg);
        }
      });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      formGroup.get(key)?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.resetPasswordForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.resetPasswordForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${fieldName === 'password' ? 'Password' : 'Confirm password'} is required`;
    }
    if (control?.hasError('minlength')) {
      return 'Password must be at least 8 characters';
    }
    if (fieldName === 'confirmPassword' && this.resetPasswordForm.hasError('mismatch')) {
      return 'Passwords do not match';
    }
    return '';
  }

  hasMismatchError(): boolean {
    const confirmControl = this.resetPasswordForm.get('confirmPassword');
    return this.resetPasswordForm.hasError('mismatch') &&
           confirmControl !== null &&
           (confirmControl.touched || confirmControl.dirty) &&
           confirmControl.value !== '';
  }

  onsignup(): void {
    const parent = (window as any)?.APP_SETTINGS?.parentUrl || 'https://www.briskpeople.com';
    const base = typeof parent === 'string' ? parent.replace(/\/+$/, '') : 'https://www.briskpeople.com';
    window.location.href = `${base}/sign-up`;
  }
}
