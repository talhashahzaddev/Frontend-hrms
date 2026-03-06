// features/settings/services/role.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Role, CreateRoleRequest, UpdateRoleRequest } from '../../../core/models/role.models';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = `${environment.apiUrl}/Auth`;

  constructor(private http: HttpClient) {}

  /** GET /Auth/get-roles-by-organization */
  getRoles(): Observable<Role[]> {
    return this.http.get<{ data: Role[]; success: boolean; message: string; errors: null }>
      (`${this.apiUrl}/get-roles-by-organization`)
      .pipe(map(res => res.data));
  }

  /** POST /Auth/create-role */
  createRole(payload: CreateRoleRequest): Observable<any> {
    return this.http.post<{ data: any; success: boolean }>
      (`${this.apiUrl}/create-role`, payload)
      .pipe(map(res => res.data));
  }

  /** PUT /Auth/update-role/{roleId} — update endpoint, confirm path with backend */
  updateRole(roleId: string, payload: UpdateRoleRequest): Observable<any> {
    return this.http.put<{ data: any; success: boolean }>
      (`${this.apiUrl}/update-role/${roleId}`, payload)
      .pipe(map(res => res.data));
  }

  /** DELETE /Auth/delete-role/{roleId} — confirm path with backend */
  deleteRole(roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-role/${roleId}`);
  }
}
