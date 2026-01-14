
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest, startWith } from 'rxjs';

import { Department, Employee } from '../../../../core/models/employee.models';
import { EmployeeService } from '../../services/employee.service';
import { DepartmentFormDialogComponent } from '../department-form-dialog/department-form-dialog.component';
import { ViewDepartmentDetailsComponent } from '../view-department-details/view-department-details.component';
import { AttendanceService } from '@/app/features/attendance/services/attendance.service';
import { DepartmentEmployeeViewComponent,DepartmentEmployeesViewData } from './view-department-employees';
import { DepartmentEmployee } from '@/app/core/models/attendance.models';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { NotificationService } from '../../../../core/services/notification.service';

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
    MatDividerModule,
    MatDialogModule
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
    private notificationService: NotificationService
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
          const errorMessage = error?.error?.message || error?.message || 'Failed to load managers';
          this.notificationService.showError(errorMessage);
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
          const errorMessage = error?.error?.message || error?.message || 'Failed to fetch departments';
          this.notificationService.showError(errorMessage);
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
        this.notificationService.showSuccess('Department created successfully');
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
        const errorMessage =
          error?.error?.message ||
          error?.message ||
          'Failed to load department employees';
        // this.showError(errorMessage);
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
        this.notificationService.showSuccess('Department updated successfully');
      }
    });
  }

toggleDepartmentStatus(department: Department, newStatus: boolean): void {
  const isActivating = newStatus;
  const action = isActivating ? 'Activate' : 'Deactivate';

  const dialogData: ConfirmDeleteData = {  // ✅ changed interface
    title: `${action} Department`,
    message: `Are you sure you want to ${action.toLowerCase()} this department?`,
    itemName: department.departmentName,
    confirmButtonText: `Yes, ${action}`   // ✅ dynamic button text
  };

  const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, { // ✅ updated component
    width: '450px',
    data: dialogData,
    panelClass: 'confirm-action-dialog-panel'
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result === true) {
      this.employeeService.updateDepartmentStatus(department.departmentId, newStatus)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.fetchDepartments();
            this.notificationService.showSuccess(`Department ${action.toLowerCase()}d successfully`);
          },
          error: (error) => {
            const errorMessage = error?.error?.message || error?.message || `Failed to ${action.toLowerCase()} department`;
            this.notificationService.showError(errorMessage);
          }
        });
    }
  });
}



  deleteDepartment(department: Department): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Department',
      message: 'Are you sure you want to delete this department?',
      itemName: department.departmentName
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.employeeService.deleteDepartment(department.departmentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.fetchDepartments();
              this.notificationService.showSuccess('Department deleted successfully');
            },
            error: (error) => {
              const errorMessage = error?.error?.message || error?.message || 'Failed to delete department';
              this.notificationService.showError(errorMessage);
            }
          });
      }
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



