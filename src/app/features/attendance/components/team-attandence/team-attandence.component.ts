import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '../../../../core/services/notification.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest } from 'rxjs';
import { MatPaginatorModule } from '@angular/material/paginator';

import { MatDialog } from '@angular/material/dialog';
import { ViewDetailsDialogueComponent } from '../view-details-dialogue/view-details-dialogue.component';

import { AttendanceService } from '../../services/attendance.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  Attendance,
  DailyAttendanceStats,
  AttendanceSearchRequest
} from '../../../../core/models/attendance.models';
import { Department } from '../../../../core/models/employee.models';
import { User } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-team-attandence',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './team-attandence.component.html',
  styleUrls: ['./team-attandence.component.scss']
})
export class TeamAttandenceComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  attendanceRecords: Attendance[] = [];
  filteredAttendance: Attendance[] = [];
  departments: Department[] = [];
  dailyStats: DailyAttendanceStats | null = null;
  totalRecords: number = 0;
  currentPage = 1;
  pageSize = 10;
  // Current user
  currentUser: User | null = null;

  // Table configuration
  displayedColumns: string[] = [
    'employee',
    'date',
    'checkIn',
    'checkOut',
    'sessions',
    'totalHours',
    'status',
    'notes',
    'ipAddress',
    'actions'
  ];

  // Loading states
  isLoading = false;

  // Filters
  startDateControl = new FormControl(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  endDateControl = new FormControl(new Date());
  departmentControl = new FormControl('');
  statusControl = new FormControl('');

  // Filter options
  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'present', label: 'Present' },
    { value: 'absent', label: 'Absent' },
    { value: 'late', label: 'Late' },
    { value: 'early_departure', label: 'Early Departure' },
    { value: 'half_day', label: 'Half Day' },
    { value: 'on_leave', label: 'On Leave' },
    { value: 'pending_approval', label: 'Pending Approval' }
  ];

  constructor(
    private attendanceService: AttendanceService,
    private employeeService: EmployeeService,
    private authService: AuthService,
    private dialog: MatDialog,
    private notification: NotificationService
  ) { }

  ngOnInit(): void {
    this.getCurrentUser();
    this.loadDepartments();
    this.loadDailyStats();
    this.setupFilters();
    this.loadAttendanceData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getCurrentUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  private loadDepartments(): void {
    this.employeeService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (departments) => {
          this.departments = departments;
        },
        error: (error) => {
          const errorMessage = error?.error?.message || error?.message || 'Failed to load departments';
          this.notification.showError(errorMessage);
        }
      });
  }

  onPageChange(event: any) {
    this.currentPage = event.pageIndex + 1;   // because paginator starts from 0
    this.pageSize = event.pageSize;
    this.loadAttendanceData();
  }

  private loadDailyStats(): void {
    this.attendanceService.getDailyAttendanceStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.dailyStats = stats;
        },
        error: (error) => {
          const errorMessage = error?.error?.message || error?.message || 'Failed to load daily stats';
          this.notification.showError(errorMessage);
        }
      });
  }

  private setupFilters(): void {
    // Removed auto-filtering - now filters are applied only when Apply Filters button is clicked
  }

  applyFilters(): void {
    this.loadAttendanceData();
  }

  private loadAttendanceData(): void {
    this.isLoading = true;

    const formatLocalDate = (date: Date | null) => {
      if (!date) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const startDate = formatLocalDate(this.startDateControl.value);
    const endDate = formatLocalDate(this.endDateControl.value);

    const searchRequest: AttendanceSearchRequest = {
      startDate,
      endDate,
      departmentId: this.departmentControl.value || undefined,
      status: this.statusControl.value || undefined,
      page: this.currentPage,
      pageSize: this.pageSize
    };

    this.attendanceService.getAttendances(searchRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.attendanceRecords = response.attendances;
          this.totalRecords = response.totalCount;
          this.filterAttendanceData();
          this.isLoading = false;
        },
        error: (error) => {
          const errorMessage = error?.error?.message || error?.message || 'Failed to load attendance data';
          this.notification.showError(errorMessage);
          this.isLoading = false;
        }
      });
  }

  private filterAttendanceData(): void {
    this.filteredAttendance = [...this.attendanceRecords];
  }


  clearFilters(): void {
    this.startDateControl.setValue(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    this.endDateControl.setValue(new Date());
    this.departmentControl.setValue('');
    this.statusControl.setValue('');
  }

  viewAttendanceDetails(attendance: Attendance): void {
    this.dialog.open(ViewDetailsDialogueComponent, {
      width: '600px',
      panelClass: 'attendance-details-dialog',
      data: {
        employeeId: attendance.employeeId,
        employeeName: attendance.employeeName,
        workDate: attendance.workDate,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        totalHours: this.formatHours(attendance.totalHours),
        overtimeHours: attendance.overtimeHours,
        status: attendance.status,
        notes: attendance.notes

      }
    });
  }


  editAttendance(attendance: Attendance): void {
    // TODO: Implement attendance edit dialog
    console.log('Edit attendance:', attendance);
  }

  approveAttendance(attendance: Attendance): void {
    // TODO: Implement attendance approval
    console.log('Approve attendance:', attendance);
    this.notification.showSuccess('Attendance approved successfully');
  }

  rejectAttendance(attendance: Attendance): void {
    // TODO: Implement attendance rejection
    console.log('Reject attendance:', attendance);
    this.notification.showSuccess('Attendance rejected');
  }

  exportReport(): void {
    const startDate = this.startDateControl.value?.toISOString().split('T')[0] || '';
    const endDate = this.endDateControl.value?.toISOString().split('T')[0] || '';

    this.attendanceService.exportAttendanceReport(startDate, endDate, 'xlsx')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `team-attendance-${startDate}-to-${endDate}.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.notification.showSuccess('Report exported successfully');
        },
        error: (error) => {
          const errorMessage = error?.error?.message || error?.message || 'Failed to export report';
          this.notification.showError(errorMessage);
        }
      });
  }

  formatHours(hours: number): string {
    if (hours === 0) return '0h 0m';
    const hrs = Math.floor(hours);
    const mins = Math.round((hours - hrs) * 60);
    return `${hrs}h ${mins}m`;
  }

  parseIP(ipString: string): string | null {
  try {
    const obj = JSON.parse(ipString);
    return obj.ip || null;
  } catch (e) {
    return ipString || null; // fallback if it's already plain string
  }
}



}
