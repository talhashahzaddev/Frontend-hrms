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

  /** GET /api/roles - Get all roles for the organization */
  getRoles(): Observable<Role[]> {
    return this.http.get<{ data: Role[]; success: boolean }>(`${this.apiUrl}/get-roles-by-organizatio`)
      .pipe(map(res => res.data));
  }

  /** POST /api/roles/create-role - Create a new role */
  createRole(payload: CreateRoleRequest): Observable<Role> {
    return this.http.post<{ data: Role; success: boolean }>(`${this.apiUrl}/create-role`, payload)
      .pipe(map(res => res.data));
  }

  /** PUT /api/roles/{roleId} - Update an existing role */
  updateRole(roleId: string, payload: UpdateRoleRequest): Observable<Role> {
    return this.http.put<{ data: Role; success: boolean }>(`${this.apiUrl}/${roleId}`, payload)
      .pipe(map(res => res.data));
  }

  /** DELETE /api/roles/{roleId} - Delete a role */
  deleteRole(roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${roleId}`);
  }
}
