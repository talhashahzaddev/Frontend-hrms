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
  Shift,
  AttendanceStatus
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

  // Reports
  getAttendanceReport(startDate: string, endDate: string, employeeId?: string, departmentId?: string): Observable<AttendanceReport> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    if (employeeId) params = params.set('employeeId', employeeId);
    if (departmentId) params = params.set('departmentId', departmentId);

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
}
