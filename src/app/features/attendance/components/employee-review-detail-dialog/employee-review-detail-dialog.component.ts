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
import { DateTimeFormatService } from '@core/services/date-time-format.service';
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

import { SharedCommonModule } from '@shared/shared-common.module';
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
    SharedCommonModule,
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

  private _finalizedLocally = false;

  private pendingOverrides = new Map<string, {
    checkInTime:  string | null;
    checkOutTime: string | null;
    status:        string | null;
  }>();

  displayedColumns: string[] = [
    'day',
    'original',
    'totalHours',
    'requested',
    'reason',
    'status',
    'actions'
  ];

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
    private authService: AuthService,
    private dateTimeFormat: DateTimeFormatService
  ) {
    this.pkg = data.package;
  }

  ngOnInit(): void {
    const emptyGuid = '00000000-0000-0000-0000-000000000000';
    if (this.data.timesheetId && this.data.timesheetId !== emptyGuid && this.data.employeeId) {
      this.loadEmployeeReviewData();
    } else {
      console.warn('Ã¢Å¡Â Ã¯Â¸Â No valid timesheetId provided, using passed package data.');
      this.buildMonthlyRecords();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadEmployeeReviewData(): void {
    this.isLoading = true;
    this.loadError = null;

    this.monthlyRecords = [];
    this.pkg.fullMonthRecords = [];

    const emptyGuid = '00000000-0000-0000-0000-000000000000';
    if (!this.data.timesheetId || this.data.timesheetId === emptyGuid) {
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
          const allEmployeePackages = (submissions as EmployeeSubmissionPackage[]).filter(
            s => s.employeeId === this.data.employeeId
          );
          const pkgMonth = pkg.month ?? new Date().getMonth() + 1;
          const pkgYear  = pkg.year  ?? new Date().getFullYear();
          const matchingCorrections = allEmployeePackages
            .flatMap(s => s.corrections || [])
            .filter((c: CorrectionRecord) => {
              if (!c.workDate) return false;
              const wd = new Date(c.workDate);
              return wd.getFullYear() === pkgYear && (wd.getMonth() + 1) === pkgMonth;
            });

          if (matchingCorrections.length) {
            const corrByDate = new Map<string, CorrectionRecord>(
              matchingCorrections.map((c: CorrectionRecord) => [c.workDate.split('T')[0], c])
            );

            pkg.fullMonthRecords = pkg.fullMonthRecords.map((r: DailyReviewRecord) => {
              const dateKey = (r.date || '').split('T')[0];
              const corr = corrByDate.get(dateKey);
              if (!corr) return r;
              if (r.isFinalized) return r;
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

          if (this._finalizedLocally) {
            pkg.isFinalized = true;
            pkg.fullMonthRecords = pkg.fullMonthRecords.map((r: DailyReviewRecord) => ({
              ...r,
              isFinalized: true
            }));
            this._finalizedLocally = false;
          }

          this.pkg = pkg;
          this.buildMonthlyRecords();
          this.isLoading = false;
          console.log('✅ Loaded employee review data with', this.monthlyRecords.length, 'days,',
            matchingCorrections.length, 'corrections merged');
        },
        error: (error) => {
          console.error('Error loading employee review data:', error);

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

  refreshData(): void {
    const emptyGuid = '00000000-0000-0000-0000-000000000000';
    if (this.data.timesheetId && this.data.timesheetId !== emptyGuid && this.data.employeeId) {
      this.loadEmployeeReviewData();
    }
  }

  private buildMonthlyRecords(): void {
    const today = new Date();
    const month = this.pkg.month ?? (today.getMonth() + 1);
    const year  = this.pkg.year  ?? today.getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();

    this.monthlyRecords = [];

    const sourceRecords = this.pkg.fullMonthRecords || [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month - 1, day);
      const dateStr = this.formatDateString(dateObj);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      const existingRecord = sourceRecords.find((r: DailyReviewRecord) => {
        if (!r.date) return false;
        const recordDateStr = r.date.split('T')[0];
        return recordDateStr === dateStr;
      });

      if (existingRecord) {
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

    this.pkg.pendingRequestCount = 0;
    this.pkg.approvedCount = 0;
    this.pkg.rejectedCount = 0;
    this.pkg.finalizedCount = 0;
    this.pkg.finalizedDays = 0;

    this.monthlyRecords.forEach(r => {
      if (!r.isFinalized && (r.requestStatus === 'pending' || (r.hasPendingRequest && !r.hasApprovedRequest))) {
        this.pkg.pendingRequestCount++;
      }

      if (r.requestStatus === 'approved' || (!r.isFinalized && r.hasApprovedRequest)) {
        this.pkg.approvedCount++;
      }

      if (r.requestStatus === 'rejected') {
        this.pkg.rejectedCount++;
      }

      if (r.isFinalized) {
        this.pkg.finalizedCount++;
        this.pkg.finalizedDays++;
      }
    });

    this.pkg.totalRecords = this.monthlyRecords.filter(r => r.hasRecord).length;

    const recordsWithAttendance = this.monthlyRecords.filter(r =>
      r.hasRecord && !!r.attendanceId
    );
    if (recordsWithAttendance.length > 0) {
      const derivedFinalized = recordsWithAttendance.every(r => r.isFinalized);
      this.pkg.isFinalized = (this.pkg.isFinalized === true) || derivedFinalized;
    }

    this.pendingOverrides.forEach((override, dateKey) => {
      const rec = this.monthlyRecords.find(r => (r.date || '').split('T')[0] === dateKey);
      if (!rec) return;

      if (rec.hasRecord && (rec.originalCheckIn || rec.originalCheckOut || rec.originalStatus)) {
        this.pendingOverrides.delete(dateKey);
        return;
      }

      if (override.checkInTime)  rec.originalCheckIn  = override.checkInTime;
      if (override.checkOutTime) rec.originalCheckOut = override.checkOutTime;
      if (override.status)       rec.originalStatus    = override.status;
      rec.isFinalized = false;
      rec.hasRecord   = true;
    });
  }

  hasAnyRecords(): boolean {
    return this.monthlyRecords.some(r => r.hasRecord);
  }

  private formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  shouldHighlightRow(record: MonthlyDayRecord): boolean {
    if (record.isFinalized) return false;
    return this.isPendingRequest(record) || this.hasRequestedChanges(record) || !!record.isManagerOverride;
  }

  hasRequestedChanges(record: MonthlyDayRecord): boolean {
    return !!(record.requestedCheckIn || record.requestedCheckOut || record.requestedStatus);
  }

  isPendingRequest(record: MonthlyDayRecord): boolean {
    if (record.isFinalized) return false;
    return record.requestStatus === 'pending' || record.hasPendingRequest;
  }

  isUntouchedRecord(record: MonthlyDayRecord): boolean {
    return record.hasRecord &&
           !record.isFinalized &&
           (record.requestStatus === 'none' || (!record.hasPendingRequest && !record.requestStatus));
  }


  isNonWorkStatus(status?: string): boolean {
    if (!status) return true;
    const key = status.toLowerCase().replace(/[_ ]/g, '');
    return ['absent', 'weekend', 'leave', 'onleave', 'norecord'].includes(key);
  }


  isNoRecordStatus(record: MonthlyDayRecord): boolean {
    if (!record.hasRecord) return true;
    const key = (record.originalStatus || '').toLowerCase().replace(/[_ ]/g, '');
    return key === 'norecord';
  }

  approveRequest(record: MonthlyDayRecord): void {
    if (!record.requestId) return;

    const dto: ProcessAttendanceRequestDto = {
      requestId: record.requestId,
      isApproved: true
    };

    this.processRequest(dto, 'approved', record);
  }

  rejectRequest(record: MonthlyDayRecord): void {
    if (!record.requestId) return;

    const dialogRef = this.dialog.open(RejectRequestDialogComponent, {
      width: '550px',
      maxHeight: '90vh',
      panelClass: 'attendance-dialog-panel',
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

  editRecord(record: MonthlyDayRecord): void {
    if (record.isFinalized) {
      this.notificationService.showInfo('This record has been finalized for payroll and cannot be modified.');
      return;
    }

    if (this.pkg.isFinalized) {
      this.notificationService.showInfo(`${this.pkg.employeeName}'s timesheet has been finalized for payroll and is now locked.`);
      return;
    }

    console.log('RAW RECORD:', record);

    const user = this.authService.getCurrentUserValue();
    const role = user?.role?.toLowerCase();
    const isEmployee = role === 'employee' || role === 'user';

    const id = record.attendanceId
      || (record as any)['AttendanceId']
      || (record as any)['attendanceid']
      || '';
    const hasAttendanceId = !!id && id.trim() !== '';

    console.log('EXTRACTED attendanceId:', { id, hasAttendanceId, role });

    if (isEmployee) {
      const dialogRef = this.dialog.open(AttendanceRequestDialogComponent, {
        width: '520px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        panelClass: ['attendance-dialog-panel', 'attendance-request-dialog-panel'],
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
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result?.success) {
          record.hasPendingRequest = true;
          record.requestStatus = 'pending';
          this.pkg.pendingRequestCount = (this.pkg.pendingRequestCount || 0) + 1;
          this.notificationService.showSuccess('Correction request submitted successfully');
          this.refreshData();
        }
      });
    } else {
      const resolvedRecord = { ...record, attendanceId: hasAttendanceId ? id : null };
      const emptyGuid = '00000000-0000-0000-0000-000000000000';
      const timesheetId = (this.data.timesheetId && this.data.timesheetId !== emptyGuid)
        ? this.data.timesheetId
        : this.pkg.timesheetId;

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
        maxHeight: '90vh',
        panelClass: 'attendance-dialog-panel',
        data: dialogData
      });

      dialogRef.afterClosed().subscribe((result: any) => {
        const didSucceed = result === true || result?.success === true;
        if (!didSucceed) return;

        this.notificationService.showSuccess('Manager override applied successfully');

        const dateKey = (record.date || '').split('T')[0];

        if (typeof result === 'object' && result !== null) {
          this.pendingOverrides.set(dateKey, {
            checkInTime:  result.checkInTime  || null,
            checkOutTime: result.checkOutTime || null,
            status:        result.status       || null
          });
        }

        const liveRecord = this.monthlyRecords.find(
          r => (r.date || '').split('T')[0] === dateKey
        );
        if (liveRecord) {
          if (typeof result === 'object' && result !== null) {
            if (result.checkInTime)  liveRecord.originalCheckIn  = result.checkInTime;
            if (result.checkOutTime) liveRecord.originalCheckOut = result.checkOutTime;
            if (result.status)       liveRecord.originalStatus    = result.status;
          }
          liveRecord.isFinalized = false;
          liveRecord.hasRecord   = true;
          liveRecord.isManagerOverride = true;
          liveRecord.hasPendingRequest = false;
          liveRecord.requestStatus = 'none';
          this.pkg.finalizedCount = this.monthlyRecords.filter(r => r.isFinalized).length;
          this.pkg.finalizedDays  = this.pkg.finalizedCount;
        }

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

            record.hasPendingRequest = false;
            record.requestStatus = action === 'approved' ? 'approved' : 'rejected';

            if (action === 'approved') {
              record.originalCheckIn = record.requestedCheckIn || record.originalCheckIn;
              record.originalCheckOut = record.requestedCheckOut || record.originalCheckOut;
              record.originalStatus = record.requestedStatus || record.originalStatus;
            }
            record.requestedCheckIn = undefined;
            record.requestedCheckOut = undefined;
            record.requestedStatus = undefined;
            record.reasonForEdit = undefined;

            this.pkg.pendingRequestCount = Math.max(0, this.pkg.pendingRequestCount - 1);
            if (action === 'approved') {
              this.pkg.approvedCount++;
            } else {
              this.pkg.rejectedCount++;
            }

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

  /**
   * Format an ISO timestamp as "h:mm AM/PM" in the viewer's local timezone.
   * Same logic as timesheet-detail-dialog.formatTime — keeps both dialogs in
   * sync for a given record. The DB column is timestamptz, so the wire value
   * identifies an absolute instant; toLocaleTimeString turns it into clock-time
   * for the browser's timezone.
   */
  formatTime(timeStr?: string | null): string {
    if (!timeStr) return '--';
    if (typeof timeStr === 'string' && timeStr.includes('T')) {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return this.dateTimeFormat.formatTime(d);
      }
    }
    if (typeof timeStr === 'string' && /^\d{2}:\d{2}$/.test(timeStr)) {
      const [h, m] = timeStr.split(':');
      let hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      if (hour === 0) hour = 12;
      return `${hour}:${m} ${ampm}`;
    }
    return timeStr;
  }

  formatDisplayDate(date?: string): string {
    if (!date) return '--';
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
    const month = this.pkg.month ?? new Date().getMonth() + 1;
    const year  = this.pkg.year  ?? new Date().getFullYear();
    return `${monthNames[month - 1]} ${year}`;
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

          this.monthlyRecords.forEach(r => {
            if (r.hasRecord) {
              const s = (r.originalStatus || '').toLowerCase().replace(/[_ ]/g, '');
              if (s !== 'weekend' && s !== 'norecord') {
                r.isFinalized = true;
              }
            }
          });

          this.pkg.isFinalized = true;
          this.pkg.finalizedDays = this.monthlyRecords.filter(r => r.isFinalized).length;

          this._finalizedLocally = true;
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
