export interface Attendance {
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  workDate: string;
  date: string;
  shiftId?: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInLocation?: string;
  checkOutLocation?: string;
  totalHours: number;
  overtimeHours: number;
  status: string;
  sessionsCount: number;
  notes?: string;
  ipAddress?: string;
  location?: string;
  checkinip?: string;
  checkoutip?: string;
  checkinLocationType?: string;
  checkoutLocationType?: string;
}

export interface OfficeIP {
  id: string;
  ipAddressValue: string;
  name: string;
  createdAt: string;
}

export interface DepartmentEmployee {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  hireDate: string | null;
  position: string;
  reportingManagerName: string;
}


export interface AttendanceSession {
  sessionId: string;
  attendanceId: string;
  checkInTime: string;
  checkOutTime?: string;
  location?: string;
  employeeName: string;
  workDate: string;
}

export interface AttendanceSessionDto {
  sessionId: string;
  attendanceId: string;
  checkInTime: string;
  checkOutTime?: string;
}


export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EARLY_DEPARTURE = 'early_departure',
  HALF_DAY = 'half_day',
  ON_LEAVE = 'on_leave',
  HOLIDAY = 'holiday',
  PENDING_APPROVAL = 'pending_approval'
}

export interface Shift {
  shiftId: string;
  name: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  isActive: boolean;
  description?: string;
  gracePeriod: number;
  workingDays: string[];
  createdAt: string;
  marginHours?: number;
  applyMarginhours?: boolean;
}

export interface AttendanceRecord {
  date: string;
  checkIn?: string;
  checkOut?: string;
  totalHours: number;
  status: AttendanceStatus;
  notes?: string;
}

export interface TimeZoneDto {
  id: string;          // Asia/Karachi
  displayName: string; // Asia/Karachi (formatted if you want)
}

export interface ShiftSummary {
  totalShifts: number;
  shiftAssignedEmployee: number;
  unassignedShiftsEmp: number;
  shiftSwapRequests: number;
}

export interface CheckInRequest {
  action: string;
  location?: { [key: string]: any };
}

export interface CheckOutRequest {
  action: string;
  location?: { [key: string]: any };
}

export interface ClockInOutRequest {
  action: string;
  shiftId : string | null ;
  location?: { [key: string]: any };
  notes?: string;
}

export interface ManualAttendanceSearchDto {
  startDate: string;
  endDate: string;
  employeeId?: string;
}

export interface ManualAttendanceUpdateDto {
  attendanceId: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: string;
  notes?: string;
  employeeId: string;
}

export interface ManualAttendanceRequest {
  employeeId: string;
  workDate: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  checkInLocation?: string;
  checkOutLocation?: string;
  status?: string;
  notes?: string;
  reason?: string;
}

export interface AttendanceSearchRequest {
  SearchTerm?: string;
  employeeId?: string;
  departmentId?: string;
  startDate: string;
  endDate: string;
  status?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface AttendanceListResponse {
  attendances: Attendance[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AttendanceSummary {
  totalWorkDays?: number;
  presentDays?: number;
  absentDays?: number;
  lateDays?: number;
  totalHours?: number;
  overtimeHours?: number;
  averageHoursPerDay?: number;
}

export interface DailyAttendanceStats {
  date: string;
  totalEmployees: number;
  presentEmployees: number;
  absentEmployees: number;
  lateEmployees: number;
  earlyLeavers: number;
  onLeaveEmployees: number;
  attendancePercentage: number;
  averageCheckInTime?: string;
  averageCheckOutTime?: string;
}

export interface PagedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AttendanceReport {
  startDate: string;
  endDate: string;
  totalWorkDays: number;
  totalEmployees: number;
  totalPresentDays: number;
  totalAbsentDays: number;
  averageAttendanceRate: number;
  records: PagedResult<Attendance>;
  summary: AttendanceSummary;
  dailyStats: DailyAttendanceStats[];
  departmentStats: any[];
}



export interface TimeTrackingSession {
  sessionId?: string;
  employeeId: string;
  checkInTime?: string;
  checkOutTime?: string;
  isActive: boolean;
  elapsedHours: number;
  elapsedTime?: string;
  status: string;
  currentLocation?: string;
}


export interface ClockResponse {
  success: boolean;
  message: string;
  attendance: Attendance;
  currentSession?: TimeTrackingSession;
}

export interface AttendanceCalendarData {
  date: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalHours: number;
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName?: string;
  notes?: string;
}


export interface UpdateShiftDto {
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  daysofWeek?: number[];
  timezone?: string;
  marginHours?: number;
  applyMarginhours?: boolean;
  /** Per-shift grace period in minutes; 0 falls back to org late-rule, then 15-min default. */
  graceMinutes?: number;
}


export interface ShiftDto {
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  daysOfWeek: number[];
  timezone: string;
  isActive: boolean;
  marginHours?: number;
  applyMarginhours?: boolean;
  graceMinutes?: number;

}

export interface AssignShiftRequest {
  employeeId: string;
  shiftId: string;
}

export interface EmployeeShift {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName: string;
  positionName: string;
  shiftName: string;
}

export interface PendingShiftSwap {
  requestId: string;
  employeeId: string;
  employeeName: string;
  currentShiftId: string;
  currentShiftName: string;
  requestedShiftId: string;
  requestedShiftName: string;
  reason: string;
  status: string;
}

export interface approvedshiftRequest {
  requestId: string;
  approvedBy: string;
  isApproved: boolean;
  rejectionReason: string;
}



export interface ShiftSwap {
  employeeId: string;
  currentShiftId?: string;
  requestedShiftId: string;
  reason?: string;
}






export interface AttendancePolicy {
  policyId: string;
  name: string;
  description?: string;
  workingHoursPerDay: number;
  workingDaysPerWeek: number;
  gracePeriodMinutes: number;
  maxOvertimeHours: number;
  breakDurationMinutes: number;
  isFlexibleTiming: boolean;
  coreHoursStart?: string;
  coreHoursEnd?: string;
  isActive: boolean;
}

export enum TimesheetStatus {
  DRAFT        = 'Draft',
  IN_PROGRESS  = 'InProgress',
  SUBMITTED    = 'Submitted',
  UNDER_REVIEW = 'UnderReview',
  APPROVED     = 'Approved',
  FINALIZED    = 'Finalized',
  LOCKED       = 'Locked',
  ARCHIVED     = 'Archived'
}

export interface MonthlyTimesheetSummary {
  timesheetId: string;
  timesheetName: string;
  /** Inclusive start of the timesheet period (replaces month/year). */
  startDate: string;
  /** Inclusive end of the timesheet period (replaces month/year). */
  endDate: string;
  /** @deprecated Legacy. Present only for older records. */
  month?: number;
  /** @deprecated Legacy. Present only for older records. */
  year?: number;
  /** @deprecated Legacy. Derived from startDate. */
  monthName?: string;

  totalEmployees: number;
  attendancePercentage: number;
  totalPresentDays: number;
  totalAbsentDays: number;
  totalLateDays: number;
  totalHoursWorked: number;
  totalOvertimeHours?: number;

  status?: string;
  submittedAt?: string;
  finalizedAt?: string;
  lockedAt?: string;
  createdAt?: string;
}

export interface EmployeeTimesheetDto {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation?: string;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays?: number;
  leaveDays?: number;
  holidayDays?: number;
  weekendDays?: number;
  totalHoursWorked: number;
  regularHours?: number;
  overtimeHours?: number;
  /** Typed OT split — populated when timesheet is finalized (from bridge). */
  regularOvertimeHours?: number;
  weekendOvertimeHours?: number;
  holidayOvertimeHours?: number;
  lateMinutes?: number;
  lateHours?: number;
  attendancePercentage: number;
  dailyRecords?: DailyAttendanceRecord[];
  is_finalized?: boolean;
  hasPendingRequest?: boolean;
  submittedAt?: string;
  finalizedAt?: string;
}

export interface DailyAttendanceRecord {
  attendanceId?: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: string;
  totalHours: number;
  /** Per-day overtime hours from raw attendance.attendance.overtimehours. */
  overtimeHours?: number;
  /** 'regular' | 'weekend' | 'holiday' — populated when an OT request was tied to this day. */
  overtimeType?: string;
  lateMinutes?: number;
  /** Current leave classification when status='on_leave'. */
  leaveTypeId?: string;
  leaveTypeName?: string;
  /** 'paid' | 'unpaid' | 'half_paid' — derived from leavetypes flags. */
  leavePayType?: string;
  /** Latest pending/draft request fields, surfaced as draft annotations in the dialogs. */
  requestedLeaveTypeId?: string;
  requestedLeaveTypeName?: string;
  requestedLeavePayType?: string;
  requestedOvertimeHours?: number;
  requestedOvertimeType?: string;
  requestedLateMinutes?: number;
  notes?: string;
  is_finalized?: boolean;
  isFinalized?: boolean;
  is_manager_override?: boolean;
  isManagerOverride?: boolean;
  hasPendingRequest?: boolean;
  hasDraftRequest?: boolean;
  hasApprovedRequest?: boolean;
  hasRejectedRequest?: boolean;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  requestedStatus?: string | null;
  requestedNotes?: string | null;
  isPlaceholder?: boolean;
  isWeekend?: boolean;
}

export interface TimesheetSearchRequest {
  /** @deprecated Use startDate/endDate */
  month?: number;
  /** @deprecated Use startDate/endDate */
  year?: number;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  employeeId?: string;
}

export interface TimesheetResponse {
  summary: MonthlyTimesheetSummary;
  employees: EmployeeTimesheetDto[];
}

export interface MonthlyTimesheetCreateDto {
  timesheetName: string;
  /** Inclusive start of the period (yyyy-MM-dd). */
  startDate: string;
  /** Inclusive end of the period (yyyy-MM-dd). */
  endDate: string;
  /** @deprecated Optional legacy fields. */
  month?: number;
  /** @deprecated Optional legacy fields. */
  year?: number;
}

export interface AttendanceUpdateRequestDto {
  attendanceId: string | null;
  employeeId: string;
  timesheetId?: string;
  workDate: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  requestedStatus?: string;
  /** Required when requestedStatus = 'on_leave'. Picked from attendance.leavetypes. */
  requestedLeaveTypeId?: string;
  /** Optional. Hours of overtime employee is claiming for the day. */
  requestedOvertimeHours?: number;
  /** Optional. 'regular' | 'weekend' | 'holiday'. */
  requestedOvertimeType?: string;
  /** Optional. Minutes-late override (0 to claim no lateness, positive to set explicitly). */
  requestedLateMinutes?: number;
  reasonForEdit: string;
  requestedNotes?: string;
}

export interface ProcessAttendanceRequestDto {
  requestId: string;
  isApproved: boolean;
  rejectionReason?: string;
}

export interface PendingAttendanceRequest {
  requestId: string;
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  workDate: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  originalStatus: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  requestedStatus: string;
  reasonForEdit: string;
  requestedNotes?: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface CorrectionRecord {
  requestId: string;
  attendanceId: string;
  workDate: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  originalStatus: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  requestedStatus: string;
  reasonForEdit: string;
  requestedNotes?: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface EmployeeSubmissionPackage {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  timesheetId: string;
  corrections: CorrectionRecord[];
}
export interface FinalizedTimesheetRecordDto {
  recordId: string;
  timesheetId: string | null;
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  department?: string;
  workDate: string;
  finalCheckIn?: string;
  finalCheckOut?: string;
  finalTotalHours: number;
  finalStatus: string;
  finalNotes?: string;
  createdAt?: string;
  presentDays?: number;
  absentDays?: number;
  lateDays?: number;
  totalHoursWorked?: number;
  attendancePercentage?: number;
  is_finalized?: boolean;
  hasPendingRequest?: boolean;
}

export interface FinalizedTimesheetDto {
  timesheetId: string;
  timesheetName: string;
  startDate: string;
  endDate: string;
  /** @deprecated Use startDate/endDate. */
  month?: number;
  /** @deprecated Use startDate/endDate. */
  year?: number;
  records: FinalizedTimesheetRecordDto[];
  createdAt?: string;
  finalizedAt?: string;
}

export interface DailyReviewRecord {
  recordId: string;
  attendanceId: string | null;
  date: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  originalStatus: string;
  originalTotalHours: number;
  /** Per-day overtime so payroll-relevant counters are visible during review. */
  overtimeHours?: number;
  overtimeType?: string;
  lateMinutes?: number;
  /** Current leave classification when originalStatus='on_leave'. */
  leaveTypeId?: string;
  leaveTypeName?: string;
  leavePayType?: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  requestedStatus?: string;
  /** Draft/pending request fields surfaced for manager review. */
  requestedLeaveTypeId?: string;
  requestedLeaveTypeName?: string;
  requestedLeavePayType?: string;
  requestedOvertimeHours?: number;
  requestedOvertimeType?: string;
  requestedLateMinutes?: number;
  requestedNotes?: string;
  reasonForEdit?: string;
  hasPendingRequest: boolean;
  hasDraftRequest: boolean;
  hasApprovedRequest?: boolean;
  isFinalized: boolean;
  isManagerOverride?: boolean;
  requestId?: string;
  requestStatus?: 'pending' | 'approved' | 'rejected' | 'none';
}

export interface EmployeeReviewPackage {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department?: string;
  designation?: string;
  timesheetId: string;
  /** @deprecated Use parent timesheet's startDate/endDate */
  month?: number;
  /** @deprecated Use parent timesheet's startDate/endDate */
  year?: number;
  totalRecords: number;
  pendingRequestCount: number;
  approvedCount: number;
  rejectedCount: number;
  finalizedCount: number;
  finalizedDays: number;
  fullMonthRecords: DailyReviewRecord[];
  hasDraftRequest?: boolean;
  hasPendingRequest?: boolean;
  isFinalized?: boolean;
  isUntouched?: boolean;
  attendancePercentage?: number;
}

export interface ManagerOverrideDto {
  attendanceId: string | null;
  employeeId: string;
  timesheetId: string;
  workDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status?: string;
  /** Required when status = 'on_leave'. Sets leave_type / leave_pay_type on the finalized record. */
  leaveTypeId?: string;
  /** Manager-supplied overtime for the day. Routed to typed OT bucket via overtimeType. */
  overtimeHours?: number;
  /** 'regular' | 'weekend' | 'holiday'. */
  overtimeType?: string;
  /** Manager-supplied late minutes (e.g., to waive lateness or to add it manually). */
  lateMinutes?: number;
  notes?: string;
  reason: string;
}

export interface OrgSubmissionProgress {
  /** @deprecated Use startDate/endDate */
  month?: number;
  /** @deprecated Use startDate/endDate */
  year?: number;
  startDate?: string;
  endDate?: string;
  totalEmployees: number;
  finalizedCount: number;
  submittedCount: number;
  pendingReviewCount: number;
  inProgressCount: number;
  untouchedCount: number;
  submissionRate: number;
  complianceRate: number;
}

export interface EmployeeOverTimeDto {
  requestId: string;
  employeeId: string;
  requestedBy?: string;
  managerid?: string;
  attendanceId?: string;
  requestedByName?: string;
  requestType?: string;
  overtimeType?: string;
  overtimeDate?: string;
  overtimeStart?: string;
  overtimeEnd?: string;
  requestedHours?: number;
  reason?: string;
  status?: 'pending' | 'approved' | 'rejected' | string;
  createdAt?: string;
}

// ============================================================================
// PAYROLL BRIDGE — consumed by both AttendanceService (for the view) and
// PayrollService (when picking a timesheet to feed into a payroll run).
// Backend: GET /Attendance/timesheet/payroll-summary, /timesheet/finalized-links
// ============================================================================

/** Per-employee attendance counters derived from a finalized timesheet. */
export interface EmployeePayrollSummaryDto {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department?: string;
  designation?: string;
  timesheetId: string;
  periodStart: string;
  periodEnd: string;

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
  /** Typed overtime split — used by payroll to apply per-type multipliers/rules. */
  regularOvertimeHours?: number;
  weekendOvertimeHours?: number;
  holidayOvertimeHours?: number;
  lateMinutes: number;
  lateHours: number;
  earlyDepartureMinutes: number;

  effectivePresentDays: number;
  attendancePercentage: number;

  isConsumedByPayroll: boolean;
  aggregatedAt?: string;
}

/** Full payroll-ready snapshot of a finalized timesheet — header + per-employee rows. */
export interface TimesheetPayrollSummaryDto {
  timesheetId: string;
  timesheetName: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalEmployees: number;
  finalizedAt?: string;
  lockedAt?: string;
  employees: EmployeePayrollSummaryDto[];
}

/** Lightweight reference used in payroll's "select timesheet for this run" picker. */
export interface TimesheetPeriodLinkDto {
  timesheetId: string;
  timesheetName: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalEmployees: number;
  finalizedAt?: string;
}

/** Payload to POST /Attendance/timesheet/lock when payroll consumes a finalized timesheet. */
export interface LockTimesheetRequestDto {
  timesheetId: string;
  payrollPeriodId?: string;
}