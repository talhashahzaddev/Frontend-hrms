import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AttendanceService } from '../../../features/attendance/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { AttendanceSessionDto, ShiftDto } from '../../../core/models/attendance.models';
import { CalendarEvent } from '../../../features/calendar/models/calendar.models';

@Component({
  selector: 'app-view-details-dialogue',
  templateUrl: './view-details-dialogue.component.html',
  styleUrls: ['./view-details-dialogue.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatDividerModule,
    MatButtonModule,
    DatePipe
  ]
})
export class CalendarDetailsDialogueComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  attendanceEvent: CalendarEvent | undefined;
  leaveEvent: CalendarEvent | undefined;
  currentShift: ShiftDto | null = null;
  todaySessions: AttendanceSessionDto[] = [];

  isLoadingShift = false;
  isLoadingTodaySessions = false;

  get isLoading(): boolean {
    return this.isLoadingShift || this.isLoadingTodaySessions;
  }

  constructor(
    private dialogRef: MatDialogRef<CalendarDetailsDialogueComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { date: string, events: CalendarEvent[], employeeId: string, employeeName: string },
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private notification: NotificationService
  ) { }

  ngOnInit(): void {
    this.extractEvents();
    this.loadCurrentShift();

    // Only load sessions if we have an attendance event or if it's a working day to check for activity
    if (this.data.employeeId) {
      this.loadTodaySessions();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private extractEvents(): void {
    if (this.data.events) {
      this.attendanceEvent = this.data.events.find(e => e.type === 'ATTENDANCE');
      this.leaveEvent = this.data.events.find(e => e.type === 'LEAVE');
    }
  }

  private loadCurrentShift(): void {
    if (!this.data.employeeId) return;

    this.isLoadingShift = true;
    this.isLoadingShift = true;
    // Use the dedicated method that unwraps the ApiResponse
    this.attendanceService.getCurrentShiftDetails(this.data.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (shift) => {
          this.currentShift = shift ?? null;
          this.isLoadingShift = false;
        },
        error: (err) => {
          console.error('Failed to load shift', err);
          this.currentShift = null;
          this.isLoadingShift = false;
        }
      });
  }

  private loadTodaySessions(): void {
    if (!this.data.employeeId || !this.data.date) return;

    this.isLoadingTodaySessions = true;
    this.attendanceService.getCalendarSessionsById(this.data.employeeId, this.data.date)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sessions) => {
          this.todaySessions = sessions ?? [];
          this.isLoadingTodaySessions = false;
        },
        error: (err) => {
          // Silent fail or low priority error as sessions might not exist
          console.error('Error fetching sessions:', err);
          this.isLoadingTodaySessions = false;
        }
      });
  }

  formatSessionDuration(checkIn?: string | Date, checkOut?: string | Date): string {
    if (!checkIn) return '--:--';
    const start = new Date(checkIn).getTime();
    const end = checkOut ? new Date(checkOut).getTime() : Date.now();
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  formatShiftTime(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  // Helper getters for template
  get isLeave(): boolean {
    return !!this.leaveEvent;
  }

  get leaveStatusClass(): string {
    const s = this.leaveEvent?.status?.toLowerCase();
    if (s === 'approved') return 'status-present';
    if (s === 'rejected') return 'status-absent';
    return 'status-late'; // pending
  }

  get leaveStatusIcon(): string {
    const s = this.leaveEvent?.status?.toLowerCase();
    if (s === 'approved') return 'check_circle';
    if (s === 'rejected') return 'cancel';
    return 'hourglass_empty';
  }
}
