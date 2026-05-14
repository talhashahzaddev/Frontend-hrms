import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { SettingsService } from '../../../settings/services/settings.service';
import { PayrollService } from '../../services/payroll.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { NotificationService } from '@core/services/notification.service';
import { take } from 'rxjs';
import { AddTaxEntryDialogComponent, AddTaxEntryDialogPayload } from '../dialogs/add-tax-entry/add-tax-entry.component';

interface TaxLedgerRow {
  id: string;
  employeeId: string;
  employeeName: string;
  taxableIncome: number;
  taxAmount: number;
  paidAmount: number;
  balance: number;
  period: string;
  status: 'fully_paid' | 'partially_paid' | 'unpaid';
}

@Component({
  selector: 'app-tax-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './tax-ledger.component.html',
  styleUrl: './tax-ledger.component.scss'
})
export class TaxLedgerComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly payrollService = inject(PayrollService);
  private readonly employeeService = inject(EmployeeService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  searchTerm = '';
  periodId = '';
  categoryId = '';

  periods: any[] = [];
  categories: any[] = [];
  employees: any[] = [];

  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  loading = false;

  taxLedgerRows: any[] = [];

  ngOnInit(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode: unknown) => {
          const code = typeof currencyCode === 'string' ? currencyCode : undefined;
          this.currencySymbol.set(this.settingsService.getCurrencySymbol(code));
        },
        error: () => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol());
        }
      });

    this.loadFilterData();
    this.loadTaxTransactions();
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.employeeService.getEmployees({ page: 1, pageSize: 500 }).subscribe({
      next: (res) => {
        this.employees = res?.employees || [];
      },
      error: (err) => console.error('Failed to load employees', err)
    });
  }

  loadFilterData(): void {
    this.payrollService.getPayrollPeriods({ page: 1, pageSize: 100 })
      .subscribe({
        next: (res) => {
          this.periods = this.extractItems(res)
            .map((item, index) => this.mapPeriodOption(item, index));
        },
        error: (err) => console.error('Failed to load periods', err)
      });

    this.payrollService.getActiveTaxCategories()
      .subscribe({
        next: (res) => {
          this.categories = (res || [])
            .map((item: any, index: number) => ({
              id: item?.categoryId ?? item?.id ?? `cat-${index}`,
              name: item?.categoryName ?? item?.name ?? 'Category'
            }));
        },
        error: (err) => console.error('Failed to load tax categories', err)
      });
  }

  loadTaxTransactions(): void {
    this.loading = true;
    const params = {
      page: this.currentPage,
      pageSize: this.pageSize,
      employeeName: this.searchTerm,
      periodId: this.periodId,
      categoryId: this.categoryId
    };

    // Filter out empty params
    const cleanParams = Object.entries(params)
      .filter(([_, v]) => v != null && v !== '')
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

    this.payrollService.getTaxTransactions(cleanParams)
      .subscribe({
        next: (res: any) => {
          this.taxLedgerRows = this.extractItems(res);
          this.totalCount = res?.totalCount ?? this.taxLedgerRows.length;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load tax transactions', err);
          this.loading = false;
        }
      });
  }

  private extractItems(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.records)) return data.records;
    return [];
  }

  private mapPeriodOption(item: any, index: number): { id: string, name: string } {
    const id = String(item?.periodId ?? item?.id ?? `period-${index + 1}`).trim();
    const name = String(item?.periodName ?? item?.name ?? '').trim();
    return { id, name };
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pageRange(): number[] {
    const range = [];
    const maxPagesToShow = 5;
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(this.totalPages, start + maxPagesToShow - 1);
    
    if (end - start + 1 < maxPagesToShow) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  }

  get fromRecord(): number {
    return this.totalCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalCount);
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadTaxTransactions();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.periodId = '';
    this.categoryId = '';
    this.currentPage = 1;
    this.loadTaxTransactions();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadTaxTransactions();
    }
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  openAddTaxEntryDialog(): void {
    const dialogRef = this.dialog.open(AddTaxEntryDialogComponent, {
      width: '620px',
      panelClass: 'add-tax-entry-dialog-panel',
      data: {
        employees: this.employees,
        periods: this.periods,
        categories: this.categories
      }
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe((result: AddTaxEntryDialogPayload | undefined) => {
      if (result) {
        this.payrollService.createTaxTransaction(result).subscribe({
          next: () => {
            this.notificationService.success('Tax entry added successfully');
            this.loadTaxTransactions();
          },
          error: (err) => {
            console.error('Failed to add tax entry', err);
            this.notificationService.error(err.message || 'Failed to add tax entry');
          }
        });
      }
    });
  }

  // Summary counts (Note: These reflect the current page only if the API doesn't provide global totals)
  get totalGrossIncomeAmount(): number {
    return this.taxLedgerRows.reduce((sum, row) => sum + (row.grossIncome || 0), 0);
  }

  get totalTaxableIncomeAmount(): number {
    return this.taxLedgerRows.reduce((sum, row) => sum + (row.taxableIncome || 0), 0);
  }

  get totalTaxAmount(): number {
    return this.taxLedgerRows.reduce((sum, row) => sum + (row.taxAmount || 0), 0);
  }

  get activeProfilesCount(): number {
    return this.totalCount;
  }
}
