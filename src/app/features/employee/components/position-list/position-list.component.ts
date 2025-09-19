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

import { Position, Department } from '../../../../core/models/employee.models';
import { EmployeeService } from '../../services/employee.service';
import { PositionFormDialogComponent } from '../position-form-dialog/position-form-dialog.component';

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
  filteredPositions: Position[] = [];
  departments: Department[] = [];
  
  // Table configuration
  displayedColumns: string[] = [
    'title',
    'department',
    'employeeCount',
    'status',
    'createdAt',
    'actions'
  ];
  
  // Loading states
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
      this.employeeService.getPositions(),
      this.employeeService.getDepartments()
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ([positions, departments]) => {
        this.positions = positions;
        this.departments = departments;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading positions:', error);
        this.showError('Failed to load positions');
        this.isLoading = false;
      }
    });
  }

  private setupFilters(): void {
    combineLatest([
      this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
      this.departmentControl.valueChanges,
      this.statusControl.valueChanges
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.applyFilters();
    });
  }

  private applyFilters(): void {
    let filtered = [...this.positions];

    // Search filter
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(position => 
        position.positionTitle.toLowerCase().includes(searchTerm) ||
        position.description?.toLowerCase().includes(searchTerm) ||
        position.departmentName?.toLowerCase().includes(searchTerm)
      );
    }

    // Department filter
    const departmentFilter = this.departmentControl.value;
    if (departmentFilter) {
      filtered = filtered.filter(position => position.departmentId === departmentFilter);
    }

    // Status filter
    const statusFilter = this.statusControl.value;
    if (statusFilter === 'active') {
      filtered = filtered.filter(position => position.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(position => !position.isActive);
    }

    this.filteredPositions = filtered;
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
        departments: this.departments
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInitialData();
        this.showSuccess('Position created successfully');
      }
    });
  }

  viewPosition(position: Position): void {
    // TODO: Implement view position details
    console.log('View position:', position);
  }

  editPosition(position: Position): void {
    const dialogRef = this.dialog.open(PositionFormDialogComponent, {
      width: '600px',
      data: { 
        mode: 'edit',
        position: position,
        departments: this.departments
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInitialData();
        this.showSuccess('Position updated successfully');
      }
    });
  }

  togglePositionStatus(position: Position, newStatus: boolean): void {
    const action = newStatus ? 'activate' : 'deactivate';
    const confirmMessage = `Are you sure you want to ${action} "${position.positionTitle}"?`;
    
    if (confirm(confirmMessage)) {
      // Since there's no specific activate/deactivate endpoint, we'll use update
      this.employeeService.updatePosition(position.positionId, {
        positionTitle: position.positionTitle,
        description: position.description,
        departmentId: position.departmentId
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadInitialData();
          this.showSuccess(`Position ${action}d successfully`);
        },
        error: (error) => {
          console.error(`Error ${action}ing position:`, error);
          this.showError(`Failed to ${action} position`);
        }
      });
    }
  }

  deletePosition(position: Position): void {
    const confirmMessage = `Are you sure you want to delete "${position.positionTitle}"? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      this.employeeService.deletePosition(position.positionId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadInitialData();
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
}

