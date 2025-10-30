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
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { User } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    MatDatepickerModule,
    MatNativeDateModule,
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
    MatProgressSpinnerModule,
    MatSelectModule,
    MatOptionModule
  ],
  templateUrl: './profile.component.html',
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

  departments: any[] = [];
  positions: any[] = [];
  managers: any[] = [];

  selectedProfileFile: File | null = null;
  profilePreviewUrl: string | ArrayBuffer | null = null;

  private backendBaseUrl = 'https://localhost:60485';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private employeeService: EmployeeService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.initializeForms();
    this.loadCurrentUser();
    this.loadDropdownData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.profileForm = this.formBuilder.group({
      employeeNumber: [''],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      address: this.formBuilder.group({
        street: [''],
        city: [''],
        state: [''],
        zip: ['']
      }),
      dateOfBirth: [''],
      hireDate: [''],
      gender: [''],
      maritalStatus: [''],
      nationality: [''],
      emergencyContact: this.formBuilder.group({
        name: [''],
        phone: [''],
        relationship: [''],
        email: ['']
      }),
      workLocation: [''],
      departmentId: [''],
      position: [''],
      positionId: [''],
      reportingManagerId: [''],
      roleId: ['']
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
    return newPassword && confirmPassword && newPassword.value !== confirmPassword.value
      ? { passwordMismatch: true }
      : null;
  }

  private loadDropdownData(): void {
    this.employeeService.getDepartments().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => this.departments = data,
      error: (err) => console.error('Failed to load departments', err)
    });

    this.employeeService.getPositions().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => this.positions = data,
      error: (err) => console.error('Failed to load positions', err)
    });

    this.employeeService.getManagers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => this.managers = data,
      error: (err) => console.error('Failed to load managers', err)
    });
  }

  private loadCurrentUser(): void {
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          if (this.currentUser?.userId) {
            this.loadEmployeeDetail(this.currentUser.userId);
          }
        },
        error: (error) => {
          console.error('Failed to load current user:', error);
          this.notificationService.showError('Failed to load user profile');
        }
      });
  }

  private loadEmployeeDetail(userId: string): void {
    this.employeeService.getEmployee(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employee) => {
          if (!employee) return;

          // ---------- Set Profile Picture ----------
          if (this.selectedProfileFile) {
            const reader = new FileReader();
            reader.onload = () => this.profilePreviewUrl = reader.result;
            reader.readAsDataURL(this.selectedProfileFile);
          } else if (employee.profilePictureUrl) {
            this.profilePreviewUrl = employee.profilePictureUrl.startsWith('http')
              ? employee.profilePictureUrl
              : `${this.backendBaseUrl}${employee.profilePictureUrl}`;
          } else {
            this.profilePreviewUrl = null;
          }

          const selectedPosition = this.positions.find(p => p.positionId === employee.positionId);

          // Patch form values with proper mapping
          this.profileForm.patchValue({
            employeeNumber: employee.employeeNumber,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            phone: employee.phone,
            dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth) : '',
            hireDate: employee.hireDate ? new Date(employee.hireDate) : '',
            gender: employee.gender,
            maritalStatus: employee.maritalstatus,
            nationality: employee.nationality,
            workLocation: employee.workLocation || '',
            basicSalary: employee.basicSalary || 0,

            address: {
              street: employee.address?.street || '',
              city: employee.address?.city || '',
              state: employee.address?.state || '',
              zip: employee.address?.zip || ''
            },

            emergencyContact: {
              name: employee.emergencycontact?.name || '',
              phone: employee.emergencycontact?.phone || '',
              relationship: employee.emergencycontact?.relationship || '',
              email: employee.emergencycontact?.email || ''
            },

            departmentId: employee.departmentId || '',
            position: selectedPosition || '',
            positionId: employee.positionId || '',
            reportingManagerId: employee.reportingManagerId || '',
            roleId: selectedPosition?.roleId || '',
            profileurl: employee.profilePictureUrl || ''
          });
        },
        error: (err) => {
          console.error('Failed to load employee details:', err);
          this.notificationService.showError('Failed to load employee details');
        }
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedProfileFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.profilePreviewUrl = reader.result;
      reader.readAsDataURL(this.selectedProfileFile);
    }
  }

  onPositionChange(selectedPosition: any) {
    if (!selectedPosition) return;
    this.profileForm.patchValue({
      positionId: selectedPosition.positionId,
      roleId: selectedPosition.roleId
    });
  }

  onUpdateProfile(): void {
    if (!this.profileForm.valid) return;
    this.isLoading = true;

    const formValue = this.profileForm.value;
    const formData = new FormData();

    // Scalar fields
    formData.append('EmployeeNumber', formValue.employeeNumber || '');
    formData.append('FirstName', formValue.firstName || '');
    formData.append('LastName', formValue.lastName || '');
    formData.append('Email', formValue.email || '');
    formData.append('Phone', formValue.phone || '');
    formData.append('Gender', formValue.gender || '');
    formData.append('MaritalStatus', formValue.maritalStatus || '');
    formData.append('Nationality', formValue.nationality || '');
    formData.append('WorkLocation', formValue.workLocation || '');
    formData.append('BasicSalary',formValue.basicSalary || '')

    // Dropdowns
    formData.append('DepartmentId', formValue.departmentId || '');
    formData.append('PositionId', formValue.positionId || '');
    formData.append('RoleId', formValue.roleId || '');
    formData.append('ReportingManagerId', formValue.reportingManagerId || '');

    // Nested objects
    formData.append('Address', JSON.stringify(formValue.address || {}));
    formData.append('EmergencyContact', JSON.stringify(formValue.emergencyContact || {}));

    // Dates
    if (formValue.hireDate) formData.append('HireDate', new Date(formValue.hireDate).toISOString());
    if (formValue.dateOfBirth) formData.append('DateOfBirth', new Date(formValue.dateOfBirth).toISOString());


// Profile picture
if (this.selectedProfileFile) {
  formData.append('profileurl', this.selectedProfileFile); // new file
 } 


    

    this.authService.updateProfile(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.notificationService.showSuccess('Profile updated successfully!');
          if (this.currentUser?.userId) this.loadEmployeeDetail(this.currentUser.userId);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Update failed:', error);
          const message = error?.error?.message || 'Failed to update profile';
          this.notificationService.showError(message);
        }
      });
  }

  onChangePassword(): void {
    if (!this.passwordForm.valid) return;
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

  resetForm(): void {
    this.profileForm.reset();
  }
} 