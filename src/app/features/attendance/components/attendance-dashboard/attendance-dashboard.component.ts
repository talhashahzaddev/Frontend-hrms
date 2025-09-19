import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { Subject, takeUntil, interval } from 'rxjs';

import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  TimeTrackingSession,
  AttendanceSummary,
  AttendanceCalendarData,
  Attendance
} from '../../../../core/models/attendance.models';
import { User } from '../../../../core/models/auth.models';

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  isWorkingDay: boolean;
  isPast: boolean;
  attendance?: AttendanceCalendarData;
}

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
    MatNativeDateModule
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
  isLoadingList = false;
  
  // Dashboard data
  attendanceSummary: AttendanceSummary | null = null;
  calendarData: AttendanceCalendarData[] = [];
  myAttendanceList: Attendance[] = [];
  
  // Date controls
  selectedMonth = new Date();
  listStartDateControl = new FormControl(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  listEndDateControl = new FormControl(new Date());
  
  // Quick stats
  quickStats = [
    { label: 'Present Today', value: '0', icon: 'check_circle', color: 'success' },
    { label: 'Total Hours', value: '0h 0m', icon: 'schedule', color: 'primary' },
    { label: 'This Month', value: '0h 0m', icon: 'calendar_today', color: 'info' },
    { label: 'Attendance Rate', value: '0%', icon: 'trending_up', color: 'warning' }
  ];
  
  // Calendar view
  calendarWeeks: CalendarDay[][] = [];
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  constructor(
    public attendanceService: AttendanceService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
    this.setupTimeUpdater();
    this.loadCurrentSession();
    this.loadAttendanceSummary();
    this.generateCalendar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getCurrentUser(): void {
    this.authService.currentUser$
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

  private loadCurrentSession(): void {
    this.attendanceService.getCurrentSession()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (session) => {
          this.currentSession = session;
        },
        error: (error) => {
          console.error('Error loading current session:', error);
        }
      });
  }

  private loadAttendanceSummary(): void {
    const startDate = new Date(this.selectedMonth.getFullYear(), this.selectedMonth.getMonth(), 1);
    const endDate = new Date(this.selectedMonth.getFullYear(), this.selectedMonth.getMonth() + 1, 0);
    
    this.attendanceService.getMyAttendanceSummary(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (summary) => {
        this.attendanceSummary = summary;
        this.updateQuickStats(summary);
      },
      error: (error) => {
        console.error('Error loading attendance summary:', error);
      }
    });
  }

  private updateQuickStats(summary: AttendanceSummary): void {
    this.quickStats = [
      { 
        label: 'Present Days', 
        value: (summary.presentDays || 0).toString(), 
        icon: 'check_circle', 
        color: 'success' 
      },
      { 
        label: 'Total Hours', 
        value: this.formatHours(summary.totalHours || 0), 
        icon: 'schedule', 
        color: 'primary' 
      },
      { 
        label: 'Overtime Hours', 
        value: this.formatHours(summary.overtimeHours || 0), 
        icon: 'access_time', 
        color: 'info' 
      },
      { 
        label: 'Average/Day', 
        value: this.formatHours(summary.averageHoursPerDay || 0), 
        icon: 'trending_up', 
        color: 'warning' 
      }
    ];
  }

  generateCalendar(): void {
    const year = this.selectedMonth.getFullYear();
    const month = this.selectedMonth.getMonth();
    
    // Load calendar data
    this.attendanceService.getAttendanceCalendar(undefined, year, month + 1)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (calendarData) => {
          this.calendarData = calendarData;
          this.buildCalendarWeeks();
        },
        error: (error) => {
          console.error('Error loading calendar data:', error);
          this.buildCalendarWeeks(); // Build empty calendar
        }
      });
  }

  private buildCalendarWeeks(): void {
    const year = this.selectedMonth.getFullYear();
    const month = this.selectedMonth.getMonth();
    
    // Get first day of the month and first day of the calendar grid
    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayOfCalendar = new Date(firstDayOfMonth);
    firstDayOfCalendar.setDate(firstDayOfCalendar.getDate() - firstDayOfMonth.getDay());
    
    const weeks: CalendarDay[][] = [];
    let currentWeek: CalendarDay[] = [];
    let currentDate = new Date(firstDayOfCalendar);
    
    // Generate 6 weeks (42 days)
    for (let day = 0; day < 42; day++) {
      const calendarDay: CalendarDay = {
        date: new Date(currentDate),
        dayNumber: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: this.isToday(currentDate),
        isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
        isHoliday: false, // TODO: Implement holiday logic
        isWorkingDay: this.isWorkingDay(currentDate),
        isPast: currentDate < new Date(),
        attendance: this.getAttendanceForDate(currentDate)
      };
      
      currentWeek.push(calendarDay);
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    this.calendarWeeks = weeks;
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  private isWorkingDay(date: Date): boolean {
    const day = date.getDay();
    return day >= 1 && day <= 5; // Monday to Friday
  }

  private getAttendanceForDate(date: Date): AttendanceCalendarData | undefined {
    const dateStr = date.toISOString().split('T')[0];
    return this.calendarData.find(a => a.date.split('T')[0] === dateStr);
  }

  previousMonth(): void {
    this.selectedMonth = new Date(this.selectedMonth.getFullYear(), this.selectedMonth.getMonth() - 1, 1);
    this.generateCalendar();
    this.loadAttendanceSummary();
  }

  nextMonth(): void {
    this.selectedMonth = new Date(this.selectedMonth.getFullYear(), this.selectedMonth.getMonth() + 1, 1);
    this.generateCalendar();
    this.loadAttendanceSummary();
  }

  goToCurrentMonth(): void {
    this.selectedMonth = new Date();
    this.generateCalendar();
    this.loadAttendanceSummary();
  }

  loadListData(): void {
    this.isLoadingList = true;
    
    const startDate = this.listStartDateControl.value?.toISOString().split('T')[0] || '';
    const endDate = this.listEndDateControl.value?.toISOString().split('T')[0] || '';

    this.attendanceService.getMyAttendance(startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (attendances) => {
          this.myAttendanceList = attendances;
          this.isLoadingList = false;
        },
        error: (error) => {
          console.error('Error loading attendance list:', error);
          this.isLoadingList = false;
        }
      });
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'present': return 'check_circle';
      case 'absent': return 'cancel';
      case 'late': return 'schedule';
      case 'early_departure': return 'exit_to_app';
      case 'half_day': return 'schedule';
      case 'on_leave': return 'event_available';
      case 'holiday': return 'celebration';
      default: return 'help_outline';
    }
  }

  formatHours(hours: number): string {
    if (hours === 0) return '0h 0m';
    const hrs = Math.floor(hours);
    const mins = Math.round((hours - hrs) * 60);
    return `${hrs}h ${mins}m`;
  }
}