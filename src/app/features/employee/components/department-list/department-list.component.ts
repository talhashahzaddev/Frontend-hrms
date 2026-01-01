
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest, startWith } from 'rxjs';

import { Department, Employee } from '../../../../core/models/employee.models';
import { EmployeeService } from '../../services/employee.service';
import { DepartmentFormDialogComponent } from '../department-form-dialog/department-form-dialog.component';
import { ViewDepartmentDetailsComponent } from '../view-department-details/view-department-details.component';
import { AttendanceService } from '@/app/features/attendance/services/attendance.service';
import { DepartmentEmployeeViewComponent,DepartmentEmployeesViewData } from './view-department-employees';
import { DepartmentEmployee } from '@/app/core/models/attendance.models';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './department-list.component.html',
  styleUrls: ['./department-list.component.scss']
})
export class DepartmentListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  departments: Department[] = [];
  managers: Employee[] = [];

  // Table configuration
  displayedColumns: string[] = [
    'name',
    'manager',
    'employeeCount',
    'status',
    'createdAt',
    'actions'
  ];

  // Loading state
  isLoading = false;

  // Search and Filters
  searchControl = new FormControl('');
  statusControl = new FormControl('');
  managerControl = new FormControl('');

  // Filter options
  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  constructor(
    private employeeService: EmployeeService,
    private attendanceService:AttendanceService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.isLoading = true;

    // Load managers first
    this.employeeService.getManagers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (managers) => {
          this.managers = managers;
          // Fetch departments immediately with default filters
          this.fetchDepartments();
        },
        error: (error) => {
          console.error('Error loading managers:', error);
          this.showError('Failed to load managers');
          this.isLoading = false;
        }
      });
  }

  private setupFilters(): void {
    combineLatest([
      this.searchControl.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged()),
      this.statusControl.valueChanges.pipe(startWith('')),
      this.managerControl.valueChanges.pipe(startWith(''))
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.fetchDepartments();
    });
  }

  private fetchDepartments(): void {
    const searchQuery = this.searchControl.value || undefined;
    const status = this.statusControl.value || undefined;
    const managerId = this.managerControl.value || undefined;

    this.isLoading = true;

    this.employeeService.getDepartments(searchQuery, status as 'active' | 'inactive')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (departments) => {
          this.departments = departments;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching departments:', error);
          this.showError('Failed to fetch departments');
          this.isLoading = false;
        }
      });
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.statusControl.setValue('');
    this.managerControl.setValue('');
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(DepartmentFormDialogComponent, {
      width: '600px',
      data: {
        mode: 'create',
        managers: this.managers
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.fetchDepartments();
        this.showSuccess('Department created successfully');
      }
    });
  }

  viewDepartment(department: Department): void {
    const dialogRef = this.dialog.open(ViewDepartmentDetailsComponent, {
      width: '600px',
      data: {
        department,
        managers: this.managers
      }
    });

    dialogRef.afterClosed().subscribe(() => {});
  }



//View Department Employees

viewDepartmentEmployees(department: Department): void {

  const dialogRef = this.dialog.open(DepartmentEmployeeViewComponent, {
    width: '900px',
    data: {
      departmentId: department.departmentId,
      departmentName: department.departmentName,
      employees: []
    }
  });

  dialogRef.componentInstance.isLoading = true;

  this.attendanceService.getDepartmentEmployees(department.departmentId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (employees: DepartmentEmployee[]) => {
        // ✅ employees is already the array
        dialogRef.componentInstance.employeesDataSource.data = employees;
        dialogRef.componentInstance.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading department employees:', error);
        dialogRef.componentInstance.isLoading = false;
        this.showError('Failed to load department employees');
      }
    });
}






  editDepartment(department: Department): void {
    const dialogRef = this.dialog.open(DepartmentFormDialogComponent, {
      width: '600px',
      data: {
        mode: 'edit',
        department,
        managers: this.managers
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.fetchDepartments();
        this.showSuccess('Department updated successfully');
      }
    });
  }

  toggleDepartmentStatus(department: Department, newStatus: boolean): void {
  const action = newStatus ? 'activate' : 'deactivate';
  const confirmMessage = `Are you sure you want to ${action} "${department.departmentName}"?`;

  if (confirm(confirmMessage)) {
    this.employeeService.updateDepartmentStatus(department.departmentId, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.fetchDepartments();
          this.showSuccess(`Department ${action}d successfully`);
        },
        error: (error) => {
          console.error(`Error ${action}ing department:`, error);
          this.showError(`Failed to ${action} department`);
        }
      });
  }
}


  deleteDepartment(department: Department): void {
    const confirmMessage = `Are you sure you want to delete "${department.departmentName}"? This action cannot be undone.`;

    if (confirm(confirmMessage)) {
      this.employeeService.deleteDepartment(department.departmentId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.fetchDepartments();
            this.showSuccess('Department deleted successfully');
          },
          error: (error) => {
            console.error('Error deleting department:', error);
            this.showError('Failed to delete department');
          }
        });
    }
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Helper method to check if filters are applied
  hasFiltersApplied(): boolean {
    return !!(
      this.searchControl.value?.trim() ||
      this.statusControl.value ||
      this.managerControl.value
    );
  }
}



