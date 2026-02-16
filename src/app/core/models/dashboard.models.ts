export interface DashboardSummary {
  totalEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  pendingApprovals: number;
  newHiresThisMonth: number;
  attendanceRate: number;
  employeeSatisfaction: number;
}

export interface AttendanceStats {
  dates: string[];
  presentCounts: number[];
  absentCounts: number[];
  attendanceRate: number;
  totalWorkingDays: number;
  totalPresentDays: number;
}

export interface LeaveStats {
  totalLeaveRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  averageLeaveDays: number;
  leaveTypeUsage: LeaveTypeUsage[];
}

export interface LeaveTypeUsage {
  leaveTypeName: string;
  requestCount: number;
  totalDays: number;
}

export interface PayrollStats {
  totalPayroll: number;
  averageSalary: number;
  processedEmployees: number;
  totalTaxes: number;
  totalDeductions: number;
  currency: string;
}

export interface TopPerformer {
  employeeId: number;   // or whatever ID your backend uses
  name: string;         // employee name
  rating: number;       // rating score
}
export interface PerformanceStats {
  averageRating: number;
  completedReviews: number;
  pendingReviews: number;
  topPerformers: TopPerformer[];
  totalAppraisals?: number; // we’ll compute this
}

export interface PerformanceRatingDistribution {
  rating: string;
  count: number;
  percentage: number;
}

export interface RecentActivity {
  activityId: string;
  activity: string;
  description: string;
  userName: string;
  timestamp: string;
  activityType: string;
}

export interface EmployeeGrowth {
  months: string[];
  counts: number[];
  growthRate: number;
  cumulativeEmployees: number[];
  newEmployees: number[];
}

export interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  averageSalary: number;
  managerName?: string;
}

export interface UpcomingEvents {
  eventId: string;
  title: string;
  description: string;
  date: string;
  eventType: string;
  priority: string;
}

export interface OnboardingStatus {
  signUp: boolean;
  createTeam: boolean;
  defineLeaveTypes: boolean;
  markAttendance: boolean;
  processPayroll: boolean;
}