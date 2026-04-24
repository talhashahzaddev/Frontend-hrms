import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { take } from 'rxjs';

import { NotificationService } from '@core/services/notification.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { PayrollService } from '../../services/payroll.service';

interface MySocialTransactionRow {
  id: string;
  periodId: string;
  periodName: string;
  configName: string;
  actualSalary: number;
  salaryCapped: number;
  employeeAmount: number;
  employerAmount: number;
  totalAmount: number;
  requestStatus: string;
  isEnrolled: boolean;
}

interface PeriodOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-my-social-security',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './my-social-security.component.html',
  styleUrl: './my-social-security.component.scss'
})
export class MySocialSecurityComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly settingsService = inject(SettingsService);

  readonly isLoading = signal(true);
  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  transactions: MySocialTransactionRow[] = [];
  periodOptions: PeriodOption[] = [];

  selectedPeriodId = '';
  selectedStatus = 'all';
  searchTerm = '';

  ngOnInit(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode) => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol(currencyCode));
        },
        error: () => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol());
        }
      });

    this.loadMySocialSecurityTransactions();
  }

  goBack(): void {
    this.router.navigate(['/payroll/my-benefits']);
  }

  get visibleTransactions(): MySocialTransactionRow[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.transactions.filter((row) => {
      const matchesPeriod = !this.selectedPeriodId || row.periodId === this.selectedPeriodId;
      if (!matchesPeriod) {
        return false;
      }

      const matchesStatus = this.selectedStatus === 'all' || row.requestStatus === this.selectedStatus;
      if (!matchesStatus) {
        return false;
      }

      if (!search) {
        return true;
      }

      return row.periodName.toLowerCase().includes(search)
        || row.configName.toLowerCase().includes(search)
        || row.requestStatus.toLowerCase().includes(search);
    });
  }

  get totalEmployeeContribution(): number {
    return this.visibleTransactions.reduce((sum, row) => sum + row.employeeAmount, 0);
  }

  get totalEmployerContribution(): number {
    return this.visibleTransactions.reduce((sum, row) => sum + row.employerAmount, 0);
  }

  get totalContribution(): number {
    return this.visibleTransactions.reduce((sum, row) => sum + row.totalAmount, 0);
  }

  get enrolledPeriodsCount(): number {
    return new Set(
      this.visibleTransactions
        .filter((row) => row.isEnrolled)
        .map((row) => row.periodId || row.periodName)
    ).size;
  }

  getStatusClass(status: string): string {
    const normalized = String(status ?? '').trim().toLowerCase();

    if (normalized === 'approved' || normalized === 'deducted' || normalized === 'processed') {
      return 'status-approved';
    }

    if (normalized === 'rejected' || normalized === 'cancelled') {
      return 'status-cancelled';
    }

    return 'status-pending';
  }

  private loadMySocialSecurityTransactions(): void {
    this.isLoading.set(true);

    this.payrollService.getMySocialSecurityTransactions({ page: 1, pageSize: 500 })
      .pipe(take(1))
      .subscribe({
        next: (result: any) => {
          const items = this.extractItems(result);
          const mapped = items.map((item: any, index: number) => this.mapTransaction(item, index));
          this.transactions = this.dedupeTransactions(mapped);
          this.periodOptions = this.buildPeriodOptions(this.transactions);

          if (this.selectedPeriodId && !this.periodOptions.some((period) => period.id === this.selectedPeriodId)) {
            this.selectedPeriodId = '';
          }

          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.transactions = [];
          this.periodOptions = [];
          this.isLoading.set(false);

          if (error?.status !== 404) {
            this.notification.showError('Failed to load your social security records.');
          }
        }
      });
  }

  private mapTransaction(item: any, index: number): MySocialTransactionRow {
    const periodId = String(item.periodId ?? item.period?.id ?? '');
    const periodName = String(item.periodName ?? item.periodLabel ?? item.payrollPeriodName ?? 'Unknown period');

    return {
      id: String(item.id ?? item.socialSecurityTransactionId ?? `social-${index}`),
      periodId: periodId || periodName,
      periodName,
      configName: String(item.configName ?? item.ruleName ?? item.configRuleName ?? 'Social security rule'),
      actualSalary: Number(item.actualSalary ?? 0),
      salaryCapped: Number(item.salaryCapped ?? item.maxSalaryCap ?? 0),
      employeeAmount: Number(item.employeeAmount ?? item.employeeShare ?? 0),
      employerAmount: Number(item.employerAmount ?? item.employerShare ?? 0),
      totalAmount: Number(item.totalAmount ?? item.totalContribution ?? 0),
      requestStatus: String(item.requestStatus ?? 'deducted').toLowerCase(),
      isEnrolled: !!(item.isEnrolled ?? true)
    };
  }

  private dedupeTransactions(rows: MySocialTransactionRow[]): MySocialTransactionRow[] {
    const seen = new Set<string>();
    const output: MySocialTransactionRow[] = [];

    for (const row of rows) {
      const signature = row.id
        ? `id:${row.id}`
        : `sig:${row.periodId}|${row.configName}|${row.actualSalary}|${row.totalAmount}`;

      if (seen.has(signature)) {
        continue;
      }

      seen.add(signature);
      output.push(row);
    }

    return output;
  }

  private buildPeriodOptions(rows: MySocialTransactionRow[]): PeriodOption[] {
    const map = new Map<string, PeriodOption>();

    for (const row of rows) {
      const id = row.periodId || row.periodName;
      if (!id) {
        continue;
      }

      if (!map.has(id)) {
        map.set(id, { id, name: row.periodName || 'Unknown period' });
      }
    }

    return Array.from(map.values());
  }

  private extractItems(result: any): any[] {
    if (Array.isArray(result)) {
      return result;
    }

    if (Array.isArray(result?.items)) {
      return result.items;
    }

    if (Array.isArray(result?.records)) {
      return result.records;
    }

    if (Array.isArray(result?.data)) {
      return result.data;
    }

    if (Array.isArray(result?.Data)) {
      return result.Data;
    }

    return [];
  }
}
