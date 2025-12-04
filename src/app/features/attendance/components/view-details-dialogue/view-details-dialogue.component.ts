import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { Subject, takeUntil } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { User } from '../../../../core/models/auth.models';
import { AttendanceSessionDto, TimeTrackingSession } from '../../../../core/models/attendance.models';

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
    MatDialogModule,     // <- Added
    MatDividerModule,    // <- Added
    MatButtonModule,     // <- Added
    DatePipe
  ]
})
export class ViewDetailsDialogueComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  currentUser: User | null = null;
  currentSession: TimeTrackingSession | null = null;
  todaySessions: AttendanceSessionDto[] = [];

  isLoadingUser = false;
  isLoadingSession = false;
  isLoadingTodaySessions = false;

  // Computed property for template
  get isLoading(): boolean {
    return this.isLoadingUser || this.isLoadingSession || this.isLoadingTodaySessions;
  }

  constructor(
    private dialogRef: MatDialogRef<ViewDetailsDialogueComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUser(): void {
    this.isLoadingUser = true;
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          this.isLoadingUser = false;
          this.loadCurrentSession();
          this.loadTodaySessions();
        },
        error: (err) => {
          console.error('Error fetching user:', err);
          this.showError('Failed to load user.');
          this.isLoadingUser = false;
        }
      });
  }

  private loadCurrentSession(): void {
    this.isLoadingSession = true;
    this.attendanceService.getCurrentSession()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (session) => {
          this.currentSession = session ?? null;
          this.isLoadingSession = false;
        },
        error: (err) => {
          console.error('Error loading current session:', err);
          this.showError('Failed to load current session.');
          this.isLoadingSession = false;
        }
      });
  }


  private loadTodaySessions(): void {
  if (!this.data.employeeId) return; // ensure employeeId is provided
const workDate = this.data.workDate;
  this.isLoadingTodaySessions = true;
  this.attendanceService.getTodaySessionsById(this.data.employeeId,workDate)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (sessions) => {
        this.todaySessions = sessions ?? [];
        this.isLoadingTodaySessions = false;
      },
      error: (err) => {
        console.error('Error loading today sessions:', err);
        this.showError('Failed to load today\'s sessions.');
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

  closeDialog(): void {
    this.dialogRef.close();
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
  }
}
