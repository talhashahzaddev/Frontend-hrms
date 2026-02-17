import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  JobOpeningDto,
  CreateJobOpeningRequest,
  UpdateJobOpeningRequest,
  ServiceResponse,
  PagedResult,
  JobOpeningsFilterParams,
  CreateJobApplicationRequest,
  UpdateJobApplicationRequest,
  JobApplicationDto,
  StageMasterDto,
  MyJobApplicationsFilterParams
} from '../../../core/models/jobs.models';

@Injectable({
  providedIn: 'root'
})
export class JobsService {
  private readonly apiUrl = `${environment.apiUrl}/Jobs`;

  constructor(private http: HttpClient) {}

  getJobOpeningsPaged(params: JobOpeningsFilterParams = {}): Observable<PagedResult<JobOpeningDto>> {
    const { search, status, lastDateFrom, lastDateTo, page = 1, pageSize = 10 } = params;
    const queryParams: Record<string, string | number> = {
      pageNumber: page,
      pageSize
    };
    if (search != null && search.trim() !== '') queryParams['search'] = search.trim();
    if (status != null && status !== '') queryParams['status'] = status;
    if (lastDateFrom) queryParams['lastDateFrom'] = lastDateFrom;
    if (lastDateTo) queryParams['lastDateTo'] = lastDateTo;

    return this.http
      .get<ServiceResponse<PagedResult<JobOpeningDto>>>(`${this.apiUrl}/openings`, { params: queryParams })
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            return {
              data: [],
              totalCount: 0,
              page: 1,
              pageSize: pageSize,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false
            };
          }
          return res.data;
        })
      );
  }

  getJobOpeningById(id: string): Observable<JobOpeningDto | null> {
    return this.http
      .get<ServiceResponse<JobOpeningDto>>(`${this.apiUrl}/openings/${id}`)
      .pipe(
        map((res) => (res.success && res.data ? res.data : null))
      );
  }

  createJobOpening(request: CreateJobOpeningRequest): Observable<JobOpeningDto> {
    return this.http
      .post<ServiceResponse<JobOpeningDto>>(`${this.apiUrl}/openings`, request)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to create job opening');
          }
          return res.data;
        })
      );
  }

  updateJobOpening(id: string, request: UpdateJobOpeningRequest): Observable<JobOpeningDto> {
    return this.http
      .put<ServiceResponse<JobOpeningDto>>(`${this.apiUrl}/openings/${id}`, request)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to update job opening');
          }
          return res.data;
        })
      );
  }

  deleteJobOpening(id: string): Observable<boolean> {
    return this.http
      .delete<ServiceResponse<boolean>>(`${this.apiUrl}/openings/${id}`)
      .pipe(
        map((res) => res.success === true && res.data === true)
      );
  }

  createJobApplication(request: CreateJobApplicationRequest): Observable<JobApplicationDto> {
    return this.http
      .post<ServiceResponse<JobApplicationDto>>(`${this.apiUrl}/applications`, request)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to submit application');
          }
          return res.data;
        })
      );
  }

  getJobApplicationById(id: string): Observable<JobApplicationDto | null> {
    return this.http
      .get<ServiceResponse<JobApplicationDto>>(`${this.apiUrl}/applications/${id}`)
      .pipe(
        map((res) => (res.success && res.data ? res.data : null))
      );
  }

  updateJobApplication(id: string, request: UpdateJobApplicationRequest): Observable<JobApplicationDto> {
    return this.http
      .put<ServiceResponse<JobApplicationDto>>(`${this.apiUrl}/applications/${id}`, request)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to update application');
          }
          return res.data;
        })
      );
  }

  deleteJobApplication(id: string): Observable<boolean> {
    return this.http
      .delete<ServiceResponse<boolean>>(`${this.apiUrl}/applications/${id}`)
      .pipe(
        map((res) => res.success === true && res.data === true)
      );
  }

  getStages(): Observable<StageMasterDto[]> {
    return this.http
      .get<ServiceResponse<StageMasterDto[]>>(`${this.apiUrl}/stages`)
      .pipe(
        map((res) => (res.success && res.data ? res.data : []))
      );
  }

  getMyJobApplicationsPaged(params: MyJobApplicationsFilterParams = {}): Observable<PagedResult<JobApplicationDto>> {
    const { page = 1, pageSize = 10, stageId, status } = params;
    const queryParams: Record<string, string | number> = {
      pageNumber: page,
      pageSize
    };
    if (stageId != null && stageId !== '') queryParams['stageId'] = stageId;
    if (status != null && status !== '') queryParams['status'] = status;
    return this.http
      .get<ServiceResponse<PagedResult<JobApplicationDto>>>(`${this.apiUrl}/applications/me`, { params: queryParams })
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            return {
              data: [],
              totalCount: 0,
              page: 1,
              pageSize: pageSize,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false
            };
          }
          return res.data;
        })
      );
  }
}
