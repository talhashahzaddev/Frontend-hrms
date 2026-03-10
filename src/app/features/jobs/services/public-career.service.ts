import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
    JobOpeningDto,
    JobApplicationDto,
    CreateJobApplicationRequest,
    ServiceResponse,
    PagedResult
} from '../../../core/models/jobs.models';

@Injectable({
    providedIn: 'root'
})
export class PublicCareerService {
    private readonly apiUrl = `${environment.apiUrl}/Career`;
    private readonly uploadsUrl = `${environment.apiUrl}/uploads`;

    constructor(private http: HttpClient) { }

    getExternalJobOpeningsPaged(
        domain: string,
        params: {
            search?: string;
            employmentType?: string;
            lastDateFrom?: string;
            lastDateTo?: string;
            page?: number;
            pageSize?: number;
        } = {}
    ): Observable<PagedResult<JobOpeningDto>> {
        const { search, employmentType = 'Full-time', lastDateFrom, lastDateTo, page = 1, pageSize = 10 } = params;

        const queryParams: Record<string, string | number> = {
            domain,
            pageNumber: page,
            pageSize
        };

        if (search != null && search.trim() !== '') queryParams['search'] = search.trim();
        if (employmentType != null && employmentType !== '') queryParams['employmentType'] = employmentType;
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

    getExternalJobByJobCode(jobCode: string, domain: string): Observable<JobOpeningDto | null> {
        return this.http
            .get<ServiceResponse<JobOpeningDto>>(`${this.apiUrl}/openings/${jobCode}`, { params: { domain } })
            .pipe(
                map((res) => (res.success && res.data ? res.data : null))
            );
    }

    applyJobByExternalCandidate(domain: string, request: CreateJobApplicationRequest): Observable<ServiceResponse<JobApplicationDto>> {
        return this.http
            .post<ServiceResponse<JobApplicationDto>>(`${this.apiUrl}/applications`, request, { params: { domain } });
    }

    uploadFile(file: File): Observable<string> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<{ url: string }>(`${this.uploadsUrl}/files`, formData).pipe(
            map((res) => {
                if (!res?.url) throw new Error('Upload failed');
                return res.url;
            })
        );
    }

    deleteFile(fileUrl: string): Observable<boolean> {
        return this.http.delete<{ message: string }>(`${this.uploadsUrl}/files`, { body: { fileUrl } }).pipe(
            map(() => true)
        );
    }

    getCompanyCareerDetails(domain: string): Observable<any> {
        return this.http
            .get<ServiceResponse<any>>(`${this.apiUrl}/companycareerdetails`, { params: { domain } })
            .pipe(
                map((res) => (res.success && res.data ? res.data : null))
            );
    }
}