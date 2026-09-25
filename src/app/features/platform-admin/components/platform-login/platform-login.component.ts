import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PlatformAdminAuthService } from '../../services/platform-admin-auth.service';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-platform-login',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './platform-login.component.html',
  styleUrls: ['./platform-login.component.scss']
})
export class PlatformLoginComponent implements OnDestroy {
  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: PlatformAdminAuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/platform-admin/dashboard']);
    }
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/platform-admin/dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.message || 'Invalid credentials. Please try again.';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
