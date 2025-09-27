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
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { NgChartsModule } from 'ng2-charts';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { PayrollService } from '../../services/payroll.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  PayrollPeriod, 
  PayrollEntry, 
  PayrollSummary,
  PayrollStatus,
  Payslip,
  PayrollReportFilter,
  ProcessPayrollRequest
} from '../../../../core/models/payroll.models';
import { User } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-payroll-dashboard',
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
    MatTabsModule,
    NgChartsModule
  ],
  template: `
    <div class="payroll-dashboard-container">
      
      <!-- Header -->
      <div class="dashboard-header">
        <h1 class="page-title">
          <mat-icon>payments</mat-icon>
          Payroll Management
        </h1>
        <div class="header-actions" *ngIf="hasHRRole()">
          <button mat-raised-button color="primary" (click)="createPayrollPeriod()">
            <mat-icon>add</mat-icon>
            New Payroll Period
          </button>
        </div>
      </div>

      <!-- Current Period Overview -->
      <mat-card class="current-period-card" *ngIf="currentPeriod">
        <mat-card-header>
          <mat-card-title>Current Payroll Period</mat-card-title>
          <mat-card-subtitle>{{ currentPeriod.periodName }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="period-overview">
            <div class="period-info">
              <div class="info-item">
                <label>Period:</label>
                <span>{{ currentPeriod.startDate | date:'mediumDate' }} - {{ currentPeriod.endDate | date:'mediumDate' }}</span>
              </div>
              <div class="info-item">
                <label>Pay Date:</label>
                <span>{{ (currentPeriod.payDate | date:'mediumDate') || 'Not set' }}</span>
              </div>
              <div class="info-item">
                <label>Status:</label>
                <mat-chip [color]="getStatusColor(currentPeriod.status)">
                  {{ currentPeriod.status | titlecase }}
                </mat-chip>
              </div>
            </div>
            
            <div class="period-stats">
              <div class="stat-item">
                <div class="stat-value">{{ currentPeriod.totalEmployees }}</div>
                <div class="stat-label">Employees</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ currentPeriod.totalGrossAmount | currency }}</div>
                <div class="stat-label">Gross Amount</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ currentPeriod.totalNetAmount | currency }}</div>
                <div class="stat-label">Net Amount</div>
              </div>
            </div>

            <div class="period-actions" *ngIf="hasHRRole()">
              <button mat-raised-button 
                      color="primary" 
                      (click)="calculatePayroll()"
                      [disabled]="currentPeriod.status !== 'draft'">
                <mat-icon>calculate</mat-icon>
                Calculate Payroll
              </button>
              <button mat-stroked-button 
                      (click)="processPayroll()"
                      [disabled]="currentPeriod.status !== 'calculated'">
                <mat-icon>send</mat-icon>
                Process Payroll
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Main Content Tabs -->
      <mat-card class="main-content-card">
        <mat-tab-group>
          
          <!-- My Payslip Tab -->
          <mat-tab label="My Payslip">
            <div class="tab-content">
              <div class="payslip-section">
                <div class="payslip-header">
                  <h3>Latest Payslip</h3>
                  <button mat-stroked-button (click)="downloadPayslip()" *ngIf="latestPayslip">
                    <mat-icon>download</mat-icon>
                    Download PDF
                  </button>
                </div>

                <div *ngIf="latestPayslip" class="payslip-container">
                  <mat-card class="payslip-card">
                    <mat-card-content>
                      <div class="payslip-header-info">
                        <h4>{{ latestPayslip.periodName }}</h4>
                        <p>Pay Date: {{ latestPayslip.payDate | date:'mediumDate' }}</p>
                      </div>

                      <div class="payslip-details">
                        <div class="earnings-section">
                          <h5>Earnings</h5>
                          <div class="component-item">
                            <span>Basic Salary</span>
                            <span>{{ latestPayslip.basicSalary | currency }}</span>
                          </div>
                          <div *ngFor="let allowance of latestPayslip.allowances" class="component-item">
                            <span>{{ allowance.name }}</span>
                            <span>{{ allowance.amount | currency }}</span>
                          </div>
                          <div class="total-item">
                            <span><strong>Gross Salary</strong></span>
                            <span><strong>{{ latestPayslip.grossSalary | currency }}</strong></span>
                          </div>
                        </div>

                        <div class="deductions-section">
                          <h5>Deductions</h5>
                          <div class="component-item">
                            <span>Tax</span>
                            <span>{{ latestPayslip.taxAmount | currency }}</span>
                          </div>
                          <div *ngFor="let deduction of latestPayslip.deductions" class="component-item">
                            <span>{{ deduction.name }}</span>
                            <span>{{ deduction.amount | currency }}</span>
                          </div>
                        </div>

                        <div class="net-salary-section">
                          <div class="net-salary">
                            <span><strong>Net Salary</strong></span>
                            <span><strong>{{ latestPayslip.netSalary | currency }}</strong></span>
                          </div>
                        </div>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>

                <div *ngIf="!latestPayslip && !isLoading" class="empty-state">
                  <mat-icon>receipt</mat-icon>
                  <h3>No Payslip Available</h3>
                  <p>Your payslip will be available once payroll is processed.</p>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Payroll Periods Tab (for HR) -->
          <mat-tab label="Payroll Periods" *ngIf="hasHRRole()">
            <div class="tab-content">
              <div class="periods-section">
                <div class="section-header">
                  <h3>Payroll Periods</h3>
                  <button mat-raised-button color="primary" (click)="createPayrollPeriod()">
                    <mat-icon>add</mat-icon>
                    New Period
                  </button>
                </div>

                <div class="periods-table">
                  <mat-table [dataSource]="payrollPeriods" class="payroll-periods-table">
                    
                    <ng-container matColumnDef="periodName">
                      <mat-header-cell *matHeaderCellDef>Period Name</mat-header-cell>
                      <mat-cell *matCellDef="let period">{{ period.periodName }}</mat-cell>
                    </ng-container>

                    <ng-container matColumnDef="dates">
                      <mat-header-cell *matHeaderCellDef>Period Dates</mat-header-cell>
                      <mat-cell *matCellDef="let period">
                        {{ period.startDate | date:'mediumDate' }} - {{ period.endDate | date:'mediumDate' }}
                      </mat-cell>
                    </ng-container>

                    <ng-container matColumnDef="employees">
                      <mat-header-cell *matHeaderCellDef>Employees</mat-header-cell>
                      <mat-cell *matCellDef="let period">{{ period.totalEmployees }}</mat-cell>
                    </ng-container>

                    <ng-container matColumnDef="totalAmount">
                      <mat-header-cell *matHeaderCellDef>Total Amount</mat-header-cell>
                      <mat-cell *matCellDef="let period">{{ period.totalNetAmount | currency }}</mat-cell>
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
                          <button mat-menu-item (click)="calculatePayroll(period.periodId)">
                            <mat-icon>calculate</mat-icon>
                            Calculate
                          </button>
                          <button mat-menu-item (click)="exportPayroll(period)">
                            <mat-icon>download</mat-icon>
                            Export
                          </button>
                        </mat-menu>
                      </mat-cell>
                    </ng-container>

                    <mat-header-row *matHeaderRowDef="periodsDisplayedColumns"></mat-header-row>
                    <mat-row *matRowDef="let row; columns: periodsDisplayedColumns;"></mat-row>
                  </mat-table>
                </div>
              </div>
            </div>
          </mat-tab>

        </mat-tab-group>
      </mat-card>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="60"></mat-spinner>
        <p>Loading payroll data...</p>
      </div>

    </div>
  `,
  styleUrls: ['./payroll-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayrollDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  // Data properties
  currentUser: User | null = null;
  currentPeriod: PayrollPeriod | null = null;
  payrollPeriods: PayrollPeriod[] = [];
  latestPayslip: Payslip | null = null;

  // UI state
  isLoading = false;
  selectedTab = 0;

  // Table configuration
  periodsDisplayedColumns: string[] = ['periodName', 'dates', 'employees', 'totalAmount', 'status', 'actions'];

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUserValue();
  }

  private loadInitialData(): void {
    this.isLoading = true;

    const requests: any[] = [
      this.payrollService.getPayrollPeriods()
    ];

    // Add user-specific requests
    if (this.currentUser) {
      requests.push(this.payrollService.getMyLatestPayslip());
    }

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results: any[]) => {
          this.payrollPeriods = results[0] || [];
          this.currentPeriod = this.payrollPeriods.find(p => p.status === PayrollStatus.DRAFT || p.status === PayrollStatus.CALCULATED) || null;
          
          if (results[1]) {
            this.latestPayslip = results[1];
          }

          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading payroll data:', error);
          this.notificationService.showError('Failed to load payroll data');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  createPayrollPeriod(): void {
    this.notificationService.showInfo('Create payroll period dialog will be implemented');
  }

  calculatePayroll(periodId?: string): void {
    const targetPeriodId = periodId || this.currentPeriod?.periodId;
    if (!targetPeriodId) return;

    this.payrollService.processPayroll({
      payrollPeriodId: targetPeriodId,
      includeAllowances: true,
      includeDeductions: true,
      includeOvertime: true
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Payroll calculated successfully');
          this.loadInitialData();
        },
        error: (error: any) => {
          console.error('Error calculating payroll:', error);
          this.notificationService.showError('Failed to calculate payroll');
        }
      });
  }

  processPayroll(): void {
    if (!this.currentPeriod) return;

    if (confirm('Are you sure you want to process this payroll? This action cannot be undone.')) {
      const request: ProcessPayrollRequest = {
        payrollPeriodId: this.currentPeriod.periodId,
        includeAllowances: true,
        includeDeductions: true,
        includeOvertime: true
      };
      this.payrollService.processPayroll(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Payroll processed successfully');
            this.loadInitialData();
          },
          error: (error) => {
            console.error('Error processing payroll:', error);
            this.notificationService.showError('Failed to process payroll');
          }
        });
    }
  }

  viewPeriodDetails(period: PayrollPeriod): void {
    this.notificationService.showInfo('Period details view will be implemented');
  }

  exportPayroll(period: PayrollPeriod): void {
    const filter: PayrollReportFilter = {
      payrollPeriodId: period.periodId
    };
    this.payrollService.exportPayrollReport(filter, 'excel')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `payroll-${period.periodName}.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.notificationService.showSuccess('Payroll report exported successfully');
        },
        error: (error) => {
          console.error('Export error:', error);
          this.notificationService.showError('Failed to export payroll report');
        }
      });
  }

  downloadPayslip(): void {
    if (!this.latestPayslip) return;

    this.payrollService.downloadPayslip(this.latestPayslip.payslipId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `payslip-${this.latestPayslip!.periodName}.pdf`;
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

  hasHRRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

  getStatusColor(status: PayrollStatus): 'primary' | 'accent' | 'warn' | undefined {
    switch (status) {
      case PayrollStatus.APPROVED:
      case PayrollStatus.PAID:
        return 'primary';
      case PayrollStatus.CALCULATED:
        return 'accent';
      case PayrollStatus.DRAFT:
        return 'warn';
      default:
        return undefined;
    }
  }
}