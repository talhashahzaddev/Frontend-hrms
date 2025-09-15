

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

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private notificationService: NotificationService
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
      .subscribe(user => this.currentUser = user);
  }

  private loadDashboardData(): void {
    this.isLoading = true;

    forkJoin({
      summary: this.dashboardService.getDashboardSummary().pipe(catchError(() => of(null))),
      attendanceStats: this.dashboardService.getAttendanceStats(this.selectedPeriod).pipe(catchError(() => of(null))),
      leaveStats: this.dashboardService.getLeaveStats(this.selectedPeriod).pipe(catchError(() => of(null))),
      payrollStats: this.dashboardService.getPayrollStats(this.selectedPeriod).pipe(catchError(() => of(null))),
      performanceStats: this.dashboardService.getPerformanceStats().pipe(catchError(() => of(null))),
      recentActivities: this.dashboardService.getRecentActivities(10).pipe(catchError(() => of([]))),
      employeeGrowth: this.dashboardService.getEmployeeGrowth().pipe(catchError(() => of(null))),
      departmentStats: this.dashboardService.getDepartmentStats().pipe(catchError(() => of([]))),
      upcomingEvents: this.dashboardService.getUpcomingEvents(5).pipe(catchError(() => of([])))
    })
    .pipe(finalize(() => this.isLoading = false))
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
        console.error('Failed to load dashboard data:', error);
        this.notificationService.showError('Failed to load dashboard data');
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
          labels: this.departmentStats.map(d => d.name),
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
  this.loadDashboardData(); // or whatever method you already use to fetch dashboard data
}

}
