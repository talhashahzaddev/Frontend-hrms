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
import { ManagerReviewDialogueComponent } from './manager-review-dialogue.component';
import { HrReviewDialogComponent } from './hr-review-dialog.component';
import { AppraisalCycleFormComponent } from '../appraisal-cycle-form/appraisal-cycle-form.component';
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
  EmployeeAppraisalForEmployee,
  UpdateAppraisalCycleRequest,
  ManagerReviewDto,
  HrReviewDto
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
  
  // Manager Reviews
  managerReviews: ManagerReviewDto[] = [];
  isLoadingManagerReviews = false;
  managerReviewsDataSource = new MatTableDataSource<ManagerReviewDto>([]);
  managerReviewDisplayedColumns: string[] = ['cycleName', 'employeeName', 'kraName', 'goalName', 'rating', 'actions'];
  
  // Reviews Received by Employee from Managers
  receivedReviews: ManagerReviewDto[] = [];
  isLoadingReceivedReviews = false;
  receivedReviewsDataSource = new MatTableDataSource<ManagerReviewDto>([]);
  receivedReviewDisplayedColumns: string[] = ['cycleName', 'employeeName', 'kraName', 'goalName', 'rating', 'actions'];
  
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
  
  // Team Self Assessments (Team members' self-assessments)
  teamSelfAssessments: SelfAssessment[] = [];
  teamSelfAssessmentsDataSource = new MatTableDataSource<SelfAssessment>([]);
  isLoadingTeamSelfAssessments = false;
  teamSelfAssessmentFilterForm!: FormGroup;
  
  // HR Reviews
  hrReviews: HrReviewDto[] = [];
  hrReviewsDataSource = new MatTableDataSource<HrReviewDto>([]);
  isLoadingHrReviews = false;
  hrReviewDisplayedColumns: string[] = ['cycleName', 'employeeName', 'finalRating', 'status', 'actions'];
  
  // Employee's Own HR Reviews (Reviews given to the employee by HR)
  employeeHrReviews: HrReviewDto[] = [];
  employeeHrReviewsDataSource = new MatTableDataSource<HrReviewDto>([]);
  isLoadingEmployeeHrReviews = false;
  employeeHrReviewDisplayedColumns: string[] = ['cycleName', 'finalRating', 'hrName', 'status', 'actions'];
  
  // Appraisal Cycles Management
  cyclesDataSource = new MatTableDataSource<AppraisalCycle>([]);
  isLoadingCycles = false;
  cycleDisplayedColumns: string[] = ['cycleName', 'dates', 'status', 'actions'];
  
  // Table
  displayedColumns: string[] = ['cycleName', 'employeeName', 'reviewType', 'overallRating', 'status',  'actions'];
  employeeAppraisalColumns: string[] = ['cycleName', 'reviewType', 'overallRating', 'status', 'actions'];
  selfAssessmentColumns: string[] = ['goalName', 'kraName', 'selfRating', 'status'];
  employeeSelfAssessmentColumns: string[] = ['employeeName', 'goalName', 'kraName', 'selfRating', 'actions'];
  
  // My Appraisals Filter Form
  myAppraisalsFilterForm!: FormGroup;
  
  // Pagination - Manager Appraisals Tab
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;
  pageSizeOptions = [5, 10, 25, 50];

  // Pagination - Self Assessments (Employee)
  selfAssessmentPageSize = 10;
  selfAssessmentPageIndex = 0;
  selfAssessmentTotalItems = 0;
  selfAssessmentPageSizeOptions = [5, 10, 25, 50];

  // Pagination - Employee Appraisals (Employee)
  employeeAppraisalPageSize = 10;
  employeeAppraisalPageIndex = 0;
  employeeAppraisalTotalItems = 0;
  employeeAppraisalPageSizeOptions = [5, 10, 25, 50];

  // Pagination - Manager Self Assessments
  managerSelfAssessmentPageSize = 10;
  managerSelfAssessmentPageIndex = 0;
  managerSelfAssessmentTotalItems = 0;
  managerSelfAssessmentPageSizeOptions = [5, 10, 25, 50];

  // Pagination - Team Self Assessments
  teamSelfAssessmentPageSize = 10;
  teamSelfAssessmentPageIndex = 0;
  teamSelfAssessmentTotalItems = 0;
  teamSelfAssessmentPageSizeOptions = [5, 10, 25, 50];

  // Pagination - Employee Self Assessments
  employeeSelfAssessmentPageSize = 10;
  employeeSelfAssessmentPageIndex = 0;
  employeeSelfAssessmentTotalItems = 0;
  employeeSelfAssessmentPageSizeOptions = [5, 10, 25, 50];
  
  // Pagination - HR Reviews
  hrReviewPageSize = 10;
  hrReviewPageIndex = 0;
  hrReviewTotalItems = 0;
  hrReviewPageSizeOptions = [5, 10, 25, 50];
  
  // Pagination - Employee's Own HR Reviews
  employeeHrReviewPageSize = 10;
  employeeHrReviewPageIndex = 0;
  employeeHrReviewTotalItems = 0;
  employeeHrReviewPageSizeOptions = [5, 10, 25, 50];
  
  // Pagination - Appraisal Cycles
  cyclePageSize = 10;
  cyclePageIndex = 0;
  cycleTotalItems = 0;
  cyclePageSizeOptions = [5, 10, 25, 50];
  
  // View mode
  selectedTab = 0;
  
  onTabChange(index: number): void {
    this.selectedTab = index;
    // Load manager reviews when switching to "Manager Reviews" tab (tab 0)
    if (index === 0) {
      this.loadManagerReviews();
    }
    // Load manager's own, employee, and team self-assessments when switching to "My Self Assessments" tab (tab 1)
    if (index === 1) {
      this.loadManagerSelfAssessments();
      this.loadEmployeeSelfAssessments();
      this.loadTeamSelfAssessments();
    }
    // Load HR reviews when switching to "HR Reviews" tab (tab 2)
    if (index === 2) {
      if (this.hasHRRole()) {
        this.loadHrReviews(); // Load all HR reviews for HR users
      } else {
        this.loadEmployeeHrReviews(); // Load employee's own HR reviews for regular employees
      }
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
    // Initialize team self-assessment filter form (for team members' self-assessments)
    this.initializeTeamSelfAssessmentFilterForm();
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
      // For managers and HR managers, load employees, manager reviews and appraisals
      this.loadEmployees();
      this.loadManagerReviews();
      this.loadReceivedReviews(); // Load reviews received from managers
      this.loadAppraisals();
      this.loadManagerSelfAssessments();
      this.loadEmployeeSelfAssessments();
      this.loadTeamSelfAssessments();
      this.loadAllKrasForManager(); // Load all KRAs for manager filter dropdown
    } else {
      // For employees only
      this.loadEmployeeAppraisals();
      this.loadSelfAssessments();
      this.loadReceivedReviews(); // Load reviews received by employee from their managers
      this.loadEmployeeHrReviews(); // Load HR reviews given to employee by HR
      this.loadAllKras(); // Load all KRAs for filter dropdown
    }
    // Load HR reviews for HR users
    if (this.hasHRRole()) {
      this.loadHrReviews();
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
            this.loadReceivedReviews(); // Load reviews received from managers
            this.loadEmployeeSelfAssessments();
          } else {
            this.loadEmployeeAppraisals();
            this.loadReceivedReviews(); // Load reviews received by employee from their managers
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

  private initializeTeamSelfAssessmentFilterForm(): void {
    this.teamSelfAssessmentFilterForm = this.fb.group({
      cycleId: [''],
      employeeId: [''],
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
    // Load all employees
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
    
    // Build filter
    const filter: AppraisalFilter = {
      appraisalCycleId: filterValue.cycleId || undefined,
      employeeId: filterValue.employeeId || undefined,
      status: filterValue.status || undefined,
      search: filterValue.search || undefined
    };

    // Call the general endpoint for all appraisals
    const apiCall = this.performanceService.getEmployeeAppraisals(filter, this.pageIndex + 1, this.pageSize);

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

  loadManagerReviews(): void {
    this.isLoadingManagerReviews = true;
    this.performanceService.getMyManagerReviews()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.managerReviews = response.data || [];
            this.managerReviewsDataSource.data = this.managerReviews;
          } else {
            this.managerReviews = [];
            this.managerReviewsDataSource.data = [];
          }
          this.isLoadingManagerReviews = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading manager reviews:', error);
          this.notificationService.showError('Failed to load manager reviews');
          this.managerReviews = [];
          this.managerReviewsDataSource.data = [];
          this.isLoadingManagerReviews = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadReceivedReviews(): void {
    this.isLoadingReceivedReviews = true;
    this.performanceService.getEmployeeReceivedReviews()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.receivedReviews = response.data || [];
            this.receivedReviewsDataSource.data = this.receivedReviews;
          } else {
            this.receivedReviews = [];
            this.receivedReviewsDataSource.data = [];
          }
          this.isLoadingReceivedReviews = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading received reviews:', error);
          this.notificationService.showError('Failed to load received reviews');
          this.receivedReviews = [];
          this.receivedReviewsDataSource.data = [];
          this.isLoadingReceivedReviews = false;
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
            const allData = Array.isArray(response.data) ? response.data : [response.data];
            this.employeeAppraisalTotalItems = allData.length;
            const startIndex = this.employeeAppraisalPageIndex * this.employeeAppraisalPageSize;
            const endIndex = startIndex + this.employeeAppraisalPageSize;
            this.employeeAppraisals = allData.slice(startIndex, endIndex);
            this.employeeAppraisalsDataSource.data = this.employeeAppraisals;
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

  openManagerReviewDialog(assessment: SelfAssessment): void {
    const dialogRef = this.dialog.open(ManagerReviewDialogueComponent, {
      width: '450px',
      maxWidth: '90vw',
      data: {
        employeeId: assessment.employeeId || '',
        employeeName: assessment.employeeName || '',
        cycleId: assessment.cycleId || '',
        cycleName: assessment.cycleName || '',
        kraId: assessment.kraId || '',
        kraName: assessment.kraName || '',
        goalId: assessment.goalId || '',
        goalName: assessment.goalName || ''
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          // Reload team self-assessments after successful review submission
          this.loadTeamSelfAssessments();
        }
      });
  }

  openHrReviewDialog(): void {
    const dialogRef = this.dialog.open(HrReviewDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: {
        appraisalCycles: this.appraisalCycles
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result?.success) {
          this.notificationService.showSuccess('HR Review submitted successfully');
          this.loadHrReviews();
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
            const allData = Array.isArray(response.data) ? response.data : [response.data];
            this.selfAssessmentTotalItems = allData.length;
            const startIndex = this.selfAssessmentPageIndex * this.selfAssessmentPageSize;
            const endIndex = startIndex + this.selfAssessmentPageSize;
            this.selfAssessments = allData.slice(startIndex, endIndex);
            this.selfAssessmentsDataSource.data = this.selfAssessments;
            this.updateUniqueFilters(allData);
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
          appraisalEnabled: true,
          organizationId: '',
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
          organizationId: '',
          cycleId: assessment.cycleId || '',
          cycleName: assessment.cycleName || '',
          title: assessment.kraName,
          kraDescription: '',
          kraRate: '',
          isActive: true,
          createdAt: '',
          createdByName: ''
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

  onSelfAssessmentPageChange(event: PageEvent): void {
    this.selfAssessmentPageIndex = event.pageIndex;
    this.selfAssessmentPageSize = event.pageSize;
    this.loadSelfAssessments();
  }

  onEmployeeAppraisalPageChange(event: PageEvent): void {
    this.employeeAppraisalPageIndex = event.pageIndex;
    this.employeeAppraisalPageSize = event.pageSize;
    this.loadEmployeeAppraisals();
  }

  onManagerSelfAssessmentPageChange(event: PageEvent): void {
    this.managerSelfAssessmentPageIndex = event.pageIndex;
    this.managerSelfAssessmentPageSize = event.pageSize;
    this.loadManagerSelfAssessments();
  }

  onTeamSelfAssessmentPageChange(event: PageEvent): void {
    this.teamSelfAssessmentPageIndex = event.pageIndex;
    this.teamSelfAssessmentPageSize = event.pageSize;
    this.loadTeamSelfAssessments();
  }

  onEmployeeSelfAssessmentPageChange(event: PageEvent): void {
    this.employeeSelfAssessmentPageIndex = event.pageIndex;
    this.employeeSelfAssessmentPageSize = event.pageSize;
    this.loadEmployeeSelfAssessments();
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

  // NEW: Helper method to get KRA chip class based on KRA name
  getKraChipClass(kraName: string): string {
    if (!kraName) return 'kra-productivity';
    
    const kraLower = kraName.toLowerCase();
    
    // Map common KRA types to chip classes
    if (kraLower.includes('productivity') || kraLower.includes('efficiency')) {
      return 'kra-productivity';
    } else if (kraLower.includes('revenue') || kraLower.includes('sales') || kraLower.includes('growth')) {
      return 'kra-revenue';
    } else if (kraLower.includes('experience') || kraLower.includes('ux') || kraLower.includes('user')) {
      return 'kra-experience';
    }
    
    // Default to productivity style
    return 'kra-productivity';
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
    // Call the general endpoint for all employee self-assessments
    const apiCall = this.performanceService.getAllEmployeeSelfAssessments(filter);
    
    apiCall
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const allData = Array.isArray(response.data) ? response.data : [response.data];
            this.employeeSelfAssessmentTotalItems = allData.length;
            const startIndex = this.employeeSelfAssessmentPageIndex * this.employeeSelfAssessmentPageSize;
            const endIndex = startIndex + this.employeeSelfAssessmentPageSize;
            this.employeeSelfAssessments = allData.slice(startIndex, endIndex);
            this.employeeSelfAssessmentsDataSource.data = this.employeeSelfAssessments;
          } else {
            this.employeeSelfAssessments = [];
            this.employeeSelfAssessmentsDataSource.data = [];
            this.employeeSelfAssessmentTotalItems = 0;
          }
          this.isLoadingEmployeeSelfAssessments = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading employee self-assessments:', error);
          this.notificationService.showError('Failed to load employee self-assessments');
          this.employeeSelfAssessments = [];
          this.employeeSelfAssessmentsDataSource.data = [];
          this.employeeSelfAssessmentTotalItems = 0;
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

    this.performanceService.getAllEmployeeSelfAssessments(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const allData = Array.isArray(response.data) ? response.data : [response.data];
            this.managerSelfAssessmentTotalItems = allData.length;
            const startIndex = this.managerSelfAssessmentPageIndex * this.managerSelfAssessmentPageSize;
            const endIndex = startIndex + this.managerSelfAssessmentPageSize;
            this.managerSelfAssessments = allData.slice(startIndex, endIndex);
            this.managerSelfAssessmentsDataSource.data = this.managerSelfAssessments;
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

  loadTeamSelfAssessments(): void {
    this.isLoadingTeamSelfAssessments = true;
    const filterValue = this.teamSelfAssessmentFilterForm.value;
    
    const filter: { cycleId?: string; employeeId?: string; kraId?: string; search?: string } = {};
    if (filterValue.cycleId) filter.cycleId = filterValue.cycleId;
    if (filterValue.employeeId) filter.employeeId = filterValue.employeeId;
    if (filterValue.kraId) filter.kraId = filterValue.kraId;
    if (filterValue.search) filter.search = filterValue.search;

    this.performanceService.getMyTeamSelfAssessments(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const allData = Array.isArray(response.data) ? response.data : [response.data];
            this.teamSelfAssessmentTotalItems = allData.length;
            const startIndex = this.teamSelfAssessmentPageIndex * this.teamSelfAssessmentPageSize;
            const endIndex = startIndex + this.teamSelfAssessmentPageSize;
            this.teamSelfAssessments = allData.slice(startIndex, endIndex);
            this.teamSelfAssessmentsDataSource.data = this.teamSelfAssessments;
          }
          this.isLoadingTeamSelfAssessments = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading team self-assessments:', error);
          this.notificationService.showError('Failed to load team self-assessments');
          this.isLoadingTeamSelfAssessments = false;
          this.cdr.markForCheck();
        }
      });
  }

  applyTeamSelfAssessmentFilters(): void {
    this.loadTeamSelfAssessments();
  }

  clearTeamSelfAssessmentFilters(): void {
    this.teamSelfAssessmentFilterForm.reset();
    this.loadTeamSelfAssessments();
  }

  // HR Reviews Management Methods
  loadHrReviews(): void {
    this.isLoadingHrReviews = true;
    this.performanceService.getHrReviews()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.hrReviews = response.data;
            this.hrReviewsDataSource.data = this.hrReviews;
            this.hrReviewTotalItems = this.hrReviews.length;
          }
          this.isLoadingHrReviews = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading HR reviews:', error);
          this.notificationService.showError('Failed to load HR reviews');
          this.isLoadingHrReviews = false;
          this.cdr.markForCheck();
        }
      });
  }

  onHrReviewPageChange(event: PageEvent): void {
    this.hrReviewPageIndex = event.pageIndex;
    this.hrReviewPageSize = event.pageSize;
    this.loadHrReviews();
  }

  // Load employee's own HR reviews (reviews given to the employee by HR)
  loadEmployeeHrReviews(): void {
    this.isLoadingEmployeeHrReviews = true;
    this.performanceService.getEmployeeHrReviews()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.employeeHrReviews = response.data;
            this.employeeHrReviewsDataSource.data = this.employeeHrReviews;
            this.employeeHrReviewTotalItems = this.employeeHrReviews.length;
          } else {
            this.employeeHrReviews = [];
            this.employeeHrReviewsDataSource.data = [];
            this.employeeHrReviewTotalItems = 0;
          }
          this.isLoadingEmployeeHrReviews = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading employee HR reviews:', error);
          this.notificationService.showError('Failed to load HR reviews');
          this.employeeHrReviews = [];
          this.employeeHrReviewsDataSource.data = [];
          this.employeeHrReviewTotalItems = 0;
          this.isLoadingEmployeeHrReviews = false;
          this.cdr.markForCheck();
        }
      });
  }

  onEmployeeHrReviewPageChange(event: PageEvent): void {
    this.employeeHrReviewPageIndex = event.pageIndex;
    this.employeeHrReviewPageSize = event.pageSize;
    this.loadEmployeeHrReviews();
  }

  // Appraisal Cycles Management Methods
  loadCycles(): void {
    this.isLoadingCycles = true;
    this.performanceService.getAppraisalCycles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.appraisalCycles = response.data;
            this.cycleTotalItems = response.data.length;
            // Apply pagination
            const startIndex = this.cyclePageIndex * this.cyclePageSize;
            const endIndex = startIndex + this.cyclePageSize;
            this.cyclesDataSource.data = this.appraisalCycles.slice(startIndex, endIndex);
          }
          this.isLoadingCycles = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading cycles:', error);
          this.notificationService.showError('Failed to load appraisal cycles');
          this.isLoadingCycles = false;
          this.cdr.markForCheck();
        }
      });
  }

  openEditCycleDialog(cycle: AppraisalCycle): void {
    const dialogRef = this.dialog.open(AppraisalCycleFormComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: {
        cycle: cycle
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result === 'saved') {
          this.loadCycles();
        }
      });
  }

  deleteCycle(cycle: AppraisalCycle): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Appraisal Cycle',
      message: 'Are you sure you want to delete this appraisal cycle?',
      itemName: cycle.cycleName
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
          this.isLoadingCycles = true;
          this.performanceService.deleteAppraisalCycle(cycle.cycleId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                if (response.success) {
                  this.notificationService.showSuccess('Appraisal cycle deleted successfully');
                  this.loadCycles();
                } else {
                  this.notificationService.showError(response.message || 'Failed to delete cycle');
                }
                this.isLoadingCycles = false;
                this.cdr.markForCheck();
              },
              error: (error) => {
                console.error('Error deleting cycle:', error);
                this.notificationService.showError('Failed to delete appraisal cycle');
                this.isLoadingCycles = false;
                this.cdr.markForCheck();
              }
            });
        }
      });
  }

  onCyclePageChange(event: PageEvent): void {
    this.cyclePageIndex = event.pageIndex;
    this.cyclePageSize = event.pageSize;
    const startIndex = this.cyclePageIndex * this.cyclePageSize;
    const endIndex = startIndex + this.cyclePageSize;
    this.cyclesDataSource.data = this.appraisalCycles.slice(startIndex, endIndex);
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

  hasManagerSelfAssessmentFiltersApplied(): boolean {
    if (!this.managerSelfAssessmentFilterForm) return false;
    const values = this.managerSelfAssessmentFilterForm.value;
    return !!(values.cycleId || values.kraId || values.search?.trim());
  }

  hasTeamSelfAssessmentFiltersApplied(): boolean {
    if (!this.teamSelfAssessmentFilterForm) return false;
    const values = this.teamSelfAssessmentFilterForm.value;
    return !!(values.cycleId || values.employeeId || values.kraId || values.search?.trim());
  }

  // Helper method to determine star state for ratings with half stars (e.g., 3.5, 4.5)
  getStarClass(starNumber: number, rating: number | undefined): string {
    if (!rating || rating <= 0) return 'empty';
    
    // Filled star: star number is less than or equal to rating
    if (starNumber <= rating) return 'filled';
    
    // Half filled star: current star - 1 < rating < current star
    // This means the rating is between the previous star and current star
    if (starNumber - 1 < rating && rating < starNumber) return 'half';
    
    // Empty star: star number is greater than rating
    return 'empty';
  }

}