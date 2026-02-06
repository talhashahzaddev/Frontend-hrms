import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AttendanceService } from '../../services/attendance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  EmployeeReviewPackage, 
  DailyReviewRecord, 
  ProcessAttendanceRequestDto,
  MonthlyTimesheetSummary,
  OrgSubmissionProgress
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
    MatProgressBarModule,
    MatTooltipModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatExpansionModule,
    MatBadgeModule,
    MatDividerModule,
    MatSidenavModule,
    MatListModule
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
  
  // Task 1: Org-Wide Compliance Progress
  orgProgress: OrgSubmissionProgress | null = null;
  currentMonth: number = new Date().getMonth() + 1;
  currentYear: number = new Date().getFullYear();
  
  // Task 3: Historical Periods Toggle
  showHistoryDrawer = false;
  archivedSnapshots: MonthlyTimesheetSummary[] = [];
  isLoadingSnapshots = false;
  
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
    this.loadOrgProgress();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Task 1: Load org-wide submission progress
  loadOrgProgress(): void {
    this.attendanceService.getOrgSubmissionProgress(this.currentMonth, this.currentYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (progress) => {
          this.orgProgress = progress;
        },
        error: (error) => {
          console.error('Error loading org progress:', error);
          // Non-critical, don't show error to user
        }
      });
  }

  // Task 3: Toggle history drawer
  toggleHistoryDrawer(): void {
    this.showHistoryDrawer = !this.showHistoryDrawer;
    if (this.showHistoryDrawer && this.archivedSnapshots.length === 0) {
      this.loadArchivedSnapshots();
    }
  }

  // Task 3: Load historical snapshots
  loadArchivedSnapshots(): void {
    this.isLoadingSnapshots = true;
    this.attendanceService.getSnapshots()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (snapshots) => {
          // Filter to only show past months (archived)
          this.archivedSnapshots = snapshots.filter(s => 
            s.year < this.currentYear || 
            (s.year === this.currentYear && s.month < this.currentMonth)
          );
          this.isLoadingSnapshots = false;
        },
        error: (error) => {
          console.error('Error loading archived snapshots:', error);
          this.isLoadingSnapshots = false;
        }
      });
  }

  // Task 1: Select a historical period - update ID binding immediately
  selectHistoricalPeriod(snapshot: MonthlyTimesheetSummary): void {
    // Task 1: Immediately update selectedTimesheetId with the snapshot's ID
    const emptyGuid = '00000000-0000-0000-0000-000000000000';
    if (!snapshot.timesheetId || snapshot.timesheetId === emptyGuid) {
      console.error('❌ Invalid timesheetId in snapshot:', snapshot);
      this.notificationService.showError('Cannot load this period: Invalid timesheet ID.');
      return;
    }
    
    console.log('📅 Switching to historical period:', {
      month: snapshot.month,
      year: snapshot.year,
      timesheetId: snapshot.timesheetId
    });
    
    this.selectedTimesheetId = snapshot.timesheetId;
    this.currentMonth = snapshot.month;
    this.currentYear = snapshot.year;
    this.showHistoryDrawer = false;
    this.isLoading = true;
    
    // Task 2: Explicitly trigger the dashboard reload with the new ID
    this.loadReviewDashboard(snapshot.timesheetId);
    this.loadOrgProgress();
  }

  // Reset to current month (clears selectedTimesheetId so loadManagerReviewDashboard fetches latest)
  resetToCurrentMonth(): void {
    console.log('🔄 Resetting to current month...');
    this.selectedTimesheetId = '';
    this.currentMonth = new Date().getMonth() + 1;
    this.currentYear = new Date().getFullYear();
    this.loadManagerReviewDashboard();
    this.loadOrgProgress();
  }

  // Check if viewing a historical (non-current) period
  isViewingHistoricalPeriod(): boolean {
    const now = new Date();
    return this.currentMonth !== (now.getMonth() + 1) || this.currentYear !== now.getFullYear();
  }

  loadManagerReviewDashboard(): void {
    this.isLoading = true;
    
    // Task 1 & 2: If we already have a valid selectedTimesheetId (from historical selection),
    // use it directly instead of fetching snapshots again
    const emptyGuid = '00000000-0000-0000-0000-000000000000';
    if (this.selectedTimesheetId && this.selectedTimesheetId !== emptyGuid) {
      console.log('📋 Using existing selectedTimesheetId:', this.selectedTimesheetId);
      this.loadReviewDashboard(this.selectedTimesheetId);
      return;
    }
    
    // First get snapshots to ensure we have valid timesheetIds
    this.attendanceService.getSnapshots()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (snapshots) => {
          // Get the most recent snapshot's timesheetId
          if (snapshots.length > 0) {
            const latestSnapshot = snapshots[0]; // Assuming sorted by date desc
            this.selectedTimesheetId = latestSnapshot.timesheetId;
            // Also update current month/year to match the snapshot
            this.currentMonth = latestSnapshot.month;
            this.currentYear = latestSnapshot.year;
            
            // Validate timesheetId before proceeding
            const emptyGuid = '00000000-0000-0000-0000-000000000000';
            if (!this.selectedTimesheetId || this.selectedTimesheetId === emptyGuid) {
              console.warn('⚠️ WARNING: selectedTimesheetId is null or empty GUID from snapshots', {
                timesheetId: this.selectedTimesheetId,
                snapshot: latestSnapshot
              });
              this.loadFallbackWithPendingRequests();
              return;
            }
            
            console.log('📋 Loading review dashboard with timesheetId:', this.selectedTimesheetId);
            this.loadReviewDashboard(this.selectedTimesheetId);
          } else {
            // Fallback to pending requests if no snapshots
            this.loadFallbackWithPendingRequests();
          }
        },
        error: (error) => {
          console.error('Error loading snapshots:', error);
          // Fallback to pending requests method
          this.loadFallbackWithPendingRequests();
        }
      });
  }

  private loadFallbackWithPendingRequests(): void {
    this.attendanceService.getPendingAttendanceRequests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (packages) => {
          // Extract timesheetId from packages if available
          if (packages.length > 0 && packages[0].timesheetId) {
            const emptyGuid = '00000000-0000-0000-0000-000000000000';
            if (packages[0].timesheetId !== emptyGuid) {
              this.selectedTimesheetId = packages[0].timesheetId;
              this.loadReviewDashboard(this.selectedTimesheetId);
              return;
            }
          }
          // Fallback to using getPendingAttendanceRequests data converted to review format
          this.employeePackages = this.convertToReviewPackages(packages);
          this.isLoading = false;
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
      timesheetId: pkg.timesheetId || this.selectedTimesheetId,
      month: this.currentMonth,
      year: this.currentYear,
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
    // Task 3: Prioritize the component's selectedTimesheetId (reflects current view state)
    // Only fall back to pkg.timesheetId if selectedTimesheetId is invalid
    const emptyGuid = '00000000-0000-0000-0000-000000000000';
    const hasValidSelectedId = this.selectedTimesheetId && this.selectedTimesheetId !== emptyGuid;
    const hasValidPkgId = pkg.timesheetId && pkg.timesheetId !== emptyGuid;
    
    // Use selectedTimesheetId first (current view state), then pkg.timesheetId as fallback
    let timesheetId = hasValidSelectedId ? this.selectedTimesheetId : (hasValidPkgId ? pkg.timesheetId : '');
    
    if (timesheetId === emptyGuid) timesheetId = '';
    
    // If no valid timesheetId, we can still open the dialog if we have the package data
    // This allows viewing details for pending requests even without a finalized snapshot
    if (!timesheetId) {
      console.warn('⚠️ No valid timesheetId found. Opening dialog in fallback mode with package data.', {
        pkgTimesheetId: pkg.timesheetId,
        selectedTimesheetId: this.selectedTimesheetId,
        employeeId: pkg.employeeId
      });
    }
    
    console.log('📋 Opening employee detail dialog with:', {
      timesheetId: timesheetId,
      employeeId: pkg.employeeId,
      employeeName: pkg.employeeName
    });
    
    const dialogData: EmployeeReviewDetailDialogData = {
      package: pkg,
      timesheetId: timesheetId,
      employeeId: pkg.employeeId
    };

    const dialogRef = this.dialog.open(EmployeeReviewDetailDialogComponent, {
      width: '90vw',
      maxWidth: '1200px', // Increased max-width for better visibility
      maxHeight: '90vh',
      panelClass: 'review-detail-dialog-panel',
      data: dialogData,
      autoFocus: false // Prevent auto-focusing which might cause scrolling issues
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

  // ============================================================
  // Task 2: Employee Status Symbol Helpers
  // ============================================================
  
  /**
   * Get the status icon for an employee package
   * ⚪ Untouched (no activity yet)
   * 🔵 In Progress (has drafts or pending)
   * 🟡 Pending Review (submitted, awaiting manager action)
   * 🔒 Finalized (locked for payroll)
   */
  getEmployeeStatusIcon(pkg: EmployeeReviewPackage): string {
    if (pkg.isFinalized) {
      return 'lock';
    }
    if (pkg.hasPendingRequest) {
      return 'hourglass_top';
    }
    if (pkg.hasDraftRequest) {
      return 'edit_note';
    }
    if (pkg.isUntouched) {
      return 'radio_button_unchecked';
    }
    // Default for in-progress records
    if (pkg.pendingRequestCount > 0 || pkg.approvedCount > 0) {
      return 'pending';
    }
    return 'radio_button_unchecked';
  }

  /**
   * Get the CSS class for the status icon
   */
  getEmployeeStatusClass(pkg: EmployeeReviewPackage): string {
    if (pkg.isFinalized) {
      return 'status-finalized';
    }
    if (pkg.hasPendingRequest) {
      return 'status-pending-review';
    }
    if (pkg.hasDraftRequest) {
      return 'status-in-progress';
    }
    if (pkg.isUntouched) {
      return 'status-untouched';
    }
    if (pkg.pendingRequestCount > 0 || pkg.approvedCount > 0) {
      return 'status-in-progress';
    }
    return 'status-untouched';
  }

  /**
   * Get the tooltip text for status icon
   */
  getEmployeeStatusTooltip(pkg: EmployeeReviewPackage): string {
    if (pkg.isFinalized) {
      return 'Finalized - Locked for payroll';
    }
    if (pkg.hasPendingRequest) {
      return 'Pending Review - Awaiting manager action';
    }
    if (pkg.hasDraftRequest) {
      return 'In Progress - Has draft corrections';
    }
    if (pkg.isUntouched) {
      return 'Untouched - No attendance activity';
    }
    if (pkg.pendingRequestCount > 0) {
      return `${pkg.pendingRequestCount} request(s) pending`;
    }
    return 'No activity';
  }

  // ============================================================
  // Task 5: Heat Map Border Helpers
  // ============================================================
  
  /**
   * Get border class for heat map visual indicators
   * Red border near month end if untouched
   * Green border if finalized
   * Yellow border if pending review
   */
  getHeatMapBorderClass(pkg: EmployeeReviewPackage): string {
    if (pkg.isFinalized) {
      return 'heat-border-finalized';
    }
    if (pkg.hasPendingRequest) {
      return 'heat-border-pending';
    }
    if (pkg.isUntouched && this.isNearMonthEnd()) {
      return 'heat-border-urgent';
    }
    if (pkg.hasDraftRequest) {
      return 'heat-border-draft';
    }
    return '';
  }

  /**
   * Check if current date is within last 5 days of the month
   */
  isNearMonthEnd(): boolean {
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return today.getDate() >= lastDayOfMonth - 5;
  }

  /**
   * Get attendance percentage display
   */
  getAttendanceDisplay(pkg: EmployeeReviewPackage): string {
    if (pkg.attendancePercentage !== undefined && pkg.attendancePercentage !== null) {
      return `${pkg.attendancePercentage.toFixed(0)}%`;
    }
    return '—';
  }

  /**
   * Get current month/year as a display string
   */
  getCurrentPeriodDisplay(): string {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[this.currentMonth - 1]} ${this.currentYear}`;
  }
}
