import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
import { Employee, Department, Position, CreateEmployeeRequest, UpdateEmployeeRequest } from '../../../../core/models/employee.models';

@Component({
  selector: 'app-employee-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
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

  departments: Department[] = [];
  positions: Position[] = [];
  managers: Employee[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Get employee ID from route params if not provided as input
    if (!this.employeeId) {
      this.employeeId = this.route.snapshot.paramMap.get('id') || undefined;
    }

    this.isEditMode = !!this.employeeId;
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.employeeForm = this.fb.group({
      employeeCode: ['', [Validators.required]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      dateOfBirth: [''],
      gender: [''],
      maritalStatus: [''],
      nationality: [''],
      hireDate: ['', [Validators.required]],
      departmentId: ['', [Validators.required]],
      positionId: ['', [Validators.required]],
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
        phone: [''],
        relationship: [''],
        email: ['']
      })
    });
  }

  private loadInitialData(): void {
    const requests: any[] = [
      this.employeeService.getDepartments(),
      this.employeeService.getPositions(),
      this.employeeService.getManagers()
    ];

    if (this.isEditMode && this.employeeId) {
      requests.push(this.employeeService.getEmployee(this.employeeId));
    }

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results: any[]) => {
          this.departments = results[0];
          this.positions = results[1];
          this.managers = results[2];

          if (this.isEditMode && results[3]) {
            this.populateForm(results[3]);
          }

          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading initial data:', error);
          this.notificationService.showError('Failed to load form data');
          this.isLoading = false;
        }
      });
  }

  private populateForm(employee: Employee): void {
    this.employeeForm.patchValue({
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth) : null,
      gender: employee.gender,
      maritalStatus: employee.maritalStatus,
      nationality: employee.nationality,
      hireDate: new Date(employee.hireDate),
      departmentId: employee.employmentDetails?.departmentId,
      positionId: employee.employmentDetails?.positionId,
      employmentType: employee.employmentDetails?.employmentType || 'full_time',
      basicSalary: employee.employmentDetails?.baseSalary,
      reportingManagerId: employee.employmentDetails?.managerId,
      workLocation: employee.employmentDetails?.workLocation,
      address: employee.address || {},
      emergencyContact: employee.emergencyContact || {}
    });
  }

  onSubmit(): void {
    if (this.employeeForm.valid) {
      this.isSubmitting = true;
      const formValue = this.employeeForm.value;

      const request: CreateEmployeeRequest | UpdateEmployeeRequest = {
        employeeNumber: formValue.employeeCode,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
        phone: formValue.phone,
        dateOfBirth: formValue.dateOfBirth ? formValue.dateOfBirth.toISOString().split('T')[0] : undefined,
        gender: formValue.gender,
        maritalStatus: formValue.maritalStatus,
        hireDate: formValue.hireDate.toISOString().split('T')[0],
        departmentId: formValue.departmentId,
        positionId: formValue.positionId,
        employmentType: formValue.employmentType,
        baseSalary: formValue.basicSalary ? parseFloat(formValue.basicSalary) : 0,
        currency: 'USD',
        payFrequency: 'monthly',
        overtimeEligible: false,
        benefitsEligible: true,
        vacationDaysPerYear: 20,
        sickDaysPerYear: 10,
        effectiveDate: formValue.hireDate.toISOString().split('T')[0],
        employmentStatus: 'active'
      };

      const operation = this.isEditMode
        ? this.employeeService.updateEmployee(this.employeeId!, request as UpdateEmployeeRequest)
        : this.employeeService.createEmployee(request as CreateEmployeeRequest);

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
            this.notificationService.showError(
              `Failed to ${this.isEditMode ? 'update' : 'create'} employee`
            );
            this.isSubmitting = false;
          }
        });
    } else {
      this.markFormGroupTouched(this.employeeForm);
      this.notificationService.showError('Please fill in all required fields');
    }
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
