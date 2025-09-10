export interface DashboardSummary {
  totalEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  pendingApprovals: number;
  employeeGrowth?: number;
}

export interface AttendanceStats {
  dates: string[];
  presentCounts: number[];
  absentCounts: number[];
  averagePresence: number;
}

export interface LeaveStats {
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  leaveTypes: { [key: string]: number };
}

export interface PayrollStats {
  totalPayroll: number;
  averageSalary: number;
  payrollCosts: { month: string; amount: number }[];
}

export interface PerformanceStats {
  averageRating: number;
  completedReviews: number;
  pendingReviews: number;
  topPerformers: { name: string; rating: number }[];
}

export interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  userName: string;
  timestamp: string;
}

export interface EmployeeGrowth {
  months: string[];
  counts: number[];
  growthRate: number;
}

export interface DepartmentStats {
  id: string;
  name: string;
  count: number;
  employeeCount: number;
  percentage: number;
}

export interface UpcomingEvents {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  type: string;
}