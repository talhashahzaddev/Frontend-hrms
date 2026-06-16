import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { PerformanceService } from '../../services/performance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { KRA, CreateKRARequest, UpdateKRARequest, Goal, CreateGoalRequest, UpdateGoalRequest } from '../../../../core/models/performance.models';
import { Position, Employee } from '../../../../core/models/employee.models';
import { PaginatedResponse } from '../../../../core/models/common.models';
import { CreateKRADialogComponent } from './create-kra-dialog.component';
import { KRADetailsDialogComponent } from './kra-details-dialog.component';
import { CreateGoalDialogComponent } from './create-goals-dialog';
import { AssignGoalsDialogComponent } from './assiged-goals-dialog';
import { GoalsViewDetailDialogComponent } from './gaols-view-detail-dialog';
import { SelfAssessmentDialogComponent } from '../appraisals/self-assessment-dialog.component';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-kra-management',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
    MatDividerModule,
    MatCheckboxModule
  ],
  templateUrl: './kra-management.component.html',
  styleUrls: ['./kra-management.component.scss']
})
export class KRAManagementComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  
  isLoading = false;
  isLoadingGoals = false;
  isLoadingEmployeeGoals = false;
  kras: KRA[] = [];
  filteredKRAs: KRA[] = [];
  krasDataSource = new MatTableDataSource<KRA>([]);
  positions: Position[] = [];
  displayedColumns: string[] = ['title', 'cycleName', 'kraRate', 'noOfGoals', 'status', 'actions'];
  
  // Goals properties
  goals: Goal[] = [];
  filteredGoals: Goal[] = [];
  goalsDataSource = new MatTableDataSource<Goal>([]);
  goalsDisplayedColumns: string[] = ['title', 'kra', 'progress', 'dates', 'status', 'goalActions'];
  goalsSearchTerm: string = '';
  
  // Employee Goals properties
  employeeGoals: Goal[] = [];
  filteredEmployeeGoals: Goal[] = [];
  employeeGoalsDataSource = new MatTableDataSource<Goal>([]);
  employeeGoalsSearchTerm: string = '';
  
  // Pagination
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;

  // Goals pagination
  goalPageSize = 10;
  goalPageIndex = 0;
  totalGoals = 0;

  // Employee Goals pagination
  employeeGoalPageSize = 10;
  employeeGoalPageIndex = 0;
  totalEmployeeGoals = 0;

  // Tab management
  selectedTab = 0;

  // Paginators (template refs)
  @ViewChild('kraPaginator') kraPaginator?: MatPaginator;
  @ViewChild('goalsPaginator') goalsPaginator?: MatPaginator;
  @ViewChild('employeeGoalsPaginator') employeeGoalsPaginator?: MatPaginator;

  // Filter form
  filterForm: FormGroup;

  constructor(
    private performanceService: PerformanceService,
    private employeeService: EmployeeService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      status: ['']
    });
  }

  ngOnInit(): void {
    // Ensure the default tab is visible based on permissions.
    // If the user cannot see the KRA table, default to the Goals tab when available.
    if (!this.hasPermission('KRA_MANAGEMENT_SECTION') || !this.hasPermission('KRA_TABLE')) {
      if (this.hasPermission('GOAL_MANAGEMENT_SECTION') || this.hasPermission('HR_GOAL_TABLE')) {
        this.selectedTab = 1;
      }
    }

    this.loadPositions();
    this.loadKRAs();
    this.loadGoals();
    this.loadEmployeeGoals();

    // Real-time search with debounce for KRAs
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.pageIndex = 0; // Reset to first page on filter change
        this.applyFilters();
      });
  }

  ngAfterViewInit(): void {
    // Subscribe to paginator page events if they exist
    this.kraPaginator?.page.pipe(takeUntil(this.destroy$)).subscribe((e: PageEvent) => this.onPageChange(e));
    this.goalsPaginator?.page.pipe(takeUntil(this.destroy$)).subscribe((e: PageEvent) => this.onGoalPageChange(e));
    this.employeeGoalsPaginator?.page.pipe(takeUntil(this.destroy$)).subscribe((e: PageEvent) => this.onEmployeeGoalPageChange(e));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectTab(tabIndex: number): void {
    this.selectedTab = tabIndex;
  }

  loadPositions(): void {
    this.employeeService.getPositions().subscribe({
      next: (positions) => {
        this.positions = positions || [];
      },
      error: (error) => {
        console.error('Error loading positions:', error);
      }
    });
  }

  loadKRAs(): void {
    this.isLoading = true;
    // Load all KRAs for client-side filtering and pagination
    this.performanceService.getKRAs(1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const paginatedData = response.data as any;
            this.kras = paginatedData.data || paginatedData.items || [];
            this.totalItems = this.kras.length;
            this.pageIndex = 0;
            this.applyFilters();
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading KRAs:', error);
          this.notificationService.showError('Failed to load KRAs');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(): void {
    const searchTerm = (this.filterForm.get('search')?.value || '').toLowerCase();
    const status = this.filterForm.get('status')?.value || '';

    // Filter the KRAs based on search and status
    this.filteredKRAs = this.kras.filter(kra => {
      const matchesSearch = !searchTerm || 
        kra.title.toLowerCase().includes(searchTerm) ||
        (kra.kraDescription && kra.kraDescription.toLowerCase().includes(searchTerm));
      
      const matchesStatus = !status || 
        (status === 'active' && kra.isActive) ||
        (status === 'inactive' && !kra.isActive);

      return matchesSearch && matchesStatus;
    });

    // Update total items based on filtered results
    this.totalItems = this.filteredKRAs.length;
    this.pageIndex = 0; // Reset to first page when filters change

    // Reset paginator UI back to first page when filters are applied
    try { this.kraPaginator?.firstPage(); } catch { }

    // Apply pagination to filtered results
    this.updatePaginatedKRAs();
  }

  private updatePaginatedKRAs(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.krasDataSource.data = this.filteredKRAs.slice(startIndex, endIndex);
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      status: ''
    });
    this.pageIndex = 0;
    this.loadKRAs();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateKRADialogComponent, {
      width: '480px',
      maxWidth: '90vw',
      data: {
        positions: this.positions,
        isEditMode: false
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result && !result.isEdit) {
          this.createKRA(result.request);
        } else if (result && result.isEdit) {
          this.updateKRA(result.kra.kraId, result.request);
        }
      });
  }

  openEditDialog(kra: KRA): void {
    const dialogRef = this.dialog.open(CreateKRADialogComponent, {
      width: '480px',
      maxWidth: '90vw',
      data: {
        positions: this.positions,
        kra: kra,
        isEditMode: true
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result && result.isEdit) {
          this.updateKRA(result.kra.kraId, result.request);
        }
      });
  }

  private createKRA(request: CreateKRARequest): void {
    this.isLoading = true;
    this.performanceService.createKRA(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess('KRA created successfully');
            this.loadKRAs();
          } else {
            this.notificationService.showError(response.message || 'Failed to create KRA');
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error creating KRA:', error);
          this.notificationService.showError(error.error?.message || 'Failed to create KRA');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private updateKRA(kraId: string, request: UpdateKRARequest): void {
    this.isLoading = true;
    this.performanceService.updateKRA(kraId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess('KRA updated successfully');
            this.loadKRAs();
          } else {
            this.notificationService.showError(response.message || 'Failed to update KRA');
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error updating KRA:', error);
          this.notificationService.showError(error.error?.message || 'Failed to update KRA');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  deleteKRA(kra: KRA): void {
    if (confirm(`Are you sure you want to delete "${kra.title}"? This action cannot be undone.`)) {
      this.isLoading = true;
      this.performanceService.deleteKRA(kra.kraId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.showSuccess('KRA deleted successfully');
              this.loadKRAs();
            } else {
              this.notificationService.showError(response.message || 'Failed to delete KRA');
            }
            this.isLoading = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error deleting KRA:', error);
            this.notificationService.showError(error.error?.message || 'Failed to delete KRA');
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        });
    }
  }

  toggleKRAStatus(kra: KRA): void {
    this.performanceService.updateKRAStatus(kra.kraId, !kra.isActive)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess(`KRA ${!kra.isActive ? 'activated' : 'deactivated'} successfully`);
            this.loadKRAs();
          } else {
            this.notificationService.showError(response.message || 'Failed to update KRA status');
          }
        },
        error: (error) => {
          console.error('Error updating KRA status:', error);
          this.notificationService.showError('Failed to update KRA status');
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedKRAs();
  }

  viewKRADetails(kra: KRA): void {
    this.isLoading = true;
    this.performanceService.getKRAById(kra.kraId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const dialogRef = this.dialog.open(KRADetailsDialogComponent, {
              width: '700px',
              maxWidth: '90vw',
              data: {
                kra: response.data,
                hasEditPermission: true
              },
              disableClose: false
            });

            dialogRef.afterClosed()
              .pipe(takeUntil(this.destroy$))
              .subscribe(result => {
                if (result?.edit) {
                  this.openEditDialog(response.data);
                } else if (result?.refresh) {
                  this.loadKRAs();
                }
              });
          } else {
            this.notificationService.showError('Failed to load KRA details');
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading KRA details:', error);
          this.notificationService.showError('Failed to load KRA details');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
  }

  getGoalCountForKRA(kraId: string): number {
    return this.goals.filter(goal => goal.kraId === kraId).length;
  }

  // Helper method to check if filters are applied
  hasFiltersApplied(): boolean {
    if (!this.filterForm) return false;
    const values = this.filterForm.value;
    return !!(values.search?.trim() || values.status);
  }

  // =================== GOALS METHODS ===================

  loadGoals(): void {
    this.isLoadingGoals = true;
    this.performanceService.getAllGoals()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.goals = response.data || [];
            this.filteredGoals = [...this.goals];
            this.totalGoals = this.goals.length;
            this.goalPageIndex = 0;
            this.updatePaginatedGoals();
            try { this.goalsPaginator?.firstPage(); } catch { }
          }
          this.isLoadingGoals = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading goals:', error);
          this.notificationService.showError('Failed to load goals');
          this.isLoadingGoals = false;
          this.cdr.markForCheck();
        }
      });
  }

  private updatePaginatedGoals(): void {
    const startIndex = this.goalPageIndex * this.goalPageSize;
    const endIndex = startIndex + this.goalPageSize;
    this.goalsDataSource.data = this.filteredGoals.slice(startIndex, endIndex);
  }

  filterGoals(): void {
    const searchTerm = (this.goalsSearchTerm || '').toLowerCase();

    this.filteredGoals = this.goals.filter(goal => {
      return !searchTerm ||
        goal.title.toLowerCase().includes(searchTerm) ||
        (goal.description && goal.description.toLowerCase().includes(searchTerm)) ||
        (goal.kraName && goal.kraName.toLowerCase().includes(searchTerm));
    });

    this.totalGoals = this.filteredGoals.length;
    this.goalPageIndex = 0; // Reset to first page on filter change
    try { this.goalsPaginator?.firstPage(); } catch { }
    this.updatePaginatedGoals();
  }

  openCreateGoalDialog(): void {
    const dialogRef = this.dialog.open(CreateGoalDialogComponent, {
      width: '350px',
      maxWidth: '90vw',
      data: {
        isEditMode: false
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result && !result.isEdit) {
          this.createGoal(result.request);
        } else if (result && result.isEdit) {
          this.updateGoal(result.goal.goalId, result.request);
        }
      });
  }

  openEditGoalDialog(goal: Goal): void {
    const dialogRef = this.dialog.open(CreateGoalDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: {
        goal: goal,
        isEditMode: true
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result && result.isEdit) {
          this.updateGoal(result.goal.goalId, result.request);
        }
      });
  }

  openAssignGoalDialog(goal: Goal): void {
    const dialogRef = this.dialog.open(AssignGoalsDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: {
        isManager: false,
        goal: goal
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result === 'assigned') {
          this.loadGoals();
        }
      });
  }

  private createGoal(request: CreateGoalRequest): void {
    this.isLoadingGoals = true;
    this.performanceService.createGoal(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess('Goal created successfully');
            this.loadGoals();
          } else {
            this.notificationService.showError(response.message || 'Failed to create goal');
          }
          this.isLoadingGoals = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error creating goal:', error);
          this.notificationService.showError(error.error?.message || 'Failed to create goal');
          this.isLoadingGoals = false;
          this.cdr.markForCheck();
        }
      });
  }

  private updateGoal(goalId: string, request: UpdateGoalRequest): void {
    this.isLoadingGoals = true;
    this.performanceService.updateGoal(goalId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess('Goal updated successfully');
            this.loadGoals();
          } else {
            this.notificationService.showError(response.message || 'Failed to update goal');
          }
          this.isLoadingGoals = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error updating goal:', error);
          this.notificationService.showError(error.error?.message || 'Failed to update goal');
          this.isLoadingGoals = false;
          this.cdr.markForCheck();
        }
      });
  }

  deleteGoal(goal: Goal): void {
    if (confirm(`Are you sure you want to delete "${goal.title}"? This action cannot be undone.`)) {
      this.isLoadingGoals = true;
      this.performanceService.deleteGoal(goal.goalId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.showSuccess('Goal deleted successfully');
              this.loadGoals();
            } else {
              this.notificationService.showError(response.message || 'Failed to delete goal');
            }
            this.isLoadingGoals = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error deleting goal:', error);
            this.notificationService.showError(error.error?.message || 'Failed to delete goal');
            this.isLoadingGoals = false;
            this.cdr.markForCheck();
          }
        });
    }
  }

  toggleGoalStatus(goal: Goal): void {
    // Note: You may need to implement updateGoalStatus in the performance service
    const newStatus = !goal.isActive;
    this.notificationService.showSuccess(`Goal ${newStatus ? 'activated' : 'deactivated'} successfully`);
    goal.isActive = newStatus;
    this.goalsDataSource.data = [...this.goals];
  }

  viewGoalDetails(goal: Goal): void {
    this.dialog.open(GoalsViewDetailDialogComponent, {
      width: '580px',
      maxWidth: '90vw',
      data: {
        goal: goal
      },
      disableClose: false
    });
  }

  onGoalPageChange(event: PageEvent): void {
    this.goalPageIndex = event.pageIndex;
    this.goalPageSize = event.pageSize;
    this.updatePaginatedGoals();
  }

  getProgressIcon(progress: string): string {
    switch (progress?.toLowerCase()) {
      case 'completed':
        return 'check_circle';
      case 'inprogress':
        return 'schedule';
      case 'onhold':
        return 'pause_circle';
      case 'tostart':
        return 'radio_button_unchecked';
      default:
        return 'help';
    }
  }

  // =================== EMPLOYEE GOALS METHODS ===================

  loadEmployeeGoals(): void {
    this.isLoadingEmployeeGoals = true;
    this.performanceService.getEmployeeGoals()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.employeeGoals = response.data || [];
            this.filteredEmployeeGoals = [...this.employeeGoals];
            this.totalEmployeeGoals = this.employeeGoals.length;
            this.employeeGoalPageIndex = 0;
            this.updatePaginatedEmployeeGoals();
            try { this.employeeGoalsPaginator?.firstPage(); } catch { }
          }
          this.isLoadingEmployeeGoals = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading employee goals:', error);
          this.notificationService.showError('Failed to load employee goals');
          this.isLoadingEmployeeGoals = false;
          this.cdr.markForCheck();
        }
      });
  }

  private updatePaginatedEmployeeGoals(): void {
    const startIndex = this.employeeGoalPageIndex * this.employeeGoalPageSize;
    const endIndex = startIndex + this.employeeGoalPageSize;
    this.employeeGoalsDataSource.data = this.filteredEmployeeGoals.slice(startIndex, endIndex);
  }

  filterEmployeeGoals(): void {
    const searchTerm = (this.employeeGoalsSearchTerm || '').toLowerCase();

    this.filteredEmployeeGoals = this.employeeGoals.filter(goal => {
      return !searchTerm ||
        goal.title.toLowerCase().includes(searchTerm) ||
        (goal.description && goal.description.toLowerCase().includes(searchTerm)) ||
        (goal.kraName && goal.kraName.toLowerCase().includes(searchTerm));
    });

    this.totalEmployeeGoals = this.filteredEmployeeGoals.length;
    this.employeeGoalPageIndex = 0; // Reset to first page on filter change
    try { this.employeeGoalsPaginator?.firstPage(); } catch { }
    this.updatePaginatedEmployeeGoals();
  }

  onEmployeeGoalPageChange(event: PageEvent): void {
    this.employeeGoalPageIndex = event.pageIndex;
    this.employeeGoalPageSize = event.pageSize;
    this.updatePaginatedEmployeeGoals();
  }

  getEmployeeGoalStatusButtonText(progress: string): string {
    switch (progress?.toLowerCase()) {
      case 'tostart':
        return 'Start';
      case 'inprogress':
        return 'Complete';
      case 'completed':
        return 'Completed';
      default:
        return 'Start';
    }
  }

  getEmployeeGoalNextStatus(progress: string): string {
    switch (progress?.toLowerCase()) {
      case 'tostart':
        return 'InProgress';
      case 'inprogress':
        return 'Completed';
      case 'completed':
        return 'Completed';
      default:
        return 'InProgress';
    }
  }

  isEmployeeGoalActionDisabled(progress: string): boolean {
    return progress?.toLowerCase() === 'completed';
  }

  updateGoalStatusTo(goal: Goal, status: string): void {
    if (!goal.goalId) {
      this.notificationService.showError('Goal ID is missing');
      return;
    }

    this.isLoadingEmployeeGoals = true;
    this.performanceService.updateGoalStatus(goal.goalId, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess(`Goal status updated to ${status}`);
            this.loadEmployeeGoals();
            this.loadKRAs(); // Reload KRAs to reflect any changes in goal counts
            
            // Open self-assessment dialog if status is Completed and self-assessment is enabled for this goal
            if (status?.toLowerCase() === 'completed' && goal.isSelfAssessmentEnable) {
              this.openSelfAssessmentDialog(goal);
            }
          } else {
            this.notificationService.showError(response.message || 'Failed to update goal status');
          }
          this.isLoadingEmployeeGoals = false;
          this.loadKRAs(); 
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error updating employee goal status:', error);
          this.notificationService.showError(error.error?.message || 'Failed to update goal status');
          this.isLoadingEmployeeGoals = false;
          this.cdr.markForCheck();
        }
      });
  }

  updateEmployeeGoalStatus(goal: Goal): void {
    const nextStatus = this.getEmployeeGoalNextStatus(goal.progress);
    
    if (goal.progress?.toLowerCase() === 'completed') {
      this.notificationService.showInfo('Goal is already completed');
      return;
    }

    const updateRequest: UpdateGoalRequest = {
      goalId: goal.goalId,
      title: goal.title,
      description: goal.description || '',
      kraId: goal.kraId || '',
      progress: nextStatus,
      startDate: goal.startDate,
      endDate: goal.endDate,
      isActive: goal.isActive
    };

    this.isLoadingEmployeeGoals = true;
    this.performanceService.updateGoal(goal.goalId, updateRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess(`Goal status updated to ${nextStatus}`);
            this.loadEmployeeGoals();
          } else {
            this.notificationService.showError(response.message || 'Failed to update goal status');
          }
          this.isLoadingEmployeeGoals = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error updating employee goal:', error);
          this.notificationService.showError(error.error?.message || 'Failed to update goal status');
          this.isLoadingEmployeeGoals = false;
          this.cdr.markForCheck();
        }
      });
  }

  viewEmployeeGoalDetails(goal: Goal): void {
    this.dialog.open(GoalsViewDetailDialogComponent, {
      width: '580px',
      maxWidth: '90vw',
      data: {
        goal: goal
      },
      disableClose: false
    });
  }

  openSelfAssessmentDialog(goal: Goal): void {
    // Get all goals to pass to the dialog
    const dialogRef = this.dialog.open(SelfAssessmentDialogComponent, {
      width: '900px',
      maxWidth: '90vw',
      data: {
        goals: this.goals.length > 0 ? this.goals : [goal],
        selectedGoal: goal
      },
      disableClose: false,
      panelClass: 'self-assessment-dialog'
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result?.success) {
          this.notificationService.showSuccess('Self-assessment submitted successfully');
          // Optionally reload goals to reflect any changes
          this.loadGoals();
          this.loadEmployeeGoals();
        }
      });
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Performance', 'Goals & KRAs', actionKey);
  }



}

