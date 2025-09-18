import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

import { Department, Employee, CreateDepartmentRequest, UpdateDepartmentRequest } from '../../../../core/models/employee.models';
import { EmployeeService } from '../../services/employee.service';

export interface DepartmentDialogData {
  mode: 'create' | 'edit';
  department?: Department;
  managers: Employee[];
}

@Component({
  selector: 'app-department-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './department-form-dialog.component.html',
  styleUrls: ['./department-form-dialog.component.scss']
})
export class DepartmentFormDialogComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  departmentForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private dialogRef: MatDialogRef<DepartmentFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DepartmentDialogData
  ) {
    this.departmentForm = this.createForm();
    
    if (data.mode === 'edit' && data.department) {
      this.populateForm(data.department);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      departmentName: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      managerId: ['']
    });
  }

  private populateForm(department: Department): void {
    this.departmentForm.patchValue({
      departmentName: department.departmentName,
      description: department.description || '',
      managerId: department.managerId || ''
    });
  }

  onSubmit(): void {
    if (this.departmentForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.departmentForm.value;

    if (this.data.mode === 'create') {
      this.createDepartment(formValue);
    } else {
      this.updateDepartment(formValue);
    }
  }

  private createDepartment(formValue: any): void {
    const request: CreateDepartmentRequest = {
      departmentName: formValue.departmentName.trim(),
      description: formValue.description?.trim() || undefined,
      managerId: formValue.managerId || undefined
    };

    this.employeeService.createDepartment(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (department) => {
          this.dialogRef.close(department);
        },
        error: (error) => {
          console.error('Error creating department:', error);
          this.isSubmitting = false;
          // TODO: Show error message to user
        }
      });
  }

  private updateDepartment(formValue: any): void {
    if (!this.data.department) return;

    const request: UpdateDepartmentRequest = {
      departmentName: formValue.departmentName.trim(),
      description: formValue.description?.trim() || undefined,
      managerId: formValue.managerId || undefined
    };

    this.employeeService.updateDepartment(this.data.department.departmentId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (department) => {
          this.dialogRef.close(department);
        },
        error: (error) => {
          console.error('Error updating department:', error);
          this.isSubmitting = false;
          // TODO: Show error message to user
        }
      });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.departmentForm.controls).forEach(key => {
      const control = this.departmentForm.get(key);
      control?.markAsTouched();
    });
  }
}
