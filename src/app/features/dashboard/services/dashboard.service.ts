
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Observable } from 'rxjs';
// import { environment } from '../../../../environments/environment';
import { environment } from '@/environments/environment';
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


interface ServiceResponse<T> {
  data: T;
  success: boolean;
  message: string;
}


@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/Dashboard`;

  constructor(private http: HttpClient) { }

  /**
   * Get dashboard summary with key metrics
   */
  getDashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<ServiceResponse<DashboardSummary>>(`${this.apiUrl}/summary`).pipe(
    map(res => res.data),  // extract only the data object
    catchError(err => {
      console.error('Failed to load employee growth:', err);
      return of({
        totalEmployees: 0,
        presentToday: 0,
        onLeaveToday: 0,
        pendingApprovals: 0,
        newHiresThisMonth: 0,
        attendanceRate: 0,
        employeeSatisfaction: 0
      } as DashboardSummary);
    })
  );
  }

  /**
   * Get attendance statistics
   */
 getAttendanceStats(period?: string): Observable<AttendanceStats> {
  let params = new HttpParams();
  if (period) {
    params = params.set('period', period);
  }
  return this.http.get<ServiceResponse<AttendanceStats>>(`${this.apiUrl}/attendance-stats`, { params }).pipe(
    map(res => res.data)
  );
}
  /**
   * Get leave statistics
   */
getLeaveStats(period?: string): Observable<LeaveStats> {
  let params = new HttpParams();
  if (period) {
    params = params.set('period', period);
  }
  return this.http.get<ServiceResponse<LeaveStats>>(`${this.apiUrl}/leave-stats`, { params }).pipe(
    map(res => res.data)
  );
}

  /**
   * Get payroll statistics
   */

getPayrollStats(period?: string): Observable<PayrollStats> {
  let params = new HttpParams();
  if (period) {
    params = params.set('period', period);
  }
  return this.http.get<ServiceResponse<PayrollStats>>(`${this.apiUrl}/payroll-stats`, { params }).pipe(
    map(res => res.data)
  );
}

  /**
   * Get performance statistics
   */
getPerformanceStats(): Observable<PerformanceStats> {
  return this.http.get<ServiceResponse<PerformanceStats>>(`${this.apiUrl}/performance-stats`).pipe(
    map(res => res.data)
  );
}
  /**
   * Get recent activities
   */
  getRecentActivities(limit: number = 10): Observable<RecentActivity[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ServiceResponse<RecentActivity[]>>(`${this.apiUrl}/recent-activities`, { params }).pipe(
      map(res => res.data)
    );
  }
  /**
   * Get employee growth data
   */
  // getEmployeeGrowth(period: string = '12m'): Observable<ServiceResponse<EmployeeGrowth>> {
  //   const params = new HttpParams().set('period', period);
  //   return this.http.get<ServiceResponse<EmployeeGrowth>>(`${this.apiUrl}/employee-growth`, { params });

  //    map(res => res.data),  // extract the actual EmployeeGrowth object
  //   catchError(err => {
  //     console.error('Failed to load employee growth:', err);
  //     return of({
  //       months: [],
  //       counts: [],
  //       growthRate: 0,
  //       cumulativeEmployees: [],
  //       newEmployees: []
  //     } as EmployeeGrowth);
  //   })




  // }


/**
 * Get employee growth data
 */
getEmployeeGrowth(period: string = '12m'): Observable<EmployeeGrowth> {
  const params = new HttpParams().set('period', period);

  return this.http.get<ServiceResponse<EmployeeGrowth>>(`${this.apiUrl}/employee-growth`, { params }).pipe(
    map(res => res.data),  // extract only the data object
    catchError(err => {
      console.error('Failed to load employee growth:', err);
      return of({
        months: [],
        counts: [],
        growthRate: 0,
        cumulativeEmployees: [],
        newEmployees: []
      } as EmployeeGrowth);
    })
  );
}




  /**
   * Get department statistics
   */
  getDepartmentStats(): Observable<DepartmentStats[]> {
    return this.http.get<ServiceResponse<DepartmentStats[]>>(`${this.apiUrl}/department-stats`).pipe(
      map(res => res.data)
    );
  }


  /**
   * Get upcoming events and important dates
   */
   getUpcomingEvents(limit: number = 5): Observable<UpcomingEvents[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ServiceResponse<UpcomingEvents[]>>(`${this.apiUrl}/upcoming-events`, { params }).pipe(
      map(res => res.data)
    );
  }
  /**
   * Get attendance trends for chart display
   */
  getAttendanceTrends(period: string = '30d'): Observable<any> {
    const params = new HttpParams().set('period', period);
    return this.http.get<ServiceResponse<any>>(`${this.apiUrl}/attendance-trends`, { params }).pipe(
      map(res => res.data)
    );
  }

  /**
   * Get leave trends for chart display
   */
  getLeaveTrends(period: string = '12m'): Observable<any> {
    const params = new HttpParams().set('period', period);
    return this.http.get<ServiceResponse<any>>(`${this.apiUrl}/leave-trends`, { params }).pipe(
      map(res => res.data)
    );
  }

  /**
   * Get payroll trends for chart display
   */
  getPayrollTrends(period: string = '12m'): Observable<any> {
    const params = new HttpParams().set('period', period);
    return this.http.get<ServiceResponse<any>>(`${this.apiUrl}/payroll-trends`, { params }).pipe(
      map(res => res.data)
    );
  }
  /**
   * Get top performers data
   */
   getTopPerformers(limit: number = 5): Observable<any[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ServiceResponse<any[]>>(`${this.apiUrl}/top-performers`, { params }).pipe(
      map(res => res.data)
    );
  }

  /**
   * Get birthday and work anniversary reminders
   */
  getReminders(): Observable<any> {
    return this.http.get<ServiceResponse<any>>(`${this.apiUrl}/reminders`).pipe(
      map(res => res.data)
    );
  }
  /**
   * Get quick stats for widgets
   */
  getQuickStats(): Observable<any> {
  return this.http.get<ServiceResponse<any>>(`${this.apiUrl}/quick-stats`).pipe(
    map(res => res.data),
    catchError(err => {
      console.error('Failed to load quick stats:', err);
      return of({});
    })
  );
}

}