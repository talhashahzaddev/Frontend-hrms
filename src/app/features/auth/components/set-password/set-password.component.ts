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

import { SetPasswordService } from '../../services/set-password.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SharedCommonModule } from '@shared/shared-common.module';
import { TokenValidationResponse } from '../../../platform-admin/models/user-invitation.models';

@Component({
  selector: 'app-set-password',
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
  templateUrl: './set-password.component.html',
  styleUrls: ['./set-password.component.scss']
})
export class SetPasswordComponent implements OnInit, OnDestroy {
  setPasswordForm!: FormGroup;
  token = '';
  isLoading = false;
  isValidating = true;
  hidePassword = true;
  hideConfirmPassword = true;
  tokenValid = false;
  tokenError = '';
  userInfo: TokenValidationResponse | null = null;
  private destroy$ = new Subject<void>();

  // Slideshow
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
      image: 'https://res.cloudinary.com/dn7o899992/Leave-Cover_vupfet.png',
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
    private setPasswordService: SetPasswordService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.initializeForm();
    this.setupPasswordValidation();
    this.startSlideshow();
    this.validateToken();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  // Slideshow methods
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

  private validateToken(): void {
    if (!this.token) {
      this.isValidating = false;
      this.tokenError = 'No invitation token provided. Please check your email for the correct link.';
      return;
    }

    this.setPasswordService.validateToken(this.token)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isValidating = false;
          if (response.success && response.data?.valid) {
            this.tokenValid = true;
            this.userInfo = response.data;

            // Pre-fill organization name if admin provided one
            if (response.data.organizationName) {
              this.setPasswordForm.patchValue({
                organizationName: response.data.organizationName
              });
            }
          } else {
            this.tokenError = response.data?.message || response.message || 'Invalid or expired invitation link.';
          }
        },
        error: (error) => {
          this.isValidating = false;
          this.tokenError = error?.error?.message || 'Failed to validate invitation link. Please try again.';
        }
      });
  }

  private initializeForm(): void {
    this.setPasswordForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
        organizationName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]]
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
    this.setPasswordForm.get('password')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.setPasswordForm.get('confirmPassword')?.updateValueAndValidity({ emitEvent: false });
      });

    this.setPasswordForm.get('confirmPassword')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.setPasswordForm.updateValueAndValidity({ emitEvent: false });
      });
  }

  onSubmit(): void {
    if (this.setPasswordForm.invalid) {
      this.markFormGroupTouched(this.setPasswordForm);
      this.notificationService.showError('Please fill in all required fields.');
      return;
    }

    this.isLoading = true;
    const newPassword = this.setPasswordForm.value.password;
    const organizationName = this.setPasswordForm.value.organizationName;

    this.setPasswordService.setPassword(this.token, newPassword, organizationName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.notificationService.showSuccess('Password set successfully! You can now log in.');
            this.router.navigate(['/login']);
          } else {
            this.notificationService.showError(response.message || 'Failed to set password.');
          }
        },
        error: (error) => {
          this.isLoading = false;
          const msg = error?.error?.message || error?.message || 'Failed to set password.';
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
    const control = this.setPasswordForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.setPasswordForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${fieldName === 'password' ? 'Password' : fieldName === 'confirmPassword' ? 'Confirm password' : 'Organization name'} is required`;
    }
    if (control?.hasError('minlength')) {
      if (fieldName === 'password') {
        return 'Password must be at least 8 characters';
      }
      return 'Must be at least 2 characters';
    }
    if (fieldName === 'confirmPassword' && this.setPasswordForm.hasError('mismatch')) {
      return 'Passwords do not match';
    }
    return '';
  }

  hasMismatchError(): boolean {
    const confirmControl = this.setPasswordForm.get('confirmPassword');
    return this.setPasswordForm.hasError('mismatch') &&
           confirmControl !== null &&
           (confirmControl.touched || confirmControl.dirty) &&
           confirmControl.value !== '';
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
