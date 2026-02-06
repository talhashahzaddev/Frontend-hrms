import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
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
import { EmployeeReviewDetailDialogComponent, EmployeeReviewDetailDialogData } from '../employee-review-detail-dialog/employee-review-detail-dialog.component';

@Component({
  selector: 'app-attendance-approvals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatExpansionModule,
    MatBadgeModule,
    MatDividerModule
  ],
  templateUrl: './attendance-approvals.component.html',
  styleUrls: ['./attendance-approvals.component.scss']
})
export class AttendanceApprovalsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  employeePackages: EmployeeReviewPackage[] = [];
  selectedTimesheetId: string = '';
  isLoading = false;
  processingRequestIds = new Set<string>(); // Track which individual requests are being processed
  processingPackageIds = new Set<string>(); // Track which packages are being finalized
  displayedColumns: string[] = [
    'workDate',
    'original',
    'requested',
    'status',
    'actions'
  ];

  constructor(
    private attendanceService: AttendanceService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadManagerReviewDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadManagerReviewDashboard(): void {
    this.isLoading = true;
    
    // First get the active timesheet, then load the review dashboard
    this.attendanceService.getPendingAttendanceRequests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (packages) => {
          // Extract timesheetId from packages if available
          if (packages.length > 0 && packages[0].timesheetId) {
            this.selectedTimesheetId = packages[0].timesheetId;
            this.loadReviewDashboard(this.selectedTimesheetId);
          } else {
            // Fallback to using getPendingAttendanceRequests data converted to review format
            this.employeePackages = this.convertToReviewPackages(packages);
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('Error loading pending requests:', error);
          const errorMessage = error?.message || 'Failed to load pending requests';
          this.notificationService.showError(errorMessage);
          this.isLoading = false;
        }
      });
  }

  private loadReviewDashboard(timesheetId: string): void {
    this.attendanceService.getManagerReviewDashboard(timesheetId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (packages) => {
          this.employeePackages = packages;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading manager review dashboard:', error);
          // Fallback to regular pending requests if new API fails
          this.loadFallbackData();
        }
      });
  }

  private loadFallbackData(): void {
    this.attendanceService.getPendingAttendanceRequests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (packages) => {
          this.employeePackages = this.convertToReviewPackages(packages);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading fallback data:', error);
          this.isLoading = false;
        }
      });
  }

  // Convert old EmployeeSubmissionPackage to new EmployeeReviewPackage format
  private convertToReviewPackages(packages: any[]): EmployeeReviewPackage[] {
    return packages.map(pkg => ({
      employeeId: pkg.employeeId,
      employeeName: pkg.employeeName,
      employeeCode: pkg.employeeCode,
      department: pkg.department,
      designation: pkg.designation,
      timesheetId: pkg.timesheetId,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      totalRecords: pkg.corrections?.length || 0,
      pendingRequestCount: pkg.corrections?.length || 0,
      approvedCount: 0,
      rejectedCount: 0,
      finalizedCount: 0,
      finalizedDays: 0,
      dailyRecords: (pkg.corrections || []).map((c: any) => ({
        recordId: c.requestId,
        attendanceId: c.attendanceId,
        workDate: c.workDate,
        originalCheckIn: c.originalCheckIn,
        originalCheckOut: c.originalCheckOut,
        originalStatus: c.originalStatus,
        originalTotalHours: 0,
        requestedCheckIn: c.requestedCheckIn,
        requestedCheckOut: c.requestedCheckOut,
        requestedStatus: c.requestedStatus,
        requestedNotes: c.requestedNotes,
        reasonForEdit: c.reasonForEdit,
        hasPendingRequest: true,
        isFinalized: false,
        requestId: c.requestId
      }))
    }));
  }

  // Get total count of all pending corrections
  getTotalPendingCount(): number {
    return this.employeePackages.reduce((sum, pkg) => sum + pkg.pendingRequestCount, 0);
  }

  // Get total records count
  getTotalRecordsCount(): number {
    return this.employeePackages.reduce((sum, pkg) => sum + pkg.totalRecords, 0);
  }

  // Check if row should be highlighted (has pending request)
  shouldHighlightRow(record: DailyReviewRecord): boolean {
    return record.requestedCheckIn !== null && record.requestedCheckIn !== undefined;
  }

  // Approve a single correction request
  approveRequest(pkg: EmployeeReviewPackage, record: DailyReviewRecord): void {
    if (!record.requestId) return;

    const dto: ProcessAttendanceRequestDto = {
      requestId: record.requestId,
      isApproved: true
    };

    this.processRequest(dto, 'approved', pkg.employeeId);
  }

  // Reject a single correction request
  rejectRequest(pkg: EmployeeReviewPackage, record: DailyReviewRecord): void {
    if (!record.requestId) return;

    const dialogRef = this.dialog.open(RejectRequestDialogComponent, {
      width: '550px',
      data: {
        employeeName: pkg.employeeName,
        workDate: this.formatDate(record.workDate)
      }
    });

    dialogRef.afterClosed().subscribe(rejectionReason => {
      if (rejectionReason) {
        const dto: ProcessAttendanceRequestDto = {
          requestId: record.requestId!,
          isApproved: false,
          rejectionReason: rejectionReason
        };

        this.processRequest(dto, 'rejected', pkg.employeeId);
      }
    });
  }

  // Open manager override dialog
  openManagerOverride(pkg: EmployeeReviewPackage, record: DailyReviewRecord): void {
    const dialogData: ManagerOverrideDialogData = {
      record: record,
      timesheetId: pkg.timesheetId,
      employeeName: pkg.employeeName
    };

    const dialogRef = this.dialog.open(ManagerOverrideDialogComponent, {
      width: '550px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh the data
        this.refreshListQuietly();
      }
    });
  }

  // Finalize all approved records for an employee
  finalizeEmployeeApprovals(pkg: EmployeeReviewPackage): void {
    this.processingPackageIds.add(pkg.employeeId);

    this.attendanceService.finalizeEmployeeApprovals(pkg.timesheetId, pkg.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.processingPackageIds.delete(pkg.employeeId);
          this.notificationService.showSuccess(
            `Successfully finalized ${result.finalizedCount} records for ${pkg.employeeName}`
          );
          
          // Refresh to update the UI
          this.refreshListQuietly();
        },
        error: (error) => {
          this.processingPackageIds.delete(pkg.employeeId);
          console.error('Error finalizing employee approvals:', error);
          const errorMessage = error?.error?.message || error?.message || 'Failed to finalize approvals';
          this.notificationService.showError(errorMessage);
        }
      });
  }

  private processRequest(dto: ProcessAttendanceRequestDto, action: string, employeeId: string): void {
    // Add to processing set to disable button
    this.processingRequestIds.add(dto.requestId);
    
    this.attendanceService.processEditRequest(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          this.processingRequestIds.delete(dto.requestId);
          
          if (success) {
            this.notificationService.showSuccess(`Request ${action} successfully`);
            
            // Update the record locally
            this.employeePackages = this.employeePackages.map(pkg => {
              if (pkg.employeeId === employeeId) {
                return {
                  ...pkg,
                  pendingRequestCount: Math.max(0, pkg.pendingRequestCount - 1),
                  approvedCount: action === 'approved' ? pkg.approvedCount + 1 : pkg.approvedCount,
                  dailyRecords: pkg.dailyRecords.map(r => {
                    if (r.requestId === dto.requestId) {
                      return {
                        ...r,
                        hasPendingRequest: false
                      };
                    }
                    return r;
                  })
                };
              }
              return pkg;
            });
            
            // Also refresh from server to ensure sync
            this.refreshListQuietly();
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

  // Refresh list without showing loading spinner (for background sync)
  private refreshListQuietly(): void {
    if (this.selectedTimesheetId) {
      this.attendanceService.getManagerReviewDashboard(this.selectedTimesheetId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (packages) => {
            this.employeePackages = packages;
          },
          error: (error) => {
            console.error('Error refreshing dashboard:', error);
          }
        });
    } else {
      this.attendanceService.getPendingAttendanceRequests()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (packages) => {
            this.employeePackages = this.convertToReviewPackages(packages);
          },
          error: (error) => {
            console.error('Error refreshing pending requests:', error);
          }
        });
    }
  }

  isProcessing(requestId?: string): boolean {
    return requestId ? this.processingRequestIds.has(requestId) : false;
  }

  isPackageProcessing(employeeId: string): boolean {
    return this.processingPackageIds.has(employeeId);
  }

  formatTime(dateTime?: string): string {
    if (!dateTime) return '—';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateTime(dateTime?: string): string {
    if (!dateTime) return '—';
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDate(date?: string): string {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  formatHours(hours?: number): string {
    if (hours === null || hours === undefined) return '0h';
    return `${hours.toFixed(1)}h`;
  }

  getStatusChipClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'present':
        return 'status-present';
      case 'absent':
        return 'status-absent';
      case 'late':
        return 'status-late';
      case 'half_day':
        return 'status-half_day';
      case 'on_leave':
        return 'status-on_leave';
      default:
        return 'status-pending';
    }
  }

  hasRequestedChanges(record: DailyReviewRecord): boolean {
    return !!(record.requestedCheckIn || record.requestedCheckOut || record.requestedStatus);
  }

  // Open the employee review detail dialog
  viewEmployeeDetails(pkg: EmployeeReviewPackage): void {
    // Use pkg.timesheetId if available, otherwise fall back to selectedTimesheetId
    const timesheetId = pkg.timesheetId || this.selectedTimesheetId;
    
    if (!timesheetId) {
      this.notificationService.showError('Cannot open details: No valid timesheet found');
      return;
    }
    
    const dialogData: EmployeeReviewDetailDialogData = {
      package: pkg,
      timesheetId: timesheetId,
      employeeId: pkg.employeeId
    };

    const dialogRef = this.dialog.open(EmployeeReviewDetailDialogComponent, {
      width: '1000px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'review-detail-dialog-panel',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      // Always refresh after closing to capture any changes made in the dialog
      this.refreshListQuietly();
    });
  }

  // Get month/year display string
  getMonthYearDisplay(pkg: EmployeeReviewPackage): string {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[pkg.month - 1]} ${pkg.year}`;
  }

  // Calculate progress percentage for an employee package
  getProgressPercentage(pkg: EmployeeReviewPackage): number {
    if (pkg.totalRecords === 0) return 0;
    return Math.round(((pkg.approvedCount + pkg.finalizedCount) / pkg.totalRecords) * 100);
  }

  // Check if package has any pending requests
  hasPendingRequests(pkg: EmployeeReviewPackage): boolean {
    return pkg.pendingRequestCount > 0;
  }

  // Check if package can be finalized
  canFinalize(pkg: EmployeeReviewPackage): boolean {
    return pkg.pendingRequestCount === 0 && pkg.approvedCount > 0;
  }
}
