import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { PayrollService, MyPayslipFilterDto, MyPayslipDto, PayrollPeriodDto } from '../../services/payroll.service';
import { AuthService } from '@core/services/auth.service';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-payslips',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, FormsModule, MatIconModule, RouterModule, MatDialogModule, MatSnackBarModule],
  templateUrl: './payslips.component.html',
  styleUrls: ['./payslips.component.scss']
})
export class PayslipsComponent implements OnInit {
  private payrollService = inject(PayrollService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  get canViewMyPayslips(): boolean {
    return this.hasPermission('my_payslip');
  }

  get showComplianceTab(): boolean {
    return this.hasPermission('compliance_payslip_view');
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasPermissionByActionKey(actionKey);
  }

  periods: PayrollPeriodDto[] = [];
  payslips: MyPayslipDto[] = [];
  
  totalCount = 0;
  page = 1;
  pageSize = 10;
  totalPages = 1;
  
  pendingPeriodId: string = '';
  appliedPeriodId: string = '';
  
  isLoading = false;

  get hasActiveFilters(): boolean {
    return this.pendingPeriodId !== this.appliedPeriodId;
  }
  
  get hasAppliedFilters(): boolean {
    return this.appliedPeriodId !== '';
  }

  get fromRecord(): number {
    return this.totalCount === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  get pageRange(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.page - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end > this.totalPages) {
      end = this.totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  ngOnInit(): void {
    if (!this.canViewMyPayslips) {
      return;
    }
    this.loadPeriods();
    this.loadPayslips();
  }

  loadPeriods(): void {
    this.payrollService.getPayrollPeriods({ page: 1, pageSize: 300 })
      .subscribe({
        next: (res: any) => {
          const items = Array.isArray(res) ? res : (res?.data?.data ?? res?.data ?? []);
          this.periods = items
            .map((item: any, index: number) => {
              const id = String(item.periodId ?? item.id ?? '').trim();
              if (!id) return null;
              return {
                id,
                label: String(item.periodName ?? item.name ?? item.label ?? `Period ${index + 1}`)
              };
            })
            .filter((row: any): row is PayrollPeriodDto => !!row);
        },
        error: (err: any) => console.error('Error loading periods', err)
      });
  }

  loadPayslips(): void {
    this.isLoading = true;
    const filter: MyPayslipFilterDto = {
      page: this.page,
      pageSize: this.pageSize
    };

    if (this.appliedPeriodId) {
      filter.periodId = this.appliedPeriodId;
    }

    this.payrollService.getMyPayslips(filter)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res: any) => {
          if (res.success && res.data) {
            this.payslips = res.data.data;
            this.totalCount = res.data.totalCount;
            this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
          }
        },
        error: (err: any) => {
          console.error('Error loading my payslips', err);
          this.snackBar.open('Error loading payslips', 'Close', { duration: 3000 });
        }
      });
  }

  applyFilters(): void {
    this.appliedPeriodId = this.pendingPeriodId;
    this.page = 1;
    this.loadPayslips();
  }

  clearFilters(): void {
    this.pendingPeriodId = '';
    this.appliedPeriodId = '';
    this.page = 1;
    this.loadPayslips();
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadPayslips();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadPayslips();
    }
  }

  goToPage(p: number): void {
    if (this.page !== p && p >= 1 && p <= this.totalPages) {
      this.page = p;
      this.loadPayslips();
    }
  }

  viewPayslip(row: MyPayslipDto): void {
    if (!row.payslipUploadUrl) {
      this.snackBar.open('Payslip document not available yet.', 'Close', { duration: 3000 });
      return;
    }

    const url = row.payslipUploadUrl.startsWith('http') ? row.payslipUploadUrl : `${window.location.origin}${row.payslipUploadUrl}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
