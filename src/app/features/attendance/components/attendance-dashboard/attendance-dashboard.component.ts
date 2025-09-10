import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, takeUntil, interval, startWith } from 'rxjs';

import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  TimeTrackingSession,
  AttendanceSummary,
  DailyAttendanceStats,
  AttendanceCalendarData,
  AttendanceStatus,
  CheckInRequest,
  CheckOutRequest
} from '../../../../core/models/attendance.models';
import { User } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-attendance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule
  ],
  templateUrl: './attendance-dashboard.component.html',
  styleUrls: ['./attendance-dashboard.component.scss']
})
export class AttendanceDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Current user and session
  currentUser: User | null = null;
  currentSession: TimeTrackingSession | null = null;
  currentTime = new Date();
  
  // Loading states
  isLoading = false;
  isClockActionLoading = false;
  
  // Dashboard data
  attendanceSummary: AttendanceSummary | null = null;
  dailyStats: DailyAttendanceStats | null = null;
  calendarData: AttendanceCalendarData[] = [];
  
  // Date controls
  selectedMonth = new Date();
  monthControl = new FormControl(new Date());
  
  // Quick stats
  quickStats = [
    { label: 'Present Today', value: 0, icon: 'check_circle', color: 'success' },
    { label: 'Total Hours', value: '0h 0m', icon: 'schedule', color: 'primary' },
    { label: 'This Month', value: '0h 0m', icon: 'calendar_today', color: 'info' },
    { label: 'Attendance Rate', value: '0%', icon: 'trending_up', color: 'warning' }
  ];
  
  // Calendar view
  calendarWeeks: AttendanceCalendarData[][] = [];
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  constructor(
    public attendanceService: AttendanceService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
    this.setupTimeUpdater();
    this.setupMonthWatcher();
    this.loadDashboardData();
    this.checkCurrentSession();
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

  private setupTimeUpdater(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentTime = new Date();
      });
  }

  private setupMonthWatcher(): void {
    this.monthControl.valueChanges
      .pipe(
        startWith(this.monthControl.value),
        takeUntil(this.destroy$)
      )
      .subscribe(date => {
        if (date) {
          this.selectedMonth = date;
          this.loadCalendarData();
        }
      });
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Load attendance summary for current month
    this.attendanceService.getMyAttendanceSummary(
      this.formatDate(startOfMonth),
      this.formatDate(endOfMonth)
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (summary) => {
        this.attendanceSummary = summary;
        this.updateQuickStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load attendance summary:', error);
        this.isLoading = false;
      }
    });

    // Load daily stats
    this.attendanceService.getDailyAttendanceStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.dailyStats = stats;
        },
        error: (error) => {
          console.error('Failed to load daily stats:', error);
        }
      });

    this.loadCalendarData();
  }

  private loadCalendarData(): void {
    const year = this.selectedMonth.getFullYear();
    const month = this.selectedMonth.getMonth() + 1;
    
    this.attendanceService.getAttendanceCalendar('', year, month)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.calendarData = data;
          this.buildCalendarWeeks();
        },
        error: (error) => {
          console.error('Failed to load calendar data:', error);
        }
      });
  }

  private checkCurrentSession(): void {
    this.attendanceService.getCurrentSession()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (session) => {
          this.currentSession = session;
        },
        error: (error) => {
          console.error('Failed to check current session:', error);
        }
      });
  }

  private updateQuickStats(): void {
    if (!this.attendanceSummary) return;
    
    this.quickStats = [
      {
        label: 'Present Days',
        value: this.attendanceSummary.presentDays,
        icon: 'check_circle',
        color: 'success'
      },
      {
        label: 'Total Hours',
        value: this.attendanceService.formatDuration(this.attendanceSummary.totalHours),
        icon: 'schedule',
        color: 'primary'
      },
      {
        label: 'Average Hours',
        value: this.attendanceService.formatDuration(this.attendanceSummary.averageHoursPerDay),
        icon: 'calendar_today',
        color: 'info'
      },
      {
        label: 'Attendance Rate',
        value: `${Math.round(this.attendanceSummary.attendancePercentage)}%`,
        icon: 'trending_up',
        color: 'warning'
      }
    ];
  }

  private buildCalendarWeeks(): void {
    const year = this.selectedMonth.getFullYear();
    const month = this.selectedMonth.getMonth();
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Create calendar grid
    const weeks: AttendanceCalendarData[][] = [];
    let currentWeek: AttendanceCalendarData[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      currentWeek.push(this.createEmptyCalendarData());
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = this.formatDate(new Date(year, month, day));
      const attendanceData = this.calendarData.find(d => d.date === dateStr) || 
        this.createDefaultCalendarData(dateStr);
      
      currentWeek.push(attendanceData);
      
      // Start new week on Sunday
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    // Fill remaining cells in last week
    while (currentWeek.length < 7) {
      currentWeek.push(this.createEmptyCalendarData());
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    this.calendarWeeks = weeks;
  }

  private createEmptyCalendarData(): AttendanceCalendarData {
    return {
      date: '',
      status: AttendanceStatus.ABSENT,
      totalHours: 0,
      isHoliday: false,
      isWeekend: false
    };
  }

  private createDefaultCalendarData(date: string): AttendanceCalendarData {
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    return {
      date,
      status: isWeekend ? AttendanceStatus.HOLIDAY : AttendanceStatus.ABSENT,
      totalHours: 0,
      isHoliday: false,
      isWeekend
    };
  }

  // Clock In/Out Actions
  clockIn(): void {
    this.isClockActionLoading = true;
    const request: CheckInRequest = {
      location: 'Office', // You could get this from geolocation
      notes: ''
    };

    this.attendanceService.checkIn(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.currentSession = response.currentSession || null;
          this.notificationService.showSuccess('Checked in successfully!');
          this.loadDashboardData();
          this.isClockActionLoading = false;
        },
        error: (error) => {
          this.notificationService.showError(error.message || 'Failed to check in');
          this.isClockActionLoading = false;
        }
      });
  }

  clockOut(): void {
    this.isClockActionLoading = true;
    const request: CheckOutRequest = {
      location: 'Office',
      notes: ''
    };

    this.attendanceService.checkOut(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.currentSession = null;
          this.notificationService.showSuccess('Checked out successfully!');
          this.loadDashboardData();
          this.isClockActionLoading = false;
        },
        error: (error) => {
          this.notificationService.showError(error.message || 'Failed to check out');
          this.isClockActionLoading = false;
        }
      });
  }

  // Utility methods
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  formatTime(time: string): string {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCurrentTimeFormatted(): string {
    return this.currentTime.toLocaleTimeString();
  }

  getCurrentDateFormatted(): string {
    return this.currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getSessionDuration(): string {
    if (!this.currentSession || !this.currentSession.startTime) return '0h 0m';
    
    const start = new Date(this.currentSession.startTime);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
    
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    
    return `${hours}h ${minutes}m`;
  }

  getStatusColor(status: AttendanceStatus): string {
    return this.attendanceService.getAttendanceStatusColor(status);
  }

  getCalendarDayClass(day: AttendanceCalendarData): string[] {
    const classes = ['calendar-day'];
    
    if (!day.date) {
      classes.push('empty-day');
      return classes;
    }
    
    if (day.isWeekend) classes.push('weekend');
    if (day.isHoliday) classes.push('holiday');
    
    classes.push(`status-${day.status}`);
    
    // Highlight today
    const today = new Date().toISOString().split('T')[0];
    if (day.date === today) {
      classes.push('today');
    }
    
    return classes;
  }

  getDayNumber(date: string): number {
    return date ? new Date(date).getDate() : 0;
  }

  isCurrentSession(): boolean {
    return !!this.currentSession && this.currentSession.status === 'active';
  }

  navigateToReports(): void {
    // Navigate to detailed reports
  }

  navigateToTimesheet(): void {
    // Navigate to timesheet view
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }
}
