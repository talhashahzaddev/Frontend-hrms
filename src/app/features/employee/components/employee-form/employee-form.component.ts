import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { EmployeeService } from '../../services/employee.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { Employee, Department, Position, CreateEmployeeRequest, UpdateEmployeeRequest } from '../../../../core/models/employee.models';
import { PaymentService } from '../../../../core/services/payment.service';
import { PayrollService } from 'src/app/features/payroll/services/payroll.service';
import { TaxCategoryDto } from 'src/app/features/payroll/services/payroll.service';

@Component({
  selector: 'app-employee-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './employee-form.component.html',
  styleUrls: ['./employee-form.component.scss']
})
export class EmployeeFormComponent implements OnInit, OnDestroy {
  @Input() employeeId?: string;

  employeeForm!: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  isLoading = true;
  hasActiveSubscription = true;
  isSubscriptionExpired = false;

  departments: Department[] = [];
  positions: Position[] = [];
  managers: Employee[] = [];
  taxCategories: TaxCategoryDto[] = [];
  countries: { name: string; code: string; flag?: string; cca2?: string }[] = [];
  countryFilter = '';
  organizationCurrency: string = 'USD';
  currencySymbol: string = '$';

  private destroy$ = new Subject<void>();

  // Getter for filtered positions based on selected department
  get filteredPositions(): Position[] {
    const selectedDepartmentId = this.employeeForm.get('departmentId')?.value;
    if (!selectedDepartmentId) {
      return [];
    }
    return this.positions.filter(pos => pos.departmentId === selectedDepartmentId);
  }

  // Check if position dropdown should be disabled
  get isPositionDisabled(): boolean {
    return !this.employeeForm.get('departmentId')?.value;
  }

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private notificationService: NotificationService,
    private paymentService: PaymentService,
    private settingsService: SettingsService,
    private router: Router,
    private route: ActivatedRoute,
    private payrollService: PayrollService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.checkSubscription();
    // Get employee ID from route params if not provided as input
    if (!this.employeeId) {
      this.employeeId = this.route.snapshot.paramMap.get('id') || undefined;
    }

    this.isEditMode = !!this.employeeId;
    this.loadInitialData();

    // Watch for changes in departmentId to filter positions and clear position if needed
    this.employeeForm.get('departmentId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((departmentId) => {
        const positionControl = this.employeeForm.get('positionId');
        const currentPositionId = positionControl?.value;
        
        // If department changes, check if current position belongs to new department
        if (departmentId && currentPositionId) {
          const currentPosition = this.positions.find(p => p.positionId === currentPositionId);
          if (currentPosition && currentPosition.departmentId !== departmentId) {
            // Clear position if it doesn't belong to the selected department
            positionControl?.setValue('', { emitEvent: false });
          }
        } else if (!departmentId) {
          // Clear position if no department is selected
          positionControl?.setValue('', { emitEvent: false });
        }
      });

    // Debug: Watch for changes in reportingManagerId
    this.employeeForm.get('reportingManagerId')?.valueChanges.subscribe(value => {
      console.log('Reporting Manager ID changed to:', value);
    });

    // Debug: Check if the form control exists
    const reportingManagerControl = this.employeeForm.get('reportingManagerId');
    console.log('Reporting Manager control exists:', !!reportingManagerControl);
    console.log('Reporting Manager control value:', reportingManagerControl?.value);
    console.log('Reporting Manager control status:', reportingManagerControl?.status);
  }

  private checkSubscription(): void {
    // Pass dummy UUID as backend overwrites it with token's organizationId
    this.paymentService.getCompanySubscriptionDetailsByCompanyId('00000000-0000-0000-0000-000000000000')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details) => {
          this.hasActiveSubscription = !!details;
          this.isSubscriptionExpired = details ? details.isExpired : false;
        },
        error: () => {
          this.hasActiveSubscription = false;
          this.isSubscriptionExpired = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    console.log('Initializing form...');
    this.employeeForm = this.fb.group({
      employeeCode: ['', [Validators.required]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phoneCountryCode: ['+92'],
      phone: [''],
      dateOfBirth: ['',[Validators.required]],
      gender: [''],
      maritalStatus: [''],
      nationality: [''],
      hireDate: ['', [Validators.required]],
      departmentId: ['', [Validators.required]],
      positionId: ['', [Validators.required]],
      taxCategoryId: [''],
      employmentType: ['full_time'],
      basicSalary: [''],
      reportingManagerId: [''],
      workLocation: [''],
      address: this.fb.group({
        street: [''],
        city: [''],
        state: [''],
        zip: ['']
      }),
      emergencyContact: this.fb.group({
        name: [''],
        phoneCountryCode: ['+92'],
        phone: [''],
        relationship: [''],
        email: ['']
      })
    });
    console.log('Form initialized. Reporting Manager control:', this.employeeForm.get('reportingManagerId'));
  }

  private loadInitialData(): void {
    // Load organization currency first
    this.settingsService.getOrganizationSettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (settings) => {
          this.organizationCurrency = settings.currency || 'USD';
          const currency = this.settingsService.getAvailableCurrencies().find(c => c.code === this.organizationCurrency);
          this.currencySymbol = currency?.symbol || '$';
        },
        error: (error) => {
          console.error('Error loading organization currency:', error);
          // Default to USD if error
          this.organizationCurrency = 'USD';
          this.currencySymbol = '$';
        }
      });

    const requests: any[] = [
      this.employeeService.getDepartments(),
      this.employeeService.getPositions(),
      this.employeeService.getManagers(),
      this.payrollService.getActiveTaxCategories()
    ];

    if (this.isEditMode && this.employeeId) {
      requests.push(this.employeeService.getEmployee(this.employeeId));
    }

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results: any[]) => {
          this.departments = (results[0] as Department[]).filter(d => d.isActive || (this.isEditMode && d.departmentId === results[4]?.employmentDetails?.departmentId));
          this.positions = (results[1] as Position[]).filter(p => p.isActive || (this.isEditMode && p.positionId === results[4]?.employmentDetails?.positionId));

          this.managers = results[2];
          this.taxCategories = results[3] as TaxCategoryDto[] || [];

          // Debug logging for managers
          console.log('Managers loaded:', this.managers);
          if (this.managers.length > 0) {
            console.log('First manager:', this.managers[0]);
            console.log('First manager employeeId:', this.managers[0].employeeId);
            console.log('First manager employeeId type:', typeof this.managers[0].employeeId);
          }

          // Debug: Check form control after managers are loaded
          const reportingManagerControl = this.employeeForm.get('reportingManagerId');
          console.log('After managers loaded - Reporting Manager control:', reportingManagerControl);
          console.log('After managers loaded - Control value:', reportingManagerControl?.value);

          if (this.isEditMode && results[4]) {
            this.populateForm(results[4]);
          }

          this.isLoading = false;

          // Load country dial codes separately
          this.employeeService.getCountryDialCodes()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (list) => {
                // Map to shape {name, code, flag, cca2}
                this.countries = list.map(x => ({ name: x.name, code: x.code, flag: x.flag, cca2: x.cca2 }));
                console.log('Loaded country dial codes:', this.countries.length);
              },
              error: (err) => {
                console.error('Error loading country dial codes:', err);
              }
            });
        },
        error: (error) => {
          console.error('Error loading initial data:', error);
          this.notificationService.showError('Failed to load form data');
          this.isLoading = false;
        }
      });
  }

  private populateForm(employee: Employee): void {
    // If phone contains an international prefix, try to split it into code + rest
    let detectedCode: string | undefined;
    let plainPhone = employee.phone;
    if (employee.phone && typeof employee.phone === 'string' && employee.phone.startsWith('+')) {
      const m = employee.phone.match(/^\+(\d{1,4})(.*)$/);
      if (m) {
        detectedCode = `+${m[1]}`;
        plainPhone = m[2].replace(/[^0-9]/g, '').trim();
      }
    }

    this.employeeForm.patchValue({
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth) : null,
      gender: employee.gender,
      maritalStatus: employee.maritalStatus,
      nationality: employee.nationality,
      hireDate: new Date(employee.hireDate),
      departmentId: employee.employmentDetails?.departmentId,
      positionId: employee.employmentDetails?.positionId,
      taxCategoryId: (employee.employmentDetails as any)?.taxCategoryId,
      employmentType: employee.employmentDetails?.employmentType || 'full_time',
      basicSalary: employee.employmentDetails?.baseSalary,
      reportingManagerId: employee.employmentDetails?.managerId,
      phoneCountryCode: detectedCode,
      phone: plainPhone,
      workLocation: employee.employmentDetails?.workLocation,
      address: employee.address || {},
      emergencyContact: employee.emergencyContact || {}
    });
  }

  onSubmit(): void {
    if (this.employeeForm.valid) {
      this.isSubmitting = true;
      const formValue = this.employeeForm.value;

      // Debug logging
      console.log('Form values:', formValue);
      console.log('Reporting Manager ID:', formValue.reportingManagerId);
      console.log('Basic Salary:', formValue.basicSalary);
      console.log('Work Location:', formValue.workLocation);

      const combinedPhone = `${formValue.phoneCountryCode || ''}${formValue.phone || ''}`.trim();
      console.log('Combined phone to submit:', combinedPhone);

      // Combine emergency contact phone country code + number if provided
      if (formValue.emergencyContact) {
        const emCode = formValue.emergencyContact.phoneCountryCode || '';
        const emPhone = formValue.emergencyContact.phone || '';
        formValue.emergencyContact.phone = `${emCode}${emPhone}`.trim();
      }

      const request: CreateEmployeeRequest | UpdateEmployeeRequest = {
        employeeNumber: formValue.employeeCode,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
        phone: combinedPhone,
        // dateOfBirth: formValue.dateOfBirth ? formValue.dateOfBirth.toISOString().split('T')[0] : undefined,
        dateOfBirth: formValue.dateOfBirth ? this.formatDateOnly(formValue.dateOfBirth) : undefined,

        gender: formValue.gender,
        maritalStatus: formValue.maritalStatus,
        // hireDate: formValue.hireDate.toISOString().split('T')[0],
        hireDate: this.formatDateOnly(formValue.hireDate),

        departmentId: formValue.departmentId,
        positionId: formValue.positionId,
        reportingManagerId: formValue.reportingManagerId || undefined,
        workLocation: formValue.workLocation,
        employmentType: formValue.employmentType,
        basicSalary: formValue.basicSalary ? parseFloat(formValue.basicSalary) : 0,
        currency: 'USD',
        payFrequency: 'monthly',
        overtimeEligible: false,
        benefitsEligible: true,
        vacationDaysPerYear: 20,
        sickDaysPerYear: 10,
        effectiveDate: formValue.hireDate.toISOString().split('T')[0],
        employmentStatus: 'active',
        //  Add these two:
        address: formValue.address,
        emergencyContact: formValue.emergencyContact,
        nationality: formValue.nationality,


      };

      // Debug: Log the final request
      console.log('Final request object:', request);
      // build untyped payload so we can add optional fields not present in the TS DTO
      const payload: any = {
        ...request,
        taxCategoryId: formValue.taxCategoryId || undefined,
        reportingManagerId: formValue.reportingManagerId || undefined,
        phone: combinedPhone
      };

      console.log('Final reportingManagerId in payload:', payload.reportingManagerId);

      const operation = this.isEditMode
        ? this.employeeService.updateEmployee(formValue)
        : this.employeeService.createEmployee(payload as CreateEmployeeRequest);

operation
  .pipe(takeUntil(this.destroy$))
  .subscribe({
    next: () => {
      this.notificationService.showSuccess(
        `Employee ${this.isEditMode ? 'updated' : 'created'} successfully`
      );
      this.router.navigate(['/employees']);
    },
    error: (error) => {
      console.error('Error saving employee:', error);

      const errorMessage =
        error?.error?.message ||
        error?.message ||
        `Failed to ${this.isEditMode ? 'update' : 'create'} employee`;

      this.notificationService.showError(errorMessage);
      this.isSubmitting = false;
    }
  });
    } else {
      this.markFormGroupTouched(this.employeeForm);
      this.notificationService.showError('Please fill in all required fields');
    }
  }


onDateBlur(event: FocusEvent, fieldName: 'dateOfBirth' | 'hireDate'): void {
  const input = event.target as HTMLInputElement;
  const value = input.value;

  if (!value) return;

  // Get the correct form control
  const control = this.employeeForm.get(fieldName);
  if (!control) return;

  // If already a Date (from calendar), do nothing
  if (control.value instanceof Date) {
    return;
  }


  const parsedDate = this.parseDDMMYYYY(value);

  if (parsedDate) {
    control.setValue(parsedDate);
  } else {
    control.setErrors({ invalidDate: true });
  }
}

onCountryPanelOpen(isOpen: boolean) {
  if (isOpen) {
    this.countryFilter = '';
  }
}

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    const digits = input.value.replace(/\D+/g, '');
    if (input.value !== digits) {
      // update the native input value to keep caret behaviour reasonable
      input.value = digits;
    }
    const control = this.employeeForm.get('phone');
    if (control && control.value !== digits) {
      control.setValue(digits, { emitEvent: false });
    }
  }

  onPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text') || '';
    const digits = paste.replace(/\D+/g, '');
    const control = this.employeeForm.get('phone');
    if (control) {
      control.setValue(digits);
    }
  }

  // Emergency contact phone handlers (mirror main phone behavior but target nested control)
  onEmergencyPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    const digits = input.value.replace(/\D+/g, '');
    if (input.value !== digits) {
      input.value = digits;
    }
    const control = this.employeeForm.get('emergencyContact.phone');
    if (control && control.value !== digits) {
      control.setValue(digits, { emitEvent: false });
    }
  }

  onEmergencyPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text') || '';
    const digits = paste.replace(/\D+/g, '');
    const control = this.employeeForm.get('emergencyContact.phone');
    if (control) {
      control.setValue(digits);
    }
  }



private parseDDMMYYYY(value: string): Date | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const parts = value.split('/');
  if (parts.length !== 3) {
    return null;
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const year = Number(parts[2]);

  // Validate year length
  if (parts[2].length !== 4) {
    return null;
  }


  const date = new Date(year, month, day);
   // Validate real date
  if (isNaN(date.getTime()) || date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }

  // Validate real date
  return isNaN(date.getTime()) ? null : date;
}


private formatDateOnly(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-based
  const year = date.getFullYear();
  return `${year}-${month}-${day}`; // format: YYYY-MM-DD
}

  // Returns a friendly label for a country code (e.g. "Pakistan +92")
  getCountryLabel(code?: string | null): string {
    if (!code) return '';
    const found = this.countries.find(c => c.code === code || c.code === (code + ''));
    if (found) return `${found.name} ${found.code}`;
    return code;
  }

  // Returns the flag URL for a selected country code (if available)
  getCountryFlag(code?: string | null): string | undefined {
    if (!code) return undefined;
    const found = this.countries.find(c => c.code === code || c.code === (code + ''));
    return found?.flag;
  }




  onCancel(): void {
    this.router.navigate(['/employees']);
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
}
