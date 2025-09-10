import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { RegisterRequest } from '../../../../core/models/auth.models';
import { ValidationService } from '../../../../shared/services/validation.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
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
    MatStepperModule
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

  // Form steps
  organizationForm!: FormGroup;
  userForm!: FormGroup;
  
  // Organization types for selection
  organizationTypes = [
    { value: 'startup', label: 'Startup' },
    { value: 'small_business', label: 'Small Business' },
    { value: 'medium_business', label: 'Medium Business' },
    { value: 'enterprise', label: 'Enterprise' },
    { value: 'non_profit', label: 'Non-Profit' },
    { value: 'government', label: 'Government' },
    { value: 'educational', label: 'Educational' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'technology', label: 'Technology' },
    { value: 'retail', label: 'Retail' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'services', label: 'Services' }
  ];

  // Company sizes
  companySizes = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '501-1000', label: '501-1000 employees' },
    { value: '1000+', label: '1000+ employees' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService,
    private validationService: ValidationService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Organization Form
    this.organizationForm = this.formBuilder.group({
      companyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      organizationType: ['', Validators.required],
      companySize: ['', Validators.required],
      industry: ['', [Validators.maxLength(100)]],
      address: ['', [Validators.maxLength(255)]],
      city: ['', [Validators.maxLength(50)]],
      state: ['', [Validators.maxLength(50)]],
      country: ['', [Validators.required, Validators.maxLength(50)]],
      zipCode: ['', [Validators.maxLength(20)]],
      phone: ['', [Validators.maxLength(20)]],
      website: ['', [this.validationService.urlValidator()]]
    });

    // User Form
    this.userForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      phone: ['', [Validators.maxLength(20)]],
      jobTitle: ['', [Validators.maxLength(100)]],
      department: ['', [Validators.maxLength(100)]],
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

  private passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isLoading = true;
      
      const organizationData = this.organizationForm.value;
      const userData = this.userForm.value;

      const registerRequest: RegisterRequest = {
        // Organization data
        companyName: organizationData.companyName,
        organizationType: organizationData.organizationType,
        companySize: organizationData.companySize,
        industry: organizationData.industry,
        address: organizationData.address,
        city: organizationData.city,
        state: organizationData.state,
        country: organizationData.country,
        zipCode: organizationData.zipCode,
        companyPhone: organizationData.phone,
        website: organizationData.website,
        
        // User data
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        jobTitle: userData.jobTitle,
        department: userData.department,
        password: userData.password
      };

      this.authService.register(registerRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            this.notificationService.showSuccess(
              'Registration successful! Please check your email to verify your account.'
            );
          },
          error: (error) => {
            this.isLoading = false;
            const errorMessage = error?.error?.message || 'Registration failed. Please try again.';
            this.notificationService.showError(errorMessage);
          }
        });
    } else {
      this.markFormGroupTouched(this.organizationForm);
      this.markFormGroupTouched(this.userForm);
      this.notificationService.showError('Please fill in all required fields correctly.');
    }
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
    if (this.userForm.hasError('passwordMismatch') && fieldName === 'confirmPassword') {
      return 'Passwords do not match';
    }
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      companyName: 'Company Name',
      organizationType: 'Organization Type',
      companySize: 'Company Size',
      industry: 'Industry',
      address: 'Address',
      city: 'City',
      state: 'State',
      country: 'Country',
      zipCode: 'ZIP Code',
      phone: 'Phone',
      website: 'Website',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      jobTitle: 'Job Title',
      department: 'Department',
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
    const control = formGroup.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  // Quick fill demo data
  fillDemoData(): void {
    this.organizationForm.patchValue({
      companyName: 'Demo Company Inc.',
      organizationType: 'technology',
      companySize: '51-200',
      industry: 'Software Development',
      address: '123 Tech Street',
      city: 'San Francisco',
      state: 'CA',
      country: 'United States',
      zipCode: '94105',
      phone: '+1-555-123-4567',
      website: 'https://democompany.com'
    });

    this.userForm.patchValue({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@democompany.com',
      phone: '+1-555-987-6543',
      jobTitle: 'System Administrator',
      department: 'IT',
      password: 'Admin123!',
      confirmPassword: 'Admin123!',
      agreeToTerms: true
    });
  }
}
