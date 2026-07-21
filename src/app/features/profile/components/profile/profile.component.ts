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

import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    SharedCommonModule,
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

  // Default country code (Pakistan)
  private readonly DEFAULT_COUNTRY_CODE = '+92';

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
      // ✅ default Pakistan
      phoneCountryCode: [this.DEFAULT_COUNTRY_CODE],
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
      basicSalary: [''],
      nationality: [''],
      emergencyContact: this.formBuilder.group({
        name: [''],
        phone: [''],
        relationship: [''],
        email: [''],
        // ✅ default Pakistan
        emergencyPhoneCountryCode: [this.DEFAULT_COUNTRY_CODE]
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

  private loadCountryDialCodes(): void {
    this.employeeService.getCountryDialCodes().pipe(takeUntil(this.destroy$)).subscribe({
      next: (list) => {
        this.countries = list.map((x: any) => ({ name: x.name, code: x.code, flag: x.flag, cca2: x.cca2 }));
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

          if (this.selectedProfileFile) {
            const reader = new FileReader();
            reader.onload = () => this.profilePreviewUrl = reader.result;
            reader.readAsDataURL(this.selectedProfileFile);
          } else if (employee.profilePictureUrl) {
            this.profilePreviewUrl = this.employeeService.resolveProfilePictureUrl(employee.profilePictureUrl);
          } else {
            this.profilePreviewUrl = null;
          }

          const selectedPosition = this.positions.find(p => p.positionId === employee.positionId);

          // Split international phone into country code + local number
          let detectedCode: string | null = null;
          let plainPhone = employee.phone || '';
          if (plainPhone && typeof plainPhone === 'string' && plainPhone.startsWith('+')) {
            const m = plainPhone.match(/^\+(\d{1,4})(.*)$/);
            if (m) {
              detectedCode = `+${m[1]}`;
              plainPhone = m[2].replace(/[^0-9]/g, '').trim();
            }
          }

          // Same for emergency contact phone
          let detectedEmCode: string | null = null;
          let emPlainPhone = employee.emergencycontact?.phone || '';
          if (emPlainPhone && typeof emPlainPhone === 'string' && emPlainPhone.startsWith('+')) {
            const em = emPlainPhone.match(/^\+(\d{1,4})(.*)$/);
            if (em) {
              detectedEmCode = `+${em[1]}`;
              emPlainPhone = em[2].replace(/[^0-9]/g, '').trim();
            }
          }

          this.profileForm.patchValue({
            employeeNumber: employee.employeeNumber,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            // ✅ fall back to default country code when none detected
            phoneCountryCode: detectedCode || this.DEFAULT_COUNTRY_CODE,
            phone: detectedCode ? plainPhone : (employee.phone || ''),
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
              // ✅ fall back to default country code
              emergencyPhoneCountryCode: detectedEmCode || this.DEFAULT_COUNTRY_CODE,
              phone: detectedEmCode ? emPlainPhone : (employee.emergencycontact?.phone || ''),
              relationship: employee.emergencycontact?.relationship || '',
              email: employee.emergencycontact?.email || ''
            },

            departmentId: employee.departmentId || '',
            departmentName: employee.departmentName || '',
            position: employee.positionTitle || '',
            positionId: employee.positionId || '',
            reportingManagerId: employee.reportingManagerId || '',
            managerName: employee.reportingManagerName?.trim() ? employee.reportingManagerName : 'No Manager Assigned',
            roleId: selectedPosition?.roleId || '',
            profileurl: employee.profilePictureUrl || ''
          });

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

    this.loadCountryDialCodes();
  }

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
      if (matchedPrefix && local.startsWith('+')) local = local.replace(/^\+/, '');
      if (matchedPrefix) {
        const prefixDigits = matchedPrefix.replace(/[^0-9]/g, '');
        if (local.startsWith(prefixDigits)) local = local.slice(prefixDigits.length);
      }
      local = local.replace(/[^0-9]/g, '').trim();
      this.profileForm.patchValue({ emergencyContact: { emergencyPhoneCountryCode: bestMatch.code, phone: local } }, { emitEvent: false });
    }
  }

  getCountryFlag(code?: string | null): string | undefined {
    if (!code) return undefined;
    const found = this.countries.find(c => c.code === code || c.code === (code + ''));
    return found?.flag;
  }

  getCountryLabel(code?: string | null): string {
    if (!code) return '';
    const found = this.countries.find(c => c.code === code || c.code === (code + ''));
    if (found) return `${found.name} ${found.code}`;
    return code;
  }

  onCountryPanelOpen(isOpen: boolean) {
    if (isOpen) { /* focus handling */ }
  }

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
      if (matchedPrefix && local.startsWith('+')) local = local.replace(/^\+/, '');
      if (matchedPrefix) {
        const prefixDigits = matchedPrefix.replace(/[^0-9]/g, '');
        if (local.startsWith(prefixDigits)) local = local.slice(prefixDigits.length);
      }
      local = local.replace(/[^0-9]/g, '').trim();
      this.profileForm.patchValue({ phoneCountryCode: bestMatch.code, phone: local }, { emitEvent: false });
    }
  }

  public onPhoneKeydown(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End'];
    if (allowedKeys.includes(event.key)) return;
    if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x', 'A', 'C', 'V', 'X'].includes(event.key)) return;
    if (!/^[0-9]$/.test(event.key)) event.preventDefault();
  }

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

  public onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/\D/g, '');
    if (input.value !== cleaned) {
      input.value = cleaned;
      this.setPhoneControlValue(input.getAttribute('formControlName') || 'phone', cleaned);
    }
  }

  private setPhoneControlValue(controlName: string, value: string): void {
    const top = this.profileForm.get(controlName);
    if (top) { top.setValue(value, { emitEvent: false }); return; }
    const nested = this.profileForm.get('emergencyContact.' + controlName);
    if (nested) nested.setValue(value, { emitEvent: false });
  }

  onFileSelected(event: Event, input?: HTMLInputElement): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.selectedProfileFile = file;

    const reader = new FileReader();
    reader.onload = () => { this.profilePreviewUrl = reader.result as string; };
    reader.readAsDataURL(file);

    this.authService.uploadProfilePic(file).subscribe({
      next: (url: string) => {
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

    const formValue = this.profileForm.getRawValue();
    const formData = new FormData();

    formData.append('EmployeeNumber', formValue.employeeNumber || '');
    formData.append('FirstName', formValue.firstName || '');
    formData.append('LastName', formValue.lastName || '');
    formData.append('Email', formValue.email || '');

    const rawCountry = formValue.phoneCountryCode ? String(formValue.phoneCountryCode) : '';
    const normalizedCountry = rawCountry ? (rawCountry.startsWith('+') ? rawCountry : `+${rawCountry}`) : '';
    const phoneDigits = (formValue.phone || '').toString().replace(/\D/g, '');
    const combinedPhone = phoneDigits ? (normalizedCountry ? `${normalizedCountry} ${phoneDigits}` : phoneDigits) : '';
    formData.append('Phone', combinedPhone);

    formData.append('Gender', formValue.gender || '');
    formData.append('MaritalStatus', formValue.maritalStatus || '');
    formData.append('Nationality', formValue.nationality || '');
    formData.append('WorkLocation', formValue.workLocation || '');
    formData.append('BasicSalary', formValue.basicSalary || '');

    formData.append('DepartmentId', formValue.departmentId || '');
    formData.append('PositionId', formValue.positionId || '');
    formData.append('RoleId', formValue.roleId || '');
    formData.append('ReportingManagerId', formValue.reportingManagerId || '');

    formData.append('Address', JSON.stringify(formValue.address || {}));

    const emCountryRaw = formValue.emergencyContact?.emergencyPhoneCountryCode ? String(formValue.emergencyContact.emergencyPhoneCountryCode) : '';
    const emNormalizedCountry = emCountryRaw ? (emCountryRaw.startsWith('+') ? emCountryRaw : `+${emCountryRaw}`) : '';
    const emPhoneDigits = (formValue.emergencyContact?.phone || '').toString().replace(/\D/g, '');
    const emCombinedPhone = emPhoneDigits ? (emNormalizedCountry ? `${emNormalizedCountry} ${emPhoneDigits}` : emPhoneDigits) : '';
    const emergencyObj = { ...(formValue.emergencyContact || {}), phone: emCombinedPhone };
    formData.append('EmergencyContact', JSON.stringify(emergencyObj));

    if (formValue.hireDate) formData.append('HireDate', new Date(formValue.hireDate).toISOString());
    if (formValue.dateOfBirth) formData.append('DateOfBirth', new Date(formValue.dateOfBirth).toISOString());

    formData.append('profileurl', formValue.profileurl || '');

    this.authService.updateProfile(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          if (res?.success === false) {
            this.notificationService.showError(res.message || 'Failed to update profile');
            return;
          }
          this.notificationService.showSuccess('Profile updated successfully!');
          if (this.currentUser?.userId) this.loadEmployeeDetail(this.currentUser.userId);
        },
        error: (error: any) => {
          this.isLoading = false;
          let message = 'Failed to update profile';
          if (error) {
            if (error.error) {
              if (typeof error.error === 'object' && error.error.message) message = error.error.message;
              else if (typeof error.error === 'string') message = error.error;
            } else if (error.message) message = error.message;
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
          Object.keys(this.passwordForm.controls).forEach(key => {
            const control = this.passwordForm.get(key);
            control?.setErrors(null);
            control?.markAsPristine();
            control?.markAsUntouched();
          });
          this.passwordForm.setErrors(null);

          if (res.success) this.notificationService.showSuccess(res.message || 'Password updated successfully!');
          else this.notificationService.showWarning(res.message || 'New password must be different from old password.');
        },
        error: (error) => {
          this.isPasswordLoading = false;
          const errorMessage = error?.message || 'Failed to update password';
          this.notificationService.showError(errorMessage);
        }
      });
  }

  resetForm(): void {
    this.profileForm.reset({
      phoneCountryCode: this.DEFAULT_COUNTRY_CODE,
      emergencyContact: { emergencyPhoneCountryCode: this.DEFAULT_COUNTRY_CODE }
    });
  }

  onCancel(): void { }
}
