import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { User, UpdateProfileRequest } from '../../../../core/models/auth.models';

@Component({
    selector: 'app-profile',
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatTabsModule,
        MatDividerModule,
        MatProgressSpinnerModule
    ],
    template: `
    <div class="profile-container">
      <div class="profile-content">
        
        <div class="profile-header">
          <h1 class="profile-title">My Profile</h1>
          <p class="profile-subtitle">Manage your personal information and account settings</p>
        </div>

        <mat-card class="profile-card">
          
          <!-- Profile Avatar Section -->
          <div class="profile-avatar-section">
            <div class="avatar-container">
              <div class="avatar-circle">
                <mat-icon>person</mat-icon>
              </div>
              <button mat-stroked-button class="change-avatar-btn">
                <mat-icon>camera_alt</mat-icon>
                Change Photo
              </button>
            </div>
            <div class="user-info">
              <h2 class="user-name">{{ currentUser?.firstName }} {{ currentUser?.lastName }}</h2>
              <p class="user-email">{{ currentUser?.email }}</p>
              <p class="user-role">{{ currentUser?.role }}</p>
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Profile Tabs -->
          <mat-tab-group class="profile-tabs">
            
            <!-- Personal Information Tab -->
            <mat-tab label="Personal Information">
              <div class="tab-content">
                <form [formGroup]="profileForm" (ngSubmit)="onUpdateProfile()" novalidate>
                  
                  <div class="form-grid">
                    <!-- First Name -->
                    <mat-form-field appearance="outline" class="form-field">
                      <mat-label>First Name</mat-label>
                      <mat-icon matPrefix>person</mat-icon>
                      <input matInput formControlName="firstName" placeholder="Enter your first name">
                      <mat-error *ngIf="profileForm.get('firstName')?.hasError('required')">
                        First name is required
                      </mat-error>
                    </mat-form-field>

                    <!-- Last Name -->
                    <mat-form-field appearance="outline" class="form-field">
                      <mat-label>Last Name</mat-label>
                      <mat-icon matPrefix>person_outline</mat-icon>
                      <input matInput formControlName="lastName" placeholder="Enter your last name">
                      <mat-error *ngIf="profileForm.get('lastName')?.hasError('required')">
                        Last name is required
                      </mat-error>
                    </mat-form-field>

                    <!-- Email -->
                    <mat-form-field appearance="outline" class="form-field full-width">
                      <mat-label>Email Address</mat-label>
                      <mat-icon matPrefix>email</mat-icon>
                      <input matInput formControlName="email" type="email" placeholder="Enter your email">
                      <mat-error *ngIf="profileForm.get('email')?.hasError('required')">
                        Email is required
                      </mat-error>
                      <mat-error *ngIf="profileForm.get('email')?.hasError('email')">
                        Please enter a valid email address
                      </mat-error>
                    </mat-form-field>

                    <!-- Phone -->
                    <mat-form-field appearance="outline" class="form-field">
                      <mat-label>Phone Number</mat-label>
                      <mat-icon matPrefix>phone</mat-icon>
                      <input matInput formControlName="phone" placeholder="Enter your phone number">
                    </mat-form-field>

                    <!-- Job Title -->
                    <mat-form-field appearance="outline" class="form-field">
                      <mat-label>Job Title</mat-label>
                      <mat-icon matPrefix>work</mat-icon>
                      <input matInput formControlName="jobTitle" placeholder="Enter your job title">
                    </mat-form-field>

                    <!-- Department -->
                    <mat-form-field appearance="outline" class="form-field full-width">
                      <mat-label>Department</mat-label>
                      <mat-icon matPrefix>domain</mat-icon>
                      <input matInput formControlName="department" placeholder="Enter your department">
                    </mat-form-field>
                  </div>

                  <div class="form-actions">
                    <button mat-flat-button 
                            type="submit" 
                            [disabled]="profileForm.invalid || isLoading"
                            class="save-button">
                      <mat-spinner *ngIf="isLoading" diameter="20" class="button-spinner"></mat-spinner>
                      {{ isLoading ? 'Saving...' : 'Save Changes' }}
                    </button>
                    
                    <button mat-stroked-button 
                            type="button" 
                            (click)="resetForm()"
                            [disabled]="isLoading"
                            class="reset-button">
                      Reset
                    </button>
                  </div>
                </form>
              </div>
            </mat-tab>

            <!-- Security Tab -->
            <mat-tab label="Security">
              <div class="tab-content">
                <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" novalidate>
                  
                  <div class="security-section">
                    <h3>Change Password</h3>
                    <p>Ensure your account is using a long, random password to stay secure.</p>
                  </div>

                  <div class="form-grid">
                    <!-- Current Password -->
                    <mat-form-field appearance="outline" class="form-field full-width">
                      <mat-label>Current Password</mat-label>
                      <mat-icon matPrefix>lock</mat-icon>
                      <input matInput 
                             formControlName="currentPassword"
                             [type]="hideCurrentPassword ? 'password' : 'text'"
                             placeholder="Enter your current password">
                      <button mat-icon-button matSuffix 
                              type="button"
                              (click)="hideCurrentPassword = !hideCurrentPassword">
                        <mat-icon>{{ hideCurrentPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                      </button>
                      <mat-error *ngIf="passwordForm.get('currentPassword')?.hasError('required')">
                        Current password is required
                      </mat-error>
                    </mat-form-field>

                    <!-- New Password -->
                    <mat-form-field appearance="outline" class="form-field">
                      <mat-label>New Password</mat-label>
                      <mat-icon matPrefix>lock_outline</mat-icon>
                      <input matInput 
                             formControlName="newPassword"
                             [type]="hideNewPassword ? 'password' : 'text'"
                             placeholder="Enter new password">
                      <button mat-icon-button matSuffix 
                              type="button"
                              (click)="hideNewPassword = !hideNewPassword">
                        <mat-icon>{{ hideNewPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                      </button>
                      <mat-error *ngIf="passwordForm.get('newPassword')?.hasError('required')">
                        New password is required
                      </mat-error>
                      <mat-error *ngIf="passwordForm.get('newPassword')?.hasError('minlength')">
                        Password must be at least 8 characters long
                      </mat-error>
                    </mat-form-field>

                    <!-- Confirm New Password -->
                    <mat-form-field appearance="outline" class="form-field">
                      <mat-label>Confirm New Password</mat-label>
                      <mat-icon matPrefix>lock_reset</mat-icon>
                      <input matInput 
                             formControlName="confirmPassword"
                             [type]="hideConfirmPassword ? 'password' : 'text'"
                             placeholder="Confirm new password">
                      <button mat-icon-button matSuffix 
                              type="button"
                              (click)="hideConfirmPassword = !hideConfirmPassword">
                        <mat-icon>{{ hideConfirmPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                      </button>
                      <mat-error *ngIf="passwordForm.get('confirmPassword')?.hasError('required')">
                        Please confirm your password
                      </mat-error>
                      <mat-error *ngIf="passwordForm.hasError('passwordMismatch') && passwordForm.get('confirmPassword')?.touched">
                        Passwords do not match
                      </mat-error>
                    </mat-form-field>
                  </div>

                  <div class="form-actions">
                    <button mat-flat-button 
                            type="submit" 
                            [disabled]="passwordForm.invalid || isPasswordLoading"
                            class="save-button">
                      <mat-spinner *ngIf="isPasswordLoading" diameter="20" class="button-spinner"></mat-spinner>
                      {{ isPasswordLoading ? 'Updating...' : 'Update Password' }}
                    </button>
                  </div>
                </form>
              </div>
            </mat-tab>

            <!-- Preferences Tab -->
            <mat-tab label="Preferences">
              <div class="tab-content">
                <div class="preferences-section">
                  <h3>Account Preferences</h3>
                  <p>Customize your experience and notification settings.</p>
                  
                  <div class="preference-item">
                    <mat-icon>notifications</mat-icon>
                    <div class="preference-content">
                      <h4>Email Notifications</h4>
                      <p>Receive email notifications for important updates</p>
                    </div>
                    <button mat-slide-toggle></button>
                  </div>

                  <div class="preference-item">
                    <mat-icon>dark_mode</mat-icon>
                    <div class="preference-content">
                      <h4>Dark Mode</h4>
                      <p>Switch between light and dark theme</p>
                    </div>
                    <button mat-slide-toggle></button>
                  </div>

                  <div class="preference-item">
                    <mat-icon>language</mat-icon>
                    <div class="preference-content">
                      <h4>Language</h4>
                      <p>Choose your preferred language</p>
                    </div>
                    <button mat-stroked-button>English</button>
                  </div>
                </div>
              </div>
            </mat-tab>

          </mat-tab-group>
        </mat-card>
      </div>
    </div>
  `,
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: User | null = null;
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  
  isLoading = false;
  isPasswordLoading = false;
  
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.profileForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      jobTitle: [''],
      department: ['']
    });

    this.passwordForm = this.formBuilder.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  private loadCurrentUser(): void {
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          this.populateProfileForm();
        },
        error: (error) => {
          console.error('Failed to load current user:', error);
          this.notificationService.showError('Failed to load user profile');
        }
      });
  }

  private populateProfileForm(): void {
    if (this.currentUser) {
      this.profileForm.patchValue({
        firstName: this.currentUser.firstName,
        lastName: this.currentUser.lastName,
        email: this.currentUser.email,
        phone: this.currentUser.phone || '',
        jobTitle: this.currentUser.jobTitle || '',
        department: this.currentUser.department || ''
      });
    }
  }

  onUpdateProfile(): void {
    if (this.profileForm.valid) {
      this.isLoading = true;
      
      const updateRequest: UpdateProfileRequest = {
        firstName: this.profileForm.get('firstName')?.value,
        lastName: this.profileForm.get('lastName')?.value,
        email: this.profileForm.get('email')?.value,
        phone: this.profileForm.get('phone')?.value,
        jobTitle: this.profileForm.get('jobTitle')?.value,
        department: this.profileForm.get('department')?.value
      };

      this.authService.updateProfile(updateRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedUser) => {
            this.currentUser = updatedUser;
            this.isLoading = false;
            this.notificationService.showSuccess('Profile updated successfully!');
          },
          error: (error) => {
            this.isLoading = false;
            const errorMessage = error?.error?.message || 'Failed to update profile';
            this.notificationService.showError(errorMessage);
          }
        });
    }
  }

  onChangePassword(): void {
    if (this.passwordForm.valid) {
      this.isPasswordLoading = true;
      
      const changePasswordRequest = {
        currentPassword: this.passwordForm.get('currentPassword')?.value,
        newPassword: this.passwordForm.get('newPassword')?.value
      };

      this.authService.changePassword(changePasswordRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isPasswordLoading = false;
            this.passwordForm.reset();
            this.notificationService.showSuccess('Password updated successfully!');
          },
          error: (error) => {
            this.isPasswordLoading = false;
            const errorMessage = error?.error?.message || 'Failed to update password';
            this.notificationService.showError(errorMessage);
          }
        });
    }
  }

  resetForm(): void {
    this.populateProfileForm();
  }
}
