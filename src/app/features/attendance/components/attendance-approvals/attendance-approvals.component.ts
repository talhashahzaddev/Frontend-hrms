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
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RouterLink } from '@angular/router';

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

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

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
    MatListModule,
    RouterLink
  ],
  templateUrl: './attendance-approvals.component.html',
  styleUrls: ['./attendance-approvals.component.scss']
})
export class AttendanceApprovalsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  employeePackages: EmployeeReviewPackage[] = [];
  filteredPackages: EmployeeReviewPackage[] = [];
  searchText: string = '';
  selectedTimesheetId: string = '';
  isLoading = false;

  /** Track which individual correction requests are being processed */
  processingRequestIds = new Set<string>();
  /** Track which employee packages are being finalized / bulk-approved */
  processingPackageIds = new Set<string>();

  // Ã¢â€â‚¬Ã¢â€â‚¬ Org-Wide Compliance Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  orgProgress: OrgSubmissionProgress | null = null;
  currentMonth: number = new Date().getMonth() + 1;
  currentYear: number = new Date().getFullYear();

  // Ã¢â€â‚¬Ã¢â€â‚¬ History Drawer Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  showHistoryDrawer = false;
  allSnapshots: MonthlyTimesheetSummary[] = [];
  isLoadingSnapshots = false;

  // Ã¢â€â‚¬Ã¢â€â‚¬ Table columns (kept for any future table views) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  displayedColumns: string[] = ['workDate', 'original', 'requested', 'status', 'actions'];

  constructor(
    private attendanceService: AttendanceService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.bootstrapDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyPackageFilter(): void {
    const q = this.searchText.trim().toLowerCase();
    if (!q) {
      this.filteredPackages = [...this.employeePackages];
      return;
    }
    this.filteredPackages = this.employeePackages.filter(pkg =>
      pkg.employeeName.toLowerCase().includes(q) ||
      (pkg.employeeCode || '').toLowerCase().includes(q) ||
      (pkg.department || '').toLowerCase().includes(q) ||
      pkg.employeeId.toLowerCase().includes(q)
    );
  }

  // =========================================================================
  // BOOTSTRAP FLOW
  // Always start by fetching snapshots Ã¢â€ â€™ pick latest Ã¢â€ â€™ load review dashboard
  // =========================================================================

  /**
   * Primary bootstrap: fetches all snapshots, auto-selects the most-recent
   * one, then loads the review dashboard with that timesheetId.
   * Only falls back to pending-requests when no snapshots exist at all.
   */
  private bootstrapDashboard(): void {
    this.isLoading = true;

    this.attendanceService.getSnapshots()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (snapshots) => {
          // Sort descending by year Ã¢â€ â€™ month so index 0 is always most recent
          this.allSnapshots = [...snapshots].sort((a, b) =>
            b.year !== a.year ? b.year - a.year : b.month - a.month
          );

          if (this.allSnapshots.length === 0) {
            this.loadFallbackWithPendingRequests();
            return;
          }

          const latest = this.allSnapshots[0];

          if (!latest.timesheetId || latest.timesheetId === EMPTY_GUID) {
            console.warn('Ã¢Å¡Â Ã¯Â¸Â Latest snapshot has invalid timesheetId:', latest);
            this.loadFallbackWithPendingRequests();
            return;
          }

          this.selectedTimesheetId = latest.timesheetId;
          this.currentMonth = latest.month;
          this.currentYear = latest.year;

          this.loadReviewDashboard(this.selectedTimesheetId);
        },
        error: (err) => {
          console.error('Error fetching snapshots during bootstrap:', err);
          this.loadFallbackWithPendingRequests();
        }
      });
  }

  // =========================================================================
  // PUBLIC RELOAD / NAVIGATION METHODS
  // =========================================================================

  /** Called by the Refresh button and after dialog closes */
  loadManagerReviewDashboard(): void {
    if (this.selectedTimesheetId && this.selectedTimesheetId !== EMPTY_GUID) {
      this.isLoading = true;
      this.loadReviewDashboard(this.selectedTimesheetId);
    } else {
      this.bootstrapDashboard();
    }
  }

  /** Switch to a historical snapshot from the drawer */
  selectHistoricalPeriod(snapshot: MonthlyTimesheetSummary): void {
    if (!snapshot.timesheetId || snapshot.timesheetId === EMPTY_GUID) {
      this.notificationService.showError('Cannot load this period: Invalid timesheet ID.');
      return;
    }

    this.selectedTimesheetId = snapshot.timesheetId;
    this.currentMonth = snapshot.month;
    this.currentYear = snapshot.year;
    this.showHistoryDrawer = false;
    this.isLoading = true;

    this.loadReviewDashboard(snapshot.timesheetId);
  }

  /** Return to the most-recent snapshot */
  resetToCurrentMonth(): void {
    this.selectedTimesheetId = '';
    this.currentMonth = new Date().getMonth() + 1;
    this.currentYear = new Date().getFullYear();
    this.bootstrapDashboard();
  }

  /** Toggle the history side-drawer; lazily load snapshots list */
  toggleHistoryDrawer(): void {
    this.showHistoryDrawer = !this.showHistoryDrawer;
    if (this.showHistoryDrawer && this.allSnapshots.length === 0) {
      this.loadAllSnapshots();
    }
  }

  // =========================================================================
  // PRIVATE LOAD HELPERS
  // =========================================================================

  private loadReviewDashboard(timesheetId: string): void {
    this.attendanceService.getManagerReviewDashboard(timesheetId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (packages) => {
          this.employeePackages = packages;
          this.employeePackages.forEach(pkg => this.recalculatePackageSummary(pkg));
          this.applyPackageFilter();
          this.isLoading = false;
          this.loadOrgProgress();
        },
        error: (err) => {
          console.error('Error loading manager review dashboard:', err);
          this.loadFallbackData();
        }
      });
  }

  private loadAllSnapshots(): void {
    this.isLoadingSnapshots = true;
    this.attendanceService.getSnapshots()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (snapshots) => {
          this.allSnapshots = [...snapshots].sort((a, b) =>
            b.year !== a.year ? b.year - a.year : b.month - a.month
          );
          this.isLoadingSnapshots = false;
        },
        error: (err) => {
          console.error('Error loading snapshots:', err);
          this.isLoadingSnapshots = false;
        }
      });
  }

  private loadOrgProgress(): void {
    this.attendanceService.getOrgSubmissionProgress(this.currentMonth, this.currentYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (progress) => { this.orgProgress = progress; },
        error: (err) => { console.error('Error loading org progress:', err); }
      });
  }

  private loadFallbackWithPendingRequests(): void {
    this.attendanceService.getPendingAttendanceRequests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (packages) => {
          // If any package carries a real timesheetId, pivot to the real dashboard
          const firstValidId = packages.find(
            p => p.timesheetId && p.timesheetId !== EMPTY_GUID
          )?.timesheetId;

          if (firstValidId) {
            this.selectedTimesheetId = firstValidId;
            this.loadReviewDashboard(firstValidId);
            return;
          }

          this.employeePackages = this.convertToReviewPackages(packages);
          this.employeePackages.forEach(pkg => this.recalculatePackageSummary(pkg));
          this.applyPackageFilter();
          this.isLoading = false;
          this.loadOrgProgress();
        },
        error: (err) => {
          console.error('Error loading pending requests:', err);
          this.notificationService.showError(err?.message || 'Failed to load pending requests');
          this.isLoading = false;
        }
      });
  }

  private loadFallbackData(): void {
    this.attendanceService.getPendingAttendanceRequests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (packages) => {
          this.employeePackages = this.convertToReviewPackages(packages);
          this.employeePackages.forEach(pkg => this.recalculatePackageSummary(pkg));
          this.applyPackageFilter();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading fallback data:', err);
          this.isLoading = false;
        }
      });
  }

  /** Silent background refresh after any mutation */
  private refreshListQuietly(): void {
    const id = this.selectedTimesheetId;
    if (id && id !== EMPTY_GUID) {
      this.attendanceService.getManagerReviewDashboard(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (packages) => {
            this.employeePackages = packages;
            this.employeePackages.forEach(pkg => this.recalculatePackageSummary(pkg));
            this.applyPackageFilter();
            this.loadOrgProgress();
          },
          error: (err) => console.error('Silent refresh failed:', err)
        });
    } else {
      this.attendanceService.getPendingAttendanceRequests()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (packages) => {
            this.employeePackages = this.convertToReviewPackages(packages);
            this.applyPackageFilter();
            this.loadOrgProgress();
          },
          error: (err) => console.error('Silent refresh (pending) failed:', err)
        });
    }
  }

  // =========================================================================
  // MANAGER ACTIONS
  // =========================================================================

  approveRequest(pkg: EmployeeReviewPackage, record: DailyReviewRecord): void {
    if (!record.requestId) return;
    const dto: ProcessAttendanceRequestDto = { requestId: record.requestId, isApproved: true };
    this.processRequest(dto, 'approved', pkg.employeeId);
  }

  rejectRequest(pkg: EmployeeReviewPackage, record: DailyReviewRecord): void {
    if (!record.requestId) return;

    const dialogRef = this.dialog.open(RejectRequestDialogComponent, {
      width: '550px',
      data: { employeeName: pkg.employeeName, workDate: this.formatDate(record.date) }
    });

    dialogRef.afterClosed().subscribe(rejectionReason => {
      if (rejectionReason) {
        const dto: ProcessAttendanceRequestDto = {
          requestId: record.requestId!,
          isApproved: false,
          rejectionReason
        };
        this.processRequest(dto, 'rejected', pkg.employeeId);
      }
    });
  }

  openManagerOverride(pkg: EmployeeReviewPackage, record: DailyReviewRecord): void {
    const timesheetId = this.resolveTimesheetId(pkg);
    const dialogData: ManagerOverrideDialogData = {
      record,
      timesheetId,
      employeeId: pkg.employeeId,
      employeeName: pkg.employeeName
    };

    const dialogRef = this.dialog.open(ManagerOverrideDialogComponent, {
      width: '550px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result?.success) return;

      // Optimistic local update — use the VALUES the manager just entered
      // (result.checkInTime / checkOutTime / status), NOT the old employee
      // request fields (record.requestedCheckIn etc.) which may differ.
      const updatedRecord = pkg.fullMonthRecords.find(
        r => r.date?.split('T')[0] === record.date?.split('T')[0]
      );
      if (updatedRecord) {
        // Replace displayed times with the override values.
        if (result.checkInTime)  updatedRecord.originalCheckIn  = result.checkInTime;
        if (result.checkOutTime) updatedRecord.originalCheckOut = result.checkOutTime;
        if (result.status)       updatedRecord.originalStatus   = result.status;

        // Clear pending request — the override supersedes it.
        updatedRecord.hasPendingRequest = false;
        updatedRecord.requestStatus     = 'approved';

        // Mark as manager override (drives the amber badge).
        (updatedRecord as any).isManagerOverride = true;

        // Override does NOT set isFinalized — that is a separate explicit action.
        // Do NOT set updatedRecord.isFinalized = true here.
      }

      // Update package-level counters optimistically.
      if ((pkg.pendingRequestCount || 0) > 0) {
        pkg.pendingRequestCount = Math.max(0, (pkg.pendingRequestCount || 0) - 1);
      }
      if (pkg.pendingRequestCount === 0) {
        pkg.hasPendingRequest = false;
      }

      this.refreshListQuietly();
    });
  }

  approveAllForEmployee(pkg: EmployeeReviewPackage): void {
    const timesheetId = this.resolveTimesheetId(pkg);
    this.processingPackageIds.add(pkg.employeeId);

    this.attendanceService.approveAllPendingRequests(timesheetId, pkg.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.processingPackageIds.delete(pkg.employeeId);
          this.notificationService.showSuccess(
            `Approved ${result.approvedCount} request(s) for ${pkg.employeeName}`
          );
          // Optimistic update
          pkg.fullMonthRecords.forEach(r => {
            if (r.hasPendingRequest) {
              r.hasPendingRequest = false;
              r.requestStatus = 'approved';
            }
          });
          pkg.pendingRequestCount = 0;
          pkg.hasPendingRequest = false;
          pkg.approvedCount = (pkg.approvedCount || 0) + (result.approvedCount || 0);
          this.refreshListQuietly();
        },
        error: (err) => {
          this.processingPackageIds.delete(pkg.employeeId);
          this.notificationService.showError(err?.error?.message || err?.message || 'Failed to approve all requests');
        }
      });
  }

  finalizeEmployeeApprovals(pkg: EmployeeReviewPackage): void {
    // Guard: already fully finalized Ã¢â‚¬â€ nothing to do
    if (pkg.isFinalized) {
      this.notificationService.showError(`${pkg.employeeName}'s records are already finalized.`);
      return;
    }
    // Guard: still has pending requests blocking finalization
    if ((pkg.pendingRequestCount || 0) > 0) {
      this.notificationService.showError('Resolve all pending requests before finalizing.');
      return;
    }

    const timesheetId = this.resolveTimesheetId(pkg);
    this.processingPackageIds.add(pkg.employeeId);

    this.attendanceService.finalizeEmployeeApprovals(timesheetId, pkg.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.processingPackageIds.delete(pkg.employeeId);
          this.notificationService.showSuccess(`Successfully finalized records for ${pkg.employeeName}`);
          // Optimistic update
          pkg.fullMonthRecords.forEach(r => {
            if ((r.originalStatus || '').toLowerCase() !== 'no record') {
              r.isFinalized = true;
              r.hasPendingRequest = false;
            }
          });
          pkg.isFinalized = true;
          this.refreshListQuietly();
        },
        error: (err) => {
          this.processingPackageIds.delete(pkg.employeeId);
          this.notificationService.showError(err?.error?.message || err?.message || 'Failed to finalize approvals');
        }
      });
  }

  viewEmployeeDetails(pkg: EmployeeReviewPackage): void {
    const timesheetId = this.resolveTimesheetId(pkg);

    const dialogData: EmployeeReviewDetailDialogData = {
      package: pkg,
      timesheetId,
      employeeId: pkg.employeeId
    };

    const dialogRef = this.dialog.open(EmployeeReviewDetailDialogComponent, {
      width: '90vw',
      maxWidth: '1200px',
      maxHeight: '90vh',
      panelClass: 'review-detail-dialog-panel',
      data: dialogData,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((result?: { refreshNeeded?: boolean; isFinalized?: boolean }) => {
      // Immediately apply the finalized flag to the local package object so the
      // card updates before the async refresh API call completes (no flicker).
      if (result?.isFinalized) {
        const localPkg = this.employeePackages.find(p => p.employeeId === pkg.employeeId);
        if (localPkg) {
          localPkg.isFinalized = true;
          localPkg.pendingRequestCount = 0;
        }
      }
      this.refreshListQuietly();
    });
  }

  // =========================================================================
  // HELPER: resolve timesheetId with fallback chain
  // =========================================================================

  private resolveTimesheetId(pkg: EmployeeReviewPackage): string {
    if (this.selectedTimesheetId && this.selectedTimesheetId !== EMPTY_GUID) {
      return this.selectedTimesheetId;
    }
    if (pkg.timesheetId && pkg.timesheetId !== EMPTY_GUID) {
      return pkg.timesheetId;
    }
    return '';
  }

  // =========================================================================
  // PROCESS SINGLE REQUEST
  // =========================================================================

  private processRequest(dto: ProcessAttendanceRequestDto, action: string, employeeId: string): void {
    this.processingRequestIds.add(dto.requestId);

    this.attendanceService.processEditRequest(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          this.processingRequestIds.delete(dto.requestId);
          if (success) {
            this.notificationService.showSuccess(`Request ${action} successfully`);
            this.employeePackages = this.employeePackages.map(pkg => {
              if (pkg.employeeId !== employeeId) return pkg;
              return {
                ...pkg,
                pendingRequestCount: Math.max(0, pkg.pendingRequestCount - 1),
                approvedCount: action === 'approved' ? pkg.approvedCount + 1 : pkg.approvedCount,
                fullMonthRecords: pkg.fullMonthRecords.map(r => {
                  if (r.requestId !== dto.requestId) return r;
                  if (action === 'approved') {
                    return {
                      ...r,
                      originalCheckIn: r.requestedCheckIn || r.originalCheckIn,
                      originalCheckOut: r.requestedCheckOut || r.originalCheckOut,
                      originalStatus: r.requestedStatus || r.originalStatus,
                      requestedCheckIn: undefined,
                      requestedCheckOut: undefined,
                      requestedStatus: undefined,
                      reasonForEdit: undefined,
                      hasPendingRequest: false,
                      requestStatus: 'approved'
                    };
                  }
                  return {
                    ...r,
                    requestedCheckIn: undefined,
                    requestedCheckOut: undefined,
                    requestedStatus: undefined,
                    reasonForEdit: undefined,
                    hasPendingRequest: false,
                    requestStatus: 'rejected'
                  };
                })
              };
            });
            this.applyPackageFilter();
            this.refreshListQuietly();
          } else {
            this.notificationService.showError(`Failed to ${action} request`);
          }
        },
        error: (err) => {
          this.processingRequestIds.delete(dto.requestId);
          this.notificationService.showError(err?.error?.message || err?.message || `Failed to ${action} request`);
        }
      });
  }

  // =========================================================================
  // CONVERT LEGACY SUBMISSION PACKAGES Ã¢â€ â€™ REVIEW PACKAGES
  // =========================================================================

  private convertToReviewPackages(packages: any[]): EmployeeReviewPackage[] {
    return packages.map(pkg => {
      const corrections = pkg.corrections || [];
      return {
        employeeId: pkg.employeeId || pkg.EmployeeId,
        employeeName: pkg.employeeName || pkg.EmployeeName,
        employeeCode: pkg.employeeCode || pkg.EmployeeCode,
        department: pkg.department || pkg.Department,
        timesheetId: pkg.timesheetId || pkg.TimesheetId || this.selectedTimesheetId,
        month: this.currentMonth,
        year: this.currentYear,
        totalRecords: corrections.length,
        pendingRequestCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        finalizedCount: 0,
        finalizedDays: 0,
        hasPendingRequest: false,
        fullMonthRecords: corrections.map((c: any): DailyReviewRecord => ({
          recordId: c.requestId || c.RequestId || '',
          attendanceId: c.attendanceId || c.AttendanceId || '',
          date: c.workDate || c.date || '',
          originalCheckIn: c.originalCheckIn || c.checkInTime || undefined,
          originalCheckOut: c.originalCheckOut || c.checkOutTime || undefined,
          originalStatus: c.originalStatus || c.status || 'No Record',
          originalTotalHours: c.originalTotalHours || c.totalHours || 0,
          requestedCheckIn: c.requestedCheckIn || undefined,
          requestedCheckOut: c.requestedCheckOut || undefined,
          requestedStatus: c.requestedStatus || undefined,
          requestedNotes: c.requestedNotes || undefined,
          reasonForEdit: c.reasonForEdit || undefined,
          hasDraftRequest: false,
          hasPendingRequest: !c.status || c.status === 'pending',
          isFinalized: false,
          requestId: c.requestId || c.RequestId || '',
          requestStatus: c.status || 'pending'
        }))
      };
    });
  }

  // =========================================================================
  // RECALCULATE PACKAGE SUMMARY FROM fullMonthRecords
  // =========================================================================

  private recalculatePackageSummary(pkg: EmployeeReviewPackage): void {
    const records = pkg.fullMonthRecords || [];
    let pending = 0, approved = 0, rejected = 0, finalized = 0, hasRecords = 0;
    let hasDraft = false;

    // Statuses that are not real working-day records (excluded from counts and %)
    const NON_WORKDAY = new Set([
      'no record', 'no_record', 'norecord',
      'weekend', 'off', 'offday', 'off_day',
      'holiday', 'public holiday', 'public_holiday'
    ]);

    records.forEach(r => {
      const status = (r.originalStatus || '').toLowerCase().trim();
      const isWorkday = status !== '' && !NON_WORKDAY.has(status);
      if (isWorkday) hasRecords++;

      const reqStatus = (r.requestStatus || '').toLowerCase();
      const isDraft = r.hasDraftRequest === true;

      if (!isDraft && (reqStatus === 'pending' || r.hasPendingRequest)) pending++;
      else if (reqStatus === 'approved') approved++;
      else if (reqStatus === 'rejected') rejected++;

      if (r.isFinalized) finalized++;
      if (r.hasDraftRequest) hasDraft = true;
    });

    pkg.pendingRequestCount = pending;
    pkg.approvedCount       = approved;
    pkg.rejectedCount       = rejected;
    pkg.finalizedCount      = finalized;
    pkg.finalizedDays       = finalized;
    pkg.totalRecords        = hasRecords;

    pkg.hasPendingRequest = pending > 0;
    pkg.hasDraftRequest   = hasDraft;

    // Package is "fully finalized" only when every record that HAS actual
    // attendance data (attendanceId) is locked. Absent-day placeholders never
    // get an attendanceId and are never written to finalized_timesheet_records,
    // so including them would permanently prevent isFinalized from being true.
    const recordsWithAttendance = records.filter(r => !!(r as any).attendanceId);
    pkg.isFinalized = recordsWithAttendance.length > 0
      && recordsWithAttendance.every(r => r.isFinalized);
    pkg.isUntouched = hasRecords === 0 && pending === 0 && approved === 0 && rejected === 0;

    // Always recompute attendance percentage so it stays accurate after
    // overrides, approvals or any other record mutation.
    // Denominator = workday records only (same NON_WORKDAY exclusion as above).
    const presentDays = records.filter(r => {
      const s = (r.originalStatus || '').toLowerCase().trim();
      return s === 'present' || s === 'late' || s === 'half_day' || s === 'half-day' || s === 'halfday';
    }).length;
    pkg.attendancePercentage = hasRecords > 0 ? Math.round((presentDays / hasRecords) * 100) : 0;
  }

  // =========================================================================
  // TEMPLATE HELPER METHODS
  // =========================================================================

  /** Returns true only when viewing a snapshot that is NOT the latest */
  isViewingHistoricalPeriod(): boolean {
    if (this.allSnapshots.length === 0) return false;
    const latest = this.allSnapshots[0];
    return this.selectedTimesheetId !== '' && this.selectedTimesheetId !== latest.timesheetId;
  }

  getCurrentPeriodDisplay(): string {
    const monthNames = ['January','February','March','April','May','June',
      'July','August','September','October','November','December'];
    return `${monthNames[this.currentMonth - 1]} ${this.currentYear}`;
  }

  getMonthYearDisplay(pkg: EmployeeReviewPackage): string {
    const monthNames = ['January','February','March','April','May','June',
      'July','August','September','October','November','December'];
    return `${monthNames[(pkg.month || this.currentMonth) - 1]} ${pkg.year || this.currentYear}`;
  }

  getTotalPendingCount(): number {
    return this.employeePackages.reduce((s, p) => s + p.pendingRequestCount, 0);
  }

  getTotalRecordsCount(): number {
    return this.employeePackages.reduce((s, p) => s + p.totalRecords, 0);
  }

  shouldHighlightRow(record: DailyReviewRecord): boolean {
    return !!(record.requestedCheckIn ?? record.requestedCheckOut ?? record.requestedStatus);
  }

  hasRequestedChanges(record: DailyReviewRecord): boolean {
    return !!(record.requestedCheckIn || record.requestedCheckOut || record.requestedStatus);
  }

  hasPendingRequests(pkg: EmployeeReviewPackage): boolean {
    return (pkg.pendingRequestCount || 0) > 0;
  }

  /**
   * A package can be finalized when:
   *  1. It is NOT already finalized
   *  2. It has zero pending correction requests
   *  3. At least one working-day record exists (something to lock)
   *
   * Note: we do NOT require approvedCount > 0 because a month with no
   * correction requests but present/absent records is still valid to finalize.
   */
  canFinalize(pkg: EmployeeReviewPackage): boolean {
    if (pkg.isFinalized) return false;
    if ((pkg.pendingRequestCount || 0) > 0) return false;
    // Must have at least one record that represents a real working day
    return pkg.fullMonthRecords.some(r => {
      const s = (r.originalStatus || '').toLowerCase().replace(/[_ ]/g, '');
      return s !== 'norecord' && s !== 'weekend';
    });
  }

  isProcessing(requestId?: string): boolean {
    return requestId ? this.processingRequestIds.has(requestId) : false;
  }

  isPackageProcessing(employeeId: string): boolean {
    return this.processingPackageIds.has(employeeId);
  }

  /**
   * Review progress = (approved + finalized) / total records with data.
   * Falls back to 0 when no records exist.
   */
  getProgressPercentage(pkg: EmployeeReviewPackage): number {
    const total = pkg.totalRecords || 0;
    if (total === 0) return 0;
    const reviewed = (pkg.approvedCount || 0) + (pkg.finalizedCount || 0);
    return Math.min(100, Math.round((reviewed / total) * 100));
  }

  getAttendanceDisplay(pkg: EmployeeReviewPackage): string {
    return pkg.attendancePercentage !== undefined && pkg.attendancePercentage !== null
      ? `${(pkg.attendancePercentage as number).toFixed(0)}%`
      : 'Ã¢â‚¬â€';
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Status Icon / Class / Tooltip Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  getEmployeeStatusIcon(pkg: EmployeeReviewPackage): string {
    if (pkg.isFinalized)     return 'lock';
    if (pkg.hasPendingRequest || (pkg.pendingRequestCount || 0) > 0) return 'hourglass_top';
    if (pkg.hasDraftRequest) return 'edit_note';
    return 'radio_button_unchecked';
  }

  getEmployeeStatusClass(pkg: EmployeeReviewPackage): string {
    if (pkg.isFinalized)     return 'status-finalized';
    if (pkg.hasPendingRequest || (pkg.pendingRequestCount || 0) > 0) return 'status-pending-review';
    if (pkg.hasDraftRequest) return 'status-in-progress';
    return 'status-untouched';
  }

  getEmployeeStatusTooltip(pkg: EmployeeReviewPackage): string {
    if (pkg.isFinalized)     return 'Finalized Ã¢â‚¬â€ locked for payroll';
    if (pkg.hasPendingRequest || (pkg.pendingRequestCount || 0) > 0)
      return `Pending Review Ã¢â‚¬â€ ${pkg.pendingRequestCount || 0} request(s) awaiting action`;
    if (pkg.hasDraftRequest) return 'In Progress Ã¢â‚¬â€ has draft corrections (not yet submitted)';
    return 'No activity';
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Heat Map Border Class Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  getHeatMapBorderClass(pkg: EmployeeReviewPackage): string {
    if (pkg.isFinalized)      return 'heat-border-finalized';
    if (pkg.hasPendingRequest) return 'heat-border-pending';
    if (pkg.isUntouched && this.isNearMonthEnd()) return 'heat-border-urgent';
    if (pkg.hasDraftRequest)  return 'heat-border-draft';
    return '';
  }

  isNearMonthEnd(): boolean {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return today.getDate() >= lastDay - 5;
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Status Chip Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  getStatusChipClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'present':   return 'status-present';
      case 'absent':    return 'status-absent';
      case 'late':      return 'status-late';
      case 'half_day':  return 'status-half_day';
      case 'on_leave':  return 'status-on_leave';
      default:          return 'status-pending';
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Formatters Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  formatTime(dateTime?: string): string {
    if (!dateTime) return 'Ã¢â‚¬â€';
    return new Date(dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(date?: string): string {
    if (!date) return 'Ã¢â‚¬â€';
    return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  formatHours(hours?: number): string {
    if (hours === null || hours === undefined) return '0h';
    return `${hours.toFixed(1)}h`;
  }
}