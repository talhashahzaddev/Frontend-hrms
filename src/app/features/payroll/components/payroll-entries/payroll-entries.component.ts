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
import { MatDividerModule } from '@angular/material/divider';
import { SelectionModel } from '@angular/cdk/collections';
import { Subject, takeUntil } from 'rxjs';

import { PayrollService } from '../../services/payroll.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  PayrollEntry, 
  PayrollEntryStatus,
  PayrollFilter
} from '../../../../core/models/payroll.models';
import { PaginatedResponse, PagedResult } from '../../../../core/models/common.models';

@Component({
  selector: 'app-payroll-entries',
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
    MatDividerModule
  ],
  template: `
    <div class="payroll-entries-container">
      
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">
          <mat-icon>receipt_long</mat-icon>
          Payroll Entries
        </h1>
        <div class="header-actions" *ngIf="selection.hasValue()">
          <button mat-raised-button color="primary" (click)="approveSelected()">
            <mat-icon>check</mat-icon>
            Approve Selected ({{ selection.selected.length }})
          </button>
          <button mat-stroked-button (click)="markSelectedAsPaid()">
            <mat-icon>paid</mat-icon>
            Mark as Paid
          </button>
        </div>
      </div>

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <form [formGroup]="filterForm" class="filters-form">
            <mat-form-field appearance="outline">
              <mat-label>Search</mat-label>
              <input matInput formControlName="search" placeholder="Search by employee name or code...">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select formControlName="status">
                <mat-option value="">All Statuses</mat-option>
                <mat-option value="draft">Draft</mat-option>
                <mat-option value="calculated">Calculated</mat-option>
                <mat-option value="approved">Approved</mat-option>
                <mat-option value="paid">Paid</mat-option>
                <mat-option value="rejected">Rejected</mat-option>
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
      <div class="summary-cards" *ngIf="summaryStats">
        <mat-card class="summary-card">
          <mat-card-content>
            <div class="stat-item">
              <div class="stat-value">{{ summaryStats.totalEntries }}</div>
              <div class="stat-label">Total Entries</div>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="summary-card">
          <mat-card-content>
            <div class="stat-item">
              <div class="stat-value">{{ summaryStats.totalGrossAmount | currency }}</div>
              <div class="stat-label">Total Gross</div>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="summary-card">
          <mat-card-content>
            <div class="stat-item">
              <div class="stat-value">{{ summaryStats.totalNetAmount | currency }}</div>
              <div class="stat-label">Total Net</div>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="summary-card">
          <mat-card-content>
            <div class="stat-item">
              <div class="stat-value">{{ summaryStats.pendingApprovals }}</div>
              <div class="stat-label">Pending Approvals</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Payroll Entries Table -->
      <mat-card class="table-card">
        <mat-card-content>
          <div class="table-container">
            <mat-table [dataSource]="payrollEntries" class="payroll-entries-table">
              
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
                                [disabled]="entry.status === 'paid'">
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

              <!-- Basic Salary Column -->
              <ng-container matColumnDef="basicSalary">
                <mat-header-cell *matHeaderCellDef>Basic Salary</mat-header-cell>
                <mat-cell *matCellDef="let entry">
                  {{ entry.basicSalary | currency }}
                </mat-cell>
              </ng-container>

              <!-- Allowances Column -->
              <ng-container matColumnDef="allowances">
                <mat-header-cell *matHeaderCellDef>Allowances</mat-header-cell>
                <mat-cell *matCellDef="let entry">
                  <div class="allowances-info">
                    <div class="amount">{{ getTotalAllowances(entry) | currency }}</div>
                    <small *ngIf="hasAllowances(entry)" 
                           [matTooltip]="getAllowancesTooltip(entry)">
                      {{ getAllowancesCount(entry) }} item(s)
                    </small>
                  </div>
                </mat-cell>
              </ng-container>

              <!-- Deductions Column -->
              <ng-container matColumnDef="deductions">
                <mat-header-cell *matHeaderCellDef>Deductions</mat-header-cell>
                <mat-cell *matCellDef="let entry">
                  <div class="deductions-info">
                    <div class="amount">{{ getTotalDeductions(entry) | currency }}</div>
                    <small>Tax: {{ entry.taxAmount | currency }}</small>
                  </div>
                </mat-cell>
              </ng-container>

              <!-- Gross Salary Column -->
              <ng-container matColumnDef="grossSalary">
                <mat-header-cell *matHeaderCellDef>Gross Salary</mat-header-cell>
                <mat-cell *matCellDef="let entry">
                  <div class="gross-salary">{{ entry.grossSalary | currency }}</div>
                </mat-cell>
              </ng-container>

              <!-- Net Salary Column -->
              <ng-container matColumnDef="netSalary">
                <mat-header-cell *matHeaderCellDef>Net Salary</mat-header-cell>
                <mat-cell *matCellDef="let entry">
                  <div class="net-salary">{{ entry.netSalary | currency }}</div>
                </mat-cell>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <mat-header-cell *matHeaderCellDef>Status</mat-header-cell>
                <mat-cell *matCellDef="let entry">
                  <mat-chip [color]="getStatusColor(entry.status)">
                    {{ entry.status | titlecase }}
                  </mat-chip>
                </mat-cell>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <mat-header-cell *matHeaderCellDef>Actions</mat-header-cell>
                <mat-cell *matCellDef="let entry">
                  <button mat-icon-button [matMenuTriggerFor]="entryMenu">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #entryMenu="matMenu">
                    <button mat-menu-item (click)="viewEntryDetails(entry)">
                      <mat-icon>visibility</mat-icon>
                      View Details
                    </button>
                    <button mat-menu-item (click)="approveEntry(entry)" 
                            [disabled]="entry.status !== 'calculated'">
                      <mat-icon>check</mat-icon>
                      Approve
                    </button>
                    <button mat-menu-item (click)="rejectEntry(entry)" 
                            [disabled]="entry.status !== 'calculated'">
                      <mat-icon>close</mat-icon>
                      Reject
                    </button>
                    <button mat-menu-item (click)="markAsPaid(entry)" 
                            [disabled]="entry.status !== 'approved'">
                      <mat-icon>paid</mat-icon>
                      Mark as Paid
                    </button>
                    <mat-divider></mat-divider>
                    <button mat-menu-item (click)="downloadPayslip(entry)" 
                            [disabled]="entry.status !== 'paid'">
                      <mat-icon>download</mat-icon>
                      Download Payslip
                    </button>
                  </mat-menu>
                </mat-cell>
              </ng-container>

              <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
              <mat-row *matRowDef="let row; columns: displayedColumns;" 
                       (click)="viewEntryDetails(row)" 
                       class="clickable-row"></mat-row>
            </mat-table>

            <!-- Empty State -->
            <div *ngIf="payrollEntries.length === 0 && !isLoading" class="empty-state">
              <mat-icon>receipt_long</mat-icon>
              <h3>No Payroll Entries Found</h3>
              <p>No payroll entries match your current filters.</p>
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

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="60"></mat-spinner>
        <p>Loading payroll entries...</p>
      </div>

    </div>
  `,
  styleUrls: ['./payroll-entries.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayrollEntriesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  // Data properties
  payrollEntries: PayrollEntry[] = [];
  totalCount = 0;
  currentPage = 1;
  pageSize = 25;
  selection = new SelectionModel<PayrollEntry>(true, []);

  // UI state
  isLoading = false;
  filterForm: FormGroup;
  summaryStats: any = null;

  // Table configuration
  displayedColumns: string[] = ['select', 'employee', 'basicSalary', 'allowances', 'deductions', 'grossSalary', 'netSalary', 'status', 'actions'];

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private notificationService: NotificationService
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      status: [''],
      department: ['']
    });
  }

  ngOnInit(): void {
    this.loadPayrollEntries();
    this.loadSummaryStats();
    
    // Auto-apply filters on form changes
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPayrollEntries(): void {
    this.isLoading = true;

    const filter: PayrollFilter = {
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
            this.selection.clear(); // Clear selection when data changes
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading payroll entries:', error);
          this.notificationService.showError('Failed to load payroll entries');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadSummaryStats(): void {
    // Mock summary stats - in real implementation, this would come from API
    this.summaryStats = {
      totalEntries: 150,
      totalGrossAmount: 1250000,
      totalNetAmount: 1062500,
      pendingApprovals: 25
    };
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
    const numRows = this.payrollEntries.length;
    return numSelected === numRows;
  }

  masterToggle(): void {
    this.isAllSelected() ?
      this.selection.clear() :
      this.payrollEntries.forEach(row => this.selection.select(row));
  }

  // Entry actions
  viewEntryDetails(entry: PayrollEntry): void {
    // TODO: Open entry details dialog
    this.notificationService.showInfo('Entry details view will be implemented');
  }

  approveEntry(entry: PayrollEntry): void {
    this.payrollService.approvePayrollEntry(entry.entryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Payroll entry approved successfully');
          this.loadPayrollEntries();
        },
        error: (error) => {
          console.error('Error approving entry:', error);
          this.notificationService.showError('Failed to approve payroll entry');
        }
      });
  }

  rejectEntry(entry: PayrollEntry): void {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      this.payrollService.rejectPayrollEntry(entry.entryId, reason)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Payroll entry rejected');
            this.loadPayrollEntries();
          },
          error: (error) => {
            console.error('Error rejecting entry:', error);
            this.notificationService.showError('Failed to reject payroll entry');
          }
        });
    }
  }

  markAsPaid(entry: PayrollEntry): void {
    this.payrollService.markPayrollEntryAsPaid(entry.entryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Payroll entry marked as paid');
          this.loadPayrollEntries();
        },
        error: (error) => {
          console.error('Error marking as paid:', error);
          this.notificationService.showError('Failed to mark as paid');
        }
      });
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

  // Bulk actions
  approveSelected(): void {
    const selectedIds = this.selection.selected.map(entry => entry.entryId);
    this.payrollService.approveMultiplePayrollEntries(selectedIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess(`${selectedIds.length} entries approved successfully`);
          this.selection.clear();
          this.loadPayrollEntries();
        },
        error: (error) => {
          console.error('Error approving entries:', error);
          this.notificationService.showError('Failed to approve selected entries');
        }
      });
  }

  markSelectedAsPaid(): void {
    const selectedIds = this.selection.selected.map(entry => entry.entryId);
    this.payrollService.markMultiplePayrollEntriesAsPaid(selectedIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess(`${selectedIds.length} entries marked as paid`);
          this.selection.clear();
          this.loadPayrollEntries();
        },
        error: (error) => {
          console.error('Error marking as paid:', error);
          this.notificationService.showError('Failed to mark selected entries as paid');
        }
      });
  }

  // Utility methods
  getTotalAllowances(entry: PayrollEntry): number {
    return Object.values(entry.allowances || {}).reduce((sum, value) => sum + (value || 0), 0) + (entry.overtimeAmount || 0) + (entry.bonusAmount || 0);
  }

  getTotalDeductions(entry: PayrollEntry): number {
    return Object.values(entry.deductions || {}).reduce((sum, value) => sum + (value || 0), 0) + (entry.taxAmount || 0) + (entry.otherDeductions || 0);
  }

  hasAllowances(entry: PayrollEntry): boolean {
    return Object.keys(entry.allowances || {}).length > 0;
  }

  getAllowancesCount(entry: PayrollEntry): number {
    return Object.keys(entry.allowances || {}).length;
  }

  getAllowancesTooltip(entry: PayrollEntry): string {
    return Object.entries(entry.allowances || {})
      .map(([key, value]) => `${key}: ${this.formatCurrency(value)}`)
      .join('\n');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getStatusColor(status: PayrollEntryStatus): 'primary' | 'accent' | 'warn' | undefined {
    switch (status) {
      case PayrollEntryStatus.APPROVED:
      case PayrollEntryStatus.PAID:
        return 'primary';
      case PayrollEntryStatus.CALCULATED:
        return 'accent';
      case PayrollEntryStatus.DRAFT:
        return 'warn';
      default:
        return undefined;
    }
  }
}
