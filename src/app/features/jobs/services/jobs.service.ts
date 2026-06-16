import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  ApplyForMySelfRequest,
  UpdateJobApplicationRequest,
  JobApplicationDto,
  StageMasterDto,
  CreateStageMasterRequest,
  UpdateStageMasterRequest,
  MyJobApplicationsFilterParams,
  ReceivedJobApplicationsFilterParams,
  AtsFilterParams,
  CreateApplicationStageRequest,
  ApplicationStageDto,
  UpdateApplicationStageRequest,
  JobOpeningStatsDto
} from '../../../core/models/jobs.models';

@Injectable({
  providedIn: 'root'
})
export class JobsService {
  private readonly apiUrl = `${environment.apiUrl}/Jobs`;

  constructor(private http: HttpClient) { }

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

  getOpeningOverallDetails(): Observable<JobOpeningStatsDto | null> {
    return this.http
      .get<ServiceResponse<JobOpeningStatsDto>>(`${this.apiUrl}/OpeningOverallDetails`)
      .pipe(
        map((res) => (res.success && res.data ? res.data : null))
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

  applyForMySelf(request: ApplyForMySelfRequest): Observable<JobApplicationDto> {
    return this.http
      .post<ServiceResponse<JobApplicationDto>>(`${this.apiUrl}/applications/apply-for-myself`, request)
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

  getStageById(id: string): Observable<StageMasterDto | null> {
    return this.http
      .get<ServiceResponse<StageMasterDto>>(`${this.apiUrl}/stages/${id}`)
      .pipe(
        map((res) => (res.success && res.data ? res.data : null))
      );
  }

  createStage(request: CreateStageMasterRequest): Observable<StageMasterDto> {
    return this.http
      .post<ServiceResponse<StageMasterDto>>(`${this.apiUrl}/stages`, request)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to create stage');
          }
          return res.data;
        })
      );
  }

  updateStage(id: string, request: UpdateStageMasterRequest): Observable<StageMasterDto> {
    return this.http
      .put<ServiceResponse<StageMasterDto>>(`${this.apiUrl}/stages/${id}`, request)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to update stage');
          }
          return res.data;
        })
      );
  }

  deleteStage(id: string): Observable<boolean> {
    return this.http
      .delete<ServiceResponse<boolean>>(`${this.apiUrl}/stages/${id}`)
      .pipe(
        map((res) => res.success === true && res.data === true)
      );
  }

  getMyJobApplicationsPaged(params: MyJobApplicationsFilterParams = {}): Observable<PagedResult<JobApplicationDto>> {
    const { page = 1, pageSize = 10, search, stageId, status } = params;
    const queryParams: Record<string, string | number> = {
      pageNumber: page,
      pageSize
    };
    if (search != null && search.trim() !== '') queryParams['search'] = search.trim();
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

  getMySelfJobApplicationsPaged(params: MyJobApplicationsFilterParams = {}): Observable<PagedResult<JobApplicationDto>> {
    const { page = 1, pageSize = 10, search, stageId, status } = params;
    const queryParams: Record<string, string | number> = {
      pageNumber: page,
      pageSize
    };
    if (search != null && search.trim() !== '') queryParams['search'] = search.trim();
    if (stageId != null && stageId !== '') queryParams['stageId'] = stageId;
    if (status != null && status !== '') queryParams['status'] = status;
    return this.http
      .get<ServiceResponse<PagedResult<JobApplicationDto>>>(`${this.apiUrl}/applications/me/self`, { params: queryParams })
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

  getJobApplicationsPostedByMePaged(params: ReceivedJobApplicationsFilterParams = {}): Observable<PagedResult<JobApplicationDto>> {
    const { page = 1, pageSize = 10, search, applyDateFrom, applyDateTo, stageId, jobIds } = params;
    let httpParams = new HttpParams()
      .set('pageNumber', page.toString())
      .set('pageSize', pageSize.toString());
    if (search != null && search.trim() !== '') httpParams = httpParams.set('search', search.trim());
    if (applyDateFrom) httpParams = httpParams.set('applyDateFrom', applyDateFrom);
    if (applyDateTo) httpParams = httpParams.set('applyDateTo', applyDateTo);
    if (stageId != null && stageId !== '') httpParams = httpParams.set('stageId', stageId);
    if (jobIds && jobIds.length > 0) {
      jobIds.forEach(id => { httpParams = httpParams.append('jobIds', id); });
    }
    return this.http
      .get<ServiceResponse<PagedResult<JobApplicationDto>>>(`${this.apiUrl}/applications/posted-by-me`, { params: httpParams })
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

  getReceivedJobApplicationsPaged(params: ReceivedJobApplicationsFilterParams = {}): Observable<PagedResult<JobApplicationDto>> {
    const { page = 1, pageSize = 10, search, applyDateFrom, applyDateTo, stageId, jobIds } = params;
    let httpParams = new HttpParams()
      .set('pageNumber', page.toString())
      .set('pageSize', pageSize.toString());
    if (search != null && search.trim() !== '') httpParams = httpParams.set('search', search.trim());
    if (applyDateFrom) httpParams = httpParams.set('applyDateFrom', applyDateFrom);
    if (applyDateTo) httpParams = httpParams.set('applyDateTo', applyDateTo);
    if (stageId != null && stageId !== '') httpParams = httpParams.set('stageId', stageId);
    if (jobIds && jobIds.length > 0) {
      jobIds.forEach(id => { httpParams = httpParams.append('jobIds', id); });
    }
    return this.http
      .get<ServiceResponse<PagedResult<JobApplicationDto>>>(`${this.apiUrl}/applications/received`, { params: httpParams })
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

  getAtsApplicationsPaged(params: AtsFilterParams = {}): Observable<PagedResult<JobApplicationDto>> {
    const { page = 1, pageSize = 10, search, applyDateFrom, applyDateTo, jobIds } = params;
    let httpParams = new HttpParams()
      .set('pageNumber', page.toString())
      .set('pageSize', pageSize.toString());
    if (search != null && search.trim() !== '') httpParams = httpParams.set('search', search.trim());
    if (applyDateFrom) httpParams = httpParams.set('applyDateFrom', applyDateFrom);
    if (applyDateTo) httpParams = httpParams.set('applyDateTo', applyDateTo);
    if (jobIds && jobIds.length > 0) {
      jobIds.forEach(id => { httpParams = httpParams.append('jobIds', id); });
    }
    return this.http
      .get<ServiceResponse<PagedResult<JobApplicationDto>>>(`${this.apiUrl}/applications/ats-inbox`, { params: httpParams })
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

  enterApplicationToStage(jobApplyId: string): Observable<boolean> {
    return this.http
      .put<ServiceResponse<boolean>>(`${this.apiUrl}/applications/${jobApplyId}/enter-stage`, {})
      .pipe(
        map((res) => res.success === true && res.data === true)
      );
  }

  createApplicationStage(request: CreateApplicationStageRequest): Observable<ApplicationStageDto> {
    return this.http
      .post<ServiceResponse<ApplicationStageDto>>(
        `${this.apiUrl}/application-stages`,
        request
      )
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to add stage');
          }
          return res.data;
        })
      );
  }

  getApplicationStagesByJobApplyId(jobApplyId: string): Observable<ApplicationStageDto[]> {
    return this.http
      .get<ServiceResponse<ApplicationStageDto[]>>(
        `${this.apiUrl}/application-stages/by-application/${jobApplyId}`
      )
      .pipe(
        map((res) => (res.success && res.data ? res.data : []))
      );
  }

  updateApplicationStage(applicationStageId: string, request: UpdateApplicationStageRequest): Observable<ApplicationStageDto> {
    return this.http
      .put<ServiceResponse<ApplicationStageDto>>(
        `${this.apiUrl}/application-stages/${applicationStageId}`,
        request
      )
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to update stage');
          }
          return res.data;
        })
      );
  }

  deleteApplicationStage(applicationStageId: string): Observable<boolean> {
    return this.http
      .delete<ServiceResponse<boolean>>(`${this.apiUrl}/application-stages/${applicationStageId}`)
      .pipe(
        map((res) => res.success === true)
      );
  }
}
