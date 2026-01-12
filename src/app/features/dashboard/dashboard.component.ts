import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { NgChartsModule } from 'ng2-charts';
import { Router } from '@angular/router';
import { DashboardService } from '../dashboard/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  DashboardSummary,
  AttendanceStats,
  LeaveStats,
  PayrollStats,
  PerformanceStats,
  RecentActivity,
  DepartmentStats,
  UpcomingEvents
} from '../../core/models/dashboard.models';
import { User } from '../../core/models/auth.models';

interface DashboardCard {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: string;
  color: string;
  route?: string;
}

interface ChartConfig {
  type: 'line' | 'bar' | 'doughnut' | 'pie';
  data: any;
  options?: any;
}

@Component({
    selector: 'app-dashboard',
    imports: [
        CommonModule,
        RouterModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatProgressBarModule,
        MatMenuModule,
        MatTooltipModule,
        MatChipsModule,
        MatDividerModule,
        MatTabsModule,
        NgChartsModule
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  cdr = inject(ChangeDetectorRef);

  isLoading = false;
  currentUser: User | null = null;

  dashboardSummary: DashboardSummary | null = null;
  attendanceStats: AttendanceStats | null = null;
  leaveStats: LeaveStats | null = null;
  payrollStats: PayrollStats | null = null;
  performanceStats: PerformanceStats | null = null;
  
  recentActivities: RecentActivity[] = [];
  employeeGrowth: number | null = null;
  departmentStats: DepartmentStats[] = [];
  upcomingEvents: UpcomingEvents[] = [];

  dashboardCards: DashboardCard[] = [];

  attendanceChart: ChartConfig | null = null;
  departmentChart: ChartConfig | null = null;

  selectedPeriod = 'month';
  periodOptions = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' }
  ];

  starRatings = [1, 2, 3, 4, 5];

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router:Router
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getCurrentUser(): void {
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: user => this.currentUser = user,
        error: () => {
          this.currentUser = null;
          this.notificationService.showError('Failed to load user information');
          this.cdr.markForCheck();
        }
      });
  }

  // Role helpers for DashboardComponent (or any component)
get isAdmin(): boolean {
  return this.authService.hasRole('Admin');
}
get isSuperAdmin(): boolean {
  return this.authService.hasRole('Admin');
}

get isHR(): boolean {
  return this.authService.hasRole('HR');
}

get isManager(): boolean {
  return this.authService.hasRole('Manager');
}

get isEmployee(): boolean {
  return this.authService.hasRole('Employee');
}

// Generic function if you want to check any role dynamically
hasRole(role: string): boolean {
  return this.authService.hasRole(role);
}

// Check multiple roles at once
hasAnyRole(roles: string[]): boolean {
  return this.authService.hasAnyRole(roles);
  }
  
  
  
  private loadDashboardData(): void {
    if (this.isLoading) return;
    this.isLoading = true;
  
    forkJoin({
      summary: this.dashboardService.getDashboardSummary().pipe(
        catchError(error => {
          this.notificationService.showError(this.extractErrorMessage(error, 'Failed to load dashboard summary'));
          return of(null);
        })
      ),
      attendanceStats: this.dashboardService.getAttendanceStats(this.selectedPeriod).pipe(
        catchError(error => {
          this.notificationService.showError(this.extractErrorMessage(error, 'Failed to load attendance stats'));
          return of(null);
        })
      ),
      leaveStats: this.dashboardService.getLeaveStats(this.selectedPeriod).pipe(
        catchError(error => {
          this.notificationService.showError(this.extractErrorMessage(error, 'Failed to load leave stats'));
          return of(null);
        })
      ),
      payrollStats: this.dashboardService.getPayrollStats(this.selectedPeriod).pipe(
        catchError(error => {
          this.notificationService.showError(this.extractErrorMessage(error, 'Failed to load payroll stats'));
          return of(null);
        })
      ),
      performanceStats: this.dashboardService.getPerformanceStats().pipe(
        catchError(error => {
          this.notificationService.showError(this.extractErrorMessage(error, 'Failed to load performance stats'));
          return of(null);
        })
      ),
      recentActivities: this.dashboardService.getRecentActivities(10).pipe(
        catchError(error => {
          this.notificationService.showError(this.extractErrorMessage(error, 'Failed to load recent activities'));
          return of([]);
        })
      ),
      employeeGrowth: this.dashboardService.getEmployeeGrowth().pipe(
        catchError(error => {
          this.notificationService.showError(this.extractErrorMessage(error, 'Failed to load employee growth'));
          return of(null);
        })
      ),
      departmentStats: this.dashboardService.getDepartmentStats().pipe(
        catchError(error => {
          this.notificationService.showError(this.extractErrorMessage(error, 'Failed to load department stats'));
          return of([]);
        })
      ),
      upcomingEvents: this.dashboardService.getUpcomingEvents(5).pipe(
        catchError(error => {
          this.notificationService.showError(this.extractErrorMessage(error, 'Failed to load upcoming events'));
          return of([]);
        })
      )
    })
    .pipe(takeUntil(this.destroy$), finalize(() => {
      this.isLoading = false;
      this.cdr.markForCheck();
    }))
    .subscribe({
      next: data => {
        this.dashboardSummary = data.summary;
        this.attendanceStats = data.attendanceStats;
        this.leaveStats = data.leaveStats;
        this.payrollStats = data.payrollStats;
        this.performanceStats = data.performanceStats;
        
        this.recentActivities = data.recentActivities;
        this.employeeGrowth = (data.employeeGrowth as any)?.growthRate ?? null;
        this.departmentStats = data.departmentStats;
        this.upcomingEvents = data.upcomingEvents;

        this.prepareDashboardCards();
        this.prepareChartConfigurations();
        this.cdr.markForCheck();
      },
      error: error => {
        this.notificationService.showError(this.extractErrorMessage(error, 'Failed to load dashboard data'));
      }
    });
  }

  

  
  private prepareDashboardCards(): void {
    if (!this.dashboardSummary) return;

    this.dashboardCards = [
      {
        title: 'Total Employees',
        value: this.dashboardSummary.totalEmployees,
        change: this.employeeGrowth != null ? `+${this.employeeGrowth}%` : undefined,
        changeType: 'increase',
        icon: 'groups',
        color: 'primary',
        route: '/employees'
      },
      {
        title: 'Present Today',
        value: this.dashboardSummary.presentToday,
        change: `${this.calculateAttendancePercentage()}%`,
        changeType: 'neutral',
        icon: 'check_circle',
        color: 'success',
        route: '/attendance'
      },
      {
        title: 'On Leave',
        value: this.dashboardSummary.onLeaveToday,
        icon: 'event_busy',
        color: 'warning',
        route: '/leave'
      },
      {
        title: 'Pending Approvals',
        value: this.dashboardSummary.pendingApprovals,
        icon: 'pending_actions',
        color: 'info',
        route: '/approvals'
      }
    ];
  }

  quickemployee():void{
    this.router.navigate(['/employees/add'])
  }
  quickreports():void{
    this.router.navigate(['/attendance/reports'])
  }

  scheduleLeave(): void {
  this.router.navigate(['/leave/apply']);
}


  private prepareChartConfigurations(): void {
    if (this.attendanceStats) {
      this.attendanceChart = {
        type: 'line',
        data: {
          labels: this.attendanceStats.dates || [],
          datasets: [
            {
              label: 'Present',
              data: this.attendanceStats.presentCounts || [],
              
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4
            },
            {
              label: 'Absent',
              data: this.attendanceStats.absentCounts || [],
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.4
            }
          ]
        },
        options: { responsive: true, plugins: { title: { display: true, text: 'Attendance Trends' } } }
      };
    }

    if (this.departmentStats?.length) {
      this.departmentChart = {
        type: 'doughnut',
        data: {
          labels: this.departmentStats.map(d => d.departmentName),
          datasets: [
            {
              data: this.departmentStats.map(d => d.employeeCount),
              backgroundColor: [
                'rgb(59,130,246)',
                'rgb(16,185,129)',
                'rgb(245,101,101)',
                'rgb(251,191,36)',
                'rgb(139,92,246)',
                'rgb(236,72,153)'
              ]
            }
          ]
        },
        options: { responsive: true, plugins: { title: { display: true, text: 'Department Distribution' } } }
      };
    }
  }

  private calculateAttendancePercentage(): number {
    if (!this.dashboardSummary) return 0;
    const total = this.dashboardSummary.totalEmployees;
    const present = this.dashboardSummary.presentToday;
    return total > 0 ? Math.round((present / total) * 100) : 0;
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString();
  }

  formatTime(date: string | Date): string {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  refreshDashboard(): void {
  this.loadDashboardData();
}

private extractErrorMessage(error: any, fallback: string): string {
  const message = error?.error?.message || error?.message || fallback;
  return typeof message === 'string' && message.trim() !== '' ? message : fallback;
}

}






