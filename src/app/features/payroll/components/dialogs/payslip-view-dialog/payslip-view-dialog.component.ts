import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface PayslipViewValueItem {
  label: string;
  amount: number;
  tone?: 'default' | 'primary' | 'danger' | 'success';
}

export interface PayslipAttendanceSummary {
  scheduledDays: number;
  presentDays: number;
  absentDays: number;
  lateCount: number;
  overtimeHours: number;
}

export interface PayslipYtdSummary {
  grossPkr: number;
  taxPkr: number;
  netPkr: number;
}

export interface PayslipViewDialogData {
  payslipId: string;
  title: string;
  currencySymbol: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  departmentName: string;
  joiningDate: string | null;
  bankName: string;
  bankAccountNo: string;
  initials: string;
  earnings: PayslipViewValueItem[];
  deductions: PayslipViewValueItem[];
  attendance: PayslipAttendanceSummary;
  employerContributions: PayslipViewValueItem[];
  ytd: PayslipYtdSummary;
  netPayablePkr: number;
}


@Component({
  selector: 'app-payslip-view-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedCommonModule,CommonModule, MatDialogModule, MatIconModule],
  templateUrl: './payslip-view-dialog.component.html',
  styleUrl: './payslip-view-dialog.component.scss'
})
export class PayslipViewDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<PayslipViewDialogComponent, { action: 'close' | 'download' } | undefined>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: PayslipViewDialogData) {}

  get totalEarnings(): number {
    return this.data.earnings.reduce((sum, row) => sum + this.toNumber(row.amount), 0);
  }

  get totalDeductions(): number {
    return this.data.deductions.reduce((sum, row) => sum + this.toNumber(row.amount), 0);
  }

  close(): void {
    this.dialogRef.close({ action: 'close' });
  }

  requestDownload(): void {
    this.dialogRef.close({ action: 'download' });
  }

  formatMoney(value: number): string {
    return `${this.data.currencySymbol} ${Math.max(0, this.toNumber(value)).toLocaleString()}`;
  }

  toneClass(tone?: PayslipViewValueItem['tone']): string {
    if (tone === 'danger') return 'tone-danger';
    if (tone === 'primary') return 'tone-primary';
    if (tone === 'success') return 'tone-success';
    return 'tone-default';
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
