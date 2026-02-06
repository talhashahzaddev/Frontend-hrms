// timesheet-dashboard.component.ts - UPDATED VERSION

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, takeUntil } from 'rxjs';

import { AttendanceService } from '../../services/attendance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MonthlyTimesheetSummary, MonthlyTimesheetCreateDto } from '../../../../core/models/attendance.models';
import { TimesheetDetailDialogComponent } from '../timesheet-detail-dialog/timesheet-detail-dialog.component';
import { CreateSnapshotDialogComponent } from '../create-snapshot-dialog/create-snapshot-dialog.component';

@Component({
  selector: 'app-timesheet-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatChipsModule,
    MatMenuModule
  ],
  templateUrl: './timesheet-dashboard.component.html',
  styleUrls: ['./timesheet-dashboard.component.scss']
})
export class TimesheetDashboardComponent implements OnInit, OnDestroy {
  timesheets: MonthlyTimesheetSummary[] = [];
  isLoading = false;
  currentUserRole: string = '';
  currentUser: any = null;

  private destroy$ = new Subject<void>();

  constructor(
    private attendanceService: AttendanceService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.getCurrentUserRole();
    this.loadAllSnapshots();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getCurrentUserRole(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.currentUserRole = user.role || user.roleName || '';
          this.currentUser = user;
        }
      });
  }

  isEmployee(): boolean {
    return this.currentUserRole?.toLowerCase() === 'employee';
  }

  loadAllSnapshots(): void {
    this.isLoading = true;
    
    // Load all monthly snapshots from the backend
    this.attendanceService.getSnapshots()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.timesheets = data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading timesheets:', error);
          this.notificationService.showError('Failed to load timesheets');
          this.isLoading = false;
        }
      });
  }

  openCreateSnapshotDialog(): void {
    const dialogRef = this.dialog.open(CreateSnapshotDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.createSnapshot(result);
        }
      });
  }

  createSnapshot(data: MonthlyTimesheetCreateDto): void {
    this.isLoading = true;
    
    this.attendanceService.createSnapshot(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (snapshot) => {
          this.notificationService.showSuccess(`Snapshot "${data.timesheetName}" created successfully`);
          this.loadAllSnapshots(); // Reload the list
        },
        error: (error) => {
          console.error('Error creating snapshot:', error);
          const errorMessage = error?.message || 'Failed to create snapshot';
          this.notificationService.showError(errorMessage);
          this.isLoading = false;
        }
      });
  }

  refreshData(): void {
    this.loadAllSnapshots();
  }

  openTimesheetDetailDialog(timesheet: MonthlyTimesheetSummary): void {
    const dialogRef = this.dialog.open(TimesheetDetailDialogComponent, {
      width: '95%',
      maxWidth: '1400px',
      height: '90vh',
      data: {
        timesheetId: timesheet.timesheetId,
        timesheetName: timesheet.timesheetName,
        month: timesheet.month,
        year: timesheet.year,
        monthName: timesheet.monthName,
        userRole: this.currentUserRole
      },
      panelClass: 'timesheet-detail-dialog-panel',
      disableClose: false,
      hasBackdrop: true
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result?.refreshNeeded) {
          this.loadAllSnapshots();
        }
      });
  }

  getAttendancePercentageColor(percentage: number): string {
    if (percentage >= 90) return 'success';
    if (percentage >= 75) return 'warning';
    return 'danger';
  }

  getMonthYearDisplay(timesheet: MonthlyTimesheetSummary): string {
    return `${timesheet.monthName} ${timesheet.year}`;
  }

  getStatusChipClass(status?: string): string {
    switch (status?.toLowerCase()) {
      case 'finalized':
        return 'status-finalized';
      case 'draft':
        return 'status-draft';
      default:
        return 'status-draft';
    }
  }

  deleteSnapshot(timesheet: MonthlyTimesheetSummary): void {
    // TODO: Implement delete functionality
    this.notificationService.showInfo('Delete functionality will be implemented');
  }

  getEmployeeCodeLabel(snapshot: MonthlyTimesheetSummary): string {
    // For employees, show their employee code from the timesheet data
    // Backend should filter to return only their data
    return this.isEmployee() ? 'Employee Code' : 'Total Employees';
  }

  getEmployeeCodeValue(snapshot: MonthlyTimesheetSummary): string | number {
    // For employees, extract from their name or use a default
    // The backend filters to only their data, so totalEmployees will be 1
    if (this.isEmployee()) {
      return this.currentUser?.email?.split('@')[0] || 'N/A';
    }
    return snapshot.totalEmployees;
  }

  getAttendanceRateLabel(): string {
    return this.isEmployee() ? 'My Attendance Rate' : 'Org Attendance Rate';
  }

  finalizeSnapshot(timesheet: MonthlyTimesheetSummary): void {
    if (confirm(`Are you sure you want to finalize "${timesheet.timesheetName}"? This action cannot be undone.`)) {
      this.attendanceService.finalizeBatch(timesheet.timesheetId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Timesheet finalized successfully');
            this.loadAllSnapshots();
          },
          error: (error) => {
            console.error('Error finalizing timesheet:', error);
            const errorMessage = error?.message || 'Failed to finalize timesheet';
            this.notificationService.showError(errorMessage);
          }
        });
    }
  }
}