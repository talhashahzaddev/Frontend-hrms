export interface TimesheetConfig {
  configId: string;
  organizationId: string;
  requiresManagerApproval: boolean;
  requiresHrApproval: boolean;
  allowEmployeeCorrections: boolean;
  correctionDeadlineDays: number;
  workingDays: string[];
  halfDayThresholdHours: number;
  fullDayThresholdHours: number;
  lateGraceMinutes: number;
  autoFinalizeOnLock: boolean;
  overtimeMultiplierRegular: number;
  overtimeMultiplierWeekend: number;
  overtimeMultiplierHoliday: number;
  timezone: string;
  shiftStartHour: number;
  shiftStartMinute: number;
}

export interface TimesheetPeriod {
  timesheetId: string;
  timesheetName: string;
  periodStart: string;
  periodEnd: string;
  status: 'Draft' | 'InProgress' | 'Submitted' | 'UnderReview' | 'Approved' | 'Finalized' | 'Locked' | 'Archived';
  totalEmployees: number;
  createdAt: string;
  submittedAt?: string;
  finalizedAt?: string;
  lockedAt?: string;
  nextActions: string[];
  scopeType: 'all' | 'department' | 'employees';
  scopeLabel?: string;
  rejectionReason?: string;
}

export interface TimesheetDay {
  attendanceId?: string;
  employeeId?: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: string;
  totalHours: number;
  overtimeHours: number;
  overtimeType?: string;
  lateMinutes: number;
  leaveTypeId?: string;
  leaveTypeName?: string;
  leavePayType?: string;
  isFinalized: boolean;
  isManagerOverride: boolean;
  hasPendingRequest: boolean;
  hasDraftRequest: boolean;
  hasApprovedRequest: boolean;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  requestedStatus?: string;
  rejectionReason?: string;
}

export interface EmployeeTimesheet {
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  department?: string;
  designation?: string;
  dailyRecords: TimesheetDay[];
  totalHoursWorked: number;
  overtimeHours: number;
  isFinalized: boolean;
}

export interface TimesheetCorrection {
  requestId?: string;
  attendanceId?: string;
  timesheetId: string;
  employeeId?: string;
  workDate: string;
  requestedStatus?: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  requestedOvertimeHours?: number;
  requestedOvertimeType?: string;
  requestedLateMinutes?: number;
  requestedLeaveTypeId?: string;
  requestedNotes?: string;
  reasonForEdit: string;
  idempotencyKey?: string;
  status?: string;
}

export interface PendingCorrection {
  requestId: string;
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  timesheetId: string;
  workDate: string;
  // Original attendance data
  originalStatus?: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  originalOvertimeHours?: number;
  originalOvertimeType?: string;
  originalLateMinutes?: number;
  originalLeaveTypeId?: string;
  originalLeaveTypeName?: string;
  // Requested corrections
  requestedStatus?: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  requestedOvertimeHours?: number;
  requestedOvertimeType?: string;
  requestedLateMinutes?: number;
  requestedLeaveTypeId?: string;
  requestedLeaveTypeName?: string;
  requestedNotes?: string;
  reasonForEdit: string;
  status: string;
  submittedAt: string;
  rejectionReason?: string;
}

export interface TimesheetBulkApprove {
  correctionIds: string[];
}

// ══════════════════════════════════════════════════════════════════
// Error Code Registry — must match backend TimesheetErrorCodes
// ══════════════════════════════════════════════════════════════════
export const TimesheetErrorCodes = {
  AlreadyActioned:  'ALREADY_ACTIONED',
  OverrideLocked:   'OVERRIDE_LOCKED',
  SelfApproval:     'SELF_APPROVAL',
  Unauthorized:     'UNAUTHORIZED_APPROVER',
  DeadlineExceeded: 'DEADLINE_EXCEEDED',
  PendingBlocks:    'PENDING_CORRECTIONS_EXIST',
} as const;

export type TimesheetErrorCode = typeof TimesheetErrorCodes[keyof typeof TimesheetErrorCodes];

export interface BulkApproveResult {
  success: boolean;
  message?: string;
  failedItem?: {
    correctionId: string;
    employeeName: string;
    workDate: string;
    reason: string;
  };
}

export interface CorrectionActionResult {
  success: boolean;
  errorCode?: string;
  message?: string;
  currentStatus?: string;
  actionedBy?: string;
  actionedAt?: string;
}

export interface TimesheetOverride {
  attendanceId?: string;
  workDate: string;
  employeeId: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  overtimeHours?: number;
  overtimeType?: string;
  lateMinutes?: number;
  leaveTypeId?: string;
  notes?: string;
  reason: string;
}

export interface TimesheetLockBlockers {
  canLock: boolean;
  blockers: string[];
}

export interface TimesheetAuditEntry {
  auditId: string;
  entityType: string;
  action: string;
  actorRole: string;
  oldValues?: string;
  newValues?: string;
  reason?: string;
  createdAt: string;
}

export interface TimesheetPeriodLink {
  timesheetId: string;
  timesheetName: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalEmployees: number;
  finalizedAt?: string;
}

export interface EmployeePayrollSummary {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  totalCalendarDays: number;
  scheduledWorkingDays: number;
  weekendDays: number;
  holidayDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  earlyDepartureDays: number;
  leaveDaysTotal: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  halfPaidLeaveDays: number;
  totalHoursWorked: number;
  regularHours: number;
  overtimeHours: number;
  regularOvertimeHours: number;
  weekendOvertimeHours: number;
  holidayOvertimeHours: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  effectivePresentDays: number;
  attendancePercentage: number;
  isConsumedByPayroll: boolean;
}

export interface TimesheetPayrollSummary {
  timesheetId: string;
  timesheetName: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  finalizedAt?: string;
  lockedAt?: string;
  employees: EmployeePayrollSummary[];
}

// ═══ Multi-Level Approval Workflow ════════════════════════════════════════
export interface TimesheetApprovalWorkflow {
  workflowId: string;
  organizationId: string;
  workflowName: string;
  isDefault: boolean;
  isActive: boolean;
  steps: TimesheetApprovalStep[];
}

export interface TimesheetApprovalStep {
  stepId: string;
  stepOrder: number;
  approverRole: string;
  approverSource: string;
  escalationHours?: number;
  isOptional: boolean;
}

export interface TimesheetApprovalProgress {
  progressId: string;
  timesheetId: string;
  employeeId: string;
  employeeName: string;
  stepOrder: number;
  approverRole: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Skipped';
  createdAt: string;
}

export interface TimesheetReopenRequest {
  reopenRequestId: string;
  timesheetId: string;
  timesheetName: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

// ═══ Project / Task / Time Allocation ═════════════════════════════════════
export interface TimesheetProject {
  projectId: string;
  organizationId: string;
  projectName: string;
  projectCode?: string;
  clientName?: string;
  costCenterCode?: string;
  glAccountCode?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface TimesheetTask {
  taskId: string;
  projectId: string;
  taskName: string;
  isBillableDefault: boolean;
  isActive: boolean;
  hourlyRate?: number;
}

export interface TimeAllocation {
  allocationId: string;
  attendanceId?: string;
  timesheetId: string;
  employeeId: string;
  workDate: string;
  projectId: string;
  taskId: string;
  projectName?: string;
  taskName?: string;
  hours: number;
  isBillable: boolean;
  billingRate?: number;
  description?: string;
  costCenterCode?: string;
}

export interface SaveTimeAllocation {
  timesheetId: string;
  entries: TimeAllocationEntry[];
}

export interface TimeAllocationEntry {
  attendanceId?: string;
  employeeId: string;
  workDate: string;
  projectId: string;
  taskId: string;
  hours: number;
  isBillable: boolean;
  billingRate?: number;
  description?: string;
  costCenterCode?: string;
}

// ═══ Comp Time ════════════════════════════════════════════════════════════
export interface CompTimeBalance {
  compTimeId: string;
  employeeId: string;
  employeeName: string;
  year: number;
  overtimeHoursBanked: number;
  overtimeHoursUsed: number;
  overtimeHoursAvailable: number;
  conversionRatio: number;
  expiresAt?: string;
}

// ═══ Dashboard ════════════════════════════════════════════════════════════
export interface TimesheetDashboard {
  completionRate: MetricCard;
  avgHoursPerDay: MetricCard;
  overtimeTrend: MetricCard;
  pendingApprovals: MetricCard;
  departmentUtilization: DepartmentUtilization[];
  utilizationTrend: UtilizationTrend[];
  overtimeReasons: OvertimeReasonBreakdown[];
}

export interface MetricCard {
  value: number;
  changePercent?: number;
  trend?: string;
}

export interface DepartmentUtilization {
  department: string;
  scheduled: number;
  actual: number;
  utilizationPercent: number;
}

export interface UtilizationTrend {
  period: string;
  utilizationPercent: number;
  overtimePercent: number;
}

export interface OvertimeReasonBreakdown {
  reason: string;
  totalHours: number;
  employeeCount: number;
}

// ═══ Delegation ═══════════════════════════════════════════════════════════
export interface TimesheetDelegation {
  delegationId: string;
  delegatedFrom: string;
  delegatedFromName: string;
  delegatedTo: string;
  delegatedToName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  reason?: string;
}

export interface CreateTimesheetDelegation {
  delegatedTo: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

// ═══ Rate Cards ═══════════════════════════════════════════════════════════
export interface EmployeeRateCard {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  standardRate: number;
  overtimeRate: number;
  weekendRate: number;
  holidayRate: number;
  effectiveFrom: string;
}

// ═══ Bulk Operations ══════════════════════════════════════════════════════
export interface BulkCopyRequest {
  sourceTimesheetId: string;
  targetTimesheetId: string;
  employeeIds: string[];
  copyCorrections: boolean;
}

export interface BulkAutoFillRequest {
  timesheetId: string;
  employeeId: string;
  dates: string[];
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
}
