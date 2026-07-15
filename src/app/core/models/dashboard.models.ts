// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Models — mapped from C# DashboardDTOs.cs
// ─────────────────────────────────────────────────────────────────────────────

// 1. Employee Overview (GET /api/dashboard/my-overview)
export interface EmployeeOverview {
  leaveBalances: LeaveBalanceSummary;
  financialSnapshot: FinancialSnapshot;
  activeLoansAndAdvances: ActiveLoansAdvances;
  pendingRequests: PendingRequestSummary[];
}

export interface LeaveBalanceSummary {
  totalRemainingDays: number;
  byType: LeaveTypeBalanceSummary[];
}

export interface LeaveTypeBalanceSummary {
  leaveTypeName: string;
  color: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  carryForwardDays: number;
}

export interface FinancialSnapshot {
  lastNetSalary?: number | null;
  lastPayPeriodName?: string | null;
  payslipUploadUrl?: string | null;
  isPayslipAvailable: boolean;
}

export interface ActiveLoansAdvances {
  totalRemainingLoanAmount: number;
  totalRemainingAdvanceAmount: number;
  activeLoans: ActiveLoanSummary[];
  activeAdvances: ActiveAdvanceSummary[];
}

export interface ActiveLoanSummary {
  loanId: string;
  referenceId: string;
  remainingAmount: number;
  totalAmount: number;
  remainingInstallments: number;
  completedPercentage: number;
}

export interface ActiveAdvanceSummary {
  advanceId: string;
  amount: number;
  advanceStatus: string;
  approvedAt?: string | null;
}

export interface PendingRequestSummary {
  requestId: string;
  requestType: string;
  description: string;
  submittedAt: string;
}

// 2. Manager Overview (GET /api/dashboard/manager-overview)
export interface ManagerOverview {
  teamAttendanceSnapshot: TeamAttendanceSnapshot;
  teamOvertimeCountToday: number;
  pendingActions: PendingManagerActions;
}

export interface TeamAttendanceSnapshot {
  presentCount: number;
  absentCount: number;
  lateCount: number;
  onLeaveCount: number;
}

export interface PendingManagerActions {
  pendingLeaveRequests: number;
  pendingTimesheetCorrections: number;
  pendingShiftSwaps: number;
}

// 3. HR/Finance Overview (GET /api/dashboard/hr-overview)
export interface HrOverview {
  latestPayrollRun: PayrollRunStatus;
  totalPayrollOutflow: number;
  workforceMetrics: WorkforceMetrics;
}

export interface PayrollRunStatus {
  periodName: string;
  totalEmployeesProcessed: number;
  payslipsGenerated: number;
  payslipsUploaded: number;
  emailsSent: number;
  isFullyCompleted: boolean;
}

export interface WorkforceMetrics {
  totalActiveEmployees: number;
  totalOpenPositions: number;
}

// 4. HR Stats (GET /api/dashboard/hr-stats)
export interface HrStats {
  demographics: WorkforceDemographics;
  payrollOutflow: PayrollOutflow[];
  monthlyExpenses: MonthlyExpense[];
}

export interface WorkforceDemographics {
  malePercentage: number;
  femalePercentage: number;
  ageGroupPercentages: { [key: string]: number };
  largestDepartmentName: string;
  largestDepartmentPercentage: number;
}

export interface PayrollOutflow {
  periodName: string;
  basicSalarySum: number;
  totalDeductionsSum: number;
  totalBonusesSum: number;
}

export interface MonthlyExpense {
  month: string;
  totalExpense: number;
}
export interface LatestHiredEmployee {
  jobApplyId: string;
  jobId: string;
  candidateName: string;
  status: string;
  jobRoleName: string;
  interviewers: string;
}

