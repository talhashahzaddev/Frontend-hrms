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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest, startWith } from 'rxjs';

import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { Position, Department, Role } from '../../../../core/models/employee.models';
import { EmployeeService } from '../../services/employee.service';
import { PositionFormDialogComponent } from '../position-form-dialog/position-form-dialog.component';
import { PositionDetailsViewComponent } from '../position-form-dialog/position-details-view.component';
import { PositionEmployeeViewComponent, PositionEmployeesViewData } from '../position-form-dialog/position-employee-viewDetails.component';
import { NotificationService } from '../../../../core/services/notification.service';

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
    MatDividerModule,
    MatCheckboxModule,
    MatPaginatorModule
  ],
  templateUrl: './position-list.component.html',
  styleUrls: ['./position-list.component.scss']
})
export class PositionListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  positions: Position[] = [];
  private allPositions: Position[] = [];
  departments: Department[] = [];
  roles: Role[] = [];

  // Table configuration
  displayedColumns: string[] = [
    'select',
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

  // Pagination — mat-paginator style (mirrors employee-list & department-list)
  totalCount = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 50];

  constructor(
    private employeeService: EmployeeService,
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

    combineLatest([
      this.employeeService.getDepartments(),
      this.employeeService.getRoles()
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ([departments, roles]) => {
        this.departments = departments;
        this.roles = roles;
        this.fetchPositions();
      },
      error: (error) => {
        const errorMessage = error?.error?.message || error?.message || 'Failed to load filter data';
        this.notificationService.showError(errorMessage);
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
      this.pageIndex = 0;
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
          this.allPositions = positions;
          this.totalCount = positions.length;
          this.applyPagination();
          this.isLoading = false;
        },
        error: (error) => {
          const errorMessage = error?.error?.message || error?.message || 'Failed to fetch positions';
          this.notificationService.showError(errorMessage);
          this.isLoading = false;
        }
      });
  }

  private applyPagination(): void {
    const start = this.pageIndex * this.pageSize;
    this.positions = this.allPositions.slice(start, start + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyPagination();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.departmentControl.setValue('');
    this.statusControl.setValue('');
  }

  hasFiltersApplied(): boolean {
    return !!(
      this.searchControl.value?.trim() ||
      this.departmentControl.value ||
      this.statusControl.value
    );
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
        this.notificationService.showSuccess('Position created successfully');
      }
    });
  }

  viewPosition(position: Position): void {
    this.dialog.open(PositionDetailsViewComponent, {
      width: '600px',
      data: {
        position,
        departments: this.departments,
        roles: this.roles
      }
    });
  }

  editPosition(position: Position): void {
    const dialogRef = this.dialog.open(PositionFormDialogComponent, {
      width: '600px',
      data: {
        mode: 'edit',
        position,
        departments: this.departments,
        roles: this.roles
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.fetchPositions();
        this.notificationService.showSuccess('Position updated successfully');
      }
    });
  }

  viewEmployees(position: Position): void {
    const departmentName = this.departments.find(d => d.departmentId === position.departmentId)?.departmentName || 'N/A';
    const roleName = this.roles.find(r => r.roleId === position.roleId)?.roleName || 'N/A';

    const dialogRef = this.dialog.open(PositionEmployeeViewComponent, {
      width: '900px',
      data: <PositionEmployeesViewData>{
        positionId: position.positionId,
        positionTitle: position.positionTitle,
        departmentName,
        roleName,
        description: position.description || 'N/A',
        employees: []
      }
    });

    dialogRef.componentInstance.isLoading = true;

    this.employeeService.getEmployeesByPosition(position.positionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const employees = res?.employees || [];
          dialogRef.componentInstance.employeesDataSource.data = employees;
          dialogRef.componentInstance.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching employees:', error);
          dialogRef.componentInstance.isLoading = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to load employees for this position';
          this.notificationService.showError(errorMessage);
        }
      });
  }

  togglePositionStatus(position: Position, newStatus: boolean): void {
    const action = newStatus ? 'Activate' : 'Deactivate';

    const dialogData: ConfirmDeleteData = {
      title: `${action} Position`,
      message: `Are you sure you want to ${action.toLowerCase()} "${position.positionTitle}"?`,
      itemName: position.positionTitle,
      confirmButtonText: `Yes, ${action}`
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: dialogData,
      panelClass: 'confirm-action-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.employeeService.updatePositionStatus(position.positionId, newStatus)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              position.isActive = newStatus;
              this.notificationService.showSuccess(`Position ${action.toLowerCase()}d successfully`);
            },
            error: (error) => {
              const errorMessage = error?.error?.message || error?.message || `Failed to ${action.toLowerCase()} position`;
              this.notificationService.showError(errorMessage);
            }
          });
      }
    });
  }

  deletePosition(position: Position): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Position',
      message: `Are you sure you want to delete "${position.positionTitle}"?`,
      itemName: position.positionTitle,
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: dialogData,
      panelClass: 'confirm-action-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.employeeService.deletePosition(position.positionId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.fetchPositions();
              this.notificationService.showSuccess('Position deleted successfully');
            },
            error: (error) => {
              const errorMessage = error?.error?.message || error?.message || 'Failed to delete position';
              this.notificationService.showError(errorMessage);
            }
          });
      }
    });
  }
}