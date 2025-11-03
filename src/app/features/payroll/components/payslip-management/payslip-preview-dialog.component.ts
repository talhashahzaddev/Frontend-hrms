import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PayrollEntry, PayrollPeriod } from '../../../../core/models/payroll.models';

@Component({
  selector: 'app-payslip-preview-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="payslip-preview-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title>
          <mat-icon>receipt_long</mat-icon>
          Payslip Preview
        </h2>
        <button mat-icon-button mat-dialog-close class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="payslip-content">
        <div class="payslip-document">
          <!-- Payslip Header -->
          <div class="payslip-header">
            <div class="company-info">
              <h1>PAYSLIP</h1>
              <p>{{ period?.periodName || 'Payroll Period' }}</p>
            </div>
            <div class="period-info">
              <p><strong>Period:</strong> {{ formatDate(period?.startDate) }} - {{ formatDate(period?.endDate) }}</p>
              <p *ngIf="period?.payDate"><strong>Pay Date:</strong> {{ formatDate(period?.payDate) }}</p>
            </div>
          </div>

          <!-- Employee Information -->
          <div class="employee-section">
            <h3>Employee Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Employee Name:</label>
                <span>{{ entry.employeeName }}</span>
              </div>
              <div class="info-item">
                <label>Employee Code:</label>
                <span>{{ entry.employeeCode }}</span>
              </div>
              <div class="info-item">
                <label>Department:</label>
                <span>{{ entry.department }}</span>
              </div>
            </div>
          </div>

          <!-- Earnings Section -->
          <div class="earnings-section">
            <h3>Earnings</h3>
            <table class="payslip-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Basic Salary</td>
                  <td class="text-right">{{ entry.basicSalary | currency:entry.currency }}</td>
                </tr>
                <tr *ngIf="entry.overtimeAmount > 0">
                  <td>Overtime</td>
                  <td class="text-right">{{ entry.overtimeAmount | currency:entry.currency }}</td>
                </tr>
                <tr *ngIf="entry.bonusAmount > 0">
                  <td>Bonus</td>
                  <td class="text-right">{{ entry.bonusAmount | currency:entry.currency }}</td>
                </tr>
                <tr *ngFor="let allowance of getAllowances()">
                  <td>{{ allowance.name }}</td>
                  <td class="text-right">{{ allowance.amount | currency:entry.currency }}</td>
                </tr>
                <tr *ngIf="getAllowances().length === 0 && hasNoAllowances()">
                  <td colspan="2" class="text-center" style="color: #999; font-style: italic;">No allowances</td>
                </tr>
                <tr class="total-row">
                  <td><strong>Gross Salary</strong></td>
                  <td class="text-right"><strong>{{ entry.grossSalary | currency:entry.currency }}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Deductions Section -->
          <div class="deductions-section">
            <h3>Deductions</h3>
            <table class="payslip-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="entry.taxAmount > 0">
                  <td>Tax</td>
                  <td class="text-right">{{ entry.taxAmount | currency:entry.currency }}</td>
                </tr>
                <tr *ngFor="let deduction of getDeductions()">
                  <td>{{ deduction.name }}</td>
                  <td class="text-right">{{ deduction.amount | currency:entry.currency }}</td>
                </tr>
                <tr *ngIf="entry.otherDeductions > 0">
                  <td>Other Deductions</td>
                  <td class="text-right">{{ entry.otherDeductions | currency:entry.currency }}</td>
                </tr>
                <tr class="total-row">
                  <td><strong>Total Deductions</strong></td>
                  <td class="text-right"><strong>{{ getTotalDeductions() | currency:entry.currency }}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Net Salary Section -->
          <div class="net-salary-section">
            <div class="net-salary-box">
              <div class="net-label">Net Salary</div>
              <div class="net-amount">{{ entry.netSalary | currency:entry.currency }}</div>
            </div>
          </div>

          <!-- Footer -->
          <div class="payslip-footer">
            <p *ngIf="entry.calculatedAt">
              <strong>Calculated on:</strong> {{ formatDateTime(entry.calculatedAt) }}
            </p>
            <p *ngIf="entry.paidAt">
              <strong>Paid on:</strong> {{ formatDateTime(entry.paidAt) }}
            </p>
            <p class="status-badge" [class]="'status-' + entry.status">
              Status: {{ entry.status | titlecase }}
            </p>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="downloadPayslip()">
          <mat-icon>download</mat-icon>
          Download PDF
        </button>
        <button mat-raised-button color="primary" mat-dialog-close>
          Close
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .payslip-preview-dialog {
      width: 800px;
      max-width: 90vw;
      max-height: 90vh;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e0e0e0;

      h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 24px;
        font-weight: 600;
        color: #1976d2;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
        }
      }

      .close-button {
        color: #666;
      }
    }

    .payslip-content {
      padding: 0;
      max-height: 70vh;
      overflow-y: auto;
    }

    .payslip-document {
      padding: 32px;
      background: white;
    }

    .payslip-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 2px solid #1976d2;
      margin-bottom: 24px;

      .company-info {
        h1 {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: 700;
          color: #1976d2;
        }

        p {
          margin: 0;
          font-size: 16px;
          color: #666;
          font-weight: 500;
        }
      }

      .period-info {
        text-align: right;

        p {
          margin: 4px 0;
          font-size: 14px;
          color: #333;

          strong {
            color: #1976d2;
          }
        }
      }
    }

    .employee-section,
    .earnings-section,
    .deductions-section {
      margin-bottom: 24px;

      h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
        padding-bottom: 8px;
        border-bottom: 1px solid #e0e0e0;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        
        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;

          label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 500;
          }

          span {
            font-size: 16px;
            color: #333;
            font-weight: 500;
          }
        }
      }
    }

    .payslip-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;

      thead {
        background: #f5f5f5;

        th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #e0e0e0;

          &.text-right {
            text-align: right;
          }
        }
      }

      tbody {
        tr {
          border-bottom: 1px solid #f0f0f0;

          &:hover {
            background: #f9f9f9;
          }

          td {
            padding: 12px;
            color: #333;

            &.text-right {
              text-align: right;
              font-weight: 500;
            }
          }

          &.total-row {
            background: #f5f5f5;
            font-weight: 600;

            td {
              padding: 16px 12px;
              border-top: 2px solid #e0e0e0;
            }
          }
        }
      }
    }

    .net-salary-section {
      margin: 32px 0;
      display: flex;
      justify-content: center;

      .net-salary-box {
        background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
        color: white;
        padding: 24px 48px;
        border-radius: 8px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);

        .net-label {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          opacity: 0.9;
        }

        .net-amount {
          font-size: 32px;
          font-weight: 700;
        }
      }
    }

    .payslip-footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
      text-align: center;

      p {
        margin: 8px 0;
        font-size: 14px;
        color: #666;

        strong {
          color: #333;
        }
      }

      .status-badge {
        display: inline-block;
        padding: 6px 16px;
        border-radius: 16px;
        font-weight: 500;
        margin-top: 12px;

        &.status-paid {
          background: #4caf50;
          color: white;
        }

        &.status-approved {
          background: #2196f3;
          color: white;
        }

        &.status-calculated {
          background: #ff9800;
          color: white;
        }

        &.status-draft {
          background: #9e9e9e;
          color: white;
        }
      }
    }

    mat-dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      gap: 12px;

      button {
        mat-icon {
          margin-right: 8px;
        }
      }
    }
  `]
})
export class PayslipPreviewDialogComponent {
  entry: PayrollEntry;
  period?: PayrollPeriod;
  onDownload?: () => void;

  constructor(
    public dialogRef: MatDialogRef<PayslipPreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { entry: PayrollEntry; period?: PayrollPeriod; onDownload?: () => void }
  ) {
    this.entry = data.entry;
    this.period = data.period;
    this.onDownload = data.onDownload;
  }

  getAllowances(): Array<{ name: string; amount: number }> {
    if (!this.entry.allowances) return [];
    return Object.entries(this.entry.allowances)
      .map(([name, amount]) => ({ 
        name, 
        amount: typeof amount === 'number' ? amount : (typeof amount === 'string' ? parseFloat(amount) || 0 : 0) 
      }))
      .filter(item => item.amount > 0); // Only show allowances with positive amounts
  }

  hasNoAllowances(): boolean {
    return !this.entry.allowances || Object.keys(this.entry.allowances).length === 0;
  }

  getDeductions(): Array<{ name: string; amount: number }> {
    if (!this.entry.deductions) return [];
    return Object.entries(this.entry.deductions)
      .map(([name, amount]) => ({ 
        name, 
        amount: typeof amount === 'number' ? amount : (typeof amount === 'string' ? parseFloat(amount) || 0 : 0) 
      }))
      .filter(item => item.amount > 0); // Only show deductions with positive amounts
  }

  getTotalDeductions(): number {
    const deductions = this.getDeductions().reduce((sum, d) => sum + d.amount, 0);
    return deductions + this.entry.taxAmount + this.entry.otherDeductions;
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatDateTime(dateString?: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  downloadPayslip(): void {
    if (this.onDownload) {
      this.onDownload();
    }
  }
}

