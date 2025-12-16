import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
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
  CreateLeaveTypeRequest,
  TeamRemainingLeaves,
  TeamRemainingLeavesResponse
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

  // Get leave requests for HR Manager (by organization)
  getLeaveRequestsForHR(searchRequest?: LeaveSearchRequest): Observable<LeaveListResponse> {
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

    return this.http.get<ApiResponse<LeaveListResponse>>(`${this.apiUrl}/requests/hr`, { params })
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

  updateLeaveRequest(requestId: string, request: CreateLeaveRequest): Observable<LeaveRequest> {
    return this.http.put<ApiResponse<LeaveRequest>>(`${this.apiUrl}/requests/${requestId}`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to update leave request');
          }
          return response.data!;
        })
      );
  }

  cancelLeaveRequest(requestId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/requests/${requestId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to cancel leave request');
          }
          return response.data!;
        })
      );
  }

  // Generic status update (if needed)
  // updateLeaveRequestStatus(requestId: string, status: UpdateLeaveRequestStatus): Observable<LeaveRequest> {
  //   const endpoint = status.status === LeaveStatus.APPROVED 
  //     ? `${this.apiUrl}/requests/${requestId}/approve`
  //     : `${this.apiUrl}/requests/${requestId}/reject`;
    
  //   const body = status.status === LeaveStatus.REJECTED 
  //     ? { rejectionReason: status.rejectionReason }
  //     : {};

  //   return this.http.put<ApiResponse<LeaveRequest>>(endpoint, body).pipe(
  //     switchMap(response => {
  //       if (!response.success) {
  //         throw new Error(response.message || 'Failed to update leave request status');
  //       }
  //       // now switchMap flattens the inner Observable<LeaveRequest>
  //       return this.getLeaveRequest(requestId);
  //     })
  //   );
  // }

  // cancelLeaveRequest(requestId: string): Observable<void> {
  //   return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/requests/${requestId}`)
  //     .pipe(
  //       map(response => {
  //         if (!response.success) {
  //           throw new Error(response.message || 'Failed to cancel leave request');
  //         }
  //       })
  //     );
  // }

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

  // getLeaveType(leaveTypeId: string): Observable<LeaveType> {
  //   return this.http.get<ApiResponse<LeaveType>>(`${this.apiUrl}/types/${leaveTypeId}`)
  //     .pipe(
  //       map(response => {
  //         if (!response.success) {
  //           throw new Error(response.message || 'Failed to fetch leave type');
  //         }
  //         return response.data!;
  //       })
  //     );
  // }

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

  // getEmployeeLeaveBalance(employeeId: string): Observable<LeaveBalance[]> {
  //   let params = new HttpParams().set('employeeId', employeeId);
    
  //   return this.http.get<ApiResponse<LeaveBalance[]>>(`${this.apiUrl}/balance`, { params })
  //     .pipe(
  //       map(response => {
  //         if (!response.success) {
  //           throw new Error(response.message || 'Failed to fetch employee leave balance');
  //         }
  //         return response.data!;
  //       })
  //     );
  // }

  // Leave Entitlements - Updated endpoint
  // getLeaveEntitlements(employeeId?: string, year?: number): Observable<LeaveEntitlement[]> {
  //   let params = new HttpParams();
  //   if (employeeId) params = params.set('employeeId', employeeId);
  //   if (year) params = params.set('year', year.toString());

  //   return this.http.get<ApiResponse<LeaveEntitlement[]>>(`${this.apiUrl}/entitlements`, { params })
  //     .pipe(
  //       map(response => {
  //         if (!response.success) {
  //           throw new Error(response.message || 'Failed to fetch leave entitlements');
  //         }
  //         return response.data!;
  //       })
  //     );
  // }

  // My Leave Requests - Uses the filtered endpoint
  // getMyLeaveRequests(employeeId?: string): Observable<LeaveRequest[]> {
  //   let params = new HttpParams();
  //   if (employeeId) {
  //     params = params.set('EmployeeId', employeeId);
  //   }

  //   return this.http.get<ApiResponse<LeaveListResponse>>(`${this.apiUrl}/requests`, { params })
  //     .pipe(
  //       map(response => {
  //         if (!response.success) {
  //           throw new Error(response.message || 'Failed to fetch my leave requests');
  //         }
  //         return response.data!.data;
  //       })
  //     );
  // }

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
  getLeaveCalendar(startDate: string, endDate: string): Observable<LeaveCalendarEvent[]> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
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

  // getLeaveSummary(startDate: string, endDate: string, departmentId?: string): Observable<LeaveSummary> {
  //   let params = new HttpParams()
  //     .set('startDate', startDate)
  //     .set('endDate', endDate);

  //   if (departmentId) params = params.set('departmentId', departmentId);

  //   return this.http.get<ApiResponse<LeaveSummary>>(`${this.apiUrl}/summary`, { params })
  //     .pipe(
  //       map(response => {
  //         if (!response.success) {
  //           throw new Error(response.message || 'Failed to fetch leave summary');
  //         }
  //         return response.data!;
  //       })
  //     );
  // }

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
    
    // Set time to midnight to avoid timezone issues
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0;
    }
    
    if (start > end) {
      return 0;
    }
    
    let count = 0;
    const currentDate = new Date(start);
    
    // Iterate through each day from start to end (inclusive)
    // Only count weekdays (Monday-Friday), exclude weekends (Saturday=6, Sunday=0)
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      
      // Exclude weekends: 0 = Sunday, 6 = Saturday
      // Only count Monday (1) through Friday (5) as working days
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        count++;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
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

  validateLeaveRequest(request: CreateLeaveRequest, balances: LeaveBalance[], leaveTypes: LeaveType[]): string[] {
    const errors: string[] = [];
    
    // Check if start date is in the future
    if (new Date(request.startDate) <= new Date()) {
      errors.push('Leave start date must be in the future');
    }

    // Check if end date is after start date
    if (new Date(request.endDate) < new Date(request.startDate)) {
      errors.push('Leave end date must be after start date');
    }

    // Check leave balance - find the leave type first, then match with balance
    const selectedLeaveType = leaveTypes.find(lt => lt.leaveTypeId === request.leaveTypeId);
    if (selectedLeaveType) {
      const balance = balances.find(b => b.leaveTypeName === selectedLeaveType.typeName);
      
      if (balance) {
        const requestedDays = this.calculateLeaveDays(request.startDate, request.endDate);
        if (requestedDays > balance.remainingDays) {
          errors.push(`Insufficient leave balance. Available: ${balance.remainingDays} days, Requested: ${requestedDays} days`);
        }
      }
    }

    return errors;
  }

  // Helper to convert dates to ISO format for API
  formatDateForApi(date: Date): string {
    return date.toISOString();
  }

  // Get team remaining leaves (for managers)
  getTeamRemainingLeaves(year?: number, employeeName?: string, page: number = 1, pageSize: number = 50, leaveTypeId?: string): Observable<TeamRemainingLeaves[]> {
    let params = new HttpParams();
    if (year) {
      params = params.set('year', year.toString());
    }
    if (employeeName) {
      params = params.set('employeeName', employeeName);
    }
    if (leaveTypeId) {
      params = params.set('leaveTypeId', leaveTypeId);
    }
    params = params.set('page', page.toString());
    params = params.set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<TeamRemainingLeavesResponse>>(`${this.apiUrl}/team/remaining-leaves`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            console.error('Failed to fetch team remaining leaves:', response.message);
            throw new Error(response.message || 'Failed to fetch team remaining leaves');
          }
          // Return the data array from the paginated response
          const result = response.data?.data || [];
          // Store pagination info in a way that can be accessed
          if (response.data) {
            (result as any).__pagination = {
              totalCount: response.data.totalCount || 0,
              page: response.data.page || page,
              pageSize: response.data.pageSize || pageSize
            };
          }
          console.log('Team remaining leaves response:', { 
            totalCount: response.data?.totalCount, 
            dataLength: result.length,
            page: response.data?.page,
            pageSize: response.data?.pageSize
          });
          return result;
        }),
        catchError(error => {
          console.error('Error fetching team remaining leaves:', error);
          return of([]);
        })
      );
  }

  // Helper to parse API date strings
  parseApiDate(dateString: string): Date {
    return new Date(dateString);
  }

  // Check for overlapping leave requests
  checkLeaveOverlap(startDate: string, endDate: string, excludeRequestId?: string): Observable<boolean> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    
    if (excludeRequestId) {
      params = params.set('excludeRequestId', excludeRequestId);
    }

    return this.http.get<ApiResponse<boolean>>(`${this.apiUrl}/check-overlap`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to check leave overlap');
          }
          return response.data!;
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Error checking leave overlap:', error);
          // Return false on error to allow form submission (backend will catch it)
          return of(false);
        })
      );
  }
}