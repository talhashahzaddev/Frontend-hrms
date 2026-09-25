import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse } from '@core/models/auth.models';
import { TokenValidationResponse } from '../../platform-admin/models/user-invitation.models';

@Injectable({ providedIn: 'root' })
export class SetPasswordService {
  private readonly API_URL = `${environment.apiUrl}/SetPassword`;

  constructor(private http: HttpClient) {}

  validateToken(token: string): Observable<ApiResponse<TokenValidationResponse>> {
    return this.http.get<ApiResponse<TokenValidationResponse>>(`${this.API_URL}/validate`, {
      params: { token }
    });
  }

  setPassword(token: string, password: string, organizationName: string): Observable<ApiResponse<boolean>> {
    const payload = { token, password, organizationName };
    return this.http.post<ApiResponse<boolean>>(this.API_URL, payload);
  }
}
