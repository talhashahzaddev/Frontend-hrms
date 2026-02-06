
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  Attendance,
  AttendanceSearchRequest,
  AttendanceListResponse,
  AttendanceSummary,
  AttendanceReport,
  AttendanceCalendarData,
  ClockInOutRequest,
  ManualAttendanceRequest,
  TimeTrackingSession,
  DailyAttendanceStats,
  AttendanceSessionDto,
  ShiftDto,
  AttendanceSession,
  DepartmentEmployee,
  UpdateShiftDto,
  ShiftSwap,
  EmployeeShift,
  PendingShiftSwap,
  approvedshiftRequest,
  AttendanceStatus,
  MonthlyTimesheetSummary,
  EmployeeTimesheetDto,
  TimesheetSearchRequest,
  TimesheetResponse,
  MonthlyTimesheetCreateDto,
  AttendanceUpdateRequestDto,
  FinalizedTimesheetRecordDto,
  FinalizedTimesheetDto,
  ProcessAttendanceRequestDto,
  PendingAttendanceRequest,
  EmployeeSubmissionPackage,
  CorrectionRecord,
  EmployeeReviewPackage,
  DailyReviewRecord,
  ManagerOverrideDto,
  OrgSubmissionProgress
} from '../../../core/models/attendance.models';
import { ApiResponse } from '../../../core/models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private readonly apiUrl = `${environment.apiUrl}/Attendance`;

  constructor(private http: HttpClient) { }

  // Clock In/Out Operations
  checkIn(request: ClockInOutRequest): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/clock-in`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Check-in failed');
          }
          return response.data!;
        })
      );
  }

  checkOut(request: ClockInOutRequest): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/clock-out`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Check-out failed');
          }
          return response.data!;
        })
      );
  }

  getCurrentSession(): Observable<TimeTrackingSession | null> {
    return this.http.get<ApiResponse<TimeTrackingSession>>(`${this.apiUrl}/current-session`)
      .pipe(
        map(response => {
          if (!response.success) {
            return null;
          }
          return response.data || null;
        })
      );
  }

  // Attendance CRUD Operations

  getAttendances(searchRequest: AttendanceSearchRequest): Observable<AttendanceListResponse> {
    let params = new HttpParams();

    if (searchRequest.employeeId) params = params.set('employeeId', searchRequest.employeeId);
    if (searchRequest.departmentId) params = params.set('departmentId', searchRequest.departmentId);
    if (searchRequest.status) params = params.set('status', searchRequest.status);
    if (searchRequest.sortBy) params = params.set('sortBy', searchRequest.sortBy);
    if (searchRequest.sortDirection) params = params.set('sortDirection', searchRequest.sortDirection);

    params = params.set('startDate', searchRequest.startDate);
    params = params.set('endDate', searchRequest.endDate);
    params = params.set('page', searchRequest.page.toString());
    params = params.set('pageSize', searchRequest.pageSize.toString());

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch attendance records');
          }
          const data = response.data!;
          return {
            attendances: data.data,
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

  getAttendance(attendanceId: string): Observable<Attendance> {
    return this.http.get<ApiResponse<Attendance>>(`${this.apiUrl}/${attendanceId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch attendance record');
          }
          return response.data!;
        })
      );
  }

  createManualAttendance(request: ManualAttendanceRequest): Observable<Attendance> {
    return this.http.post<ApiResponse<Attendance>>(`${this.apiUrl}/manual`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to create manual attendance');
          }
          return response.data!;
        })
      );
  }

  updateAttendance(attendanceId: string, updates: Partial<ManualAttendanceRequest>): Observable<Attendance> {
    return this.http.put<ApiResponse<Attendance>>(`${this.apiUrl}/${attendanceId}`, updates)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to update attendance');
          }
          return response.data!;
        })
      );
  }

  deleteAttendance(attendanceId: string): Observable<void> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${attendanceId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to delete attendance record');
          }
        })
      );
  }

  getManualAttendanceRecords(searchDto: any): Observable<Attendance[]> {
    let params = new HttpParams()
        .set('startDate', searchDto.startDate)
        .set('endDate', searchDto.endDate);
    
    if (searchDto.employeeId) {
        params = params.set('employeeId', searchDto.employeeId);
    }

    return this.http.get<ApiResponse<Attendance[]>>(`${this.apiUrl}/manual`, { params })
      .pipe(map(res => res.data!));
  }

  updateManualAttendance(updateDto: any): Observable<boolean> {
      return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/manual`, updateDto)
        .pipe(map(res => res.success));
  }

  // Employee-specific operations
  getMyAttendance(startDate: string, endDate: string): Observable<Attendance[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<ApiResponse<Attendance[]>>(`${this.apiUrl}/my-attendance`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch my attendance');
          }
          return response.data!;
        })
      );
  }

getCurrentShiftByEmployee(employeeId?: string): Observable<string | null> {
  return this.http
    .get<ApiResponse<{ shiftId: string }>>(
      `${this.apiUrl}/CurrentShift/${employeeId}`
    )
    .pipe(
      map(res => {
        if (!res.success) {
          throw new Error(res.message || 'Failed to load shift');
        }
        return res.data?.shiftId ?? null;
      })
    );
}




  getMyAttendanceSummary(startDate: string, endDate: string): Observable<AttendanceSummary> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<ApiResponse<AttendanceSummary>>(`${this.apiUrl}/my-summary`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch attendance summary');
          }
          return response.data!;
        })
      );
  }
  //Today chhhn

  getTodaySessions(): Observable<AttendanceSessionDto[]> {
    return this.http.get<ApiResponse<AttendanceSessionDto[]>>(`${this.apiUrl}/employeeSession`)
      .pipe(map(res => res.data || []));
  }


  getTodaySessionsById(employeeId: string, workDate?: string | Date): Observable<AttendanceSessionDto[]> {
    let url = `${this.apiUrl}/employeeSession/${employeeId}`;

    if (workDate) {
      const dateStr = (workDate instanceof Date)
        ? workDate.toISOString().split('T')[0] // format as 'YYYY-MM-DD'
        : workDate; // assume string is already formatted
      url += `?date=${dateStr}`;
    }

    return this.http.get<ApiResponse<AttendanceSessionDto[]>>(url)
      .pipe(map(res => res.data || []));
  }


  getCalendarSessionsById(employeeId: string, workDate?: string | Date): Observable<AttendanceSessionDto[]> {
    let url = `${this.apiUrl}/employeeSessionforcalendar/${employeeId}`;

    if (workDate) {
      const dateStr = (workDate instanceof Date)
        ? workDate.toISOString().split('T')[0] // format as 'YYYY-MM-DD'
        : workDate; // assume string is already formatted
      url += `?date=${dateStr}`;
    }

    return this.http.get<ApiResponse<AttendanceSessionDto[]>>(url)
      .pipe(map(res => res.data || []));
  }


  getEmployeeAttendanceSessions(
    pageNumber: number = 1,
    pageSize: number = 10,
    startDate: Date,
    endDate: Date
  ): Observable<AttendanceListResponse> {

    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString())
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    return this.http.get<ApiResponse<any>>(this.apiUrl + '/EmployeeAllAttendance', { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch employee attendance sessions');
          }
          const data = response.data!;
          return {
            attendances: data.data,
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

  getEmployeeAttendance(employeeId: string, startDate: string, endDate: string): Observable<Attendance[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<ApiResponse<Attendance[]>>(`${this.apiUrl}/employee/${employeeId}`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch employee attendance');
          }
          return response.data!;
        })
      );
  }

  // Calendar and Dashboard data
  getAttendanceCalendar(employeeId?: string, year?: number, month?: number): Observable<AttendanceCalendarData[]> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    if (month) params = params.set('month', month.toString());

    const url = employeeId
      ? `${this.apiUrl}/calendar/employee/${employeeId}`
      : `${this.apiUrl}/my-calendar`;

    return this.http.get<ApiResponse<AttendanceCalendarData[]>>(url, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch attendance calendar');
          }
          return response.data!;
        })
      );
  }

  getDailyAttendanceStats(date?: string): Observable<DailyAttendanceStats> {
    const params = date ? new HttpParams().set('date', date) : new HttpParams();

    return this.http.get<ApiResponse<DailyAttendanceStats>>(`${this.apiUrl}/daily-stats`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch daily attendance stats');
          }
          return response.data!;
        })
      );
  }


  getDepartmentEmployees(departmentId: string): Observable<DepartmentEmployee[]> {
    const params = new HttpParams().set('departmentId', departmentId);

    return this.http.get<ApiResponse<DepartmentEmployee[]>>(
      `${this.apiUrl}/departmentEmployees`,
      { params }
    )
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch department employees');
          }
          return response.data!;
        })
      );
  }


  // Reports
  getAttendanceReport(startDate: string, endDate: string, employeeId?: string, departmentId?: string, status?: string, pageNumber: number = 1, pageSize: number = 10): Observable<AttendanceReport> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate)
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (employeeId) params = params.set('employeeId', employeeId);
    if (departmentId) params = params.set('departmentId', departmentId);
    if (status) params = params.set('status', status);
    return this.http.get<ApiResponse<AttendanceReport>>(`${this.apiUrl}/reports`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to generate attendance report');
          }
          return response.data!;
        })
      );
  }

  exportAttendanceReport(startDate: string, endDate: string, format: 'csv' | 'xlsx' = 'xlsx', employeeId?: string): Observable<Blob> {
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


  //\create Shift 


  createShift(request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/shift`, request);
  }


  getShifts(): Observable<ShiftDto[]> {
    return this.http.get<ApiResponse<ShiftDto[]>>(`${this.apiUrl}/shifts`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch shifts');
          }
          return response.data || [];
        })
      );
  }


  assignShift(request: { employeeId: string; shiftId: string }): Observable<void> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/assign-shift`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to assign shift');
          }
          // No data needed, just return void
        })
      );
  }

  /** ✅ Get Employees by Shift ID */
  getEmployeesByShift(shiftId: string): Observable<EmployeeShift[]> {
    return this.http.get<ApiResponse<EmployeeShift[]>>(`${this.apiUrl}/shift/${shiftId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch employees for shift');
          }
          return response.data || [];
        })
      );
  }

  // ✅ Shift Swap API using model
  createShiftSwap(shiftSwap: ShiftSwap): Observable<any> {
    return this.http.post(`${this.apiUrl}/shiftswap`, shiftSwap);
  }

  /** ✅ Update an existing shift */
  updateShift(shiftId: string, updateDto: UpdateShiftDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/shift/${shiftId}`, updateDto);
  }


  deleteShift(shiftId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/shift/${shiftId}`);
  }



  getEmployeeShiftSwaps(employeeId: string): Observable<PendingShiftSwap[]> {
    return this.http.get<PendingShiftSwap[]>(
      `${this.apiUrl}/shiftswap/eemployeeShifts/${employeeId}`
    );
  }

  // Get all pending shift swap requests for Super Admin
  getPendingShiftSwapsForAdmin(): Observable<PendingShiftSwap[]> {
    return this.http.get<PendingShiftSwap[]>(`${this.apiUrl}/shiftswap/pending`);
  }

  // Get current shift for an employee by ID
  // Get current shift for an employee by ID
  getCurrentShift(employeeId: string): Observable<ShiftDto> {
    return this.http.get<ShiftDto>(`${this.apiUrl}/CurrentShift/${employeeId}`);
  }

  // New method for Calendar/Dialog that needs unwrapped data
  getCurrentShiftDetails(employeeId: string): Observable<ShiftDto> {
    return this.http.get<ApiResponse<ShiftDto>>(`${this.apiUrl}/CurrentShift/${employeeId}`)
      .pipe(map(response => response.data!));
  }

  //Approve or Reject Shift Swap Request
  approvedshiftRequest(request: approvedshiftRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/shiftswap/approve`, request);
  }


  // Department Attendance (for managers)
  getDepartmentAttendance(departmentId: string, date?: string): Observable<Attendance[]> {
    const params = date ? new HttpParams().set('date', date) : new HttpParams();

    return this.http.get<ApiResponse<Attendance[]>>(`${this.apiUrl}/department/${departmentId}`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch department attendance');
          }
          return response.data!;
        })
      );
  }

  // Bulk Operations
  bulkApproveAttendance(attendanceIds: string[]): Observable<void> {
    return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/bulk/approve`, { attendanceIds })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to approve attendance records');
          }
        })
      );
  }

  bulkRejectAttendance(attendanceIds: string[], reason?: string): Observable<void> {
    return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/bulk/reject`, { attendanceIds, reason })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to reject attendance records');
          }
        })
      );
  }

  // Utility methods
  calculateTotalHours(checkIn: string, checkOut: string, breakDuration: number = 0): number {
    const checkInTime = new Date(`2000-01-01T${checkIn}`);
    const checkOutTime = new Date(`2000-01-01T${checkOut}`);
    const diffInMinutes = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60);
    return Math.max(0, (diffInMinutes - breakDuration) / 60);
  }

  isLateArrival(checkInTime: string, shiftStartTime: string, gracePeriod: number = 0): boolean {
    const checkIn = new Date(`2000-01-01T${checkInTime}`);
    const shiftStart = new Date(`2000-01-01T${shiftStartTime}`);
    const graceEndTime = new Date(shiftStart.getTime() + gracePeriod * 60000);
    return checkIn > graceEndTime;
  }

  isEarlyDeparture(checkOutTime: string, shiftEndTime: string): boolean {
    const checkOut = new Date(`2000-01-01T${checkOutTime}`);
    const shiftEnd = new Date(`2000-01-01T${shiftEndTime}`);
    return checkOut < shiftEnd;
  }

  formatDuration(hours: number): string {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  }

  getAttendanceStatusColor(status: AttendanceStatus): string {
    switch (status) {
      case AttendanceStatus.PRESENT: return 'success';
      case AttendanceStatus.ABSENT: return 'danger';
      case AttendanceStatus.LATE: return 'warning';
      case AttendanceStatus.EARLY_DEPARTURE: return 'warning';
      case AttendanceStatus.HALF_DAY: return 'info';
      case AttendanceStatus.ON_LEAVE: return 'info';
      case AttendanceStatus.HOLIDAY: return 'secondary';
      case AttendanceStatus.PENDING_APPROVAL: return 'warning';
      default: return 'secondary';
    }
  }

  // Timesheet Methods - Snapshot-based
  // GET /api/attendance/timesheet - Returns list of monthly timesheet snapshots
  getMonthlyTimesheets(startDate?: string, endDate?: string): Observable<MonthlyTimesheetSummary[]> {
    let params = new HttpParams();
    
    // Only add date parameters if they are valid non-empty strings
    if (startDate && startDate.trim() !== '') {
      params = params.set('startDate', startDate);
    }
    if (endDate && endDate.trim() !== '') {
      params = params.set('endDate', endDate);
    }

    // Construct the full URL for logging
    const baseUrl = `${this.apiUrl}/timesheet`;
    const queryString = params.toString();
    const fullUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    
    console.log('📊 Fetching timesheets from:', fullUrl);
    console.log('📅 Date range:', { startDate: startDate || 'N/A', endDate: endDate || 'N/A' });

    return this.http.get<ApiResponse<MonthlyTimesheetSummary[]>>(`${this.apiUrl}/timesheet`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch timesheets');
          }
          console.log('✅ Received', response.data?.length || 0, 'timesheet snapshots');
          return response.data || [];
        })
      );
  }

  // Alias method for fetching all monthly snapshots without date filtering
  getSnapshots(): Observable<MonthlyTimesheetSummary[]> {
    return this.getMonthlyTimesheets(); // Call without parameters to get all snapshots
  }

  // GET /api/attendance/timesheet/details?timesheetId={timesheetId}
  // Returns detailed employee records for a specific timesheet snapshot
  getTimesheetDetails(timesheetId: string): Observable<EmployeeTimesheetDto[]> {
    if (!timesheetId || timesheetId.trim() === '') {
      throw new Error('Timesheet ID is required');
    }

    const params = new HttpParams().set('timesheetId', timesheetId);
    const fullUrl = `${this.apiUrl}/timesheet/details?timesheetId=${timesheetId}`;
    
    console.log('📋 Fetching timesheet details from:', fullUrl);

    return this.http.get<ApiResponse<EmployeeTimesheetDto[]>>(
      `${this.apiUrl}/timesheet/details`,
      { params }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch timesheet details');
        }
        console.log('✅ Received details for', response.data?.length || 0, 'employees');
        return response.data || [];
      })
    );
  }

  // Snapshot Management Methods
  // POST /api/attendance/timesheet/snapshot - Creates a new monthly timesheet snapshot
  createSnapshot(dto: MonthlyTimesheetCreateDto): Observable<FinalizedTimesheetDto> {
    console.log('📸 Creating snapshot:', dto);
    
    return this.http.post<ApiResponse<FinalizedTimesheetDto>>(
      `${this.apiUrl}/timesheet/snapshot`,
      dto
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to create timesheet snapshot');
        }
        console.log('✅ Snapshot created successfully:', response.data);
        return response.data!;
      })
    );
  }

  submitEditRequest(dto: AttendanceUpdateRequestDto): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/request-update`,
      dto
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to submit edit request');
        }
        return response.data || true;
      })
    );
  }

  // POST /api/attendance/timesheet/submit-approvals - Employee submits draft edits for approval
  submitTimesheetApprovals(timesheetId: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/timesheet/submit-approvals`,
      { timesheetId }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to submit timesheet approvals');
        }
        return response.data || true;
      })
    );
  }

  // POST /api/attendance/timesheet/finalize-batch - Finalizes a timesheet snapshot for payroll
  finalizeBatch(timesheetId: string): Observable<boolean> {
    console.log('🔒 Finalizing batch for timesheetId:', timesheetId);
    
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/timesheet/finalize-batch`,
      { timesheetId: timesheetId } // Match backend FinalizeBatchRequestDto structure
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to finalize timesheet batch');
        }
        console.log('✅ Batch finalized successfully');
        return response.data || true;
      })
    );
  }

  // Get pending attendance correction requests for manager (grouped by employee)
  getPendingAttendanceRequests(): Observable<EmployeeSubmissionPackage[]> {
    return this.http.get<ApiResponse<EmployeeSubmissionPackage[]>>(
      `${this.apiUrl}/pending-requests`
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch pending requests');
        }
        return response.data || [];
      })
    );
  }

  // Process (approve/reject) attendance correction request
  processEditRequest(dto: ProcessAttendanceRequestDto): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/process-request`,
      dto
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to process attendance request');
        }
        return response.data || false;
      })
    );
  }

  // Approve all pending correction requests for a timesheet
  approveAllPendingRequests(timesheetId: string, employeeId?: string): Observable<{ approvedCount: number }> {
    const body: { timesheetId: string; employeeId?: string } = { timesheetId };
    if (employeeId) {
      body.employeeId = employeeId;
    }
    return this.http.post<ApiResponse<{ approvedCount: number }>>(
      `${this.apiUrl}/timesheet/approve-all`,
      body
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to approve pending requests');
        }
        return response.data || { approvedCount: 0 };
      })
    );
  }

  // Task 1: Get organization submission progress for compliance tracking
  getOrgSubmissionProgress(month: number, year: number): Observable<OrgSubmissionProgress> {
    const params = new HttpParams()
      .set('month', month.toString())
      .set('year', year.toString());
    
    return this.http.get<ApiResponse<OrgSubmissionProgress>>(
      `${this.apiUrl}/timesheet/org-progress`,
      { params }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch organization progress');
        }
        // Calculate rates if not provided by backend
        const data = response.data!;
        if (data.submissionRate === undefined && data.totalEmployees > 0) {
          data.submissionRate = ((data.finalizedCount + data.submittedCount) / data.totalEmployees) * 100;
        }
        if (data.complianceRate === undefined && data.totalEmployees > 0) {
          data.complianceRate = (data.finalizedCount / data.totalEmployees) * 100;
        }
        return data;
      })
    );
  }

  // Get manager review dashboard with all employee packages
  getManagerReviewDashboard(timesheetId: string): Observable<EmployeeReviewPackage[]> {
    // Validate timesheetId before making network call
    if (!timesheetId || timesheetId === '00000000-0000-0000-0000-000000000000') {
      throw new Error('Invalid Timesheet ID');
    }
    
    return this.http.get<ApiResponse<EmployeeReviewPackage[]>>(
      `${this.apiUrl}/timesheet/review-dashboard`,
      { params: { timesheetId } }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch manager review dashboard');
        }
        return response.data || [];
      })
    );
  }

  // Get single employee review package for the detail dialog
  // API returns array with one element when employeeId is provided
  getEmployeeReviewPackage(timesheetId: string, employeeId: string): Observable<EmployeeReviewPackage> {
    if (!timesheetId || timesheetId === '00000000-0000-0000-0000-000000000000') {
      throw new Error('Invalid timesheetId provided');
    }
    
    return this.http.get<ApiResponse<EmployeeReviewPackage[]>>(
      `${this.apiUrl}/timesheet/review-dashboard`,
      { params: { timesheetId, employeeId } }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch employee review data');
        }
        // API returns array, get first element
        const packages = response.data || [];
        if (packages.length === 0) {
          throw new Error('No attendance data found for this employee');
        }
        return packages[0];
      })
    );
  }

  // Finalize all approved records for a specific employee
  finalizeEmployeeApprovals(timesheetId: string, employeeId: string): Observable<{ finalizedCount: number }> {
    return this.http.post<ApiResponse<{ finalizedCount: number }>>(
      `${this.apiUrl}/timesheet/finalize-employee`,
      { timesheetId, employeeId }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to finalize employee approvals');
        }
        return response.data || { finalizedCount: 0 };
      })
    );
  }

  // Apply manager override for a specific attendance record
  applyManagerOverride(dto: ManagerOverrideDto): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/timesheet/manager-override`,
      dto
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to apply manager override');
        }
        return response.data || true;
      })
    );
  }
}
