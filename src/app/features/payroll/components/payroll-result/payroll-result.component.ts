import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

import { take } from 'rxjs';

import { PayrollService } from '../../services/payroll.service';
import { AuthService } from '@core/services/auth.service';
import { EmployeeService } from '../../../../features/employee/services/employee.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { Department } from '../../../../core/models/employee.models';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface PayrollResultRow {
  rowKey: string;
  employeeId: string;
  id: string;
  name: string;
  department: string;
  avatar: string;
  earnings: {
    basic: number;
    ot: number;
    perfBonus: number;
    bonus: number;
    gross: number;
  };
  deductions: {
    attendance: number;
    late: number;
    leave: number;
    loan: number;
    advance: number;
    pfEmp: number;
    tax: number;
    total: number;
  };
  contributions: {
    pfEmployer: number;
    gratuity: number;
  };
  netPayable: number;
  totalBonuses: number;
  detailSections: { title: string; rows: Record<string, unknown>[] }[];
}


@Component({
  selector: 'app-payroll-result',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, RouterModule, MatIconModule, FormsModule],
  templateUrl: './payroll-result.component.html',
  styleUrl: './payroll-result.component.scss'
})
export class PayrollResultComponent implements OnInit {
  private readonly payrollService = inject(PayrollService);
  private readonly employeeService = inject(EmployeeService);
  private readonly settingsService = inject(SettingsService);
  private readonly authService = inject(AuthService);

  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  get canAccessPayrollResults(): boolean {
    return this.hasPermission('payroll_result');
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasPermissionByActionKey(actionKey);
  }

  periods: any[] = [];
  departments: Department[] = [];
  selectedPeriodId: string = '';
  selectedDepartmentId: string = '';
  searchTerm: string = '';
  hasAppliedFilters: boolean = false;

  /** Expanded payroll breakdown row (employeeId). */
  expandedEmployeeId: string | null = null;

  currentPage: number = 1;
  pageSize: number = 10;
  totalRecords: number = 0;
  totalPages: number = 0;
  pageRange: number[] = [];

  get fromRecord(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  get hasActiveFilters(): boolean {
    return !!this.selectedPeriodId || !!this.selectedDepartmentId || !!this.searchTerm;
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.hasAppliedFilters = true;
    this.loadPayrollResults();
  }

  clearFilters(): void {
    this.selectedPeriodId = '';
    this.selectedDepartmentId = '';
    this.searchTerm = '';
    this.hasAppliedFilters = false;
    this.currentPage = 1;
    this.loadPayrollResults();
  }

  employees: PayrollResultRow[] = [];

  totalEmployees = 0;
  totalGrossSalary = 0;
  totalDeductions = 0;
  totalBonuses = 0;
  totalNetPayable = 0;

  ngOnInit(): void {
    if (!this.canAccessPayrollResults) {
      return;
    }
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

    this.loadInitialData();
    this.loadPayrollResults();
  }

  loadInitialData(): void {
    // Load Periods
    this.payrollService.getPayrollPeriods({ page: 1, pageSize: 200 }).subscribe({
      next: (data) => {
        this.periods = this.extractItems(data);
      },
      error: (err) => console.error('Error loading periods', err)
    });

    // Load Active Departments
    this.employeeService.getDepartments(undefined, 'active').subscribe({
      next: (data) => {
        this.departments = this.extractItems(data);
      },
      error: (err) => console.error('Error loading departments', err)
    });
  }

  loadPayrollResults(): void {
    const filter = {
      periodId: this.selectedPeriodId,
      departmentId: this.selectedDepartmentId,
      searchTerm: this.searchTerm,
      page: this.currentPage,
      pageSize: this.pageSize
    };

    this.payrollService.getPayrollResults(filter).subscribe({
      next: (res) => {
        const data = res.data || [];
        this.employees = data.map((item: any) => {
          const employeeId = String(item.employeeId ?? '');
          return {
            rowKey: employeeId,
            employeeId,
            id: item.employeeCode || employeeId,
            name: item.employeeName ?? '',
            department: item.departmentName?.trim() ? item.departmentName : '—',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.employeeName ?? 'User')}&background=random`,
            earnings: {
              basic: Number(item.basicSalary) || 0,
              ot: this.sumJson(item.overtimeDetails, 'totalOvertimeAmount'),
              perfBonus: this.sumJson(item.performanceBonuses, 'bonusAmount'),
              bonus: this.sumJson(item.generalBonuses, 'bonusAmount'),
              gross: (Number(item.basicSalary) || 0) + (Number(item.totalBonuses) || 0)
            },
            deductions: {
              attendance: this.sumJson(item.attendanceDeductions, 'totalDeduction'),
              late: this.sumJson(item.lateAttendanceDeductions, 'totalDeduction'),
              leave: this.sumJson(item.leaveDeductions, 'totalDeduction'),
              loan: this.sumJson(item.loanDeductions, 'installmentAmount'),
              advance: this.sumJson(item.salaryAdvanceDeductions, 'deductedAmount'),
              pfEmp: this.sumJson(item.pfDeductions, 'employeeAmount'),
              tax: this.sumJson(item.taxDeductions, 'monthlyTax'),
              total: Number(item.totalDeductions) || 0
            },
            contributions: {
              pfEmployer: this.sumJson(item.pfDeductions, 'employerAmount'),
              gratuity: this.sumJson(item.gratuity, 'totalAmount', 'gratuityAmount', 'amount')
            },
            netPayable: Number(item.netSalary) || 0,
            totalBonuses: Number(item.totalBonuses) || 0,
            detailSections: this.buildDetailSections(item)
          };
        });

        this.totalRecords = res.totalCount ?? 0;
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
        this.updatePageRange();
        
        // Update summary totals based on the current list (or you might want a separate API for global totals)
        this.updateSummaryTotals();
      },
      error: (err) => console.error('Error loading payroll results', err)
    });
  }

  private updateSummaryTotals(): void {
    this.totalEmployees = this.totalRecords;
    this.totalGrossSalary = this.employees.reduce((s, e) => s + (e.earnings?.gross ?? 0), 0);
    this.totalDeductions = this.employees.reduce((s, e) => s + (e.deductions?.total ?? 0), 0);
    this.totalBonuses = this.employees.reduce((s, e) => s + (e.totalBonuses ?? 0), 0);
    this.totalNetPayable = this.employees.reduce((s, e) => s + (e.netPayable ?? 0), 0);
  }

  toggleDetails(employeeId: string): void {
    this.expandedEmployeeId = this.expandedEmployeeId === employeeId ? null : employeeId;
  }

  isExpanded(employeeId: string): boolean {
    return this.expandedEmployeeId === employeeId;
  }

  /** Parse JSON line-item arrays stored on payroll result rows (handles PascalCase from API). */
  parseJsonArray(jsonString: string | null | undefined): Record<string, unknown>[] {
    if (!jsonString || typeof jsonString !== 'string') return [];
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data)) return [];
      return data.filter(
        (row): row is Record<string, unknown> =>
          row !== null && typeof row === 'object' && !Array.isArray(row)
      );
    } catch {
      return [];
    }
  }

  /**
   * Sum a numeric field across JSON array items. Field match is case-insensitive (API often uses PascalCase).
   */
  private sumJson(jsonString: string | null | undefined, ...fieldNames: string[]): number {
    if (!jsonString) return 0;
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data)) return 0;
      const targets = fieldNames.map((f) => f.toLowerCase());
      return data.reduce((sum: number, item: any) => {
        if (!item || typeof item !== 'object') return sum;
        const key = Object.keys(item).find((k) => targets.includes(k.toLowerCase()));
        if (!key) return sum;
        const raw = item[key];
        const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0);
    } catch {
      return 0;
    }
  }

  private buildDetailSections(item: any): { title: string; rows: Record<string, unknown>[] }[] {
    const sections: { title: string; key: string }[] = [
      { title: 'Overtime', key: 'overtimeDetails' },
      { title: 'Tax', key: 'taxDeductions' },
      { title: 'Provident fund', key: 'pfDeductions' },
      { title: 'Attendance', key: 'attendanceDeductions' },
      { title: 'Late attendance', key: 'lateAttendanceDeductions' },
      { title: 'Leave', key: 'leaveDeductions' },
      { title: 'Loans', key: 'loanDeductions' },
      { title: 'Salary advance', key: 'salaryAdvanceDeductions' },
      { title: 'Performance bonus', key: 'performanceBonuses' },
      { title: 'General bonus', key: 'generalBonuses' },
      { title: 'Gratuity', key: 'gratuity' }
    ];
    return sections
      .map((s) => ({
        title: s.title,
        rows: this.parseJsonArray(item[s.key] as string | null | undefined)
      }))
      .filter((s) => s.rows.length > 0);
  }

  /** Key/value pairs for one breakdown object (stable column order). */
  entriesOf(obj: Record<string, unknown> | null | undefined): [string, unknown][] {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
    return Object.keys(obj)
      .sort((a, b) => a.localeCompare(b))
      .map((k) => [k, (obj as Record<string, unknown>)[k]]);
  }

  formatDetailLabel(key: string): string {
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatDetailValue(val: unknown): string {
    if (val === null || val === undefined || val === '') return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'number' && Number.isFinite(val)) {
      return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    const s = String(val).trim();
    const n = parseFloat(s);
    if (s !== '' && /^-?\d+(\.\d+)?$/.test(s) && Number.isFinite(n)) {
      return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return s;
  }

  updatePageRange(): void {
    const range = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    this.pageRange = range;
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadPayrollResults();
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadPayrollResults();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadPayrollResults();
    }
  }

  private extractItems(data: any): any[] {
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object') {
      if (Array.isArray(data.items)) return data.items;
      if (Array.isArray(data.data)) return data.data;
      if (Array.isArray(data.records)) return data.records;
    }
    return [];
  }
}
