import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  ApiResponse,
  PagedResult,
  DemoInquiry,
  CreateDemoInquiryRequest,
  UpdateDemoInquiryStatusRequest,
  DemoInquiryFilter
} from '../models/super-admin.models';

@Injectable({ providedIn: 'root' })
export class DemoInquiryService {
  private readonly API_URL = `${environment.apiUrl}/DemoInquiry`;

  constructor(private http: HttpClient) {}

  /** Submit a demo inquiry (public, no auth) */
  submitInquiry(request: CreateDemoInquiryRequest): Observable<ApiResponse<DemoInquiry>> {
    return this.http.post<ApiResponse<DemoInquiry>>(this.API_URL, request);
  }

  /** Get all inquiries (Platform Admin only) */
  getInquiries(filter: DemoInquiryFilter): Observable<ApiResponse<PagedResult<DemoInquiry>>> {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.search) params = params.set('search', filter.search);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortDirection) params = params.set('sortDirection', filter.sortDirection);

    return this.http.get<ApiResponse<PagedResult<DemoInquiry>>>(this.API_URL, { params });
  }

  /** Get a single inquiry (Platform Admin only) */
  getInquiryById(inquiryId: string): Observable<ApiResponse<DemoInquiry>> {
    return this.http.get<ApiResponse<DemoInquiry>>(`${this.API_URL}/${inquiryId}`);
  }

  /** Update inquiry status (Platform Admin only) */
  updateInquiryStatus(inquiryId: string, request: UpdateDemoInquiryStatusRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.API_URL}/${inquiryId}/status`, request);
  }
}
