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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { Subject, takeUntil } from 'rxjs';

import { PayrollService } from '../../services/payroll.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  PayrollEntry, 
  PayrollEntryStatus,
  Payslip,
  PayrollSearchRequest,
  PayrollListResponse,
  PayrollFilter
} from '../../../../core/models/payroll.models';
import { User } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-employee-payslip',
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
    MatTabsModule
  ],
  template: `
    <div class="employee-payslip-container">
      
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">
          <mat-icon>receipt</mat-icon>
          My Payslips
        </h1>
        <div class="header-actions">
          <button mat-stroked-button (click)="refreshData()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </div>
      </div>

      <!-- Search and Filter Section -->
      <mat-card class="filter-card">
        <mat-card-content>
          <form [formGroup]="searchForm" class="filter-form">
            <div class="filter-row">
              <mat-form-field appearance="outline" class="period-filter">
                <mat-label>Payroll Period</mat-label>
                <mat-select formControlName="payrollPeriodId">
                  <mat-option value="">All Periods</mat-option>
                  <mat-option *ngFor="let period of availablePeriods" [value]="period.periodId">
                    {{ period.periodName }}
                  </mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="status-filter">
                <mat-label>Status</mat-label>
                <mat-select formControlName="status">
                  <mat-option value="">All Statuses</mat-option>
                  <mat-option value="paid">Paid</mat-option>
                  <mat-option value="approved">Approved</mat-option>
                  <mat-option value="calculated">Calculated</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="search-filter">
                <mat-label>Search</mat-label>
                <input matInput formControlName="search" placeholder="Search by period name...">
                <mat-icon matSuffix>search</mat-icon>
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
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Payslips List -->
      <mat-card class="payslips-card">
        <mat-card-header>
          <mat-card-title>Payslip History</mat-card-title>
          <mat-card-subtitle>View and download your payslips</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          
          <!-- Loading State -->
          <div *ngIf="isLoading" class="loading-container">
            <mat-spinner diameter="50"></mat-spinner>
            <p>Loading payslips...</p>
          </div>

          <!-- Empty State -->
          <div *ngIf="!isLoading && payslips.length === 0" class="empty-state">
            <mat-icon>receipt_long</mat-icon>
            <h3>No Payslips Found</h3>
            <p>No payslips are available for the selected filters.</p>
          </div>

          <!-- Payslips Table -->
          <div *ngIf="!isLoading && payslips.length > 0" class="payslips-table-container">
            <mat-table [dataSource]="payslips" class="payslips-table">
              
              <!-- Period Column -->
              <ng-container matColumnDef="period">
                <mat-header-cell *matHeaderCellDef>Period</mat-header-cell>
                <mat-cell *matCellDef="let payslip">
                  <div class="period-info">
                    <div class="period-name">{{ payslip.periodId }}</div>
                    <div class="pay-date">Created: {{ payslip.createdAt | date:'mediumDate' }}</div>
                  </div>
                </mat-cell>
              </ng-container>

              <!-- Salary Details Column -->
              <ng-container matColumnDef="salaryDetails">
                <mat-header-cell *matHeaderCellDef>Salary Details</mat-header-cell>
                <mat-cell *matCellDef="let payslip">
                  <div class="salary-details">
                    <div class="detail-item">
                      <span class="label">Basic:</span>
                      <span class="value">{{ payslip.basicSalary | currency:payslip.currency }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">Gross:</span>
                      <span class="value">{{ payslip.grossSalary | currency:payslip.currency }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">Net:</span>
                      <span class="value">{{ payslip.netSalary | currency:payslip.currency }}</span>
                    </div>
                  </div>
                </mat-cell>
              </ng-container>

              <!-- Allowances Column -->
              <ng-container matColumnDef="allowances">
                <mat-header-cell *matHeaderCellDef>Allowances</mat-header-cell>
                <mat-cell *matCellDef="let payslip">
                  <div class="components-list">
                    <div *ngFor="let allowance of payslip.allowances | keyvalue" class="component-item">
                       {{ allowance.key }}: {{ getNumberValue(allowance.value) | currency:payslip.currency }}
                     </div>
                     <div *ngIf="hasKeys(payslip.allowances) === false" class="no-components">
                       No allowances
                     </div>
                  </div>
                </mat-cell>
              </ng-container>

              <!-- Deductions Column -->
              <ng-container matColumnDef="deductions">
                <mat-header-cell *matHeaderCellDef>Deductions</mat-header-cell>
                <mat-cell *matCellDef="let payslip">
                  <div class="components-list">
                    <div *ngFor="let deduction of payslip.deductions | keyvalue" class="component-item">
                       {{ deduction.key }}: {{ getNumberValue(deduction.value) | currency:payslip.currency }}
                     </div>
                     <div *ngIf="hasKeys(payslip.deductions) === false" class="no-components">
                       No deductions
                     </div>
                  </div>
                </mat-cell>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <mat-header-cell *matHeaderCellDef>Status</mat-header-cell>
                <mat-cell *matCellDef="let payslip">
                  <mat-chip [color]="getStatusColor(payslip.status)" class="status-chip">
                    {{ payslip.status | titlecase }}
                  </mat-chip>
                </mat-cell>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <mat-header-cell *matHeaderCellDef>Actions</mat-header-cell>
                <mat-cell *matCellDef="let payslip">
                  <div class="actions-cell">
                    <button mat-icon-button [matMenuTriggerFor]="payslipMenu" matTooltip="More options">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #payslipMenu="matMenu">
                      <button mat-menu-item (click)="viewPayslipDetails(payslip)">
                        <mat-icon>visibility</mat-icon>
                        View Details
                      </button>
                      <button mat-menu-item (click)="downloadPayslip(payslip)">
                        <mat-icon>download</mat-icon>
                        Download PDF
                      </button>
                      <button mat-menu-item (click)="emailPayslip(payslip)" *ngIf="payslip.status === 'paid'">
                        <mat-icon>email</mat-icon>
                        Email Payslip
                      </button>
                    </mat-menu>
                  </div>
                </mat-cell>
              </ng-container>

              <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
              <mat-row *matRowDef="let row; columns: displayedColumns;"></mat-row>
            </mat-table>

            <!-- Pagination -->
            <mat-paginator 
              [length]="totalCount"
              [pageSize]="pageSize"
              [pageIndex]="pageIndex"
              [pageSizeOptions]="[5, 10, 25, 50]"
              (page)="onPageChange($event)"
              showFirstLastButtons>
            </mat-paginator>
          </div>

        </mat-card-content>
      </mat-card>

    </div>
  `,
  styleUrls: ['./employee-payslip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeePayslipComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  // Data properties
  currentUser: User | null = null;
  payslips: PayrollEntry[] = [];
  availablePeriods: any[] = [];
  totalCount = 0;
  pageIndex = 0;
  pageSize = 10;

  // UI state
  isLoading = false;

  // Form
  searchForm: FormGroup;

  // Table configuration
  displayedColumns: string[] = ['period', 'salaryDetails', 'allowances', 'deductions', 'status', 'actions'];

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.searchForm = this.fb.group({
      payrollPeriodId: [''],
      status: [''],
      search: ['']
    });
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadAvailablePeriods();
    this.loadPayslips();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUserValue();
  }

  private loadAvailablePeriods(): void {
    this.payrollService.getPayrollPeriods(1, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.availablePeriods = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading periods:', error);
        }
      });
  }

  private loadPayslips(): void {
    if (!this.currentUser) return;

    this.isLoading = true;

    const filter: PayrollFilter = {
      employeeId: this.currentUser.userId,
      payrollPeriodId: this.searchForm.get('payrollPeriodId')?.value || undefined,
      status: this.searchForm.get('status')?.value || undefined,
      search: this.searchForm.get('search')?.value || undefined
    };

    this.payrollService.getPayrollEntries(filter, this.pageIndex + 1, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.payslips = response.data.data;
            this.totalCount = response.data.totalCount;
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading payslips:', error);
          this.notificationService.showError('Failed to load payslips');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.loadPayslips();
  }

  clearFilters(): void {
    this.searchForm.reset({
      payrollPeriodId: '',
      status: '',
      search: ''
    });
    this.pageIndex = 0;
    this.loadPayslips();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPayslips();
  }

  refreshData(): void {
    this.loadPayslips();
  }

  viewPayslipDetails(payslip: PayrollEntry): void {
    this.notificationService.showInfo('Payslip details view will be implemented');
  }

  downloadPayslip(payslip: PayrollEntry): void {
    this.isLoading = true;
    this.payrollService.downloadPayslip(payslip.entryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `payslip-${payslip.periodId}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.notificationService.showSuccess('Payslip downloaded successfully');
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Download error:', error);
          this.notificationService.showError('Failed to download payslip');
          this.isLoading = false;
        }
      });
  }

  emailPayslip(payslip: PayrollEntry): void {
    this.payrollService.emailPayslips(payslip.employeeId, [payslip.employeeId])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Payslip sent to your email successfully');
        },
        error: (error) => {
          console.error('Email error:', error);
          this.notificationService.showError('Failed to email payslip');
        }
      });
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (status) {
      case 'paid':
        return 'primary';
      case 'approved':
        return 'accent';
      case 'calculated':
        return 'warn';
      default:
        return undefined;
    }
  }

  hasKeys(obj: { [key: string]: number }): boolean {
    return Object.keys(obj).length > 0;
  }

  getNumberValue(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      return parseFloat(value) || 0;
    }
    if (value && typeof value === 'object' && 'amount' in value) {
      return this.getNumberValue(value.amount);
    }
    return 0;
  }
}