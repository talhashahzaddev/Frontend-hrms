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
  allManagerSelfAssessmentsData: SelfAssessment[] = []; // Store full unsliced data
  managerSelfAssessmentsDataSource = new MatTableDataSource<SelfAssessment>([]);
  isLoadingManagerSelfAssessments = false;
  managerSelfAssessmentFilterForm!: FormGroup;
  
  // Team Self Assessments (Team members' self-assessments)
  teamSelfAssessments: SelfAssessment[] = [];
  allTeamSelfAssessmentsData: SelfAssessment[] = []; // Store full unsliced data
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
  // All Manager Reviews
allManagerReviews: ManagerReviewDto[] = [];
allManagerReviewsDataSource = new MatTableDataSource<ManagerReviewDto>([]);
isLoadingAllManagerReviews = false;

  
  // Table
  displayedColumns: string[] = ['cycleName', 'employeeName', 'reviewType', 'overallRating', 'status',  'actions'];
  employeeAppraisalColumns: string[] = ['cycleName', 'reviewType', 'overallRating', 'status', 'actions'];
  selfAssessmentColumns: string[] = ['goalName', 'kraName', 'selfRating', 'status'];
  employeeSelfAssessmentColumns: string[] = ['employeeName', 'goalName', 'kraName', 'selfRating', 'actions'];
  allManagerReviewDisplayedColumns: string[] = ['cycleName','employeeName','managerName','kraName','goalName','rating','status','actions'];

  // My Appraisals Filter Form
  myAppraisalsFilterForm!: FormGroup;
  
  // Pagination - Manager Reviews
  managerReviewPageSize = 10;
  managerReviewPageIndex = 0;
  managerReviewTotalItems = 0;
  managerReviewPageSizeOptions = [5, 10, 25, 50];
  
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
  
  // Pagination - All Manager Reviews (HR Table)
  allManagerReviewPageSize = 10;
  allManagerReviewPageIndex = 0;
  allManagerReviewTotalItems = 0;
  allManagerReviewPageSizeOptions = [5, 10, 25, 50];
  
  // Pagination - Appraisal Cycles
  cyclePageSize = 10;
  cyclePageIndex = 0;
  cycleTotalItems = 0;
  cyclePageSizeOptions = [5, 10, 25, 50];
  
  // View mode
  selectedTab = 0;
  
  onTabChange(index: number): void {
    this.selectedTab = index;
    // Load manager reviews when switching to "Manager Appraisals" tab (tab 0)
    if (index === 0) {
      this.loadManagerReviews();
    }
    // Load self-assessments when switching to "Self Assessment" tab (tab 1)
    if (index === 1) {
      this.loadManagerSelfAssessments();
      this.loadEmployeeSelfAssessments();
      this.loadTeamSelfAssessments();
    }
    // Load HR reviews when switching to "HR Reviews" tab (tab 2)
    if (index === 2) {
      this.loadHrReviews();
      this.loadEmployeeHrReviews();
    }
  }

  private destroy$ = new Subject<void>();

  reviewTypes = [
    { value: 'manager', label: 'Manager Review' },
    { value: 'HR', label: 'HR Review' },
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
    this.filterForm = this.fb.group({
      cycleId: [''],
      search: ['']
    });
    this.initializeSelfAssessmentFilterForm();
    this.initializeEmployeeSelfAssessmentFilterForm();
    this.initializeManagerSelfAssessmentFilterForm();
    this.initializeTeamSelfAssessmentFilterForm();
    this.initializeMyAppraisalsFilterForm();
  }

  ngOnInit(): void {
    this.getCurrentUser();
    this.loadAppraisalCycles();
    this.initializeFilterForm();
    this.setupFilterFormSubscription();

    // Load all data — backend handles what each role can access
    this.loadEmployees();
    this.loadManagerReviews();
    this.loadReceivedReviews();
    this.loadAllManagerReviews();
    this.loadManagerSelfAssessments();
    this.loadEmployeeSelfAssessments();
    this.loadTeamSelfAssessments();
    this.loadAllKrasForManager();
    this.loadEmployeeHrReviews();
    this.loadAllKras();
    this.loadHrReviews();
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
          // Reinitialize filter form and reload data on user change
          this.initializeFilterForm();
          this.setupFilterFormSubscription();
          this.loadEmployees();
          // this.loadAppraisals();
          this.loadReceivedReviews();
          this.loadEmployeeSelfAssessments();
          // this.loadEmployeeAppraisals();
        },
        error: (err) => console.error('Error while getting current user in Appraise', err)
      });
  }

  private initializeFilterForm(): void {
    this.filterForm = this.fb.group({
      cycleId: [''],
      employeeId: [''],
      status: [''],
      search: ['']
    });
  }

  private setupFilterFormSubscription(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.pageIndex = 0;
        // this.loadAppraisals();
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

  loadManagerReviews(): void {
    this.isLoadingManagerReviews = true;
    this.managerReviewPageIndex = 0; // Reset to first page
    this.performanceService.getMyManagerReviews()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.managerReviews = response.data || [];
            this.managerReviewTotalItems = this.managerReviews.length;
            this.updateManagerReviewsDataSource();
          } else {
            this.managerReviews = [];
            this.managerReviewTotalItems = 0;
            this.managerReviewsDataSource.data = [];
          }
          this.isLoadingManagerReviews = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading manager reviews:', error);
          this.notificationService.showError('Failed to load manager reviews');
          this.managerReviews = [];
          this.managerReviewTotalItems = 0;
          this.managerReviewsDataSource.data = [];
          this.isLoadingManagerReviews = false;
          this.cdr.markForCheck();
        }
      });
  }

  private updateManagerReviewsDataSource(): void {
    const startIndex = this.managerReviewPageIndex * this.managerReviewPageSize;
    const endIndex = startIndex + this.managerReviewPageSize;
    const paginatedData = this.managerReviews.slice(startIndex, endIndex);
    this.managerReviewsDataSource.data = paginatedData;
  }

  onManagerReviewPageChange(event: PageEvent): void {
    this.managerReviewPageIndex = event.pageIndex;
    this.managerReviewPageSize = event.pageSize;
    this.updateManagerReviewsDataSource();
    console.log('Manager Review Pagination:', { pageIndex: this.managerReviewPageIndex, pageSize: this.managerReviewPageSize, totalItems: this.managerReviewTotalItems });
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

  loadAllManagerReviews(): void {
  this.isLoadingAllManagerReviews = true;
  this.allManagerReviewPageIndex = 0; // Reset to first page

  const search = {}; // later you can pass filters

  this.performanceService.getAllManagerReviews(search)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.allManagerReviews = response.data || [];
          this.allManagerReviewTotalItems = this.allManagerReviews.length;
          this.updateAllManagerReviewsDataSource();
        } else {
          this.allManagerReviews = [];
          this.allManagerReviewTotalItems = 0;
          this.allManagerReviewsDataSource.data = [];
        }

        this.isLoadingAllManagerReviews = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading all manager reviews:', error);
        this.notificationService.showError('Failed to load manager reviews');

        this.allManagerReviews = [];
        this.allManagerReviewTotalItems = 0;
        this.allManagerReviewsDataSource.data = [];
        this.isLoadingAllManagerReviews = false;
        this.cdr.markForCheck();
      }
    });
}

private updateAllManagerReviewsDataSource(): void {
  const startIndex = this.allManagerReviewPageIndex * this.allManagerReviewPageSize;
  const endIndex = startIndex + this.allManagerReviewPageSize;
  const paginatedData = this.allManagerReviews.slice(startIndex, endIndex);
  this.allManagerReviewsDataSource.data = paginatedData;
}

onAllManagerReviewPageChange(event: PageEvent): void {
  this.allManagerReviewPageIndex = event.pageIndex;
  this.allManagerReviewPageSize = event.pageSize;
  this.updateAllManagerReviewsDataSource();
}

 
  applyMyAppraisalsFilters(): void {
    // this.loadEmployeeAppraisals();
  }

  clearMyAppraisalsFilters(): void {
    this.myAppraisalsFilterForm.reset();
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
    this.loadTeamEmployeesForManager();
  }

  private loadTeamEmployeesForManager(): void {
    this.performanceService.getMyTeamEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
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
            // Fallback to all employees if team endpoint returns nothing
            this.openCreateFormWithEmployees(this.employees);
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
          this.loadManagerSelfAssessments();
          // this.loadSelfAssessments();
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

  updateUniqueFilters(assessments: SelfAssessment[]): void {
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
    this.performanceService.getKRAs(1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data && response.data.items) {
            this.uniqueKras = response.data.items.filter((kra: KRA) => kra.isActive);
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading KRAs:', error);
          this.extractKrasFromAssessments();
        }
      });
  }

  extractKrasFromAssessments(): void {
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
    // this.loadSelfAssessments();
  }

  clearSelfAssessmentFilters(): void {
    this.selfAssessmentFilterForm.reset();
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
          // this.loadAppraisals();
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
                  // this.loadAppraisals();
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
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.pageIndex = 0;
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  onSelfAssessmentPageChange(event: PageEvent): void {
    this.selfAssessmentPageIndex = event.pageIndex;
    this.selfAssessmentPageSize = event.pageSize;
  }

  onEmployeeAppraisalPageChange(event: PageEvent): void {
    this.employeeAppraisalPageIndex = event.pageIndex;
    this.employeeAppraisalPageSize = event.pageSize;
  }

  onManagerSelfAssessmentPageChange(event: PageEvent): void {
    this.managerSelfAssessmentPageIndex = event.pageIndex;
    this.managerSelfAssessmentPageSize = event.pageSize;
    // Update datasource without reloading from API
    const startIndex = this.managerSelfAssessmentPageIndex * this.managerSelfAssessmentPageSize;
    const endIndex = startIndex + this.managerSelfAssessmentPageSize;
    this.managerSelfAssessmentsDataSource.data = this.allManagerSelfAssessmentsData?.slice(startIndex, endIndex) || [];
  }

  onTeamSelfAssessmentPageChange(event: PageEvent): void {
    this.teamSelfAssessmentPageIndex = event.pageIndex;
    this.teamSelfAssessmentPageSize = event.pageSize;
    // Update datasource without reloading from API
    const startIndex = this.teamSelfAssessmentPageIndex * this.teamSelfAssessmentPageSize;
    const endIndex = startIndex + this.teamSelfAssessmentPageSize;
    this.teamSelfAssessmentsDataSource.data = this.allTeamSelfAssessmentsData?.slice(startIndex, endIndex) || [];
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

  getKraChipClass(kraName: string): string {
    if (!kraName) return 'kra-productivity';
    
    const kraLower = kraName.toLowerCase();
    
    if (kraLower.includes('productivity') || kraLower.includes('efficiency')) {
      return 'kra-productivity';
    } else if (kraLower.includes('revenue') || kraLower.includes('sales') || kraLower.includes('growth')) {
      return 'kra-revenue';
    } else if (kraLower.includes('experience') || kraLower.includes('ux') || kraLower.includes('user')) {
      return 'kra-experience';
    }
    
    return 'kra-productivity';
  }

  loadAllKrasForManager(): void {
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
    
    const filter: { cycleId?: string; employeeId?: string; kraId?: string; search?: string } = {};
    if (filterValue.cycleId) filter.cycleId = filterValue.cycleId;
    if (filterValue.employeeId) filter.employeeId = filterValue.employeeId;
    if (filterValue.kraId) filter.kraId = filterValue.kraId;
    if (filterValue.search) filter.search = filterValue.search;

    this.fetchAllEmployeeSelfAssessments(filter);
  }

  private fetchAllEmployeeSelfAssessments(filter: { cycleId?: string; employeeId?: string; kraId?: string; search?: string }): void {
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

  loadHrReviews(): void {
    this.isLoadingHrReviews = true;
    this.hrReviewPageIndex = 0; // Reset to first page on load
    this.performanceService.getHrReviews()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const allData = Array.isArray(response.data) ? response.data : [response.data];
            this.hrReviewTotalItems = allData.length;
            const startIndex = this.hrReviewPageIndex * this.hrReviewPageSize;
            const endIndex = startIndex + this.hrReviewPageSize;
            this.hrReviews = allData.slice(startIndex, endIndex);
            this.hrReviewsDataSource.data = this.hrReviews;
          } else {
            this.hrReviewTotalItems = 0;
            this.hrReviews = [];
            this.hrReviewsDataSource.data = [];
          }
          this.isLoadingHrReviews = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading HR reviews:', error);
          this.notificationService.showError('Failed to load HR reviews');
          this.hrReviewTotalItems = 0;
          this.hrReviews = [];
          this.hrReviewsDataSource.data = [];
          this.isLoadingHrReviews = false;
          this.cdr.markForCheck();
        }
      });
  }

  onHrReviewPageChange(event: PageEvent): void {
    this.hrReviewPageIndex = event.pageIndex;
    this.hrReviewPageSize = event.pageSize;
    // Update datasource without reloading from API
    const startIndex = this.hrReviewPageIndex * this.hrReviewPageSize;
    const endIndex = startIndex + this.hrReviewPageSize;
    this.hrReviewsDataSource.data = this.hrReviews.slice(startIndex, endIndex);
  }

  loadEmployeeHrReviews(): void {
    this.isLoadingEmployeeHrReviews = true;
    this.employeeHrReviewPageIndex = 0; // Reset to first page on load
    this.performanceService.getEmployeeHrReviews()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const allData = Array.isArray(response.data) ? response.data : [response.data];
            this.employeeHrReviewTotalItems = allData.length;
            const startIndex = this.employeeHrReviewPageIndex * this.employeeHrReviewPageSize;
            const endIndex = startIndex + this.employeeHrReviewPageSize;
            this.employeeHrReviews = allData.slice(startIndex, endIndex);
            this.employeeHrReviewsDataSource.data = this.employeeHrReviews;
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
    // Update datasource without reloading from API
    const startIndex = this.employeeHrReviewPageIndex * this.employeeHrReviewPageSize;
    const endIndex = startIndex + this.employeeHrReviewPageSize;
    this.employeeHrReviewsDataSource.data = this.employeeHrReviews.slice(startIndex, endIndex);
  }

  loadCycles(): void {
    this.isLoadingCycles = true;
    this.performanceService.getAppraisalCycles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.appraisalCycles = response.data;
            this.cycleTotalItems = response.data.length;
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

  getStarClass(starNumber: number, rating: number | undefined): string {
    if (!rating || rating <= 0) return 'empty';
    if (starNumber <= rating) return 'filled';
    if (starNumber - 1 < rating && rating < starNumber) return 'half';
    return 'empty';
  }
}
