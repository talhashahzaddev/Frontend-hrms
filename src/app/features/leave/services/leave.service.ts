import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  LeaveRequest,
  LeaveType,
  LeaveEntitlement,
  LeaveBalance,
  CreateLeaveRequest,
  UpdateLeaveRequestStatus,
  LeaveSearchRequest,
  LeaveListResponse,
  LeaveCalendarEvent,
  LeaveSummary,
  LeaveStatus
} from '../../../core/models/leave.models';
import { ApiResponse } from '../../../core/models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class LeaveService {
  private readonly apiUrl = `${environment.apiUrl}/Leave`;

  constructor(private http: HttpClient) { }

  // Leave Request Operations
  getLeaveRequests(searchRequest?: LeaveSearchRequest): Observable<LeaveListResponse> {
    let params = new HttpParams();
    
    if (searchRequest) {
      if (searchRequest.employeeId) params = params.set('employeeId', searchRequest.employeeId);
      if (searchRequest.leaveTypeId) params = params.set('leaveTypeId', searchRequest.leaveTypeId);
      if (searchRequest.status) params = params.set('status', searchRequest.status);
      if (searchRequest.startDate) params = params.set('startDate', searchRequest.startDate);
      if (searchRequest.endDate) params = params.set('endDate', searchRequest.endDate);
      if (searchRequest.sortBy) params = params.set('sortBy', searchRequest.sortBy);
      if (searchRequest.sortDirection) params = params.set('sortDirection', searchRequest.sortDirection);
      
      params = params.set('page', searchRequest.page.toString());
      params = params.set('pageSize', searchRequest.pageSize.toString());
    }

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/requests`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch leave requests');
          }
          const data = response.data!;
          return {
            leaveRequests: data.data,
            totalCount: data.totalCount,
            page: data.page,
            pageSize: data.pageSize,
            totalPages: data.totalPages,
            hasNextPage: data.hasNextPage,
            hasPreviousPage: data.hasPreviousPage
          };
        })
      );
  }

  getLeaveRequest(requestId: string): Observable<LeaveRequest> {
    return this.http.get<ApiResponse<LeaveRequest>>(`${this.apiUrl}/requests/${requestId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch leave request');
          }
          return response.data!;
        })
      );
  }

  createLeaveRequest(request: CreateLeaveRequest): Observable<LeaveRequest> {
    return this.http.post<ApiResponse<LeaveRequest>>(`${this.apiUrl}/requests`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to create leave request');
          }
          return response.data!;
        })
      );
  }

  updateLeaveRequestStatus(requestId: string, status: UpdateLeaveRequestStatus): Observable<LeaveRequest> {
    return this.http.put<ApiResponse<LeaveRequest>>(`${this.apiUrl}/requests/${requestId}/status`, status)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to update leave request status');
          }
          return response.data!;
        })
      );
  }

  cancelLeaveRequest(requestId: string): Observable<void> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/requests/${requestId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to cancel leave request');
          }
        })
      );
  }

  // Leave Types
  getLeaveTypes(): Observable<LeaveType[]> {
    return this.http.get<ApiResponse<LeaveType[]>>(`${this.apiUrl}/types`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch leave types');
          }
          return response.data!;
        })
      );
  }

  getLeaveType(leaveTypeId: string): Observable<LeaveType> {
    return this.http.get<ApiResponse<LeaveType>>(`${this.apiUrl}/types/${leaveTypeId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch leave type');
          }
          return response.data!;
        })
      );
  }

  // Leave Balance and Entitlements
  getMyLeaveBalance(): Observable<LeaveBalance> {
    return this.http.get<ApiResponse<LeaveBalance>>(`${this.apiUrl}/balance`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch leave balance');
          }
          return response.data!;
        })
      );
  }

  getEmployeeLeaveBalance(employeeId: string): Observable<LeaveBalance> {
    return this.http.get<ApiResponse<LeaveBalance>>(`${this.apiUrl}/employee/${employeeId}/balance`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch employee leave balance');
          }
          return response.data!;
        })
      );
  }

  getLeaveEntitlements(employeeId?: string, year?: number): Observable<LeaveEntitlement[]> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());

    const url = employeeId 
      ? `${this.apiUrl}/employee/${employeeId}/entitlements`
      : `${this.apiUrl}/my-entitlements`;

    return this.http.get<ApiResponse<LeaveEntitlement[]>>(url, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch leave entitlements');
          }
          return response.data!;
        })
      );
  }

  // My Leave Requests
  getMyLeaveRequests(): Observable<LeaveRequest[]> {
    return this.http.get<ApiResponse<LeaveRequest[]>>(`${this.apiUrl}/my-requests`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch my leave requests');
          }
          return response.data!;
        })
      );
  }

  // Pending Approvals (for managers)
  getPendingApprovals(): Observable<LeaveRequest[]> {
    return this.http.get<ApiResponse<LeaveRequest[]>>(`${this.apiUrl}/pending-approvals`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch pending approvals');
          }
          return response.data!;
        })
      );
  }

  approveLeaveRequest(requestId: string): Observable<LeaveRequest> {
    return this.updateLeaveRequestStatus(requestId, { status: LeaveStatus.APPROVED });
  }

  rejectLeaveRequest(requestId: string, rejectionReason: string): Observable<LeaveRequest> {
    return this.updateLeaveRequestStatus(requestId, { 
      status: LeaveStatus.REJECTED, 
      rejectionReason 
    });
  }

  // Calendar and Reports
  getLeaveCalendar(startDate: string, endDate: string, departmentId?: string): Observable<LeaveCalendarEvent[]> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    if (departmentId) params = params.set('departmentId', departmentId);

    return this.http.get<ApiResponse<LeaveCalendarEvent[]>>(`${this.apiUrl}/calendar`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch leave calendar');
          }
          return response.data!;
        })
      );
  }

  getLeaveSummary(startDate: string, endDate: string, departmentId?: string): Observable<LeaveSummary> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    if (departmentId) params = params.set('departmentId', departmentId);

    return this.http.get<ApiResponse<LeaveSummary>>(`${this.apiUrl}/summary`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch leave summary');
          }
          return response.data!;
        })
      );
  }

  // Export Operations
  exportLeaveReport(startDate: string, endDate: string, format: 'csv' | 'xlsx' = 'xlsx', employeeId?: string): Observable<Blob> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate)
      .set('format', format);

    if (employeeId) params = params.set('employeeId', employeeId);

    return this.http.get(`${this.apiUrl}/export`, { 
      params, 
      responseType: 'blob' 
    });
  }

  // Utility methods
  calculateLeaveDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end dates
  }

  getStatusColor(status: LeaveStatus): 'primary' | 'accent' | 'warn' | undefined {
    switch (status) {
      case LeaveStatus.APPROVED:
        return 'primary';
      case LeaveStatus.PENDING:
        return 'accent';
      case LeaveStatus.REJECTED:
      case LeaveStatus.CANCELLED:
        return 'warn';
      default:
        return undefined;
    }
  }

  getStatusIcon(status: LeaveStatus): string {
    switch (status) {
      case LeaveStatus.APPROVED:
        return 'check_circle';
      case LeaveStatus.PENDING:
        return 'schedule';
      case LeaveStatus.REJECTED:
        return 'cancel';
      case LeaveStatus.CANCELLED:
        return 'block';
      default:
        return 'help_outline';
    }
  }

  isLeaveRequestEditable(request: LeaveRequest): boolean {
    return request.status === LeaveStatus.PENDING && 
           new Date(request.startDate) > new Date();
  }

  isLeaveRequestCancellable(request: LeaveRequest): boolean {
    return (request.status === LeaveStatus.APPROVED || request.status === LeaveStatus.PENDING) &&
           new Date(request.startDate) > new Date();
  }

  validateLeaveRequest(request: CreateLeaveRequest, entitlements: LeaveEntitlement[]): string[] {
    const errors: string[] = [];
    
    // Check if start date is in the future
    if (new Date(request.startDate) <= new Date()) {
      errors.push('Leave start date must be in the future');
    }

    // Check if end date is after start date
    if (new Date(request.endDate) < new Date(request.startDate)) {
      errors.push('Leave end date must be after start date');
    }

    // Check leave balance
    const entitlement = entitlements.find(e => e.leaveTypeId === request.leaveTypeId);
    if (entitlement) {
      const requestedDays = this.calculateLeaveDays(request.startDate, request.endDate);
      if (requestedDays > entitlement.remainingDays) {
        errors.push(`Insufficient leave balance. Available: ${entitlement.remainingDays} days, Requested: ${requestedDays} days`);
      }
    }

    return errors;
  }
}

