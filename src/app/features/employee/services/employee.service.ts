import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  Employee,
  Department,
  Position,
  Role,
  SkillSet,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeSearchRequest,
  EmployeeListResponse,
  EmployeeStatistics,
  PositionEmployeesMainDto,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  CreatePositionRequest,
  UpdatePositionRequest
} from '../../../core/models/employee.models';
import { ApiResponse, PagedResult } from '../../../core/models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private readonly apiUrl = `${environment.apiUrl}/Employee`;

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

updateEmployee(formData: FormData): Observable<Employee> {
  return this.http.put<ApiResponse<Employee>>(
    `${this.apiUrl}/edit`,
    formData
  ).pipe(
    map(response => {
      if (!response.success) {
        throw new Error(response.message || 'Employee update failed');
      }
      return response.data!;
    }),
    catchError(throwError)
  );
}




  // Example of how to use it with error handling:
  updateEmployeeWithErrorHandling(employeeId: number, employee: Employee): Observable<Employee> {
    return this.http.put<Employee>(
      `${this.apiUrl}/${employeeId}`,
      employee
    ).pipe(
      catchError(error => {
        console.error('Error updating employee:', error);
        throw error;
      })
    );
  }

  deleteEmployee(employeeId: string, status?: string): Observable<void> {
  return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${employeeId}?status=${status}`)
    .pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || `Failed to ${status === 'delete' ? 'delete' : 'recover'} employee`);
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
  // getDepartments(): Observable<Department[]> {
  //   return this.http.get<ApiResponse<Department[]>>(`${this.apiUrl}/departments`)
  //     .pipe(
  //       map(response => {
  //         if (!response.success) {
  //           throw new Error(response.message || 'Failed to fetch departments');
  //         }
  //         return response.data!;
  //       })
  //     );
  // }


getDepartments(searchQuery?: string, status?: 'active' | 'inactive'): Observable<Department[]> {
  const params: any = {};
  if (searchQuery) params.searchQuery = searchQuery;
  if (status) params.status = status === 'active'; // backend expects boolean

  return this.http.get<ApiResponse<Department[]>>(`${this.apiUrl}/departments`, { params })
    .pipe(
      map(response => {
        if (!response.success) throw new Error(response.message || 'Failed to fetch departments');
        return response.data!;
      })
    );
}




  getDepartment(departmentId: string): Observable<Department> {
    return this.http.get<ApiResponse<Department>>(`${this.apiUrl}/departments/${departmentId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch department');
          }
          return response.data!;
        })
      );
  }

  //postion active deactive

  updatePositionStatus(positionId: string,isActive: boolean): Observable<boolean> {
  return this.http
    .put<ApiResponse<boolean>>(
      `${this.apiUrl}/positions/${positionId}/status`,
      null,
      {
        params: { isActive }
      }
    )
    .pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to update position status');
        }
        return response.data!;
      })
    );
}

// department.service.ts
updateDepartmentStatus(departmentId: string, isActive: boolean): Observable<boolean> {
  return this.http
    .put<ApiResponse<boolean>>(
      `${this.apiUrl}/departments/${departmentId}/status`,
      null,
      {
        params: { isActive }
      }
    )
    .pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to update department status');
        }
        return response.data!;
      })
    );
}


  createDepartment(request: CreateDepartmentRequest): Observable<Department> {
    return this.http.post<ApiResponse<Department>>(`${this.apiUrl}/departments`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to create department');
          }
          return response.data!;
        })
      );
  }

  updateDepartment(departmentId: string, request: UpdateDepartmentRequest): Observable<Department> {
    return this.http.put<ApiResponse<Department>>(`${this.apiUrl}/departments/${departmentId}`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to update department');
          }
          return response.data!;
        })
      );
  }

  deleteDepartment(departmentId: string): Observable<void> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/departments/${departmentId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to delete department');
          }
        })
      );
  }

  
getPositions(departmentId?: string, search?: string, status?: string): Observable<Position[]> {
  let params = new HttpParams();

  if (departmentId) {
    params = params.set('departmentId', departmentId);
  }
  if (search) {
    params = params.set('search', search);
  }
  if (status) {
    params = params.set('status', status);
  }

  return this.http.get<ApiResponse<Position[]>>(`${this.apiUrl}/positions`, { params })
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
    return this.http.get<ApiResponse<Position>>(`${this.apiUrl}/positions/${positionId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch position');
          }
          return response.data!;
        })
      );
  }


  




  //Get employee by position
getEmployeesByPosition(positionId: string): Observable<PositionEmployeesMainDto> {
  return this.http
    .get<ApiResponse<PositionEmployeesMainDto>>(`${this.apiUrl}/positions/${positionId}/employees`)
    .pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch employees for this position');
        }
        return response.data!;
      })
    );
}







  createPosition(request: CreatePositionRequest): Observable<Position> {
    return this.http.post<ApiResponse<Position>>(`${this.apiUrl}/positions`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to create position');
          }
          return response.data!;
        })
      );
  }

  updatePosition(positionId: string, request: UpdatePositionRequest): Observable<Position> {
    return this.http.put<ApiResponse<Position>>(`${this.apiUrl}/positions/${positionId}`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to update position');
          }
          return response.data!;
        })
      );
  }

  deletePosition(positionId: string): Observable<void> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/positions/${positionId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to delete position');
          }
        })
      );
  }

  // Role Operations
  getRoles(): Observable<Role[]> {
    return this.http.get<ApiResponse<Role[]>>(`${environment.apiUrl}/Position/roles`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch roles');
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
    return this.http.get<ApiResponse<Employee[]>>(`${this.apiUrl}/managers`)
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
