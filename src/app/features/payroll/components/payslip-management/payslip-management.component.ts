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
import { MatDialogModule } from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { Subject, takeUntil } from 'rxjs';

import { PayrollService } from '../../services/payroll.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  PayrollPeriod,
  PayrollEntry,
  PayrollFilter
} from '../../../../core/models/payroll.models';
import { PagedResult } from '../../../../core/models/common.models';

@Component({
  selector: 'app-payslip-management',
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
                <mat-option value="Engineering">Engineering</mat-option>
                <mat-option value="Sales">Sales</mat-option>
                <mat-option value="Marketing">Marketing</mat-option>
                <mat-option value="HR">HR</mat-option>
                <mat-option value="Finance">Finance</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="filter-actions">
              <button mat-raised-button color="primary" (click)="applyFilters()">
                <mat-icon>filter_list</mat-icon>
                Apply
              </button>
              <button mat-stroked-button (click)="clearFilters()">
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

      <!-- Payslips Table -->
      <mat-card class="table-card">
        <mat-card-content>
          <div class="table-container">
            <mat-table [dataSource]="payrollEntries" class="payslips-table">
              
              <!-- Selection Column -->
              <ng-container matColumnDef="select">
                <mat-header-cell *matHeaderCellDef>
                  <mat-checkbox (change)="$event ? masterToggle() : null"
                                [checked]="selection.hasValue() && isAllSelected()"
                                [indeterminate]="selection.hasValue() && !isAllSelected()">
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

              <!-- Period Column -->
              <ng-container matColumnDef="period">
                <mat-header-cell *matHeaderCellDef>Period</mat-header-cell>
                <mat-cell *matCellDef="let entry">
                  <div class="period-info">
                    <span>{{ getPeriodName(entry.periodId) }}</span>
                    <small>{{ entry.calculatedAt | date:'mediumDate' }}</small>
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
                      <span class="value">{{ entry.grossSalary | currency }}</span>
                    </div>
                    <div class="salary-item">
                      <span class="label">Net:</span>
                      <span class="value net-amount">{{ entry.netSalary | currency }}</span>
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
                  <button mat-icon-button [matMenuTriggerFor]="payslipMenu">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #payslipMenu="matMenu">
                    <button mat-menu-item (click)="previewPayslip(entry)">
                      <mat-icon>visibility</mat-icon>
                      Preview Payslip
                    </button>
                    <button mat-menu-item (click)="downloadPayslip(entry)" 
                            [disabled]="entry.status !== 'paid'">
                      <mat-icon>download</mat-icon>
                      Download PDF
                    </button>
                    <button mat-menu-item (click)="emailSinglePayslip(entry)" 
                            [disabled]="entry.status !== 'paid'">
                      <mat-icon>email</mat-icon>
                      Email Payslip
                    </button>
                    <button mat-menu-item (click)="regeneratePayslip(entry)" 
                            [disabled]="entry.status !== 'paid'">
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

            <!-- Empty State -->
            <div *ngIf="payrollEntries.length === 0 && !isLoading" class="empty-state">
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
  availablePeriods: PayrollPeriod[] = [];
  totalCount = 0;
  currentPage = 1;
  pageSize = 25;
  selection = new SelectionModel<PayrollEntry>(true, []);

  // Summary stats
  totalPayslips = 0;
  generatedPayslips = 0;
  emailedPayslips = 0;
  downloadedPayslips = 0;

  // UI state
  isLoading = false;
  filterForm: FormGroup;

  // Table configuration
  displayedColumns: string[] = ['select', 'employee', 'period', 'salaryDetails', 'payslipStatus', 'actions'];

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private notificationService: NotificationService
  ) {
    this.filterForm = this.fb.group({
      payrollPeriodId: [''],
      search: [''],
      status: [''],
      department: ['']
    });
  }

  ngOnInit(): void {
    this.loadAvailablePeriods();
    this.loadPayrollEntries();
    this.setupFormSubscriptions();
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
            this.availablePeriods = response.data;
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error loading periods:', error);
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
            this.selection.clear();
            this.updateSummaryStats();
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading payroll entries:', error);
          this.notificationService.showError('Failed to load payslips');
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

  clearSelection(): void {
    this.selection.clear();
  }

  // Payslip actions
  previewPayslip(entry: PayrollEntry): void {
    this.notificationService.showInfo('Payslip preview will be implemented');
  }

  downloadPayslip(entry: PayrollEntry): void {
    this.payrollService.downloadPayslip(entry.entryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `payslip-${entry.employeeCode}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.notificationService.showSuccess('Payslip downloaded successfully');
        },
        error: (error) => {
          console.error('Download error:', error);
          this.notificationService.showError('Failed to download payslip');
        }
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
          this.notificationService.showError('Failed to email payslip');
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
          this.notificationService.showError('Failed to regenerate payslip');
        }
      });
  }

  // Bulk actions
  generatePayslips(): void {
    const selectedEntries = this.selection.selected;
    if (selectedEntries.length === 0) return;

    // Group by period
    const periodGroups = new Map<string, string[]>();
    selectedEntries.forEach(entry => {
      if (!periodGroups.has(entry.periodId)) {
        periodGroups.set(entry.periodId, []);
      }
      periodGroups.get(entry.periodId)!.push(entry.employeeId);
    });

    // Generate payslips for each period
    const promises = Array.from(periodGroups.entries()).map(([periodId, employeeIds]) => 
      this.payrollService.generatePayslips(periodId, employeeIds).toPromise()
    );

    Promise.all(promises)
      .then(() => {
        this.notificationService.showSuccess(`Generated ${selectedEntries.length} payslips successfully`);
        this.selection.clear();
        this.loadPayrollEntries();
      })
      .catch(error => {
        console.error('Bulk generation error:', error);
        this.notificationService.showError('Failed to generate some payslips');
      });
  }

  emailPayslips(): void {
    const selectedEntries = this.selection.selected;
    if (selectedEntries.length === 0) return;

    // Group by period
    const periodGroups = new Map<string, string[]>();
    selectedEntries.forEach(entry => {
      if (!periodGroups.has(entry.periodId)) {
        periodGroups.set(entry.periodId, []);
      }
      periodGroups.get(entry.periodId)!.push(entry.employeeId);
    });

    // Email payslips for each period
    const promises = Array.from(periodGroups.entries()).map(([periodId, employeeIds]) => 
      this.payrollService.emailPayslips(periodId, employeeIds).toPromise()
    );

    Promise.all(promises)
      .then(() => {
        this.notificationService.showSuccess(`Emailed ${selectedEntries.length} payslips successfully`);
        this.selection.clear();
      })
      .catch(error => {
        console.error('Bulk email error:', error);
        this.notificationService.showError('Failed to email some payslips');
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
}
