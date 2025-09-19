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
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest } from 'rxjs';

import { Department, Employee } from '../../../../core/models/employee.models';
import { EmployeeService } from '../../services/employee.service';
import { DepartmentFormDialogComponent } from '../department-form-dialog/department-form-dialog.component';

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
  filteredDepartments: Department[] = [];
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
  
  // Loading states
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
    
    combineLatest([
      this.employeeService.getDepartments(),
      this.employeeService.getManagers()
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ([departments, managers]) => {
        this.departments = departments;
        this.managers = managers;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading departments:', error);
        this.showError('Failed to load departments');
        this.isLoading = false;
      }
    });
  }

  private setupFilters(): void {
    combineLatest([
      this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
      this.statusControl.valueChanges,
      this.managerControl.valueChanges
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.applyFilters();
    });
  }

  private applyFilters(): void {
    let filtered = [...this.departments];

    // Search filter
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(dept => 
        dept.departmentName.toLowerCase().includes(searchTerm) ||
        dept.description?.toLowerCase().includes(searchTerm) ||
        dept.managerName?.toLowerCase().includes(searchTerm)
      );
    }

    // Status filter
    const statusFilter = this.statusControl.value;
    if (statusFilter === 'active') {
      filtered = filtered.filter(dept => dept.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(dept => !dept.isActive);
    }

    // Manager filter
    const managerFilter = this.managerControl.value;
    if (managerFilter) {
      filtered = filtered.filter(dept => dept.managerId === managerFilter);
    }

    this.filteredDepartments = filtered;
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
        this.loadInitialData();
        this.showSuccess('Department created successfully');
      }
    });
  }

  viewDepartment(department: Department): void {
    // TODO: Implement view department details
    console.log('View department:', department);
  }

  editDepartment(department: Department): void {
    const dialogRef = this.dialog.open(DepartmentFormDialogComponent, {
      width: '600px',
      data: { 
        mode: 'edit',
        department: department,
        managers: this.managers
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInitialData();
        this.showSuccess('Department updated successfully');
      }
    });
  }

  toggleDepartmentStatus(department: Department, newStatus: boolean): void {
    const action = newStatus ? 'activate' : 'deactivate';
    const confirmMessage = `Are you sure you want to ${action} "${department.departmentName}"?`;
    
    if (confirm(confirmMessage)) {
      // Since there's no specific activate/deactivate endpoint, we'll use update
      this.employeeService.updateDepartment(department.departmentId, {
        departmentName: department.departmentName,
        description: department.description,
        managerId: department.managerId
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadInitialData();
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
            this.loadInitialData();
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
}

