

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NgChartsModule } from 'ng2-charts';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PerformanceService } from '../../services/performance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MatMenuModule } from '@angular/material/menu';

import { NotificationService } from '../../../../core/services/notification.service';
import { 
  EmployeeAppraisal, 
  AppraisalCycle, 
  PerformanceSummary,
  EmployeeSkill,
  PerformanceMetrics
} from '../../../../core/models/performance.models';
import { User } from '../../../../core/models/auth.models';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource } from '@angular/material/table';

import { AppraisalCycleFormComponent } from '../appraisal-cycle-form/appraisal-cycle-form.component';
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

  // ⭐ UI state
  isLoading = false;
  selectedTab = 0;

  // ⭐ Data models
  currentUser: User | null = null;
  myPerformanceMetrics: PerformanceMetrics | null = null;
  mySkills: EmployeeSkill[] = [];
  myAppraisals: EmployeeAppraisal[] = [];
  teamPerformanceSummary: PerformanceSummary | null = null;
  appraisalCycles: AppraisalCycle[] = [];
  employeeAppraisals: EmployeeAppraisal[] = [];
  selectedCycleId: string | null = null;

  overallRating: number = 0;

  // ⭐ For rating stars
  starRatings = [1, 2, 3, 4, 5];

  // ⭐ Table Data Sources
  appraisalsDataSource = new MatTableDataSource<EmployeeAppraisal>([]);
  cyclesDataSource = new MatTableDataSource<AppraisalCycle>([]);
  displayedColumns: string[] = ['cycleName', 'reviewType', 'reviewerName', 'overallRating', 'feedback'];
  displayedCycleColumns: string[] = ['cycleName', 'description', 'dates', 'status', 'actions'];

  constructor(
    private performanceService: PerformanceService,
    private authService: AuthService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUserValue();
    console.log('CurrentUser:', this.currentUser);
  }

  // ✅ Load all data initially
  private loadInitialData(): void {
    this.isLoading = true;

    const requests: any[] = [
    
      this.performanceService.getMySkills().pipe(
        catchError((err) => {
          console.error('getMySkills failed:', err);
          return of([]);
        })
      ),
    ];

  
    requests.push(
      this.performanceService.getAppraisalCycles().pipe(
        catchError((err) => {
          console.error('getAppraisalCycles failed:', err);
          return of({ data: [] });
        })
      )
    );

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results: any[]) => {
          this.myAppraisals = results[0] || [];
          this.myPerformanceMetrics = results[1] || null;
          this.mySkills = results[2] || [];

          if (this.hasManagerRole()) {
            this.teamPerformanceSummary = results[3] || null;
          }

          this.appraisalCycles = (results[results.length - 1]?.data) || [];
          this.cyclesDataSource.data = this.appraisalCycles;

          // ✅ Automatically select the latest active or first cycle
          if (this.appraisalCycles.length > 0) {
            const activeCycle = this.appraisalCycles.find(c => c.status?.toLowerCase() === 'active');
            const firstCycle = this.appraisalCycles[0];
            this.selectedCycleId = activeCycle?.cycleId || firstCycle?.cycleId;

            // Automatically load goals for that cycle
            if (this.selectedCycleId) {
              this.onCycleChange(this.selectedCycleId);
            }
          }

          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Unexpected error in forkJoin:', error);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ✅ When user selects a cycle
  onCycleChange(cycleId: string): void {
    this.selectedCycleId = cycleId;

    if (!cycleId || !this.currentUser?.userId) return;

    this.isLoading = true;

    this.performanceService
      .getEmployeeAppraisalsByCycle(cycleId, this.currentUser.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.employeeAppraisals = res.data || [];
            this.appraisalsDataSource.data = this.employeeAppraisals;
            console.log('Employee Appraisals:', this.employeeAppraisals);

            if (this.employeeAppraisals.length > 0) {
              this.overallRating = this.employeeAppraisals[0].overallRating || 0;
            }
          } else {
            this.employeeAppraisals = [];
            this.appraisalsDataSource.data = [];
          }

          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error fetching appraisals by cycle:', err);
          this.employeeAppraisals = [];
          this.appraisalsDataSource.data = [];
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  
  // ✅ Open popup for creating new cycle
  openCreateCycleDialog(): void {
    const dialogRef = this.dialog.open(AppraisalCycleFormComponent, {
      width: '550px',
      disableClose: true,
      data: {}
    });

    dialogRef.afterClosed().subscribe((newCycle: AppraisalCycle | null) => {
      if (newCycle) {
        this.appraisalCycles.unshift(newCycle);
        this.loadInitialData();
        this.notificationService.showSuccess('Appraisal cycle created successfully!');
        this.cdr.markForCheck();
      }
    });
  }

  editCycle(cycle: AppraisalCycle) {
    this.router.navigate(['/performance/cycles'], { 
      queryParams: { edit: cycle.cycleId } 
    });
  }

  deleteCycle(cycle: AppraisalCycle) {
    if (confirm(`Are you sure you want to delete "${cycle.cycleName}"? This action cannot be undone.`)) {
      this.performanceService.deleteAppraisalCycle(cycle.cycleId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.showSuccess('Appraisal cycle deleted successfully');
              this.loadInitialData();
            } else {
              this.notificationService.showError(response.message || 'Failed to delete cycle');
            }
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error deleting cycle:', error);
            this.notificationService.showError('Failed to delete appraisal cycle');
            this.cdr.markForCheck();
          }
        });
    }
  }










  // ✅ Helper Methods
  createAppraisalCycle(): void {
    this.router.navigate(['/performance/cycles']);
  }

  viewCycleDetails(cycle: AppraisalCycle): void {
    this.notificationService.showInfo('Cycle details view will be implemented');
  }

  manageCycle(cycle: AppraisalCycle): void {
    this.notificationService.showInfo('Cycle management will be implemented');
  }

  hasManagerRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager', 'Manager']);
  }

  hasHRRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

  getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      case 'stable': return 'trending_flat';
      default: return 'remove';
    }
  }

  getSkillLevelColor(level: number): 'primary' | 'accent' | 'warn' {
    if (level >= 4) return 'primary';
    if (level >= 3) return 'accent';
    return 'warn';
  }

  getCycleStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (status?.toLowerCase()) {
      case 'active': return 'primary';
      case 'completed': return 'accent';
      case 'cancelled': return 'warn';
      default: return undefined;
    }
  }

  getStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active': return 'check_circle';
      case 'completed': return 'done_all';
      case 'cancelled': return 'cancel';
      default: return 'help_outline';
    }
  }
}