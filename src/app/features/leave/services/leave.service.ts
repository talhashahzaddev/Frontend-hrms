import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
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
  LeaveStatus,
  CreateLeaveTypeRequest
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
      if (searchRequest.employeeId) params = params.set('EmployeeId', searchRequest.employeeId);
      if (searchRequest.leaveTypeId) params = params.set('LeaveTypeId', searchRequest.leaveTypeId);
      if (searchRequest.status) params = params.set('Status', searchRequest.status);
      if (searchRequest.startDate) params = params.set('StartDate', searchRequest.startDate);
      if (searchRequest.endDate) params = params.set('EndDate', searchRequest.endDate);
      if (searchRequest.sortBy) params = params.set('SortBy', searchRequest.sortBy);
      if (searchRequest.sortDirection) params = params.set('SortDirection', searchRequest.sortDirection);
      
      if (searchRequest.page) params = params.set('Page', searchRequest.page.toString());
      if (searchRequest.pageSize) params = params.set('PageSize', searchRequest.pageSize.toString());
    }

    return this.http.get<ApiResponse<LeaveListResponse>>(`${this.apiUrl}/requests`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch leave requests');
          }
          return response.data!;
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

  // createLeaveRequest(request: CreateLeaveRequest): Observable<LeaveRequest> {
  //   return this.http.post<ApiResponse<LeaveRequest>>(`${this.apiUrl}/requests`, request)
  //     .pipe(
  //       map(response => {
  //         if (!response.success) {
  //           throw new Error(response.message || 'Failed to create leave request');
  //         }
  //         return response.data!;
  //       })
  //     );
  // }

createLeaveRequest(request: CreateLeaveRequest): Observable<LeaveRequest> {
  return this.http.post<ApiResponse<LeaveRequest>>(`${this.apiUrl}/requests`, request)
    .pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to create leave request');
        }
        return response.data!;
      }),
      // ✅ catch backend error responses
      catchError((error: HttpErrorResponse) => {
        const backendMessage = error.error?.message || 'Something went wrong on the server';
        return throwError(() => new Error(backendMessage));
      })
    );
}








  // Updated: Using separate endpoints for approve/reject
  approveLeaveRequest(requestId: string): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/requests/${requestId}/approve`, {})
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to approve leave request');
          }
          return response.data!;
        })
      );
  }

  rejectLeaveRequest(requestId: string, rejectionReason?: string): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/requests/${requestId}/reject`, 
      { rejectionReason })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to reject leave request');
          }
          return response.data!;
        })
      );
  }

  // Generic status update (if needed)
  updateLeaveRequestStatus(requestId: string, status: UpdateLeaveRequestStatus): Observable<LeaveRequest> {
    const endpoint = status.status === LeaveStatus.APPROVED 
      ? `${this.apiUrl}/requests/${requestId}/approve`
      : `${this.apiUrl}/requests/${requestId}/reject`;
    
    const body = status.status === LeaveStatus.REJECTED 
      ? { rejectionReason: status.rejectionReason }
      : {};

    return this.http.put<ApiResponse<LeaveRequest>>(endpoint, body).pipe(
      switchMap(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to update leave request status');
        }
        // now switchMap flattens the inner Observable<LeaveRequest>
        return this.getLeaveRequest(requestId);
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

  // Leave Balance - Updated to match API response structure
  getMyLeaveBalance(): Observable<LeaveBalance[]> {
    return this.http.get<ApiResponse<LeaveBalance[]>>(`${this.apiUrl}/balance`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch leave balance');
          }
          return response.data!;
        })
      );
  }

  getEmployeeLeaveBalance(employeeId: string): Observable<LeaveBalance[]> {
    let params = new HttpParams().set('employeeId', employeeId);
    
    return this.http.get<ApiResponse<LeaveBalance[]>>(`${this.apiUrl}/balance`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch employee leave balance');
          }
          return response.data!;
        })
      );
  }

  // Leave Entitlements - Updated endpoint
  getLeaveEntitlements(employeeId?: string, year?: number): Observable<LeaveEntitlement[]> {
    let params = new HttpParams();
    if (employeeId) params = params.set('employeeId', employeeId);
    if (year) params = params.set('year', year.toString());

    return this.http.get<ApiResponse<LeaveEntitlement[]>>(`${this.apiUrl}/entitlements`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch leave entitlements');
          }
          return response.data!;
        })
      );
  }

  // My Leave Requests - Uses the filtered endpoint
  getMyLeaveRequests(employeeId?: string): Observable<LeaveRequest[]> {
    let params = new HttpParams();
    if (employeeId) {
      params = params.set('EmployeeId', employeeId);
    }

    return this.http.get<ApiResponse<LeaveListResponse>>(`${this.apiUrl}/requests`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch my leave requests');
          }
          return response.data!.data;
        })
      );
  }

  // Pending Approvals (for managers)
  getPendingApprovals(): Observable<LeaveRequest[]> {
    let params = new HttpParams().set('Status', 'pending');

    return this.http.get<ApiResponse<LeaveListResponse>>(`${this.apiUrl}/requests`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch pending approvals');
          }
          return response.data!.data;
        })
      );
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

  // 1️⃣ Fetch all leave requests for the currently logged-in employee
  getMyLeaveRequestsByToken(): Observable<LeaveRequest[]> {
  return this.http.get<ApiResponse<LeaveRequest[]>>(
    `${this.apiUrl}/getleaverequestbyemployeeid`
  ).pipe(
    map(response => {
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch logged-in user leave requests');
      }
      return response.data!;
    })
  );
}


  // 2️⃣ Create a new custom leave type (Super Admin / Manager only)
  createCustomLeaveType(request: CreateLeaveTypeRequest): Observable<string> {
    return this.http.post<ApiResponse<string>>(
      `${this.apiUrl}/types`,
      request
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to create leave type');
        }
        // API returns leaveTypeId as string
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
    return diffDays + 1;
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'primary';
      case 'pending':
        return 'accent';
      case 'rejected':
      case 'cancelled':
        return 'warn';
      default:
        return undefined;
    }
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'check_circle';
      case 'pending':
        return 'schedule';
      case 'rejected':
        return 'cancel';
      case 'cancelled':
        return 'block';
      default:
        return 'help_outline';
    }
  }

  getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  isLeaveRequestEditable(request: LeaveRequest): boolean {
    return request.status.toLowerCase() === 'pending' && 
           new Date(request.startDate) > new Date();
  }

  isLeaveRequestCancellable(request: LeaveRequest): boolean {
    const statusLower = request.status.toLowerCase();
    return (statusLower === 'approved' || statusLower === 'pending') &&
           new Date(request.startDate) > new Date();
  }

  validateLeaveRequest(request: CreateLeaveRequest, balances: LeaveBalance[]): string[] {
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
    const balance = balances.find(b => 
      b.leaveTypeName && request.leaveTypeId
    );
    
    if (balance) {
      const requestedDays = this.calculateLeaveDays(request.startDate, request.endDate);
      if (requestedDays > balance.remainingDays) {
        errors.push(`Insufficient leave balance. Available: ${balance.remainingDays} days, Requested: ${requestedDays} days`);
      }
    }

    return errors;
  }

  // Helper to convert dates to ISO format for API
  formatDateForApi(date: Date): string {
    return date.toISOString();
  }

  // Helper to parse API date strings
  parseApiDate(dateString: string): Date {
    return new Date(dateString);
  }
}