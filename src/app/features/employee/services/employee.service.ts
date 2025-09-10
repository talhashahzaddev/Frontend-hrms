import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  Employee,
  Department,
  Position,
  SkillSet,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeSearchRequest,
  EmployeeListResponse,
  EmployeeStatistics
} from '../../../core/models/employee.models';
import { ApiResponse, PagedResult } from '../../../core/models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private readonly apiUrl = `${environment.apiUrl}/employees`;
  private readonly departmentUrl = `${environment.apiUrl}/departments`;
  private readonly positionUrl = `${environment.apiUrl}/positions`;

  constructor(private http: HttpClient) { }

  // Employee CRUD Operations
  getEmployees(searchRequest?: EmployeeSearchRequest): Observable<EmployeeListResponse> {
    let params = new HttpParams();
    
    if (searchRequest) {
      if (searchRequest.searchTerm) params = params.set('searchTerm', searchRequest.searchTerm);
      if (searchRequest.departmentId) params = params.set('departmentId', searchRequest.departmentId);
      if (searchRequest.positionId) params = params.set('positionId', searchRequest.positionId);
      if (searchRequest.managerId) params = params.set('managerId', searchRequest.managerId);
      if (searchRequest.employmentStatus) params = params.set('employmentStatus', searchRequest.employmentStatus);
      if (searchRequest.employmentType) params = params.set('employmentType', searchRequest.employmentType);
      if (searchRequest.isActive !== undefined) params = params.set('isActive', searchRequest.isActive.toString());
      if (searchRequest.sortBy) params = params.set('sortBy', searchRequest.sortBy);
      if (searchRequest.sortDirection) params = params.set('sortDirection', searchRequest.sortDirection);
      
      params = params.set('page', searchRequest.page.toString());
      params = params.set('pageSize', searchRequest.pageSize.toString());
    }

    return this.http.get<ApiResponse<PagedResult<Employee>>>(`${this.apiUrl}`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch employees');
          }
          const data = response.data!;
          return {
            employees: data.data,
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

  getEmployee(employeeId: string): Observable<Employee> {
    return this.http.get<ApiResponse<Employee>>(`${this.apiUrl}/${employeeId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch employee');
          }
          return response.data!;
        })
      );
  }

  createEmployee(request: CreateEmployeeRequest): Observable<Employee> {
    return this.http.post<ApiResponse<Employee>>(`${this.apiUrl}`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to create employee');
          }
          return response.data!;
        })
      );
  }

  updateEmployee(employeeId: string, request: UpdateEmployeeRequest): Observable<Employee> {
    return this.http.put<ApiResponse<Employee>>(`${this.apiUrl}/${employeeId}`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to update employee');
          }
          return response.data!;
        })
      );
  }

  deleteEmployee(employeeId: string): Observable<void> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${employeeId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to delete employee');
          }
        })
      );
  }

  activateEmployee(employeeId: string): Observable<Employee> {
    return this.http.patch<ApiResponse<Employee>>(`${this.apiUrl}/${employeeId}/activate`, {})
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to activate employee');
          }
          return response.data!;
        })
      );
  }

  deactivateEmployee(employeeId: string): Observable<Employee> {
    return this.http.patch<ApiResponse<Employee>>(`${this.apiUrl}/${employeeId}/deactivate`, {})
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to deactivate employee');
          }
          return response.data!;
        })
      );
  }

  // Department Operations
  getDepartments(): Observable<Department[]> {
    return this.http.get<ApiResponse<Department[]>>(`${this.departmentUrl}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch departments');
          }
          return response.data!;
        })
      );
  }

  getDepartment(departmentId: string): Observable<Department> {
    return this.http.get<ApiResponse<Department>>(`${this.departmentUrl}/${departmentId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch department');
          }
          return response.data!;
        })
      );
  }

  // Position Operations  
  getPositions(): Observable<Position[]> {
    return this.http.get<ApiResponse<Position[]>>(`${this.positionUrl}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch positions');
          }
          return response.data!;
        })
      );
  }

  getPosition(positionId: string): Observable<Position> {
    return this.http.get<ApiResponse<Position>>(`${this.positionUrl}/${positionId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch position');
          }
          return response.data!;
        })
      );
  }

  // Statistics and Reports
  getEmployeeStatistics(): Observable<EmployeeStatistics> {
    return this.http.get<ApiResponse<EmployeeStatistics>>(`${this.apiUrl}/statistics`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch employee statistics');
          }
          return response.data!;
        })
      );
  }

  // Search and Filter helpers
  getManagers(): Observable<Employee[]> {
    const params = new HttpParams().set('role', 'manager').set('isActive', 'true');
    return this.http.get<ApiResponse<Employee[]>>(`${this.apiUrl}/managers`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch managers');
          }
          return response.data!;
        })
      );
  }

  getEmployeesByDepartment(departmentId: string): Observable<Employee[]> {
    const params = new HttpParams().set('departmentId', departmentId);
    return this.http.get<ApiResponse<Employee[]>>(`${this.apiUrl}`, { params })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch employees by department');
          }
          return response.data!;
        })
      );
  }

  // Bulk Operations
  bulkActivateEmployees(employeeIds: string[]): Observable<void> {
    return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/bulk/activate`, { employeeIds })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to activate employees');
          }
        })
      );
  }

  bulkDeactivateEmployees(employeeIds: string[]): Observable<void> {
    return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/bulk/deactivate`, { employeeIds })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to deactivate employees');
          }
        })
      );
  }

  // Export Operations
  exportEmployees(format: 'csv' | 'xlsx' = 'xlsx'): Observable<Blob> {
    const params = new HttpParams().set('format', format);
    return this.http.get(`${this.apiUrl}/export`, { 
      params, 
      responseType: 'blob' 
    });
  }
}
