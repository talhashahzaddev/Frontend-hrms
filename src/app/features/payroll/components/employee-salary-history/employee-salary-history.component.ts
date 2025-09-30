import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PayrollService } from '../../services/payroll.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PayrollEntry, PayrollPeriod } from '../../../../core/models/payroll.models';
import { User } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-employee-salary-history',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    RouterModule,
    MatListModule,
    MatExpansionModule
  ],
  templateUrl: './employee-salary-history.component.html',
  styleUrls: ['./employee-salary-history.component.scss']
})
export class EmployeeSalaryHistoryComponent implements OnInit, OnDestroy {
  salaryHistory: PayrollEntry[] = [];
  availablePeriods: PayrollPeriod[] = [];
  currentUser: User | null = null;
  
  // Summary statistics
  currentSalary = 0;
  averageSalary = 0;
  totalEarnings = 0;
  payslipCount = 0;
  currentPeriod = 'Current Period';
  currentYear = new Date().getFullYear();
  
  // UI state
  loading = false;
  pageIndex = 1;
  pageSize = 10;
  totalRecords = 0;
  
  // Filter form
  filterForm: FormGroup;
  
  private destroy$ = new Subject<void>();

  constructor(
    private payrollService: PayrollService,
    private authService: AuthService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      periodId: [''],
      startDate: [null],
      endDate: [null],
      search: ['']
    });
  }

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
    });
    this.loadAvailablePeriods();
    this.loadSalaryHistory();
    this.setupFilterListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Helper method to check if object has keys
  hasKeys(obj: any): boolean {
    return obj && Object.keys(obj).length > 0;
  }

  private setupFilterListeners(): void {
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });
  }

  loadSalaryHistory(): void {
    if (!this.currentUser) {
      this.showError('User not found. Please login again.');
      return;
    }

    this.loading = true;
    
    const { periodId, startDate, endDate, search } = this.filterForm.value;
    
    this.payrollService.getPayrollEntriesByEmployee(
      this.currentUser.userId,
      this.pageIndex,
      this.pageSize
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: any) => {
        this.salaryHistory = response.data;
        this.totalRecords = response.totalRecords;
        this.calculateSummaryStatistics();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading salary history:', error);
        this.showError('Failed to load salary history. Please try again.');
        this.loading = false;
      }
    });
  }

  private loadAvailablePeriods(): void {
    this.payrollService.getPayrollPeriods()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.availablePeriods = response.data;
        },
        error: (error: any) => {
          console.error('Error loading payroll periods:', error);
        }
      });
  }

  private calculateSummaryStatistics(): void {
    if (this.salaryHistory.length === 0) {
      this.resetStatistics();
      return;
    }

    // Current salary (latest entry)
    const latestEntry = this.salaryHistory[0];
    this.currentSalary = latestEntry.netSalary;
    this.currentPeriod = 'Current Period'; // Using a default since payrollPeriodName doesn't exist

    // Average salary
    const totalSalary = this.salaryHistory.reduce((sum, entry) => sum + entry.netSalary, 0);
    this.averageSalary = totalSalary / this.salaryHistory.length;

    // Total earnings (YTD)
    const currentYear = new Date().getFullYear();
    const yearToDateEntries = this.salaryHistory.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      return entryDate.getFullYear() === currentYear;
    });
    
    this.totalEarnings = yearToDateEntries.reduce((sum, entry) => sum + entry.netSalary, 0);

    // Payslip count - using status as a proxy since hasPayslip doesn't exist
    this.payslipCount = this.salaryHistory.filter(entry => entry.status === 'paid').length;
  }

  private resetStatistics(): void {
    this.currentSalary = 0;
    this.averageSalary = 0;
    this.totalEarnings = 0;
    this.payslipCount = 0;
    this.currentPeriod = 'No Data';
  }

  applyFilters(): void {
    this.pageIndex = 1;
    this.loadSalaryHistory();
  }

  clearFilters(): void {
    this.filterForm.reset({
      periodId: '',
      startDate: null,
      endDate: null,
      search: ''
    });
  }

  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadSalaryHistory();
  }

  viewPayslip(entryId: string): void {
    // For now, we'll use the downloadPayslip method since viewPayslip doesn't exist
    this.downloadPayslip(entryId);
  }

  downloadPayslip(entryId: string): void {
    this.payrollService.downloadPayslip(entryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const entry = this.salaryHistory.find(e => e.entryId === entryId);
          const fileName = `payslip_${entry?.employeeName.replace(/\s+/g, '_')}_${entry?.createdAt.split('T')[0]}.pdf`;
          this.downloadFile(blob, fileName);
        },
        error: (error: any) => {
          console.error('Error downloading payslip:', error);
          this.showError('Failed to download payslip. Please try again.');
        }
      });
  }

  private downloadFile(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  exportToExcel(): void {
    // TODO: Implement Excel export functionality
    this.showInfo('Excel export feature coming soon!');
  }

  refreshData(): void {
    this.loadSalaryHistory();
    this.loadAvailablePeriods();
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'primary';
      case 'pending':
      case 'approved':
        return 'accent';
      case 'rejected':
      case 'cancelled':
        return 'warn';
      default:
        return '';
    }
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });
  }
}