import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { BonusDialogResult } from '../dialogs/add-bonus-dialog/add-bonus-dialog.component';
import { DeleteActionDialogComponent } from '../dialogs/delete-action-dialog/delete-action-dialog.component';
import { AddBonusDialogComponent } from '../dialogs/add-bonus-dialog/add-bonus-dialog.component';
import { PayrollService } from '../../services/payroll.service';
import { OnInit, inject } from '@angular/core';

interface BonusLedgerRow {
  id: number;
  employeeName: string;
  initials: string;
  period: string;
  amount: number;
  type: 'Fixed' | 'Performance' | 'Festival' | 'Referral';
  status: 'Active' | 'Cancelled';
  description: string;
  avatarTone: 'blue' | 'peach' | 'indigo' | 'rose' | 'sky' | 'brown' | 'gray';
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

  rows: BonusLedgerRow[] = [
    {
      id: 1,
      employeeName: 'Ali Hassan',
      initials: 'AH',
      period: 'Mar 2025',
      amount: 30000,
      type: 'Fixed',
      status: 'Active',
      description: 'Q1 retention bonus',
      avatarTone: 'blue'
    },
    {
      id: 2,
      employeeName: 'Sara Ahmed',
      initials: 'SA',
      period: 'Mar 2025',
      amount: 25000,
      type: 'Festival',
      status: 'Active',
      description: 'Eid bonus',
      avatarTone: 'peach'
    },
    {
      id: 3,
      employeeName: 'Usman Khan',
      initials: 'UK',
      period: 'Mar 2025',
      amount: 40000,
      type: 'Performance',
      status: 'Active',
      description: 'Q1 target achieved',
      avatarTone: 'indigo'
    },
    {
      id: 4,
      employeeName: 'Fatima Malik',
      initials: 'FM',
      period: 'Mar 2025',
      amount: 15000,
      type: 'Referral',
      status: 'Active',
      description: 'New hire referral',
      avatarTone: 'rose'
    },
    {
      id: 5,
      employeeName: 'Bilal Raza',
      initials: 'BR',
      period: 'Mar 2025',
      amount: 20000,
      type: 'Festival',
      status: 'Active',
      description: 'Eid bonus',
      avatarTone: 'sky'
    },
    {
      id: 6,
      employeeName: 'Nadia Qureshi',
      initials: 'NQ',
      period: 'Mar 2025',
      amount: 35000,
      type: 'Performance',
      status: 'Active',
      description: 'Sales target 120%',
      avatarTone: 'brown'
    },
    {
      id: 7,
      employeeName: 'Kamran Tariq',
      initials: 'KT',
      period: 'Mar 2025',
      amount: 20000,
      type: 'Fixed',
      status: 'Cancelled',
      description: 'Revoked - resigned',
      avatarTone: 'gray'
    }
  ];

  // Pagination (local for now as per current component state)
  currentPage = 1;
  pageSize = 10;
  totalRecords = 7;

  ngOnInit(): void {
    this.loadFilterData();
    // In a real scenario, we'd loadBonusPays() here
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
    // this.loadBonusPays();
  }

  clearFilters() {
    this.pendingSearch = '';
    this.pendingPeriod = '';
    this.pendingRule = '';
    this.filterSearch = '';
    this.filterPeriod = '';
    this.filterRule = '';
    this.currentPage = 1;
    // this.loadBonusPays();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.currentPage) return;
    this.currentPage = p;
    // this.loadBonusPays();
  }

  prevPage() { this.goToPage(this.currentPage - 1); }
  nextPage() { this.goToPage(this.currentPage + 1); }

  loadFilterData(): void {
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

  get filteredRows(): BonusLedgerRow[] {
    const query = this.filterSearch.trim().toLowerCase();

    return this.rows.filter((row) => {
      const matchesSearch = !query
        || row.employeeName.toLowerCase().includes(query)
        || row.description.toLowerCase().includes(query);
      
      const matchesPeriod = !this.filterPeriod || row.period === this.filterPeriod;
      // In a real app, you'd match the ruleId properly. 
      // This is a placeholder for the mock structure.
      const matchesRule = !this.filterRule || true; 

      return matchesSearch && matchesPeriod && matchesRule;
    });
  }

  get totalPayout(): number {
    return this.rows.reduce((sum, row) => sum + row.amount, 0);
  }

  get activeCount(): number {
    return this.rows.filter((row) => row.status === 'Active').length;
  }

  get cancelledCount(): number {
    return this.rows.filter((row) => row.status === 'Cancelled').length;
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

    dialogRef.afterClosed().subscribe((result: BonusDialogResult | undefined) => {
      if (!result) return;

      const nextId = this.rows.length ? Math.max(...this.rows.map((row) => row.id)) + 1 : 1;
      const initials = this.toInitials(result.employee);

      this.rows = [
        {
          id: nextId,
          employeeName: result.employee,
          initials,
          period: result.payrollPeriod,
          amount: result.amount,
          type: result.type,
          status: result.status,
          description: result.description,
          avatarTone: 'blue'
        },
        ...this.rows
      ];
      this.totalRecords = this.rows.length;
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
          employee: row.employeeName,
          payrollPeriod: row.period,
          type: row.type,
          amount: row.amount,
          status: row.status,
          description: row.description
        }
      }
    });

    dialogRef.afterClosed().subscribe((result: BonusDialogResult | undefined) => {
      if (!result) return;

      this.rows = this.rows.map((existingRow) => {
        if (existingRow.id !== row.id) {
          return existingRow;
        }

        return {
          ...existingRow,
          employeeName: result.employee,
          initials: this.toInitials(result.employee),
          period: result.payrollPeriod,
          amount: result.amount,
          type: result.type,
          status: result.status,
          description: result.description
        };
      });
    });
  }

  deleteRow(id: number): void {
    this.rows = this.rows.filter((row) => row.id !== id);
    this.totalRecords = this.rows.length;
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
        this.deleteRow(row.id);
      }
    });
  }

  trackById(_: number, row: BonusLedgerRow): number {
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
