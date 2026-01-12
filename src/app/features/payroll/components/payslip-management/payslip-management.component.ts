import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { SelectionModel } from '@angular/cdk/collections';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';

import { PayrollService } from '../../services/payroll.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { PayslipPreviewDialogComponent } from './payslip-preview-dialog.component';
import { 
  PayrollPeriod,
  PayrollEntry,
  PayrollFilter
} from '../../../../core/models/payroll.models';
import { Department } from '../../../../core/models/employee.models';
import { PagedResult } from '../../../../core/models/common.models';

@Component({
  selector: 'app-payslip-management',
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
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatCheckboxModule,
    MatDialogModule,
    MatExpansionModule
  ],
  template: `
    <div class="payslip-management-container">
      
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">
          <mat-icon>receipt</mat-icon>
          Payslip Management
        </h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="generatePayslips()" 
                  [disabled]="!selection.hasValue()">
            <mat-icon>add</mat-icon>
            Generate Payslips ({{ selection.selected.length }})
          </button>
          <button mat-stroked-button (click)="emailPayslips()" 
                  [disabled]="!selection.hasValue()">
            <mat-icon>email</mat-icon>
            Email Payslips
          </button>
        </div>
      </div>

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <form [formGroup]="filterForm" class="filters-form">
            <mat-form-field appearance="outline">
              <mat-label>Payroll Period</mat-label>
              <mat-select formControlName="payrollPeriodId">
                <mat-option value="">All Periods</mat-option>
                <mat-option *ngFor="let period of availablePeriods" [value]="period.periodId">
                  {{ period.periodName }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Search Employee</mat-label>
              <input matInput formControlName="search" placeholder="Search by name or code...">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select formControlName="status">
                <mat-option value="">All Statuses</mat-option>
                <mat-option value="approved">Approved</mat-option>
                <mat-option value="paid">Paid</mat-option>
                <mat-option value="generated">Generated</mat-option>
                <mat-option value="emailed">Emailed</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Department</mat-label>
              <mat-select formControlName="department">
                <mat-option value="">All Departments</mat-option>
                <mat-option *ngFor="let department of departments" [value]="department.departmentName">
                  {{ department.departmentName }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <div class="filter-actions">
              <button mat-raised-button color="primary" (click)="applyFilters()">
                <mat-icon>filter_list</mat-icon>
                Apply
              </button>
              <button mat-stroked-button (click)="clearFilters()" [disabled]="!hasFiltersApplied()">
                <mat-icon>clear</mat-icon>
                Clear
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <mat-card class="summary-card">
          <mat-card-content>
            <div class="stat-item">
              <mat-icon>receipt_long</mat-icon>
              <div class="stat-details">
                <div class="stat-value">{{ totalPayslips }}</div>
                <div class="stat-label">Total Payslips</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="summary-card">
          <mat-card-content>
            <div class="stat-item">
              <mat-icon>check_circle</mat-icon>
              <div class="stat-details">
                <div class="stat-value">{{ generatedPayslips }}</div>
                <div class="stat-label">Generated</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="summary-card">
          <mat-card-content>
            <div class="stat-item">
              <mat-icon>email</mat-icon>
              <div class="stat-details">
                <div class="stat-value">{{ emailedPayslips }}</div>
                <div class="stat-label">Emailed</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="summary-card">
          <mat-card-content>
            <div class="stat-item">
              <mat-icon>download</mat-icon>
              <div class="stat-details">
                <div class="stat-value">{{ downloadedPayslips }}</div>
                <div class="stat-label">Downloaded</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Payslips Table - Grouped by Period -->
      <mat-card class="table-card">
        <mat-card-content>
          <div class="table-container">
            <!-- Period Groups -->
            <div class="period-groups" *ngIf="periodGroups.length > 0">
              <div *ngFor="let group of periodGroups" class="period-group">
                <!-- Period Header - Expandable -->
                <div class="period-header" (click)="togglePeriod(group.periodId)">
                  <div class="period-header-content">
                    <mat-icon class="expand-icon" [class.expanded]="isPeriodExpanded(group.periodId)">
                      {{ isPeriodExpanded(group.periodId) ? 'expand_more' : 'chevron_right' }}
                    </mat-icon>
                    <div class="period-info-main">
                      <h3 class="period-name">{{ group.periodName }}</h3>
                      <span class="period-date">{{ group.dateRange }}</span>
                    </div>
                    <div class="period-stats">
                      <span class="stat-item">
                        <mat-icon>people</mat-icon>
                        {{ getPeriodEntriesCount(group.periodId) }} employees
                      </span>
                      <span class="stat-item">
                        <!-- <mat-icon>attach_money</mat-icon> -->
                        Gross: {{ getPeriodTotalGross(group.periodId) | currency:(organizationCurrency || 'USD') }}
                      </span>
                      <span class="stat-item net-stat">
                        Net: {{ getPeriodTotalNet(group.periodId) | currency:(organizationCurrency || 'USD') }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Period Entries Table - Collapsible -->
                <div class="period-entries" *ngIf="isPeriodExpanded(group.periodId)">
                  <mat-table [dataSource]="group.entries" class="payslips-table">
                    
                    <!-- Selection Column -->
                    <ng-container matColumnDef="select">
                      <mat-header-cell *matHeaderCellDef>
                        <mat-checkbox (change)="$event ? masterTogglePeriod(group.periodId) : null"
                                      [checked]="isPeriodAllSelected(group.periodId)"
                                      [indeterminate]="isPeriodIndeterminate(group.periodId)">
                        </mat-checkbox>
                      </mat-header-cell>
                      <mat-cell *matCellDef="let entry">
                        <mat-checkbox (click)="$event.stopPropagation()"
                                      (change)="$event ? selection.toggle(entry) : null"
                                      [checked]="selection.isSelected(entry)"
                                      [disabled]="entry.status === 'draft'">
                        </mat-checkbox>
                      </mat-cell>
                    </ng-container>

                    <!-- Employee Column -->
                    <ng-container matColumnDef="employee">
                      <mat-header-cell *matHeaderCellDef>Employee</mat-header-cell>
                      <mat-cell *matCellDef="let entry">
                        <div class="employee-info">
                          <strong>{{ entry.employeeName }}</strong>
                          <small>{{ entry.employeeCode }} • {{ entry.department }}</small>
                        </div>
                      </mat-cell>
                    </ng-container>

                    <!-- Salary Details Column -->
                    <ng-container matColumnDef="salaryDetails">
                      <mat-header-cell *matHeaderCellDef>Salary Details</mat-header-cell>
                      <mat-cell *matCellDef="let entry">
                        <div class="salary-details">
                          <div class="salary-item">
                            <span class="label">Gross:</span>
                            <span class="value">{{ entry.grossSalary | currency:getCurrencyCode(entry) }}</span>
                          </div>
                          <div class="salary-item">
                            <span class="label">Net:</span>
                            <span class="value net-amount">{{ entry.netSalary | currency:getCurrencyCode(entry) }}</span>
                          </div>
                        </div>
                      </mat-cell>
                    </ng-container>

                    <!-- Payslip Status Column -->
                    <ng-container matColumnDef="payslipStatus">
                      <mat-header-cell *matHeaderCellDef>Payslip Status</mat-header-cell>
                      <mat-cell *matCellDef="let entry">
                        <div class="payslip-status">
                          <mat-chip [color]="getPayslipStatusColor(entry)">
                            {{ getPayslipStatus(entry) | titlecase }}
                          </mat-chip>
                          <small *ngIf="entry.paidAt">
                            Paid: {{ entry.paidAt | date:'mediumDate' }}
                          </small>
                        </div>
                      </mat-cell>
                    </ng-container>

                    <!-- Actions Column -->
                    <ng-container matColumnDef="actions">
                      <mat-header-cell *matHeaderCellDef>Actions</mat-header-cell>
                      <mat-cell *matCellDef="let entry">
                        <button mat-icon-button (click)="$event.stopPropagation()" [matMenuTriggerFor]="payslipMenu">
                          <mat-icon>more_vert</mat-icon>
                        </button>
                        <mat-menu #payslipMenu="matMenu">
                          <button mat-menu-item (click)="previewPayslip(entry)">
                            <mat-icon>visibility</mat-icon>
                            Preview Payslip
                          </button>
                          <button mat-menu-item (click)="downloadPayslip(entry)" 
                                  [disabled]="entry.status === 'draft'">
                            <mat-icon>download</mat-icon>
                            Download PDF
                          </button>
                          <button mat-menu-item (click)="emailSinglePayslip(entry)" 
                                  [disabled]="entry.status === 'draft' || entry.status === 'calculated'">
                            <mat-icon>email</mat-icon>
                            Email Payslip
                          </button>
                          <button mat-menu-item (click)="regeneratePayslip(entry)" 
                                  [disabled]="entry.status === 'draft'">
                            <mat-icon>refresh</mat-icon>
                            Regenerate
                          </button>
                        </mat-menu>
                      </mat-cell>
                    </ng-container>

                    <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
                    <mat-row *matRowDef="let row; columns: displayedColumns;" 
                             (click)="previewPayslip(row)" 
                             class="clickable-row"></mat-row>
                  </mat-table>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div *ngIf="periodGroups.length === 0 && !isLoading" class="empty-state">
              <mat-icon>receipt_long</mat-icon>
              <h3>No Payslips Found</h3>
              <p>No payslips match your current filters.</p>
            </div>

            <!-- Pagination -->
            <mat-paginator 
              *ngIf="totalCount > 0"
              [length]="totalCount"
              [pageSize]="pageSize"
              [pageSizeOptions]="[10, 25, 50, 100]"
              [pageIndex]="currentPage - 1"
              (page)="onPageChange($event)"
              showFirstLastButtons>
            </mat-paginator>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Bulk Actions Panel -->
      <div class="bulk-actions-panel" *ngIf="selection.hasValue()">
        <div class="panel-content">
          <div class="selection-info">
            <mat-icon>info</mat-icon>
            <span>{{ selection.selected.length }} payslip(s) selected</span>
          </div>
          <div class="bulk-actions">
            <button mat-raised-button color="primary" (click)="generatePayslips()">
              <mat-icon>add</mat-icon>
              Generate Selected
            </button>
            <button mat-stroked-button (click)="emailPayslips()">
              <mat-icon>email</mat-icon>
              Email Selected
            </button>
            <button mat-stroked-button (click)="downloadSelected()">
              <mat-icon>download</mat-icon>
              Download All
            </button>
            <button mat-icon-button (click)="clearSelection()" matTooltip="Clear selection">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="60"></mat-spinner>
        <p>Loading payslips...</p>
      </div>

    </div>
  `,
  styleUrls: ['./payslip-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayslipManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  // Data properties
  payrollEntries: PayrollEntry[] = [];
  groupedEntries: Map<string, PayrollEntry[]> = new Map();
  periodGroups: Array<{ periodId: string; periodName: string; dateRange: string; entries: PayrollEntry[] }> = [];
  availablePeriods: PayrollPeriod[] = [];
  departments: Department[] = [];
  totalCount = 0;
  currentPage = 1;
  pageSize = 25;
  selection = new SelectionModel<PayrollEntry>(true, []);
  expandedPeriods = new Set<string>();

  // Summary stats
  totalPayslips = 0;
  generatedPayslips = 0;
  emailedPayslips = 0;
  downloadedPayslips = 0;

  // UI state
  isLoading = false;
  filterForm: FormGroup;
  
  // Currency
  organizationCurrency: string = 'USD';

  // Table configuration
  displayedColumns: string[] = ['select', 'employee', 'salaryDetails', 'payslipStatus', 'actions'];

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private employeeService: EmployeeService,
    private notificationService: NotificationService,
    private settingsService: SettingsService,
    private dialog: MatDialog
  ) {
    this.filterForm = this.fb.group({
      payrollPeriodId: [''],
      search: [''],
      status: [''],
      department: ['']
    });
    // Get currency synchronously first (from BehaviorSubject if already loaded)
    const initialCurrency = this.settingsService.getOrganizationCurrencyCode();
    this.organizationCurrency = initialCurrency ? initialCurrency.trim().toUpperCase() : 'USD';
  }

  ngOnInit(): void {
    this.loadOrganizationCurrency();
    this.loadAvailablePeriods();
    this.loadDepartments();
    this.loadPayrollEntries();
    this.setupFormSubscriptions();
  }

  private loadOrganizationCurrency(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (currency) => {
          if (currency && currency.trim() !== '') {
            // Ensure currency is stored in uppercase
            this.organizationCurrency = currency.trim().toUpperCase();
            console.log('Payslip Management - Organization currency loaded:', this.organizationCurrency);
          } else {
            console.warn('Payslip Management - Organization currency is empty, using default:', this.organizationCurrency);
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading organization currency:', error);
          this.organizationCurrency = 'USD'; // Default to USD on error
          this.cdr.markForCheck();
        }
      });
    
    // Also subscribe to the BehaviorSubject for immediate updates
    this.settingsService.organizationCurrency$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (currency) => {
          if (currency && currency.trim() !== '') {
            // Ensure currency is stored in uppercase
            this.organizationCurrency = currency.trim().toUpperCase();
            console.log('Payslip Management - Currency updated from BehaviorSubject:', this.organizationCurrency);
            this.cdr.markForCheck();
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAvailablePeriods(): void {
    this.payrollService.getPayrollPeriods()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.availablePeriods = response.data.data || [];
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error loading periods:', error);
          const errorMessage = error?.error?.message || error?.message || 'Failed to load payroll periods';
          this.notificationService.showError(errorMessage);
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
          const errorMessage = error?.error?.message || error?.message || 'Failed to load departments';
          this.notificationService.showError(errorMessage);
        }
      });
  }

  private setupFormSubscriptions(): void {
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });
  }

  loadPayrollEntries(): void {
    this.isLoading = true;

    const filter: PayrollFilter = {
      payrollPeriodId: this.filterForm.get('payrollPeriodId')?.value || undefined,
      search: this.filterForm.get('search')?.value || undefined,
      status: this.filterForm.get('status')?.value || undefined,
      department: this.filterForm.get('department')?.value || undefined
    };
    
    this.payrollService.getPayrollEntries(filter, this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.payrollEntries = response.data.data || [];
            this.totalCount = response.data.totalCount || 0;
            this.groupEntriesByPeriod();
            this.selection.clear();
            this.updateSummaryStats();
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading payroll entries:', error);
          const errorMessage = error?.error?.message || error?.message || 'Failed to load payslips';
          this.notificationService.showError(errorMessage);
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private updateSummaryStats(): void {
    this.totalPayslips = this.payrollEntries.length;
    this.generatedPayslips = this.payrollEntries.filter(e => e.status === 'paid').length;
    this.emailedPayslips = Math.floor(this.generatedPayslips * 0.8); // Mock data
    this.downloadedPayslips = Math.floor(this.generatedPayslips * 0.6); // Mock data
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadPayrollEntries();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.currentPage = 1;
    this.loadPayrollEntries();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadPayrollEntries();
  }

  // Selection methods
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.payrollEntries.filter(e => e.status !== 'draft').length;
    return numSelected === numRows;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.payrollEntries
        .filter(entry => entry.status !== 'draft')
        .forEach(entry => this.selection.select(entry));
    }
  }

  isPeriodAllSelected(periodId: string): boolean {
    const periodEntries = this.groupedEntries.get(periodId) || [];
    const selectableEntries = periodEntries.filter(e => e.status !== 'draft');
    return selectableEntries.length > 0 && 
           selectableEntries.every(entry => this.selection.isSelected(entry));
  }

  isPeriodIndeterminate(periodId: string): boolean {
    const periodEntries = this.groupedEntries.get(periodId) || [];
    const selectableEntries = periodEntries.filter(e => e.status !== 'draft');
    const selectedCount = selectableEntries.filter(e => this.selection.isSelected(e)).length;
    return selectedCount > 0 && selectedCount < selectableEntries.length;
  }

  masterTogglePeriod(periodId: string): void {
    const periodEntries = this.groupedEntries.get(periodId) || [];
    const selectableEntries = periodEntries.filter(e => e.status !== 'draft');
    
    if (this.isPeriodAllSelected(periodId)) {
      selectableEntries.forEach(entry => this.selection.deselect(entry));
    } else {
      selectableEntries.forEach(entry => this.selection.select(entry));
    }
  }

  clearSelection(): void {
    this.selection.clear();
  }

  // Payslip actions
  previewPayslip(entry: PayrollEntry): void {
    const period = this.availablePeriods.find(p => p.periodId === entry.periodId);
    
    this.dialog.open(PayslipPreviewDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      data: {
        entry: entry,
        period: period,
        organizationCurrency: this.organizationCurrency,
        onDownload: () => {
          this.downloadPayslip(entry);
        }
      },
      disableClose: false
    });
  }

  downloadPayslip(entry: PayrollEntry): void {
    this.payrollService.downloadPayslip(entry.entryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          // Check if blob is valid
          if (blob && blob.size > 0) {
            // Check if it's a valid PDF (starts with PDF header) or text blob from mock
            const reader = new FileReader();
            reader.onload = (e) => {
              const arrayBuffer = e.target?.result as ArrayBuffer;
              const bytes = new Uint8Array(arrayBuffer);
              
              // Check if it's a valid PDF (PDF files start with %PDF)
              const isPdf = bytes.length >= 4 && 
                           String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === '%PDF';
              
              if (!isPdf) {
                // Backend returned mock data, generate PDF on frontend instead
                this.generatePdfFromEntry(entry);
                return;
              }
              
              // Valid PDF, proceed with download
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `payslip-${entry.employeeCode}-${entry.periodId}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              this.notificationService.showSuccess('Payslip downloaded successfully');
            };
            reader.readAsArrayBuffer(blob.slice(0, 1024)); // Read first 1KB to check header
          } else {
            this.notificationService.showError('Payslip file is empty or unavailable');
          }
        },
        error: (error) => {
          console.error('Download error:', error);
          const errorMessage = error?.error?.message || error?.message || 'Failed to download payslip';
          this.notificationService.showError(errorMessage);
          this.generatePdfFromEntry(entry);
        }
      });
  }

  private generatePdfFromEntry(entry: PayrollEntry): void {
    this.notificationService.showInfo('Generating payslip PDF...');
    
    // Use the same currency logic as the template
    const currentCurrency = this.getCurrencyCode(entry);
    
    console.log('PDF Generation - entry.currency:', entry.currency, 'organizationCurrency:', this.organizationCurrency, 'using:', currentCurrency);
    
    // Dynamically import jsPDF and autoTable
    Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]).then((modules) => {
      const { jsPDF } = modules[0];
      const autoTable = (modules[1] as any).default || (modules[1] as any);
      const doc = new jsPDF();
      const period = this.availablePeriods.find(p => p.periodId === entry.periodId);
      
      // Helper functions
      const formatDate = (date?: string): string => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      };

      const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currentCurrency }).format(amount);
      };

      let yPos = 20;

      // Header
      doc.setFontSize(24);
      doc.setTextColor(25, 118, 210);
      doc.text('PAYSLIP', 105, yPos, { align: 'center' });
      
      yPos += 10;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Period: ${period?.periodName || 'N/A'}`, 105, yPos, { align: 'center' });
      yPos += 6;
      doc.text(`Date Range: ${formatDate(period?.startDate)} - ${formatDate(period?.endDate)}`, 105, yPos, { align: 'center' });
      
      yPos += 15;
      doc.setDrawColor(25, 118, 210);
      doc.setLineWidth(0.5);
      doc.line(20, yPos, 190, yPos);

      // Employee Information
      yPos += 10;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Information', 20, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Name: ${entry.employeeName}`, 20, yPos);
      yPos += 6;
      doc.text(`Code: ${entry.employeeCode}`, 20, yPos);
      yPos += 6;
      doc.text(`Department: ${entry.department || 'N/A'}`, 20, yPos);

      // Earnings Section
      yPos += 12;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Earnings', 20, yPos);
      yPos += 8;

      // Earnings table
      const earningsData: any[][] = [
        ['Description', 'Amount']
      ];

      earningsData.push(['Basic Salary', formatCurrency(entry.basicSalary)]);
      if (entry.overtimeAmount > 0) {
        earningsData.push(['Overtime', formatCurrency(entry.overtimeAmount)]);
      }
      if (entry.bonusAmount > 0) {
        earningsData.push(['Bonus', formatCurrency(entry.bonusAmount)]);
      }
      Object.entries(entry.allowances || {}).forEach(([name, amount]) => {
        earningsData.push([name, formatCurrency(Number(amount))]);
      });
      earningsData.push(['Gross Salary', formatCurrency(entry.grossSalary)]);

      autoTable(doc, {
        startY: yPos,
        head: [earningsData[0]],
        body: earningsData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [245, 245, 245], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        columnStyles: { 
          0: { cellWidth: 140 },
          1: { cellWidth: 50, halign: 'right' }
        },
        margin: { left: 20, right: 20 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Deductions Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Deductions', 20, yPos);
      yPos += 8;

      const deductionsData: any[][] = [
        ['Description', 'Amount']
      ];

      if (entry.taxAmount > 0) {
        deductionsData.push(['Tax', formatCurrency(entry.taxAmount)]);
      }
      Object.entries(entry.deductions || {}).forEach(([name, amount]) => {
        deductionsData.push([name, formatCurrency(Number(amount))]);
      });
      if (entry.otherDeductions > 0) {
        deductionsData.push(['Other Deductions', formatCurrency(entry.otherDeductions)]);
      }

      const totalDeductions = entry.taxAmount + 
        Object.values(entry.deductions || {}).reduce((sum: number, val) => sum + Number(val), 0) + 
        entry.otherDeductions;
      deductionsData.push(['Total Deductions', formatCurrency(totalDeductions)]);

      autoTable(doc, {
        startY: yPos,
        head: [deductionsData[0]],
        body: deductionsData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [245, 245, 245], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        columnStyles: { 
          0: { cellWidth: 140 },
          1: { cellWidth: 50, halign: 'right' }
        },
        margin: { left: 20, right: 20 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Net Salary Box
      doc.setFillColor(25, 118, 210);
      doc.rect(20, yPos, 170, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text('Net Salary', 105, yPos + 10, { align: 'center' });
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(entry.netSalary), 105, yPos + 20, { align: 'center' });

      // Footer
      yPos += 35;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${formatDate(entry.calculatedAt)}`, 105, yPos, { align: 'center' });
      if (entry.paidAt) {
        yPos += 5;
        doc.text(`Paid on: ${formatDate(entry.paidAt)}`, 105, yPos, { align: 'center' });
      }
      yPos += 5;
      doc.text(`Status: ${entry.status.toUpperCase()}`, 105, yPos, { align: 'center' });

      // Save the PDF
      doc.save(`payslip-${entry.employeeCode}-${entry.periodId}.pdf`);
      this.notificationService.showSuccess('Payslip downloaded as PDF successfully');
    }).catch((error) => {
      console.error('Error loading jsPDF:', error);
      const errorMessage = error?.error?.message || error?.message || 'Failed to generate PDF';
      this.notificationService.showError(errorMessage);
    });
  }

  emailSinglePayslip(entry: PayrollEntry): void {
    this.payrollService.emailPayslips(entry.periodId, [entry.employeeId])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Payslip emailed successfully');
        },
        error: (error) => {
          console.error('Email error:', error);
          const errorMessage = error?.error?.message || error?.message || 'Failed to email payslip';
          this.notificationService.showError(errorMessage);
        }
      });
  }

  regeneratePayslip(entry: PayrollEntry): void {
    this.payrollService.generatePayslips(entry.periodId, [entry.employeeId])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Payslip regenerated successfully');
          this.loadPayrollEntries();
        },
        error: (error) => {
          console.error('Regeneration error:', error);
          const errorMessage = error?.error?.message || error?.message || 'Failed to regenerate payslip';
          this.notificationService.showError(errorMessage);
        }
      });
  }

  // Bulk actions
  generatePayslips(): void {
    const selectedEntries = this.selection.selected;
    if (selectedEntries.length === 0) {
      this.notificationService.showWarning('Please select at least one payslip to generate');
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    // Group by period
    const periodGroups = new Map<string, string[]>();
    selectedEntries.forEach(entry => {
      if (!periodGroups.has(entry.periodId)) {
        periodGroups.set(entry.periodId, []);
      }
      periodGroups.get(entry.periodId)!.push(entry.employeeId);
    });

    // Generate payslips for each period using firstValueFrom
    const promises = Array.from(periodGroups.entries()).map(([periodId, employeeIds]) => 
      firstValueFrom(this.payrollService.generatePayslips(periodId, employeeIds))
    );

    Promise.all(promises)
      .then(() => {
        this.notificationService.showSuccess(`Generated ${selectedEntries.length} payslip(s) successfully`);
        this.selection.clear();
        this.loadPayrollEntries();
        this.isLoading = false;
        this.cdr.markForCheck();
      })
      .catch(error => {
        console.error('Bulk generation error:', error);
        const errorMessage = error?.error?.message || error?.message || 'Failed to generate some payslips. Please try again.';
        this.notificationService.showError(errorMessage);
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  emailPayslips(): void {
    const selectedEntries = this.selection.selected;
    if (selectedEntries.length === 0) {
      this.notificationService.showWarning('Please select at least one payslip to email');
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    // Group by period
    const periodGroups = new Map<string, string[]>();
    selectedEntries.forEach(entry => {
      if (!periodGroups.has(entry.periodId)) {
        periodGroups.set(entry.periodId, []);
      }
      periodGroups.get(entry.periodId)!.push(entry.employeeId);
    });

    // Email payslips for each period using firstValueFrom
    const promises = Array.from(periodGroups.entries()).map(([periodId, employeeIds]) => 
      firstValueFrom(this.payrollService.emailPayslips(periodId, employeeIds))
    );

    Promise.all(promises)
      .then(() => {
        this.notificationService.showSuccess(`Emailed ${selectedEntries.length} payslip(s) successfully`);
        this.selection.clear();
        this.isLoading = false;
        this.cdr.markForCheck();
      })
      .catch(error => {
        console.error('Bulk email error:', error);
        const errorMessage = error?.error?.message || error?.message || 'Failed to email some payslips. Please try again.';
        this.notificationService.showError(errorMessage);
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  downloadSelected(): void {
    this.notificationService.showInfo('Bulk download will be implemented');
  }

  // Utility methods
  getPeriodName(periodId: string): string {
    const period = this.availablePeriods.find(p => p.periodId === periodId);
    return period ? period.periodName : 'Unknown Period';
  }

  getPayslipStatus(entry: PayrollEntry): string {
    if (entry.status === 'paid') return 'generated';
    if (entry.status === 'approved') return 'ready';
    return entry.status;
  }

  getPayslipStatusColor(entry: PayrollEntry): 'primary' | 'accent' | 'warn' | undefined {
    switch (entry.status) {
      case 'paid':
        return 'primary';
      case 'approved':
        return 'accent';
      default:
        return 'warn';
    }
  }

  // Group entries by period
  private groupEntriesByPeriod(): void {
    this.groupedEntries.clear();
    this.periodGroups = [];

    // Group entries by periodId
    this.payrollEntries.forEach(entry => {
      if (!this.groupedEntries.has(entry.periodId)) {
        this.groupedEntries.set(entry.periodId, []);
      }
      this.groupedEntries.get(entry.periodId)!.push(entry);
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
        entries: entries.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
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

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getPeriodTotalGross(periodId: string): number {
    const entries = this.groupedEntries.get(periodId) || [];
    return entries.reduce((sum, entry) => sum + entry.grossSalary, 0);
  }

  getPeriodTotalNet(periodId: string): number {
    const entries = this.groupedEntries.get(periodId) || [];
    return entries.reduce((sum, entry) => sum + entry.netSalary, 0);
  }

  getCurrencyCode(entry: PayrollEntry): string {
    // First check if entry has a valid currency (not empty, not USD default)
    const entryCurrency = entry.currency?.trim().toUpperCase();
    if (entryCurrency && entryCurrency !== '' && entryCurrency.length === 3 && entryCurrency !== 'USD') {
      return entryCurrency;
    }
    // Prefer organization currency over entry currency (especially if entry currency is USD default)
    const orgCurrency = this.organizationCurrency?.trim().toUpperCase();
    if (orgCurrency && orgCurrency !== '' && orgCurrency.length === 3) {
      return orgCurrency;
    }
    // If entry has a valid currency (even if USD), use it
    if (entryCurrency && entryCurrency !== '' && entryCurrency.length === 3) {
      return entryCurrency;
    }
    // Default fallback to USD
    return 'USD';
  }

  // Helper method to check if filters are applied
  hasFiltersApplied(): boolean {
    if (!this.filterForm) return false;
    const values = this.filterForm.value;
    return !!(
      values.payrollPeriodId ||
      values.search?.trim() ||
      values.status ||
      values.department
    );
  }
}
