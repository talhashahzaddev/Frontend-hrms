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
}

// export interface DepartmentEmployee {
//   employeeId: string;
//   firstName: string;
//   lastName: string;
// }
export interface DepartmentEmployee {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  hireDate: string | null; // ISO string from backend
  position: string;
  reportingManagerName: string;
}


export interface AttendanceSession {
  sessionId: string;         // GUID from backend
  attendanceId: string;      // GUID from backend
  checkInTime: string;       // ISO string, e.g. "2025-12-04T09:00:00Z"
  checkOutTime?: string;     // ISO string or undefined
  location?: string;         // optional
  employeeName: string;      // employee full name
  workDate: string;          // ISO date string, e.g. "2025-12-04"
}

export interface AttendanceSessionDto {
  sessionId: string;       // maps to SessionId (GUID)
  attendanceId: string;    // maps to AttendanceId (GUID)
  checkInTime: string;     // ISO string from backend
  checkOutTime?: string;   // optional ISO string if session is checked out
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
  breakDuration: number; // in minutes
  isActive: boolean;
  description?: string;
  gracePeriod: number; // in minutes
  workingDays: string[]; // ['monday', 'tuesday', etc.]
  createdAt: string;
  marginHours?: number;
}

export interface AttendanceRecord {
  date: string;
  checkIn?: string;
  checkOut?: string;
  totalHours: number;
  status: AttendanceStatus;
  notes?: string;
}

// DTOs for API requests/responses
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

// export interface TimeTrackingSession {
//   sessionId: string;
//   employeeId: string;
//   startTime: string;
//   endTime?: string;
//   totalDuration: number; // in minutes
//   status: 'active' | 'paused' | 'completed';
//   location?: string;
//   description?: string;
//   breaks: {
//     startTime: string;
//     endTime?: string;
//     duration: number;
//   }[];
// }


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


// Clock-in/out response
export interface ClockResponse {
  success: boolean;
  message: string;
  attendance: Attendance;
  currentSession?: TimeTrackingSession;
}

// Attendance calendar data
export interface AttendanceCalendarData {
  date: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalHours: number;
  isWorkingDay: boolean;
  isHoliday: boolean;
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
}


export interface ShiftDto {
  shiftId: string;
  shiftName: string;
  startTime: string; // "HH:mm:ss"
  endTime: string;
  breakDuration: number;
  daysOfWeek: number[];
  timezone: string;
  isActive: boolean;
  marginHours?: number; 

}

// assign-shift-request.model.ts
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
  status: string; // approved | rejected | pending
}

export interface approvedshiftRequest {
  requestId: string;
  approvedBy: string;
  isApproved: boolean;
  rejectionReason: string;
}



// shift-swap.model.ts
export interface ShiftSwap {
  employeeId: string;
  currentShiftId?: string; // optional (as per your DTO)
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

// Timesheet Models
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
  notes?: string;
  is_finalized?: boolean;
  hasPendingRequest?: boolean;
  hasDraftRequest?: boolean;
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

// Finalized Timesheet Models
export interface MonthlyTimesheetCreateDto {
  timesheetName: string;
  month: number;
  year: number;
}

export interface AttendanceUpdateRequestDto {
  attendanceId: string;
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

// Grouped correction record for a single day
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

// Employee submission package containing all corrections for an employee
export interface EmployeeSubmissionPackage {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  timesheetId: string;
  corrections: CorrectionRecord[];
}
export interface FinalizedTimesheetRecordDto {
  recordId: string;
  timesheetId: string;
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
  month: number;
  year: number;
  records: FinalizedTimesheetRecordDto[];
  createdAt?: string;
  finalizedAt?: string;
}

// Daily review record for manager dashboard
export interface DailyReviewRecord {
  recordId: string;
  attendanceId: string;
  workDate: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  originalStatus: string;
  originalTotalHours: number;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  requestedStatus?: string;
  requestedNotes?: string;
  reasonForEdit?: string;
  hasPendingRequest: boolean;
  isFinalized: boolean;
  requestId?: string;
  // Request status: 'pending', 'approved', 'rejected', 'none'
  requestStatus?: 'pending' | 'approved' | 'rejected' | 'none';
}

// Employee review package for manager dashboard
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
  dailyRecords: DailyReviewRecord[];
}

// Manager override request DTO
export interface ManagerOverrideDto {
  attendanceId: string;
  timesheetId: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  notes?: string;
  reason: string;
}