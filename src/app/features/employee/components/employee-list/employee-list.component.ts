import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, startWith, combineLatest } from 'rxjs';

import {EmployeeDialogueComponent} from '../employee-dialogue/employee-dialogue.component'
import { EmployeeService } from '../../services/employee.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Employee, Department, Position, EmployeeSearchRequest } from '../../../../core/models/employee.models';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
    selector: 'app-employee-list',
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        MatCardModule,
        MatTableModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatCheckboxModule,
        MatDividerModule,
        MatDialogModule
    ],
    templateUrl: './employee-list.component.html',
    styleUrls: ['./employee-list.component.scss']
})
export class EmployeeListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  employees: Employee[] = [];
  departments: Department[] = [];
  positions: Position[] = [];
  
  // Table configuration
  displayedColumns: string[] = [
    'select',
    'employeeNumber',
    'name',
    'email',
    'department',
    'position',
    'hireDate',
    'status',
    'actions'
  ];
  
  selection = new SelectionModel<Employee>(true, []);
  
  // Loading states
  isLoading = false;
  isLoadingFilters = false;
  
  // Pagination
  totalCount = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];
  profilePreviewUrl:string|null=null;
private backendBaseUrl = 'https://localhost:60485';

  // Search and Filters
  searchControl = new FormControl('');
  departmentControl = new FormControl('');
  positionControl = new FormControl('');
  statusControl = new FormControl('');
  employmentTypeControl = new FormControl('');

  // Filter options
  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'terminated', label: 'Terminated' },
    { value: 'on_leave', label: 'On Leave' }
  ];

  employmentTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'full_time', label: 'Full Time' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'intern', label: 'Intern' }
  ];

  constructor(
    private employeeService: EmployeeService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadFilterOptions();
    this.setupSearch();
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    // Combine search and filter controls
    combineLatest([
      this.searchControl.valueChanges.pipe(startWith('')),
      this.departmentControl.valueChanges.pipe(startWith('')),
      this.positionControl.valueChanges.pipe(startWith('')),
      this.statusControl.valueChanges.pipe(startWith('')),
      this.employmentTypeControl.valueChanges.pipe(startWith(''))
    ]).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.pageIndex = 0;
      this.loadEmployees();
    });
  }

  private loadFilterOptions(): void {
    this.isLoadingFilters = true;
    
    combineLatest([
      this.employeeService.getDepartments(),
      this.employeeService.getPositions()
    ]).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ([departments, positions]) => {
        this.departments = departments;
        this.positions = positions;
        this.isLoadingFilters = false;
      },
      error: (error) => {
        console.error('Failed to load filter options:', error);
        this.notificationService.showError('Failed to load filter options');
        this.isLoadingFilters = false;
      }
    });
  }

  private loadEmployees(): void {
    this.isLoading = true;
    
    const searchRequest: EmployeeSearchRequest = {
      searchTerm: this.searchControl.value || undefined,
      departmentId: this.departmentControl.value || undefined,
      positionId: this.positionControl.value || undefined,
      employmentStatus: this.statusControl.value || undefined,
      employmentType: this.employmentTypeControl.value || undefined,
      page: this.pageIndex + 1,
      pageSize: this.pageSize,
      sortBy: 'firstName',
      sortDirection: 'asc'
    };

    this.employeeService.getEmployees(searchRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
         
          // this.employees = response.employees;
this.employees = response.employees.map(emp => ({
  ...emp,
  profilePictureUrl: emp.profilePictureUrl
    ? emp.profilePictureUrl.startsWith('http')
      ? emp.profilePictureUrl
      : `${this.backendBaseUrl}${emp.profilePictureUrl}`
    : undefined // ✅ use undefined instead of null
}));

          this.totalCount = response.totalCount;
          this.isLoading = false;
          this.selection.clear();
          
        },
        error: (error) => {
          console.error('Failed to load employees:', error);
          this.notificationService.showError('Failed to load employees');
          this.isLoading = false;
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadEmployees();
  }

  // Selection methods
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.employees.length;
    return numSelected === numRows;
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.employees);
  }

  checkboxLabel(row?: Employee): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.employeeCode}`;
  }

  // Actions
  // viewEmployee(employee: Employee): void {
  //   // Navigate to employee detail
  // }
viewEmployee(employee: Employee): void {
  this.dialog.open(EmployeeDialogueComponent, {
    width: '700px',
    data: { employee, viewOnly: true } // viewOnly = true for viewing
  });
}

editEmployee(employee: Employee): void {
  const dialogRef = this.dialog.open(EmployeeDialogueComponent, {
    width: '700px',
    data: { employee, viewOnly: false } // viewOnly = false for editing
  });

  dialogRef.afterClosed().subscribe((updatedEmployee: Employee) => {
    if (updatedEmployee) {
      // Update the employee locally or reload from backend
      const index = this.employees.findIndex(e => e.employeeId === updatedEmployee.employeeId);
      if (index !== -1) this.employees[index] = updatedEmployee;
      this.notificationService.showSuccess('Employee updated successfully');
    }
  });
}


  // editEmployee(employee: Employee): void {
  //   // Navigate to employee edit form
  // }

  deleteEmployee(employee: Employee): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Employee',
      message: 'Are you sure you want to delete this employee?',
      itemName: `${employee.firstName} ${employee.lastName}`
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.employeeService.deleteEmployee(employee.employeeId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Employee deleted successfully');
              this.loadEmployees();
            },
            error: (error) => {
              console.error('Failed to delete employee:', error);
              this.notificationService.showError('Failed to delete employee');
            }
          });
      }
    });
  }

  toggleEmployeeStatus(employee: Employee): void {
    const isActive = employee.status === 'active';
    const action = isActive ? 'deactivate' : 'activate';
    const actionCall = isActive 
      ? this.employeeService.deactivateEmployee(employee.employeeId)
      : this.employeeService.activateEmployee(employee.employeeId);

    actionCall.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess(`Employee ${action}d successfully`);
          this.loadEmployees();
        },
        error: (error) => {
          console.error(`Failed to ${action} employee:`, error);
          this.notificationService.showError(`Failed to ${action} employee`);
        }
      });
  }

  // Bulk Actions
  bulkActivate(): void {
    const selectedIds = this.selection.selected.map(emp => emp.employeeId);
    if (selectedIds.length === 0) return;

    this.employeeService.bulkActivateEmployees(selectedIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess(`${selectedIds.length} employees activated successfully`);
          this.loadEmployees();
        },
        error: (error) => {
          console.error('Failed to activate employees:', error);
          this.notificationService.showError('Failed to activate employees');
        }
      });
  }

  bulkDeactivate(): void {
    const selectedIds = this.selection.selected.map(emp => emp.employeeId);
    if (selectedIds.length === 0) return;

    this.employeeService.bulkDeactivateEmployees(selectedIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess(`${selectedIds.length} employees deactivated successfully`);
          this.loadEmployees();
        },
        error: (error) => {
          console.error('Failed to deactivate employees:', error);
          this.notificationService.showError('Failed to deactivate employees');
        }
      });
  }

  exportEmployees(): void {
    this.employeeService.exportEmployees('xlsx')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `employees_${new Date().toISOString().split('T')[0]}.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.notificationService.showSuccess('Employees exported successfully');
        },
        error: (error) => {
          console.error('Failed to export employees:', error);
          this.notificationService.showError('Failed to export employees');
        }
      });
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.departmentControl.setValue('');
    this.positionControl.setValue('');
    this.statusControl.setValue('');
    this.employmentTypeControl.setValue('');
  }

  getStatusChipClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      case 'terminated': return 'status-terminated';
      case 'on_leave': return 'status-on-leave';
      default: return 'status-default';
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  getEmployeeFullName(employee: Employee): string {
    return `${employee.fullName}`;
  }
}
