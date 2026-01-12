
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
import { MatTableDataSource } from '@angular/material/table';

import { AttendanceCalendarComponent } from '../attendancce-calendar/attendance-calendar';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  TimeTrackingSession,
  AttendanceSummary,
  AttendanceCalendarData,
  AttendanceSession,
  Attendance
} from '../../../../core/models/attendance.models';
import { User } from '../../../../core/models/auth.models';

import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort'; // Optional if you want sorting
import { MatPaginatorModule } from '@angular/material/paginator'; // Optional if you want pagination


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
    AttendanceCalendarComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatChipsModule,
     MatTableModule,      // <-- ADD THIS
    MatSortModule,       // <-- optional
    MatPaginatorModule   ,
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
  // Add properties for pagination
currentPage = 1;
pageSize = 10;
totalPages = 0;
totalCount = 0;
  // Loading states
  isLoading = false;
  isLoadingList = false;
  
  // Dashboard data
  attendanceSummary: AttendanceSummary | null = null;
  calendarData: AttendanceCalendarData[] = [];
  myAttendanceList: Attendance[] = [];
  Sessionslist:AttendanceSession[]=[];
dataSource = new MatTableDataSource<AttendanceSession>([]);

  // Date controls
  selectedMonth = new Date();
listStartDateControl = new FormControl(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); // 1st of current month
listEndDateControl = new FormControl(new Date()); // Today
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
    private authService: AuthService,
    private notification: NotificationService
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
          const errorMessage = error?.error?.message || error?.message || 'Failed to load current session';
          this.notification.showError(errorMessage);
        }
      });
  }

  private loadAttendanceSummary(): void {
    const startDate = (new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const endDate = new Date(new Date()); // Today
    
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
        const errorMessage = error?.error?.message || error?.message || 'Failed to load attendance summary';
        this.notification.showError(errorMessage);
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



loadEmployeeAttendance(pageNumber: number = 1, pageSize: number = 10): void {
  if (!this.listStartDateControl.value || !this.listEndDateControl.value) {
    this.notification.showError('Please select both start and end dates');
    return;
  }

  this.isLoadingList = true;

  const startDate = this.listStartDateControl.value;
  const endDate = this.listEndDateControl.value;

  this.attendanceService.getEmployeeAttendanceSessions(
    pageNumber,
    pageSize,
    startDate,
    endDate
  )
  .pipe(takeUntil(this.destroy$))
  .subscribe({
    next: (res: any) => {
      // Use the mapped attendances from your service
      const sessionsArray = res.attendances ?? [];

      this.Sessionslist = sessionsArray.map((s: any) => ({
        sessionId: s.sessionId,
        attendanceId: s.attendanceId,
        employeeName: s.employeeName || `${s.firstName} ${s.lastName}`,
        workDate: s.workDate ? new Date(s.workDate) : null,
        checkInTime: s.checkInTime ? new Date(s.checkInTime) : null,
        checkOutTime: s.checkOutTime ? new Date(s.checkOutTime) : null,
        // location: s.location ? (typeof s.location === 'string' ? s.location : s.location.source) : '--'
      }));

      // Set dataSource for MatTable
      this.dataSource.data = this.Sessionslist;

      // Pagination info
      this.currentPage = res.page ?? pageNumber;
      this.pageSize = res.pageSize ?? pageSize;
      this.totalPages = res.totalPages ?? 1;
      this.totalCount = res.totalCount ?? this.Sessionslist.length;

      this.isLoadingList = false;
    },
    error: (err) => {
      const errorMessage = err?.error?.message || err?.message || 'Failed to fetch employee attendance';
      this.notification.showError(errorMessage);
      this.isLoadingList = false;
    }
  });
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
          const errorMessage = error?.error?.message || error?.message || 'Failed to load calendar data';
          this.notification.showError(errorMessage);
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
          const errorMessage = error?.error?.message || error?.message || 'Failed to load attendance list';
          this.notification.showError(errorMessage);
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
