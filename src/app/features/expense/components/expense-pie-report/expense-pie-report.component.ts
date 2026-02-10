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
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';

import { ExpenseService } from '../../services/expense.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ExpensePieReportItemDto } from '../../../../core/models/expense.models';
import { SettingsService } from '../../../settings/services/settings.service';

type DatePreset = '' | 'this_week' | 'this_month' | '3_month' | '6_month' | 'this_year';

const CATEGORY_COLORS = [
  '#667eea', '#764ba2', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

@Component({
  selector: 'app-expense-pie-report',
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
    NgChartsModule
  ],
  templateUrl: './expense-pie-report.component.html',
  styleUrls: ['./expense-pie-report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpensePieReportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private expenseService = inject(ExpenseService);
  private notification = inject(NotificationService);
  private settingsService = inject(SettingsService);
  private cdr = inject(ChangeDetectorRef);

  organizationCurrency = 'USD';

  filterForm!: FormGroup;
  presetOptions: { value: DatePreset; label: string }[] = [
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: '3_month', label: '3 Month' },
    { value: '6_month', label: '6 Month' },
    { value: 'this_year', label: 'This Year' }
  ];

  reportData: ExpensePieReportItemDto[] = [];
  categoryColors: Map<string, string> = new Map();
  isLoading = false;

  pieChartType: ChartType = 'pie';
  pieChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
      borderColor: '#fff',
      borderWidth: 1
    }]
  };
  pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    }
  };

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      fromDate: [null as Date | null],
      toDate: [null as Date | null],
      preset: ['this_year' as DatePreset],
      claims: [true],       // default: Claims selected
      recurringExpenses: [true]  // default: Recurring Expenses selected
    });

    this.applyPreset('this_year');
    this.loadOrganizationCurrency();
    this.loadReport();

    this.filterForm.get('claims')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.cdr.markForCheck());
    this.filterForm.get('recurringExpenses')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.cdr.markForCheck());
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
        from = startOfMonth(subMonths(now, 5));
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
    // When both unchecked: expense=false, recurring=false (API then includes both)
    const expense = claimsChecked;
    const recurring = recurringChecked;

    const params: {
      fromDate?: string | null;
      toDate?: string | null;
      expense?: boolean | null;
      recurring?: boolean | null;
    } = {};
    if (from) params.fromDate = from.toISOString().split('T')[0];
    if (to) params.toDate = to.toISOString().split('T')[0];
    params.expense = expense;
    params.recurring = recurring;

    this.isLoading = true;
    this.cdr.markForCheck();

    this.expenseService.getExpensePieReport(params).subscribe({
      next: (data) => {
        this.reportData = data;
        this.assignColors();
        this.updatePieChart();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.notification.showError(err?.error?.message || 'Failed to load expense report');
        this.reportData = [];
        this.updatePieChart();
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  applyFilters(): void {
    this.loadReport();
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

  private updatePieChart(): void {
    const labels = this.reportData.map((d) => d.categoryName);
    const data = this.reportData.map((d) => d.totalCost);
    const colors = this.reportData.map((d) => this.getColor(d.categoryId));

    this.pieChartData = {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: '#fff',
        borderWidth: 1
      }]
    };
  }
}
