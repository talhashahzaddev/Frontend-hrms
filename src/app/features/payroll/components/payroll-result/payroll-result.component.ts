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

  get hasActiveFilters(): boolean {
    return !!this.selectedPeriodId || !!this.selectedDepartmentId || !!this.searchTerm;
  }

  applyFilters(): void {
    if (!this.hasActiveFilters) return;
    this.hasAppliedFilters = true;
  }

  clearFilters(): void {
    this.selectedPeriodId = '';
    this.selectedDepartmentId = '';
    this.searchTerm = '';
    this.hasAppliedFilters = false;
  }

  // Dummy data based on stitch_screen.html
  employees = [
    {
      id: 'EMP-001',
      name: 'Alex Mercer',
      department: 'Engineering',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBQFUIEHo1i6y4ApRtgit8cLqHEugl9w0Xoh74haJo7WJ5TNe6-ym246Lm4A2NhC_5r5bbvw155kKYUASUsBsdoZIS-qTCyrnnre_F7KPAzhQx2UCO-BDjeUtxJWnwxj7doGnvzuDSNQHOeH6tiiwtWjVFMXx_6VvSU-w1Jkos8VxWY0qnBWe7RglHzTQ7vwWPfJtSRrQamnTX5lPRtoudFRJ2fanyQTChKcA1BLC0MBNaU3OPnTX3pHrEdx5iqnRTFB_HUhlUUYdxP',
      earnings: {
        basic: 250000,
        ot: 15000,
        perfBonus: 20000,
        bonus: 0,
        gross: 285000
      },
      deductions: {
        attendance: 0,
        late: 1500,
        leave: 0,
        loan: 5000,
        advance: 0,
        pfEmp: 12500,
        tax: 18400,
        total: 37400
      },
      contributions: {
        pfEmployer: 12500,
        gratuity: 8333
      },
      netPayable: 247600
    },
    {
      id: 'EMP-042',
      name: 'Sarah Jenkins',
      department: 'Marketing',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDECXQqQTidp0Xabg7hmaLB3IkxEoI4CQIbxsPeA6hVzjU2GwvJ9k0P2yQY0-kXHTi8n5U6mxJsJGf3MbFDyCBG42h3lAimjyNhEEBJSXi4tQOP8bh8H46l95mf5SzArSe_93qIkUmlEMc5lWTNQG1QH13ysbmDzz14fDq5TFg9V2jb9BfyKM7pVtblVR1Jhe0YwhKgrOg8PquGiCqlWMCZrYpBAmxmB_v2sUiPI-PKN9mX0A4hpAiLFSBMt-UqLMpI0u7uMefQx0pA',
      earnings: {
        basic: 180000,
        ot: 0,
        perfBonus: 10000,
        bonus: 5000,
        gross: 195000
      },
      deductions: {
        attendance: 3000,
        late: 0,
        leave: 0,
        loan: 0,
        advance: 10000,
        pfEmp: 9000,
        tax: 7200,
        total: 29200
      },
      contributions: {
        pfEmployer: 9000,
        gratuity: 6000
      },
      netPayable: 165800
    }
  ];

  totalEmployees = 142;
  totalGrossSalary = 4250000;
  totalDeductions = 620000;
  totalBonuses = 180000;
  totalNetPayable = 3810000;

  constructor(
    private payrollService: PayrollService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
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
