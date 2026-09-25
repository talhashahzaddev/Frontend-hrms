import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { Role, CreateRoleRequest, UpdateRoleRequest } from '../../../core/models/role.models';
import { ApiResponse } from '../../../core/models/auth.models';
import { environment } from '../../../../environments/environment';

const SKIP_ERROR_HEADER = new HttpHeaders({ 'X-Skip-Global-Error': 'true' });

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = `${environment.apiUrl}/Auth`;

  constructor(private http: HttpClient) {}

  /** GET /Auth/get-roles-by-organization */
  getRoles(): Observable<Role[]> {
    return this.http.get<ApiResponse<Role[]>>(`${this.apiUrl}/get-roles-by-organization`, { headers: SKIP_ERROR_HEADER })
      .pipe(map(res => res.data ?? []), catchError(() => of([])));
  }

  /** POST /Auth/create-role */
  createRole(payload: CreateRoleRequest): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/create-role`, payload, { headers: SKIP_ERROR_HEADER })
      .pipe(map(res => res.data));
  }

  /**
   * PUT /Auth/update-role
   * RoleId is sent INSIDE the request body (not in the URL path).
   * Backend signature: [HttpPut("update-role")]
   */
  updateRole(roleId: string, payload: CreateRoleRequest): Observable<any> {
    const body: UpdateRoleRequest = {
      ...payload,
      roleId   // inject roleId into body as required by UpdateRoleRequest
    };
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/update-role`, body, { headers: SKIP_ERROR_HEADER })
      .pipe(map(res => res.data));
  }

  /**
   * DELETE /Auth/delete-role/{roleId}
   * Backend signature: [HttpDelete("delete-role/{roleId}")]
   */
  deleteRole(roleId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/delete-role/${roleId}`, { headers: SKIP_ERROR_HEADER })
      .pipe(map(res => res.data ?? false));
  }
}