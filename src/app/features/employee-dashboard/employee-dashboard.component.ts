import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil, interval } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableDataSource } from '@angular/material/table';
import { NewsService } from '../news/services/news.services';
import { Router } from '@angular/router';
import { GeoFenceService } from '../attendance/services/geofence.service';

import { AttendanceService } from '../attendance/services/attendance.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { CommentDialogComponent } from '../../shared/components/comment-dialog/comment-dialog.component';
import { PerformanceService } from '../performance/services/performance.service';
import { ApplyLeaveComponent } from '../leave/components/apply-leave/apply-leave.component';
import {
  TimeTrackingSession,
  Attendance,
  AttendanceSummary
} from '../../core/models/attendance.models';
import { GeoClockInRequest } from '../attendance/services/geofence.service';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule
  ],
  templateUrl: './employee-dashboard.component.html',
  styleUrl: './employee-dashboard.component.scss',
})
export class EmployeeDashboardComponent implements OnInit, OnDestroy {

  // News Table
  currentUser: any = null;
  topNews = new MatTableDataSource<any>([]);
  displayedNewsColumns: string[] = ['title', 'category', 'status', 'publishedAt'];
  displayedAttendanceColumns: string[] = ['date','checkIn','checkOut','hours','status'];
  private destroy$ = new Subject<void>();
  recentAttendance: Attendance[] = [];
  isRecentLoading = false;
  currentSession: TimeTrackingSession | null = null;
  currentShiftId: string | null = null;
  shiftHasGeoFence = false;
  isGeoFenceLookupFailed = false;
  isClockActionLoading = false;
  attendanceSummary: AttendanceSummary | null = null;
  isSummaryLoading = false;
  // ⭐ Ratings
  overallRating: number = 0;
  currentRating: number = 0;

  // ⭐ For stars display
  readonly starRatings: number[] = [1, 2, 3, 4, 5];

  // Date and Time for dashboard header
  currentTime: Date = new Date();


  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private notification: NotificationService,
    private performanceService: PerformanceService,
    private geoFenceService: GeoFenceService,
    private newsService: NewsService,
    private dialog: MatDialog,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.getCurrentUser();
    this.loadCurrentSession();
    this.loadCurrentShift();
    this.loadAttendanceSummary();
    this.loadMyRatings();
    this.startTimer();
    this.loadRecentAttendance();
    this.loadTopNews();
    this.setupTimeUpdater();
  }

  private setupTimeUpdater(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentTime = new Date();
      });
  }
  private getCurrentUser(): void {
    const user = this.authService.getCurrentUser();
    if (user && typeof user.subscribe === 'function') {
      user.subscribe({
        next: (u: any) => {
          this.currentUser = u;
          this.loadCurrentShift();
          this.loadMyRatings();
        },
        error: () => this.currentUser = null
      });
    } else {
      this.currentUser = user;
      this.loadCurrentShift();
      this.loadMyRatings();
    }
  }

  loadCurrentShift(): void {
    const userId = this.currentUser?.userId;
    if (!userId) {
      this.currentShiftId = null;
      return;
    }
    this.attendanceService
      .getCurrentShiftByEmployee(userId)
      .subscribe({
        next: (shiftId) => {
          this.currentShiftId = shiftId;
          if (shiftId) {
            this.checkShiftGeoFences(shiftId);
          } else {
            this.shiftHasGeoFence = false;
            this.isGeoFenceLookupFailed = false;
          }
        },
        error: () => {
          this.currentShiftId = null;
          this.shiftHasGeoFence = false;
          this.isGeoFenceLookupFailed = false;
        }
      });
  }

  private checkShiftGeoFences(shiftId: string): void {
    this.geoFenceService.getByShift(shiftId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fences) => {
          this.shiftHasGeoFence = (fences || []).some(f => f.isActive);
          this.isGeoFenceLookupFailed = false;
        },
        error: () => {
          this.shiftHasGeoFence = false;
          this.isGeoFenceLookupFailed = true;
        }
      });
  }

  private redirectToTimeTrackerForGeoClock(action: 'in' | 'out'): void {
    const actionLabel = action === 'in' ? 'Clock In' : 'Clock Out';
    this.notification.showError(`${actionLabel} for geo-fenced shifts must be done from Time Tracker.`);
    this.router.navigate(['/attendance/time-tracker']);
  }

  private getBrowserLocation(): Promise<{ latitude?: number; longitude?: number }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({});
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => resolve({}),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  private clockViaGeoEndpoint(action: 'in' | 'out', notes?: string): void {
    this.isClockActionLoading = true;

    this.getBrowserLocation().then(location => {
      const request: GeoClockInRequest = {
        action,
        ...location,
        matchResult: 'match',
        notes,
        deviceInfo: JSON.stringify({
          userAgent: navigator.userAgent.substring(0, 200),
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        })
      };

      this.geoFenceService.geoClock(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.notification.showSuccess(response.message || `Clocked ${action === 'in' ? 'in' : 'out'} successfully!`);
            this.loadCurrentSession();
            this.isClockActionLoading = false;
          },
          error: (error) => {
            const errorMessage = error?.error?.message || error?.message || `Failed to clock ${action === 'in' ? 'in' : 'out'}.`;
            this.notification.showError(errorMessage);
            this.isClockActionLoading = false;
          }
        });
    });
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startTimer(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
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
  this.isSummaryLoading = true;

  const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endDate = new Date();

  this.attendanceService.getMyAttendanceSummary(
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  )
  .pipe(takeUntil(this.destroy$))
  .subscribe({
    next: (summary) => {
      this.attendanceSummary = summary;
      this.isSummaryLoading = false;
    },
    error: (error) => {
      const errorMessage =
        error?.error?.message ||
        error?.message ||
        'Failed to load attendance summary';
      this.notification.showError(errorMessage);
      this.isSummaryLoading = false;
    }
  });
}

 private loadTopNews(): void {
    const searchModel: any = {
      page: 1,
      pageSize: 5,
      search: '',
      category: '',
      status: ''
    };
    this.newsService.getAllNews(searchModel)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paged) => {
          this.topNews.data = paged.data?.slice(0, 5) || [];
        },
        error: () => {
          this.topNews.data = [];
        }
      });
  }

  clockIn(): void {
    if (!this.currentShiftId) {
      console.log('No shift assigned for today,this.currentShiftId:', this.currentShiftId);
      this.notification.showError('No shift assigned for today.');
      return;
    }

    if (this.shiftHasGeoFence) {
      this.redirectToTimeTrackerForGeoClock('in');
      return;
    }

    if (this.isGeoFenceLookupFailed) {
      this.notification.showError('Unable to verify shift geo-fence. Please use Time Tracker for clock actions.');
      this.router.navigate(['/attendance/time-tracker']);
      return;
    }

    void this.clockViaGeoEndpoint('in');
  }

  clockOut(): void {
    if (!this.currentShiftId) {
      this.notification.showError('No shift assigned for today.');
      return;
    }

    if (this.shiftHasGeoFence) {
      this.redirectToTimeTrackerForGeoClock('out');
      return;
    }

    if (this.isGeoFenceLookupFailed) {
      this.notification.showError('Unable to verify shift geo-fence. Please use Time Tracker for clock actions.');
      this.router.navigate(['/attendance/time-tracker']);
      return;
    }

    const dialogRef = this.dialog.open(CommentDialogComponent, {
      width: '400px',
      data: {
        title: 'Clock Out',
        label: 'Day Updates / Comments',
        placeholder: 'E.g., completed API integration...',
        required: false
      }
    });

    dialogRef.afterClosed().subscribe(comment => {
      if (comment === undefined) return;

      void this.clockViaGeoEndpoint('out', comment);
    });
  }
   openLeaveRequestDialog(): void {
      const dialogRef = this.dialog.open(ApplyLeaveComponent, {
        width: '600px',
        maxWidth: '90vw',
        disableClose: true,
        panelClass: 'custom-dialog-container'
      });
  
      dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
        // if (result) { this.loadInitialData(); }
      });
    }

    private loadRecentAttendance(): void {
  this.isRecentLoading = true;

  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const endDate = new Date()
    .toISOString()
    .split('T')[0];

  this.attendanceService.getMyAttendance(startDate, endDate)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (attendances) => {
        this.recentAttendance = attendances?.slice(0, 5) || [];
        this.isRecentLoading = false;
      },
      error: () => {
        this.recentAttendance = [];
        this.isRecentLoading = false;
      }
    });
}

  private loadMyRatings(): void {
    const userId = this.authService.getCurrentUser();
    if (!userId) return;

    this.performanceService.getEmployeeAppraisalsByEmployee(userId.toString())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
            // Use the latest appraisal (assuming sorted by date, latest last)
            const latestAppraisal = res.data[res.data.length - 1];
            this.currentRating = Number(latestAppraisal.currentRating) || 0;
            this.overallRating = Number(latestAppraisal.overallRating) || 0;
          } else {
            this.currentRating = 0;
            this.overallRating = 0;
          }
        },
        error: () => {
          this.currentRating = 0;
          this.overallRating = 0;
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
  if (!hours) return '0h 0m';
  const hrs = Math.floor(hours);
  const mins = Math.round((hours - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

getStatusClass(status: string): string {
    return status === 'Published' ? 'status-active' : 'status-inactive';
  }

  onNewsClick(news: any): void {
    news.clicked = true;
    if (news.newsId) {
      this.router.navigate(['/news/view-news', news.newsId]);
    }
  }
}