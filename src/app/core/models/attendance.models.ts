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
  notes?: string;
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