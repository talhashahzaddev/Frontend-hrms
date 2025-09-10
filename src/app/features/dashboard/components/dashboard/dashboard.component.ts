import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
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
import { catchError } from 'rxjs/operators';

import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  DashboardSummary, 
  AttendanceStats, 
  LeaveStats, 
  PayrollStats,
  PerformanceStats,
  RecentActivity,
  EmployeeGrowth,
  DepartmentStats,
  UpcomingEvents
} from '../../../../core/models/dashboard.models';
import { User } from '../../../../core/models/auth.models';

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
  standalone: true,
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
    MatTabsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Loading states
  isLoading = true;
  isSummaryLoading = false;
  isChartsLoading = false;

  // Current user
  currentUser: User | null = null;

  // Dashboard data
  dashboardSummary: DashboardSummary | null = null;
  attendanceStats: AttendanceStats | null = null;
  leaveStats: LeaveStats | null = null;
  payrollStats: PayrollStats | null = null;
  performanceStats: PerformanceStats | null = null;
  recentActivities: RecentActivity[] = [];
  employeeGrowth: EmployeeGrowth | null = null;
  departmentStats: DepartmentStats[] = [];
  upcomingEvents: UpcomingEvents[] = [];

  // Dashboard cards
  dashboardCards: DashboardCard[] = [];

  // Chart configurations
  attendanceChart: ChartConfig | null = null;
  leaveChart: ChartConfig | null = null;
  payrollChart: ChartConfig | null = null;
  departmentChart: ChartConfig | null = null;

  // Period selections
  selectedPeriod = 'month';
  periodOptions = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' }
  ];

  // Quick actions
  quickActions = [
    { label: 'Add Employee', icon: 'person_add', route: '/employees/add', color: 'primary' },
    { label: 'Mark Attendance', icon: 'access_time', route: '/attendance/mark', color: 'accent' },
    { label: 'Apply Leave', icon: 'event_available', route: '/leave/apply', color: 'success' },
    { label: 'View Payroll', icon: 'account_balance_wallet', route: '/payroll', color: 'info' }
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
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  private loadDashboardData(): void {
    this.isLoading = true;

    // Load all dashboard data in parallel
    forkJoin({
      summary: this.dashboardService.getDashboardSummary().pipe(
        catchError(err => {
          console.error('Failed to load dashboard summary:', err);
          return of(null);
        })
      ),
      attendanceStats: this.dashboardService.getAttendanceStats(this.selectedPeriod).pipe(
        catchError(err => {
          console.error('Failed to load attendance stats:', err);
          return of(null);
        })
      ),
      leaveStats: this.dashboardService.getLeaveStats(this.selectedPeriod).pipe(
        catchError(err => {
          console.error('Failed to load leave stats:', err);
          return of(null);
        })
      ),
      payrollStats: this.dashboardService.getPayrollStats(this.selectedPeriod).pipe(
        catchError(err => {
          console.error('Failed to load payroll stats:', err);
          return of(null);
        })
      ),
      performanceStats: this.dashboardService.getPerformanceStats().pipe(
        catchError(err => {
          console.error('Failed to load performance stats:', err);
          return of(null);
        })
      ),
      recentActivities: this.dashboardService.getRecentActivities(10).pipe(
        catchError(err => {
          console.error('Failed to load recent activities:', err);
          return of([]);
        })
      ),
      employeeGrowth: this.dashboardService.getEmployeeGrowth().pipe(
        catchError(err => {
          console.error('Failed to load employee growth:', err);
          return of(null);
        })
      ),
      departmentStats: this.dashboardService.getDepartmentStats().pipe(
        catchError(err => {
          console.error('Failed to load department stats:', err);
          return of([]);
        })
      ),
      upcomingEvents: this.dashboardService.getUpcomingEvents(5).pipe(
        catchError(err => {
          console.error('Failed to load upcoming events:', err);
          return of([]);
        })
      )
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        this.dashboardSummary = data.summary;
        this.attendanceStats = data.attendanceStats;
        this.leaveStats = data.leaveStats;
        this.payrollStats = data.payrollStats;
        this.performanceStats = data.performanceStats;
        this.recentActivities = data.recentActivities;
        this.employeeGrowth = data.employeeGrowth;
        this.departmentStats = data.departmentStats;
        this.upcomingEvents = data.upcomingEvents;
        
        this.prepareDashboardCards();
        this.prepareChartConfigurations();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load dashboard data:', error);
        this.notificationService.showError('Failed to load dashboard data');
        this.isLoading = false;
      }
    });
  }

  private prepareDashboardCards(): void {
    this.dashboardCards = [];

    if (this.dashboardSummary) {
      this.dashboardCards.push({
        title: 'Total Employees',
        value: this.dashboardSummary.totalEmployees,
        change: this.dashboardSummary.employeeGrowth ? `+${this.dashboardSummary.employeeGrowth}%` : undefined,
        changeType: 'increase',
        icon: 'groups',
        color: 'primary',
        route: '/employees'
      });

      this.dashboardCards.push({
        title: 'Present Today',
        value: this.dashboardSummary.presentToday,
        change: `${this.calculateAttendancePercentage()}%`,
        changeType: 'neutral',
        icon: 'check_circle',
        color: 'success',
        route: '/attendance'
      });

      this.dashboardCards.push({
        title: 'On Leave',
        value: this.dashboardSummary.onLeaveToday,
        icon: 'event_busy',
        color: 'warning',
        route: '/leave'
      });

      this.dashboardCards.push({
        title: 'Pending Approvals',
        value: this.dashboardSummary.pendingApprovals,
        icon: 'pending_actions',
        color: 'info',
        route: '/approvals'
      });
    }
  }

  private prepareChartConfigurations(): void {
    // Attendance Chart
    if (this.attendanceStats) {
      this.attendanceChart = {
        type: 'line',
        data: {
          labels: this.attendanceStats.dates || [],
          datasets: [{
            label: 'Present',
            data: this.attendanceStats.presentCounts || [],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4
          }, {
            label: 'Absent',
            data: this.attendanceStats.absentCounts || [],
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Attendance Trends'
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      };
    }

    // Department Chart
    if (this.departmentStats && this.departmentStats.length > 0) {
      this.departmentChart = {
        type: 'doughnut',
        data: {
          labels: this.departmentStats.map(dept => dept.name),
          datasets: [{
            data: this.departmentStats.map(dept => dept.employeeCount),
            backgroundColor: [
              'rgb(59, 130, 246)',
              'rgb(16, 185, 129)',
              'rgb(245, 101, 101)',
              'rgb(251, 191, 36)',
              'rgb(139, 92, 246)',
              'rgb(236, 72, 153)'
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Department Distribution'
            }
          }
        }
      };
    }
  }

  private calculateAttendancePercentage(): number {
    if (!this.dashboardSummary) return 0;
    const total = this.dashboardSummary.totalEmployees;
    const present = this.dashboardSummary.presentToday;
    return total > 0 ? Math.round((present / total) * 100) : 0;
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod = period;
    this.loadDashboardData();
  }

  refreshDashboard(): void {
    this.loadDashboardData();
  }

  navigateToQuickAction(route: string): void {
    // Navigation will be handled by routerLink in template
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString();
  }

  formatTime(date: string | Date): string {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getActivityIcon(activityType: string): string {
    const icons: { [key: string]: string } = {
      'employee_added': 'person_add',
      'employee_updated': 'person',
      'attendance_marked': 'access_time',
      'leave_applied': 'event_available',
      'leave_approved': 'check_circle',
      'leave_rejected': 'cancel',
      'payroll_processed': 'account_balance_wallet',
      'performance_reviewed': 'star',
      'default': 'info'
    };
    return icons[activityType] || icons['default'];
  }

  getEventTypeColor(eventType: string): string {
    const colors: { [key: string]: string } = {
      'birthday': 'primary',
      'work_anniversary': 'success',
      'holiday': 'warning',
      'meeting': 'info',
      'deadline': 'danger',
      'default': 'secondary'
    };
    return colors[eventType] || colors['default'];
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  trackByDept(index: number, dept: any): any {
    return dept.name || index;
  }

  trackByActivity(index: number, activity: any): any {
    return activity.id || index;
  }

  trackByEvent(index: number, event: any): any {
    return event.id || index;
  }

  getSelectedPeriodLabel(): string {
    const selected = this.periodOptions.find(p => p.value === this.selectedPeriod);
    return selected ? selected.label : 'This Month';
  }

  isSelectedPeriod(value: string): boolean {
    return this.selectedPeriod === value;
  }

  isChangeType(changeType: string | undefined, type: string): boolean {
    return changeType === type;
  }

  hasDepartmentStats(): boolean {
    return this.departmentStats && this.departmentStats.length > 0;
  }

  getDepartmentPercentage(count: number): number {
    const total = this.departmentStats.reduce((sum, dept) => sum + dept.count, 0);
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  hasActivities(): boolean {
    return this.recentActivities && this.recentActivities.length > 0;
  }

  hasUpcomingEvents(): boolean {
    return this.upcomingEvents && this.upcomingEvents.length > 0;
  }

  getActivityIconClass(type: string): string {
    return `activity-icon-${type}`;
  }

  formatActivityTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  getEventDay(dateStr: string): string {
    const date = new Date(dateStr);
    return date.getDate().toString();
  }

  getEventMonth(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short' });
  }

  formatEventTime(dateStr: string, timeStr: string): string {
    return `${dateStr} at ${timeStr}`;
  }

  getStarArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  getStarClass(index: number, rating: number): string {
    return index < Math.floor(rating) ? 'filled' : 'empty';
  }

  exportChart(chartType: string): void {
    // Export chart implementation
    console.log(`Exporting ${chartType} chart`);
  }

  refreshChart(chartType: string): void {
    // Refresh chart implementation
    console.log(`Refreshing ${chartType} chart`);
  }
}
