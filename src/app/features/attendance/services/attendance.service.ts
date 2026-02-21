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
  OfficeIP,
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
  OrgSubmissionProgress,
  ManualAttendanceUpdateDto
} from '../../../core/models/attendance.models';
import { ApiResponse } from '../../../core/models/auth.models';
import { FinalizeBatchRequestDto } from '../models/finalize-batch-request.dto';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private readonly apiUrl = `${environment.apiUrl}/Attendance`;
  private readonly ipUrl = `${environment.apiUrl}/IpAddress`;

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

  /** âœ… Get Employees by Shift ID */
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

  // âœ… Shift Swap API using model
  createShiftSwap(shiftSwap: ShiftSwap): Observable<any> {
    return this.http.post(`${this.apiUrl}/shiftswap`, shiftSwap);
  }

  /** âœ… Update an existing shift */
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
  // Office IP Management
  getOfficeIPs(): Observable<OfficeIP[]> {
    return this.http.get<ApiResponse<OfficeIP[]>>(`${this.ipUrl}/office-ips`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch office IPs');
          }
          return response.data || [];
        })
      );
  }

  createOfficeIP(officeIP: Omit<OfficeIP, 'id' | 'createdAt' | 'updatedAt'>): Observable<OfficeIP> {
    return this.http.post<ApiResponse<OfficeIP>>(`${this.ipUrl}/create-ip`, officeIP)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to create office IP');
          }
          return response.data!;
        })
      );
  }

  updateOfficeIP(id: string, officeIP: Partial<OfficeIP>): Observable<OfficeIP> {
    return this.http.put<ApiResponse<OfficeIP>>(`${this.ipUrl}/update/${id}`, officeIP)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to update office IP');
          }
          return response.data!;
        })
      );
  }

  deleteOfficeIP(id: string): Observable<void> {
    return this.http.delete<ApiResponse<boolean>>(`${this.ipUrl}/delete/${id}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to delete office IP');
          }
        })
      );
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
    
    console.log('ðŸ“Š Fetching timesheets from:', fullUrl);
    console.log('ðŸ“… Date range:', { startDate: startDate || 'N/A', endDate: endDate || 'N/A' });

    return this.http.get<ApiResponse<MonthlyTimesheetSummary[]>>(`${this.apiUrl}/timesheet`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch timesheets');
          }
          console.log('âœ… Received', response.data?.length || 0, 'timesheet snapshots');
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
    
    console.log('ðŸ“‹ Fetching timesheet details from:', fullUrl);

    return this.http.get<ApiResponse<EmployeeTimesheetDto[]>>(
      `${this.apiUrl}/timesheet/details`,
      { params }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch timesheet details');
        }
        console.log('âœ… Received details for', response.data?.length || 0, 'employees');
        // Normalize daily records to handle PascalCase flags from .NET backend
        const employees = response.data || [];
        employees.forEach((emp: any) => {
          // ── Employee-level field normalization ──────────────────────────────
          // .NET serializes snake_case columns as camelCase or PascalCase.
          // Ensure is_finalized is always present at the employee level.
          if (emp.is_finalized === undefined) {
            emp.is_finalized = emp.isFinalized ?? emp.IsFinalized ?? false;
          }
          // ── Daily record normalization ──────────────────────────────────────
          if (emp.dailyRecords?.length) {
            emp.dailyRecords = emp.dailyRecords.map((r: any) => {
              return {
                ...r,
                attendanceId: r.attendanceId || r.AttendanceId || undefined,
                date: r.date || r.Date || r.workDate || r.WorkDate || '',
                checkInTime: r.checkInTime || r.CheckInTime || undefined,
                checkOutTime: r.checkOutTime || r.CheckOutTime || undefined,
                status: r.status || r.Status || 'No Record',
                totalHours: r.totalHours ?? r.TotalHours ?? 0,
                notes: r.notes || r.Notes || undefined,
                is_finalized: r.is_finalized ?? r.isFinalized ?? r.IsFinalized ?? false,
                is_manager_override: r.is_manager_override ?? r.isManagerOverride ?? r.IsManagerOverride ?? false,
                hasApprovedRequest: r.has_approved_request || r.hasApprovedRequest || r.HasApprovedRequest || false,
                hasDraftRequest: r.has_draft_request || r.hasDraftRequest || r.HasDraftRequest || false,
                // Draft wins â€” a record cannot be both draft AND pending
                hasPendingRequest: (r.has_pending_request || r.hasPendingRequest || r.HasPendingRequest || false)
                  && !(r.has_draft_request || r.hasDraftRequest || r.HasDraftRequest),
              };
            });
          }
        });
        return employees;
      })
    );
  }

  // Snapshot Management Methods
  // POST /api/attendance/timesheet/snapshot - Creates a new monthly timesheet snapshot
  createSnapshot(dto: MonthlyTimesheetCreateDto): Observable<FinalizedTimesheetDto> {
    console.log('ðŸ“¸ Creating snapshot:', dto);
    
    return this.http.post<ApiResponse<FinalizedTimesheetDto>>(
      `${this.apiUrl}/timesheet/snapshot`,
      dto
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to create timesheet snapshot');
        }
        console.log('âœ… Snapshot created successfully:', response.data);
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
  // Scoped to a single employee via { timesheetId, employeeId } DTO
  /**
   * @deprecated Use `submitTimesheetBatch(timesheetId)` instead.
   *
   * This method sends `employeeId` in the request body, but the backend
   * resolves the employee from the JWT token and ignores the `employeeId`
   * parameter entirely. It is therefore a functional duplicate of
   * `submitTimesheetBatch`. Kept for backwards compatibility only — do not
   * call from new code.
   */
  submitTimesheetApprovals(timesheetId: string, _employeeId: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/timesheet/submit-approvals`,
      { timesheetId }  // employeeId intentionally omitted — backend ignores it
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
  // Accepts optional employeeId to scope finalization to a single employee
  finalizeBatch(timesheetId: string, employeeId?: string): Observable<boolean> {
    console.log('ðŸ”’ Finalizing batch for timesheetId:', timesheetId, employeeId ? `employeeId: ${employeeId}` : '(all employees)');
    
    const body: { timesheetId: string; employeeId?: string } = { timesheetId };
    if (employeeId) {
      body.employeeId = employeeId;
    }

    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/timesheet/finalize-batch`,
      body
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to finalize timesheet batch');
        }
        console.log('âœ… Batch finalized successfully');
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

      const raw = response.data ?? {} as any;

      const total          = Number(raw.totalEmployees     ?? 0);
      const finalized      = Number(raw.finalizedCount     ?? 0);
      const submitted      = Number(raw.submittedCount     ?? 0);
      const pendingReview  = Number(raw.pendingReviewCount ?? 0);
      const inProgress     = Number(raw.inProgressCount    ?? 0);
      const untouched      = Number(raw.untouchedCount     ?? 0);

      const submissionRate = raw.submissionRate != null
        ? Number(raw.submissionRate)
        : (total > 0 ? Math.round(((finalized + submitted) / total) * 100 * 10) / 10 : 0);

      const complianceRate = raw.complianceRate != null
        ? Number(raw.complianceRate)
        : (total > 0 ? Math.round((finalized / total) * 100 * 10) / 10 : 0);

      const result: OrgSubmissionProgress = {
        month:             Number(raw.month  ?? month),
        year:              Number(raw.year   ?? year),
        totalEmployees:    total,
        finalizedCount:    finalized,
        submittedCount:    submitted,
        pendingReviewCount: pendingReview,
        inProgressCount:   inProgress,
        untouchedCount:    untouched,
        submissionRate,
        complianceRate
      };

      return result;
    })
  );
}
  getManagerReviewDashboard(timesheetId: string): Observable<EmployeeReviewPackage[]> {
    // Validate timesheetId before making network call
    if (!timesheetId || timesheetId === '00000000-0000-0000-0000-000000000000') {
      throw new Error('Invalid Timesheet ID');
    }   
    return this.http.get<ApiResponse<EmployeeReviewPackage[]>>(
      `${this.apiUrl}/timesheet/review-dashboard`,
      { params: { timesheetId, _t: Date.now().toString() } }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch manager review dashboard');
        }
        const packages = response.data || [];
        return packages.map((pkg: any) => {
          // Handle PascalCase key from .NET: FullMonthRecords vs fullMonthRecords
          const rawRecords = pkg.fullMonthRecords || pkg.FullMonthRecords || [];

          // Normalize ALL package-level numeric/boolean fields that .NET sends in
          // PascalCase. A plain { ...pkg } spread copies them as PascalCase keys but
          // the TypeScript interface (and all template bindings) use camelCase, so
          // without explicit mapping those values are always undefined.
          const pkgIsFinalized: boolean =
            (pkg as any).isFinalized ?? (pkg as any).IsFinalized ?? (pkg as any).is_finalized ?? false;
          const pkgPending: number =
            (pkg as any).pendingRequestCount ?? (pkg as any).PendingRequestCount ?? 0;
          const pkgApproved: number =
            (pkg as any).approvedCount ?? (pkg as any).ApprovedCount ?? 0;
          const pkgRejected: number =
            (pkg as any).rejectedCount ?? (pkg as any).RejectedCount ?? 0;
          const pkgFinalizedCount: number =
            (pkg as any).finalizedCount ?? (pkg as any).FinalizedCount ?? 0;
          const pkgFinalizedDays: number =
            (pkg as any).finalizedDays ?? (pkg as any).FinalizedDays ?? pkgFinalizedCount;
          const pkgTotalRecords: number =
            (pkg as any).totalRecords ?? (pkg as any).TotalRecords ?? 0;

          return {
            ...pkg,
            // Explicit camelCase values override whatever PascalCase keys the spread copied.
            isFinalized:          pkgIsFinalized,
            pendingRequestCount:  pkgPending,
            approvedCount:        pkgApproved,
            rejectedCount:        pkgRejected,
            finalizedCount:       pkgFinalizedCount,
            finalizedDays:        pkgFinalizedDays,
            totalRecords:         pkgTotalRecords,
            fullMonthRecords: rawRecords.map((r: any) => this.normalizeDailyReviewRecord(r))
          };
        });
      })
    );
  }

  /**
   * Normalize a raw API daily record to the DailyReviewRecord interface.
   * Maps checkInTimeâ†’originalCheckIn, checkOutTimeâ†’originalCheckOut, statusâ†’originalStatus
   * while preserving any fields that already use the correct names.
   */
  /**
   * Extract attendanceId with case-insensitive fallback.
   * .NET backends may serialize as AttendanceId (PascalCase) or attendanceId (camelCase).
   */
  private extractAttendanceId(r: any): string {
    return r.attendanceId || r['AttendanceId'] || r['attendanceid'] || r['Attendanceid'] || '';
  }

  private normalizeDailyReviewRecord(r: any): DailyReviewRecord {
    const resolvedAttendanceId = this.extractAttendanceId(r);
    return {
      recordId: r.recordId || r.RecordId || r.requestId || r.RequestId || '',
      attendanceId: resolvedAttendanceId,
      date: r.date || r.workDate || r.Date || r.WorkDate || '',
      originalCheckIn: r.originalCheckIn || r.checkInTime || r.CheckInTime || undefined,
      originalCheckOut: r.originalCheckOut || r.checkOutTime || r.CheckOutTime || undefined,
      originalStatus: r.originalStatus || r.status || r.Status || 'No Record',
      originalTotalHours: r.originalTotalHours || r.totalHours || r.TotalHours || 0,
      requestedCheckIn: r.requestedCheckIn || r.RequestedCheckIn || undefined,
      requestedCheckOut: r.requestedCheckOut || r.RequestedCheckOut || undefined,
      requestedStatus: r.requestedStatus || r.RequestedStatus || undefined,
      requestedNotes: r.requestedNotes || r.RequestedNotes || undefined,
      reasonForEdit: r.reasonForEdit || r.ReasonForEdit || undefined,
      // Map draft first so we can guard pending against it
      hasDraftRequest: r.has_draft_request || r.hasDraftRequest || r.HasDraftRequest || false,
      // A record cannot be both draft AND pending â€” draft wins
      hasPendingRequest: (r.has_pending_request || r.hasPendingRequest || r.HasPendingRequest || false)
        && !(r.has_draft_request || r.hasDraftRequest || r.HasDraftRequest),
      isFinalized: r.is_finalized ?? r.isFinalized ?? r.IsFinalized ?? false,
      isManagerOverride: r.is_manager_override ?? r.isManagerOverride ?? r.IsManagerOverride ?? false,
      requestId: r.requestId || r.RequestId || undefined,
      requestStatus: r.requestStatus || r.RequestStatus
        || (((r.has_pending_request || r.hasPendingRequest || r.HasPendingRequest) && !(r.has_draft_request || r.hasDraftRequest || r.HasDraftRequest)) ? 'pending' : undefined)
    };
  }

  // Get single employee review package for the detail dialog
  // API returns array with one element when employeeId is provided
  getEmployeeReviewPackage(timesheetId: string, employeeId: string): Observable<EmployeeReviewPackage> {
    if (!timesheetId || timesheetId === '00000000-0000-0000-0000-000000000000') {
      throw new Error('Invalid timesheetId provided');
    }
    
    return this.http.get<ApiResponse<EmployeeReviewPackage[]>>(
      `${this.apiUrl}/timesheet/review-dashboard`,
      { params: { timesheetId, employeeId, _t: Date.now().toString() } }
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
        const pkg = packages[0];
        // Handle PascalCase key from .NET: FullMonthRecords vs fullMonthRecords
        const rawRecords = (pkg as any).fullMonthRecords || (pkg as any).FullMonthRecords || [];
        // Normalize package-level isFinalized (same PascalCase reason as getManagerReviewDashboard).
        const pkgIsFinalized: boolean =
          (pkg as any).isFinalized ?? (pkg as any).IsFinalized ?? (pkg as any).is_finalized ?? false;
        const pkgPending: number =
          (pkg as any).pendingRequestCount ?? (pkg as any).PendingRequestCount ?? 0;
        return {
          ...pkg,
          isFinalized:         pkgIsFinalized,
          pendingRequestCount: pkgPending,
          approvedCount:       (pkg as any).approvedCount  ?? (pkg as any).ApprovedCount  ?? 0,
          rejectedCount:       (pkg as any).rejectedCount  ?? (pkg as any).RejectedCount  ?? 0,
          finalizedCount:      (pkg as any).finalizedCount ?? (pkg as any).FinalizedCount ?? 0,
          totalRecords:        (pkg as any).totalRecords   ?? (pkg as any).TotalRecords   ?? 0,
          fullMonthRecords: rawRecords.map((r: any) => this.normalizeDailyReviewRecord(r))
        };
      })
    );
  }

  // Finalize all approved records for a specific employee
  // Routes through finalize-batch with employeeId to scope to one employee
  finalizeEmployeeApprovals(timesheetId: string, employeeId: string): Observable<{ finalizedCount: number }> {
    return this.http.post<ApiResponse<{ finalizedCount: number } | boolean>>(
      `${this.apiUrl}/timesheet/finalize-batch`,
      { timesheetId, employeeId }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to finalize employee approvals');
        }
        // Backend may return boolean or { finalizedCount } â€” normalize
        const data = response.data;
        if (typeof data === 'object' && data !== null && 'finalizedCount' in data) {
          return data as { finalizedCount: number };
        }
        return { finalizedCount: 0 };
      })
    );
  }

  // Apply manager override for a specific attendance record
  // Redirected to admin-override endpoint for elevated-privilege finalization
  applyManagerOverride(dto: ManagerOverrideDto): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/admin-override`,
      dto
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to apply admin override');
        }
        return response.data || true;
      })
    );
  }

  // Administrative override â€” high-privilege endpoint for finalization edits
  adminOverride(dto: ManualAttendanceUpdateDto): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/admin-override`,
      dto
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to apply admin override');
        }
        return response.data || true;
      })
    );
  }
submitTimesheetBatch(timesheetId: string): Observable<{ submittedCount: number }> {
    return this.http.post<ApiResponse<{ submittedCount: number }>>(
      `${this.apiUrl}/timesheet/submit-approvals`,
      { timesheetId } as FinalizeBatchRequestDto
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to submit timesheet batch');
        }
        return response.data || { submittedCount: 0 };
      })
    );
  }

  // Finalize entire timesheet for payroll (manager/admin only)
  finalizeTimesheetBatch(timesheetId: string): Observable<{ finalizedCount: number }> {
    return this.http.post<ApiResponse<{ finalizedCount: number }>>(
      `${this.apiUrl}/timesheet/finalize-batch`,
      { timesheetId }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to finalize timesheet batch');
        }
        return response.data || { finalizedCount: 0 };
      })
    );
  }
}