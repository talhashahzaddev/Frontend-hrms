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
  lateHours?: number;
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
  attendanceId?: string | null;
  checkInTime?: string;
  checkOutTime?: string;
  status: string;
  notes?: string;
  reason?: string;
  timesheetId?: string;
  workDate?: string;
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

export interface MonthlyTimesheetSummary {
  timesheetId: string;
  timesheetName: string;
  month: number;
  year: number;
  monthName: string;
  totalEmployees: number;
  attendancePercentage: number;
  totalPresentDays: number;
  totalAbsentDays: number;
  totalLateDays: number;
  totalHoursWorked: number;
  status?: string;
  createdAt?: string;
}

export interface EmployeeTimesheetDto {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalHoursWorked: number;
  attendancePercentage: number;
  dailyRecords?: DailyAttendanceRecord[];
  is_finalized?: boolean;
  hasPendingRequest?: boolean;
}

export interface DailyAttendanceRecord {
  attendanceId?: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: string;
  totalHours: number;
  overtimeHours?: number;
  lateHours?: number;
  notes?: string;
  is_finalized?: boolean;
  isFinalized?: boolean;
  is_manager_override?: boolean;
  isManagerOverride?: boolean;
  hasPendingRequest?: boolean;
  hasDraftRequest?: boolean;
  hasApprovedRequest?: boolean;
  hasRejectedRequest?: boolean;
  requestStatus?: 'pending' | 'approved' | 'rejected' | 'draft' | 'none' | string;
  rejectionReason?: string | null;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  requestedStatus?: string | null;
  requestedNotes?: string | null;
  isPlaceholder?: boolean;
  isWeekend?: boolean;
}

export interface TimesheetSearchRequest {
  month: number;
  year: number;
  departmentId?: string;
  employeeId?: string;
}

export interface TimesheetResponse {
  summary: MonthlyTimesheetSummary;
  employees: EmployeeTimesheetDto[];
}

export interface MonthlyTimesheetCreateDto {
  timesheetName: string;
  month: number;
  year: number;
}

export interface AttendanceUpdateRequestDto {
  attendanceId: string | null;
  employeeId: string;
  timesheetId?: string;
  workDate: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  requestedStatus?: string;
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
  rejectionReason?: string;
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
  finalOvertimeHours?: number;
  finalLateHours?: number;
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
  month: number;
  year: number;
  records: FinalizedTimesheetRecordDto[];
  createdAt?: string;
  finalizedAt?: string;
}

export interface FinalizedPayrollStatusBreakdown {
  status: string;
  days: number;
  hours: number;
}

export interface FinalizedPayrollCalculation {
  timesheetId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  month: number;
  year: number;
  expectedWorkDays: number;
  finalizedWorkDays: number;
  pendingWorkDays: number;
  pendingRequestDays: number;
  payableDays: number;
  unpaidDays: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  lateHours: number;
  attendancePercentage: number;
  payrollReady: boolean;
  blockedReason?: string;
  generatedAt?: string;
  statusBreakdown: FinalizedPayrollStatusBreakdown[];
}

export interface DailyReviewRecord {
  recordId: string;
  attendanceId: string | null;
  date: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  originalStatus: string;
  originalTotalHours: number;
  originalLateHours?: number;
  originalOvertimeHours?: number;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  requestedStatus?: string;
  requestedNotes?: string;
  reasonForEdit?: string;
  rejectionReason?: string;
  hasPendingRequest: boolean;
  hasDraftRequest: boolean;
  hasApprovedRequest?: boolean;
  hasRejectedRequest?: boolean;
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
  month: number;
  year: number;
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
  notes?: string;
  reason: string;
}

export interface OrgSubmissionProgress {
  month: number;
  year: number;
  totalEmployees: number;
  finalizedCount: number;
  submittedCount: number;
  pendingReviewCount: number;
  inProgressCount: number;
  untouchedCount: number;
  submissionRate: number;
  complianceRate: number;
}