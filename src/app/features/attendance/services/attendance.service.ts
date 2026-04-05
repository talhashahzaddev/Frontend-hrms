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
  TimeZoneDto,
  ShiftSummary,
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
  FinalizedPayrollCalculation,
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


  getAttendances(searchRequest: AttendanceSearchRequest): Observable<AttendanceListResponse> {
    let params = new HttpParams();
    if(searchRequest.SearchTerm) params=params.set('searchTerm', searchRequest.SearchTerm);
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

//Getting all timezones
getAllTimeZones() {
  return this.http.get<any[]>(
    'https://restcountries.com/v3.1/all?fields=name,capital,timezones,region'
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

  getTodaySessions(): Observable<AttendanceSessionDto[]> {
    return this.http.get<ApiResponse<AttendanceSessionDto[]>>(`${this.apiUrl}/employeeSession`)
      .pipe(map(res => res.data || []));
  }


  getTodaySessionsById(employeeId: string, workDate?: string | Date): Observable<AttendanceSessionDto[]> {
    let url = `${this.apiUrl}/employeeSession/${employeeId}`;

    if (workDate) {
      const dateStr = (workDate instanceof Date)
        ? workDate.toISOString().split('T')[0]
        : workDate;
      url += `?date=${dateStr}`;
    }

    return this.http.get<ApiResponse<AttendanceSessionDto[]>>(url)
      .pipe(map(res => res.data || []));
  }


  getCalendarSessionsById(employeeId: string, workDate?: string | Date): Observable<AttendanceSessionDto[]> {
    let url = `${this.apiUrl}/employeeSessionforcalendar/${employeeId}`;

    if (workDate) {
      const dateStr = (workDate instanceof Date)
        ? workDate.toISOString().split('T')[0]
        : workDate;
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
        })
      );
  }

  //Shift-summary
  getShiftSummary(): Observable<ShiftSummary | null> {
  return this.http.get<ApiResponse<ShiftSummary>>(`${this.apiUrl}/shift-summary`)
    .pipe(
      map(response => {
        if (!response.success) {
          return null;
        }
        return response.data || null;
      })
    );
}


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

  createShiftSwap(shiftSwap: ShiftSwap): Observable<any> {
    return this.http.post(`${this.apiUrl}/shiftswap`, shiftSwap);
  }


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

  getPendingShiftSwapsForAdmin(): Observable<PendingShiftSwap[]> {
    return this.http.get<PendingShiftSwap[]>(`${this.apiUrl}/shiftswap/pending`);
  }

  getCurrentShift(employeeId: string): Observable<ShiftDto> {
    return this.http.get<ShiftDto>(`${this.apiUrl}/CurrentShift/${employeeId}`);
  }

  getCurrentShiftDetails(employeeId: string): Observable<ShiftDto> {
    return this.http.get<ApiResponse<ShiftDto>>(`${this.apiUrl}/CurrentShift/${employeeId}`)
      .pipe(map(response => response.data!));
  }

  approvedshiftRequest(request: approvedshiftRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/shiftswap/approve`, request);
  }


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

  getMonthlyTimesheets(startDate?: string, endDate?: string): Observable<MonthlyTimesheetSummary[]> {
    let params = new HttpParams();

    if (startDate && startDate.trim() !== '') {
      params = params.set('startDate', startDate);
    }
    if (endDate && endDate.trim() !== '') {
      params = params.set('endDate', endDate);
    }

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

  getSnapshots(): Observable<MonthlyTimesheetSummary[]> {
    return this.getMonthlyTimesheets();
  }

  getDashboardSnapshots(startDate?: string, endDate?: string): Observable<MonthlyTimesheetSummary[]> {
    let params = new HttpParams();

    if (startDate && startDate.trim() !== '') {
      params = params.set('startDate', startDate);
    }
    if (endDate && endDate.trim() !== '') {
      params = params.set('endDate', endDate);
    }

    return this.http.get<ApiResponse<MonthlyTimesheetSummary[]>>(
      `${this.apiUrl}/timesheet/dashboard-snapshots`,
      { params }
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch dashboard snapshots');
        }
        return response.data || [];
      })
    );
  }

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
        const employees = response.data || [];
        employees.forEach((emp: any) => {
          if (emp.is_finalized === undefined) {
            emp.is_finalized = emp.isFinalized ?? emp.IsFinalized ?? false;
          }
          if (emp.dailyRecords?.length) {
            emp.dailyRecords = emp.dailyRecords.map((r: any) => {
              const statusKey = String(
                r.requestStatus ?? r.RequestStatus ?? r.request_status ?? ''
              ).toLowerCase();

              const hasDraftFlag = !!(r.has_draft_request || r.hasDraftRequest || r.HasDraftRequest);
              const hasPendingFlag = !!(r.has_pending_request || r.hasPendingRequest || r.HasPendingRequest);
              const hasApprovedFlag = !!(r.has_approved_request || r.hasApprovedRequest || r.HasApprovedRequest);
              const hasRejectedFlag = !!(r.has_rejected_request || r.hasRejectedRequest || r.HasRejectedRequest);

              const normalizedRequestStatus =
                statusKey === 'pending' ||
                statusKey === 'approved' ||
                statusKey === 'rejected' ||
                statusKey === 'draft' ||
                statusKey === 'none'
                  ? statusKey
                  : undefined;

              const hasDraftRequest = normalizedRequestStatus
                ? normalizedRequestStatus === 'draft'
                : hasDraftFlag;

              const hasPendingRequest = normalizedRequestStatus
                ? normalizedRequestStatus === 'pending'
                : hasPendingFlag;

              const hasApprovedRequest = normalizedRequestStatus
                ? normalizedRequestStatus === 'approved'
                : hasApprovedFlag;

              const hasRejectedRequest = normalizedRequestStatus
                ? normalizedRequestStatus === 'rejected'
                : hasRejectedFlag;

              return {
                ...r,
                attendanceId: r.attendanceId || r.AttendanceId || undefined,
                date: r.date || r.Date || r.workDate || r.WorkDate || '',
                checkInTime: r.checkInTime || r.CheckInTime || undefined,
                checkOutTime: r.checkOutTime || r.CheckOutTime || undefined,
                status: r.status || r.Status || 'No Record',
                totalHours: r.totalHours ?? r.TotalHours ?? 0,
                overtimeHours: r.overtimeHours ?? r.OvertimeHours ?? 0,
                lateHours: r.lateHours ?? r.LateHours ?? 0,
                notes: r.notes || r.Notes || undefined,
                is_finalized: r.is_finalized ?? r.isFinalized ?? r.IsFinalized ?? false,
                is_manager_override: r.is_manager_override ?? r.isManagerOverride ?? r.IsManagerOverride ?? false,
                hasApprovedRequest,
                hasRejectedRequest,
                hasDraftRequest,
                hasPendingRequest,
                requestStatus: normalizedRequestStatus,
                rejectionReason: r.rejectionReason || r.RejectionReason || r.rejection_reason || undefined,
                requestedCheckIn: r.requestedCheckIn || r.RequestedCheckIn || r.requested_checkin || undefined,
                requestedCheckOut: r.requestedCheckOut || r.RequestedCheckOut || r.requested_checkout || undefined,
                requestedStatus: r.requestedStatus || r.RequestedStatus || r.requested_status || undefined,
                requestedNotes: r.requestedNotes || r.RequestedNotes || r.requested_notes || undefined,
              };
            });
          }
        });
        return employees;
      })
    );
  }

  getFinalizedPayrollCalculation(timesheetId: string, employeeId?: string): Observable<FinalizedPayrollCalculation> {
    if (!timesheetId || timesheetId.trim() === '') {
      throw new Error('Timesheet ID is required');
    }

    let params = new HttpParams();
    if (employeeId && employeeId.trim() !== '') {
      params = params.set('employeeId', employeeId);
    }

    return this.http.get<ApiResponse<FinalizedPayrollCalculation>>(
      `${this.apiUrl}/timesheet/finalized-calculation/${timesheetId}`,
      { params }
    ).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to fetch finalized payroll calculation');
        }

        return this.normalizeFinalizedPayrollCalculation(response.data as any);
      })
    );
  }

  private normalizeFinalizedPayrollCalculation(raw: any): FinalizedPayrollCalculation {
    const breakdown = raw?.statusBreakdown || raw?.StatusBreakdown || [];

    return {
      timesheetId: raw?.timesheetId || raw?.TimesheetId || '',
      employeeId: raw?.employeeId || raw?.EmployeeId || '',
      employeeName: raw?.employeeName || raw?.EmployeeName || '',
      employeeCode: raw?.employeeCode || raw?.EmployeeCode || '',
      month: Number(raw?.month ?? raw?.Month ?? 0),
      year: Number(raw?.year ?? raw?.Year ?? 0),
      expectedWorkDays: Number(raw?.expectedWorkDays ?? raw?.ExpectedWorkDays ?? 0),
      finalizedWorkDays: Number(raw?.finalizedWorkDays ?? raw?.FinalizedWorkDays ?? 0),
      pendingWorkDays: Number(raw?.pendingWorkDays ?? raw?.PendingWorkDays ?? 0),
      pendingRequestDays: Number(raw?.pendingRequestDays ?? raw?.PendingRequestDays ?? 0),
      payableDays: Number(raw?.payableDays ?? raw?.PayableDays ?? 0),
      unpaidDays: Number(raw?.unpaidDays ?? raw?.UnpaidDays ?? 0),
      totalHours: Number(raw?.totalHours ?? raw?.TotalHours ?? 0),
      regularHours: Number(raw?.regularHours ?? raw?.RegularHours ?? 0),
      overtimeHours: Number(raw?.overtimeHours ?? raw?.OvertimeHours ?? 0),
      lateHours: Number(raw?.lateHours ?? raw?.LateHours ?? 0),
      attendancePercentage: Number(raw?.attendancePercentage ?? raw?.AttendancePercentage ?? 0),
      payrollReady: raw?.payrollReady ?? raw?.PayrollReady ?? false,
      blockedReason: raw?.blockedReason || raw?.BlockedReason || undefined,
      generatedAt: raw?.generatedAt || raw?.GeneratedAt || undefined,
      statusBreakdown: Array.isArray(breakdown)
        ? breakdown.map((item: any) => ({
            status: item?.status || item?.Status || 'unknown',
            days: Number(item?.days ?? item?.Days ?? 0),
            hours: Number(item?.hours ?? item?.Hours ?? 0)
          }))
        : []
    };
  }

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

  private extractCount(data: unknown, key: 'submittedCount' | 'finalizedCount'): number {
    if (typeof data === 'number') {
      return data;
    }

    if (typeof data === 'object' && data !== null && key in data) {
      const value = Number((data as Record<string, unknown>)[key]);
      return Number.isFinite(value) ? value : 0;
    }

    return 0;
  }

  private submitApprovalsRequest(timesheetId: string, employeeId?: string): Observable<number> {
    const body: FinalizeBatchRequestDto = { timesheetId };
    if (employeeId) {
      body.employeeId = employeeId;
    }

    return this.http.post<ApiResponse<number | { submittedCount: number }>>(
      `${this.apiUrl}/timesheet/submit-approvals`,
      body
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to submit timesheet approvals');
        }
        return this.extractCount(response.data, 'submittedCount');
      })
    );
  }

  private finalizeBatchRequest(timesheetId: string, employeeId?: string): Observable<number> {
    const body: FinalizeBatchRequestDto = { timesheetId };
    if (employeeId) {
      body.employeeId = employeeId;
    }

    return this.http.post<ApiResponse<number | { finalizedCount: number }>>(
      `${this.apiUrl}/timesheet/finalize-batch`,
      body
    ).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to finalize timesheet batch');
        }
        return this.extractCount(response.data, 'finalizedCount');
      })
    );
  }


  submitTimesheetApprovals(timesheetId: string, _employeeId: string): Observable<boolean> {
    return this.submitApprovalsRequest(timesheetId, _employeeId)
      .pipe(map(() => true));
  }

  finalizeBatch(timesheetId: string, employeeId?: string): Observable<boolean> {
    console.log('ðŸ”’ Finalizing batch for timesheetId:', timesheetId, employeeId ? `employeeId: ${employeeId}` : '(all employees)');

    return this.finalizeBatchRequest(timesheetId, employeeId).pipe(
      map(() => {
        console.log('âœ… Batch finalized successfully');
        return true;
      })
    );
  }

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
          const rawRecords = pkg.fullMonthRecords || pkg.FullMonthRecords || [];

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



  private extractAttendanceId(r: any): string {
    return r.attendanceId || r['AttendanceId'] || r['attendanceid'] || r['Attendanceid'] || '';
  }

  private normalizeDailyReviewRecord(r: any): DailyReviewRecord {
    const resolvedAttendanceId = this.extractAttendanceId(r);

    const isDraft    = !!(r.has_draft_request    || r.hasDraftRequest    || r.HasDraftRequest);
    const isPending  = !!(r.has_pending_request  || r.hasPendingRequest  || r.HasPendingRequest);
    const isApproved = !!(r.has_approved_request || r.hasApprovedRequest || r.HasApprovedRequest);
    const isRejected = !!(r.has_rejected_request || r.hasRejectedRequest || r.HasRejectedRequest);

    const statusKey = String(r.requestStatus ?? r.RequestStatus ?? r.request_status ?? '').toLowerCase();

    const derivedStatus: 'pending' | 'approved' | 'rejected' | undefined =
      statusKey === 'pending' || statusKey === 'approved' || statusKey === 'rejected'
        ? (statusKey as 'pending' | 'approved' | 'rejected')
        :
      (isPending && !isDraft && !isApproved && !isRejected) ? 'pending'  :
      isApproved                                            ? 'approved' :
      isRejected                                            ? 'rejected' :
      undefined;

    const hasPendingRequest = derivedStatus ? derivedStatus === 'pending' : (isPending && !isDraft && !isApproved && !isRejected);
    const hasApprovedRequest = derivedStatus ? derivedStatus === 'approved' : isApproved;
    const hasRejectedRequest = derivedStatus ? derivedStatus === 'rejected' : isRejected;

    return {
      recordId: r.recordId || r.RecordId || r.requestId || r.RequestId || '',
      attendanceId: resolvedAttendanceId,
      date: r.date || r.workDate || r.Date || r.WorkDate || '',
      originalCheckIn: r.originalCheckIn || r.checkInTime || r.CheckInTime || undefined,
      originalCheckOut: r.originalCheckOut || r.checkOutTime || r.CheckOutTime || undefined,
      originalStatus: r.originalStatus || r.status || r.Status || 'No Record',
      originalTotalHours: r.originalTotalHours || r.totalHours || r.TotalHours || 0,
      originalLateHours: r.originalLateHours ?? r.lateHours ?? r.LateHours ?? 0,
      originalOvertimeHours: r.originalOvertimeHours ?? r.overtimeHours ?? r.OvertimeHours ?? 0,
      requestedCheckIn: r.requestedCheckIn || r.RequestedCheckIn || undefined,
      requestedCheckOut: r.requestedCheckOut || r.RequestedCheckOut || undefined,
      requestedStatus: r.requestedStatus || r.RequestedStatus || undefined,
      requestedNotes: r.requestedNotes || r.RequestedNotes || undefined,
      reasonForEdit: r.reasonForEdit || r.ReasonForEdit || undefined,
      rejectionReason: r.rejectionReason || r.RejectionReason || r.rejection_reason || undefined,
      hasDraftRequest:    isDraft,
      hasPendingRequest,
      hasApprovedRequest,
      hasRejectedRequest,
      isFinalized: r.is_finalized ?? r.isFinalized ?? r.IsFinalized ?? false,
      isManagerOverride: r.is_manager_override ?? r.isManagerOverride ?? r.IsManagerOverride ?? false,
      requestId: r.requestId || r.RequestId || undefined,
      requestStatus: derivedStatus
    };
  }

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
        const packages = response.data || [];
        if (packages.length === 0) {
          throw new Error('No attendance data found for this employee');
        }
        const pkg = packages[0];
        const rawRecords = (pkg as any).fullMonthRecords || (pkg as any).FullMonthRecords || [];
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

  finalizeEmployeeApprovals(timesheetId: string, employeeId: string): Observable<{ finalizedCount: number }> {
    return this.finalizeBatchRequest(timesheetId, employeeId)
      .pipe(map(finalizedCount => ({ finalizedCount })));
  }

  applyManagerOverride(dto: ManagerOverrideDto): Observable<boolean> {
    const payload: ManualAttendanceUpdateDto = {
      attendanceId: dto.attendanceId ?? undefined,
      employeeId: dto.employeeId,
      timesheetId: dto.timesheetId,
      workDate: dto.workDate,
      checkInTime: dto.checkInTime,
      checkOutTime: dto.checkOutTime,
      status: dto.status || 'Absent',
      notes: dto.notes,
      reason: dto.reason
    };

    return this.adminOverride(payload);
  }

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
    return this.submitApprovalsRequest(timesheetId)
      .pipe(map(submittedCount => ({ submittedCount })));
  }

  finalizeTimesheetBatch(timesheetId: string): Observable<{ finalizedCount: number }> {
    return this.finalizeBatchRequest(timesheetId)
      .pipe(map(finalizedCount => ({ finalizedCount })));
  }
}