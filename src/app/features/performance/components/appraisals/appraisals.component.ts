import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { CreateAppraisalDialogComponent } from './create-appraisal-dialog.component';
import { SelfAssessmentDialogComponent } from './self-assessment-dialog.component';
import { ViewAppraisalDialogComponent } from './view-appraisal-dialog.component';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService } from '@/app/core/services/auth.service';
import { PerformanceService } from '../../services/performance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  CreateAppraisal, 
  AppraisalCycle, 
  EmployeeAppraisal,
  AppraisalFilter,
  AppraisalStatus,
  ReviewType,
  SelfAssessment,
  KRA,
  AppraisalCycleStatus,
  EmployeeAppraisalForEmployee
} from '../../../../core/models/performance.models';
import { User } from '@/app/core/models/auth.models';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { Employee } from '@/app/core/models/employee.models';
import { PaginatedResponse } from '../../../../core/models/common.models';

@Component({
  selector: 'app-appraisals',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './appraisals.component.html',
  styleUrls: ['./appraisals.component.scss']
})
export class AppraisalsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  filterForm!: FormGroup;
  isSubmitting = false;
  isLoading = false;
  employees: Employee[] = [];
  appraisalCycles: AppraisalCycle[] = [];
  appraisals: EmployeeAppraisal[] = [];
  createdAppraisalKeys: Set<string> = new Set<string>();
  employeeAppraisals: EmployeeAppraisalForEmployee[] = [];
  employeeAppraisalsDataSource = new MatTableDataSource<EmployeeAppraisalForEmployee>([]);
  isLoadingEmployeeAppraisals = false;
  selfAssessments: SelfAssessment[] = [];
  selfAssessmentsDataSource = new MatTableDataSource<SelfAssessment>([]);
  isLoadingSelfAssessments = false;
  selfAssessmentFilterForm!: FormGroup;
  uniqueCycles: AppraisalCycle[] = [];
  uniqueKras: KRA[] = [];
  
  // Employee Self Assessments for Managers
  employeeSelfAssessments: SelfAssessment[] = [];
  employeeSelfAssessmentsDataSource = new MatTableDataSource<SelfAssessment>([]);
  isLoadingEmployeeSelfAssessments = false;
  employeeSelfAssessmentFilterForm!: FormGroup;
  allKras: KRA[] = [];
  
  // Manager Self Assessments (Manager's own self-assessments)
  managerSelfAssessments: SelfAssessment[] = [];
  managerSelfAssessmentsDataSource = new MatTableDataSource<SelfAssessment>([]);
  isLoadingManagerSelfAssessments = false;
  managerSelfAssessmentFilterForm!: FormGroup;
  
  // Table
  displayedColumns: string[] = ['cycleName', 'employeeName', 'reviewType', 'overallRating', 'status',  'actions'];
  employeeAppraisalColumns: string[] = ['cycleName', 'reviewType', 'overallRating', 'status', 'actions'];
  selfAssessmentColumns: string[] = ['cycleName', 'kraName', 'rating', 'status'];
  employeeSelfAssessmentColumns: string[] = ['employeeName', 'cycleName', 'kraName', 'rating', 'actions'];
  
  // My Appraisals Filter Form
  myAppraisalsFilterForm!: FormGroup;
  
  // Pagination
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;
  
  // View mode
  selectedTab = 0;
  
  onTabChange(index: number): void {
    this.selectedTab = index;
    // Load employee self-assessments when switching to that tab
    if (index === 1 && this.hasHRRole() && this.employeeSelfAssessmentsDataSource.data.length === 0) {
      this.loadEmployeeSelfAssessments();
    }
  }

  private destroy$ = new Subject<void>();

  reviewTypes = [
    { value: 'manager', label: 'Manager Review' },
    { value: 'HR', label: 'HR Review' },
    // { value: 'self', label: 'Self Review' }
  ];

  statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' }
  ];

  constructor(
    private fb: FormBuilder,
    private performanceService: PerformanceService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private employeeService: EmployeeService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    // Initialize filter form with default empty form (will be reinitialized based on role)
    this.filterForm = this.fb.group({
      cycleId: [''],
      search: ['']
    });
    // Initialize self-assessment filter form (always needed for employees)
    this.initializeSelfAssessmentFilterForm();
    // Initialize employee self-assessment filter form (for managers)
    this.initializeEmployeeSelfAssessmentFilterForm();
    // Initialize manager self-assessment filter form (for managers' own self-assessments)
    this.initializeManagerSelfAssessmentFilterForm();
    // Initialize my appraisals filter form
    this.initializeMyAppraisalsFilterForm();
    // Filter form will be reinitialized after user role is determined
  }

  ngOnInit(): void {
    this.getCurrentUser();
    this.loadAppraisalCycles();
    // If user is already available, set up filter form subscription
    if (this.currentUser && this.hasManagerRole()) {
      this.initializeFilterForm();
      this.setupFilterFormSubscription();
    }
    if (this.hasManagerRole()) {
      // For managers and HR managers, load employees and appraisals
      this.loadEmployees();
      this.loadAppraisals();
      this.loadEmployeeSelfAssessments();
      this.loadAllKrasForManager(); // Load all KRAs for manager filter dropdown
    } else {
      // For employees only
      this.loadEmployeeAppraisals();
      this.loadSelfAssessments();
      this.loadAllKras(); // Load all KRAs for filter dropdown
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getCurrentUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          // Reinitialize filter form based on role
          this.initializeFilterForm();
          // Set up form value changes subscription for managers
          if (this.hasManagerRole()) {
            this.setupFilterFormSubscription();
          }
          // Load employees and data based on role
          if (this.hasManagerRole()) {
            this.loadEmployees();
            this.loadAppraisals();
            this.loadEmployeeSelfAssessments();
          } else {
            this.loadEmployeeAppraisals();
          }
        },
        error: (err) => console.error('Error while getting current user in Appraise', err)
      });
  }


  private initializeFilterForm(): void {
    if (this.hasManagerRole()) {
      // Manager and HR role: filters with cycle, employee, status, and search
      this.filterForm = this.fb.group({
        cycleId: [''],
        employeeId: [''],
        status: [''],
        search: ['']
      });
    } else {
      // Employee role: filters with KRA instead of status
      this.filterForm = this.fb.group({
        cycleId: [''],
        kraId: [''],
        search: ['']
      });
    }
  }

  private setupFilterFormSubscription(): void {
    // Subscribe to form value changes with debounce for search field
    // This will automatically apply filters when user types or changes dropdowns
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300), // Wait 300ms after user stops typing
        distinctUntilChanged(), // Only emit if value actually changed
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Reset to first page when filters change
        this.pageIndex = 0;
        this.loadAppraisals();
      });
  }

  private initializeSelfAssessmentFilterForm(): void {
    this.selfAssessmentFilterForm = this.fb.group({
      cycleId: [''],
      kraId: [''],
      search: ['']
    });
  }

  private initializeEmployeeSelfAssessmentFilterForm(): void {
    this.employeeSelfAssessmentFilterForm = this.fb.group({
      cycleId: [''],
      employeeId: [''],
      kraId: [''],
      search: ['']
    });
  }

  private initializeManagerSelfAssessmentFilterForm(): void {
    this.managerSelfAssessmentFilterForm = this.fb.group({
      cycleId: [''],
      kraId: [''],
      search: ['']
    });
  }

  private initializeMyAppraisalsFilterForm(): void {
    this.myAppraisalsFilterForm = this.fb.group({
      cycleId: [''],
      status: [''],
      search: ['']
    });
  }

  private loadEmployees(): void {
    // For managers, load only their team employees
    // For HR Managers, load all employees
    if (this.isOnlyManager()) {
      this.performanceService.getMyTeamEmployees()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              // Convert EmployeeListItemDto to Employee format
              this.employees = response.data.map((emp: any) => ({
                employeeId: emp.employeeId ? (typeof emp.employeeId === 'string' ? emp.employeeId : emp.employeeId.toString()) : '',
                organizationId: '',
                employeeCode: emp.employeeCode || '',
                employeeNumber: emp.employeeCode || '',
                firstName: emp.firstName || '',
                lastName: emp.lastName || '',
                fullName: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
                email: emp.email || '',
                phone: emp.phone,
                hireDate: emp.hireDate ? (typeof emp.hireDate === 'string' ? emp.hireDate : new Date(emp.hireDate).toISOString().split('T')[0]) : '',
                status: emp.status || 'active',
                profilePictureUrl: emp.profilePictureUrl || '',
                createdAt: '',
                updatedAt: '',
                workLocation: '',
                basicSalary: 0
              }));
            } else {
              this.employees = [];
            }
          },
          error: () => {
            this.notificationService.showError('Failed to load team employees');
            this.employees = [];
          }
        });
    } else {
      // For HR Managers, load all employees
      this.employeeService.getEmployees()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            this.employees = res.employees || [];
          },
          error: () => {
            this.notificationService.showError('Failed to load employees');
          }
        });
    }
  }

  private loadAppraisalCycles(): void {
    this.performanceService.getAppraisalCycles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.appraisalCycles = response.data || [];
        },
        error: (err) => {
          console.error('Failed to load cycles', err);
          this.notificationService.showError('Failed to load appraisal cycles');
        }
      });
  }

  loadAppraisals(): void {
    this.isLoading = true;
    const filterValue = this.filterForm.value;
    
    // Build filter based on user role
    const filter: AppraisalFilter = {
      appraisalCycleId: filterValue.cycleId || undefined,
      employeeId: this.hasManagerRole() ? (filterValue.employeeId || undefined) : undefined,
      status: filterValue.status || undefined,
      search: filterValue.search || undefined
    };

    // For managers, use the new endpoint that filters by current manager's employee ID
    // For HR Managers, use the regular endpoint that can show all appraisals
    const apiCall = this.isOnlyManager() 
      ? this.performanceService.getMyCreatedAppraisals(filter, this.pageIndex + 1, this.pageSize)
      : this.performanceService.getEmployeeAppraisals(filter, this.pageIndex + 1, this.pageSize);

    apiCall
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const paginatedData = response.data as any;
            this.appraisals = paginatedData.items || paginatedData.data || [];
            this.totalItems = paginatedData.totalCount || paginatedData.total || 0;
            this.createdAppraisalKeys = new Set<string>();
            (this.appraisals || []).forEach(a => {
              const key = `${a.employeeId}|${a.cycleId}`;
              this.createdAppraisalKeys.add(key);
            });
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading appraisals:', error);
          this.notificationService.showError('Failed to load appraisals');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadEmployeeAppraisals(): void {
    this.isLoadingEmployeeAppraisals = true;
    const filterValue = this.myAppraisalsFilterForm.value;
    
    const filter: { cycleId?: string; kraId?: string; search?: string; status?: string } = {};
    if (filterValue.cycleId) filter.cycleId = filterValue.cycleId;
    if (filterValue.status) filter.status = filterValue.status;
    if (filterValue.search) filter.search = filterValue.search;

    this.performanceService.getMyAppraisals(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.employeeAppraisals = response.data;
            this.employeeAppraisalsDataSource.data = response.data;
          }
          this.isLoadingEmployeeAppraisals = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading employee appraisals:', error);
          this.notificationService.showError('Failed to load appraisals');
          this.isLoadingEmployeeAppraisals = false;
          this.cdr.markForCheck();
        }
      });
  }

  applyMyAppraisalsFilters(): void {
    this.loadEmployeeAppraisals();
  }

  clearMyAppraisalsFilters(): void {
    this.myAppraisalsFilterForm.reset();
    this.loadEmployeeAppraisals();
  }


  viewAppraisal(appraisal: EmployeeAppraisal): void {
    console.log('Opening view dialog for appraisal:', appraisal);
    const dialogRef = this.dialog.open(ViewAppraisalDialogComponent, {
      width: '900px',
      maxWidth: '90vw',
      data: {
        appraisal: appraisal
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  viewMyAppraisal(appraisal: EmployeeAppraisalForEmployee): void {
    // Convert EmployeeAppraisalForEmployee to EmployeeAppraisal format for the view dialog
    const fullName = this.currentUser 
      ? `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim()
      : '';
    
    const appraisalForView: EmployeeAppraisal = {
      appraisalId: appraisal.appraisalId,
      cycleId: appraisal.cycleId,
      cycleName: appraisal.cycleName,
      employeeId: this.currentUser?.userId || '',
      employeeName: fullName,
      reviewerId: '',
      reviewerName: appraisal.reviewerName || '',
      reviewType: appraisal.reviewType,
      overallRating: appraisal.overallRating,
      kraRatings: appraisal.kraRatings,
      skillRatings: appraisal.skillRatings,
      goalsAchieved: {},
      feedback: appraisal.feedback,
      improvementAreas: appraisal.improvementAreas,
      developmentPlan: appraisal.developmentPlan,
      status: appraisal.status,
      submittedAt: appraisal.submittedAt,
      reviewedAt: appraisal.reviewedAt,
      createdAt: '',
      updatedAt: ''
    };

    this.viewAppraisal(appraisalForView);
  }

  openCreateForm(): void {
    // If user is only Manager (not HR Manager), load team employees
    if (this.isOnlyManager()) {
      this.loadTeamEmployeesForManager();
    } else {
      // For HR Manager/Super Admin, use all employees
      this.openCreateFormWithEmployees(this.employees);
    }
  }

  private loadTeamEmployeesForManager(): void {
    this.performanceService.getMyTeamEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Convert EmployeeListItemDto to Employee format for the dialog
            const teamEmployees: Employee[] = response.data.map((emp: any) => ({
              employeeId: emp.employeeId ? (typeof emp.employeeId === 'string' ? emp.employeeId : emp.employeeId.toString()) : '',
              organizationId: '',
              employeeCode: emp.employeeCode || '',
              employeeNumber: emp.employeeCode || '',
              firstName: emp.firstName || '',
              lastName: emp.lastName || '',
              fullName: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
              email: emp.email || '',
              phone: emp.phone,
              hireDate: emp.hireDate ? (typeof emp.hireDate === 'string' ? emp.hireDate : new Date(emp.hireDate).toISOString().split('T')[0]) : '',
              status: emp.status || 'active',
              profilePictureUrl: emp.profilePictureUrl || '',
              createdAt: '',
              updatedAt: '',
              workLocation: '',
              basicSalary: 0
            }));
            this.openCreateFormWithEmployees(teamEmployees);
          } else {
            this.notificationService.showError('Failed to load team employees');
          }
        },
        error: (error) => {
          console.error('Error loading team employees:', error);
          this.notificationService.showError('Failed to load team employees');
        }
      });
  }

  private openCreateFormWithEmployees(employeesList: Employee[]): void {
    const dialogRef = this.dialog.open(CreateAppraisalDialogComponent, {
      width: '900px',
      maxWidth: '90vw',
      data: {
        appraisalCycles: this.appraisalCycles,
        employees: employeesList,
        reviewTypes: this.reviewTypes
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.createAppraisal(result);
        }
      });
  }

  openSelfAssessmentDialog(): void {
    const dialogRef = this.dialog.open(SelfAssessmentDialogComponent, {
      width: '900px',
      maxWidth: '90vw',
      data: {
        appraisalCycles: this.appraisalCycles
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result && result.success) {
          // Reload self-assessments to show the new one
          if (this.hasHRRole()) {
            this.loadManagerSelfAssessments();
          } else {
            this.loadSelfAssessments();
          }
        }
      });
  }

  loadSelfAssessments(): void {
    this.isLoadingSelfAssessments = true;
    const filterValue = this.selfAssessmentFilterForm.value;
    
    const filter: { cycleId?: string; kraId?: string; search?: string } = {};
    if (filterValue.cycleId) filter.cycleId = filterValue.cycleId;
    if (filterValue.kraId) filter.kraId = filterValue.kraId;
    if (filterValue.search) filter.search = filterValue.search;

    this.performanceService.getMySelfAssessments(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.selfAssessments = response.data;
            this.selfAssessmentsDataSource.data = response.data;
            this.updateUniqueFilters(response.data);
          }
          this.isLoadingSelfAssessments = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading self-assessments:', error);
          this.notificationService.showError('Failed to load self-assessments');
          this.isLoadingSelfAssessments = false;
          this.cdr.markForCheck();
        }
      });
  }

  updateUniqueFilters(assessments: SelfAssessment[]): void {
    // Extract unique cycles
    const cycleMap = new Map<string, AppraisalCycle>();
    assessments.forEach(assessment => {
      if (assessment.cycleId && assessment.cycleName && !cycleMap.has(assessment.cycleId)) {
        cycleMap.set(assessment.cycleId, {
          cycleId: assessment.cycleId,
          cycleName: assessment.cycleName,
          startDate: '',
          endDate: '',
          status: AppraisalCycleStatus.ACTIVE,
          description: '',
          ratingScale: { type: 'numeric', scale: [1, 2, 3, 4, 5] },
          selfReviewEnabled: true,
          managerReviewEnabled: true,
          peerReviewEnabled: false,
          createdAt: ''
        });
      }
    });
    this.uniqueCycles = Array.from(cycleMap.values());
  }

  loadAllKras(): void {
    // Load all active KRAs for the filter dropdown
    this.performanceService.getKRAs(1, 1000) // Load a large number to get all KRAs
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data && response.data.items) {
            // Filter only active KRAs
            this.uniqueKras = response.data.items.filter((kra: KRA) => kra.isActive);
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading KRAs:', error);
          // If loading fails, extract from assessments
          this.extractKrasFromAssessments();
        }
      });
  }

  extractKrasFromAssessments(): void {
    // Fallback: Extract KRAs from assessments if API call fails
    const kraMap = new Map<string, KRA>();
    this.selfAssessments.forEach(assessment => {
      if (assessment.kraId && assessment.kraName && !kraMap.has(assessment.kraId)) {
        kraMap.set(assessment.kraId, {
          kraId: assessment.kraId,
          title: assessment.kraName,
          description: '',
          weight: 0,
          measurementCriteria: '',
          isActive: true,
          createdAt: ''
        });
      }
    });
    this.uniqueKras = Array.from(kraMap.values());
  }

  applySelfAssessmentFilters(): void {
    this.loadSelfAssessments();
  }

  clearSelfAssessmentFilters(): void {
    this.selfAssessmentFilterForm.reset();
    this.loadSelfAssessments();
  }

  private createAppraisal(request: CreateAppraisal): void {
    if (!this.currentUser) {
      this.notificationService.showError('Current user not found.');
      return;
    }

    this.isSubmitting = true;
    this.performanceService.createAppraisal(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Appraisal created successfully');
          this.loadAppraisals();
          this.isSubmitting = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error creating appraisal:', error);
          this.notificationService.showError('Failed to create appraisal');
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }
      });
  }


  deleteAppraisal(appraisal: EmployeeAppraisal): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Appraisal',
      message: 'Are you sure you want to delete this appraisal?',
      itemName: `Appraisal for ${appraisal.employeeName} - ${appraisal.cycleName}`
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result === true) {
          this.performanceService.deleteAppraisal(appraisal.appraisalId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                if (response.success) {
                  this.notificationService.showSuccess('Appraisal deleted successfully');
                  this.loadAppraisals();
                } else {
                  this.notificationService.showError(response.message || 'Failed to delete appraisal');
                }
              },
              error: (error) => {
                console.error('Error deleting appraisal:', error);
                this.notificationService.showError('Failed to delete appraisal');
              }
            });
        }
      });
  }

  applyFilters(): void {
    this.pageIndex = 0;
    if (this.hasManagerRole()) {
      this.loadAppraisals();
    } else {
      this.loadEmployeeAppraisals();
    }
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.pageIndex = 0;
    if (this.hasManagerRole()) {
      this.loadAppraisals();
    } else {
      this.loadEmployeeAppraisals();
    }
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadAppraisals();
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (status?.toLowerCase()) {
      case 'completed': return 'primary';
      case 'submitted': return 'accent';
      case 'under_review': return 'accent';
      case 'draft': return undefined;
      case 'rejected': return 'warn';
      default: return undefined;
    }
  }

  getStatusChipClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'status-completed';
      case 'submitted':
        return 'status-submitted';
      case 'under_review':
        return 'status-under-review';
      case 'draft':
        return 'status-draft';
      case 'rejected':
        return 'status-rejected';
      default:
        return 'status-draft';
    }
  }


  hasHRRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

  hasManagerRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager', 'Manager']);
  }

  isOnlyManager(): boolean {
    // Returns true if user is Manager but NOT HR Manager or Super Admin
    const userRole = this.currentUser?.roleName || '';
    return userRole === 'Manager';
  }

  loadAllKrasForManager(): void {
    // Load all active KRAs for the manager filter dropdown
    this.performanceService.getKRAs(1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const paginatedData = response.data as any;
            this.allKras = (paginatedData.items || paginatedData.data || []).filter((kra: KRA) => kra.isActive);
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading KRAs for manager:', error);
        }
      });
  }

  loadEmployeeSelfAssessments(): void {
    this.isLoadingEmployeeSelfAssessments = true;
    const filterValue = this.employeeSelfAssessmentFilterForm.value;
    
    // Build filter object
    const filter: { cycleId?: string; employeeId?: string; kraId?: string; search?: string } = {};
    if (filterValue.cycleId) filter.cycleId = filterValue.cycleId;
    if (filterValue.employeeId) filter.employeeId = filterValue.employeeId;
    if (filterValue.kraId) filter.kraId = filterValue.kraId;
    if (filterValue.search) filter.search = filterValue.search;

    // For now, we'll need to fetch all self-assessments and filter them
    // This might need a new API endpoint that gets all employee self-assessments for managers
    // For now, let's use a workaround by fetching from all employees
    this.fetchAllEmployeeSelfAssessments(filter);
  }

  private fetchAllEmployeeSelfAssessments(filter: { cycleId?: string; employeeId?: string; kraId?: string; search?: string }): void {
    // For HR Managers, use getAllEmployeeSelfAssessments
    // For Managers, use getMyTeamSelfAssessments (only their team)
    const apiCall = this.hasHRRole() 
      ? this.performanceService.getAllEmployeeSelfAssessments(filter)
      : this.performanceService.getMyTeamSelfAssessments(filter);
    
    apiCall
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.employeeSelfAssessments = response.data;
            this.employeeSelfAssessmentsDataSource.data = response.data;
          } else {
            this.employeeSelfAssessments = [];
            this.employeeSelfAssessmentsDataSource.data = [];
          }
          this.isLoadingEmployeeSelfAssessments = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading employee self-assessments:', error);
          this.notificationService.showError('Failed to load employee self-assessments');
          this.employeeSelfAssessments = [];
          this.employeeSelfAssessmentsDataSource.data = [];
          this.isLoadingEmployeeSelfAssessments = false;
          this.cdr.markForCheck();
        }
      });
  }

  applyEmployeeSelfAssessmentFilters(): void {
    this.loadEmployeeSelfAssessments();
  }

  clearEmployeeSelfAssessmentFilters(): void {
    this.employeeSelfAssessmentFilterForm.reset();
    this.loadEmployeeSelfAssessments();
  }

  openCreateAppraisalForEmployee(assessment: SelfAssessment): void {
    const dialogRef = this.dialog.open(CreateAppraisalDialogComponent, {
      width: '900px',
      maxWidth: '90vw',
      data: {
        appraisalCycles: this.appraisalCycles,
        employees: this.employees,
        reviewTypes: this.reviewTypes,
        preSelectedEmployeeId: assessment.employeeId,
        preSelectedCycleId: assessment.cycleId
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.createAppraisal(result);
        }
      });
  }

  hasAppraisalFor(employeeId: string, cycleId: string): boolean {
    const key = `${employeeId}|${cycleId}`;
    return this.createdAppraisalKeys.has(key);
  }

  loadManagerSelfAssessments(): void {
    this.isLoadingManagerSelfAssessments = true;
    const filterValue = this.managerSelfAssessmentFilterForm.value;
    
    const filter: { cycleId?: string; kraId?: string; search?: string } = {};
    if (filterValue.cycleId) filter.cycleId = filterValue.cycleId;
    if (filterValue.kraId) filter.kraId = filterValue.kraId;
    if (filterValue.search) filter.search = filterValue.search;

    this.performanceService.getMySelfAssessments(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.managerSelfAssessments = response.data;
            this.managerSelfAssessmentsDataSource.data = response.data;
          }
          this.isLoadingManagerSelfAssessments = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading manager self-assessments:', error);
          this.notificationService.showError('Failed to load self-assessments');
          this.isLoadingManagerSelfAssessments = false;
          this.cdr.markForCheck();
        }
      });
  }

  applyManagerSelfAssessmentFilters(): void {
    this.loadManagerSelfAssessments();
  }

  clearManagerSelfAssessmentFilters(): void {
    this.managerSelfAssessmentFilterForm.reset();
    this.loadManagerSelfAssessments();
  }

  // Helper methods to check if filters are applied
  hasFiltersApplied(): boolean {
    if (!this.filterForm) return false;
    const values = this.filterForm.value;
    return !!(values.cycleId || values.employeeId || values.status || values.kraId || values.search?.trim());
  }

  hasSelfAssessmentFiltersApplied(): boolean {
    if (!this.selfAssessmentFilterForm) return false;
    const values = this.selfAssessmentFilterForm.value;
    return !!(values.cycleId || values.kraId || values.search?.trim());
  }

  hasEmployeeSelfAssessmentFiltersApplied(): boolean {
    if (!this.employeeSelfAssessmentFilterForm) return false;
    const values = this.employeeSelfAssessmentFilterForm.value;
    return !!(values.cycleId || values.employeeId || values.kraId || values.search?.trim());
  }

  hasMyAppraisalsFiltersApplied(): boolean {
    if (!this.myAppraisalsFilterForm) return false;
    const values = this.myAppraisalsFilterForm.value;
    return !!(values.cycleId || values.status || values.search?.trim());
  }

}

