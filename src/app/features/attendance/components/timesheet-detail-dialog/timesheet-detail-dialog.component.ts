import { Component, Inject, OnInit, OnDestroy } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';

import { MatIconModule } from '@angular/material/icon';

import { MatTableModule } from '@angular/material/table';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { MatTooltipModule } from '@angular/material/tooltip';

import { MatChipsModule } from '@angular/material/chips';

import { MatMenuModule } from '@angular/material/menu';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatInputModule } from '@angular/material/input';

import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { MatSortModule, Sort } from '@angular/material/sort';

import { MatDividerModule } from '@angular/material/divider';

import { MatListModule } from '@angular/material/list';

import { trigger, state, style, transition, animate } from '@angular/animations';

import { Subject, takeUntil } from 'rxjs';



import { AttendanceService } from '../../services/attendance.service';

import { NotificationService } from '../../../../core/services/notification.service';

import { AuthService } from '../../../../core/services/auth.service';

import { EmployeeTimesheetDto } from '../../../../core/models/attendance.models';

import { AttendanceRequestDialogComponent } from '../attendance-request-dialog/attendance-request-dialog.component';

import { ManagerOverrideDialogComponent, ManagerOverrideDialogData } from '../manager-override-dialog/manager-override-dialog.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../confirmation-dialog/confirmation-dialog_component';



export interface TimesheetDialogData {

  timesheetId: string;

  timesheetName: string;

  month: number;

  year: number;

  monthName: string;

  userRole: string;

}



@Component({

  selector: 'app-timesheet-detail-dialog',

  standalone: true,

  imports: [

    CommonModule,

    FormsModule,

    MatDialogModule,

    MatButtonModule,

    MatIconModule,

    MatTableModule,

    MatProgressSpinnerModule,

    MatTooltipModule,

    MatChipsModule,

    MatMenuModule,

    MatFormFieldModule,

    MatInputModule,

    MatPaginatorModule,

    MatSortModule,

    MatDividerModule,

    MatListModule

  ],

  templateUrl: './timesheet-detail-dialog.component.html',

  styleUrls: ['./timesheet-detail-dialog.component.scss'],

  animations: [

    trigger('detailExpand', [

      state('collapsed', style({ height: '0px', minHeight: '0', opacity: 0 })),

      state('expanded', style({ height: '*', opacity: 1 })),

      transition('expanded <=> collapsed', animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)'))

    ])

  ]

})



export class TimesheetDetailDialogComponent implements OnInit, OnDestroy {

  myIdentityClaims: string[] = [];

  sessionUserId: string = '';

  sessionEmployeeId: string = '';

  currentUserRole: string = '';

  employees: EmployeeTimesheetDto[] = [];

  filteredEmployees: EmployeeTimesheetDto[] = [];

  displayedEmployees: EmployeeTimesheetDto[] = [];

  selectedEmployee: EmployeeTimesheetDto | null = null;

  isLoading = false;

  searchText = '';

  expandedEmployee: EmployeeTimesheetDto | null = null;

  isSubmittingApprovals = false;

  isApprovingAll = false;

  isSubmittingBatch = false;

  /** Set to true after a successful batch submission. Hides the Submit button
   *  and all edit icons until the user explicitly refreshes the dialog. */
  timesheetSubmitted = false;

  isFinalizingBatch = false;

  currentUserId: string | null = null;

  currentTimesheetId: string = '';

  // Draft state is persisted to localStorage so it survives full page refreshes.
  // Storage key pattern: ts_draft__{timesheetId}__{employeeId}__{date}
  // Value: JSON-serialized draft data object.
  // Entries are evicted when the server confirms the record is already
  // hasDraftRequest/hasPendingRequest (server becomes the source of truth).
  private get lsPrefix(): string {
    return `ts_draft__${this.currentTimesheetId}__`;
  }

  private saveDraftToStorage(empId: string, date: string, data: any): void {
    try {
      localStorage.setItem(`${this.lsPrefix}${empId}__${date}`, JSON.stringify(data));
    } catch { /* storage full or unavailable - silent fail */ }
  }

  private removeDraftFromStorage(empId: string, date: string): void {
    try {
      localStorage.removeItem(`${this.lsPrefix}${empId}__${date}`);
    } catch { /* silent */ }
  }

  private loadDraftMapForEmployee(empId: string): Map<string, any> {
    const result = new Map<string, any>();
    const keyPrefix = `${this.lsPrefix}${empId}__`;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(keyPrefix)) {
          const date = key.slice(keyPrefix.length);
          const raw = localStorage.getItem(key);
          if (raw) result.set(date, JSON.parse(raw));
        }
      }
    } catch { /* silent */ }
    return result;
  }

  private clearAllDraftsFromStorage(): void {
    // Called on submitAllEdits success - wipe every draft for this timesheet.
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.lsPrefix)) toRemove.push(key);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch { /* silent */ }
  }

  /**
   * Called after a successful batch submit instead of clearAllDraftsFromStorage.
   *
   * Rationale: absent-day correction records have no attendanceId, so the server
   * view cannot return them as "pending" rows — they would silently disappear after
   * a page reload, making the employee think the request was never sent (Bug 1 / Bug 3).
   *
   * Instead of wiping the localStorage entries, we flip each draft entry from
   *   { hasDraftRequest: true }  →  { hasDraftRequest: false, hasPendingRequest: true }
   *
   * mergeDraftCache will then inject these as "Awaiting Approval" placeholder rows
   * for any date not returned by the server, keeping the UI truthful. Once the
   * server catches up and returns a real pending record for that date, mergeDraftCache
   * detects server.hasPendingRequest === true and evicts the local copy automatically.
   */
  private markAllDraftsAsSubmittedInStorage(): void {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.lsPrefix)) keys.push(key);
      }
      keys.forEach(k => {
        try {
          const raw = localStorage.getItem(k);
          if (!raw) return;
          const data = JSON.parse(raw);
          data.hasDraftRequest  = false;
          data.hasPendingRequest = true;
          localStorage.setItem(k, JSON.stringify(data));
        } catch { /* corrupt entry — remove it */ localStorage.removeItem(k); }
      });
    } catch { /* storage unavailable — silent fail */ }
  }

  // Cache of getDailyRecordsForMonth output keyed by employeeId.
  // Prevents Angular recreating placeholder objects on every CD cycle
  // (which would wipe optimistic hasDraftRequest updates instantly).
  dailyRecordsCache: Map<string, any[]> = new Map();



  // Pagination

  pageSize = 10;

  pageIndex = 0;

  totalRecords = 0;



  // Table columns

  displayedColumns: string[] = [

    'expand',

    'isFinalized',

    'employeeCode',

    'employeeName',

    'department',

    'presentDays',

    'absentDays',

    'lateDays',

    'totalHoursWorked',

    'attendancePercentage',

    'status',

    'actions'

  ];



  // Daily records columns

  dailyRecordsColumns: string[] = [

    'date',

    'checkInTime',

    'checkOutTime',

    'status',

    'totalHours',

    'notes'

  ];



  private destroy$ = new Subject<void>();



  constructor(

    public dialogRef: MatDialogRef<TimesheetDetailDialogComponent>,

    @Inject(MAT_DIALOG_DATA) public data: TimesheetDialogData,

    private attendanceService: AttendanceService,

    private notificationService: NotificationService,

    private authService: AuthService,

    private dialog: MatDialog

  ) {}



  ngOnInit(): void {

    // Task 1: Store the timesheetId passed from the dashboard

    this.currentTimesheetId = this.data.timesheetId;



    // Task 3: Validation - warn if timesheetId is null or empty GUID

    const emptyGuid = '00000000-0000-0000-0000-000000000000';

    if (!this.currentTimesheetId || this.currentTimesheetId === emptyGuid) {

      console.warn('[WARN] WARNING: currentTimesheetId is null or empty GUID. The ID may be leaking from the Dashboard Card.', {

        timesheetId: this.currentTimesheetId,

        dialogData: this.data

      });

    }



    this.currentUserRole = this.data.userRole || '';

    this.authService.currentUser$

      .pipe(takeUntil(this.destroy$))

      .subscribe(user => {

        if (user) {

          const u = user as any;

          // Capture both potential identifiers from the session

          this.sessionUserId = String(u['userId'] || '').toLowerCase().trim();

          this.sessionEmployeeId = String(u['employeeId'] || '').toLowerCase().trim();

          this.currentUserRole = String(u['roleName'] || u['role'] || '').toLowerCase();

        }

      });

    this.loadTimesheetDetails();

  }



  /**

   * Returns true if the selected employee is the current user (for role-based button visibility)

   */

  public isOwnTimesheetSelected(): boolean {

    const selectedId = String(this.selectedEmployee?.employeeId || '').toLowerCase().trim();

    // Match if the selected ID matches the session's Employee ID OR User ID

    const isDirectMatch = selectedId === this.sessionEmployeeId || selectedId === this.sessionUserId;

    // Fallback: If Super Admin is selected and the user IS a Super Admin

    const isSuperAdminBypass = !!(this.currentUserRole.includes('super admin') &&

      this.selectedEmployee && typeof this.selectedEmployee.employeeName === 'string' && this.selectedEmployee.employeeName.toLowerCase().includes('super admin'));

    return isDirectMatch || isSuperAdminBypass;

  }



  ngOnDestroy(): void {

    this.destroy$.next();

    this.destroy$.complete();

  }



  loadTimesheetDetails(): void {

    this.isLoading = true;

    // Use currentTimesheetId (stored from dialog data) to fetch employee details

    this.attendanceService.getTimesheetDetails(this.currentTimesheetId)

      .pipe(takeUntil(this.destroy$))

      .subscribe({

        next: (employees) => {

          // Support both API shapes: either an array of employees or a { employees: EmployeeTimesheetDto[] } wrapper

          let resolvedEmployees: EmployeeTimesheetDto[] = [];

          if (!employees) {

            resolvedEmployees = [];

          } else if (Array.isArray(employees)) {

            resolvedEmployees = employees as EmployeeTimesheetDto[];

          } else if ((employees as any).employees && Array.isArray((employees as any).employees)) {

            resolvedEmployees = (employees as any).employees as EmployeeTimesheetDto[];

          } else {

            // Unexpected shape - try to coerce

            resolvedEmployees = (employees as unknown as EmployeeTimesheetDto[]) || [];

          }



          // Normalize each employee's dailyRecords and compute summary counts if missing

          resolvedEmployees = resolvedEmployees.map(emp => this.normalizeEmployeeTimesheet(emp));

          // Merge any locally-cached draft state back into records the server
          // didn't return with hasDraftRequest (e.g. absent placeholder rows).
          resolvedEmployees = resolvedEmployees.map(emp => this.mergeDraftCache(emp));

          this.employees = resolvedEmployees;

          this.filteredEmployees = [...resolvedEmployees];

          this.totalRecords = this.filteredEmployees.length;

          // Clear the daily-records display cache so cards re-render with fresh data.
          this.dailyRecordsCache.clear();

          this.updateDisplayedEmployees();

          this.isLoading = false;

          console.log('[OK] Loaded timesheet details for', this.employees.length, 'employees');

         

          // Auto-expand for employee role

          if (this.isEmployeeRole() && this.filteredEmployees.length > 0) {

            this.expandedEmployee = this.filteredEmployees[0];

            console.log('ðŸ”“ Auto-expanded employee row for employee role');

          }

          // Re-select the previously selected employee (by ID) so the detail panel
          // stays on the same person after a reload. Fall back to first if not found.
          const prevId = this.selectedEmployee?.employeeId;

          const reSelected = prevId
            ? this.filteredEmployees.find(e => e.employeeId === prevId) || this.filteredEmployees[0]
            : this.filteredEmployees[0];

          this.selectedEmployee = reSelected || null;

        },

        error: (error) => {

          console.error('[ERR] Error loading timesheet details:', error);

          this.notificationService.showError('Failed to load timesheet details');

          this.isLoading = false;

        }

      });

  }



  applyFilter(): void {

    if (!this.employees.length) return;



    this.filteredEmployees = this.employees.filter(emp => {

      const searchLower = this.searchText.toLowerCase();

      return (

        emp.employeeName.toLowerCase().includes(searchLower) ||

        emp.employeeCode.toLowerCase().includes(searchLower) ||

        emp.employeeId.toLowerCase().includes(searchLower) ||

        (emp.department || '').toLowerCase().includes(searchLower)

      );

    });



    this.totalRecords = this.filteredEmployees.length;

    this.pageIndex = 0;

    this.updateDisplayedEmployees();

    // keep selectedEmployee valid after filtering

    if (this.filteredEmployees.length > 0) {

      this.selectedEmployee = this.filteredEmployees[0];

    } else {

      this.selectedEmployee = null;

    }

  }



  clearFilter(): void {

    this.searchText = '';

    this.applyFilter();

  }



  onPageChange(event: PageEvent): void {

    this.pageIndex = event.pageIndex;

    this.pageSize = event.pageSize;

    this.updateDisplayedEmployees();

  }



  updateDisplayedEmployees(): void {

    const startIndex = this.pageIndex * this.pageSize;

    const endIndex = startIndex + this.pageSize;

    this.displayedEmployees = this.filteredEmployees.slice(startIndex, endIndex);

  }



  sortData(sort: Sort): void {

    if (!sort.active || sort.direction === '') {

      return;

    }



    this.filteredEmployees = this.filteredEmployees.sort((a, b) => {

      const isAsc = sort.direction === 'asc';

      switch (sort.active) {

        case 'employeeCode':

          return this.compare(a.employeeCode || '', b.employeeCode || '', isAsc);

        case 'employeeName':

          return this.compare(a.employeeName, b.employeeName, isAsc);

        case 'department':

          return this.compare(a.department || '', b.department || '', isAsc);

        case 'presentDays':

          return this.compare(a.presentDays || 0, b.presentDays || 0, isAsc);

        case 'absentDays':

          return this.compare(a.absentDays || 0, b.absentDays || 0, isAsc);

        case 'lateDays':

          return this.compare(a.lateDays || 0, b.lateDays || 0, isAsc);

        case 'totalHoursWorked':

          return this.compare(a.totalHoursWorked || 0, b.totalHoursWorked || 0, isAsc);

        case 'attendancePercentage':

          return this.compare(a.attendancePercentage || 0, b.attendancePercentage || 0, isAsc);

        default:

          return 0;

      }

    });



    this.updateDisplayedEmployees();

  }



  private compare(a: number | string, b: number | string, isAsc: boolean): number {

    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);

  }



  requestCorrection(employee: EmployeeTimesheetDto): void {

    this.notificationService.showInfo(

      `Correction request for ${employee.employeeName}. Daily record selection will be implemented.`

    );

  }



  requestDailyCorrection(employee: EmployeeTimesheetDto, record: any): void {

    // Strict bracket-notation extraction - catches any casing from .NET

    const resolvedAttendanceId = record.attendanceId

      || record['AttendanceId']

      || record['attendanceid']

      || '';

    // Always use 'edit' mode for ALL records including absent placeholders.
    // The AttendanceRequestDialogComponent handles null attendanceId gracefully -
    // it submits a correction request for that date regardless of whether a DB
    // attendance row already exists. 'create' mode opens the wrong dialog (Add Record).
    const dialogMode = 'edit';

    // Always open Request Correction dialog for all roles

    const isDraft = record.hasDraftRequest === true;

    const prefillCheckIn = isDraft && record.requestedCheckIn

      ? record.requestedCheckIn

      : (record.checkInTime || record.CheckInTime || null);

    const prefillCheckOut = isDraft && record.requestedCheckOut

      ? record.requestedCheckOut

      : (record.checkOutTime || record.CheckOutTime || null);

    // For absent/placeholder rows the original status is 'Absent' - pass it through

    // so the dialog can pre-select it and the user just fills in the reason/times.

    const prefillStatus = isDraft && record.requestedStatus

      ? record.requestedStatus

      : (record.status || record.Status || 'Absent');

    const prefillNotes = isDraft && record.requestedNotes

      ? record.requestedNotes

      : (record.notes || record.Notes || null);



    const dialogRef = this.dialog.open(AttendanceRequestDialogComponent, {

      width: '520px',

      maxWidth: '95vw',

      data: {

        mode: dialogMode,

        attendanceId: resolvedAttendanceId || null,

        employeeId: employee.employeeId,

        timesheetId: this.currentTimesheetId,

        employeeName: employee.employeeName,

        workDate: record.date,

        originalCheckIn: prefillCheckIn,

        originalCheckOut: prefillCheckOut,

        originalStatus: prefillStatus,

        originalNotes: prefillNotes

      },

      panelClass: 'attendance-request-dialog-panel'

    });



    dialogRef.afterClosed()

      .pipe(takeUntil(this.destroy$))

      .subscribe(result => {

        if (result?.success) {

          // Build the draft state to persist across the upcoming reload.
          // Try every field name variant the AttendanceRequestDialogComponent might return
          // (camelCase, prefixed, plain) so we never miss updated time data.
          const resolvedCheckIn =
            result.requestedCheckIn  || result.checkIn  || result.checkInTime  ||
            result.CheckInTime       || result.CheckIn  ||
            record.requestedCheckIn  || null;

          const resolvedCheckOut =
            result.requestedCheckOut || result.checkOut || result.checkOutTime ||
            result.CheckOutTime      || result.CheckOut ||
            record.requestedCheckOut || null;

          const resolvedStatus =
            result.requestedStatus   || result.status   || result.Status       ||
            record.requestedStatus   || record.status   || null;

          const resolvedNotes =
            result.requestedNotes    || result.notes    || result.Notes        ||
            record.requestedNotes    || null;

          const draftData: any = {
            hasDraftRequest:  true,
            hasPendingRequest: false,
            requestedCheckIn:  resolvedCheckIn,
            requestedCheckOut: resolvedCheckOut,
            requestedStatus:   resolvedStatus,
            requestedNotes:    resolvedNotes,
          };

          // Persist draft state to localStorage so it survives page refreshes.
          const empId = employee.employeeId;
          this.saveDraftToStorage(empId, record.date, draftData);

          // Optimistic UI: update record in place so the card updates immediately
          // without waiting for the server round-trip.
          Object.assign(record, draftData);

          // Flush display cache for this employee so getDailyRecordsForMonth
          // re-builds with the new draft state on next render.
          this.dailyRecordsCache.delete(empId);

          this.notificationService.showSuccess('Correction saved as draft');

          this.loadTimesheetDetails();

        }

      });

  }



  finalizeRecord(employee: EmployeeTimesheetDto): void {

    const confirmDialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '480px',
      data: {
        title: 'Finalize Employee Records',
        message: `Are you sure you want to finalize all records for ${employee.employeeName}? This will lock them for payroll.`,
        confirmLabel: 'Finalize',
        confirmColor: 'warn',
        icon: 'lock'
      } as ConfirmationDialogData
    });

    confirmDialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.attendanceService.finalizeEmployeeApprovals(this.currentTimesheetId, employee.employeeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess(`Records finalized successfully for ${employee.employeeName}`);
            this.loadTimesheetDetails();
          },
          error: (error) => {
            console.error('Error finalizing record:', error);
            const errorMessage = error?.message || 'Failed to finalize record';
            this.notificationService.showError(errorMessage);
          }
        });
    });

  }




  viewRecordDetails(employee: EmployeeTimesheetDto): void {

    this.notificationService.showInfo(`View daily details for ${employee.employeeName}`);

  }



  exportToExcel(): void {

    this.notificationService.showInfo('Export to Excel functionality will be implemented');

  }



  hasDraftDailyRecords(): boolean {

    // Prioritise the actively selected/expanded employee so the footer button
    // reflects the correct employee's draft state rather than always employees[0].
    const employee = this.selectedEmployee || this.expandedEmployee || this.employees[0];

    if (!employee?.dailyRecords?.length) return false;

    return employee.dailyRecords.some(record => record.hasDraftRequest === true);

  }



  // Count draft requests across all employees

  getDraftRequestCount(): number {

    if (this.expandedEmployee) {

      return this.expandedEmployee.dailyRecords?.filter(r => r.hasDraftRequest)?.length || 0;

    }

    return this.employees.reduce((count, emp) => {

      const empDraftCount = emp.dailyRecords?.filter(r => r.hasDraftRequest)?.length || 0;

      return count + empDraftCount;

    }, 0);

  }



  // Check if batch submission is allowed (has drafts)

  canSubmitBatch(): boolean {

    return this.getDraftRequestCount() > 0;

  }



  submitAllEdits(): void {

    const draftCount = this.getDraftRequestCount();

    if (draftCount === 0) {
      this.notificationService.showInfo('No draft edits to submit');
      return;
    }

    const confirmDialogRef2 = this.dialog.open(ConfirmationDialogComponent, {
      width: '480px',
      data: {
        title: 'Submit All Draft Edits',
        message: `Are you sure you want to submit all ${draftCount} draft edit${draftCount > 1 ? 's' : ''} for approval? They will be sent to your manager.`,
        confirmLabel: 'Submit',
        confirmColor: 'primary',
        icon: 'send'
      } as ConfirmationDialogData
    });

    confirmDialogRef2.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.isSubmittingBatch = true;

      this.attendanceService.submitTimesheetBatch(this.currentTimesheetId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            const submittedCount = result.submittedCount || draftCount;
            this.notificationService.showSuccess(
              `Successfully submitted ${submittedCount} edit${submittedCount > 1 ? 's' : ''} for approval`
            );
            this.timesheetSubmitted = true;
            // Transform localStorage drafts → pending state so absent-day
            // pending requests remain visible after the server reload (Bug 1/3).
            this.markAllDraftsAsSubmittedInStorage();
            this.loadTimesheetDetails();
            this.isSubmittingBatch = false;
          },
          error: (error) => {
            console.error('Error submitting batch:', error);
            const errorMessage = error?.message || 'Failed to submit edits for approval';
            this.notificationService.showError(errorMessage);
            this.isSubmittingBatch = false;
          }
        });
    });

  }




  getAttendancePercentageColor(percentage: number): string {

    if (percentage >= 90) return 'success';

    if (percentage >= 75) return 'warning';

    return 'danger';

  }



  close(): void {

    this.dialogRef.close();

  }



  refreshData(): void {

    this.timesheetSubmitted = false;
    this.loadTimesheetDetails();

  }



  /**

   * Controls whether the edit/correction button is enabled for a given record.

   *
   * RULES:
   *   BLOCK  - record is finalized for payroll (is_finalized / isFinalized). Nothing
   *             can change a payroll-locked record; the manager must un-finalize first.
   *
   *   ALLOW  - everything else, including:
   *              hasDraftRequest  : employee can keep editing their own draft freely
   *              hasPendingRequest: employee can update a request that is awaiting
   *               manager review - the updated draft replaces the pending one on the
   *               server when the batch is re-submitted.
   *              absent / no check-in placeholder rows: employee should be able to
   *               request a correction to explain or add their attendance.
   *
   * The template already hides the button for Weekend and No Record statuses via its
   * own *ngIf guards, so those cases never reach this method.

   */

  canRequestCorrection(record: any): boolean {

    // Only hard-block on payroll finalization - nothing else should prevent editing.

    if (record.is_finalized || record.isFinalized) {

      return false;

    }

    // hasPendingRequest is intentionally NOT blocked here.

    // Employees can re-edit a pending correction; the new draft overwrites the old
    // pending request on the server when they next click "Submit All Edits".

    return true;

  }

  /**
   * Returns true when the employee's timesheet is in a payroll-locked state,
   * meaning no further employee edits should be accepted.
   *
   * Two cases trigger a lock:
   *   1. employee.is_finalized === true  → every record is finalized (full lock).
   *   2. ANY individual daily record has is_finalized === true → the manager has
   *      started the finalization pass; absent-day and other unfinalized records
   *      must also go read-only so employees cannot submit new requests while
   *      payroll is being processed.
   */
  isEmployeePayrollLocked(employee: EmployeeTimesheetDto | null): boolean {
    if (!employee) return false;
    if ((employee as any).is_finalized) return true;
    // Payroll started = at least one record locked by manager
    return (employee.dailyRecords || []).some(
      (r: any) => r.is_finalized || r.isFinalized
    );
  }



  canFinalizeRecord(employee: EmployeeTimesheetDto): boolean {

    // Managers can finalize records that aren't already finalized

    return !employee.is_finalized && this.isManagerOrAdmin();

  }



  showLockIcon(employee: EmployeeTimesheetDto): boolean {

    return employee.is_finalized === true;

  }



  onDisabledButtonClick(record: any): void {

    if (record.is_finalized || record.isFinalized) {

      this.notificationService.showInfo('This record has been finalized for payroll and cannot be modified');

    } else if (record.hasPendingRequest) {

      this.notificationService.showInfo('A correction request is already pending - please wait for manager review');

    }

  }



  getActionButtonLabel(): string {

    return this.isEmployee() ? 'Request Correction' : 'Finalize Record';

  }



  isEmployee(): boolean {

    const userRole = this.data.userRole?.toLowerCase();

    return userRole === 'employee';

  }



  isManagerOrAdmin(): boolean {

    const userRole = this.data.userRole?.toLowerCase();

    return userRole === 'manager' || userRole === 'super admin' || userRole === 'hr manager';

  }



  toggleRow(employee: EmployeeTimesheetDto): void {

    this.expandedEmployee = this.expandedEmployee === employee ? null : employee;

  }



  selectEmployee(employee: EmployeeTimesheetDto): void {

    this.selectedEmployee = employee;

    this.pageIndex = 0;

  }



  showSearch = false;

  toggleSearch(): void {

    this.showSearch = !this.showSearch;

    if (!this.showSearch) {

      this.clearFilter();

    }

  }



  isExpanded(employee: EmployeeTimesheetDto): boolean {

    return this.expandedEmployee === employee;

  }



  /**

   * Generates a complete array of daily records for the entire month.

   * Fills in missing days with 'No Record' or 'Absent' status.

   */

  getDailyRecordsForMonth(employee: EmployeeTimesheetDto): any[] {

    // Return cached result to prevent Angular recreating objects on every
    // change-detection cycle (which would wipe optimistic draft updates).
    if (this.dailyRecordsCache.has(employee.employeeId)) {
      return this.dailyRecordsCache.get(employee.employeeId)!;
    }

    const daysInMonth = new Date(this.data.year, this.data.month, 0).getDate();

    const allDays: any[] = [];

    const employeeRecords = employee.dailyRecords || [];

    const today = new Date();

    for (let day = 1; day <= daysInMonth; day++) {

      const dateObj = new Date(this.data.year, this.data.month - 1, day);

      const dateStr = `${this.data.year}-${String(this.data.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      const isFuture = dateObj > today;

      const existingRecord = employeeRecords.find(r =>

        r.date === dateStr || new Date(r.date).getDate() === day

      );

      if (existingRecord) {

        (existingRecord as any).status = this.titleCaseStatus((existingRecord as any).status || (existingRecord as any).Status || '');

        (existingRecord as any).isWeekend = !!(existingRecord as any).isWeekend;

        allDays.push(existingRecord);

      } else {

        let statusLabel = 'No Record';

        if (isWeekend) {

          statusLabel = 'Weekend';

        } else if (!isFuture) {

          statusLabel = 'Absent';

        }

        allDays.push({

          date: dateStr,

          checkInTime: null,

          checkOutTime: null,

          status: statusLabel,

          totalHours: 0,

          notes: isWeekend ? 'Weekend' : 'No attendance record',

          is_finalized: false,

          hasPendingRequest: false,

          hasDraftRequest: false,

          isPlaceholder: true,

          isWeekend: isWeekend

        });

      }

    }

    // When the employee is payroll-locked (at least one record finalized by the
    // manager), propagate is_finalized = true to every non-weekend, non-future
    // record in the display array. Absent-day placeholders have no DB row and are
    // therefore never inserted into finalized_timesheet_records, but visually they
    // must show "Finalized for Payroll" alongside the real records so the employee
    // understands the entire period is locked for payroll processing.
    if (this.isEmployeePayrollLocked(employee)) {
      const todayMs = new Date().setHours(0, 0, 0, 0);
      allDays.forEach((r: any) => {
        if (!r.isWeekend && new Date(r.date).setHours(0, 0, 0, 0) <= todayMs) {
          r.is_finalized = true;
        }
      });
    }

    // Store result in cache before returning.
    this.dailyRecordsCache.set(employee.employeeId, allDays);

    return allDays;

  }



  /**

   * Task 2: Check if manager can override a record for a day.

   */

  canManagerOverride(record: any): boolean {

    if (!this.isManagerOrAdmin()) return false;

    // Finalized records are permanently locked — cannot override.
    if (record.is_finalized) return false;

    // Managers intentionally CAN override records that have a pending employee
    // request — manager authority supersedes the pending request.
    // The pending request will be auto-rejected by the BE when the override lands.

    const status = (record.status || '').toLowerCase().replace(/[_ ]/g, '');

    // No-record placeholder with no data yet — nothing to override.
    if (status === 'norecord' || (record.isPlaceholder && !record.checkInTime && !record.checkOutTime && status !== 'absent')) return false;

    // Weekends cannot be overridden.
    if (status === 'weekend' || record.isWeekend) return false;

    return true;

  }

  openManagerOverride(employee: EmployeeTimesheetDto, record: any): void {

    // Map DailyAttendanceRecord shape → DailyReviewRecord shape expected by dialog.
    const reviewRecord: any = {
      attendanceId:      record.attendanceId || record.AttendanceId || null,
      date:              record.date,
      originalCheckIn:   record.checkInTime  || null,
      originalCheckOut:  record.checkOutTime || null,
      originalStatus:    record.status       || 'Absent',
      originalTotalHours: record.totalHours  || 0,
      hasPendingRequest: record.hasPendingRequest || false,
      hasDraftRequest:   record.hasDraftRequest   || false,
      isFinalized:       record.is_finalized       || false
    };

    const dialogRef = this.dialog.open(ManagerOverrideDialogComponent, {
      width: '520px',
      disableClose: true,
      data: {
        record:       reviewRecord,
        timesheetId:  this.currentTimesheetId,
        employeeId:   employee.employeeId,
        employeeName: employee.employeeName
      } as ManagerOverrideDialogData
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (!result?.success) return;

        // Optimistic UI: patch the card immediately before server reload.
        Object.assign(record, {
          checkInTime:        result.checkInTime  || record.checkInTime,
          checkOutTime:       result.checkOutTime || record.checkOutTime,
          status:             result.status ? this.titleCaseStatus(result.status) : record.status,
          is_manager_override: true,
          is_finalized:       false,
          hasPendingRequest:  false   // pending request will be superseded by override
        });

        // Flush display cache so getDailyRecordsForMonth re-renders the card.
        this.dailyRecordsCache.delete(employee.employeeId);

        // Reload authoritative state from server.
        this.loadTimesheetDetails();
      });

  }



  isBlankTimeRow(record: any): boolean {

    const status = (record.status || '').toLowerCase().replace(/[_ ]/g, '');

    const nonWorkStatus = ['absent', 'norecord', 'weekend', 'leave', 'onleave'].includes(status);

    return nonWorkStatus && !record.checkInTime && !record.checkOutTime;

  }



  isNonWorkStatus(status?: string): boolean {

    if (!status) return true;

    const key = status.toLowerCase().replace(/[_ ]/g, '');

    return ['absent', 'weekend', 'leave', 'onleave', 'norecord'].includes(key);

  }



  isNoRecordStatus(record: any): boolean {

    const status = (record.status || '').toLowerCase().replace(/[_ ]/g, '');

    return status === 'norecord' || record.isPlaceholder === true;

  }



  needsAttentionAlert(employee: EmployeeTimesheetDto): boolean {

    if (employee.attendancePercentage === 0) {

      return true;

    }

   

    const daysInMonth = new Date(this.data.year, this.data.month, 0).getDate();

    const recordCount = employee.dailyRecords?.filter(r =>

      r.status !== 'No Record' && r.checkInTime !== null

    ).length || 0;

    const missingPercentage = ((daysInMonth - recordCount) / daysInMonth) * 100;

   

    return missingPercentage > 50;

  }



  formatDate(dateStr: string): string {

    const date = new Date(dateStr);

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  }



  formatTime(timeStr: string | null | undefined): string {

    if (!timeStr) return '-';

    if (typeof timeStr === 'string' && timeStr.includes('T')) {

      const tIndex = timeStr.indexOf('T');

      const timePart = timeStr.substring(tIndex + 1, tIndex + 6);

      const [hourStr, minuteStr] = timePart.split(':');

      let hour = parseInt(hourStr, 10);

      const minute = minuteStr;

      const ampm = hour >= 12 ? 'PM' : 'AM';

      hour = hour % 12;

      if (hour === 0) hour = 12;

      return `${hour}:${minute} ${ampm}`;

    }

    if (typeof timeStr === 'string' && /^\d{2}:\d{2}$/.test(timeStr)) {

      let [hour, minute] = timeStr.split(':');

      let hourNum = parseInt(hour, 10);

      const ampm = hourNum >= 12 ? 'PM' : 'AM';

      hourNum = hourNum % 12;

      if (hourNum === 0) hourNum = 12;

      return `${hourNum}:${minute} ${ampm}`;

    }

    return timeStr;

  }



  /**
   * After a server reload, re-applies any locally-cached draft state to records
   * that the server didn't return with hasDraftRequest (absent placeholder rows).
   * Also normalizes requestedCheckIn/Out/Status from the server if present.
   */
  private mergeDraftCache(emp: EmployeeTimesheetDto): EmployeeTimesheetDto {
    // Load all drafts for this employee from localStorage (survives page refresh).
    const empCache = this.loadDraftMapForEmployee(emp.employeeId);
    if (empCache.size === 0) return emp;

    const records = [...(emp.dailyRecords || [])];

    empCache.forEach((draftData, date) => {
      const existing = records.find(r => r.date === date);
      if (existing) {
        if (existing.hasDraftRequest || existing.hasPendingRequest) {
          // Server already knows about this draft - it is the source of truth.
          // Remove our local copy so we don't override server state on future loads.
          this.removeDraftFromStorage(emp.employeeId, date);
        } else {
          // Server returned the record but without draft state - re-apply local draft.
          // This happens when the server hasn't processed the draft yet.
          Object.assign(existing, draftData);
        }
      } else {
        // Server has no record for this date (absent placeholder with a local draft).
        // Inject it so getDailyRecordsForMonth finds it and renders the card correctly.
        records.push({
          date,
          checkInTime: null,
          checkOutTime: null,
          status: draftData.requestedStatus || 'Absent',
          totalHours: 0,
          notes: null,
          is_finalized: false,
          isPlaceholder: true,
          isWeekend: false,
          ...draftData,
        });
      }
    });

    return { ...emp, dailyRecords: records };
  }

  private normalizeEmployeeTimesheet(emp: EmployeeTimesheetDto): EmployeeTimesheetDto {

    // Resolve the employee-level finalization flag with all possible casing variants.
    // Used only for the "Finalize" button visibility / sidebar lock icon.
    // Do NOT use this to cascade is_finalized onto individual records — each record
    // carries its own is_finalized flag from vw_timesheet_consolidation, which now
    // correctly reflects the finalized_timesheet_records table (including the
    // UNION ALL branch for absent-day overrides).
    const empIsFinalized: boolean =
      (emp as any).is_finalized ?? (emp as any).isFinalized ?? (emp as any).IsFinalized ?? false;

    const normalized: EmployeeTimesheetDto = { ...emp } as any;
    (normalized as any).is_finalized = empIsFinalized;

    normalized.dailyRecords = (emp.dailyRecords || []).map(r => {

      const raw = r as any;

      const dateStr = raw.date ? (typeof raw.date === 'string' ? raw.date.split('T')[0] : raw.date) : null;

      const statusRaw = (raw.status || raw.Status || '').toString();

      const status = this.titleCaseStatus(statusRaw);

      const rec: any = {

        ...raw,

        date: dateStr || raw.date,

        checkInTime: raw.checkInTime || raw.CheckInTime || null,

        checkOutTime: raw.checkOutTime || raw.CheckOutTime || null,

        status: status || 'No Record',

        totalHours: raw.totalHours || raw.TotalHours || 0,

        notes: raw.notes || raw.Notes || null,

        // Each record's own flag — comes directly from the view per-row.
        is_finalized: raw.is_finalized || raw.isFinalized || raw.IsFinalized || false,

        is_manager_override: raw.is_manager_override || raw.isManagerOverride || raw.IsManagerOverride || false,

        hasApprovedRequest: raw.hasApprovedRequest || raw.HasApprovedRequest || raw.has_approved_request || false,

        hasPendingRequest: raw.hasPendingRequest || raw.HasPendingRequest || false,

        hasDraftRequest: raw.hasDraftRequest || raw.HasDraftRequest || false,

        isPlaceholder: raw.isPlaceholder || false,

        isWeekend: !!raw.isWeekend

      };

      return rec;

    });

    const days = normalized.dailyRecords || [];

    const presentDays = days.filter(d => d.status && d.status.toLowerCase() === 'present').length;

    const absentDays = days.filter(d => d.status && d.status.toLowerCase() === 'absent').length;

    // Exclude weekends, future no-records, and holidays from the denominator so
    // the percentage reflects actual working days only (matches Keka / Zoho behaviour).
    const totalDays = days.filter(d => {
      const s = ((d as any).status || '').toLowerCase().replace(/[_ ]/g, '');
      return s !== 'weekend' && s !== 'norecord' && s !== 'holiday';
    }).length || 1;

    normalized.presentDays = normalized.presentDays ?? presentDays;

    normalized.absentDays = normalized.absentDays ?? absentDays;

    normalized.attendancePercentage = normalized.attendancePercentage ?? Math.round((normalized.presentDays / totalDays) * 100);



    return normalized;

  }



  private titleCaseStatus(status: string): string {

    if (!status) return 'No Record';

    const key = status.toLowerCase().replace(/[_]/g, ' ');

    if (key.includes('present')) return 'Present';

    if (key.includes('absent')) return 'Absent';

    if (key.includes('weekend')) return 'Weekend';

    if (key.includes('leave') || key.includes('on leave') || key.includes('onleave')) return 'On Leave';

    if (key.includes('pending')) return 'Pending Approval';

    if (key.includes('late')) return 'Late';

    if (key.includes('half')) return 'Half Day';

    if (key.includes('holiday')) return 'Holiday';

    return status.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

  }



  isEmployeeRole(): boolean {

    return this.currentUserRole?.toLowerCase() === 'employee';

  }



  getPendingRequestCount(): number {

    if (this.expandedEmployee) {

      return this.expandedEmployee.dailyRecords?.filter(r => r.hasPendingRequest)?.length || 0;

    }

    return this.employees.reduce((count, emp) => {

      const empPendingCount = emp.dailyRecords?.filter(r => r.hasPendingRequest)?.length || 0;

      return count + empPendingCount;

    }, 0);

  }

  approveAllPending(): void {

    const pendingCount = this.getPendingRequestCount();

    if (pendingCount === 0) {
      this.notificationService.showInfo('No pending correction requests to approve');
      return;
    }

    const scope = this.expandedEmployee
      ? `${this.expandedEmployee.employeeName}'s`
      : 'the entire team';

    const confirmDialogRef3 = this.dialog.open(ConfirmationDialogComponent, {
      width: '480px',
      data: {
        title: 'Approve All Pending Corrections',
        message: `Are you sure you want to approve all ${pendingCount} pending corrections for ${scope} in this period?`,
        confirmLabel: 'Approve All',
        confirmColor: 'primary',
        icon: 'done_all'
      } as ConfirmationDialogData
    });

    confirmDialogRef3.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.isApprovingAll = true;
      const employeeId = this.expandedEmployee?.employeeId;

      this.attendanceService.approveAllPendingRequests(this.currentTimesheetId, employeeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            const approvedCount = result.approvedCount || pendingCount;
            this.notificationService.showSuccess(
              `Successfully approved ${approvedCount} pending correction${approvedCount > 1 ? 's' : ''}`
            );
            this.loadTimesheetDetails();
            this.isApprovingAll = false;
          },
          error: (error) => {
            console.error('Error approving pending requests:', error);
            const errorMessage = error?.message || 'Failed to approve pending requests';
            this.notificationService.showError(errorMessage);
            this.isApprovingAll = false;
          }
        });
    });

  }




  canFinalizeBatch(): boolean {

    return this.getPendingRequestCount() === 0;

  }



  finalizeMonthlyTimesheet(): void {

    if (!this.canFinalizeBatch()) {
      this.notificationService.showWarning('Cannot finalize: There are pending requests that must be approved or rejected first');
      return;
    }

    const confirmDialogRef4 = this.dialog.open(ConfirmationDialogComponent, {
      width: '480px',
      data: {
        title: 'Finalize Monthly Timesheet',
        message: 'Are you sure you want to finalize the entire monthly timesheet? This will lock all records for payroll and prevent further changes.',
        confirmLabel: 'Finalize for Payroll',
        confirmColor: 'warn',
        icon: 'lock'
      } as ConfirmationDialogData
    });

    confirmDialogRef4.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.isFinalizingBatch = true;

      this.attendanceService.finalizeTimesheetBatch(this.currentTimesheetId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            const finalizedCount = result.finalizedCount || 0;
            this.notificationService.showSuccess(
              `Successfully finalized ${finalizedCount} record${finalizedCount > 1 ? 's' : ''} for payroll`
            );
            this.loadTimesheetDetails();
            this.isFinalizingBatch = false;
          },
          error: (error) => {
            console.error('Error finalizing batch:', error);
            const errorMessage = error?.message || 'Failed to finalize timesheet batch';
            this.notificationService.showError(errorMessage);
            this.isFinalizingBatch = false;
          }
        });
    });

  }



  showTimes(record: any): boolean {

    const status = (record.status || '').toLowerCase().replace(/[_ ]/g, '');

    // Never show times for non-work days (even if someone somehow set a draft on them)
    if (['norecord', 'weekend', 'leave', 'onleave', 'holiday'].includes(status)) return false;

    // If a correction draft or pending request exists, ALWAYS show the times section
    // regardless of original status - the user may have added times to an absent day
    // or changed times on a present/late record. The HTML handles null values as '-'.
    if (record.hasDraftRequest || record.hasPendingRequest) return true;

    // No draft - show times only if the record actually has original check-in/out data
    if (record.checkInTime || record.checkOutTime) return true;

    return false;

  }

  public isFutureDay(record: any): boolean {

    const today = new Date();

    const recordDate = new Date(record.date);

    return recordDate > today;

  }

}