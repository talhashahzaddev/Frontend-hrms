// Leave Request Models
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
  status: string; // API returns lowercase: 'pending', 'approved', 'rejected'
  submittedAt: string;
  approvedBy?: string;
  approverName?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Leave Status Enum - Matching API lowercase values
export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

// Leave Type Configuration - Adjusted to match API response
export interface LeaveType {
  leaveTypeId: string;
  typeName: string; // API uses 'typeName' not 'name'
  description?: string;
  maxDaysPerYear: number; // API uses 'maxDaysPerYear' not 'defaultDays'
  maxDaysPerRequest?: number;
  minDaysNotice?: number;
  advanceNoticeDays?: number;
  isPaid: boolean;
  carryForwardAllowed: boolean; // API uses 'carryForwardAllowed' not 'allowCarryForward'
  maxCarryForwardDays?: number;
  requiresApproval?: boolean;
  color: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Leave Entitlement for Employees - Adjusted to match API
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
  createdAt?: string;
  updatedAt?: string;
}

// Leave Balance - Adjusted to match API response structure
export interface LeaveBalance {
  leaveTypeName: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  color: string;
}

// Aggregated Leave Balance (wrapper for multiple entitlements)
export interface LeaveBalanceResponse {
  balances: LeaveBalance[];
  totalLeaveDays: number;
  totalUsedDays: number;
  totalRemainingDays: number;
}

// Request Creation Payload - Matches API request structure
export interface CreateLeaveRequest {
  leaveTypeId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  reason?: string;
  attachmentUrl?: string;
}

// Update Leave Request Status Payload
export interface UpdateLeaveRequestStatus {
  status: LeaveStatus;
  rejectionReason?: string;
}

// Search/Filter Parameters - Adjusted to match API query params
export interface LeaveSearchRequest {
  employeeId?: string;
  leaveTypeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// Paginated List Response - Matches API response structure
export interface LeaveListResponse {
  data: LeaveRequest[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Calendar Event Model
export interface LeaveCalendarEvent {
  requestId: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeColor?: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  status: string;
  reason?: string;
}

// Leave Summary Statistics
export interface LeaveSummary {
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  cancelledRequests: number;
  totalDaysRequested: number;
  totalDaysApproved: number;
  totalDaysRejected: number;
  leaveTypeBreakdown: LeaveTypeBreakdown[];
  periodStart: string;
  periodEnd: string;
}

// Leave Type Breakdown for Statistics
export interface LeaveTypeBreakdown {
  leaveTypeId: string;
  leaveTypeName: string;
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  totalDays: number;
  color: string;
}

// Leave Policy Configuration
export interface LeavePolicy {
  policyId: string;
  name: string;
  description?: string;
  leaveTypes: LeaveType[];
  carryForwardPolicy: CarryForwardPolicy;
  accrualPolicy: AccrualPolicy;
  approvalWorkflow: ApprovalWorkflow;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Carry Forward Policy Configuration
export interface CarryForwardPolicy {
  enabled: boolean;
  maxDays?: number;
  expiryMonths?: number;
  leaveTypeExceptions?: string[];
}

// Accrual Policy Configuration
export interface AccrualPolicy {
  type: 'immediate' | 'monthly' | 'quarterly' | 'annually';
  accrualRate?: number;
  startMonth?: number;
  prorationEnabled: boolean;
}

// Approval Workflow Configuration
export interface ApprovalWorkflow {
  requiresManagerApproval: boolean;
  requiresHRApproval: boolean;
  autoApprovalThreshold?: number;
  escalationDays?: number;
  approverRoles: string[];
}

// Holiday Calendar
export interface HolidayCalendar {
  holidayId: string;
  name: string;
  date: string;
  description?: string;
  isRecurring: boolean;
  isOptional: boolean;
  applicableRegions: string[];
  createdAt: string;
  updatedAt?: string;
}

// Leave Request History Entry
export interface LeaveRequestHistory {
  historyId: string;
  requestId: string;
  action: LeaveHistoryAction;
  performedBy: string;
  performedByName: string;
  previousStatus?: string;
  newStatus: string;
  comments?: string;
  timestamp: string;
}

// History Action Types
export enum LeaveHistoryAction {
  SUBMITTED = 'Submitted',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  CANCELLED = 'Cancelled',
  MODIFIED = 'Modified',
  WITHDRAWN = 'Withdrawn'
}

// Leave Request Detail
export interface LeaveRequestDetail extends LeaveRequest {
  employeeEmail?: string;
  employeeDepartment?: string;
  employeePosition?: string;
  approverEmail?: string;
  history?: LeaveRequestHistory[];
  overlappingRequests?: LeaveRequest[];
}

// Leave Analytics for Dashboard
export interface LeaveAnalytics {
  currentMonthRequests: number;
  currentMonthApprovals: number;
  averageResponseTime: number;
  mostUsedLeaveType: string;
  upcomingLeaves: LeaveRequest[];
  teamAvailability: TeamAvailability[];
}

// Team Availability Status
export interface TeamAvailability {
  date: string;
  availableEmployees: number;
  totalEmployees: number;
  onLeaveEmployees: LeaveRequest[];
  availabilityPercentage: number;
}

// Leave Export Request
export interface LeaveExportRequest {
  startDate: string;
  endDate: string;
  employeeIds?: string[];
  leaveTypeIds?: string[];
  statuses?: string[];
  format: 'csv' | 'xlsx' | 'pdf';
  includeHistory?: boolean;
}

// Leave Notification Preferences
export interface LeaveNotificationSettings {
  employeeId: string;
  emailOnSubmission: boolean;
  emailOnApproval: boolean;
  emailOnRejection: boolean;
  emailOnCancellation: boolean;
  emailBeforeLeaveStart: boolean;
  reminderDaysBefore: number;
  notifyManager: boolean;
}

// Leave Type Create/Update DTO
export interface CreateLeaveTypeRequest {
  typeName: string;
  description?: string;
  maxDaysPerYear: number;
  maxDaysPerRequest?: number;
  advanceNoticeDays?: number;
  isPaid: boolean;
  carryForwardAllowed: boolean;
  maxCarryForwardDays?: number;
  requiresApproval: boolean;
  color: string;
  isActive: boolean;
}

// Bulk Leave Approval/Rejection
export interface BulkLeaveActionRequest {
  requestIds: string[];
  action: 'approve' | 'reject';
  reason?: string;
}

// Leave Balance Adjustment
export interface LeaveBalanceAdjustment {
  employeeId: string;
  leaveTypeId: string;
  adjustmentDays: number;
  reason: string;
  adjustedBy: string;
  effectiveDate: string;
}

// Team Leave Summary for Managers
export interface TeamLeaveSummary {
  departmentId: string;
  departmentName: string;
  totalEmployees: number;
  onLeaveToday: number;
  pendingRequests: number;
  upcomingLeaves: number;
  leavesByType: { [key: string]: number };
}

// Leave Conflict Detection
export interface LeaveConflict {
  conflictType: 'overlap' | 'team_capacity' | 'blackout_period';
  message: string;
  conflictingRequests?: LeaveRequest[];
  suggestedAlternativeDates?: string[];
}

// Leave Request Validation Result
export interface LeaveRequestValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  conflicts?: LeaveConflict[];
}