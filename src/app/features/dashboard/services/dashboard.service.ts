import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DashboardSummary,
  AttendanceStats,
  LeaveStats,
  PayrollStats,
  PerformanceStats,
  RecentActivity,
  EmployeeGrowth,
  DepartmentStats,
  UpcomingEvents
} from '../../../core/models/dashboard.models';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) { }

  /**
   * Get dashboard summary with key metrics
   */
  getDashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.apiUrl}/summary`);
  }

  /**
   * Get attendance statistics
   */
  getAttendanceStats(period?: string): Observable<AttendanceStats> {
    let params = new HttpParams();
    if (period) {
      params = params.set('period', period);
    }
    return this.http.get<AttendanceStats>(`${this.apiUrl}/attendance-stats`, { params });
  }

  /**
   * Get leave statistics
   */
  getLeaveStats(period?: string): Observable<LeaveStats> {
    let params = new HttpParams();
    if (period) {
      params = params.set('period', period);
    }
    return this.http.get<LeaveStats>(`${this.apiUrl}/leave-stats`, { params });
  }

  /**
   * Get payroll statistics
   */
  getPayrollStats(period?: string): Observable<PayrollStats> {
    let params = new HttpParams();
    if (period) {
      params = params.set('period', period);
    }
    return this.http.get<PayrollStats>(`${this.apiUrl}/payroll-stats`, { params });
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): Observable<PerformanceStats> {
    return this.http.get<PerformanceStats>(`${this.apiUrl}/performance-stats`);
  }

  /**
   * Get recent activities
   */
  getRecentActivities(limit: number = 10): Observable<RecentActivity[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<RecentActivity[]>(`${this.apiUrl}/recent-activities`, { params });
  }

  /**
   * Get employee growth data
   */
  getEmployeeGrowth(period: string = '12m'): Observable<EmployeeGrowth> {
    const params = new HttpParams().set('period', period);
    return this.http.get<EmployeeGrowth>(`${this.apiUrl}/employee-growth`, { params });
  }

  /**
   * Get department statistics
   */
  getDepartmentStats(): Observable<DepartmentStats[]> {
    return this.http.get<DepartmentStats[]>(`${this.apiUrl}/department-stats`);
  }

  /**
   * Get upcoming events and important dates
   */
  getUpcomingEvents(limit: number = 5): Observable<UpcomingEvents[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<UpcomingEvents[]>(`${this.apiUrl}/upcoming-events`, { params });
  }

  /**
   * Get attendance trends for chart display
   */
  getAttendanceTrends(period: string = '30d'): Observable<any> {
    const params = new HttpParams().set('period', period);
    return this.http.get(`${this.apiUrl}/attendance-trends`, { params });
  }

  /**
   * Get leave trends for chart display
   */
  getLeaveTrends(period: string = '12m'): Observable<any> {
    const params = new HttpParams().set('period', period);
    return this.http.get(`${this.apiUrl}/leave-trends`, { params });
  }

  /**
   * Get payroll trends for chart display
   */
  getPayrollTrends(period: string = '12m'): Observable<any> {
    const params = new HttpParams().set('period', period);
    return this.http.get(`${this.apiUrl}/payroll-trends`, { params });
  }

  /**
   * Get top performers data
   */
  getTopPerformers(limit: number = 5): Observable<any[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<any[]>(`${this.apiUrl}/top-performers`, { params });
  }

  /**
   * Get birthday and work anniversary reminders
   */
  getReminders(): Observable<any> {
    return this.http.get(`${this.apiUrl}/reminders`);
  }

  /**
   * Get quick stats for widgets
   */
  getQuickStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/quick-stats`);
  }
}
