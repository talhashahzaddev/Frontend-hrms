import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

import { PayrollSummary, PayrollEntry, PayrollStatus } from '../../../../core/models/payroll.models';

@Component({
  selector: 'app-payroll-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <!-- Payroll Dashboard Container -->
    <div class="payroll-dashboard-container">
      
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">
            <mat-icon>account_balance_wallet</mat-icon>
            Payroll Dashboard
          </h1>
          <p class="page-subtitle">Manage payroll processing and view salary information</p>
        </div>
        
        <div class="header-actions">
          <button mat-stroked-button routerLink="/payroll/periods" class="action-btn">
            <mat-icon>calendar_today</mat-icon>
            Payroll Periods
          </button>
          <button mat-flat-button routerLink="/payroll/process" class="process-btn">
            <mat-icon>play_arrow</mat-icon>
            Process Payroll
          </button>
        </div>
      </div>

      <!-- Current Period Summary -->
      <mat-card class="current-period-card" *ngIf="mockCurrentPeriod">
        <mat-card-header>
          <mat-card-title>Current Payroll Period</mat-card-title>
          <mat-card-subtitle>{{ mockCurrentPeriod.payrollPeriod.name }}</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="period-summary-grid">
            <div class="summary-stat">
              <div class="stat-icon primary">
                <mat-icon>groups</mat-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ mockCurrentPeriod.totalEmployees }}</div>
                <div class="stat-label">Employees</div>
              </div>
            </div>
            
            <div class="summary-stat">
              <div class="stat-icon success">
                <mat-icon>payments</mat-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ formatCurrency(mockCurrentPeriod.totalGrossPay) }}</div>
                <div class="stat-label">Gross Pay</div>
              </div>
            </div>
            
            <div class="summary-stat">
              <div class="stat-icon warning">
                <mat-icon>remove_circle</mat-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ formatCurrency(mockCurrentPeriod.totalDeductions) }}</div>
                <div class="stat-label">Deductions</div>
              </div>
            </div>
            
            <div class="summary-stat">
              <div class="stat-icon info">
                <mat-icon>account_balance</mat-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ formatCurrency(mockCurrentPeriod.totalNetPay) }}</div>
                <div class="stat-label">Net Pay</div>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Recent Payroll Entries -->
      <mat-card class="recent-entries-card">
        <mat-card-header>
          <mat-card-title>Recent Payroll Entries</mat-card-title>
          <div class="card-actions">
            <button mat-stroked-button routerLink="/payroll/entries">View All</button>
          </div>
        </mat-card-header>
        
        <mat-card-content>
          <div class="entries-list">
            <div *ngFor="let entry of mockRecentEntries" class="entry-item">
              <div class="employee-info">
                <div class="employee-avatar">
                  <mat-icon>person</mat-icon>
                </div>
                <div class="employee-details">
                  <div class="employee-name">{{ getEmployeeName(entry) }}</div>
                  <div class="employee-number">{{ entry.employee?.employeeNumber }}</div>
                </div>
              </div>
              
              <div class="payroll-info">
                <div class="pay-amount">{{ formatCurrency(entry.netPay) }}</div>
                <div class="pay-period">{{ entry.payrollPeriod?.name }}</div>
              </div>
              
              <div class="entry-status">
                <div [class]="'status-indicator ' + entry.status">
                  {{ entry.status | titlecase }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="empty-state" *ngIf="mockRecentEntries.length === 0">
            <mat-icon>receipt_long</mat-icon>
            <h3>No payroll entries</h3>
            <p>No recent payroll entries found.</p>
            <button mat-flat-button routerLink="/payroll/process">Process Payroll</button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrls: ['./payroll-dashboard.component.scss']
})
export class PayrollDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Mock data for demonstration
  mockCurrentPeriod: PayrollSummary = {
    totalEmployees: 150,
    totalGrossPay: 750000,
    totalDeductions: 125000,
    totalNetPay: 625000,
    averageSalary: 5000,
    payrollPeriod: {
      payrollPeriodId: '1',
      name: 'March 2024',
      startDate: '2024-03-01',
      endDate: '2024-03-31',
      cutoffDate: '2024-03-25',
      payDate: '2024-04-05',
      status: 'processing' as any,
      totalEmployees: 150,
      totalAmount: 625000,
      createdAt: '2024-03-01'
    }
  };

  mockRecentEntries: PayrollEntry[] = [
    {
      payrollEntryId: '1',
      employeeId: '1',
      payrollPeriodId: '1',
      basicSalary: 5000,
      allowances: 1000,
      overtimePay: 500,
      bonuses: 0,
      deductions: 800,
      taxDeductions: 700,
      netPay: 5000,
      status: PayrollStatus.PROCESSED,
      employee: {
        employeeId: '1',
        firstName: 'John',
        lastName: 'Doe',
        employeeNumber: 'EMP001',
        department: 'Engineering'
      },
      payrollPeriod: {
        payrollPeriodId: '1',
        name: 'March 2024',
        startDate: '2024-03-01',
        endDate: '2024-03-31',
        cutoffDate: '2024-03-25',
        payDate: '2024-04-05',
        status: 'processing' as any,
        totalEmployees: 150,
        totalAmount: 625000,
        createdAt: '2024-03-01'
      }
    },
    {
      payrollEntryId: '2',
      employeeId: '2',
      payrollPeriodId: '1',
      basicSalary: 4500,
      allowances: 800,
      overtimePay: 300,
      bonuses: 0,
      deductions: 600,
      taxDeductions: 500,
      netPay: 4500,
      status: PayrollStatus.APPROVED,
      employee: {
        employeeId: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        employeeNumber: 'EMP002',
        department: 'Marketing'
      },
      payrollPeriod: {
        payrollPeriodId: '1',
        name: 'March 2024',
        startDate: '2024-03-01',
        endDate: '2024-03-31',
        cutoffDate: '2024-03-25',
        payDate: '2024-04-05',
        status: 'processing' as any,
        totalEmployees: 150,
        totalAmount: 625000,
        createdAt: '2024-03-01'
      }
    }
  ];

  ngOnInit(): void {
    // Load actual data here
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getEmployeeName(entry: PayrollEntry): string {
    return `${entry.employee?.firstName} ${entry.employee?.lastName}`;
  }
}
