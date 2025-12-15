import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';

import { AttendanceService } from '../../services/attendance.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { AttendanceReport,DepartmentEmployee } from '../../../../core/models/attendance.models';
import { Department, Employee } from '../../../../core/models/employee.models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatPaginatorModule
  ],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  reportData: AttendanceReport | null = null;
  departments: Department[] = [];
  employees: Employee[] = [];
departmentEmployees: DepartmentEmployee[] = [];
  // Table configuration
  displayedColumns: string[] = [
    'employee',
    'date',
    'checkIn',
    'checkOut',
    'totalHours',
    'status'
  ];

  // Loading states
  isLoading = false;

  // Pagination
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50, 100];

  // Filters
  startDateControl = new FormControl(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  endDateControl = new FormControl(new Date());
  departmentControl = new FormControl('');
  employeeControl = new FormControl('');
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
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDepartmentsOnly();

    // Listen for department changes to load employees dynamically
    this.departmentControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((departmentId) => {
        this.loadEmployeesByDepartment(departmentId);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // -----------------------------
  // Load departments initially
  // -----------------------------
  private loadDepartmentsOnly(): void {
    this.employeeService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (departments) => {
          this.departments = departments;
          this.employees = []; // Start with empty employees
        },
        error: (error) => console.error('Error loading departments:', error)
      });
  }

  // -----------------------------
  // Load employees dynamically by department
  // -----------------------------
  private loadEmployeesByDepartment(departmentId: string | null): void {
    if (!departmentId) {
      // No department selected → clear employee list
      this.employees = [];
      this.employeeControl.setValue('');
      return;
    }

this.attendanceService.getDepartmentEmployees(departmentId)
  .pipe(takeUntil(this.destroy$))
  .subscribe({
    next: (deptEmployees) => {
      this.departmentEmployees = deptEmployees; // store in new array
      this.employeeControl.setValue(''); // reset selected employee if needed
    },
    error: (err) => {
      console.error('Error loading employees:', err);
      this.showError('Failed to load employees for department');
    }
  });




  }

  // -----------------------------
  // Generate attendance report
  // -----------------------------
  generateReport(): void {
    this.isLoading = true;

    const startDate = this.startDateControl.value?.toISOString().split('T')[0] || '';
    const endDate = this.endDateControl.value?.toISOString().split('T')[0] || '';
    const employeeId = this.employeeControl.value ? this.employeeControl.value : undefined;
    const departmentId = this.departmentControl.value || undefined;
    const status = this.statusControl.value || undefined;

    // Reset to first page when generating new report
    this.pageIndex = 0;

    this.attendanceService.getAttendanceReport(startDate, endDate, employeeId, departmentId, status, this.pageIndex + 1, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.reportData = report;
          this.isLoading = false;
          this.showSuccess('Report generated successfully');
        },
        error: (error) => {
          console.error('Error generating report:', error);
          this.showError('Failed to generate report');
          this.isLoading = false;
        }
      });
  }

  // -----------------------------
  // Pagination
  // -----------------------------
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;

    if (this.reportData) {
      this.loadPage();
    }
  }

  private loadPage(): void {
    if (!this.startDateControl.value || !this.endDateControl.value) {
      return;
    }

    this.isLoading = true;

    const startDate = this.startDateControl.value?.toISOString().split('T')[0] || '';
    const endDate = this.endDateControl.value?.toISOString().split('T')[0] || '';
    const employeeId = this.employeeControl.value ? this.employeeControl.value : undefined;
    const departmentId = this.departmentControl.value || undefined;
    const status = this.statusControl.value || undefined;

    this.attendanceService.getAttendanceReport(startDate, endDate, employeeId, departmentId, status, this.pageIndex + 1, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.reportData = report;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading page:', error);
          this.showError('Failed to load page');
          this.isLoading = false;
        }
      });
  }

  // -----------------------------
  // Date range shortcuts
  // -----------------------------
  setDateRange(range: string): void {
    const today = new Date();
    let startDate: Date;

    switch (range) {
      case 'today':
        startDate = new Date(today);
        this.endDateControl.setValue(new Date(today));
        break;
      case 'week':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        this.endDateControl.setValue(new Date(today));
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        this.endDateControl.setValue(new Date(today));
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        this.endDateControl.setValue(new Date(today));
        break;
      default:
        return;
    }

    this.startDateControl.setValue(startDate);
  }

  // -----------------------------
  // Export functions
  // -----------------------------
  exportToCSV(): void {
    this.exportReport('csv');
  }

  exportToExcel(): void {
    this.exportReport('xlsx');
  }

  private exportReport(format: 'csv' | 'xlsx'): void {
    const startDate = this.startDateControl.value?.toISOString().split('T')[0] || '';
    const endDate = this.endDateControl.value?.toISOString().split('T')[0] || '';
    const employeeId = this.employeeControl.value ? this.employeeControl.value : undefined;

    this.attendanceService.exportAttendanceReport(startDate, endDate, format, employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `attendance-report-${startDate}-to-${endDate}.${format}`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.showSuccess(`Report exported as ${format.toUpperCase()}`);
        },
        error: (error) => {
          console.error('Export error:', error);
          this.showError('Failed to export report');
        }
      });
  }

  // -----------------------------
  // Utility
  // -----------------------------
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
