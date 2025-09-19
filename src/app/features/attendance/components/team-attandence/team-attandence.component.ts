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
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest } from 'rxjs';

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
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDividerModule
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
  
  // Current user
  currentUser: User | null = null;
  
  // Table configuration
  displayedColumns: string[] = [
    'employee',
    'date',
    'checkIn',
    'checkOut',
    'totalHours',
    'status',
    'notes',
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
    private snackBar: MatSnackBar
  ) {}

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
          console.error('Error loading departments:', error);
        }
      });
  }

  private loadDailyStats(): void {
    this.attendanceService.getDailyAttendanceStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.dailyStats = stats;
        },
        error: (error) => {
          console.error('Error loading daily stats:', error);
        }
      });
  }

  private setupFilters(): void {
    combineLatest([
      this.startDateControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
      this.endDateControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
      this.departmentControl.valueChanges,
      this.statusControl.valueChanges
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.loadAttendanceData();
    });
  }

  private loadAttendanceData(): void {
    this.isLoading = true;
    
    const startDate = this.startDateControl.value?.toISOString().split('T')[0] || '';
    const endDate = this.endDateControl.value?.toISOString().split('T')[0] || '';
    
    const searchRequest: AttendanceSearchRequest = {
      startDate,
      endDate,
      departmentId: this.departmentControl.value || undefined,
      status: this.statusControl.value || undefined,
      page: 1,
      pageSize: 100
    };

    this.attendanceService.getAttendances(searchRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.attendanceRecords = response.attendances;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading attendance data:', error);
          this.showError('Failed to load attendance data');
          this.isLoading = false;
        }
      });
  }

  private applyFilters(): void {
    this.filteredAttendance = [...this.attendanceRecords];
  }

  clearFilters(): void {
    this.startDateControl.setValue(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    this.endDateControl.setValue(new Date());
    this.departmentControl.setValue('');
    this.statusControl.setValue('');
  }

  viewAttendanceDetails(attendance: Attendance): void {
    // TODO: Implement attendance details view
    console.log('View attendance details:', attendance);
  }

  editAttendance(attendance: Attendance): void {
    // TODO: Implement attendance edit dialog
    console.log('Edit attendance:', attendance);
  }

  approveAttendance(attendance: Attendance): void {
    // TODO: Implement attendance approval
    console.log('Approve attendance:', attendance);
    this.showSuccess('Attendance approved successfully');
  }

  rejectAttendance(attendance: Attendance): void {
    // TODO: Implement attendance rejection
    console.log('Reject attendance:', attendance);
    this.showSuccess('Attendance rejected');
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
          this.showSuccess('Report exported successfully');
        },
        error: (error) => {
          console.error('Export error:', error);
          this.showError('Failed to export report');
        }
      });
  }

  formatHours(hours: number): string {
    if (hours === 0) return '0h 0m';
    const hrs = Math.floor(hours);
    const mins = Math.round((hours - hrs) * 60);
    return `${hrs}h ${mins}m`;
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}