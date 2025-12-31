import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil, interval } from 'rxjs';



import { MatFormFieldModule } from '@angular/material/form-field'; 
import { MatInputModule } from '@angular/material/input'; 
import { MatDatepickerModule } from '@angular/material/datepicker'; 
import { MatNativeDateModule } from '@angular/material/core'; 
import { FormsModule } from '@angular/forms'; 
import { MatTableModule } from '@angular/material/table';


import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { 
  TimeTrackingSession, 
  Attendance,
  AttendanceSessionDto, 
  ClockInOutRequest 
} from '../../../../core/models/attendance.models';
import { User } from '../../../../core/models/auth.models';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-time-tracker',
  standalone: true,
  imports: [
    MatFormFieldModule,   
    MatInputModule,       
    MatDatepickerModule,  
FormsModule,          
    MatTableModule,

    MatNativeDateModule, 
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './time-tracker.component.html',
  styleUrls: ['./time-tracker.component.scss']
})
export class TimeTrackerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Current state
  currentUser: User | null = null;
  currentSession: TimeTrackingSession | null = null;
  todayAttendance: Attendance | null = null;
  recentAttendance: Attendance[] = [];
  currentTime = new Date();
  // Date filter for recent attendance
filterStartDate: Date | null = null;
filterEndDate: Date | null = null;
// New: Today's sessions
todaySessions: AttendanceSessionDto[] = [];
isLoadingSessions = false;
  // Loading states
  isLoading = false;
  isClockActionLoading = false;

  // Permissions
  canViewTeamAttendance = false;

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
    this.loadCurrentSession();
    this.loadTodayAttendance();
    this.loadRecentAttendance();
    this.loadTodaySessions();
    this.setupTimeUpdater();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Role helpers
  get isSuperAdmin(): boolean {
    return this.authService.hasRole('Super Admin');
  }
  get isManager():boolean {
    return this.authService.hasRole('Manager');
  }

  get isHRManager(): boolean {
    return this.authService.hasRole('HR Manager');
  }

  get isAdminOrHR(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

  get isEmployee(): boolean {
    return this.authService.hasRole('Employee');
  }

  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }
  
  private getCurrentUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.canViewTeamAttendance = this.checkTeamAttendancePermission(user);
      });
  }

  private checkTeamAttendancePermission(user: User | null): boolean {
    if (!user?.role) return false;
    const managerRoles = ['Super Admin', 'HR Manager', 'Manager'];
    return managerRoles.includes(user.role);
  }

  private setupTimeUpdater(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentTime = new Date();
        if (this.currentSession?.isActive) {
          this.updateElapsedTime();
        }
      });
  }

  private updateElapsedTime(): void {
    if (this.currentSession?.checkInTime) {
      const checkIn = new Date(this.currentSession.checkInTime);
      const now = new Date();
      const diffMs = now.getTime() - checkIn.getTime();
      this.currentSession.elapsedHours = diffMs / (1000 * 60 * 60);
    }
  }

  private loadTodaySessions(): void {
  this.isLoadingSessions = true;
  this.attendanceService.getTodaySessions()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (sessions) => {
        this.todaySessions = sessions || [];
        this.isLoadingSessions = false;
      },
      error: (error) => {
        console.error('Error loading today sessions:', error);
        this.isLoadingSessions = false;
      }
    });
}


formatSessionDuration(checkIn: string | Date, checkOut?: string | Date): string {
  const start = new Date(checkIn).getTime();
  const end = checkOut ? new Date(checkOut).getTime() : new Date().getTime();
  const diffMs = end - start;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
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

  private loadTodayAttendance(): void {
    const today = new Date().toISOString().split('T')[0];
    this.attendanceService.getMyAttendance(today, today)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (attendances) => {
          this.todayAttendance = attendances.length > 0 ? attendances[0] : null;
        },
        error: (error) => {
          console.error('Error loading today attendance:', error);
        }
      });
  }

private formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}


private loadRecentAttendance(): void {
  this.isLoading = true;

  const startDate = this.filterStartDate
    ? this.formatLocalDate(this.filterStartDate)
    : this.formatLocalDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const endDate = this.filterEndDate
    ? this.formatLocalDate(this.filterEndDate)
    : this.formatLocalDate(new Date());

  this.attendanceService.getMyAttendance(startDate, endDate)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (attendances) => {
        this.recentAttendance = attendances.slice(0, 5);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading recent attendance:', error);
        this.isLoading = false;
      }
    });
}

applyDateFilter(): void {
  this.loadRecentAttendance();
}




  clockIn(): void {
    this.isClockActionLoading = true;
    
    const request: ClockInOutRequest = {
      action: 'in',
      location: {
        source: 'web_app',
        timestamp: new Date().toISOString()
      }
    };

    this.attendanceService.checkIn(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Clocked in successfully!');
          this.loadCurrentSession();
          this.loadTodayAttendance();
          this.loadTodaySessions();
          this.isClockActionLoading = false;
        },
        error: (error) => {
          console.error('Clock in error:', error);
          this.showError('Failed to clock in. Please try again.');
          this.isClockActionLoading = false;
        }
      });
  }

  clockOut(): void {
    this.isClockActionLoading = true;
    
    const request: ClockInOutRequest = {
      action: 'out',
      location: {
        source: 'web_app',
        timestamp: new Date().toISOString()
      }
    };

    this.attendanceService.checkOut(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Clocked out successfully!');
          this.loadCurrentSession();
          this.loadTodayAttendance();
          this.loadRecentAttendance();
          this.loadTodaySessions();
          this.isClockActionLoading = false;
        },
        error: (error) => {
          console.error('Clock out error:', error);
          this.showError('Failed to clock out. Please try again.');
          this.isClockActionLoading = false;
        }
      });
  }

  formatElapsedTime(hours: number): string {
    const totalMinutes = Math.floor(hours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins}m`;
  }

  formatHours(hours: number): string {
    if (hours === 0) return '0h 0m';
    const hrs = Math.floor(hours);
    const mins = Math.round((hours - hrs) * 60);
    return `${hrs}h ${mins}m`;
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}