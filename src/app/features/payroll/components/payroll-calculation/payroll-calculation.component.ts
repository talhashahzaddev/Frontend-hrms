import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';

import { PayrollService } from '../../services/payroll.service';
import { EmployeeService } from '../../../../features/employee/services/employee.service';
import { PerformanceService } from '../../../../features/performance/services/performance.service';
import { Department } from '../../../../core/models/employee.models';
import { AppraisalCycle } from '../../../../core/models/performance.models';

@Component({
  selector: 'app-payroll-calculation',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterModule],
  templateUrl: './payroll-calculation.component.html',
  styleUrls: ['./payroll-calculation.component.scss']
})
export class PayrollCalculationComponent implements OnInit {
  // Policy Rules
  overtimeRules: any[] = [];
  attendanceRules: any[] = [];
  lateArrivalRules: any[] = [];
  leaveRules: any[] = [];
  bonusRules: any[] = [];
  appraisalCycles: AppraisalCycle[] = [];
  
  // Selections
  selectedPeriodId: string = '';
  selectedDepartmentId: string = '';
  selectedOvertimeRuleId: string = '';
  selectedAttendanceRuleId: string = '';
  selectedLateArrivalRuleId: string = '';
  selectedLeaveRuleId: string = '';
  selectedBonusRuleId: string = '';
  selectedPerformanceCycleId: string = '';
  
  // Policy Toggles
  enableLoan: boolean = true;
  enableAdvance: boolean = true;
  enablePF: boolean = true;
  enableTax: boolean = true;
  enableGratuity: boolean = false;
  
  isLoading: boolean = false;

  periods: any[] = [];
  departments: Department[] = [];

  constructor(
    private payrollService: PayrollService,
    private employeeService: EmployeeService,
    private performanceService: PerformanceService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading = true;
    
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

    // Load Policy Rules
    this.loadPolicyRules();
  }

  loadPolicyRules(): void {
    // Overtime
    this.payrollService.getOvertimeActiveRules().subscribe({
      next: (data) => this.overtimeRules = this.extractItems(data),
      error: (err) => console.error('Error loading overtime rules', err)
    });

    // Attendance
    this.payrollService.getAttendanceActiveRules().subscribe({
      next: (data) => this.attendanceRules = this.extractItems(data),
      error: (err) => console.error('Error loading attendance rules', err)
    });

    // Late Arrival
    this.payrollService.getLateArrivalActiveRules().subscribe({
      next: (data) => this.lateArrivalRules = this.extractItems(data),
      error: (err) => console.error('Error loading late arrival rules', err)
    });

    // Leave
    this.payrollService.getLeaveActiveRules().subscribe({
      next: (data) => this.leaveRules = this.extractItems(data),
      error: (err) => console.error('Error loading leave rules', err)
    });

    // Bonus
    this.payrollService.getActiveBonusRules().subscribe({
      next: (data) => this.bonusRules = this.extractItems(data),
      error: (err) => console.error('Error loading bonus rules', err)
    });

    // Appraisal Cycles
    this.performanceService.getAppraisalCycles().subscribe({
      next: (response) => {
        if (response.success) {
          this.appraisalCycles = response.data || [];
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading appraisal cycles', err);
        this.isLoading = false;
      }
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
