import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

import { PayrollService } from '../../services/payroll.service';
import { EmployeeService } from '../../../../features/employee/services/employee.service';
import { Department } from '../../../../core/models/employee.models';

@Component({
  selector: 'app-payroll-result',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, FormsModule],
  templateUrl: './payroll-result.component.html',
  styleUrl: './payroll-result.component.scss'
})
export class PayrollResultComponent implements OnInit {
  periods: any[] = [];
  departments: Department[] = [];
  selectedPeriodId: string = '';
  selectedDepartmentId: string = '';
  searchTerm: string = '';
  hasAppliedFilters: boolean = false;

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

  employees: any[] = [];

  totalEmployees = 0;
  totalGrossSalary = 0;
  totalDeductions = 0;
  totalBonuses = 0;
  totalNetPayable = 0;

  constructor(
    private payrollService: PayrollService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
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
        this.employees = data.map((item: any) => ({
          id: item.employeeCode || item.employeeId,
          name: item.employeeName,
          department: item.departmentName,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.employeeName)}&background=random`,
          earnings: {
            basic: item.basicSalary,
            ot: this.sumJson(item.overtimeDetails, 'totalOvertimeAmount'),
            perfBonus: this.sumJson(item.performanceBonuses, 'bonusAmount'),
            bonus: this.sumJson(item.generalBonuses, 'bonusAmount'),
            gross: item.basicSalary + item.totalBonuses
          },
          deductions: {
            attendance: this.sumJson(item.attendanceDeductions, 'totalDeduction'),
            late: this.sumJson(item.lateAttendanceDeductions, 'totalDeduction'),
            leave: this.sumJson(item.leaveDeductions, 'totalDeduction'),
            loan: this.sumJson(item.loanDeductions, 'installmentAmount'),
            advance: this.sumJson(item.salaryAdvanceDeductions, 'deductedAmount'),
            pfEmp: this.sumJson(item.pfDeductions, 'employeeAmount'),
            tax: this.sumJson(item.taxDeductions, 'monthlyTax'),
            total: item.totalDeductions
          },
          contributions: {
            pfEmployer: this.sumJson(item.pfDeductions, 'employerAmount'),
            gratuity: this.sumJson(item.gratuity, 'gratuityAmount')
          },
          netPayable: item.netSalary
        }));

        this.totalRecords = res.totalCount;
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
        this.updatePageRange();
        
        // Update summary totals based on the current list (or you might want a separate API for global totals)
        this.updateSummaryTotals();
      },
      error: (err) => console.error('Error loading payroll results', err)
    });
  }

  private updateSummaryTotals(): void {
    // This only updates for the current page. For global totals, the API should ideally return them.
    this.totalEmployees = this.totalRecords;
    // We don't have global sums from the current paginated API yet, so we'll leave these as placeholders 
    // or calculate if the API is updated.
  }

  private sumJson(jsonString: string | null, field: string): number {
    if (!jsonString) return 0;
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data)) return 0;
      return data.reduce((sum: number, item: any) => sum + (item[field] || 0), 0);
    } catch (e) {
      return 0;
    }
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
