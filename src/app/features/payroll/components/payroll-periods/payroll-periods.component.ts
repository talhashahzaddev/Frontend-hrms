import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil } from 'rxjs';

import { PayrollService } from '../../services/payroll.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CreatePayrollPeriodDialogComponent } from '../create-payroll-period-dialog/create-payroll-period-dialog.component';
import { 
  PayrollPeriod, 
  PayrollStatus,
  CreatePayrollPeriodRequest,
  UpdatePayrollPeriodRequest
} from '../../../../core/models/payroll.models';
import { PaginatedResponse } from '../../../../core/models/common.models';

@Component({
  selector: 'app-payroll-periods',
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
    MatMenuModule,
    MatDialogModule,
    MatDividerModule
  ],
  template: `
    <div class="payroll-periods-container">
      
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">
          <mat-icon>schedule</mat-icon>
          Payroll Periods
        </h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            New Payroll Period
          </button>
        </div>
      </div>

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <form [formGroup]="filterForm" class="filters-form">
            <mat-form-field appearance="outline">
              <mat-label>Search</mat-label>
              <input matInput formControlName="search" placeholder="Search by period name...">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select formControlName="status">
                <mat-option value="">All Statuses</mat-option>
                <mat-option value="draft">Draft</mat-option>
                <mat-option value="calculated">Calculated</mat-option>
                <mat-option value="processed">Processed</mat-option>
                <mat-option value="approved">Approved</mat-option>
                <mat-option value="paid">Paid</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="filter-actions">
              <button mat-raised-button color="primary" (click)="applyFilters()">
                <mat-icon>filter_list</mat-icon>
                Apply Filters
              </button>
              <button mat-stroked-button (click)="clearFilters()">
                <mat-icon>clear</mat-icon>
                Clear
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Payroll Periods Table -->
      <mat-card class="table-card">
        <mat-card-content>
          <div class="table-container">
            <mat-table [dataSource]="payrollPeriods" class="payroll-periods-table">
              
              <ng-container matColumnDef="periodName">
                <mat-header-cell *matHeaderCellDef>Period Name</mat-header-cell>
                <mat-cell *matCellDef="let period">
                  <div class="period-info">
                    <strong>{{ period.periodName }}</strong>
                    <small>Created: {{ period.createdAt | date:'short' }}</small>
                  </div>
                </mat-cell>
              </ng-container>

              <ng-container matColumnDef="dates">
                <mat-header-cell *matHeaderCellDef>Period Dates</mat-header-cell>
                <mat-cell *matCellDef="let period">
                  <div class="date-range">
                    <div>{{ period.startDate | date:'mediumDate' }}</div>
                    <mat-icon class="date-separator">arrow_forward</mat-icon>
                    <div>{{ period.endDate | date:'mediumDate' }}</div>
                  </div>
                </mat-cell>
              </ng-container>

              <ng-container matColumnDef="payDate">
                <mat-header-cell *matHeaderCellDef>Pay Date</mat-header-cell>
                <mat-cell *matCellDef="let period">
                  {{ period.payDate ? (period.payDate | date:'mediumDate') : 'Not set' }}
                </mat-cell>
              </ng-container>

              <ng-container matColumnDef="employees">
                <mat-header-cell *matHeaderCellDef>Employees</mat-header-cell>
                <mat-cell *matCellDef="let period">
                  <div class="employee-count">
                    <mat-icon>people</mat-icon>
                    {{ period.totalEmployees }}
                  </div>
                </mat-cell>
              </ng-container>

              <ng-container matColumnDef="amounts">
                <mat-header-cell *matHeaderCellDef>Amounts</mat-header-cell>
                <mat-cell *matCellDef="let period">
                  <div class="amounts-info">
                    <div class="gross-amount">Gross: {{ period.totalGrossAmount | currency }}</div>
                    <div class="net-amount">Net: {{ period.totalNetAmount | currency }}</div>
                  </div>
                </mat-cell>
              </ng-container>

              <ng-container matColumnDef="status">
                <mat-header-cell *matHeaderCellDef>Status</mat-header-cell>
                <mat-cell *matCellDef="let period">
                  <mat-chip [color]="getStatusColor(period.status)">
                    {{ period.status | titlecase }}
                  </mat-chip>
                </mat-cell>
              </ng-container>

              <ng-container matColumnDef="actions">
                <mat-header-cell *matHeaderCellDef>Actions</mat-header-cell>
                <mat-cell *matCellDef="let period">
                  <button mat-icon-button [matMenuTriggerFor]="periodMenu">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #periodMenu="matMenu">
                    <button mat-menu-item (click)="viewPeriodDetails(period)">
                      <mat-icon>visibility</mat-icon>
                      View Details
                    </button>
                    <button mat-menu-item (click)="editPeriod(period)" [disabled]="period.status !== 'draft'">
                      <mat-icon>edit</mat-icon>
                      Edit
                    </button>
                    <button mat-menu-item (click)="calculatePayroll(period)" [disabled]="period.status !== 'draft'">
                      <mat-icon>calculate</mat-icon>
                      Calculate Payroll
                    </button>
                    <button mat-menu-item (click)="duplicatePeriod(period)">
                      <mat-icon>content_copy</mat-icon>
                      Duplicate
                    </button>
                    <mat-divider></mat-divider>
                    <button mat-menu-item (click)="exportPeriod(period)" class="export-action">
                      <mat-icon>download</mat-icon>
                      Export Report
                    </button>
                    <button mat-menu-item (click)="deletePeriod(period)" 
                            [disabled]="period.status !== 'draft'" 
                            class="delete-action">
                      <mat-icon>delete</mat-icon>
                      Delete
                    </button>
                  </mat-menu>
                </mat-cell>
              </ng-container>

              <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
              <mat-row *matRowDef="let row; columns: displayedColumns;" 
                       (click)="viewPeriodDetails(row)" 
                       class="clickable-row"></mat-row>
            </mat-table>

            <!-- Empty State -->
            <div *ngIf="payrollPeriods.length === 0 && !isLoading" class="empty-state">
              <mat-icon>schedule</mat-icon>
              <h3>No Payroll Periods Found</h3>
              <p>Create your first payroll period to get started.</p>
              <button mat-raised-button color="primary" (click)="openCreateDialog()">
                <mat-icon>add</mat-icon>
                Create Payroll Period
              </button>
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
        <p>Loading payroll periods...</p>
      </div>

    </div>
  `,
  styleUrls: ['./payroll-periods.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayrollPeriodsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  // Data properties
  payrollPeriods: PayrollPeriod[] = [];
  totalCount = 0;
  currentPage = 1;
  pageSize = 25;

  // UI state
  isLoading = false;
  filterForm: FormGroup;

  // Table configuration
  displayedColumns: string[] = ['periodName', 'dates', 'payDate', 'employees', 'amounts', 'status', 'actions'];

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      status: ['']
    });
  }

  ngOnInit(): void {
    this.loadPayrollPeriods();
    
    // Auto-apply filters on form changes with debounce
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

  loadPayrollPeriods(): void {
    this.isLoading = true;

    const search = this.filterForm.get('search')?.value || '';
    
    this.payrollService.getPayrollPeriods(this.currentPage, this.pageSize, search)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.payrollPeriods = response.data;
            this.totalCount = response.data.length;
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading payroll periods:', error);
          this.notificationService.showError('Failed to load payroll periods');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadPayrollPeriods();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.currentPage = 1;
    this.loadPayrollPeriods();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadPayrollPeriods();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreatePayrollPeriodDialogComponent, {
      width: '600px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPayrollPeriods();
      }
    });
  }

  viewPeriodDetails(period: PayrollPeriod): void {
    // TODO: Navigate to period details page
    this.notificationService.showInfo('Period details view will be implemented');
  }

  editPeriod(period: PayrollPeriod): void {
    const dialogRef = this.dialog.open(CreatePayrollPeriodDialogComponent, {
      width: '600px',
      data: { mode: 'edit', period }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPayrollPeriods();
      }
    });
  }

  calculatePayroll(period: PayrollPeriod): void {
    if (confirm(`Calculate payroll for ${period.periodName}? This will process all employee salaries for this period.`)) {
     
      this.payrollService.calculatePayroll(period.periodId)
  .pipe(takeUntil(this.destroy$))
  .subscribe({
    next: (response) => {
      if (response.success && response.data) {
        this.notificationService.showSuccess('Payroll calculated successfully');
        this.loadPayrollPeriods();
      } else {
        this.notificationService.showError(response.message || 'Failed to calculate payroll');
      }
    },
    error: (error) => {
      console.error('Error calculating payroll:', error);
      this.notificationService.showError('Failed to calculate payroll');
    }
  });


    }
  }

  duplicatePeriod(period: PayrollPeriod): void {
    // TODO: Implement period duplication
    this.notificationService.showInfo('Duplicate period functionality will be implemented');
  }

  exportPeriod(period: PayrollPeriod): void {
    this.payrollService.exportPayrollReport({ payrollPeriodId: period.periodId }, 'excel')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `payroll-${period.periodName}-report.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.notificationService.showSuccess('Report exported successfully');
        },
        error: (error) => {
          console.error('Export error:', error);
          this.notificationService.showError('Failed to export report');
        }
      });
  }

  deletePeriod(period: PayrollPeriod): void {
    if (confirm(`Are you sure you want to delete the payroll period "${period.periodName}"? This action cannot be undone.`)) {
      this.payrollService.deletePayrollPeriod(period.periodId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Payroll period deleted successfully');
            this.loadPayrollPeriods();
          },
          error: (error) => {
            console.error('Error deleting period:', error);
            this.notificationService.showError('Failed to delete payroll period');
          }
        });
    }
  }

  getStatusColor(status: PayrollStatus): 'primary' | 'accent' | 'warn' | undefined {
    switch (status) {
      case PayrollStatus.APPROVED:
      case PayrollStatus.PAID:
        return 'primary';
      case PayrollStatus.CALCULATED:
      case PayrollStatus.PROCESSED:
        return 'accent';
      case PayrollStatus.DRAFT:
        return 'warn';
      default:
        return undefined;
    }
  }
}
