
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
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

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Get token from URL query string ?token=xxxx
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.initializeForm();
    this.setupPasswordValidation();
  }

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
    // Trigger validation when either password field changes
    this.resetPasswordForm.get('password')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.resetPasswordForm.get('confirmPassword')?.updateValueAndValidity({ emitEvent: false });
      });

    this.resetPasswordForm.get('confirmPassword')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Trigger form-level validation
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
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
}
