import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PayrollService } from '../../services/payroll.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { PayrollPeriod, PayrollEntry, PayrollStatus, PayrollEntryStatus } from '../../../../core/models/payroll.models';
import { User } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-superadmin-payroll-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTabsModule,
    MatExpansionModule,
    MatMenuModule,
    MatToolbarModule,
    MatGridListModule,
    MatListModule,
    MatBadgeModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './superadmin-payroll-dashboard.component.html',
  styleUrls: ['./superadmin-payroll-dashboard.component.scss']
})
export class SuperadminPayrollDashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  
  // Dashboard data
  payrollPeriods: PayrollPeriod[] = [];
  recentEntries: PayrollEntry[] = [];
  payrollStatistics: any = null;
  departmentBreakdown: any[] = [];
  
  // UI state
  loading = false;
  selectedPeriodId: string | null = null;
  activeTab = 'overview';
  
  // Filter form
  filterForm: FormGroup;
  
  // Summary cards
  totalEmployees = 0;
  totalPayrollAmount = 0;
  pendingApprovals = 0;
  completedPayrolls = 0;
  
  // Currency
  organizationCurrency: string = 'USD';
  
  // Charts data
  payrollTrendData: any[] = [];
  departmentChartData: any[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private payrollService: PayrollService,
    private authService: AuthService,
    private settingsService: SettingsService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      periodId: [''],
      departmentId: [''],
      status: [''],
      dateRange: [null]
    });
  }

  ngOnInit(): void {
    this.loadOrganizationCurrency();
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.loadDashboardData();
        this.setupFilterListeners();
      },
      error: (error) => {
        console.error('Error loading current user:', error);
        this.showNotification('Failed to load user information.', 'error');
      }
    });
  }

  private loadOrganizationCurrency(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (currency) => {
          this.organizationCurrency = currency;
        },
        error: (error) => {
          console.error('Error loading organization currency:', error);
          this.organizationCurrency = 'USD';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilterListeners(): void {
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });
  }

  loadDashboardData(): void {
    this.loading = true;
    
    // Load all dashboard data in parallel
    this.payrollService.getPayrollStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (statistics) => {
          this.payrollStatistics = statistics;
          this.updateSummaryCards(statistics);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading payroll statistics:', error);
          this.showNotification('Failed to load payroll statistics.', 'error');
          this.loading = false;
        }
      });

    // Load recent payroll periods
    this.loadPayrollPeriods();
    
    // Load recent entries
    this.loadRecentEntries();
    
    // Load department breakdown
    this.loadDepartmentBreakdown();
  }

  private loadPayrollPeriods(): void {
    this.payrollService.getPayrollPeriods(1, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.payrollPeriods = response.data.data || [];
          }
        },
        error: (error) => {
          console.error('Error loading payroll periods:', error);
          this.showNotification('Failed to load payroll periods.', 'error');
        }
      });
  }

  private loadRecentEntries(): void {
    if (!this.currentUser) return;

    const filter = {
      status: PayrollEntryStatus.DRAFT
    };

    this.payrollService.getPayrollEntries(filter, 1, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.recentEntries = response.data.data;
          }
        },
        error: (error) => {
          console.error('Error loading recent entries:', error);
          this.showNotification('Failed to load recent entries.', 'error');
        }
      });
  }

  private loadDepartmentBreakdown(): void {
    this.payrollService.getDepartmentPayrollBreakdown()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.departmentBreakdown = response.data;
            this.prepareChartData();
          }
        },
        error: (error) => {
          console.error('Error loading department breakdown:', error);
          this.showNotification('Failed to load payroll statistics.', 'error');
        }
      });
  }

  private updateSummaryCards(statistics: any): void {
    this.totalEmployees = statistics.totalEmployees;
    this.totalPayrollAmount = statistics.totalPayrollAmount;
    this.pendingApprovals = statistics.pendingApprovals;
    this.completedPayrolls = statistics.completedPayrolls;
  }

  private prepareChartData(): void {
    // Prepare payroll trend data
    this.payrollTrendData = this.departmentBreakdown.map(dept => ({
      name: dept.departmentName,
      value: dept.totalAmount
    }));

    // Prepare department chart data
    this.departmentChartData = this.departmentBreakdown.map(dept => ({
      name: dept.departmentName,
      value: dept.employeeCount,
      amount: dept.totalAmount
    }));
  }

  applyFilters(): void {
    const { periodId, departmentId, status } = this.filterForm.value;
    
    // Reload data based on filters
    this.loadDashboardData();
  }

  clearFilters(): void {
    this.filterForm.reset({
      periodId: '',
      departmentId: '',
      status: '',
      dateRange: null
    });
  }

  createPayrollPeriod(): void {
    this.router.navigate(['/payroll/periods/create']);
  }

  processPayroll(periodId: string): void {
    this.router.navigate(['/payroll/process', periodId]);
  }

  viewPeriodDetails(periodId: string) {
    // Navigate to period details page
    console.log('View period details:', periodId);
  }

  approveEntry(entryId: string): void {
    this.loading = true;
    this.payrollService.approvePayrollEntry(entryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showNotification('Payroll entry approved successfully.', 'success');
          this.loadRecentEntries();
          this.loadDashboardData();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error approving entry:', error);
          this.showNotification('Failed to approve payroll entry.', 'error');
          this.loading = false;
        }
      });
  }

  rejectEntry(entryId: string): void {
    this.loading = true;
    this.payrollService.rejectPayrollEntry(entryId, 'Rejected by SuperAdmin')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showNotification('Payroll entry rejected successfully.', 'success');
          this.loadRecentEntries();
          this.loadDashboardData();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error rejecting entry:', error);
          this.showNotification('Failed to reject payroll entry.', 'error');
          this.loading = false;
        }
      });
  }

  generateReport(): void {
    this.router.navigate(['/payroll/reports']);
  }

  exportData() {
    this.loading = true;
    this.payrollService.exportPayrollReport(undefined, 'excel').subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll_data_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showNotification('Payroll data exported successfully', 'success');
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error exporting payroll data:', error);
        this.showNotification('Failed to export payroll data', 'error');
        this.loading = false;
      }
    });
  }

  viewEntryDetails(entryId: string): void {
    // Implementation for viewing entry details
    console.log('View entry details:', entryId);
  }

  refreshData(): void {
    this.loadDashboardData();
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

  getStatusColor(status: string): string {
    switch (status) {
      case 'Pending':
        return 'accent';
      case 'Approved':
      case 'Paid':
        return 'primary';
      case 'Rejected':
        return 'warn';
      case 'Open':
        return 'accent';
      default:
        return 'primary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Pending':
        return 'schedule';
      case 'Approved':
        return 'check_circle';
      case 'Paid':
        return 'payment';
      case 'Rejected':
        return 'cancel';
      case 'Open':
        return 'lock_open';
      default:
        return 'help';
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info') {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [`snackbar-${type}`]
    });
  }
}