import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/auth.models';

export interface GeoFenceDto {
  geoFenceId: string;
  organizationId: string;
  name: string;
  description?: string;
  address?: string;
  centerLatitude?: number;
  centerLongitude?: number;
  radiusMeters?: number;
  polygonCoords?: string;
  shape: 'circle' | 'polygon';
  isActive: boolean;
  createdAt: string;
}

export interface CreateGeoFenceDto {
  name: string;
  description?: string;
  address?: string;
  centerLatitude?: number;
  centerLongitude?: number;
  radiusMeters?: number;
  polygonCoords?: string;
  shape: 'circle' | 'polygon';
}

export interface ShiftGeoFenceDto {
  id: string;
  shiftId: string;
  geoFenceId: string;
  geoFenceName?: string;
  centerLatitude?: number;
  centerLongitude?: number;
  radiusMeters?: number;
  isActive: boolean;
}

export interface GeoClockInRequest {
  action: 'in' | 'out';
  latitude?: number;
  longitude?: number;
  geoFenceId?: string;
  faceDescriptor?: string;   // JSON string - 128 floats
  confidenceScore?: number;
  distanceScore?: number;
  matchResult: string;
  notes?: string;
  deviceInfo?: string;
}

export interface GeoClockInResponse {
  success: boolean;
  attendanceId?: string;
  sessionId?: string;
  locationStatus: string;
  distanceMeters?: number;
  violationId?: string;
  message: string;
}

export interface TeamLiveStreamDto {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  profilePhotoUrl?: string;
  lastCheckIn?: string;
  locationStatus: string;
  distanceFromFenceM?: number;
  geoFenceName?: string;
  latitude?: number;
  longitude?: number;
  deviceIp?: string;
  totalHours?: number;
  compliancePct?: number;
  shiftName?: string;
  attendanceStatus?: string;
}

export interface ViolationReportDto {
  violationId: string;
  violatedAt: string;
  actionTaken: string;
  distanceOverMeters: number;
  actualLatitude: number;
  actualLongitude: number;
  resolved: boolean;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  profilePhotoUrl?: string;
  geoFenceId?: string;
  geoFenceName?: string;
  centerLatitude?: number;
  centerLongitude?: number;
  radiusMeters?: number;
  shiftId?: string;
  shiftName?: string;
  faceMatchResult?: string;
  faceConfidenceScore?: number;
  faceReferencePhotoUrl?: string;
}

export interface SystemHealthDto {
  attendanceHealthPct: number;
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  geoFenceViolationsToday: number;
  totalDepartments: number;
  employeesInZone: number;
}

export interface SaveFaceDescriptorRequest {
  descriptorVector: string;  // JSON string
  sourcePhotoUrl: string;
}

@Injectable({ providedIn: 'root' })
export class GeoFenceService {
  private readonly api = `${environment.apiUrl}/GeoFence`;

  constructor(private http: HttpClient) {}

  // ── Geo-Fence CRUD ──────────────────────────────────────────────

  getAll(): Observable<GeoFenceDto[]> {
    return this.http.get<ApiResponse<GeoFenceDto[]>>(this.api).pipe(
      map(r => r.data || [])
    );
  }

  getById(id: string): Observable<GeoFenceDto> {
    return this.http.get<ApiResponse<GeoFenceDto>>(`${this.api}/${id}`).pipe(
      map(r => r.data!)
    );
  }

  create(dto: CreateGeoFenceDto): Observable<string> {
    return this.http.post<ApiResponse<string>>(this.api, dto).pipe(
      map(r => {
        if (!r.success) throw new Error(r.message || 'Failed to create geo-fence');
        return r.data!;
      })
    );
  }

  update(id: string, dto: CreateGeoFenceDto & { isActive: boolean }): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.api}/${id}`, dto).pipe(
      map(r => r.success)
    );
  }

  delete(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.api}/${id}`).pipe(
      map(r => r.success)
    );
  }

  toggleActive(id: string, isActive: boolean): Observable<boolean> {
    return this.http.patch<ApiResponse<boolean>>(`${this.api}/${id}/toggle`, isActive).pipe(
      map(r => r.success)
    );
  }

  // ── Shift ↔ Geo-Fence ──────────────────────────────────────────

  getByShift(shiftId: string): Observable<ShiftGeoFenceDto[]> {
    return this.http.get<ApiResponse<ShiftGeoFenceDto[]> | ShiftGeoFenceDto[]>(`${this.api}/shift/${shiftId}`).pipe(
      map((r: any) => {
        if (Array.isArray(r)) return r;
        if (Array.isArray(r?.data)) return r.data;
        if (Array.isArray(r?.result)) return r.result;
        return [];
      })
    );
  }

  linkToShift(shiftId: string, geoFenceId: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean> | { success?: boolean }>(
      `${this.api}/shift/${shiftId}/link/${geoFenceId}`, {}
    ).pipe(map((r: any) => r?.success !== false));
  }

  unlinkFromShift(shiftId: string, geoFenceId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.api}/shift/${shiftId}/unlink/${geoFenceId}`
    ).pipe(map(r => r.success));
  }

  // ── Face Recognition ───────────────────────────────────────────

  saveFaceDescriptor(dto: SaveFaceDescriptorRequest): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.api}/face-descriptor`, dto).pipe(
      map(r => {
        if (!r.success) throw new Error(r.message || 'Failed to save descriptor');
        return r.data!;
      })
    );
  }

  // ── Geo Clock In/Out ────────────────────────────────────────────

  geoClock(request: GeoClockInRequest): Observable<GeoClockInResponse> {
    return this.http.post<ApiResponse<GeoClockInResponse>>(`${this.api}/clock`, request).pipe(
      map(r => {
        if (!r.success) throw new Error(r.message || 'Clock failed');
        return r.data!;
      })
    );
  }

  // ── Dashboard ───────────────────────────────────────────────────

  getTeamLiveStream(): Observable<TeamLiveStreamDto[]> {
    return this.http.get<ApiResponse<TeamLiveStreamDto[]>>(`${this.api}/team-live-stream`).pipe(
      map(r => r.data || [])
    );
  }

  getViolations(startDate: string, endDate: string, shiftId?: string): Observable<ViolationReportDto[]> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    if (shiftId) params = params.set('shiftId', shiftId);
    const options = {
      params,
      headers: { 'X-Skip-Global-Error': 'true' }
    };

    return this.http.get<ApiResponse<ViolationReportDto[]> | ViolationReportDto[]>(
      `${this.api}/violations`,
      options
    ).pipe(
      map((response: any) => this.extractViolationList(response)),
      catchError((primaryError) => {
        let fallbackParams = new HttpParams()
          .set('fromDate', startDate)
          .set('toDate', endDate);
        if (shiftId) fallbackParams = fallbackParams.set('shiftId', shiftId);
        const fallbackOptions = {
          params: fallbackParams,
          headers: { 'X-Skip-Global-Error': 'true' }
        };

        return this.http.get<ApiResponse<ViolationReportDto[]> | ViolationReportDto[]>(
          `${this.api}/violations`,
          fallbackOptions
        ).pipe(
          map((response: any) => this.extractViolationList(response)),
          catchError(() => throwError(() => primaryError))
        );
      })
    );
  }

  private extractViolationList(response: any): ViolationReportDto[] {
    if (Array.isArray(response)) return response as ViolationReportDto[];
    if (Array.isArray(response?.data)) return response.data as ViolationReportDto[];
    if (Array.isArray(response?.result)) return response.result as ViolationReportDto[];
    return [];
  }

  getSystemHealth(): Observable<SystemHealthDto> {
    return this.http.get<ApiResponse<SystemHealthDto>>(`${this.api}/system-health`).pipe(
      map(r => r.data || {} as SystemHealthDto)
    );
  }
}