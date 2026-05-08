import { Component, OnInit, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HelpDeskService } from '../../services/help-desk.services';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { NotificationService } from '@/app/core/services/notification.service';
import { CreateCategoryRequest, UpdateCategoryRequest } from '@/app/core/models/helpdesk.models';

export interface Department {
  departmentId: string;
  departmentName: string;
}

export interface Category {
  categoryId: string;
  departmentId: string;
  departmentName: string;
  categoryName: string;
  status: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-create-ticket-category-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './create-ticket-category-dialog.component.html',
  styleUrls: ['./create-ticket-category-dialog.component.scss']
})
export class CreateTicketCategoryDialogComponent implements OnInit {

  categoryForm!: FormGroup;
  departments: Department[] = [];
  loadingDepartments = false;
  loading = false;
  isEditMode = false;
  categoryId: string | null = null;
  dialogTitle = 'Create Category';
  submitButtonLabel = 'Create';

  constructor(
    private fb: FormBuilder,
    private helpDeskService: HelpDeskService,
    private employeeService: EmployeeService,
    private dialogRef: MatDialogRef<CreateTicketCategoryDialogComponent>,
    private notification: NotificationService,
    @Optional() @Inject(MAT_DIALOG_DATA) private data: Category
  ) {
    if (this.data) {
      this.isEditMode = true;
      this.categoryId = this.data.categoryId;
      this.dialogTitle = 'Edit Category';
      this.submitButtonLabel = 'Update';
    }
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadDepartments();
  }

  initializeForm(): void {
    if (this.isEditMode && this.data) {
      // Pre-populate form with existing data
      this.categoryForm = this.fb.group({
        name: [this.data.categoryName, [Validators.required, Validators.minLength(2)]],
        departmentId: [this.data.departmentId, Validators.required],
        status: [this.data.status, Validators.required]
      });
    } else {
      // Create mode - empty form
      this.categoryForm = this.fb.group({
        name: ['', [Validators.required, Validators.minLength(2)]],
        departmentId: [null, Validators.required],
        status: [true, Validators.required]
      });
    }
  }

  loadDepartments(): void {
    this.loadingDepartments = true;
    this.employeeService.getDepartments().subscribe({
      next: (res: Department[]) => {
        console.log('Departments:', res);
        this.departments = res || [];
        this.loadingDepartments = false;
      },
      error: (err) => {
        console.error('Failed to load departments', err);
        this.notification.showError('Failed to load departments');
        this.loadingDepartments = false;
      }
    });
  }

  submit(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.categoryForm.value;

    if (this.isEditMode && this.categoryId) {
      // Call update service
      const updateRequest: UpdateCategoryRequest = {
        categoryId: this.categoryId,
        categoryName: formValue.name,
        departmentId: formValue.departmentId,
        status: formValue.status
      };

      this.helpDeskService.updateCategory(updateRequest).subscribe({
        next: (success: boolean) => {
          this.loading = false;
          if (success) {
            this.notification.showSuccess('Category updated successfully');
            this.dialogRef.close(true);
          } else {
            this.notification.showError('Failed to update category');
          }
        },
        error: (err: any) => {
          this.loading = false;
          console.error('Failed to update category', err);
          this.notification.showError(err?.message || 'Error updating category');
        }
      });
    } else {
      // Call create service
      const createRequest: CreateCategoryRequest = {
        departmentId: formValue.departmentId,
        name: formValue.name,
        status: formValue.status
      };

      this.helpDeskService.createCategory(createRequest).subscribe({
        next: (success: boolean) => {
          this.loading = false;
          if (success) {
            this.notification.showSuccess('Category created successfully');
            this.dialogRef.close(true);
          } else {
            this.notification.showError('Failed to create category');
          }
        },
        error: (err: any) => {
          this.loading = false;
          console.error('Failed to create category', err);
          this.notification.showError(err?.message || 'Error creating category');
        }
      });
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}