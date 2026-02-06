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
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Subject, takeUntil } from 'rxjs';

import { AttendanceService } from '../../services/attendance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EmployeeTimesheetDto } from '../../../../core/models/attendance.models';
import { AttendanceRequestDialogComponent } from '../attendance-request-dialog/attendance-request-dialog.component';

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
    MatSortModule
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
  employees: EmployeeTimesheetDto[] = [];
  filteredEmployees: EmployeeTimesheetDto[] = [];
  displayedEmployees: EmployeeTimesheetDto[] = [];
  isLoading = false;
  searchText = '';
  expandedEmployee: EmployeeTimesheetDto | null = null;
  isSubmittingApprovals = false;
  isApprovingAll = false;
  currentUserRole = '';

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
    this.currentUserRole = this.data.userRole || '';
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.currentUserRole = user.role || user.roleName || this.currentUserRole || '';
        }
      });
    this.loadTimesheetDetails();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTimesheetDetails(): void {
    this.isLoading = true;
    // Use timesheetId to fetch employee details
    this.attendanceService.getTimesheetDetails(this.data.timesheetId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employees) => {
          this.employees = employees;
          this.filteredEmployees = [...employees];
          this.totalRecords = this.filteredEmployees.length;
          this.updateDisplayedEmployees();
          this.isLoading = false;
          console.log('✅ Loaded timesheet details for', employees.length, 'employees');
          
          // Auto-expand for employee role
          if (this.isEmployeeRole() && this.filteredEmployees.length > 0) {
            this.expandedEmployee = this.filteredEmployees[0];
            console.log('🔓 Auto-expanded employee row for employee role');
          }
        },
        error: (error) => {
          console.error('❌ Error loading timesheet details:', error);
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
    // For grouped employee view, we'll need to show a dialog to select which day
    // or implement a different flow. For now, we'll show an info message.
    // TODO: Implement day-level correction request dialog
    this.notificationService.showInfo(
      `Correction request for ${employee.employeeName}. Daily record selection will be implemented.`
    );
    
    /* Future implementation:
    const dialogRef = this.dialog.open(AttendanceRequestDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      data: {
        employeeId: employee.employeeId,
        timesheetId: this.data.timesheetId,
        employeeName: employee.employeeName,
        dailyRecords: employee.dailyRecords
      },
      panelClass: 'attendance-request-dialog-panel'
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result?.success) {
          this.loadTimesheetDetails();
        }
      });
    */
  }

  requestDailyCorrection(employee: EmployeeTimesheetDto, record: any): void {
    if (!record.attendanceId) {
      this.notificationService.showWarning('Cannot edit a record that does not exist');
      return;
    }

    // Open the attendance request dialog with the specific day's data
    const dialogRef = this.dialog.open(AttendanceRequestDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      data: {
        attendanceId: record.attendanceId,
        timesheetId: this.data.timesheetId,
        employeeName: employee.employeeName,
        workDate: record.date,
        originalCheckIn: record.checkInTime,
        originalCheckOut: record.checkOutTime,
        originalStatus: record.status,
        originalNotes: record.notes
      },
      panelClass: 'attendance-request-dialog-panel'
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result?.success) {
          this.notificationService.showSuccess('Correction request submitted successfully');
          this.loadTimesheetDetails();
        }
      });
  }

  finalizeRecord(employee: EmployeeTimesheetDto): void {
    if (confirm(`Are you sure you want to finalize all records for ${employee.employeeName}?`)) {
      // Call service to finalize employee's timesheet for this month
      this.attendanceService.finalizeBatch(employee.employeeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess(`Records finalized successfully for ${employee.employeeName}`);
            this.loadTimesheetDetails();
          },
          error: (error) => {
            console.error('❌ Error finalizing record:', error);
            const errorMessage = error?.message || 'Failed to finalize record';
            this.notificationService.showError(errorMessage);
          }
        });
    }
  }

  viewRecordDetails(employee: EmployeeTimesheetDto): void {
    // TODO: Implement view details functionality - show daily breakdown
    this.notificationService.showInfo(`View daily details for ${employee.employeeName}`);
  }

  exportToExcel(): void {
    // TODO: Implement export functionality
    this.notificationService.showInfo('Export to Excel functionality will be implemented');
  }

  hasDraftDailyRecords(): boolean {
    const employee = this.employees[0];
    if (!employee?.dailyRecords?.length) return false;
    return employee.dailyRecords.some(record => record.hasDraftRequest === true);
  }

  /**
   * Check if there are any draft requests that can be submitted
   * Returns true if any daily record has hasDraftRequest === true
   */
  canSubmitBatch(): boolean {
    const employee = this.employees[0];
    if (!employee?.dailyRecords?.length) return false;
    return employee.dailyRecords.some(record => record.hasDraftRequest === true);
  }

  submitAllEdits(): void {
    if (this.isSubmittingApprovals || !this.canSubmitBatch()) return;

    this.isSubmittingApprovals = true;
    this.attendanceService.submitTimesheetApprovals(this.data.timesheetId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Timesheet submitted to your manager for approval');
          this.loadTimesheetDetails();
          this.isSubmittingApprovals = false;
        },
        error: (error) => {
          console.error('❌ Error submitting timesheet approvals:', error);
          const errorMessage = error?.message || 'Failed to submit timesheet approvals';
          this.notificationService.showError(errorMessage);
          this.isSubmittingApprovals = false;
        }
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

  canRequestCorrection(employee: EmployeeTimesheetDto): boolean {
    // Employees can request correction if record is not finalized or has no pending request
    if (employee.hasPendingRequest) {
      return false;
    }
    return true;
  }

  canFinalizeRecord(employee: EmployeeTimesheetDto): boolean {
    // Managers can finalize records that aren't already finalized
    return !employee.is_finalized && this.isManagerOrAdmin();
  }

  showLockIcon(employee: EmployeeTimesheetDto): boolean {
    return employee.is_finalized === true;
  }

  onDisabledButtonClick(employee: EmployeeTimesheetDto): void {
    if (employee.is_finalized) {
      this.notificationService.showInfo('This record has been finalized for payroll and cannot be modified');
    } else if (employee.hasPendingRequest) {
      this.notificationService.showInfo('A correction request is already pending for this employee');
    }
  }

  getActionButtonLabel(): string {
    // Employee role sees "Request Correction", Managers see "Finalize Record"
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

  isExpanded(employee: EmployeeTimesheetDto): boolean {
    return this.expandedEmployee === employee;
  }

  /**
   * Generates a complete array of daily records for the entire month
   * Fills in missing days with 'No Record' status
   */
  getDailyRecordsForMonth(employee: EmployeeTimesheetDto): any[] {
    const daysInMonth = new Date(this.data.year, this.data.month, 0).getDate();
    const allDays: any[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${this.data.year}-${String(this.data.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Find if there's a record for this day
      const existingRecord = employee.dailyRecords?.find(r => 
        r.date === dateStr || new Date(r.date).getDate() === day
      );

      if (existingRecord) {
        allDays.push(existingRecord);
      } else {
        // Create a placeholder for missing day
        allDays.push({
          date: dateStr,
          checkInTime: null,
          checkOutTime: null,
          status: 'No Record',
          totalHours: 0,
          notes: 'No attendance record',
          is_finalized: false,
          hasPendingRequest: false
        });
      }
    }

    return allDays;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  formatTime(timeStr: string | null | undefined): string {
    if (!timeStr) return '--';
    return timeStr;
  }

  isEmployeeRole(): boolean {
    return this.currentUserRole?.toLowerCase() === 'employee';
  }

  /**
   * Count pending correction requests
   * If an employee is expanded, count only their pending requests
   * Otherwise, count all pending requests in the timesheet
   */
  getPendingRequestCount(): number {
    if (this.expandedEmployee) {
      // Count pending requests for the expanded employee only
      return this.expandedEmployee.dailyRecords?.filter(r => r.hasPendingRequest)?.length || 0;
    }
    // Count all pending requests across all employees
    return this.employees.reduce((count, emp) => {
      const empPendingCount = emp.dailyRecords?.filter(r => r.hasPendingRequest)?.length || 0;
      return count + empPendingCount;
    }, 0);
  }

  /**
   * Approve all pending correction requests
   * If an employee row is expanded, approve only that employee's requests
   * Otherwise, approve all pending requests for the entire team
   */
  approveAllPending(): void {
    const pendingCount = this.getPendingRequestCount();
    if (pendingCount === 0) {
      this.notificationService.showInfo('No pending correction requests to approve');
      return;
    }

    const scope = this.expandedEmployee 
      ? `${this.expandedEmployee.employeeName}'s` 
      : 'the entire team';
    
    const confirmMessage = `Are you sure you want to approve all ${pendingCount} pending corrections for ${scope} in this period?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    this.isApprovingAll = true;
    const employeeId = this.expandedEmployee?.employeeId;

    this.attendanceService.approveAllPendingRequests(this.data.timesheetId, employeeId)
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
          console.error('❌ Error approving pending requests:', error);
          const errorMessage = error?.message || 'Failed to approve pending requests';
          this.notificationService.showError(errorMessage);
          this.isApprovingAll = false;
        }
      });
  }
}
