import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
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
    FormsModule,
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
  countries: { name: string; code: string; flag?: string; cca2?: string }[] = [];
  countryFilter = '';

  selectedProfileFile: File | null = null;
  profilePreviewUrl: string | ArrayBuffer | null = null;
isUploadingProfileImage: boolean = false;
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
      phoneCountryCode: [''],
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
      basicSalary:[''],
      nationality: [''],
      emergencyContact: this.formBuilder.group({
        name: [''],
        phone: [''],
        relationship: [''],
        email: [''],
        emergencyPhoneCountryCode: ['']
      }),
      workLocation: [''],
      departmentId: [''],
      departmentName: [''],
      position: [''],
      positionId: [''],
      reportingManagerId: [''],
      managerName: [''],
      roleId: [''],
      profileurl: ['']
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

  // Load country dial codes for phone selection
  private loadCountryDialCodes(): void {
    this.employeeService.getCountryDialCodes().pipe(takeUntil(this.destroy$)).subscribe({
      next: (list) => {
        this.countries = list.map((x: any) => ({ name: x.name, code: x.code, flag: x.flag, cca2: x.cca2 }));
        // attempt to normalise existing phone values (main + emergency)
        this.resolvePhoneCountryFromEmployee();
        this.resolveEmergencyPhoneCountryFromEmployee();
      },
      error: (err) => console.error('Failed to load country dial codes', err)
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
          const selectedManager = this.managers.find(m => m.employeeid === employee.reportingManagerId);
          const selectedDepartment = this.departments.find(d => d.departmentId === employee.departmentId);
          const selectedPosition = this.positions.find(p => p.positionId === employee.positionId);

          // Try to split international phone into country code + local number (align with employee-edit)
          let detectedCode: string | null = null;
          let plainPhone = employee.phone || '';
          if (plainPhone && typeof plainPhone === 'string' && plainPhone.startsWith('+')) {
            const m = plainPhone.match(/^\+(\d{1,4})(.*)$/);
            if (m) {
              // keep the plus to match other components (e.g. '+92')
              detectedCode = `+${m[1]}`;
              plainPhone = m[2].replace(/[^0-9]/g, '').trim();
            }
          }

          // Also try to split emergency contact phone into country code + local number
          let detectedEmCode: string | null = null;
          let emPlainPhone = employee.emergencycontact?.phone || '';
          if (emPlainPhone && typeof emPlainPhone === 'string' && emPlainPhone.startsWith('+')) {
            const em = emPlainPhone.match(/^\+(\d{1,4})(.*)$/);
            if (em) {
              detectedEmCode = `+${em[1]}`;
              emPlainPhone = em[2].replace(/[^0-9]/g, '').trim();
            }
          }

          // Patch form values with proper mapping
          this.profileForm.patchValue({
            employeeNumber: employee.employeeNumber,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            // if we detected a country code, set phoneCountryCode and trimmed local phone
            phoneCountryCode: detectedCode || '',
            phone: detectedCode ? plainPhone : employee.phone,
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
              // if we detected an international prefix, set the emergency country code and local phone
              emergencyPhoneCountryCode: detectedEmCode || '',
              phone: detectedEmCode ? emPlainPhone : (employee.emergencycontact?.phone || ''),
              relationship: employee.emergencycontact?.relationship || '',
              email: employee.emergencycontact?.email || ''
            },

            departmentId: employee.departmentId || '',
            departmentName: employee.departmentName || '',
            position: employee.positionTitle || '',
            positionId: employee.positionId || '',
            reportingManagerId: employee.reportingManagerId || '',
            managerName: employee.reportingManagerName?.trim()    ? employee.reportingManagerName    : 'No Manager Assigned',
            roleId: selectedPosition?.roleId || '',
            profileurl: employee.profilePictureUrl || ''
          });
          // Disable the Department field so it cannot be edited
this.profileForm.get('employeeNumber')?.disable({ onlySelf: true });
this.profileForm.get('departmentName')?.disable({ onlySelf: true });
this.profileForm.get('managerName')?.disable({ onlySelf: true });
this.profileForm.get('roleId')?.disable({ onlySelf: true });
this.profileForm.get('basicSalary')?.disable({ onlySelf: true });
this.profileForm.get('position')?.disable({ onlySelf: true });
this.profileForm.get('hireDate')?.disable({ onlySelf: true });
        },
        error: (err) => {
          console.error('Failed to load employee details:', err);
          this.notificationService.showError('Failed to load employee details');
        }
      });

    // load countries for phone handling
    this.loadCountryDialCodes();
  }

  // Try to match emergency contact phone to a loaded country code and patch nested controls
  private resolveEmergencyPhoneCountryFromEmployee(): void {
    const rawPhone = (this.profileForm?.get('emergencyContact.phone')?.value || '').toString().trim();
    if (!rawPhone || !this.countries || this.countries.length === 0) return;

    const cleaned = rawPhone.replace(/[\s()\-.\/]/g, '');

    let bestMatch: { code: string; flag?: string } | null = null;
    let matchedPrefix = '';

    for (const c of this.countries) {
      if (!c.code) continue;
      const codeStr = String(c.code);
      const variants = [codeStr, `+${codeStr}`];
      for (const v of variants) {
        const norm = v.replace(/[^0-9+]/g, '');
        if (cleaned.startsWith(norm)) {
          if (!bestMatch || codeStr.length > (bestMatch.code || '').length) {
            bestMatch = c;
            matchedPrefix = norm;
          }
        }
      }
    }

    if (bestMatch) {
      let local = cleaned;
      if (matchedPrefix && local.startsWith('+')) {
        local = local.replace(/^\+/, '');
      }
      if (matchedPrefix) {
        const prefixDigits = matchedPrefix.replace(/[^0-9]/g, '');
        if (local.startsWith(prefixDigits)) {
          local = local.slice(prefixDigits.length);
        }
      }
      local = local.replace(/[^0-9]/g, '').trim();

      const controlCode = bestMatch.code;
      this.profileForm.patchValue({ emergencyContact: { emergencyPhoneCountryCode: controlCode, phone: local } }, { emitEvent: false });
    }
  }

  // Returns the flag URL for a selected country code (if available)
  getCountryFlag(code?: string | null): string | undefined {
    if (!code) return undefined;
    const found = this.countries.find(c => c.code === code || c.code === (code + ''));
    return found?.flag;
  }

  // Returns a friendly label for a country code
  getCountryLabel(code?: string | null): string {
    if (!code) return '';
    const found = this.countries.find(c => c.code === code || c.code === (code + ''));
    if (found) return `${found.name} ${found.code}`;
    return code;
  }

  onCountryPanelOpen(isOpen: boolean) {
    if (isOpen) {
      // focus handling could be added
    }
  }

  // Try to match profile phone to a loaded country code and patch form controls
  private resolvePhoneCountryFromEmployee(): void {
    const rawPhone = (this.profileForm?.get('phone')?.value || '').toString().trim();
    if (!rawPhone || !this.countries || this.countries.length === 0) return;

    const cleaned = rawPhone.replace(/[\s()\-.\/]/g, '');

    let bestMatch: { code: string; flag?: string } | null = null;
    let matchedPrefix = '';

    for (const c of this.countries) {
      if (!c.code) continue;
      const codeStr = String(c.code);
      const variants = [codeStr, `+${codeStr}`];
      for (const v of variants) {
        const norm = v.replace(/[^0-9+]/g, '');
        if (cleaned.startsWith(norm)) {
          if (!bestMatch || codeStr.length > (bestMatch.code || '').length) {
            bestMatch = c;
            matchedPrefix = norm;
          }
        }
      }
    }

    if (bestMatch) {
      let local = cleaned;
      if (matchedPrefix && local.startsWith('+')) {
        local = local.replace(/^\+/, '');
      }
      if (matchedPrefix) {
        const prefixDigits = matchedPrefix.replace(/[^0-9]/g, '');
        if (local.startsWith(prefixDigits)) {
          local = local.slice(prefixDigits.length);
        }
      }
      local = local.replace(/[^0-9]/g, '').trim();

      const controlCode = bestMatch.code;
      this.profileForm.patchValue({ phoneCountryCode: controlCode, phone: local }, { emitEvent: false });
      return;
    }
  }

  // Prevent non-digit keystrokes for phone inputs
  public onPhoneKeydown(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End'];
    if (allowedKeys.includes(event.key)) return;
    if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x', 'A', 'C', 'V', 'X'].includes(event.key)) return;
    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  // Sanitize pasted content to digits-only and insert into the input
  public onPhonePaste(event: ClipboardEvent): void {
    const clipboard = event.clipboardData || (window as any).clipboardData;
    if (!clipboard) return;
    const text = clipboard.getData('text') || '';
    const digits = text.replace(/\D/g, '');
    if (digits !== text) {
      event.preventDefault();
      const target = event.target as HTMLInputElement;
      const start = target.selectionStart ?? 0;
      const end = target.selectionEnd ?? 0;
      const newVal = target.value.slice(0, start) + digits + target.value.slice(end);
      target.value = newVal;
      this.setPhoneControlValue(target.getAttribute('formControlName') || 'phone', newVal);
    }
  }

  // Ensure input contains only digits (keeps value as string)
  public onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/\D/g, '');
    if (input.value !== cleaned) {
      input.value = cleaned;
      this.setPhoneControlValue(input.getAttribute('formControlName') || 'phone', cleaned);
    }
  }

  // Helper to set phone control value for top-level or nested emergencyContact
  private setPhoneControlValue(controlName: string, value: string): void {
    const top = this.profileForm.get(controlName);
    if (top) {
      top.setValue(value, { emitEvent: false });
      return;
    }
    const nested = this.profileForm.get('emergencyContact.' + controlName);
    if (nested) {
      nested.setValue(value, { emitEvent: false });
    }
  }

  // onFileSelected(event: Event): void {
  //   const input = event.target as HTMLInputElement;
  //   if (input.files && input.files.length > 0) {
  //     this.selectedProfileFile = input.files[0];
  //     const reader = new FileReader();
  //     reader.onload = () => this.profilePreviewUrl = reader.result;
  //     reader.readAsDataURL(this.selectedProfileFile);
  //   }
  // }

  onFileSelected(event: Event, input?: HTMLInputElement): void {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  this.selectedProfileFile = file;

  // Preview
  const reader = new FileReader();
  reader.onload = () => {
    this.profilePreviewUrl = reader.result as string;
  };
  reader.readAsDataURL(file);


  // Upload using your existing service
  this.authService.uploadProfilePic(file).subscribe({
    next: (url: string) => {
      // Save URL in form (use 'profileurl' key)
      this.profileForm.patchValue({ profileurl: url });
      this.isUploadingProfileImage = false;
      this.notificationService.showSuccess('Profile image uploaded successfully');
    },
    error: (err: any) => {
      this.notificationService.showError(err?.message || 'Profile image upload failed');
      this.isUploadingProfileImage = false;
      this.profilePreviewUrl = null;
      this.profileForm.patchValue({ profileurl: '' });
      this.selectedProfileFile = null;
    }
  });

  if (input) input.value = '';
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

    //const formValue = this.profileForm.value;
    const formValue = this.profileForm.getRawValue();
    const formData = new FormData();

    // Scalar fields
    formData.append('EmployeeNumber', formValue.employeeNumber || '');
    formData.append('FirstName', formValue.firstName || '');
    formData.append('LastName', formValue.lastName || '');
    formData.append('Email', formValue.email || '');

    // Combine selected country code with phone digits (e.g. "+92 3012345678")
    const rawCountry = formValue.phoneCountryCode ? String(formValue.phoneCountryCode) : '';
    const normalizedCountry = rawCountry ? (rawCountry.startsWith('+') ? rawCountry : `+${rawCountry}`) : '';
    const phoneDigits = (formValue.phone || '').toString().replace(/\D/g, '');
    const combinedPhone = normalizedCountry ? `${normalizedCountry} ${phoneDigits}` : phoneDigits;
    formData.append('Phone', combinedPhone || '');

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

    // Emergency contact (leave phone as-is; there's no separate country selector for it)
    // Combine emergency country code with phone digits if provided
    const emCountryRaw = formValue.emergencyContact?.emergencyPhoneCountryCode ? String(formValue.emergencyContact.emergencyPhoneCountryCode) : '';
    const emNormalizedCountry = emCountryRaw ? (emCountryRaw.startsWith('+') ? emCountryRaw : `+${emCountryRaw}`) : '';
    const emPhoneDigits = (formValue.emergencyContact?.phone || '').toString().replace(/\D/g, '');
    const emCombinedPhone = emNormalizedCountry ? `${emNormalizedCountry} ${emPhoneDigits}` : emPhoneDigits;
    const emergencyObj = { ...(formValue.emergencyContact || {}), phone: emCombinedPhone };
    formData.append('EmergencyContact', JSON.stringify(emergencyObj));

    // Dates
    if (formValue.hireDate) formData.append('HireDate', new Date(formValue.hireDate).toISOString());
    if (formValue.dateOfBirth) formData.append('DateOfBirth', new Date(formValue.dateOfBirth).toISOString());



    // Profile picture URL (always send, regardless of file selection)
    formData.append('profileurl', formValue.profileurl || '');
    console.log('Image URL from form:', formValue.profileurl);

  this.authService.updateProfile(formData)
  .pipe(takeUntil(this.destroy$))
  .subscribe({
    next: (res: any) => {
      this.isLoading = false;
      // Handle backend success=false even if HTTP 200
      if (res?.success === false) {
        this.notificationService.showError(res.message || 'Failed to update profile');
        return;
      }

      // Otherwise success
      this.notificationService.showSuccess('Profile updated successfully!');
      if (this.currentUser?.userId) this.loadEmployeeDetail(this.currentUser.userId);
    },
    error: (error: any) => {
      this.isLoading = false;

      // Default fallback message
      let message = 'Failed to update profile';

      if (error) {
        // Backend returns JSON error
        if (error.error) {
          // Case 1: error.error is object
          if (typeof error.error === 'object' && error.error.message) {
            message = error.error.message;
          }
          // Case 2: error.error is string
          else if (typeof error.error === 'string') {
            message = error.error;
          }
        }
        // Sometimes Angular wraps the message differently
        else if (error.message) {
          message = error.message;
        }
      }

      this.notificationService.showError(message);
      console.error('Update failed:', error);
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
      next: (res) => {
        this.isPasswordLoading = false;
this.passwordForm.reset();

// Clear errors manually for all controls
Object.keys(this.passwordForm.controls).forEach(key => {
  const control = this.passwordForm.get(key);
  control?.setErrors(null);       // clear validators errors
  control?.markAsPristine();      // mark control pristine
  control?.markAsUntouched();     // mark control untouched
});

// Also clear any form-level errors (like your passwordMismatch)
this.passwordForm.setErrors(null);

        if (res.success) {
          this.notificationService.showSuccess(res.message || 'Password updated successfully!');
        } else {
          this.notificationService.showWarning(res.message || 'New password must be different from old password.');
        }
      },
      error: (error) => {
        this.isPasswordLoading = false;
        const errorMessage = error?.message || 'Failed to update password';
        this.notificationService.showError(errorMessage);
      }
    });
}

  resetForm(): void {
    this.profileForm.reset();
  }

  // Handler for header back button
  onCancel(): void {
    // Example: navigate back or emit event
    // this.router.navigate(['/employee-list']);
  }
}