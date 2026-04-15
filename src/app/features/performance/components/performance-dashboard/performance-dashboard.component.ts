
// import { CommonModule } from '@angular/common';
// import {
//   Component,
//   OnInit,
//   OnDestroy,
//   ChangeDetectionStrategy,
//   inject,
//   ChangeDetectorRef
// } from '@angular/core';

// import { MatCardModule } from '@angular/material/card';
// import { MatButtonModule } from '@angular/material/button';
// import { MatIconModule } from '@angular/material/icon';
// import { MatTableModule, MatTableDataSource } from '@angular/material/table';
// import { MatChipsModule } from '@angular/material/chips';
// import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// import { MatTabsModule } from '@angular/material/tabs';
// import { MatProgressBarModule } from '@angular/material/progress-bar';
// import { MatMenuModule } from '@angular/material/menu';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { MatSelectModule } from '@angular/material/select';

// import { NgChartsModule } from 'ng2-charts';
// import { Subject, takeUntil, forkJoin, of } from 'rxjs';
// import { catchError, map } from 'rxjs/operators';
// import { Router } from '@angular/router';
// import { MatDialog } from '@angular/material/dialog';

// import { PerformanceService } from '../../services/performance.service';
// import { AuthService } from '../../../../core/services/auth.service';
// import { NotificationService } from '../../../../core/services/notification.service';

// import {
//   EmployeeAppraisal,
//   AppraisalCycle,
//   PerformanceMetrics,
//   EmployeeSkill,
//   HrReviewDto
// } from '../../../../core/models/performance.models';

// import { User } from '../../../../core/models/auth.models';

// @Component({
//   selector: 'app-performance-dashboard',
//   standalone: true,
//   imports: [
//     CommonModule,
//     MatFormFieldModule,
//     MatSelectModule,
//     MatCardModule,
//     MatMenuModule,
//     MatButtonModule,
//     MatIconModule,
//     MatTableModule,
//     MatChipsModule,
//     MatProgressSpinnerModule,
//     MatTabsModule,
//     MatProgressBarModule,
//     NgChartsModule
//   ],
//   templateUrl: './performance-dashboard.component.html',
//   styleUrls: ['./performance-dashboard.component.scss'],
//   changeDetection: ChangeDetectionStrategy.OnPush
// })
// export class PerformanceDashboardComponent implements OnInit, OnDestroy {

//   private destroy$ = new Subject<void>();
//   private cdr = inject(ChangeDetectorRef);

//   // UI State
//   isLoading = false;

//   // User
//   currentUser: User | null = null;

//   // Data
//   mySkills: EmployeeSkill[] = [];
//   assessedSkills: EmployeeSkill[] = [];
//   appraisalCycles: AppraisalCycle[] = [];

//   // ⭐ HR Reviews (NEW MAIN SOURCE)
//   employeeHrReviews: HrReviewDto[] = [];
//   filteredHrReviews: HrReviewDto[] = [];

//   selectedCycleId: string | null = null;

//   // Ratings (from summary API)
//   overallRating = 0;
//   currentRating = 0;

//   // Stars
//   starRatings = [1, 2, 3, 4, 5];

//   // Table
//   hrReviewsDataSource = new MatTableDataSource<HrReviewDto>([]);
//   displayedColumns: string[] = [
//     'cycleName',
//     'employeeName',
//     'kraName',
//     'finalRating',
//     'status',
//     'hrComments'
//   ];

//   constructor(
//     private performanceService: PerformanceService,
//     private authService: AuthService,
//     private dialog: MatDialog,
//     private notificationService: NotificationService,
//     private router: Router
//   ) {}

//   ngOnInit(): void {
//     this.loadCurrentUser();
//   }

//   ngOnDestroy(): void {
//     this.destroy$.next();
//     this.destroy$.complete();
//   }

//   hasHRRole(): boolean {
//     return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
//   }

//   private loadCurrentUser(): void {
//     this.currentUser = this.authService.getCurrentUserValue();
//     if (this.currentUser) {
//       this.loadInitialData();
//     }
//   }

//   private loadInitialData(): void {
//     if (!this.currentUser?.userId) return;

//     this.isLoading = true;

//     forkJoin([
//       this.performanceService.getEmployeeSkillsByEmployee(this.currentUser.userId).pipe(
//         catchError(() => of({ success: false, data: [] })),
//         map((r: any) => r?.data || [])
//       ),

//       this.performanceService.getAppraisalCycles().pipe(
//         catchError(() => of({ data: [] }))
//       ),

//       this.performanceService.getMyPerformanceSummary().pipe(
//         catchError(() => of({ data: null }))
//       ),

//       // ⭐ NEW: HR Reviews (ALL)
//       this.performanceService.getEmployeeHrReviews().pipe(
//         catchError(() => of({ success: false, data: [] })),
//         map((r: any) => r?.data || [])
//       )
//     ])
//     .pipe(takeUntil(this.destroy$))
//     .subscribe({
//       next: (results: any[]) => {

//         // Skills
//         this.mySkills = results[0] || [];
//         this.assessedSkills = this.mySkills.filter(s => s.assessorName?.trim());

//         // Cycles
//         const cyclesResponse = results[1];
//         this.appraisalCycles = cyclesResponse?.data || [];

//         // Summary ratings
//         const summary = results[2]?.data;
//         if (summary) {
//           this.currentRating = summary.currentCycleRating || 0;
//           this.overallRating = summary.overallRating || 0;
//         }

//         // HR Reviews
//         this.employeeHrReviews = results[3] || [];

//         // Default cycle
//         if (this.appraisalCycles.length > 0) {
//           const active = this.appraisalCycles.find(c => c.status?.toLowerCase() === 'active');
//           this.selectedCycleId = active?.cycleId || this.appraisalCycles[0]?.cycleId;

//           this.applyCycleFilter();
//         }

//         this.isLoading = false;
//         this.cdr.markForCheck();
//       },
//       error: () => {
//         this.isLoading = false;
//         this.cdr.markForCheck();
//       }
//     });
//   }

//   // ⭐ FIXED: Cycle filter only (NO API CALL)
//   onCycleChange(cycleId: string): void {
//     this.selectedCycleId = cycleId;
//     this.applyCycleFilter();
//   }

//   private applyCycleFilter(): void {
//     if (!this.selectedCycleId) {
//       this.filteredHrReviews = this.employeeHrReviews;
//     } else {
//       this.filteredHrReviews = this.employeeHrReviews.filter(
//         r => r.cycleId === this.selectedCycleId
//       );
//     }

//     this.hrReviewsDataSource.data = this.filteredHrReviews;
//     this.cdr.markForCheck();
//   }
// }





import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
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
  HrReviewDto
} from '../../../../core/models/performance.models';

import { User } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-performance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
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
export class PerformanceDashboardComponent implements OnInit, OnDestroy {

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

  // ⭐ HR Reviews (ONLY SOURCE)
  employeeHrReviews: HrReviewDto[] = [];

  // Ratings
  overallRating = 0;
  currentRating = 0;

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

  constructor(
    private performanceService: PerformanceService,
    private authService: AuthService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
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

  private loadInitialData(): void {
    if (!this.currentUser?.userId) return;

    this.isLoading = true;

    forkJoin([
      // Skills
      this.performanceService.getEmployeeSkillsByEmployee(this.currentUser.userId).pipe(
        catchError(() => of({ success: false, data: [] })),
        map((r: any) => r?.data || [])
      ),

      // Cycles (optional only UI use)
      this.performanceService.getAppraisalCycles().pipe(
        catchError(() => of({ data: [] }))
      ),

      // Summary
      this.performanceService.getMyPerformanceSummary().pipe(
        catchError(() => of({ data: null }))
      ),

      // ⭐ HR Reviews (ALL DATA)
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

        // Cycles (NOT USED FOR FILTERING ANYMORE)
        const cyclesResponse = results[1];
        this.appraisalCycles = cyclesResponse?.data || [];

        // Summary ratings
        const summary = results[2]?.data;
        if (summary) {
          this.currentRating = summary.currentCycleRating || 0;
          this.overallRating = summary.overallRating || 0;
        }

        // ⭐ HR Reviews (DIRECT LOAD)
        this.employeeHrReviews = results[3] || [];
        this.hrReviewsDataSource.data = this.employeeHrReviews;

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }
}