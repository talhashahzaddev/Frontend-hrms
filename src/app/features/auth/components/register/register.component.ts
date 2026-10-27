import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { RegisterRequest } from '../../../../core/models/auth.models';
import { ValidationService } from '../../../../shared/services/validation.service';
import { SettingsService } from '../../../settings/services/settings.service';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
    selector: 'app-register',
    imports: [
    SharedCommonModule,
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatSelectModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatStepperModule,
        MatCheckboxModule
    ],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  registerForm!: FormGroup;
  isLoading = false;
  hidePassword = true;
  hideConfirmPassword = true;
  isLinear = false;
   submitted=false;
   registrationComplete = false;
   registrationAlreadyExists = false;
   verificationEmailSent = false;
   isResendingVerification = false;
   private registrationEmail = '';
  // Form steps
  organizationForm!: FormGroup;
  userForm!: FormGroup;

  // Company sizes - used to determine subscription type
  companySizes = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '501-1000', label: '501-1000 employees' },
    { value: '1000+', label: '1000+ employees' }
  ];

  // Available currencies
  availableCurrencies: Array<{ code: string; name: string; symbol: string }> = [];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService,
    private validationService: ValidationService,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.availableCurrencies = this.settingsService.getAvailableCurrencies();
    this.initializeForms();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Organization Form - simplified to match database schema
    this.organizationForm = this.formBuilder.group({
      companyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      companySize: ['', Validators.required],
      website: ['', [this.validationService.urlValidator()]],
      currency: ['USD', Validators.required] // Default to USD
    });

    // User Form - simplified to match database schema
    this.userForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.validationService.passwordValidator()
      ]],
      confirmPassword: ['', Validators.required],
      agreeToTerms: [false, Validators.requiredTrue]
    }, { validators: this.passwordMatchValidator });

    // Combined form for submission
    this.registerForm = this.formBuilder.group({
      organization: this.organizationForm,
      user: this.userForm
    });
  }

  get canCreate(): boolean {
  // Checks only userForm + terms checkbox
   return this.userForm.valid && this.userForm.get('agreeToTerms')!.value;
}
  private passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
  this.submitted = true;
  if (this.userForm.valid && this.organizationForm.valid) {
    this.isLoading = true;
    const organizationData = this.organizationForm.value;
    const userData = this.userForm.value;
    const registerRequest: RegisterRequest = {
      companyName: organizationData.companyName.trim(),
      companySize: organizationData.companySize,
      website: organizationData.website?.trim() || undefined,
      currency: organizationData.currency || 'USD',
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      email: userData.email.trim(),
      password: userData.password
    };
    this.registrationEmail = registerRequest.email;
    this.authService.register(registerRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.verificationEmailSent = response.emailVerificationSent !== false;
          this.registrationComplete = true;
          if (this.verificationEmailSent) {
            this.notificationService.showSuccess('Account created. Check your email to verify it before logging in.');
          } else {
            this.notificationService.showError('Your account was created, but the verification email could not be sent. You can try again below.');
          }
        },
        error: (error: unknown) => {
          this.isLoading = false;
          const httpError = error instanceof HttpErrorResponse ? error : null;
          const responseError = httpError?.error as { message?: string; errors?: string[] } | null;
          const errorMessage = responseError?.errors?.join(', ') ||
            responseError?.message ||
            (error instanceof Error ? error.message : '');
          if (httpError?.status === 400 && /already exists/i.test(errorMessage)) {
            this.registrationAlreadyExists = true;
            this.registrationComplete = true;
            this.verificationEmailSent = false;
            this.notificationService.showInfo(
              'This email is already registered. If it has not been verified, you can request another verification email.'
            );
          } else {
            this.notificationService.showError(errorMessage || 'Registration failed. Please try again.');
          }
        }
      });
  } else {
    this.markFormGroupTouched(this.userForm);
    this.markFormGroupTouched(this.organizationForm);
    this.notificationService.showError('Please correct the highlighted fields');
  }
  }

  resendVerificationEmail(): void {
    if (!this.registrationEmail || this.isResendingVerification) {
      return;
    }

    this.isResendingVerification = true;
    this.authService.resendVerificationEmail(this.registrationEmail)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isResendingVerification = false;
          this.verificationEmailSent = response.success && response.data === true;
          if (this.verificationEmailSent) {
            this.notificationService.showSuccess('Verification email sent. Check your inbox.');
          } else {
            this.notificationService.showError(response.message || 'Unable to send verification email.');
          }
        },
        error: (error: unknown) => {
          this.isResendingVerification = false;
          const message = error instanceof HttpErrorResponse
            ? (error.error?.message || 'Unable to send verification email. Please try again later.')
            : 'Unable to send verification email. Please try again later.';
          this.notificationService.showError(message);
        }
      });
  }





  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getErrorMessage(formGroup: FormGroup, fieldName: string): string {
    const control = formGroup.get(fieldName);
    if (control?.hasError('required')) {
      return `${this.getFieldDisplayName(fieldName)} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('minlength')) {
      const requiredLength = control.getError('minlength')?.requiredLength;
      return `${this.getFieldDisplayName(fieldName)} must be at least ${requiredLength} characters`;
    }
    if (control?.hasError('maxlength')) {
      const requiredLength = control.getError('maxlength')?.requiredLength;
      return `${this.getFieldDisplayName(fieldName)} must not exceed ${requiredLength} characters`;
    }
    if (control?.hasError('invalidPassword')) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }
    if (control?.hasError('invalidUrl')) {
      return 'Please enter a valid URL';
    }
    if (fieldName === 'email' && control?.hasError('conflict')) {
      return 'A user with this email already exists';
    }
    if (this.userForm.hasError('passwordMismatch') && fieldName === 'confirmPassword') {
      return 'Passwords do not match';
    }
    return '';
  }
onTermsClick(): void {
  const agreeCtrl = this.userForm.get('agreeToTerms');
  setTimeout(() => {
    agreeCtrl?.markAsTouched();
    agreeCtrl?.updateValueAndValidity();
  }, 0);
}

  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      companyName: 'Company Name',
      companySize: 'Company Size',
      website: 'Website',
      currency: 'Currency',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password'
    };
    
    return fieldNames[fieldName] || fieldName;
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
  //   const control = formGroup.get(fieldName);
  // return !!(control && control.invalid && (control.dirty || control.touched || this.submitted));

  const control = formGroup.get(fieldName);
  if (!control) return false;

  const showError = control.dirty || this.submitted; // remove touched

  if (fieldName === 'confirmPassword' && formGroup.hasError('passwordMismatch')) {
    return showError;
  }

  return control.invalid && showError;
  }

  // Quick fill demo data
  fillDemoData(): void {
    this.organizationForm.patchValue({
      companyName: 'Demo Company Inc.',
      companySize: '51-200',
      website: 'https://democompany.com',
      currency: 'USD'
    });

    this.userForm.patchValue({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@democompany.com',
      password: 'Admin123!',
      confirmPassword: 'Admin123!',
      agreeToTerms: true
    });
  }
}
