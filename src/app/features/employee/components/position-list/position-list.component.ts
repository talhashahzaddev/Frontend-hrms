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

import { Position, Department, Role } from '../../../../core/models/employee.models';
import { EmployeeService } from '../../services/employee.service';
import { PositionFormDialogComponent } from '../position-form-dialog/position-form-dialog.component';
import { PositionDetailsViewComponent } from '../position-form-dialog/position-details-view.component';
import{PositionEmployeeViewComponent,PositionEmployeesViewData} from '../position-form-dialog/position-employee-viewDetails.component'

@Component({
  selector: 'app-position-list',
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
  templateUrl: './position-list.component.html',
  styleUrls: ['./position-list.component.scss']
})
export class PositionListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  positions: Position[] = [];
  departments: Department[] = [];
  roles: Role[] = [];

  // Table configuration
  displayedColumns: string[] = [
    'title',
    'department',
    'role',
    'employeeCount',
    'status',
    'createdAt',
    'actions'
  ];

  // Loading state
  isLoading = false;

  // Search and Filters
  searchControl = new FormControl('');
  departmentControl = new FormControl('');
  statusControl = new FormControl('');

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
      this.employeeService.getRoles()
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ([departments, roles]) => {
        this.departments = departments;
        this.roles = roles;

        // Fetch positions immediately with default filters
        this.fetchPositions();
      },
      error: (error) => {
        console.error('Error loading filter data:', error);
        this.showError('Failed to load filter data');
        this.isLoading = false;
      }
    });
  }

  private setupFilters(): void {
    combineLatest([
      this.searchControl.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged()),
      this.departmentControl.valueChanges.pipe(startWith('')),
      this.statusControl.valueChanges.pipe(startWith(''))
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.fetchPositions();
    });
  }

  private fetchPositions(): void {
    const departmentId = this.departmentControl.value || undefined;
    const search = this.searchControl.value || undefined;
    const status = this.statusControl.value || undefined;

    this.isLoading = true;

    this.employeeService.getPositions(departmentId, search, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (positions) => {
          this.positions = positions;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching positions:', error);
          this.showError('Failed to fetch positions');
          this.isLoading = false;
        }
      });
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.departmentControl.setValue('');
    this.statusControl.setValue('');
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(PositionFormDialogComponent, {
      width: '600px',
      data: { 
        mode: 'create',
        departments: this.departments,
        roles: this.roles
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.fetchPositions();
        this.showSuccess('Position created successfully');
      }
    });
  }

  viewPosition(position: Position): void {
    const dialogRef = this.dialog.open(PositionDetailsViewComponent, {
      width: '600px',
      data: {
        position: position,
        departments: this.departments,
        roles: this.roles
      }
    });

    dialogRef.afterClosed().subscribe(() => {});
  }

  editPosition(position: Position): void {
    const dialogRef = this.dialog.open(PositionFormDialogComponent, {
      width: '600px',
      data: { 
        mode: 'edit',
        position: position,
        departments: this.departments,
        roles: this.roles
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.fetchPositions();
        this.showSuccess('Position updated successfully');
      }
    });
  }


//Adding iew mploee method

// Inside PositionListComponent

viewEmployees(position: Position): void {
  const departmentName = this.departments.find(d => d.departmentId === position.departmentId)?.departmentName || 'N/A';
  const roleName = this.roles.find(r => r.roleId === position.roleId)?.roleName || 'N/A';

  // Open dialog immediately with empty table and spinner
  const dialogRef = this.dialog.open(PositionEmployeeViewComponent, {
    width: '900px',
    data: <PositionEmployeesViewData>{
      positionId: position.positionId,
      positionTitle: position.positionTitle,
      departmentName: departmentName,
      roleName: roleName,
      description: position.description || 'N/A',
      employees: [] // empty initially
    }
  });

  // Show loading
  dialogRef.componentInstance.isLoading = true;

  // Fetch employees from API
  this.employeeService.getEmployeesByPosition(position.positionId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => {
        const employees = res?.employees || [];
        console.log('Employees:', employees);

        // Update table dynamically
        dialogRef.componentInstance.employeesDataSource.data = employees;

        // Hide spinner
        dialogRef.componentInstance.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching employees:', error);

        // Hide spinner
        dialogRef.componentInstance.isLoading = false;

        this.showError('Failed to load employees for this position');
      }
    });
}


 
togglePositionStatus(position: Position, newStatus: boolean): void {
  const action = newStatus ? 'activate' : 'deactivate';
  const confirmMessage = `Are you sure you want to ${action} "${position.positionTitle}"?`;

  if (!confirm(confirmMessage)) {
    return;
  }

  this.employeeService
    .updatePositionStatus(position.positionId, newStatus)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        // Optimistic UI update
        position.isActive = newStatus;

        this.showSuccess(`Position ${action}d successfully`);
      },
      error: (error) => {
        console.error(`Error ${action}ing position:`, error);
        this.showError(`Failed to ${action} position`);
      }
    });
}




  deletePosition(position: Position): void {
    const confirmMessage = `Are you sure you want to delete "${position.positionTitle}"? This action cannot be undone.`;

    if (confirm(confirmMessage)) {
      this.employeeService.deletePosition(position.positionId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.fetchPositions();
            this.showSuccess('Position deleted successfully');
          },
          error: (error) => {
            console.error('Error deleting position:', error);
            this.showError('Failed to delete position');
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
      this.departmentControl.value ||
      this.statusControl.value
    );
  }
}

