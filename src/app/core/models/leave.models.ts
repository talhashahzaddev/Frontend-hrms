export interface LeaveRequest {
  requestId: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason?: string;
  attachmentUrl?: string;
  status: LeaveStatus;
  submittedAt: string;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export interface LeaveType {
  leaveTypeId: string;
  typeName: string;
  description?: string;
  maxDaysPerYear: number;
  isPaid: boolean;
  carryForwardAllowed: boolean;
  maxCarryForwardDays: number;
  requiresApproval: boolean;
  advanceNoticeDays: number;
  color: string;
  isActive: boolean;
  createdAt: string;
}

export interface LeaveEntitlement {
  entitlementId: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  carryForwardDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  entitlements: LeaveEntitlement[];
  totalLeaveDays: number;
  totalUsedDays: number;
  totalRemainingDays: number;
}

export interface CreateLeaveRequest {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  attachmentUrl?: string;
}

export interface UpdateLeaveRequestStatus {
  status: LeaveStatus;
  rejectionReason?: string;
}

export interface LeaveSearchRequest {
  employeeId?: string;
  leaveTypeId?: string;
  status?: LeaveStatus;
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

export interface LeaveCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  color: string;
  employeeName: string;
  leaveType: string;
  status: LeaveStatus;
}

export interface LeaveSummary {
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  totalDaysRequested: number;
  totalDaysApproved: number;
  leaveTypeBreakdown: { [leaveType: string]: number };
}

export interface LeavePolicy {
  policyId: string;
  name: string;
  description?: string;
  leaveTypes: LeaveType[];
  carryForwardPolicy: string;
  accrualPolicy: string;
  approvalWorkflow: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayCalendar {
  holidayId: string;
  name: string;
  date: string;
  description?: string;
  isRecurring: boolean;
  isOptional: boolean;
  applicableRegions: string[];
  createdAt: string;
}