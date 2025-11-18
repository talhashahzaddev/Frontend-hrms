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
import { Subject, takeUntil } from 'rxjs';
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
  employeeAppraisals: EmployeeAppraisalForEmployee[] = [];
  employeeAppraisalsDataSource = new MatTableDataSource<EmployeeAppraisalForEmployee>([]);
  isLoadingEmployeeAppraisals = false;
  selfAssessments: SelfAssessment[] = [];
  selfAssessmentsDataSource = new MatTableDataSource<SelfAssessment>([]);
  isLoadingSelfAssessments = false;
  selfAssessmentFilterForm!: FormGroup;
  uniqueCycles: AppraisalCycle[] = [];
  uniqueKras: KRA[] = [];
  
  // Table
  displayedColumns: string[] = ['cycleName', 'employeeName', 'reviewType', 'overallRating', 'status', 'submittedAt', 'actions'];
  employeeAppraisalColumns: string[] = ['cycleName', 'kraName', 'rating', 'reviewerName'];
  selfAssessmentColumns: string[] = ['cycleName', 'kraName', 'rating', 'status'];
  
  // Pagination
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;
  
  // View mode
  selectedTab = 0;
  selectedAppraisal: EmployeeAppraisal | null = null;
  showDetails = false;

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
    // Filter form will be reinitialized after user role is determined
  }

  ngOnInit(): void {
    this.getCurrentUser();
    this.loadAppraisalCycles();
    this.loadEmployees();
    if (this.hasHRRole()) {
      this.loadAppraisals();
    } else {
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
          if (this.hasHRRole()) {
            this.loadAppraisals();
          } else {
            this.loadEmployeeAppraisals();
          }
        },
        error: (err) => console.error('Error while getting current user in Appraise', err)
      });
  }


  private initializeFilterForm(): void {
    if (this.hasHRRole()) {
      // HR role: original filters with status
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

  private initializeSelfAssessmentFilterForm(): void {
    this.selfAssessmentFilterForm = this.fb.group({
      cycleId: [''],
      kraId: [''],
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

  loadAppraisals(): void {
    this.isLoading = true;
    const filterValue = this.filterForm.value;
    
    // Build filter based on user role
    const filter: AppraisalFilter = {
      appraisalCycleId: filterValue.cycleId || undefined,
      employeeId: this.hasHRRole() ? (filterValue.employeeId || undefined) : this.currentUser?.userId,
      status: filterValue.status || undefined,
      search: filterValue.search || undefined
    };

    this.performanceService.getEmployeeAppraisals(filter, this.pageIndex + 1, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const paginatedData = response.data as any;
            this.appraisals = paginatedData.items || paginatedData.data || [];
            this.totalItems = paginatedData.totalCount || paginatedData.total || 0;
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
    const filterValue = this.filterForm.value;
    
    const filter: { cycleId?: string; kraId?: string; search?: string } = {};
    if (filterValue.cycleId) filter.cycleId = filterValue.cycleId;
    if (filterValue.kraId) filter.kraId = filterValue.kraId;
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


  viewAppraisal(appraisal: EmployeeAppraisal): void {
    this.selectedAppraisal = appraisal;
    this.showDetails = true;
    // Scroll to details section
    setTimeout(() => {
      const detailsCard = document.querySelector('.details-card');
      if (detailsCard) {
        detailsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  openCreateForm(): void {
    const dialogRef = this.dialog.open(CreateAppraisalDialogComponent, {
      width: '900px',
      maxWidth: '90vw',
      data: {
        appraisalCycles: this.appraisalCycles,
        employees: this.employees,
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
          this.loadSelfAssessments();
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

  closeDetails(): void {
    this.showDetails = false;
    this.selectedAppraisal = null;
  }

  deleteAppraisal(appraisal: EmployeeAppraisal): void {
    if (confirm(`Are you sure you want to delete this appraisal?`)) {
      // Note: Backend might not have delete endpoint, handle accordingly
      this.notificationService.showInfo('Delete functionality may require backend implementation');
    }
  }

  applyFilters(): void {
    this.pageIndex = 0;
    if (this.hasHRRole()) {
      this.loadAppraisals();
    } else {
      this.loadEmployeeAppraisals();
    }
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.pageIndex = 0;
    if (this.hasHRRole()) {
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

  hasKraRatings(appraisal: EmployeeAppraisal | null): boolean {
    if (!appraisal || !appraisal.kraRatings) return false;
    return Object.keys(appraisal.kraRatings).length > 0;
  }

  hasSkillRatings(appraisal: EmployeeAppraisal | null): boolean {
    if (!appraisal || !appraisal.skillRatings) return false;
    return Object.keys(appraisal.skillRatings).length > 0;
  }

  getKraRatingsList(kraRatings: { [kraId: string]: number }): Array<{ kraId: string; kraName: string; rating: number }> {
    if (!kraRatings) return [];
    return Object.entries(kraRatings).map(([kraId, rating]) => ({
      kraId,
      kraName: `KRA ${kraId.substring(0, 8)}`, // Placeholder - you might want to load actual KRA names
      rating
    }));
  }

  getSkillRatingsList(skillRatings: { [skillId: string]: number }): Array<{ skillId: string; skillName: string; rating: number }> {
    if (!skillRatings) return [];
    return Object.entries(skillRatings).map(([skillId, rating]) => ({
      skillId,
      skillName: `Skill ${skillId.substring(0, 8)}`, // Placeholder - you might want to load actual skill names
      rating
    }));
  }

  hasHRRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

  hasManagerRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager', 'Manager']);
  }

}

