import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { HelpDeskService } from '../../services/help-desk.services';
import { EmployeeService } from '@/app/features/employee/services/employee.service';

export interface Department {
  departmentId: string;
  departmentName: string;
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

  constructor(
    private fb: FormBuilder,
    private helpDeskService: HelpDeskService,
    private employeeService: EmployeeService,
    private dialogRef: MatDialogRef<CreateTicketCategoryDialogComponent>
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadDepartments();
  }

  initializeForm(): void {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      departmentId: [null, Validators.required],
      status: [true, Validators.required]
    });
  }

  loadDepartments(): void {
    this.loadingDepartments = true;
    this.employeeService.getDepartments().subscribe({
      next: (res: Department[]) => {
        console.log('Departments:', res); // verify data structure
        this.departments = res || [];
        this.loadingDepartments = false;
      },
      error: (err) => {
        console.error('Failed to load departments', err);
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
    this.helpDeskService.createCategory(this.categoryForm.value).subscribe({
      next: (success: boolean) => {
        this.loading = false;
        if (success) this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Failed to create category', err);
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}