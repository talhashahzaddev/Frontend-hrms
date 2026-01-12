import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { NgChartsModule } from 'ng2-charts';
import { Subject, takeUntil } from 'rxjs';
import { ChartConfiguration, ChartType } from 'chart.js';

import { PayrollService } from '../../services/payroll.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { 
  PayrollPeriod,
  PayrollReportFilter
} from '../../../../core/models/payroll.models';
import { Department } from '../../../../core/models/employee.models';

@Component({
  selector: 'app-payroll-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
    NgChartsModule
  ],
  templateUrl: './payroll-reports.component.html',
  styleUrls: ['./payroll-reports.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayrollReportsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  // Forms
  filterForm: FormGroup;
  
  // Tab control
  selectedTabIndex = 0;

  // Data
  availablePeriods: PayrollPeriod[] = [];
  departments: Department[] = [];
  reportData: any = null;
  statisticsData: any = null;
  departmentData: any[] = [];
  detailedData: any[] = [];
  filteredDetailedData: any[] = [];
  searchTerm = '';
  groupedEntries: Map<string, any[]> = new Map();
  periodGroups: Array<{ periodId: string; periodName: string; dateRange: string; entries: any[] }> = [];
  expandedPeriods = new Set<string>();

  // UI state
  isLoading = false;
  hasActiveFiltersFlag = false;
  
  // Currency
  organizationCurrency: string = 'USD';
  currencySymbol: string = '$';

  // Table columns
  departmentColumns = ['department', 'employees', 'totalAmount', 'averageAmount', 'percentage'];
  detailedColumns = ['employee', 'basicSalary', 'allowances', 'deductions', 'grossSalary', 'netSalary'];
  trendsColumns = ['month', 'amount', 'employeeCount'];

  // Chart configurations
  pieChartType: ChartType = 'pie';
  pieChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4']
    }]
  };
  pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  lineChartType: ChartType = 'line';
  lineChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [{
      label: 'Total Payroll',
      data: [],
      borderColor: '#1976d2',
      backgroundColor: 'rgba(25, 118, 210, 0.1)',
      tension: 0.4
    }]
  };
  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            const symbol = this.currencySymbol || '$';
            return symbol + value.toLocaleString();
          }
        }
      }
    } as any
  };

  barChartType: ChartType = 'bar';
  barChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [{
      label: 'Employees',
      data: [],
      backgroundColor: '#1976d2'
    }]
  };
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private employeeService: EmployeeService,
    private notificationService: NotificationService,
    private settingsService: SettingsService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.filterForm = this.fb.group({
      payrollPeriodId: [''],
      startDate: [''],
      endDate: [''],
      department: ['']
    });
  }

  ngOnInit(): void {
    this.loadOrganizationCurrency();
    this.loadDepartments();
    
    // Check for query parameters first
    const params = this.route.snapshot.queryParams;
    const periodId = params['periodId'];
    const tab = params['tab'];
    
    if (tab === 'detailed') {
      this.selectedTabIndex = 1; // Switch to Detailed Report tab
    }
    
    // Load available periods first, then handle query params
    this.loadAvailablePeriods(() => {
      if (periodId) {
        // Set the period filter
        this.filterForm.patchValue({ payrollPeriodId: periodId }, { emitEvent: false });
        // Apply filters and then expand the period
        this.applyFiltersWithPeriodExpansion(periodId);
      } else {
        this.generateDefaultReport();
      }
    });
    
    // Subscribe to form value changes to update hasActiveFiltersFlag
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateActiveFiltersFlag();
      });
    
    // Initial check
    this.updateActiveFiltersFlag();
  }

  private loadOrganizationCurrency(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (currency) => {
          this.organizationCurrency = currency;
          this.currencySymbol = this.settingsService.getCurrencySymbol(currency);
          this.updateChartCurrency();
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading organization currency:', error);
          this.organizationCurrency = 'USD';
          this.currencySymbol = '$';
        }
      });
  }

  private updateChartCurrency(): void {
    // Update chart options with currency symbol
    if (this.lineChartOptions?.scales?.['y']?.ticks) {
      this.lineChartOptions.scales['y'].ticks.callback = (value: any) => {
        return this.currencySymbol + value.toLocaleString();
      };
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAvailablePeriods(callback?: () => void): void {
    this.payrollService.getPayrollPeriods()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.availablePeriods = response.data.data || [];
            this.cdr.markForCheck();
            if (callback) {
              callback();
            }
          }
        },
        error: (error) => {
          console.error('Error loading periods:', error);
          const errorMessage =
            error?.error?.message ||
            error?.message ||
            'Failed to load payroll periods';
          this.notificationService.showError(errorMessage);
          if (callback) {
            callback();
          }
        }
      });
  }

  private loadDepartments(): void {
    this.employeeService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (departments) => {
          this.departments = departments;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading departments:', error);
          const errorMessage =
            error?.error?.message ||
            error?.message ||
            'Failed to load departments';
          this.notificationService.showError(errorMessage);
        }
      });
  }

  private generateDefaultReport(): void {
    // Load real data from backend
    this.loadReportData();
    this.loadStatisticsData();
    this.loadDepartmentBreakdown();
  }

  applyFilters(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    const filter: PayrollReportFilter = {
      payrollPeriodId: this.filterForm.get('payrollPeriodId')?.value || undefined,
      startDate: this.filterForm.get('startDate')?.value || undefined,
      endDate: this.filterForm.get('endDate')?.value || undefined,
      department: this.filterForm.get('department')?.value || undefined
    };

    // Load all report data with filters
    this.loadReportData(filter);
    this.loadStatisticsData(filter);
    this.loadDepartmentBreakdown(filter);
  }

  private applyFiltersWithPeriodExpansion(periodId: string): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    const filter: PayrollReportFilter = {
      payrollPeriodId: periodId,
      startDate: undefined,
      endDate: undefined,
      department: undefined
    };

    // Load all report data with filters
    this.loadReportData(filter, periodId);
    this.loadStatisticsData(filter);
    this.loadDepartmentBreakdown(filter);
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.generateDefaultReport();
  }

  private updateActiveFiltersFlag(): void {
    const formValue = this.filterForm.value;
    this.hasActiveFiltersFlag = !!(
      formValue.payrollPeriodId ||
      formValue.startDate ||
      formValue.endDate ||
      formValue.department
    );
    this.cdr.markForCheck();
  }

  hasActiveFilters(): boolean {
    return this.hasActiveFiltersFlag;
  }

  exportReport(format: 'excel' | 'pdf'): void {
    const filter: PayrollReportFilter = {
      payrollPeriodId: this.filterForm.get('payrollPeriodId')?.value || undefined,
      startDate: this.filterForm.get('startDate')?.value || undefined,
      endDate: this.filterForm.get('endDate')?.value || undefined,
      department: this.filterForm.get('department')?.value || undefined
    };

    this.payrollService.exportPayrollReport(filter, format)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `payroll-report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.notificationService.showSuccess(`Report exported as ${format.toUpperCase()}`);
        },
        error: (error) => {
          console.error('Export error:', error);
          const errorMessage =
            error?.error?.message ||
            error?.message ||
            'Failed to export report';
          this.notificationService.showError(errorMessage);
        }
      });
  }

  filterDetailedData(): void {
    if (!this.searchTerm) {
      this.filteredDetailedData = [...this.detailedData];
    } else {
      this.filteredDetailedData = this.detailedData.filter(entry =>
        entry.employeeName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        entry.employeeCode.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    this.groupEntriesByPeriod();
    this.cdr.markForCheck();
  }

  // Group entries by period
  private groupEntriesByPeriod(): void {
    this.groupedEntries.clear();
    this.periodGroups = [];

    // Filter entries based on search term
    const entriesToGroup = this.searchTerm 
      ? this.filteredDetailedData 
      : this.detailedData;

    // Group entries by periodId
    entriesToGroup.forEach(entry => {
      const periodId = entry.periodId || entry.payrollPeriodId || 'unknown';
      if (!this.groupedEntries.has(periodId)) {
        this.groupedEntries.set(periodId, []);
      }
      this.groupedEntries.get(periodId)!.push(entry);
    });

    // Create period groups with metadata
    this.groupedEntries.forEach((entries, periodId) => {
      const period = this.availablePeriods.find(p => p.periodId === periodId);
      const periodName = period ? period.periodName : 'Unknown Period';
      const dateRange = period 
        ? `${this.formatDate(period.startDate)} - ${this.formatDate(period.endDate)}`
        : '';
      
      this.periodGroups.push({
        periodId,
        periodName,
        dateRange,
        entries: entries.sort((a, b) => a.employeeName?.localeCompare(b.employeeName) || 0)
      });
    });

    // Sort periods by date (most recent first)
    this.periodGroups.sort((a, b) => {
      const periodA = this.availablePeriods.find(p => p.periodId === a.periodId);
      const periodB = this.availablePeriods.find(p => p.periodId === b.periodId);
      if (!periodA || !periodB) return 0;
      return new Date(periodB.endDate).getTime() - new Date(periodA.endDate).getTime();
    });
  }

  togglePeriod(periodId: string): void {
    if (this.expandedPeriods.has(periodId)) {
      this.expandedPeriods.delete(periodId);
    } else {
      this.expandedPeriods.add(periodId);
    }
    this.cdr.markForCheck();
  }

  isPeriodExpanded(periodId: string): boolean {
    return this.expandedPeriods.has(periodId);
  }

  getPeriodEntriesCount(periodId: string): number {
    return this.groupedEntries.get(periodId)?.length || 0;
  }

  formatDate(dateString: string | Date): string {
    if (!dateString) return '';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getPeriodTotalGross(periodId: string): number {
    const entries = this.groupedEntries.get(periodId) || [];
    return entries.reduce((sum, entry) => sum + (entry.grossSalary || 0), 0);
  }

  getPeriodTotalNet(periodId: string): number {
    const entries = this.groupedEntries.get(periodId) || [];
    return entries.reduce((sum, entry) => sum + (entry.netSalary || 0), 0);
  }

  getTotalAllowances(entry: any): number {
    return Object.values(entry.allowances || {}).reduce((sum: number, value: any) => sum + (value || 0), 0) + 
           (entry.overtimeAmount || 0) + (entry.bonusAmount || 0);
  }

  getTotalDeductions(entry: any): number {
    return Object.values(entry.deductions || {}).reduce((sum: number, value: any) => sum + (value || 0), 0) + 
           (entry.taxAmount || 0) + (entry.otherDeductions || 0);
  }

  private loadReportData(filter?: PayrollReportFilter, periodIdToExpand?: string): void {
    this.payrollService.generatePayrollReport(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.reportData = response.data.summary;
            this.departmentData = response.data.departmentBreakdown || [];
            this.detailedData = response.data.entries || [];
            this.filteredDetailedData = [...this.detailedData];
            this.groupEntriesByPeriod();
            
            // Expand the period if specified
            if (periodIdToExpand) {
              this.expandedPeriods.add(periodIdToExpand);
            }
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading report data:', error);
          this.isLoading = false;
          const errorMessage =
            error?.error?.message ||
            error?.message ||
            'Failed to load report data';
          this.notificationService.showError(errorMessage);
          this.cdr.markForCheck();
        }
      });
  }

  private loadStatisticsData(filter?: PayrollReportFilter): void {
    this.payrollService.getPayrollStatistics(
      filter?.startDate, 
      filter?.endDate,
      filter?.payrollPeriodId,
      filter?.department
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.statisticsData = response.data;
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading statistics:', error);
          const errorMessage =
            error?.error?.message ||
            error?.message ||
            'Failed to load statistics';
          this.notificationService.showError(errorMessage);
        }
      });
  }

  private loadDepartmentBreakdown(filter?: PayrollReportFilter): void {
    this.payrollService.getDepartmentPayrollBreakdown(filter?.payrollPeriodId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Response.data is now a list of department breakdowns
            this.departmentData = response.data;
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading department breakdown:', error);
          const errorMessage =
            error?.error?.message ||
            error?.message ||
            'Failed to load department breakdown';
          this.notificationService.showError(errorMessage);
        }
      });
  }

  private generateMockReportData(): void {
    // Mock summary data
    this.reportData = {
      totalEmployees: 150,
      totalGross: 1250000,
      totalDeductions: 187500,
      totalNet: 1062500
    };

    // Mock department data
    this.departmentData = [
      { departmentName: 'Engineering', employeeCount: 60, totalAmount: 600000, averageAmount: 10000, percentage: 48.0 },
      { departmentName: 'Sales', employeeCount: 30, totalAmount: 300000, averageAmount: 10000, percentage: 24.0 },
      { departmentName: 'Marketing', employeeCount: 25, totalAmount: 200000, averageAmount: 8000, percentage: 16.0 },
      { departmentName: 'HR', employeeCount: 20, totalAmount: 100000, averageAmount: 5000, percentage: 8.0 },
      { departmentName: 'Finance', employeeCount: 15, totalAmount: 50000, averageAmount: 3333, percentage: 4.0 }
    ];

    // Mock detailed data
    this.detailedData = [
      {
        employeeName: 'John Doe',
        employeeCode: 'EMP001',
        department: 'Engineering',
        basicSalary: 8000,
        allowances: { transport: 500, meal: 300 },
        deductions: { tax: 1200, insurance: 200 },
        overtimeAmount: 500,
        bonusAmount: 200,
        grossSalary: 9500,
        taxAmount: 1200,
        otherDeductions: 200,
        netSalary: 8100
      },
      {
        employeeName: 'Jane Smith',
        employeeCode: 'EMP002',
        department: 'Sales',
        basicSalary: 7000,
        allowances: { transport: 500, commission: 1000 },
        deductions: { tax: 1050, insurance: 200 },
        overtimeAmount: 300,
        bonusAmount: 500,
        grossSalary: 9300,
        taxAmount: 1050,
        otherDeductions: 200,
        netSalary: 8050
      }
      // Add more mock entries as needed
    ];

    this.filteredDetailedData = [...this.detailedData];
    this.updateCharts();
  }

  private updateCharts(): void {
    // Update pie chart (department distribution)
    this.pieChartData = {
      labels: this.departmentData.map(d => d.departmentName),
      datasets: [{
        data: this.departmentData.map(d => d.totalAmount),
        backgroundColor: ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4']
      }]
    };

    // Update line chart (monthly trends - mock data)
    this.lineChartData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Total Payroll',
        data: [1100000, 1150000, 1200000, 1180000, 1220000, 1250000],
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        tension: 0.4
      }]
    };

    // Update bar chart (salary distribution)
    const symbol = this.currencySymbol;
    const salaryRanges = [`< ${symbol}5K`, `${symbol}5K-${symbol}8K`, `${symbol}8K-${symbol}12K`, `${symbol}12K-${symbol}15K`, `> ${symbol}15K`];
    const distribution = [10, 45, 60, 25, 10];
    
    this.barChartData = {
      labels: salaryRanges,
      datasets: [{
        label: 'Employees',
        data: distribution,
        backgroundColor: '#1976d2'
      }]
    };

    this.cdr.markForCheck();
  }
}
