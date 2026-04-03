import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { DeleteActionDialogComponent } from '../dialogs/delete-action-dialog/delete-action-dialog.component';
import { AddBonusDialogComponent } from '../dialogs/add-bonus-dialog/add-bonus-dialog.component';
import { PayrollService } from '../../services/payroll.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { take } from 'rxjs';
import { OnInit, inject, signal } from '@angular/core';

interface BonusLedgerRow {
  id: string;
  employeeId: string;
  employeeName: string;
  initials: string;
  period: string;
  periodId: string;
  ruleId?: string;
  amount: number;
  description: string;
  avatarTone: string;
}

@Component({
  selector: 'app-bonus-pay',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './bonus-pay.component.html',
  styleUrl: './bonus-pay.component.scss'
})
export class BonusPayComponent implements OnInit {
  private readonly payrollService = inject(PayrollService);
  private readonly settingsService = inject(SettingsService);
  private readonly dialog = inject(MatDialog);

  // Filter state
  pendingSearch = '';
  pendingPeriod = '';
  pendingRule = '';

  filterSearch = '';
  filterPeriod = '';
  filterRule = '';

  periods: any[] = [];
  bonusRules: any[] = [];

  rows: BonusLedgerRow[] = [];
  isLoading = false;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;
  readonly currencySymbol = signal('$');

  ngOnInit(): void {
    this.loadFilterData();
    this.loadBonusEntries();

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

  applyFilters() {
    this.filterSearch = this.pendingSearch;
    this.filterPeriod = this.pendingPeriod;
    this.filterRule = this.pendingRule;
    this.currentPage = 1;
    this.loadBonusEntries();
  }

  clearFilters() {
    this.pendingSearch = '';
    this.pendingPeriod = '';
    this.pendingRule = '';
    this.filterSearch = '';
    this.filterPeriod = '';
    this.filterRule = '';
    this.currentPage = 1;
    this.loadBonusEntries();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.currentPage) return;
    this.currentPage = p;
    this.loadBonusEntries();
  }

  prevPage() { this.goToPage(this.currentPage - 1); }
  nextPage() { this.goToPage(this.currentPage + 1); }

  loadFilterData(): void {
    this.payrollService.getPayrollPeriods().subscribe({
      next: (data: any) => {
        this.periods = Array.isArray(data) ? data : (data?.items || data?.data || []);
      },
      error: (err: any) => {
        console.error('Error loading periods:', err);
        this.periods = [];
      }
    });

    this.payrollService.getActiveBonusRules().subscribe({
      next: (data: any) => {
        this.bonusRules = Array.isArray(data) ? data : (data?.items || data?.data || []);
      },
      error: (err: any) => {
        console.error('Error loading bonus rules:', err);
        this.bonusRules = [];
      }
    });
  }

  loadBonusEntries(): void {
    this.isLoading = true;
    const params = {
      employeeName: this.filterSearch,
      periodId: this.filterPeriod,
      ruleId: this.filterRule,
      page: this.currentPage,
      pageSize: this.pageSize
    };

    this.payrollService.getBonusEntries(params).subscribe({
      next: (data: any) => {
        const items = data.items || data.data || [];
        this.rows = items.map((item: any) => ({
          id: item.bonusId,
          employeeId: item.employeeId,
          employeeName: item.employeeName,
          initials: this.toInitials(item.employeeName),
          period: item.periodName,
          periodId: item.periodId,
          ruleId: item.ruleId,
          amount: item.bonusAmount,
          description: item.ruleDescription,
          avatarTone: this.getAvatarTone(item.employeeName)
        }));
        this.totalRecords = data.totalCount || items.length;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading bonus entries:', err);
        this.isLoading = false;
      }
    });
  }

  get totalPayout(): number {
    return this.rows.reduce((sum, row) => sum + row.amount, 0);
  }

  get averageBonus(): number {
    if (!this.rows.length) return 0;
    return Math.round(this.totalPayout / this.rows.length);
  }

  openAddBonusDialog(): void {
    const dialogRef = this.dialog.open(AddBonusDialogComponent, {
      width: '480px',
      panelClass: 'bonus-dialog-panel',
      autoFocus: false,
      restoreFocus: false
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.loadBonusEntries();
      }
    });
  }

  openEditBonusDialog(row: BonusLedgerRow): void {
    const dialogRef = this.dialog.open(AddBonusDialogComponent, {
      width: '480px',
      panelClass: 'bonus-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'edit',
        initialValue: {
          bonusId: row.id,
          employeeId: row.employeeId,
          periodId: row.periodId,
          ruleId: row.ruleId,
          amount: row.amount
        }
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.loadBonusEntries();
      }
    });
  }

  requestDeleteRow(row: BonusLedgerRow): void {
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete bonus record',
        message: `Delete bonus record for ${row.employeeName}? This action cannot be undone.`,
        confirmText: 'Delete record'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.payrollService.deleteBonusEntry(row.id).subscribe({
          next: () => this.loadBonusEntries(),
          error: (err) => console.error('Error deleting bonus entry:', err)
        });
      }
    });
  }

  trackById(_: number, row: BonusLedgerRow): string {
    return row.id;
  }

  private toInitials(name: string): string {
    if (!name) return '??';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  private getAvatarTone(name: string): string {
    const tones = ['blue', 'peach', 'indigo', 'rose', 'sky', 'brown', 'gray'];
    const index = name.length % tones.length;
    return tones[index];
  }
}
