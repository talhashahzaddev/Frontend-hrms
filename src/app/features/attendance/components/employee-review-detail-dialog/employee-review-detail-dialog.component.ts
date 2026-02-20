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
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

import { AttendanceService } from '../../services/attendance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  EmployeeReviewPackage, 
  DailyReviewRecord,
  ProcessAttendanceRequestDto,
  EmployeeSubmissionPackage,
  CorrectionRecord
} from '../../../../core/models/attendance.models';
import { RejectRequestDialogComponent } from '../reject-request-dialog/reject-request-dialog.component';
import { ManagerOverrideDialogComponent, ManagerOverrideDialogData } from '../manager-override-dialog/manager-override-dialog.component';
import { AttendanceRequestDialogComponent } from '../attendance-request-dialog/attendance-request-dialog.component';
import { AuthService } from '../../../../core/services/auth.service';

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
  isFinalizing = false;
  loadError: string | null = null;

  // Keeps manager overrides alive across refreshData() reloads.
  // Keyed by YYYY-MM-DD. Cleared only when the server independently
  // returns isFinalized=true for that date (confirming the BE picked it up).
  private pendingOverrides = new Map<string, {
    checkInTime:  string | null;
    checkOutTime: string | null;
    status:        string | null;
  }>();
  
  displayedColumns: string[] = [
    'day',
    'original',
    'requested',
    'reason',
    'status',
    'actions'
  ];

  // Summary bar getters — always derived from the current monthlyRecords array,
  // so they stay accurate after every data refresh without any manual bookkeeping.
  get summaryPresent(): number {
    return this.monthlyRecords.filter(r => (r.originalStatus || '').toLowerCase() === 'present').length;
  }
  get summaryAbsent(): number {
    return this.monthlyRecords.filter(r => (r.originalStatus || '').toLowerCase() === 'absent').length;
  }
  get summaryLate(): number {
    return this.monthlyRecords.filter(r => (r.originalStatus || '').toLowerCase() === 'late').length;
  }
  get summaryTotalHours(): number {
    return this.monthlyRecords.reduce((sum, r) => sum + (r.originalTotalHours || 0), 0);
  }
  get summaryAttendanceRate(): number {
    const workDays = this.monthlyRecords.filter(r => !r.isWeekend && r.hasRecord).length;
    return workDays > 0 ? Math.round((this.summaryPresent / workDays) * 100) : 0;
  }
  get summaryFinalized(): number {
    return this.monthlyRecords.filter(r => r.isFinalized).length;
  }

  constructor(
    public dialogRef: MatDialogRef<EmployeeReviewDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EmployeeReviewDetailDialogData,
    private attendanceService: AttendanceService,
    private notificationService: NotificationService,
    private dialog: MatDialog,
    private authService: AuthService
  ) {
    this.pkg = data.package;
  }

  ngOnInit(): void {
    // Load fresh data from API if timesheetId and employeeId are provided
    const emptyGuid = '00000000-0000-0000-0000-000000000000';
    if (this.data.timesheetId && this.data.timesheetId !== emptyGuid && this.data.employeeId) {
      this.loadEmployeeReviewData();
    } else {
      // Fall back to using passed data immediately if no valid timesheetId
      console.warn('Ã¢Å¡Â Ã¯Â¸Â No valid timesheetId provided, using passed package data.');
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

    // Clear stale grid data immediately so the UI doesn't flash old records
    this.monthlyRecords = [];
    this.pkg.fullMonthRecords = [];

    // Validate IDs before making the API call
    const emptyGuid = '00000000-0000-0000-0000-000000000000';
    if (!this.data.timesheetId || this.data.timesheetId === emptyGuid) {
      // Should not happen due to check in ngOnInit, but safe guard
      this.isLoading = false;
      this.buildMonthlyRecords();
      return;
    }

    console.log('Ã°Å¸â€œâ€¹ Loading employee review data:', {
      timesheetId: this.data.timesheetId,
      employeeId: this.data.employeeId
    });

    forkJoin({
      pkg: this.attendanceService.getEmployeeReviewPackage(this.data.timesheetId, this.data.employeeId),
      submissions: this.attendanceService.getPendingAttendanceRequests().pipe(catchError(() => of([])))
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ pkg, submissions }) => {
          // Find the correction request details for this specific employee+timesheet.
          // The review-dashboard API returns HasPendingRequest per day but does NOT include
          // the actual requested times/status/requestId — those come from /pending-requests.
          //
          // NOTE: We match by employeeId only (not timesheetId) because the backend grouping
          // does not set TimesheetId on EmployeeSubmissionPackage — it stays Guid.Empty.
          // Instead we validate corrections belong to this package by month+year.
          const allEmployeePackages = (submissions as EmployeeSubmissionPackage[]).filter(
            s => s.employeeId === this.data.employeeId
          );
          const pkgMonth = pkg.month;
          const pkgYear  = pkg.year;
          const matchingCorrections = allEmployeePackages
            .flatMap(s => s.corrections || [])
            .filter((c: CorrectionRecord) => {
              if (!c.workDate) return false;
              const wd = new Date(c.workDate);
              return wd.getFullYear() === pkgYear && (wd.getMonth() + 1) === pkgMonth;
            });

          if (matchingCorrections.length) {
            // Build a lookup map: YYYY-MM-DD → CorrectionRecord
            const corrByDate = new Map<string, CorrectionRecord>(
              matchingCorrections.map((c: CorrectionRecord) => [c.workDate.split('T')[0], c])
            );

            // Merge correction details into each matching full-month record
            pkg.fullMonthRecords = pkg.fullMonthRecords.map((r: DailyReviewRecord) => {
              const dateKey = (r.date || '').split('T')[0];
              const corr = corrByDate.get(dateKey);
              if (!corr) return r;
              if (r.isFinalized) return r; // locked records are immutable — stale corrections must not overwrite them
              return {
                ...r,
                requestId:         corr.requestId         || r.requestId,
                requestedCheckIn:  corr.requestedCheckIn  || r.requestedCheckIn,
                requestedCheckOut: corr.requestedCheckOut || r.requestedCheckOut,
                requestedStatus:   corr.requestedStatus   || r.requestedStatus,
                reasonForEdit:     corr.reasonForEdit     || r.reasonForEdit,
                requestedNotes:    corr.requestedNotes    || r.requestedNotes,
                requestStatus:     (corr.status as 'pending' | 'approved' | 'rejected') || r.requestStatus,
                hasPendingRequest: corr.status === 'pending' ? true : r.hasPendingRequest
              };
            });
          }

          this.pkg = pkg;
          this.buildMonthlyRecords();
          this.isLoading = false;
          console.log('✅ Loaded employee review data with', this.monthlyRecords.length, 'days,',
            matchingCorrections.length, 'corrections merged');
        },
        error: (error) => {
          console.error('Error loading employee review data:', error);

          // IMPORTANT: do NOT overwrite this.pkg with this.data.package here.
          if (this.pkg && (this.pkg.fullMonthRecords?.length > 0 || this.pkg.month)) {
            console.warn('⚠ API reload failed – keeping current in-memory package state.');
            this.buildMonthlyRecords();
            this.loadError = null;
          } else if (this.data.package) {
            console.warn('⚠ Falling back to original passed package data (this.pkg was empty).');
            this.pkg = this.data.package;
            this.buildMonthlyRecords();
            this.loadError = null;
          } else {
            this.loadError = error?.error?.message || error?.message || 'Failed to load employee review data';
          }
          this.isLoading = false;
        }
      });
  }

  // Refresh data after an action
  refreshData(): void {
    const emptyGuid = '00000000-0000-0000-0000-000000000000';
    if (this.data.timesheetId && this.data.timesheetId !== emptyGuid && this.data.employeeId) {
      this.loadEmployeeReviewData();
    }
  }

  // Build full month's records (1st to 30/31st) using getDailyRecordsForMonth logic
  private buildMonthlyRecords(): void {
    // Strictly use the month/year from the package data Ã¢â‚¬â€ never default to current date
    // so that historical period data is displayed correctly
    if (!this.pkg.month || !this.pkg.year) {
      console.error('Ã¢Å¡Â Ã¯Â¸Â Package has no valid month/year:', { month: this.pkg.month, year: this.pkg.year });
      return; // Cannot build records without knowing which month
    }
    
    const month = this.pkg.month;
    const year = this.pkg.year;
    const daysInMonth = new Date(year, month, 0).getDate();
    
    this.monthlyRecords = [];
    
    // Get daily records from fullMonthRecords
    const sourceRecords = this.pkg.fullMonthRecords || [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month - 1, day);
      const dateStr = this.formatDateString(dateObj); // YYYY-MM-DD
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      
      // Find existing record for this day using string comparison (safest)
      // Extracts YYYY-MM-DD part from ISO date string if necessary
      const existingRecord = sourceRecords.find((r: DailyReviewRecord) => {
        if (!r.date) return false;
        const recordDateStr = r.date.split('T')[0];
        return recordDateStr === dateStr;
      });
      
      if (existingRecord) {
        // Bracket notation extraction Ã¢â‚¬â€ handles any casing from .NET serialization
        const preservedAttendanceId = existingRecord.attendanceId
          || (existingRecord as any)['AttendanceId']
          || (existingRecord as any)['attendanceid']
          || '';
        this.monthlyRecords.push({
          ...existingRecord,
          attendanceId: preservedAttendanceId,
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
          date: dateStr,
          originalCheckIn: undefined,
          originalCheckOut: undefined,
          originalStatus: 'No Record',
          originalTotalHours: 0,
          hasPendingRequest: false,
          hasDraftRequest: false,
          isFinalized: false,
          dayOfMonth: day,
          dayName: dayName,
          isWeekend: isWeekend,
          hasRecord: false
        });
      }
    }

    // Task 3: Local Stats Calculation
    // Re-calculate KPI counts locally based on the actual records to ensure accuracy
    this.pkg.pendingRequestCount = 0;
    this.pkg.approvedCount = 0;
    this.pkg.rejectedCount = 0;
    this.pkg.finalizedCount = 0;
    this.pkg.finalizedDays = 0;

    this.monthlyRecords.forEach(r => {
      // Count pending requests — finalized records cannot have actionable pending requests
      if (!r.isFinalized && (r.requestStatus === 'pending' || r.hasPendingRequest)) {
        this.pkg.pendingRequestCount++;
      }
      
      // Count approved requests
      if (r.requestStatus === 'approved') {
        this.pkg.approvedCount++;
      }
      
      // Count rejected requests
      if (r.requestStatus === 'rejected') {
        this.pkg.rejectedCount++;
      }
      
      // Count finalized days
      if (r.isFinalized) {
        this.pkg.finalizedCount++;
        this.pkg.finalizedDays++;
      }
    });

    // Update total records count
    this.pkg.totalRecords = this.monthlyRecords.filter(r => r.hasRecord).length;

    // ── Compute package-level isFinalized ────────────────────────────────────
    // IMPORTANT: only check records that have actual clock data (attendanceId
    // is present). Absent-day placeholders have no attendanceId and the backend
    // never writes an is_finalized flag for them, so including them in the
    // check would permanently prevent isFinalized from ever becoming true for
    // any employee who has absent days.
    //
    // Also honour the server-sent value directly: if the server already says
    // IsFinalized = true, trust it (backend has full picture).
    const recordsWithAttendance = this.monthlyRecords.filter(r =>
      r.hasRecord && !!r.attendanceId
    );
    if (recordsWithAttendance.length > 0) {
      const derivedFinalized = recordsWithAttendance.every(r => r.isFinalized);
      // Accept whichever is MORE finalized: server value or local derivation.
      // Server wins on reload; local derivation wins immediately after optimistic update.
      this.pkg.isFinalized = (this.pkg.isFinalized === true) || derivedFinalized;
    }
    // else: no real attendance records at all — leave pkg.isFinalized as the server sent it

    // ── Re-apply pending manager overrides ───────────────────────────────────
    // For dates where the BE view join cannot surface the finalized record
    // (e.g. absent-day overrides where attendance_record_id IS NULL and the
    // view's join condition NULL = NULL evaluates to FALSE), the API reload
    // returns stale data and buildMonthlyRecords would otherwise wipe the
    // optimistic update.  We re-apply the stored override values here.
    this.pendingOverrides.forEach((override, dateKey) => {
      const rec = this.monthlyRecords.find(r => (r.date || '').split('T')[0] === dateKey);
      if (!rec) return;

      if (rec.isFinalized) {
        // Server confirmed it — no longer need the local copy.
        this.pendingOverrides.delete(dateKey);
        return;
      }

      // Server hasn't confirmed yet — keep optimistic values visible.
      if (override.checkInTime)  rec.originalCheckIn  = override.checkInTime;
      if (override.checkOutTime) rec.originalCheckOut = override.checkOutTime;
      if (override.status)       rec.originalStatus    = override.status;
      rec.isFinalized = true;
      rec.hasRecord   = true;
    });

    // Recount after pending-override patch (may have changed isFinalized for some rows).
    if (this.pendingOverrides.size > 0) {
      this.pkg.finalizedCount = this.monthlyRecords.filter(r => r.isFinalized).length;
      this.pkg.finalizedDays  = this.pkg.finalizedCount;
    }
  }

  // Check if there are any records with actual data
  hasAnyRecords(): boolean {
    return this.monthlyRecords.some(r => r.hasRecord);
  }

  private formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Check if row should be highlighted (has pending request)
  shouldHighlightRow(record: MonthlyDayRecord): boolean {
    if (record.isFinalized) return false;
    return this.isPendingRequest(record) || this.hasRequestedChanges(record);
  }

  hasRequestedChanges(record: MonthlyDayRecord): boolean {
    return !!(record.requestedCheckIn || record.requestedCheckOut || record.requestedStatus);
  }

  // Check if the record has a pending request (requestStatus === 'pending')
  isPendingRequest(record: MonthlyDayRecord): boolean {
    if (record.isFinalized) return false;
    return record.requestStatus === 'pending' || record.hasPendingRequest;
  }

  // Check if record is untouched (no pending request, not finalized, has a record)
  isUntouchedRecord(record: MonthlyDayRecord): boolean {
    return record.hasRecord && 
           !record.isFinalized && 
           (record.requestStatus === 'none' || (!record.hasPendingRequest && !record.requestStatus));
  }

  /**
   * Returns true for statuses where time data is meaningless (absent, weekend, leave, no_record).
   * Used in the template to hide time bars and show Ã¢â‚¬â€ instead.
   */
  isNonWorkStatus(status?: string): boolean {
    if (!status) return true;
    const key = status.toLowerCase().replace(/[_ ]/g, '');
    return ['absent', 'weekend', 'leave', 'onleave', 'norecord'].includes(key);
  }

  /**
   * Returns true for no-record / placeholder rows Ã¢â‚¬â€ used to disable the Edit button.
   */
  isNoRecordStatus(record: MonthlyDayRecord): boolean {
    if (!record.hasRecord) return true;
    const key = (record.originalStatus || '').toLowerCase().replace(/[_ ]/g, '');
    return key === 'norecord';
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
        workDate: this.formatDisplayDate(record.date)
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

  // Edit record - role-based dispatch
  editRecord(record: MonthlyDayRecord): void {
    // Guard: finalized records are locked for payroll — no edits or overrides allowed
    if (record.isFinalized) {
      this.notificationService.showInfo('This record has been finalized for payroll and cannot be modified.');
      return;
    }

    // Guard: entire package is finalized — block all edits
    if (this.pkg.isFinalized) {
      this.notificationService.showInfo(`${this.pkg.employeeName}'s timesheet has been finalized for payroll and is now locked.`);
      return;
    }

    console.log('RAW RECORD:', record);

    const user = this.authService.getCurrentUserValue();
    const role = user?.role?.toLowerCase();
    const isEmployee = role === 'employee' || role === 'user';

    // Strict bracket-notation extraction Ã¢â‚¬â€ catches any casing from .NET
    const id = record.attendanceId
      || (record as any)['AttendanceId']
      || (record as any)['attendanceid']
      || '';
    const hasAttendanceId = !!id && id.trim() !== '';

    console.log('EXTRACTED attendanceId:', { id, hasAttendanceId, role });

    if (isEmployee) {
      // Employee: always open correction request dialog in edit mode
      const dialogRef = this.dialog.open(AttendanceRequestDialogComponent, {
        width: '520px',
        maxWidth: '95vw',
        data: {
          mode: 'edit',
          attendanceId: hasAttendanceId ? id : null,
          employeeId: this.data.employeeId,
          timesheetId: this.pkg.timesheetId,
          employeeName: this.pkg.employeeName,
          workDate: record.date,
          originalCheckIn: record.originalCheckIn,
          originalCheckOut: record.originalCheckOut,
          originalStatus: record.originalStatus
        },
        panelClass: 'attendance-request-dialog-panel'
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result?.success) {
          // Optimistically mark record as pending so the status badge shows immediately
          record.hasPendingRequest = true;
          record.requestStatus = 'pending';
          this.pkg.pendingRequestCount = (this.pkg.pendingRequestCount || 0) + 1;
          this.notificationService.showSuccess('Correction request submitted successfully');
          this.refreshData();
        }
      });
    } else {
      // Manager/Admin: ALWAYS use ManagerOverrideDialog Ã¢â‚¬â€ no legacy "create" branch
      const resolvedRecord = { ...record, attendanceId: hasAttendanceId ? id : null };
      const emptyGuid = '00000000-0000-0000-0000-000000000000';
      const timesheetId = (this.data.timesheetId && this.data.timesheetId !== emptyGuid)
        ? this.data.timesheetId
        : this.pkg.timesheetId;

      // For non-work statuses with no times, ensure originalStatus is explicit
      const statusKey = (record.originalStatus || '').toLowerCase().replace(/[_ ]/g, '');
      const isNonWork = ['absent', 'weekend', 'leave', 'onleave', 'norecord'].includes(statusKey);
      if (isNonWork && !resolvedRecord.originalCheckIn) {
        resolvedRecord.originalStatus = record.originalStatus || 'Absent';
      }

      const dialogData: ManagerOverrideDialogData = {
        record: resolvedRecord,
        timesheetId: timesheetId,
        employeeId: this.data.employeeId,
        employeeName: this.pkg.employeeName
      };

      const dialogRef = this.dialog.open(ManagerOverrideDialogComponent, {
        width: '550px',
        data: dialogData
      });

      dialogRef.afterClosed().subscribe((result: any) => {
        // Accept either a plain `true` (legacy) or the new { success, ... } shape.
        const didSucceed = result === true || result?.success === true;
        if (!didSucceed) return;

        this.notificationService.showSuccess('Manager override applied successfully');

        // ── Optimistic update ─────────────────────────────────────────────────
        // The override was saved to finalized_timesheet_records on the server.
        // However the underlying view join (f.attendance_record_id = a.attendance_id)
        // can silently fail for absent-day rows (NULL = NULL is FALSE in SQL),
        // meaning refreshData() may return stale data.  We therefore:
        //  a) Patch the in-memory record immediately.
        //  b) Store the override values in pendingOverrides so buildMonthlyRecords()
        //     can re-apply them after every reload until the server confirms.
        const dateKey = (record.date || '').split('T')[0];

        if (typeof result === 'object' && result !== null) {
          this.pendingOverrides.set(dateKey, {
            checkInTime:  result.checkInTime  || null,
            checkOutTime: result.checkOutTime || null,
            status:        result.status       || null
          });
        }

        // Apply to the live array right now so the UI reacts immediately.
        const liveRecord = this.monthlyRecords.find(
          r => (r.date || '').split('T')[0] === dateKey
        );
        if (liveRecord) {
          if (typeof result === 'object' && result !== null) {
            if (result.checkInTime)  liveRecord.originalCheckIn  = result.checkInTime;
            if (result.checkOutTime) liveRecord.originalCheckOut = result.checkOutTime;
            if (result.status)       liveRecord.originalStatus    = result.status;
          }
          liveRecord.isFinalized = true;
          liveRecord.hasRecord   = true;
          // Refresh derived stat chips immediately.
          this.pkg.finalizedCount = this.monthlyRecords.filter(r => r.isFinalized).length;
          this.pkg.finalizedDays  = this.pkg.finalizedCount;
        }

        // Reload from server — buildMonthlyRecords will re-apply pendingOverrides
        // for any dates the view still hasn't surfaced.
        this.refreshData();
      });
    }
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
            
            // Update local record with value swap
            record.hasPendingRequest = false;
            record.requestStatus = action === 'approved' ? 'approved' : 'rejected';

            if (action === 'approved') {
              // Swap approved requested values Ã¢â€ â€™ original, then clear requested fields
              record.originalCheckIn = record.requestedCheckIn || record.originalCheckIn;
              record.originalCheckOut = record.requestedCheckOut || record.originalCheckOut;
              record.originalStatus = record.requestedStatus || record.originalStatus;
            }
            // Clear requested fields regardless of action
            record.requestedCheckIn = undefined;
            record.requestedCheckOut = undefined;
            record.requestedStatus = undefined;
            record.reasonForEdit = undefined;
            
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
    if (!dateTime) return 'Ã¢â‚¬â€';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDisplayDate(date?: string): string {
    if (!date) return 'Ã¢â‚¬â€';
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
      case 'half-day':
      case 'halfday':
        return 'badge-info';
      case 'on_leave':
      case 'on-leave':
      case 'leave':
        return 'badge-primary';
      case 'work_from_home':
      case 'wfh':
      case 'remote':
        return 'badge-info';
      case 'no record':
      case 'no_record':
        return 'badge-secondary';
      default:
        return 'badge-secondary';
    }
  }

  isEmployeeRole(): boolean {
    const user = this.authService.getCurrentUserValue();
    return user?.role?.toLowerCase() === 'employee';
  }

  /** Finalize this employee's records directly from the detail dialog. */
  finalizeEmployee(): void {
    if (this.pkg.isFinalized) return;
    if ((this.pkg.pendingRequestCount || 0) > 0) {
      this.notificationService.showError('Resolve all pending requests before finalizing.');
      return;
    }

    const emptyGuid = '00000000-0000-0000-0000-000000000000';
    const timesheetId = (this.data.timesheetId && this.data.timesheetId !== emptyGuid)
      ? this.data.timesheetId
      : this.pkg.timesheetId;

    if (!timesheetId) {
      this.notificationService.showError('Cannot finalize: timesheet ID is missing.');
      return;
    }

    this.isFinalizing = true;

    this.attendanceService.finalizeEmployeeApprovals(timesheetId, this.data.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isFinalizing = false;
          this.notificationService.showSuccess(`Successfully finalized records for ${this.pkg.employeeName}`);

          // ── Optimistic local update ───────────────────────────────────────
          // Mark every record that has actual clock data as finalized so the
          // Locked badge appears immediately without waiting for the API reload.
          // Absent/no-record placeholders are also visually marked so the row
          // styling updates, but pkg.isFinalized is set directly (not derived)
          // because absent rows have no attendanceId and the derivation would
          // otherwise keep the flag false until the next successful server load.
          this.monthlyRecords.forEach(r => {
            if (r.hasRecord) {
              const s = (r.originalStatus || '').toLowerCase().replace(/[_ ]/g, '');
              if (s !== 'weekend' && s !== 'norecord') {
                r.isFinalized = true;
              }
            }
          });

          // Set the package flag DIRECTLY — API just told us it succeeded.
          // Do not re-derive here: absent rows (no attendanceId) are still
          // isFinalized:false locally and would make the derivation return false.
          this.pkg.isFinalized = true;
          this.pkg.finalizedDays = this.monthlyRecords.filter(r => r.isFinalized).length;

          // Reload from server to get authoritative state.
          this.refreshData();
        },
        error: (err) => {
          this.isFinalizing = false;
          this.notificationService.showError(err?.error?.message || err?.message || 'Failed to finalize records');
        }
      });
  }

  closeDialog(): void {
    this.dialogRef.close({
      refreshNeeded: true,
      isFinalized: this.pkg.isFinalized === true
    });
  }
}