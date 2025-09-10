export interface LeaveRequest {
  leaveRequestId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveRequestStatus;
  appliedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
  reviewerComments?: string;
  attachments?: string[];
  isEmergency: boolean;
  contactDuringLeave?: string;
  
  // Related data
  employee?: {
    employeeId: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    department?: string;
  };
  leaveType?: LeaveType;
  reviewer?: {
    userId: string;
    firstName: string;
    lastName: string;
  };
}

export enum LeaveRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  WITHDRAWN = 'withdrawn'
}

export interface LeaveType {
  leaveTypeId: string;
  name: string;
  description?: string;
  maxDaysPerYear: number;
  carryForwardDays: number;
  isCarryForwardAllowed: boolean;
  requiresApproval: boolean;
  approvalHierarchy: string[];
  isActive: boolean;
  createdAt: string;
}

export interface LeaveEntitlement {
  leaveEntitlementId: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalDays: number;
  usedDays: number;
  availableDays: number;
  carryForwardDays: number;
  
  // Related data
  leaveType?: LeaveType;
  employee?: {
    employeeId: string;
    firstName: string;
    lastName: string;
  };
}

export interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  totalDays: number;
  usedDays: number;
  availableDays: number;
  pendingDays: number;
  carryForwardDays: number;
}

// DTOs for API requests/responses
export interface CreateLeaveRequest {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  isEmergency: boolean;
  contactDuringLeave?: string;
  attachments?: File[];
}

export interface UpdateLeaveRequest {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  isEmergency: boolean;
  contactDuringLeave?: string;
}

export interface ReviewLeaveRequest {
  status: LeaveRequestStatus;
  reviewerComments?: string;
}

export interface LeaveSearchRequest {
  employeeId?: string;
  departmentId?: string;
  leaveTypeId?: string;
  status?: LeaveRequestStatus;
  startDate?: string;
  endDate?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface LeaveListResponse {
  leaveRequests: LeaveRequest[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface LeaveStatistics {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalDaysTaken: number;
  averageLeaveDuration: number;
  popularLeaveTypes: { [key: string]: number };
  monthlyTrends: { month: string; requests: number; days: number }[];
}

export interface TeamLeaveCalendar {
  date: string;
  employees: {
    employeeId: string;
    employeeName: string;
    leaveType: string;
    status: LeaveRequestStatus;
  }[];
}

export interface LeavePolicy {
  policyId: string;
  name: string;
  description?: string;
  minAdvanceNoticeDays: number;
  maxConsecutiveDays: number;
  blackoutPeriods: {
    startDate: string;
    endDate: string;
    description: string;
  }[];
  approvalWorkflow: {
    level: number;
    approverRole: string;
    isRequired: boolean;
  }[];
  autoApprovalRules: {
    condition: string;
    maxDays: number;
  }[];
  isActive: boolean;
}