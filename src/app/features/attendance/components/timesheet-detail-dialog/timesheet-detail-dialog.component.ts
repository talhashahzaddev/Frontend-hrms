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
  startDate: string;
  endDate: string;
  /** @deprecated Use startDate/endDate */ month?: number;
  /** @deprecated Use startDate/endDate */ year?: number;
  /** @deprecated Use startDate/endDate */ monthName?: string;
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
  statusFilter = 'all';
  departmentFilter = 'all';

  get uniqueDepartments(): string[] {
    const depts = this.employees
      .map(e => e.department || '')
      .filter(d => d.trim() !== '');
    return ['all', ...Array.from(new Set(depts)).sort()];
  }

  expandedEmployee: EmployeeTimesheetDto | null = null;

  isSubmittingApprovals = false;

  isApprovingAll = false;

  isSubmittingBatch = false;


  timesheetSubmitted = false;

  isFinalizingBatch = false;

  currentUserId: string | null = null;

  currentTimesheetId: string = '';

  private get lsPrefix(): string {
    return `ts_draft__${this.currentTimesheetId}__`;
  }

  private saveDraftToStorage(empId: string, date: string, data: any): void {
    try {
      localStorage.setItem(`${this.lsPrefix}${empId}__${date}`, JSON.stringify(data));
    } catch { }
  }

  private removeDraftFromStorage(empId: string, date: string): void {
    try {
      localStorage.removeItem(`${this.lsPrefix}${empId}__${date}`);
    } catch { }
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
    } catch { }
    return result;
  }

  private clearAllDraftsFromStorage(): void {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.lsPrefix)) toRemove.push(key);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch { }
  }


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
        } catch { localStorage.removeItem(k); }
      });
    } catch { }
  }

  dailyRecordsCache: Map<string, any[]> = new Map();




  pageSize = 10;

  pageIndex = 0;

  totalRecords = 0;




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


    this.currentTimesheetId = this.data.timesheetId;




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


          this.sessionUserId = String(u['userId'] || '').toLowerCase().trim();

          this.sessionEmployeeId = String(u['employeeId'] || '').toLowerCase().trim();

          this.currentUserRole = String(u['roleName'] || u['role'] || '').toLowerCase();

        }

      });

    this.loadTimesheetDetails();

  }





  public isOwnTimesheetSelected(): boolean {

    const selectedId = String(this.selectedEmployee?.employeeId || '').toLowerCase().trim();


    const isDirectMatch = selectedId === this.sessionEmployeeId || selectedId === this.sessionUserId;


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


    this.attendanceService.getTimesheetDetails(this.currentTimesheetId)

      .pipe(takeUntil(this.destroy$))

      .subscribe({

        next: (employees) => {


          let resolvedEmployees: EmployeeTimesheetDto[] = [];

          if (!employees) {

            resolvedEmployees = [];

          } else if (Array.isArray(employees)) {

            resolvedEmployees = employees as EmployeeTimesheetDto[];

          } else if ((employees as any).employees && Array.isArray((employees as any).employees)) {

            resolvedEmployees = (employees as any).employees as EmployeeTimesheetDto[];

          } else {


            resolvedEmployees = (employees as unknown as EmployeeTimesheetDto[]) || [];

          }




          resolvedEmployees = resolvedEmployees.map(emp => this.normalizeEmployeeTimesheet(emp));

          resolvedEmployees = resolvedEmployees.map(emp => this.mergeDraftCache(emp));

          this.employees = resolvedEmployees;

          this.filteredEmployees = [...resolvedEmployees];

          this.totalRecords = this.filteredEmployees.length;

          this.dailyRecordsCache.clear();

          this.updateDisplayedEmployees();

          this.isLoading = false;

          console.log('[OK] Loaded timesheet details for', this.employees.length, 'employees');




          if (this.isEmployeeRole() && this.filteredEmployees.length > 0) {

            this.expandedEmployee = this.filteredEmployees[0];

            console.log('ðŸ”“ Auto-expanded employee row for employee role');

          }

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
      const textMatch =
        emp.employeeName.toLowerCase().includes(searchLower) ||
        emp.employeeCode.toLowerCase().includes(searchLower) ||
        emp.employeeId.toLowerCase().includes(searchLower) ||
        (emp.department || '').toLowerCase().includes(searchLower);

      const statusMatch = this.statusFilter === 'all' ||
        this.getEmployeeTimesheetStatus(emp) === this.statusFilter;

      return textMatch && statusMatch;
    });

    this.totalRecords = this.filteredEmployees.length;
    this.pageIndex = 0;
    this.updateDisplayedEmployees();

    if (this.filteredEmployees.length > 0) {
      this.selectedEmployee = this.filteredEmployees[0];
    } else {
      this.selectedEmployee = null;
    }

  }



  clearFilter(): void {

    this.searchText = '';
    this.statusFilter = 'all';
    this.departmentFilter = 'all';

    this.applyFilter();

  }

  setStatusFilter(filter: string): void {
    this.statusFilter = filter;
    this.applyFilter();
  }

  getEmployeeTimesheetStatus(emp: EmployeeTimesheetDto): string {
    if (emp.is_finalized) return 'finalized';
    const records = (emp as any).dailyRecords || [];
    const hasPending = records.some((r: any) => r.hasPendingRequest);
    const hasDraft   = records.some((r: any) => r.hasDraftRequest);
    if (hasPending) return 'pending';
    if (hasDraft)   return 'in_progress';
    return 'untouched';
  }

  getStatusCount(filter: string): number {
    return this.employees.filter(emp => this.getEmployeeTimesheetStatus(emp) === filter).length;
  }

  getDeptCount(dept: string): number {
    if (dept === 'all') return this.employees.length;
    return this.employees.filter(emp => (emp.department || '') === dept).length;
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


    const resolvedAttendanceId = record.attendanceId

      || record['AttendanceId']

      || record['attendanceid']

      || '';

    const dialogMode = 'edit';


    const hasEditableRequest = record.hasDraftRequest === true || record.hasPendingRequest === true;

    const prefillCheckIn = hasEditableRequest && record.requestedCheckIn

      ? record.requestedCheckIn

      : (record.checkInTime || record.CheckInTime || null);

    const prefillCheckOut = hasEditableRequest && record.requestedCheckOut

      ? record.requestedCheckOut

      : (record.checkOutTime || record.CheckOutTime || null);



    const prefillStatus = hasEditableRequest && record.requestedStatus

      ? record.requestedStatus

      : (record.status || record.Status || 'Absent');

    const prefillNotes = hasEditableRequest && record.requestedNotes

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

          const empId = employee.employeeId;
          this.saveDraftToStorage(empId, record.date, draftData);

          Object.assign(record, draftData);

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
            const empIdx = this.employees.findIndex(e => e.employeeId === employee.employeeId);
            if (empIdx >= 0) {
              (this.employees[empIdx] as any).is_finalized = true;
              this.employees[empIdx].dailyRecords?.forEach((r: any) => {
                r.is_finalized  = true;
                r.isFinalized   = true;
              });
              if (this.selectedEmployee?.employeeId === employee.employeeId) {
                this.selectedEmployee = this.employees[empIdx];
              }
              this.dailyRecordsCache.delete(employee.employeeId);
            }
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

    const employee = this.selectedEmployee || this.expandedEmployee || this.employees[0];

    if (!employee?.dailyRecords?.length) return false;

    return employee.dailyRecords.some(record => record.hasDraftRequest === true);

  }




  getDraftRequestCount(): number {

    if (this.expandedEmployee) {

      return this.expandedEmployee.dailyRecords?.filter(r => r.hasDraftRequest)?.length || 0;

    }

    return this.employees.reduce((count, emp) => {

      const empDraftCount = emp.dailyRecords?.filter(r => r.hasDraftRequest)?.length || 0;

      return count + empDraftCount;

    }, 0);

  }




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




  isTimesheetUnderReview(employee?: any): boolean {
    const emp = employee || this.selectedEmployee || this.expandedEmployee || (this.employees?.[0] ?? null);
    if (!emp?.dailyRecords?.length) return false;
    return emp.dailyRecords.some((r: any) => r.hasPendingRequest === true);
  }



  canRequestCorrection(record: any): boolean {

    if (record.is_finalized || record.isFinalized) {
      return false;
    }

    // Manager override is an administrative decision — employee cannot
    // raise a correction request on it. Only the manager can re-override.
    if (record.is_manager_override || record.isManagerOverride) {
      return false;
    }

    if (record.hasPendingRequest) {
      return false;
    }

    return true;

  }


  isEmployeePayrollLocked(employee: EmployeeTimesheetDto | null): boolean {
    if (!employee) return false;
    return (employee as any).is_finalized === true;
  }



  canFinalizeRecord(employee: EmployeeTimesheetDto): boolean {


    return !employee.is_finalized && this.isManagerOrAdmin();

  }



  showLockIcon(employee: EmployeeTimesheetDto): boolean {

    return employee.is_finalized === true;

  }



  onDisabledButtonClick(record: any): void {

    if (record.is_finalized || record.isFinalized) {
      this.notificationService.showInfo('This record has been finalized for payroll and cannot be modified');
    } else if (record.is_manager_override || record.isManagerOverride) {
      this.notificationService.showInfo('This record has been adjusted by your manager. If you believe this is incorrect, please speak with your manager directly.');
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





  getDailyRecordsForMonth(employee: EmployeeTimesheetDto): any[] {
    if (this.dailyRecordsCache.has(employee.employeeId)) {
      return this.dailyRecordsCache.get(employee.employeeId)!;
    }

    const { periodStart, periodEnd } = this.resolvePeriodDates();
    const allDays: any[] = [];
    const employeeRecords = employee.dailyRecords || [];
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const cur = new Date(periodStart); cur.setHours(0, 0, 0, 0);
    const end = new Date(periodEnd);   end.setHours(0, 0, 0, 0);

    while (cur <= end) {
      const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      const isWeekend = cur.getDay() === 0 || cur.getDay() === 6;
      const isFuture  = cur > today;

      const existingRecord = employeeRecords.find(r =>
        r.date === dateStr || (r.date && r.date.startsWith(dateStr))
      );

      if (existingRecord) {
        (existingRecord as any).status    = this.titleCaseStatus((existingRecord as any).status || (existingRecord as any).Status || '');
        (existingRecord as any).isWeekend = !!(existingRecord as any).isWeekend || isWeekend;
        allDays.push(existingRecord);
      } else {
        let statusLabel = 'No Record';
        if (isWeekend)       statusLabel = 'Weekend';
        else if (!isFuture)  statusLabel = 'Absent';

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
          isWeekend
        });
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (this.isEmployeePayrollLocked(employee)) {
      allDays.forEach((r: any) => {
        if (!r.isWeekend && new Date(r.date).setHours(0, 0, 0, 0) <= today.getTime()) {
          r.is_finalized = true;
        }
      });
    }

    this.dailyRecordsCache.set(employee.employeeId, allDays);
    return allDays;
  }

  /** Resolves period bounds, falling back to legacy month/year if dialog data is older. */
  private resolvePeriodDates(): { periodStart: Date; periodEnd: Date } {
    if (this.data.startDate && this.data.endDate) {
      return {
        periodStart: new Date(this.data.startDate),
        periodEnd:   new Date(this.data.endDate)
      };
    }
    const m = this.data.month ?? new Date().getMonth() + 1;
    const y = this.data.year  ?? new Date().getFullYear();
    return {
      periodStart: new Date(y, m - 1, 1),
      periodEnd:   new Date(y, m,     0)
    };
  }

  /** Human-friendly period label for dialog headers. */
  getPeriodLabel(): string {
    if (this.data.startDate && this.data.endDate) {
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${fmt(new Date(this.data.startDate))} – ${fmt(new Date(this.data.endDate))}`;
    }
    return `${this.data.monthName ?? ''} ${this.data.year ?? ''}`.trim();
  }





  canManagerOverride(record: any): boolean {

    if (!this.isManagerOrAdmin()) return false;

    // Block only truly finalized (payroll-locked) records; allow re-override of overridden records
    if ((record.is_finalized || record.isFinalized) && !record.is_manager_override) return false;


    const status = (record.status || '').toLowerCase().replace(/[_ ]/g, '');

    if (status === 'norecord' || (record.isPlaceholder && !record.checkInTime && !record.checkOutTime && status !== 'absent')) return false;

    if (status === 'weekend' || record.isWeekend) return false;

    return true;

  }

  openManagerOverride(employee: EmployeeTimesheetDto, record: any): void {

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

        Object.assign(record, {
          checkInTime:        result.checkInTime  || record.checkInTime,
          checkOutTime:       result.checkOutTime || record.checkOutTime,
          status:             result.status ? this.titleCaseStatus(result.status) : record.status,
          is_manager_override: true,
          is_finalized:       false,
          hasPendingRequest:  false
        });

        this.dailyRecordsCache.delete(employee.employeeId);

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
    if (employee.attendancePercentage === 0) return true;

    const { periodStart, periodEnd } = this.resolvePeriodDates();
    let workDays = 0;
    const cur = new Date(periodStart);
    while (cur <= periodEnd) {
      const d = cur.getDay();
      if (d !== 0 && d !== 6) workDays++;
      cur.setDate(cur.getDate() + 1);
    }
    const recordCount = employee.dailyRecords?.filter(r =>
      r.status !== 'No Record' && r.checkInTime !== null
    ).length || 0;

    return workDays > 0 && ((workDays - recordCount) / workDays) * 100 > 50;
  }



  formatDate(dateStr: string): string {

    const date = new Date(dateStr);

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  }



  formatTime(timeStr: string | null | undefined): string {

    if (!timeStr) return '-';

    // ISO timestamp (with or without offset / Z): parse as a moment and render in
    // the viewer's local timezone. The DB stores timestamptz so the wire value
    // pinpoints the same instant regardless of representation; toLocaleTimeString
    // normalizes that instant to "what the clock said in the viewer's timezone".
    if (typeof timeStr === 'string' && timeStr.includes('T')) {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
    }

    // Bare "HH:MM" string (no date) — handle directly without date parsing.
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




  private mergeDraftCache(emp: EmployeeTimesheetDto): EmployeeTimesheetDto {
    const empCache = this.loadDraftMapForEmployee(emp.employeeId);
    if (empCache.size === 0) return emp;

    const records = [...(emp.dailyRecords || [])];

    empCache.forEach((draftData, date) => {
      const existing = records.find(r => r.date === date);
      if (existing) {
        if (existing.hasDraftRequest || existing.hasPendingRequest) {
          const serverHasRequestedFields = !!(
            existing.requestedCheckIn || existing.requestedCheckOut || existing.requestedStatus
          );
          if (!serverHasRequestedFields) {
            existing.requestedCheckIn  = existing.requestedCheckIn  ?? draftData.requestedCheckIn;
            existing.requestedCheckOut = existing.requestedCheckOut ?? draftData.requestedCheckOut;
            existing.requestedStatus   = existing.requestedStatus   ?? draftData.requestedStatus;
            existing.requestedNotes    = existing.requestedNotes    ?? draftData.requestedNotes;
          } else {
            this.removeDraftFromStorage(emp.employeeId, date);
          }
        } else {
          Object.assign(existing, draftData);
        }
      } else {
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

    const serverIsFinalized: boolean =
      (emp as any).is_finalized ?? (emp as any).isFinalized ?? (emp as any).IsFinalized ?? false;

    const normalized: EmployeeTimesheetDto = { ...emp } as any;

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

        overtimeHours: raw.overtimeHours ?? raw.OvertimeHours ?? raw.overtime_hours ?? 0,

        overtimeType: raw.overtimeType ?? raw.OvertimeType ?? raw.overtime_type ?? null,

        lateMinutes: raw.lateMinutes ?? raw.LateMinutes ?? raw.late_minutes ?? 0,

        leaveTypeId: raw.leaveTypeId ?? raw.LeaveTypeId ?? raw.leave_type_id ?? null,

        leaveTypeName: raw.leaveTypeName ?? raw.LeaveTypeName ?? raw.leave_type_name ?? null,

        leavePayType: raw.leavePayType ?? raw.LeavePayType ?? raw.leave_pay_type ?? null,

        requestedLeaveTypeId: raw.requestedLeaveTypeId ?? raw.RequestedLeaveTypeId ?? null,

        requestedLeaveTypeName: raw.requestedLeaveTypeName ?? raw.RequestedLeaveTypeName ?? null,

        requestedLeavePayType: raw.requestedLeavePayType ?? raw.RequestedLeavePayType ?? null,

        requestedOvertimeHours: raw.requestedOvertimeHours ?? raw.RequestedOvertimeHours ?? null,

        requestedOvertimeType: raw.requestedOvertimeType ?? raw.RequestedOvertimeType ?? null,

        requestedLateMinutes: raw.requestedLateMinutes ?? raw.RequestedLateMinutes ?? null,

        notes: raw.notes || raw.Notes || null,

        is_finalized: raw.is_finalized || raw.isFinalized || raw.IsFinalized || false,

        is_manager_override: raw.is_manager_override || raw.isManagerOverride || raw.IsManagerOverride || false,

        hasApprovedRequest: raw.hasApprovedRequest || raw.HasApprovedRequest || raw.has_approved_request || false,

        hasPendingRequest: raw.hasPendingRequest || raw.HasPendingRequest || raw.has_pending_request || false,

        hasDraftRequest: raw.hasDraftRequest || raw.HasDraftRequest || raw.has_draft_request || false,

        hasRejectedRequest: raw.hasRejectedRequest || raw.HasRejectedRequest || raw.has_rejected_request || false,

        requestedCheckIn:  raw.requestedCheckIn  || raw.RequestedCheckIn  || raw.requested_checkin  || null,

        requestedCheckOut: raw.requestedCheckOut || raw.RequestedCheckOut || raw.requested_checkout || null,

        requestedStatus:   raw.requestedStatus   || raw.RequestedStatus   || raw.requested_status   || null,

        requestedNotes:    raw.requestedNotes    || raw.RequestedNotes    || raw.requested_notes    || null,

        isPlaceholder: raw.isPlaceholder || false,

        isWeekend: !!raw.isWeekend

      };

      return rec;

    });

    const days = normalized.dailyRecords || [];

    const presentDays = days.filter(d => d.status && d.status.toLowerCase() === 'present').length;

    const absentDays = days.filter(d => d.status && d.status.toLowerCase() === 'absent').length;

    const totalDays = days.filter(d => {
      const s = ((d as any).status || '').toLowerCase().replace(/[_ ]/g, '');
      return s !== 'weekend' && s !== 'norecord' && s !== 'holiday';
    }).length || 1;

    let derivedIsFinalized = serverIsFinalized;
    if (!derivedIsFinalized) {
      // Include ALL elapsed non-weekend records — absent finalized days have no attendanceId
      // but vw_employee_timesheet_details still marks them is_finalized=true
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const realRecords = days.filter((d: any) => {
        const s = ((d as any).status || '').toLowerCase().replace(/[_ ]/g, '');
        if (s === 'weekend' || s === 'norecord') return false;
        const workDate = new Date((d as any).date || (d as any).workDate || '');
        return !isNaN(workDate.getTime()) && workDate < today;
      });

      if (realRecords.length > 0 && realRecords.every((d: any) =>
          (d as any).is_finalized === true || (d as any).isFinalized === true)) {
        derivedIsFinalized = true;
      }
    }
    (normalized as any).is_finalized = derivedIsFinalized;

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




  getEffectiveStatus(record: any): string {
    if ((record.hasDraftRequest || record.hasPendingRequest) && record.requestedStatus) {
      return record.requestedStatus.toLowerCase();
    }
    return (record.status || '').toLowerCase();
  }



  showTimes(record: any): boolean {

    const status = (record.status || '').toLowerCase().replace(/[_ ]/g, '');

    if (['norecord', 'weekend', 'leave', 'onleave', 'holiday'].includes(status)) return false;

    if (record.hasDraftRequest || record.hasPendingRequest) return true;

    if (record.checkInTime || record.checkOutTime) return true;

    return false;

  }

  public isFutureDay(record: any): boolean {

    const today = new Date();

    const recordDate = new Date(record.date);

    return recordDate > today;

  }
    hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Attendance', 'Timesheet', actionKey);
  }

}