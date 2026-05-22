import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';

import { CalculatePayrollPayload, PayrollService } from '../../services/payroll.service';
import { EmployeeService } from '../../../../features/employee/services/employee.service';
import { PerformanceService } from '../../../../features/performance/services/performance.service';
import { Department } from '../../../../core/models/employee.models';
import { AppraisalCycle } from '../../../../core/models/performance.models';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-payroll-calculation',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterModule],
  templateUrl: './payroll-calculation.component.html',
  styleUrls: ['./payroll-calculation.component.scss']
})
export class PayrollCalculationComponent implements OnInit {
  private readonly authService = inject(AuthService);

  get canAccessPayrollCalculation(): boolean {
    return this.hasPermission('payroll_calculation');
  }

  get canAccessPayrollResults(): boolean {
    return this.hasPermission('payroll_result');
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasPermissionByActionKey(actionKey);
  }

  attendanceRules: any[] = [];
  lateArrivalRules: any[] = [];
  leaveRules: any[] = [];
  bonusRules: any[] = [];
  appraisalCycles: AppraisalCycle[] = [];

  // Selections (only used when matching module is enabled)
  selectedPeriodId: string = '';
  selectedDepartmentId: string = '';
  selectedAttendanceRuleId: string = '';
  selectedLateArrivalRuleId: string = '';
  selectedLeaveRuleId: string = '';
  selectedBonusRuleId: string = '';
  selectedPerformanceCycleId: string = '';

  // Module toggles (align with CalculatePayrollDto flags)
  enableOvertime: boolean = false;
  enableAttendance: boolean = false;
  enableLateArrival: boolean = false;
  enableLeave: boolean = false;
  enablePerformance: boolean = false;
  enableBonus: boolean = false;
  enableLoan: boolean = true;
  enableAdvance: boolean = true;
  enablePF: boolean = true;
  enableTax: boolean = true;
  enableGratuity: boolean = false;
  enableSocialSecurity: boolean = true;

  isLoading: boolean = false;
  isCalculating: boolean = false;
  calculationResult: any | null = null;
  errorMessage: string = '';
  successMessage: string = '';

  periods: any[] = [];
  departments: Department[] = [];

  constructor(
    private payrollService: PayrollService,
    private employeeService: EmployeeService,
    private performanceService: PerformanceService
  ) {}

  ngOnInit(): void {
    if (!this.canAccessPayrollCalculation) {
      return;
    }
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading = true;

    this.payrollService.getPayrollPeriods({ page: 1, pageSize: 200 }).subscribe({
      next: (data) => {
        this.periods = this.extractItems(data);
      },
      error: (err) => console.error('Error loading periods', err)
    });

    this.employeeService.getDepartments(undefined, 'active').subscribe({
      next: (data) => {
        this.departments = this.extractItems(data);
      },
      error: (err) => console.error('Error loading departments', err)
    });

    this.loadPolicyRules();
  }

  loadPolicyRules(): void {
    this.payrollService.getAttendanceActiveRules().subscribe({
      next: (data) => (this.attendanceRules = this.extractItems(data)),
      error: (err) => console.error('Error loading attendance rules', err)
    });

    this.payrollService.getLateArrivalActiveRules().subscribe({
      next: (data) => (this.lateArrivalRules = this.extractItems(data)),
      error: (err) => console.error('Error loading late arrival rules', err)
    });

    this.payrollService.getLeaveActiveRules().subscribe({
      next: (data) => (this.leaveRules = this.extractItems(data)),
      error: (err) => console.error('Error loading leave rules', err)
    });

    this.payrollService.getActiveBonusRules().subscribe({
      next: (data) => (this.bonusRules = this.extractItems(data)),
      error: (err) => console.error('Error loading bonus rules', err)
    });

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

  /** True when payroll period is set and every enabled module that has options has a selection. */
  canCalculatePayroll(): boolean {
    if (!this.selectedPeriodId?.trim()) {
      return false;
    }
    if (this.enableAttendance && this.attendanceRules.length > 0 && !this.selectedAttendanceRuleId) {
      return false;
    }
    if (this.enableLateArrival && this.lateArrivalRules.length > 0 && !this.selectedLateArrivalRuleId) {
      return false;
    }
    if (this.enableLeave && this.leaveRules.length > 0 && !this.selectedLeaveRuleId) {
      return false;
    }
    if (this.enablePerformance && this.appraisalCycles.length > 0 && !this.selectedPerformanceCycleId) {
      return false;
    }
    if (this.enableBonus && this.bonusRules.length > 0 && !this.selectedBonusRuleId) {
      return false;
    }
    return true;
  }

  setAttendanceEnabled(enabled: boolean): void {
    this.enableAttendance = enabled;
    if (!enabled) {
      this.selectedAttendanceRuleId = '';
    }
  }

  setLateArrivalEnabled(enabled: boolean): void {
    this.enableLateArrival = enabled;
    if (!enabled) {
      this.selectedLateArrivalRuleId = '';
    }
  }

  setLeaveEnabled(enabled: boolean): void {
    this.enableLeave = enabled;
    if (!enabled) {
      this.selectedLeaveRuleId = '';
    }
  }

  setPerformanceEnabled(enabled: boolean): void {
    this.enablePerformance = enabled;
    if (!enabled) {
      this.selectedPerformanceCycleId = '';
    }
  }

  setBonusEnabled(enabled: boolean): void {
    this.enableBonus = enabled;
    if (!enabled) {
      this.selectedBonusRuleId = '';
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

  calculatePayroll(): void {
    if (!this.canAccessPayrollCalculation) {
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';
    this.calculationResult = null;

    if (!this.selectedPeriodId) {
      this.errorMessage = 'Please select a payroll period before calculation.';
      return;
    }
    if (!this.canCalculatePayroll()) {
      this.errorMessage = 'Enable each module you need and select a rule or cycle where required.';
      return;
    }

    const payload: CalculatePayrollPayload = {
      periodId: this.selectedPeriodId,
      cycleId: this.enablePerformance ? this.normalizeGuid(this.selectedPerformanceCycleId) ?? undefined : undefined,
      bonusRuleId:
        this.enableBonus && this.selectedBonusRuleId
          ? this.normalizeGuid(this.selectedBonusRuleId) ?? undefined
          : undefined,
      attendanceRuleId:
        this.enableAttendance && this.selectedAttendanceRuleId
          ? this.normalizeGuid(this.selectedAttendanceRuleId) ?? undefined
          : undefined,
      lateAttendanceRuleId:
        this.enableLateArrival && this.selectedLateArrivalRuleId
          ? this.normalizeGuid(this.selectedLateArrivalRuleId) ?? undefined
          : undefined,
      leaveRuleId:
        this.enableLeave && this.selectedLeaveRuleId
          ? this.normalizeGuid(this.selectedLeaveRuleId) ?? undefined
          : undefined,
      applyOvertime: this.enableOvertime,
      applyAttendanceRule: this.enableAttendance,
      applyLateAttendanceRule: this.enableLateArrival,
      applyLeaveRule: this.enableLeave,
      applyPerformanceBonus: this.enablePerformance,
      applyGeneralBonus: this.enableBonus,
      applyGratuity: this.enableGratuity,
      applyProvidentFund: this.enablePF,
      applySocialSecurity: this.enableSocialSecurity,
      applyTax: this.enableTax,
      applyLoanDeductions: this.enableLoan,
      applySalaryAdvanceDeductions: this.enableAdvance
    };

    this.isCalculating = true;
    this.payrollService.calculatePayroll(payload).subscribe({
      next: (result) => {
        this.calculationResult = result;
        this.successMessage = 'Payroll calculated successfully.';
        this.isCalculating = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Payroll calculation failed.';
        this.isCalculating = false;
      }
    });
  }

  private normalizeGuid(value: string): string | null {
    return value && value.trim().length > 0 ? value : null;
  }
}
