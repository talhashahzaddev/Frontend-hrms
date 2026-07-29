import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Employee, Department, Position } from '../../../../core/models/employee.models';
import { Subject, takeUntil } from 'rxjs';
import { EmployeeService } from '../../services/employee.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { SettingsService } from '../../../settings/services/settings.service';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-employee-edit',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './employee-edit.component.html',
  styleUrls: ['./employee-edit.component.scss']
})
export class EmployeeEditComponent implements OnInit, OnDestroy {
  // ✅ Default country code (Pakistan)
  private readonly DEFAULT_COUNTRY_CODE = '+92';

  employeeForm!: FormGroup;
  departments: Department[] = [];
  positions: Position[] = [];
  managers: Employee[] = [];
  isLoading = false;
  currencySymbol: string = '$';
  organizationCurrency: string = 'USD';
  countries: { name: string; code: string; flag?: string; cca2?: string }[] = [];
  countryFilter = '';
  private destroy$ = new Subject<void>();

  employmentTypes = [
    { value: '', label: 'All Types' },
    { value: 'full_time', label: 'Full Time' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'intern', label: 'Intern' }
  ];

  statuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'terminated', label: 'Terminated' },
    { value: 'on_leave', label: 'On Leave' }
  ];

  genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  maritalStatusOptions = [
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed', label: 'Widowed' }
  ];

  payTypeOptions = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'weekly', label: 'Weekly' }
  ];

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private settingsService: SettingsService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<EmployeeEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { employee: Employee }
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadDropdowns();
    this.loadInitialData();

    // Fetch the complete employee details to get the exact role name from the backend user table
    if (this.data.employee?.employeeId) {
      this.employeeService.getEmployee(this.data.employee.employeeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (emp) => {
            if (emp) {
              console.log('Fetched Full Employee Details from API:', emp);
              this.data.employee = { ...this.data.employee, ...emp };
              console.log('Updated this.data.employee:', this.data.employee);
              console.log('RoleName in data:', this.data.employee.roleName);
            }
          },
          error: (err) => console.error('Failed to fetch full employee details:', err)
        });
    }

    this.employeeForm.get('departmentId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((departmentId) => {
        const positionControl = this.employeeForm.get('positionId');
        const currentPositionId = positionControl?.value;
        if (departmentId && currentPositionId) {
          const currentPosition = this.positions.find(p => p.positionId === currentPositionId);
          if (currentPosition && currentPosition.departmentId !== departmentId) {
            positionControl?.setValue(null, { emitEvent: false });
          }
        }
        if (!departmentId) {
          positionControl?.setValue(null, { emitEvent: false });
        }

        // Load managers for the selected department (plus Super Admins)
        if (departmentId) {
          this.employeeService.getManagers(String(departmentId))
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (result) => {
                this.managers = result.filter(m => m.employeeId !== this.data.employee.employeeId);
                // If current manager is no longer in list, clear selection
                const currentMgrId = this.employeeForm.get('reportingManagerId')?.value;
                if (currentMgrId && !result.find(m => m.employeeId === currentMgrId)) {
                  this.employeeForm.get('reportingManagerId')?.setValue(null, { emitEvent: false });
                }
              },
              error: () => this.managers = []
            });
        } else {
          this.managers = [];
          this.employeeForm.get('reportingManagerId')?.setValue(null, { emitEvent: false });
        }
      });
  }

  initializeForm(): void {
    const emp = this.data.employee;

    // Try to split international phone
    let detectedCode: string | null = null;
    let plainPhone = emp.phone || '';
    if (plainPhone && typeof plainPhone === 'string' && plainPhone.startsWith('+')) {
      const m = plainPhone.match(/^\+(\d{1,4})(.*)$/);
      if (m) {
        detectedCode = `+${m[1]}`;
        plainPhone = m[2].replace(/[^0-9]/g, '').trim();
      }
    }

    // Emergency phone split
    let detectedEmergencyCode: string | null = null;
    let plainEmergencyPhone = emp.emergencyContact?.phone || '';
    if (plainEmergencyPhone && typeof plainEmergencyPhone === 'string' && plainEmergencyPhone.startsWith('+')) {
      const em = plainEmergencyPhone.match(/^\+(\d{1,4})(.*)$/);
      if (em) {
        detectedEmergencyCode = `+${em[1]}`;
        plainEmergencyPhone = em[2].replace(/[^0-9]/g, '').trim();
      }
    }

    this.employeeForm = this.fb.group({
      employeeCode: [{ value: emp.employeeCode, disabled: !this.canEditEmployeeCode }],
      firstName: [emp.firstName, [Validators.required, Validators.minLength(2)]],
      lastName: [emp.lastName, [Validators.required, Validators.minLength(2)]],
      email: [emp.email, [Validators.required, Validators.email]],
      // ✅ Default to Pakistan if nothing detected
      phoneCountryCode: [detectedCode || this.DEFAULT_COUNTRY_CODE],
      phone: [plainPhone, [Validators.pattern(/^\+?[0-9]{6,15}$/)]],
      dateOfBirth: [emp.dateOfBirth ? new Date(emp.dateOfBirth) : null],
      gender: [emp.gender?.toLowerCase() || null],
      departmentId: [emp.departmentId || null],
      positionId: [emp.positionId || null],
      reportingManagerId: [emp.reportingManagerId || null],
      nationality: [emp.nationality],
      maritalStatus: [emp.maritalStatus?.toLowerCase() || null],
      employmentType: [emp.employmentType?.toLowerCase() || null],
      payType: [emp.payType?.toLowerCase() || null],
      basicSalary: [emp.basicSalary, [Validators.min(0)]],
      hireDate: [emp.hireDate ? new Date(emp.hireDate) : null],
      status: [emp.status?.toLowerCase() || null],
      address: this.fb.group({
        street: [emp.address?.street || ''],
        city: [emp.address?.city || ''],
        state: [emp.address?.state || ''],
        zip: [emp.address?.zip || '']
      }),
      emergencyContact: this.fb.group({
        name: [emp.emergencyContact?.name || ''],
        email: [emp.emergencyContact?.email || ''],
        // ✅ Default to Pakistan if nothing detected
        phoneCountryCode: [detectedEmergencyCode || this.DEFAULT_COUNTRY_CODE],
        phone: [plainEmergencyPhone, [Validators.pattern(/^\+?[0-9]{6,15}$/)]],
        relationship: [emp.emergencyContact?.relationship || '']
      })
    });
  }

  loadDropdowns(): void {
    this.employeeService.getDepartments().subscribe({
      next: (depts) => this.departments = depts,
      error: () => this.showError('Failed to load departments')
    });

    this.employeeService.getPositions().subscribe({
      next: (pos) => this.positions = pos,
      error: () => this.showError('Failed to load positions')
    });

    // Load managers for the existing department on initial open
    const existingDeptId = this.data.employee.departmentId;
    if (existingDeptId) {
      this.employeeService.getManagers(String(existingDeptId))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            this.managers = result.filter(m => m.employeeId !== this.data.employee.employeeId);
          },
          error: () => this.showError('Failed to load managers')
        });
    }
  }

  formatDateForInput(date: string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  onSave(): void {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      this.showError('Please fill all required fields correctly');
      return;
    }

    this.isLoading = true;

    const formValue = this.employeeForm.getRawValue();
    const formData = new FormData();

    formData.append('EmployeeId', this.data.employee.employeeId);
    formData.append('FirstName', formValue.firstName);
    formData.append('LastName', formValue.lastName);
    formData.append('Email', formValue.email);

    // Only combine if there's an actual phone number
    const combinedPhone = formValue.phone
      ? `${formValue.phoneCountryCode || ''}${formValue.phone}`.trim()
      : '';
    formData.append('Phone', combinedPhone);

    formData.append('DepartmentId', formValue.departmentId ?? '');
    formData.append('PositionId', formValue.positionId ?? '');
    formData.append('BasicSalary', formValue.basicSalary?.toString() ?? '');
    formData.append('WorkLocation', formValue.workLocation ?? '');
    formData.append('ReportingManagerId', formValue.reportingManagerId ?? '');
    formData.append('DateOfBirth', formValue.dateOfBirth ? this.formatDate(formValue.dateOfBirth) : '');
    formData.append('Gender', formValue.gender ?? '');
    formData.append('Nationality', formValue.nationality ?? '');
    formData.append('MaritalStatus', formValue.maritalStatus ?? '');
    formData.append('EmploymentType', formValue.employmentType ?? '');
    formData.append('PayType', formValue.payType ?? '');
    formData.append('HireDate', formValue.hireDate ? this.formatDate(formValue.hireDate) : '');
    formData.append('Status', formValue.status ?? '');
    formData.append('EmployeeNumber', formValue.employeeCode ?? '');

    // Combine emergency phone the same way
    const emergency = { ...formValue.emergencyContact };
    if (emergency.phone) {
      emergency.phone = `${emergency.phoneCountryCode || ''}${emergency.phone}`.trim();
    } else {
      emergency.phone = '';
    }
    delete emergency.phoneCountryCode;

    formData.append('Address', JSON.stringify(formValue.address));
    formData.append('EmergencyContact', JSON.stringify(emergency));

    formData.append('profileurl', new Blob(), '');

    this.employeeService.updateEmployee(formData).subscribe({
      next: (emp) => {
        this.isLoading = false;
        this.notificationService.showSuccess('Employee Updated Sucessfully');
        this.dialogRef.close(emp);
      },
      error: (err) => {
        this.isLoading = false;
        this.notificationService.showError('Failed to Update Employee');
        console.error(err);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000, horizontalPosition: 'end', verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000, horizontalPosition: 'end', verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }

  getErrorMessage(fieldName: string): string {
    const field = this.employeeForm.get(fieldName);
    if (!field) return '';
    if (field.hasError('required')) return 'This field is required';
    if (field.hasError('email')) return 'Invalid email address';
    if (field.hasError('minLength')) return `Minimum ${field.errors?.['minLength'].requiredLength} characters required`;
    if (field.hasError('pattern')) return 'Invalid format';
    if (field.hasError('min')) return 'Value must be greater than 0';
    return '';
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getCountryLabel(code?: string | null): string {
    if (!code) return '';
    const found = this.countries.find(c => c.code === code || c.code === (code + ''));
    return found ? `${found.name} ${found.code}` : code;
  }

  getCountryFlag(code?: string | null): string | undefined {
    if (!code) return undefined;
    const found = this.countries.find(c => c.code === code || c.code === (code + ''));
    return found?.flag;
  }

  onCountryPanelOpen(_isOpen: boolean) {}

  get filteredPositions(): Position[] {
    const deptId = this.employeeForm?.get('departmentId')?.value;
    return deptId ? this.positions.filter(p => p.departmentId === deptId) : [];
  }

  get isSuperAdmin(): boolean {
    const roleName = this.data.employee?.roleName || '';
    console.log('isSuperAdmin checked. RoleName is:', roleName);
    return roleName.toLowerCase().includes('super admin');
  }

  /** Only logged-in Super Admins can edit employee codes */
  get canEditEmployeeCode(): boolean {
    return this.authService.hasRole('Super Admin');
  }

  get isPositionDisabled(): boolean {
    return !this.employeeForm?.get('departmentId')?.value;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    const top = this.employeeForm.get(controlName);
    if (top) { top.setValue(value, { emitEvent: false }); return; }
    const nested = this.employeeForm.get('emergencyContact.' + controlName);
    if (nested) nested.setValue(value, { emitEvent: false });
  }

  private loadInitialData(): void {
    this.settingsService.getOrganizationSettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (settings) => {
          this.organizationCurrency = settings.currency || 'USD';
          const currency = this.settingsService.getAvailableCurrencies().find(c => c.code === this.organizationCurrency);
          this.currencySymbol = currency?.symbol || '$';
          this.employeeService.getCountryDialCodes()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (list) => {
                this.countries = list.map((x: any) => ({ name: x.name, code: x.code, flag: x.flag, cca2: x.cca2 }));
                this.resolvePhoneCountryFromEmployee();
              },
              error: (err) => console.error('Error loading country dial codes:', err)
            });
        },
        error: (error) => {
          console.error('Error loading organization currency:', error);
          this.currencySymbol = '$';
        }
      });
  }

  private resolvePhoneCountryFromEmployee(): void {
    // ── Main phone ───────────────────────────────────────────
    const rawPhone = (this.data?.employee?.phone || '').toString().trim();
    if (rawPhone) {
      const cleaned = rawPhone.replace(/[\s()\-./]/g, '');
      let bestMatch: { code: string; flag?: string } | null = null;
      let matchedPrefix = '';
      for (const c of this.countries) {
        if (!c.code) continue;
        const codeStr = String(c.code);
        for (const v of [codeStr, `+${codeStr}`]) {
          const norm = v.replace(/[^0-9+]/g, '');
          if (cleaned.startsWith(norm)) {
            if (!bestMatch || codeStr.length > (bestMatch.code || '').length) {
              bestMatch = c; matchedPrefix = norm;
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
        this.employeeForm.patchValue({ phoneCountryCode: bestMatch.code, phone: local }, { emitEvent: false });
      }
    } else {
      // ✅ No phone — keep default +92 and ensure flag resolves
      const exists = this.countries.find(c => c.code === this.DEFAULT_COUNTRY_CODE);
      if (exists) {
        this.employeeForm.patchValue({ phoneCountryCode: this.DEFAULT_COUNTRY_CODE, phone: '' }, { emitEvent: false });
      }
    }

    // ── Emergency phone ──────────────────────────────────────
    const rawEmergency = (this.data?.employee?.emergencyContact?.phone || '').toString().trim();
    if (rawEmergency) {
      const cleanedE = rawEmergency.replace(/[\s()\-./]/g, '');
      let bestMatchE: { code: string; flag?: string } | null = null;
      let matchedPrefixE = '';
      for (const c of this.countries) {
        if (!c.code) continue;
        const codeStr = String(c.code);
        for (const v of [codeStr, `+${codeStr}`]) {
          const norm = v.replace(/[^0-9+]/g, '');
          if (cleanedE.startsWith(norm)) {
            if (!bestMatchE || codeStr.length > (bestMatchE.code || '').length) {
              bestMatchE = c; matchedPrefixE = norm;
            }
          }
        }
      }
      if (bestMatchE) {
        let localE = cleanedE;
        if (matchedPrefixE && localE.startsWith('+')) localE = localE.replace(/^\+/, '');
        if (matchedPrefixE) {
          const prefixDigits = matchedPrefixE.replace(/[^0-9]/g, '');
          if (localE.startsWith(prefixDigits)) localE = localE.slice(prefixDigits.length);
        }
        localE = localE.replace(/[^0-9]/g, '').trim();
        this.employeeForm.patchValue({
          emergencyContact: { phoneCountryCode: bestMatchE.code, phone: localE }
        }, { emitEvent: false });
      }
    } else {
      // ✅ No emergency phone — keep default +92
      const existsE = this.countries.find(c => c.code === this.DEFAULT_COUNTRY_CODE);
      if (existsE) {
        this.employeeForm.patchValue({
          emergencyContact: { phoneCountryCode: this.DEFAULT_COUNTRY_CODE, phone: '' }
        }, { emitEvent: false });
      }
    }
  }
}
