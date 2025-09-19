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
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil, combineLatest } from 'rxjs';

import { AttendanceService } from '../../services/attendance.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { 
  AttendanceReport
} from '../../../../core/models/attendance.models';
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
    MatTooltipModule
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
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    combineLatest([
      this.employeeService.getDepartments(),
      this.employeeService.getManagers() // Get all employees through managers endpoint for now
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ([departments, employees]) => {
        this.departments = departments;
        this.employees = employees;
      },
      error: (error) => {
        console.error('Error loading initial data:', error);
      }
    });
  }

  generateReport(): void {
    this.isLoading = true;
    
    const startDate = this.startDateControl.value?.toISOString().split('T')[0] || '';
    const endDate = this.endDateControl.value?.toISOString().split('T')[0] || '';
    const employeeId = this.employeeControl.value || undefined;
    const departmentId = this.departmentControl.value || undefined;

    this.attendanceService.getAttendanceReport(startDate, endDate, employeeId, departmentId)
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

  exportToCSV(): void {
    this.exportReport('csv');
  }

  exportToExcel(): void {
    this.exportReport('xlsx');
  }

  private exportReport(format: 'csv' | 'xlsx'): void {
    const startDate = this.startDateControl.value?.toISOString().split('T')[0] || '';
    const endDate = this.endDateControl.value?.toISOString().split('T')[0] || '';
    const employeeId = this.employeeControl.value || undefined;

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