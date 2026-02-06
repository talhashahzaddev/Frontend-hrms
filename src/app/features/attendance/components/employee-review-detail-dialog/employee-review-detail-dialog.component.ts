import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AttendanceService } from '../../services/attendance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  EmployeeReviewPackage, 
  DailyReviewRecord,
  ProcessAttendanceRequestDto 
} from '../../../../core/models/attendance.models';
import { RejectRequestDialogComponent } from '../reject-request-dialog/reject-request-dialog.component';
import { ManagerOverrideDialogComponent, ManagerOverrideDialogData } from '../manager-override-dialog/manager-override-dialog.component';

export interface EmployeeReviewDetailDialogData {
  package: EmployeeReviewPackage;
  timesheetId: string;
  employeeId: string;
}

interface MonthlyDayRecord extends DailyReviewRecord {
  dayOfMonth: number;
  dayName: string;
  isWeekend: boolean;
  hasRecord: boolean;
}

@Component({
  selector: 'app-employee-review-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './employee-review-detail-dialog.component.html',
  styleUrls: ['./employee-review-detail-dialog.component.scss']
})
export class EmployeeReviewDetailDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  pkg: EmployeeReviewPackage;
  monthlyRecords: MonthlyDayRecord[] = [];
  processingRequestIds = new Set<string>();
  isLoading = false;
  loadError: string | null = null;
  
  displayedColumns: string[] = [
    'day',
    'original',
    'requested',
    'reason',
    'status',
    'actions'
  ];

  constructor(
    public dialogRef: MatDialogRef<EmployeeReviewDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EmployeeReviewDetailDialogData,
    private attendanceService: AttendanceService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {
    this.pkg = data.package;
  }

  ngOnInit(): void {
    // Load fresh data from API if timesheetId and employeeId are provided
    if (this.data.timesheetId && this.data.employeeId) {
      this.loadEmployeeReviewData();
    } else {
      // Fall back to using passed data
      this.buildMonthlyRecords();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Load employee review data from API
  private loadEmployeeReviewData(): void {
    this.isLoading = true;
    this.loadError = null;

    this.attendanceService.getEmployeeReviewPackage(this.data.timesheetId, this.data.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (pkg) => {
          this.pkg = pkg;
          this.buildMonthlyRecords();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading employee review data:', error);
          this.loadError = error?.error?.message || error?.message || 'Failed to load employee review data';
          this.isLoading = false;
          
          // Fall back to passed data if API fails
          if (this.data.package) {
            this.pkg = this.data.package;
            this.buildMonthlyRecords();
            this.loadError = null;
          }
        }
      });
  }

  // Refresh data after an action
  refreshData(): void {
    if (this.data.timesheetId && this.data.employeeId) {
      this.loadEmployeeReviewData();
    }
  }

  // Build full month's records (1st to 30/31st) using getDailyRecordsForMonth logic
  private buildMonthlyRecords(): void {
    // Handle case where pkg might not have valid month/year
    if (!this.pkg.month || !this.pkg.year) {
      // Use current month/year as fallback
      const now = new Date();
      this.pkg.month = now.getMonth() + 1;
      this.pkg.year = now.getFullYear();
    }
    
    const month = this.pkg.month;
    const year = this.pkg.year;
    const daysInMonth = new Date(year, month, 0).getDate();
    
    this.monthlyRecords = [];
    
    // Get daily records from fullMonthRecords or dailyRecords (API might return either)
    const sourceRecords = (this.pkg as any).fullMonthRecords || this.pkg.dailyRecords || [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month - 1, day);
      const dateStr = this.formatDateString(dateObj);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      
      // Find existing record for this day
      const existingRecord = sourceRecords.find((r: DailyReviewRecord) => {
        const recordDate = new Date(r.workDate);
        return recordDate.getDate() === day && 
               recordDate.getMonth() === month - 1 && 
               recordDate.getFullYear() === year;
      });
      
      if (existingRecord) {
        this.monthlyRecords.push({
          ...existingRecord,
          dayOfMonth: day,
          dayName: dayName,
          isWeekend: isWeekend,
          hasRecord: true
        });
      } else {
        // Create empty record for this day
        this.monthlyRecords.push({
          recordId: '',
          attendanceId: '',
          workDate: dateStr,
          originalCheckIn: undefined,
          originalCheckOut: undefined,
          originalStatus: 'No Record',
          originalTotalHours: 0,
          hasPendingRequest: false,
          isFinalized: false,
          dayOfMonth: day,
          dayName: dayName,
          isWeekend: isWeekend,
          hasRecord: false
        });
      }
    }
  }

  // Check if there are any records with actual data
  hasAnyRecords(): boolean {
    return this.monthlyRecords.some(r => r.hasRecord);
  }

  private formatDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Check if row should be highlighted (has pending request)
  shouldHighlightRow(record: MonthlyDayRecord): boolean {
    return this.isPendingRequest(record) || this.hasRequestedChanges(record);
  }

  hasRequestedChanges(record: MonthlyDayRecord): boolean {
    return !!(record.requestedCheckIn || record.requestedCheckOut || record.requestedStatus);
  }

  // Check if the record has a pending request (requestStatus === 'pending')
  isPendingRequest(record: MonthlyDayRecord): boolean {
    return record.requestStatus === 'pending' || record.hasPendingRequest;
  }

  // Check if record is untouched (no pending request, not finalized, has a record)
  isUntouchedRecord(record: MonthlyDayRecord): boolean {
    return record.hasRecord && 
           !record.isFinalized && 
           (record.requestStatus === 'none' || (!record.hasPendingRequest && !record.requestStatus));
  }

  // Approve a single correction request
  approveRequest(record: MonthlyDayRecord): void {
    if (!record.requestId) return;

    const dto: ProcessAttendanceRequestDto = {
      requestId: record.requestId,
      isApproved: true
    };

    this.processRequest(dto, 'approved', record);
  }

  // Reject a single correction request
  rejectRequest(record: MonthlyDayRecord): void {
    if (!record.requestId) return;

    const dialogRef = this.dialog.open(RejectRequestDialogComponent, {
      width: '550px',
      data: {
        employeeName: this.pkg.employeeName,
        workDate: this.formatDisplayDate(record.workDate)
      }
    });

    dialogRef.afterClosed().subscribe(rejectionReason => {
      if (rejectionReason && record.requestId) {
        const dto: ProcessAttendanceRequestDto = {
          requestId: record.requestId,
          isApproved: false,
          rejectionReason: rejectionReason
        };

        this.processRequest(dto, 'rejected', record);
      }
    });
  }

  // Open manager override dialog
  openManagerOverride(record: MonthlyDayRecord): void {
    const dialogData: ManagerOverrideDialogData = {
      record: record,
      timesheetId: this.pkg.timesheetId,
      employeeName: this.pkg.employeeName
    };

    const dialogRef = this.dialog.open(ManagerOverrideDialogComponent, {
      width: '550px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh data after manager override
        this.refreshData();
      }
    });
  }

  private processRequest(dto: ProcessAttendanceRequestDto, action: string, record: MonthlyDayRecord): void {
    this.processingRequestIds.add(dto.requestId);
    
    this.attendanceService.processEditRequest(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          this.processingRequestIds.delete(dto.requestId);
          
          if (success) {
            this.notificationService.showSuccess(`Request ${action} successfully`);
            
            // Update local record
            record.hasPendingRequest = false;
            record.requestStatus = action === 'approved' ? 'approved' : 'rejected';
            
            // Update package counts
            this.pkg.pendingRequestCount = Math.max(0, this.pkg.pendingRequestCount - 1);
            if (action === 'approved') {
              this.pkg.approvedCount++;
            } else {
              this.pkg.rejectedCount++;
            }

            // Refresh data from API for accuracy
            this.refreshData();
          } else {
            this.notificationService.showError(`Failed to ${action} request`);
          }
        },
        error: (error) => {
          this.processingRequestIds.delete(dto.requestId);
          console.error(`Error ${action} request:`, error);
          const errorMessage = error?.error?.message || error?.message || `Failed to ${action} request`;
          this.notificationService.showError(errorMessage);
        }
      });
  }

  isProcessing(requestId?: string): boolean {
    return requestId ? this.processingRequestIds.has(requestId) : false;
  }

  formatTime(dateTime?: string): string {
    if (!dateTime) return '—';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDisplayDate(date?: string): string {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  getMonthYearDisplay(): string {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[this.pkg.month - 1]} ${this.pkg.year}`;
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'present':
        return 'badge-success';
      case 'absent':
        return 'badge-error';
      case 'late':
        return 'badge-warning';
      case 'half_day':
        return 'badge-info';
      case 'on_leave':
        return 'badge-primary';
      case 'no record':
        return 'badge-secondary';
      default:
        return 'badge-secondary';
    }
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
