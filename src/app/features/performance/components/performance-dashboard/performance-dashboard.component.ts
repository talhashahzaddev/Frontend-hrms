import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy,
  inject,
  ChangeDetectorRef,
  ViewChild
} from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { NgChartsModule } from 'ng2-charts';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { PerformanceService } from '../../services/performance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

import {
  AppraisalCycle,
  EmployeeSkill,
  HrReviewDto,
  ManagerReviewDto
} from '../../../../core/models/performance.models';

import { User } from '../../../../core/models/auth.models';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-performance-dashboard',
  standalone: true,
  imports: [
    SharedCommonModule,
    PageHeaderComponent,
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatProgressBarModule,
    NgChartsModule
  ],
  templateUrl: './performance-dashboard.component.html',
  styleUrls: ['./performance-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
  export class PerformanceDashboardComponent implements OnInit, OnDestroy, AfterViewInit {

  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  // UI State
  isLoading = false;

  // User
  currentUser: User | null = null;

  // Data
  mySkills: EmployeeSkill[] = [];
  assessedSkills: EmployeeSkill[] = [];
  appraisalCycles: AppraisalCycle[] = [];

  // HR Reviews
  employeeHrReviews: HrReviewDto[] = [];

  // Ratings
  overallRating = 0;
  currentRating = 0;

  // Pagination - HR Reviews
  hrReviewPageSize = 10;
  hrReviewPageIndex = 0;
  hrReviewTotalItems = 0;
  hrReviewPageSizeOptions = [5, 10, 25, 50];

  // Pagination - Received Reviews
  receivedReviewPageSize = 10;
  receivedReviewPageIndex = 0;
  receivedReviewTotalItems = 0;
  receivedReviewPageSizeOptions = [5, 10, 25, 50];

  // Stars
  starRatings = [1, 2, 3, 4, 5];

  // Table
  hrReviewsDataSource = new MatTableDataSource<HrReviewDto>([]);

  displayedColumns: string[] = [
    'cycleName',
    'employeeName',
    'kraName',
    'finalRating',
    'status',
    'hrComments'
  ];

  // Reviews Received by Employee from Managers
  receivedReviews: ManagerReviewDto[] = [];
  isLoadingReceivedReviews = false;
  receivedReviewsDataSource = new MatTableDataSource<ManagerReviewDto>([]);
  receivedReviewDisplayedColumns: string[] = ['cycleName', 'employeeName', 'kraName', 'goalName', 'rating'];

  @ViewChild('hrReviewsPaginator') hrReviewsPaginator?: MatPaginator;
  @ViewChild('receivedReviewsPaginator') receivedReviewsPaginator?: MatPaginator;

  constructor(
    private performanceService: PerformanceService,
    private authService: AuthService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngAfterViewInit(): void {
    // Attach paginators after view init to ensure datasource paging works with OnPush
    if (this.hrReviewsPaginator) {
      Promise.resolve().then(() => {
        this.cdr.detectChanges();
      });
    }
    if (this.receivedReviewsPaginator) {
      Promise.resolve().then(() => {
        this.cdr.detectChanges();
      });
    }
  }

  onHrReviewPageChange(event: PageEvent): void {
    this.hrReviewPageIndex = event.pageIndex;
    this.hrReviewPageSize = event.pageSize;
    if (this.hrReviewsPaginator) {
      this.hrReviewsPaginator.pageIndex = this.hrReviewPageIndex;
      this.hrReviewsPaginator.pageSize = this.hrReviewPageSize;
    }
    this.applyHrReviewsPagination();
  }

  onReceivedReviewsPageChange(event: PageEvent): void {
    this.receivedReviewPageIndex = event.pageIndex;
    this.receivedReviewPageSize = event.pageSize;
    if (this.receivedReviewsPaginator) {
      this.receivedReviewsPaginator.pageIndex = this.receivedReviewPageIndex;
      this.receivedReviewsPaginator.pageSize = this.receivedReviewPageSize;
    }
    this.applyReceivedReviewsPagination();
  }

  private applyHrReviewsPagination(): void {
    const start = this.hrReviewPageIndex * this.hrReviewPageSize;
    const end = start + this.hrReviewPageSize;
    const slice = (this.employeeHrReviews || []).slice(start, end);
    this.hrReviewsDataSource.data = slice;
    // update paginator UI
    if (this.hrReviewsPaginator) {
      this.hrReviewsPaginator.length = this.hrReviewTotalItems;
      this.hrReviewsPaginator.pageIndex = this.hrReviewPageIndex;
      this.hrReviewsPaginator.pageSize = this.hrReviewPageSize;
    }
    this.cdr.detectChanges();
  }

  private applyReceivedReviewsPagination(): void {
    const start = this.receivedReviewPageIndex * this.receivedReviewPageSize;
    const end = start + this.receivedReviewPageSize;
    const slice = (this.receivedReviews || []).slice(start, end);
    this.receivedReviewsDataSource.data = slice;
    if (this.receivedReviewsPaginator) {
      this.receivedReviewsPaginator.length = this.receivedReviewTotalItems;
      this.receivedReviewsPaginator.pageIndex = this.receivedReviewPageIndex;
      this.receivedReviewsPaginator.pageSize = this.receivedReviewPageSize;
    }
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadReceivedReviews();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  hasHRRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUserValue();
    if (this.currentUser) {
      this.loadInitialData();
    }
  }

  loadReceivedReviews(): void {
    this.isLoadingReceivedReviews = true;
    this.performanceService.getEmployeeReceivedReviews()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.receivedReviews = response.data || [];
            this.receivedReviewTotalItems = this.receivedReviews.length;
            if (this.receivedReviewsPaginator) {
              this.receivedReviewsPaginator.length = this.receivedReviewTotalItems;
              this.receivedReviewsPaginator.pageIndex = this.receivedReviewPageIndex;
              this.receivedReviewsPaginator.pageSize = this.receivedReviewPageSize;
            }
            this.applyReceivedReviewsPagination();
          } else {
            this.receivedReviews = [];
            this.receivedReviewsDataSource.data = [];
            this.receivedReviewTotalItems = 0;
          }
          this.isLoadingReceivedReviews = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading received reviews:', error);
          this.receivedReviews = [];
          this.receivedReviewsDataSource.data = [];
          this.receivedReviewTotalItems = 0;
          this.isLoadingReceivedReviews = false;
          this.cdr.markForCheck();
        }
      });
  }

  private loadInitialData(): void {
    if (!this.currentUser?.userId) return;

    this.isLoading = true;

    forkJoin([
      // Skills
      this.performanceService.getEmployeeSkillsByEmployee(this.currentUser.userId).pipe(
        catchError(() => of({ success: false, data: [] })),
        map((r: any) => r?.data || [])
      ),

      // Cycles
      this.performanceService.getAppraisalCycles().pipe(
        catchError(() => of({ data: [] }))
      ),

      // Summary
      this.performanceService.getMyPerformanceSummary().pipe(
        catchError(() => of({ data: null }))
      ),

      // HR Reviews
      this.performanceService.getEmployeeHrReviews().pipe(
        catchError(() => of({ success: false, data: [] })),
        map((r: any) => r?.data || [])
      )
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (results: any[]) => {
        // Skills
        this.mySkills = results[0] || [];
        this.assessedSkills = this.mySkills.filter(s => s.assessorName?.trim());

        // Cycles
        const cyclesResponse = results[1];
        this.appraisalCycles = cyclesResponse?.data || [];

        // Summary ratings
        const summary = results[2]?.data;
        if (summary) {
          this.currentRating = summary.currentCycleRating || 0;
          this.overallRating = summary.overallRating || 0;
        }

        // HR Reviews
        this.employeeHrReviews = results[3] || [];
        this.hrReviewTotalItems = this.employeeHrReviews.length;
        if (this.hrReviewsPaginator) {
          this.hrReviewsPaginator.length = this.hrReviewTotalItems;
          this.hrReviewsPaginator.pageIndex = this.hrReviewPageIndex;
          this.hrReviewsPaginator.pageSize = this.hrReviewPageSize;
        }
        this.applyHrReviewsPagination();

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getStatusChipClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':      return 'status-completed';
      case 'submitted':      return 'status-submitted';
      case 'under_review':   return 'status-under-review';
      case 'draft':          return 'status-draft';
      case 'rejected':       return 'status-rejected';
      default:               return 'status-draft';
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

  // Aligned exactly with appraisals reference getStarClass
  getStarClass(starNumber: number, rating: number | undefined): string {
    const numericRating = Number(rating);

    if (!numericRating || numericRating <= 0) return 'empty';
    if (starNumber <= numericRating) return 'filled';
    if (starNumber - 1 < numericRating && numericRating < starNumber) return 'half';
    return 'empty';
  }

  getRatingDisplay(rating: number | string | null | undefined): string {
    if (rating === null || rating === undefined) return '';
    const n = Number(rating);
    if (Number.isNaN(n)) return '';
    return n.toFixed(1);
  }
}
