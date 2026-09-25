import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  getEmployeeOverview(): Observable<ServiceResponse<EmployeeOverview>> {
    return this.http.get<ServiceResponse<EmployeeOverview>>(`${this.apiUrl}/my-overview`);
  }

  getManagerOverview(): Observable<ServiceResponse<ManagerOverview>> {
    return this.http.get<ServiceResponse<ManagerOverview>>(`${this.apiUrl}/manager-overview`);
  }

  getHrOverview(): Observable<ServiceResponse<HrOverview>> {
    return this.http.get<ServiceResponse<HrOverview>>(`${this.apiUrl}/hr-overview`);
  }

  getHrStats(): Observable<ServiceResponse<HrStats>> {
    return this.http.get<ServiceResponse<HrStats>>(`${this.apiUrl}/hr-stats`);
  }

  getLatestHires(): Observable<ServiceResponse<LatestHiredEmployee[]>> {
    return this.http.get<ServiceResponse<LatestHiredEmployee[]>>(`${this.apiUrl}/latest-hires`);
  }
}