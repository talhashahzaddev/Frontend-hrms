import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import {
  EmployeeOverview,
  ManagerOverview,
  HrOverview,
  HrStats,
  LatestHiredEmployee
} from '@core/models/dashboard.models';

export interface ServiceResponse<T> {
  data: T;
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/Dashboard`;
  private http = inject(HttpClient);

  /**
   * Dashboard widgets load in the background, so a failure should hide the widget
   * rather than pop a global error toast. Pass `silent = true` for that behaviour.
   */
  private options(silent: boolean) {
    return silent ? { headers: new HttpHeaders({ 'X-Skip-Global-Error': 'true' }) } : {};
  }

  getEmployeeOverview(silent = false): Observable<ServiceResponse<EmployeeOverview>> {
    return this.http.get<ServiceResponse<EmployeeOverview>>(`${this.apiUrl}/my-overview`, this.options(silent));
  }

  getManagerOverview(silent = false): Observable<ServiceResponse<ManagerOverview>> {
    return this.http.get<ServiceResponse<ManagerOverview>>(`${this.apiUrl}/manager-overview`, this.options(silent));
  }

  getHrOverview(silent = false): Observable<ServiceResponse<HrOverview>> {
    return this.http.get<ServiceResponse<HrOverview>>(`${this.apiUrl}/hr-overview`, this.options(silent));
  }

  getHrStats(silent = false): Observable<ServiceResponse<HrStats>> {
    return this.http.get<ServiceResponse<HrStats>>(`${this.apiUrl}/hr-stats`, this.options(silent));
  }

  getLatestHires(silent = false): Observable<ServiceResponse<LatestHiredEmployee[]>> {
    return this.http.get<ServiceResponse<LatestHiredEmployee[]>>(`${this.apiUrl}/latest-hires`, this.options(silent));
  }
}
