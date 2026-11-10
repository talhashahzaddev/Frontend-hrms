import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse } from '../models/super-admin.models';
import { BackupSettings, DatabaseBackup, UpdateBackupSettingsRequest } from '../models/backup.models';

@Injectable({ providedIn: 'root' })
export class DatabaseBackupService {
  // Under /SuperAdmin so PlatformAdminInterceptor attaches the platform token.
  private readonly API_URL = `${environment.apiUrl}/SuperAdmin/backups`;

  constructor(private http: HttpClient) {}

  /** from/to filter on when the backup started. */
  getBackups(from?: Date | null, to?: Date | null): Observable<ApiResponse<DatabaseBackup[]>> {
    let params = new HttpParams();
    if (from) params = params.set('from', from.toISOString());
    if (to) params = params.set('to', to.toISOString());
    return this.http.get<ApiResponse<DatabaseBackup[]>>(this.API_URL, { params });
  }

  startBackup(): Observable<ApiResponse<DatabaseBackup>> {
    return this.http.post<ApiResponse<DatabaseBackup>>(this.API_URL, {});
  }

  downloadBackup(backupId: string): Observable<Blob> {
    return this.http.get(`${this.API_URL}/${backupId}/download`, { responseType: 'blob' });
  }

  deleteBackup(backupId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.API_URL}/${backupId}`);
  }

  getSettings(): Observable<ApiResponse<BackupSettings>> {
    return this.http.get<ApiResponse<BackupSettings>>(`${this.API_URL}/settings`);
  }

  updateSettings(request: UpdateBackupSettingsRequest): Observable<ApiResponse<BackupSettings>> {
    return this.http.put<ApiResponse<BackupSettings>>(`${this.API_URL}/settings`, request);
  }
}
