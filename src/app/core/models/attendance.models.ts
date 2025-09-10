export interface Attendance {
  attendanceId: string;
  employeeId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  status: AttendanceStatus;
  notes?: string;
  location?: string;
  isManualEntry: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Related data
  employee?: {
    employeeId: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    department?: string;
  };
  shift?: Shift;
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
  location?: string;
  notes?: string;
}

export interface CheckOutRequest {
  location?: string;
  notes?: string;
}

export interface ManualAttendanceRequest {
  employeeId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  notes?: string;
  location?: string;
}

export interface AttendanceSearchRequest {
  employeeId?: string;
  departmentId?: string;
  startDate: string;
  endDate: string;
  status?: AttendanceStatus;
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
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  averageHoursPerDay: number;
  attendancePercentage: number;
}

export interface DailyAttendanceStats {
  date: string;
  totalEmployees: number;
  presentEmployees: number;
  absentEmployees: number;
  lateEmployees: number;
  onLeaveEmployees: number;
  attendancePercentage: number;
}

export interface AttendanceReport {
  summary: AttendanceSummary;
  dailyStats: DailyAttendanceStats[];
  departmentWiseStats: { [department: string]: AttendanceSummary };
  employeeAttendance: {
    employeeId: string;
    employeeName: string;
    department: string;
    summary: AttendanceSummary;
    records: AttendanceRecord[];
  }[];
}

export interface TimeTrackingSession {
  sessionId: string;
  employeeId: string;
  startTime: string;
  endTime?: string;
  totalDuration: number; // in minutes
  status: 'active' | 'paused' | 'completed';
  location?: string;
  description?: string;
  breaks: {
    startTime: string;
    endTime?: string;
    duration: number;
  }[];
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
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  totalHours: number;
  isHoliday: boolean;
  isWeekend: boolean;
  notes?: string;
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