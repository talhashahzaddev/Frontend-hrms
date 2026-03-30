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
import { AuthService } from '@/app/core/services/auth.service';

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


  processingRequestIds = new Set<string>();

  processingPackageIds = new Set<string>();

  statusFilter: string = 'all';
  departmentFilter: string = 'all';

  orgProgress: OrgSubmissionProgress | null = null;
  currentMonth: number = new Date().getMonth() + 1;
  currentYear: number = new Date().getFullYear();

  showHistoryDrawer = false;
  allSnapshots: MonthlyTimesheetSummary[] = [];
  isLoadingSnapshots = false;

  displayedColumns: string[] = ['workDate', 'original', 'requested', 'status', 'actions'];

  constructor(
    private attendanceService: AttendanceService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.bootstrapDashboard();
    this.loadAllSnapshots();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyPackageFilter(): void {
    const q = this.searchText.trim().toLowerCase();
    this.filteredPackages = this.employeePackages.filter(pkg => {
      // Text search
      const textMatch = !q ||
        pkg.employeeName.toLowerCase().includes(q) ||
        (pkg.employeeCode || '').toLowerCase().includes(q) ||
        (pkg.department || '').toLowerCase().includes(q) ||
        pkg.employeeId.toLowerCase().includes(q);

      // Status filter
      const statusMatch = this.statusFilter === 'all' ||
        this.getPackageStatus(pkg) === this.statusFilter;

      // Department filter
      const deptMatch = this.departmentFilter === 'all' ||
        (pkg.department || '') === this.departmentFilter;

      return textMatch && statusMatch && deptMatch;
    });
  }

  getPackageStatus(pkg: EmployeeReviewPackage): string {
    if (pkg.isFinalized) return 'finalized';
    if (pkg.hasPendingRequest || (pkg.pendingRequestCount || 0) > 0) return 'pending';
    if (pkg.hasDraftRequest) return 'in_progress';
    if ((pkg.finalizedDays || 0) > 0 || (pkg.approvedCount || 0) > 0) return 'partial';
    return 'untouched';
  }

  getStatusFilterCount(filter: string): number {
    return this.employeePackages.filter(pkg => this.getPackageStatus(pkg) === filter).length;
  }

  get uniqueDepartments(): string[] {
    const depts = this.employeePackages
      .map(p => p.department || '')
      .filter(d => d.trim() !== '');
    return ['all', ...Array.from(new Set(depts)).sort()];
  }

  getDeptFilterCount(dept: string): number {
    if (dept === 'all') return this.employeePackages.length;
    return this.employeePackages.filter(p => (p.department || '') === dept).length;
  }

  clearPackageFilter(): void {
    this.searchText = '';
    this.statusFilter = 'all';
    this.departmentFilter = 'all';
    this.applyPackageFilter();
  }



  private bootstrapDashboard(): void {
    this.isLoading = true;

    this.attendanceService.getSnapshots()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (snapshots) => {
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



  loadManagerReviewDashboard(): void {
    if (this.selectedTimesheetId && this.selectedTimesheetId !== EMPTY_GUID) {
      this.isLoading = true;
      this.loadReviewDashboard(this.selectedTimesheetId);
    } else {
      this.bootstrapDashboard();
    }
  }


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


  resetToCurrentMonth(): void {
    this.selectedTimesheetId = '';
    this.currentMonth = new Date().getMonth() + 1;
    this.currentYear = new Date().getFullYear();
    this.bootstrapDashboard();
  }


  toggleHistoryDrawer(): void {
    this.showHistoryDrawer = !this.showHistoryDrawer;
    if (this.showHistoryDrawer && this.allSnapshots.length === 0) {
      this.loadAllSnapshots();
    }
  }


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

      const updatedRecord = pkg.fullMonthRecords.find(
        r => r.date?.split('T')[0] === record.date?.split('T')[0]
      );
      if (updatedRecord) {
        if (result.checkInTime)  updatedRecord.originalCheckIn  = result.checkInTime;
        if (result.checkOutTime) updatedRecord.originalCheckOut = result.checkOutTime;
        if (result.status)       updatedRecord.originalStatus   = result.status;

        updatedRecord.hasPendingRequest = false;
        updatedRecord.requestStatus     = 'approved';

        (updatedRecord as any).isManagerOverride = true;

      }

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
    if (pkg.isFinalized) {
      this.notificationService.showError(`${pkg.employeeName}'s records are already finalized.`);
      return;
    }
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
          pkg.fullMonthRecords.forEach(r => {
            const s = (r.originalStatus || '').toLowerCase().replace(/[_ ]/g, '');
            if (s !== 'norecord' && s !== 'weekend') {
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


  private resolveTimesheetId(pkg: EmployeeReviewPackage): string {
    if (this.selectedTimesheetId && this.selectedTimesheetId !== EMPTY_GUID) {
      return this.selectedTimesheetId;
    }
    if (pkg.timesheetId && pkg.timesheetId !== EMPTY_GUID) {
      return pkg.timesheetId;
    }
    return '';
  }


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
              const newPendingCount = Math.max(0, pkg.pendingRequestCount - 1);
              return {
                ...pkg,
                pendingRequestCount: newPendingCount,
                hasPendingRequest: newPendingCount > 0,
                approvedCount: action === 'approved' ? pkg.approvedCount + 1 : pkg.approvedCount,
                rejectedCount: action === 'rejected' ? pkg.rejectedCount + 1 : pkg.rejectedCount,
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


  private recalculatePackageSummary(pkg: EmployeeReviewPackage): void {
    const records = pkg.fullMonthRecords || [];
    let pending = 0, approved = 0, rejected = 0, finalized = 0, hasRecords = 0;
    let hasDraft = false;

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

      if (!isDraft && (reqStatus === 'pending' || (r.hasPendingRequest && reqStatus !== 'approved' && reqStatus !== 'rejected'))) pending++;
      else if (reqStatus === 'approved' || (!isDraft && !!r.hasApprovedRequest)) approved++;
      else if (reqStatus === 'rejected') rejected++;

      if (r.isFinalized) finalized++;
      if (r.hasDraftRequest) hasDraft = true;
    });

    pkg.pendingRequestCount = pending;
    pkg.approvedCount       = approved;
    pkg.rejectedCount       = rejected;
    pkg.totalRecords        = hasRecords;

    const apiFinalized = pkg.finalizedCount || 0;
    pkg.finalizedCount = finalized > 0 ? finalized : apiFinalized;
    pkg.finalizedDays  = pkg.finalizedCount;

    pkg.hasPendingRequest = pending > 0;
    pkg.hasDraftRequest   = hasDraft;

    // Use all elapsed non-weekend records — absent finalized days have no attendanceId
    // but the backend still marks them is_finalized=true after BatchFinalizeForEmployee
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const elapsedWorkRecords = records.filter(r => {
      const s = (r.originalStatus || '').toLowerCase().replace(/[_ ]/g, '');
      if (s === 'weekend' || s === 'norecord') return false;
      const d = new Date(r.date || '');
      return !isNaN(d.getTime()) && d < today;
    });

    const computedIsFinalized = elapsedWorkRecords.length > 0
      && elapsedWorkRecords.every(r => r.isFinalized === true);
    // Preserve API-level isFinalized (from backend) as authoritative fallback
    pkg.isFinalized = computedIsFinalized || (pkg.isFinalized === true);
    pkg.isUntouched = hasRecords === 0 && pending === 0 && approved === 0 && rejected === 0;

    const presentDays = records.filter(r => {
      const s = (r.originalStatus || '').toLowerCase().trim();
      return s === 'present' || s === 'late' || s === 'half_day' || s === 'half-day' || s === 'halfday';
    }).length;
    pkg.attendancePercentage = hasRecords > 0 ? Math.round((presentDays / hasRecords) * 100) : 0;
  }

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

  canFinalize(pkg: EmployeeReviewPackage): boolean {
    if (pkg.isFinalized) return false;
    if ((pkg.pendingRequestCount || 0) > 0) return false;
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


  getEmployeeStatusIcon(pkg: EmployeeReviewPackage): string {
    if (pkg.isFinalized)     return 'lock';
    if (pkg.hasPendingRequest || (pkg.pendingRequestCount || 0) > 0) return 'hourglass_top';
    if (pkg.hasDraftRequest) return 'edit_note';
    if ((pkg.finalizedDays || 0) > 0 || (pkg.approvedCount || 0) > 0) return 'sync';
    return 'radio_button_unchecked';
  }

  getEmployeeStatusClass(pkg: EmployeeReviewPackage): string {
    if (pkg.isFinalized)     return 'status-finalized';
    if (pkg.hasPendingRequest || (pkg.pendingRequestCount || 0) > 0) return 'status-pending-review';
    if (pkg.hasDraftRequest) return 'status-in-progress';
    if ((pkg.finalizedDays || 0) > 0 || (pkg.approvedCount || 0) > 0) return 'status-in-progress';
    return 'status-untouched';
  }

  getEmployeeStatusTooltip(pkg: EmployeeReviewPackage): string {
    if (pkg.isFinalized)     return 'Finalized \u2014 locked for payroll';
    if (pkg.hasPendingRequest || (pkg.pendingRequestCount || 0) > 0)
      return `Pending Review \u2014 ${pkg.pendingRequestCount || 0} request(s) awaiting action`;
    if (pkg.hasDraftRequest) return 'In Progress \u2014 has draft corrections (not yet submitted)';
    if ((pkg.finalizedDays || 0) > 0 || (pkg.approvedCount || 0) > 0)
      return `Partially Reviewed \u2014 ${pkg.finalizedDays || 0} day(s) finalized, ${pkg.approvedCount || 0} approved`;
    return 'No activity';
  }


  getHeatMapBorderClass(pkg: EmployeeReviewPackage): string {
    if (pkg.isFinalized)      return 'heat-border-finalized';
    if (pkg.hasPendingRequest) return 'heat-border-pending';
    if (pkg.isUntouched && this.isNearMonthEnd()) return 'heat-border-urgent';
    if (pkg.hasDraftRequest)  return 'heat-border-draft';
    if ((pkg.finalizedDays || 0) > 0 || (pkg.approvedCount || 0) > 0) return 'heat-border-draft';
    return '';
  }

  isNearMonthEnd(): boolean {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return today.getDate() >= lastDay - 5;
  }


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
     hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Attendance', 'Timesheet Dashboard', actionKey);
  }
}