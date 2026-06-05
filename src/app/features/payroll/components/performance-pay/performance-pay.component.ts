import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { PerformanceDialogResult } from '../dialogs/add-performance-pay-dialog/add-performance-pay-dialog.component';
import { DeleteActionDialogComponent } from '../dialogs/delete-action-dialog/delete-action-dialog.component';
import { AddPerformancePayDialogComponent } from '../dialogs/add-performance-pay-dialog/add-performance-pay-dialog.component';
import { PayrollService } from '../../services/payroll.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { take } from 'rxjs';
import { OnInit, inject, signal } from '@angular/core';
import { AuthService } from '@core/services/auth.service';

import { SharedCommonModule } from '@shared/shared-common.module';
interface PerformanceLedgerRow {
  id: any;
  employeeId?: any;
  periodId?: any;
  ruleId?: any;
  employeeName: string;
  initials: string;
  designation: string;
  period: string;
  score: number;
  rating: 'Excellent' | 'Good' | 'Average' | 'Below average';
  amount: number;
  calculatedAt: string;
  avatarTone: string;
}


@Component({
  selector: 'app-performance-pay',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, FormsModule, RouterModule, MatIconModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './performance-pay.component.html',
  styleUrl: './performance-pay.component.scss'
})
export class PerformancePayComponent implements OnInit {
  private readonly payrollService = inject(PayrollService);
  private readonly employeeService = inject(EmployeeService);
  private readonly settingsService = inject(SettingsService);
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);

  // Filter state
  pendingSearch = '';
  pendingPeriod = '';
  pendingRule = '';

  filterSearch = '';
  filterPeriod = '';
  filterRule = '';

  periods: any[] = [];
  performanceRules: any[] = [];

  rows: PerformanceLedgerRow[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;
  employeesList: any[] = [];
  readonly currencySymbol = signal('$');

  ngOnInit(): void {
    if (this.hasPermission('performance_pay_view')) {
      this.loadFilterData();
      this.loadPerformancePays();
      this.loadEmployees();
    }
    
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode: any) => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol(currencyCode));
        },
        error: () => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol());
        }
      });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
  }

  get pageRange(): number[] {
    const delta = 2;
    const current = this.currentPage;
    const total = this.totalPages;
    const start = Math.max(1, current - delta);
    const end   = Math.min(total, current + delta);
    const range: number[] = [];
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }

  get fromRecord(): number {
    return this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  get hasActiveFilters(): boolean {
    return !!(this.pendingSearch || this.pendingPeriod || this.pendingRule);
  }

  get hasAppliedFilters(): boolean {
    return !!(this.filterSearch || this.filterPeriod || this.filterRule);
  }

  get canAccessPayrollBonusArea(): boolean {
    return this.hasPermission('bonus_entry_view') || this.hasPermission('performance_pay_view');
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasPermissionByActionKey(actionKey);
  }

  loadEmployees(): void {
    if (!this.hasPermission('performance_pay_view')) {
      return;
    }
    this.employeeService.getEmployees({ page: 1, pageSize: 100 } as any).subscribe({
      next: (response: any) => {
        this.employeesList = response.employees || [];
      },
      error: (err) => console.error('Error loading employees:', err)
    });
  }

  loadPerformancePays(): void {
    if (!this.hasPermission('performance_pay_view')) {
      return;
    }
    const params: any = {
      page: this.currentPage,
      pageSize: this.pageSize
    };

    if (this.filterSearch) params.employeeName = this.filterSearch;
    if (this.filterPeriod) params.periodId = this.filterPeriod;
    if (this.filterRule) params.ruleId = this.filterRule;

    this.payrollService.getPerformancePays(params).subscribe({
      next: (data: any) => {
        let items: any[] = [];
        if (Array.isArray(data)) {
          items = data;
        } else if (data && Array.isArray(data.items)) {
          items = data.items;
        } else if (data && Array.isArray(data.data)) {
          items = data.data;
        }
        
        this.rows = items.map((item: any) => {
          let rating: PerformanceLedgerRow['rating'] = 'Average';
          if (item.score >= 90) rating = 'Excellent';
          else if (item.score >= 75) rating = 'Good';
          else if (item.score < 50) rating = 'Below average';

          return {
            id: item.performancePayId,
            employeeId: item.employeeId,
            periodId: item.periodId,
            ruleId: item.ruleId,
            employeeName: item.employeeName || 'Unknown Employee',
            initials: this.toInitials(item.employeeName || 'U E'),
            designation: item.designation || 'Employee',
            period: item.periodName || 'N/A',
            score: item.score || 0,
            rating: rating as PerformanceLedgerRow['rating'],
            amount: item.finalAmount || 0,
            calculatedAt: item.calculatedAt ? new Date(item.calculatedAt).toLocaleDateString() : 'N/A',
            avatarTone: this.getRandomAvatarTone()
          };
        });
        
        this.totalRecords = data?.totalCount || this.rows.length;
      },
      error: (err: any) => {
        console.error('Error loading performance pays:', err);
      }
    });
  }

  applyFilters() {
    this.filterSearch = this.pendingSearch;
    this.filterPeriod = this.pendingPeriod;
    this.filterRule = this.pendingRule;
    this.currentPage = 1;
    this.loadPerformancePays();
  }

  clearFilters() {
    this.pendingSearch = '';
    this.pendingPeriod = '';
    this.pendingRule = '';
    this.filterSearch = '';
    this.filterPeriod = '';
    this.filterRule = '';
    this.currentPage = 1;
    this.loadPerformancePays();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.currentPage) return;
    this.currentPage = p;
    this.loadPerformancePays();
  }

  prevPage() { this.goToPage(this.currentPage - 1); }
  nextPage() { this.goToPage(this.currentPage + 1); }

  loadFilterData(): void {
    if (!this.hasPermission('performance_pay_view')) {
      return;
    }
    this.payrollService.getPayrollPeriods().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.periods = data;
        } else if (data && Array.isArray(data.items)) {
          this.periods = data.items;
        } else if (data && Array.isArray(data.data)) {
          this.periods = data.data;
        } else {
          this.periods = [];
        }
      },
      error: (err) => {
        console.error('Error loading periods:', err);
        this.periods = [];
      }
    });

    this.payrollService.getActivePerformanceRules().subscribe({
      next: (data: any) => {
        this.performanceRules = Array.isArray(data) ? data : (data?.items || data?.data || []);
      },
      error: (err) => {
        console.error('Error loading performance rules:', err);
        this.performanceRules = [];
      }
    });
  }

  get totalPayout(): number {
    return this.rows.reduce((sum, row) => sum + row.amount, 0);
  }

  get avgScore(): number {
    if (!this.rows.length) return 0;
    const totalScore = this.rows.reduce((sum, row) => sum + row.score, 0);
    return Number((totalScore / this.rows.length).toFixed(1));
  }

  get topRating(): string {
    const ratingsByPriority: PerformanceLedgerRow['rating'][] = ['Excellent', 'Good', 'Average', 'Below average'];
    return ratingsByPriority.find((rating) => this.rows.some((row) => row.rating === rating)) ?? '-';
  }

  openAddPerformanceDialog(): void {
    if (!this.hasPermission('performance_pay_add')) {
      return;
    }
    const dialogRef = this.dialog.open(AddPerformancePayDialogComponent, {
      width: '480px',
      panelClass: 'performance-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'create',
        employees: this.employeesList.map((e: any) => ({
          id: e.employeeId || e.id,
          name: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.name || 'Unknown',
          designation: e.positionTitle || e.designation || ''
        })),
        periods: this.periods,
        rules: this.performanceRules
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result) return;

      const payload = {
        employeeId: result.employeeId,
        periodId: result.periodId,
        ruleId: result.ruleId ? result.ruleId : null,
        score: result.score,
        finalAmount: result.amount
      };

      this.payrollService.createPerformancePay(payload).subscribe({
        next: () => {
          this.loadPerformancePays();
        },
        error: (err) => console.error('Error creating performance pay:', err)
      });
    });
  }

  openEditPerformanceDialog(row: any): void {
    if (!this.hasPermission('performance_pay_edit')) {
      return;
    }
    const dialogRef = this.dialog.open(AddPerformancePayDialogComponent, {
      width: '480px',
      panelClass: 'performance-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'edit',
        employees: this.employeesList.map((e: any) => ({
          id: e.employeeId || e.id,
          name: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.name || 'Unknown',
          designation: e.positionTitle || e.designation || ''
        })),
        periods: this.periods,
        rules: this.performanceRules,
        initialValue: {
          employeeId: row.employeeId,
          periodId: row.periodId,
          ruleId: row.ruleId,
          score: row.score,
          amount: row.amount
        }
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result) return;

      const payload = {
        ruleId: result.ruleId ? result.ruleId : null,
        score: result.score,
        finalAmount: result.amount
      };

      this.payrollService.updatePerformancePay(row.id, payload).subscribe({
        next: () => {
          this.loadPerformancePays();
        },
        error: (err) => console.error('Error updating performance pay:', err)
      });
    });
  }

  deleteRow(id: string): void {
    this.payrollService.deletePerformancePay(id).subscribe({
      next: () => {
        this.loadPerformancePays();
      },
      error: (err) => console.error('Error deleting performance pay:', err)
    });
  }

  requestDeleteRow(row: any): void {
    if (!this.hasPermission('performance_pay_delete')) {
      return;
    }
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete performance pay',
        message: `Delete performance record for ${row.employeeName}? This action cannot be undone.`,
        confirmText: 'Delete record'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deleteRow(row.id);
      }
    });
  }

  getRandomAvatarTone(): string {
    const tones = ['blue', 'lavender', 'peach', 'gray', 'slate'];
    return tones[Math.floor(Math.random() * tones.length)];
  }

  trackById(_: number, row: any): any {
    return row.id;
  }

  private toInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
