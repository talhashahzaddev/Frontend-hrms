import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';

import { ExpenseService } from '../../services/expense.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  ExpensePieReportItemDto,
  ExpenseLineChartItemDto,
  ExpenseBarChartItemDto
} from '../../../../core/models/expense.models';
import { SettingsService } from '../../../settings/services/settings.service';

type DatePreset = '' | 'this_week' | 'this_month' | '3_month' | '6_month' | 'this_year';

const CATEGORY_COLORS = [
  '#667eea', '#764ba2', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

@Component({
  selector: 'app-expense-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    NgChartsModule
  ],
  templateUrl: './expense-report.component.html',
  styleUrls: ['./expense-report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseReportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private expenseService = inject(ExpenseService);
  private notification = inject(NotificationService);
  private settingsService = inject(SettingsService);
  private cdr = inject(ChangeDetectorRef);

  organizationCurrency = 'USD';
  selectedTabIndex = 0;

  filterForm!: FormGroup;
  monthForm!: FormGroup;
  yearForm!: FormGroup;

  presetOptions: { value: DatePreset; label: string }[] = [
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: '3_month', label: '3 Month' },
    { value: '6_month', label: '6 Month' },
    { value: 'this_year', label: 'This Year' }
  ];

  yearOptions: number[] = [];
  yearsOptions: number[] = [5, 10, 15, 20];

  reportData: ExpensePieReportItemDto[] = [];
  lineChartData: ExpenseLineChartItemDto[] = [];
  barChartData: ExpenseBarChartItemDto[] = [];

  categoryColors: Map<string, string> = new Map();
  isLoadingCategory = false;
  isLoadingMonth = false;
  isLoadingYear = false;

  pieChartType: ChartType = 'pie';
  pieChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [{ data: [], backgroundColor: [], borderColor: '#fff', borderWidth: 1 }]
  };
  pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } }
  };

  lineChartType: ChartType = 'line';
  lineChartDataConfig: ChartConfiguration['data'] = {
    labels: [],
    datasets: [{
      label: 'Cost',
      data: [],
      borderColor: '#667eea',
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };
  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true },
      x: {}
    }
  };

  barChartType: ChartType = 'bar';
  barChartDataConfig: ChartConfiguration['data'] = {
    labels: [],
    datasets: [{
      label: 'Cost',
      data: [],
      backgroundColor: '#667eea'
    }]
  };
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true },
      x: {}
    }
  };

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    this.yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 10 + i);

    this.filterForm = this.fb.group({
      fromDate: [null as Date | null],
      toDate: [null as Date | null],
      preset: ['this_year' as DatePreset],
      claims: [true],
      recurringExpenses: [true]
    });

    this.monthForm = this.fb.group({
      year: [currentYear],
      claims: [true],
      recurringExpenses: [true]
    });

    this.yearForm = this.fb.group({
      years: [5],
      claims: [true],
      recurringExpenses: [true]
    });

    this.applyPreset('this_year');
    this.loadOrganizationCurrency();
    this.loadReport();

    this.filterForm.get('claims')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.cdr.markForCheck());
    this.filterForm.get('recurringExpenses')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.cdr.markForCheck());
    this.monthForm.get('claims')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.cdr.markForCheck());
    this.monthForm.get('recurringExpenses')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.cdr.markForCheck());
    this.yearForm.get('claims')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.cdr.markForCheck());
    this.yearForm.get('recurringExpenses')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.cdr.markForCheck());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOrganizationCurrency(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (currency) => {
          this.organizationCurrency = currency;
          this.cdr.markForCheck();
        },
        error: () => {
          this.organizationCurrency = 'USD';
          this.cdr.markForCheck();
        }
      });
  }

  get fromDate(): Date | null {
    return this.filterForm.get('fromDate')?.value ?? null;
  }

  get toDate(): Date | null {
    return this.filterForm.get('toDate')?.value ?? null;
  }

  get isBothUnchecked(): boolean {
    const claims = this.filterForm.get('claims')?.value === true;
    const recurring = this.filterForm.get('recurringExpenses')?.value === true;
    return !claims && !recurring;
  }

  get isMonthBothUnchecked(): boolean {
    const claims = this.monthForm.get('claims')?.value === true;
    const recurring = this.monthForm.get('recurringExpenses')?.value === true;
    return !claims && !recurring;
  }

  get isYearBothUnchecked(): boolean {
    const claims = this.yearForm.get('claims')?.value === true;
    const recurring = this.yearForm.get('recurringExpenses')?.value === true;
    return !claims && !recurring;
  }

  onPresetChange(): void {
    const preset = this.filterForm.get('preset')?.value as DatePreset;
    if (preset) this.applyPreset(preset);
    this.cdr.markForCheck();
  }

  onDateChange(): void {
    this.cdr.markForCheck();
  }

  private applyPreset(preset: DatePreset): void {
    const now = new Date();
    let from: Date;
    let to: Date = now;
    switch (preset) {
      case 'this_week':
        from = startOfWeek(now, { weekStartsOn: 1 });
        to = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'this_month':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case '3_month':
        from = startOfMonth(subMonths(now, 2));
        to = endOfMonth(now);
        break;
      case '6_month':
        from = startOfMonth(subMonths(now, 4));
        to = endOfMonth(now);
        break;
      case 'this_year':
        from = startOfYear(now);
        to = endOfYear(now);
        break;
      default:
        return;
    }
    this.filterForm.patchValue({ fromDate: from, toDate: to }, { emitEvent: false });
  }

  loadReport(): void {
    const from = this.fromDate;
    const to = this.toDate;
    const claimsChecked = this.filterForm.get('claims')?.value === true;
    const recurringChecked = this.filterForm.get('recurringExpenses')?.value === true;

    const params: {
      fromDate?: string | null;
      toDate?: string | null;
      expense?: boolean;
      recurring?: boolean;
    } = { expense: claimsChecked, recurring: recurringChecked };
    if (from) params.fromDate = from.toISOString().split('T')[0];
    if (to) params.toDate = to.toISOString().split('T')[0];

    this.isLoadingCategory = true;
    this.cdr.markForCheck();

    this.expenseService.getExpensePieReport(params).subscribe({
      next: (data) => {
        this.reportData = data;
        this.assignColors();
        this.updatePieChart();
        this.isLoadingCategory = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notification.showError(err?.error?.message || 'Failed to load expense report');
        this.reportData = [];
        this.updatePieChart();
        this.isLoadingCategory = false;
        this.cdr.markForCheck();
      }
    });
  }

  applyFilters(): void {
    this.loadReport();
  }

  loadLineChart(): void {
    const year = this.monthForm.get('year')?.value ?? new Date().getFullYear();
    const expense = this.monthForm.get('claims')?.value === true;
    const recurring = this.monthForm.get('recurringExpenses')?.value === true;

    this.isLoadingMonth = true;
    this.cdr.markForCheck();

    this.expenseService.getExpenseLineChart({ year, expense, recurring }).subscribe({
      next: (data) => {
        this.lineChartData = data;
        this.updateLineChart();
        this.isLoadingMonth = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notification.showError(err?.error?.message || 'Failed to load monthly report');
        this.lineChartData = [];
        this.updateLineChart();
        this.isLoadingMonth = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadBarChart(): void {
    const years = this.yearForm.get('years')?.value ?? 5;
    const expense = this.yearForm.get('claims')?.value === true;
    const recurring = this.yearForm.get('recurringExpenses')?.value === true;

    this.isLoadingYear = true;
    this.cdr.markForCheck();

    this.expenseService.getExpenseBarChart({ years, expense, recurring }).subscribe({
      next: (data) => {
        this.barChartData = data;
        this.updateBarChart();
        this.isLoadingYear = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notification.showError(err?.error?.message || 'Failed to load yearly report');
        this.barChartData = [];
        this.updateBarChart();
        this.isLoadingYear = false;
        this.cdr.markForCheck();
      }
    });
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    if (index === 1 && this.lineChartData.length === 0 && !this.isLoadingMonth) {
      this.loadLineChart();
    }
    if (index === 2 && this.barChartData.length === 0 && !this.isLoadingYear) {
      this.loadBarChart();
    }
    this.cdr.markForCheck();
  }

  private assignColors(): void {
    this.categoryColors.clear();
    this.reportData.forEach((item, i) => {
      this.categoryColors.set(item.categoryId, CATEGORY_COLORS[i % CATEGORY_COLORS.length]);
    });
  }

  getColor(categoryId: string): string {
    return this.categoryColors.get(categoryId) ?? '#9ca3af';
  }

  get totalCost(): number {
    return this.reportData.reduce((sum, item) => sum + item.totalCost, 0);
  }

  get lineChartTotalCost(): number {
    return this.lineChartData.reduce((sum, item) => sum + item.cost, 0);
  }

  get barChartTotalCost(): number {
    return this.barChartData.reduce((sum, item) => sum + item.cost, 0);
  }

  private updatePieChart(): void {
    const labels = this.reportData.map((d) => d.categoryName);
    const data = this.reportData.map((d) => d.totalCost);
    const colors = this.reportData.map((d) => this.getColor(d.categoryId));
    this.pieChartData = {
      labels,
      datasets: [{ data, backgroundColor: colors, borderColor: '#fff', borderWidth: 1 }]
    };
  }

  private updateLineChart(): void {
    const labels = this.lineChartData.map((d) => d.monthName);
    const data = this.lineChartData.map((d) => d.cost);
    this.lineChartDataConfig = {
      labels,
      datasets: [{
        label: 'Cost',
        data,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  }

  private updateBarChart(): void {
    const labels = this.barChartData.map((d) => String(d.year));
    const data = this.barChartData.map((d) => d.cost);
    this.barChartDataConfig = {
      labels,
      datasets: [{ label: 'Cost', data, backgroundColor: '#667eea' }]
    };
  }
}
