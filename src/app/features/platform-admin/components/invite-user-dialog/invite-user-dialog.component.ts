import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SuperAdminService } from '../../services/super-admin.service';
import { InviteUserRequest } from '../../models/user-invitation.models';
import { NotificationService } from '../../../../core/services/notification.service';

import { SharedCommonModule } from '@shared/shared-common.module';

@Component({
  selector: 'app-invite-user-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './invite-user-dialog.component.html',
  styleUrls: ['./invite-user-dialog.component.scss']
})
export class InviteUserDialogComponent implements OnDestroy {
  form: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<InviteUserDialogComponent>,
    private superAdminService: SuperAdminService,
    private notificationService: NotificationService
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      organizationName: ['']
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.form.value;
    const request: InviteUserRequest = {
      email: formValue.email,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      organizationName: formValue.organizationName || null
    };

    this.superAdminService.inviteUser(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.notificationService.showSuccess('Invitation sent successfully!');
            this.dialogRef.close(true);
          } else {
            this.errorMessage = response.message || 'Failed to send invitation.';
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          this.errorMessage = error?.error?.message || 'Failed to send invitation.';
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('minlength')) {
      const min = control.getError('minlength').requiredLength;
      return `Must be at least ${min} characters`;
    }
    if (control?.hasError('maxlength')) {
      const max = control.getError('maxlength').requiredLength;
      return `Must be no more than ${max} characters`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      email: 'Email',
      firstName: 'First name',
      lastName: 'Last name',
      organizationName: 'Organization name'
    };
    return labels[fieldName] || fieldName;
  }
}
