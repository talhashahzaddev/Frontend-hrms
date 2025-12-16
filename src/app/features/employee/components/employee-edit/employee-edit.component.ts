import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Employee, Department, Position } from '../../../../core/models/employee.models';
import { EmployeeService } from '../../services/employee.service';

@Component({
  selector: 'app-employee-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './employee-edit.component.html',
  styleUrls: ['./employee-edit.component.scss']
})
export class EmployeeEditComponent implements OnInit {
  employeeForm!: FormGroup;
  departments: Department[] = [];
  positions: Position[] = [];
  managers: Employee[] = [];
  isLoading = false;

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
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<EmployeeEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { employee: Employee }
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadDropdowns();
  }


initializeForm(): void {
  const emp = this.data.employee;

  this.employeeForm = this.fb.group({
    employeeCode: [{ value: emp.employeeCode, disabled: true }],
    firstName: [emp.firstName, [Validators.required, Validators.minLength(2)]],
    lastName: [emp.lastName, [Validators.required, Validators.minLength(2)]],
    email: [emp.email, [Validators.required, Validators.email]],
    phone: [emp.phone, [Validators.pattern(/^[0-9]{10,15}$/)]],
    dateOfBirth: [this.formatDateForInput(emp.dateOfBirth)],
    gender: [emp.gender?.toLowerCase() || null],
    departmentId: [emp.departmentId || null],
    positionId: [emp.positionId || null],
    reportingManagerId: [emp.reportingManagerId || null],
    nationality: [emp.nationality],
    maritalStatus: [emp.maritalStatus?.toLowerCase() || null],
    employmentType: [emp.employmentType?.toLowerCase() || null],
    payType: [emp.payType?.toLowerCase() || null],
    basicSalary: [emp.basicSalary, [Validators.min(0)]],
    hireDate: [this.formatDateForInput(emp.hireDate)],
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
      phone: [emp.emergencyContact?.phone || ''],
      relationship: [emp.emergencyContact?.relationship || '']
    })
  });
}


  loadDropdowns(): void {
    this.employeeService.getDepartments().subscribe({
      next: (depts) => this.departments = depts,
      error: (err) => this.showError('Failed to load departments')
    });

    this.employeeService.getPositions().subscribe({
      next: (pos) => this.positions = pos,
      error: (err) => this.showError('Failed to load positions')
    });

    this.employeeService.getManagers().subscribe({
      next: (mgrs) => {
        // Filter out the current employee from managers list
        this.managers = mgrs.filter(m => m.employeeId !== this.data.employee.employeeId);
      },
      error: (err) => this.showError('Failed to load managers')
    });
  }

  formatDateForInput(date: string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
  formData.append('Phone', formValue.phone);

  formData.append('DepartmentId', formValue.departmentId ?? '');
  formData.append('PositionId', formValue.positionId ?? '');
  formData.append('BasicSalary', formValue.basicSalary?.toString() ?? '');
  formData.append('WorkLocation', formValue.workLocation ?? '');
  formData.append('ReportingManagerId', formValue.reportingManagerId ?? '');
formData.append('DateOfBirth', formValue.dateOfBirth ?? '');
formData.append('Gender', formValue.gender ?? '');
formData.append('Nationality', formValue.nationality ?? '');
formData.append('MaritalStatus', formValue.maritalStatus ?? '');
formData.append('EmploymentType', formValue.employmentType ?? '');
formData.append('PayType', formValue.payType ?? '');
formData.append('HireDate', formValue.hireDate ?? '');
formData.append('Status', formValue.status ?? '');
formData.append('EmployeeNumber', formValue.employeeCode ?? '');
  formData.append('Address', JSON.stringify(formValue.address));
  formData.append('EmergencyContact', JSON.stringify(formValue.emergencyContact));

  // 👇 same trick as profile
  formData.append('profileurl', new Blob(), '');

  this.employeeService.updateEmployee(formData).subscribe({
    next: (emp) => {
      this.isLoading = false;
      this.showSuccess('Employee updated successfully');
      this.dialogRef.close(emp);
    },
    error: (err) => {
      this.isLoading = false;
      this.showError('Failed to update employee');
      console.error(err);
    }
  });
}




  onCancel(): void {
    if (this.employeeForm.dirty) {
      const confirmClose = confirm('You have unsaved changes. Do you want to discard them?');
      if (!confirmClose) return;
    }
    this.dialogRef.close();
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
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
}

