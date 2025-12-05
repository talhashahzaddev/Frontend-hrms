export interface Attendance {
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  workDate: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInLocation?: string;
  checkOutLocation?: string;
  totalHours: number;
  overtimeHours: number;
  status: string;
  sessionsCount:number;
  notes?: string;
}

export interface DepartmentEmployee {
  employeeId: string;
  firstName: string;
  lastName: string;
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
  location?: { [key: string]: any };
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

export interface AttendanceReport {
  startDate: string;
  endDate: string;
  totalWorkDays: number;
  totalEmployees: number;
  totalPresentDays: number;
  totalAbsentDays: number;
  averageAttendanceRate: number;
  records: Attendance[];
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
}


export interface UpdateShiftDto {
  shiftId: string;         
  shiftName: string;       
  startTime: string;       
  endTime: string;         
  breakDuration?: number;  
  daysofWeek?: number[];  
  timezone?: string;       
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

export interface approvedshiftRequest{
  requestId:string;
  approvedBy:string;
  isApproved:boolean;
  rejectionReason:string;
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