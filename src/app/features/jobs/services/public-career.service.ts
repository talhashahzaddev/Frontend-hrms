import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
    JobOpeningDto,
    ServiceResponse,
    PagedResult
} from '../../../core/models/jobs.models';

@Injectable({
    providedIn: 'root'
})
export class PublicCareerService {
    private readonly apiUrl = `${environment.apiUrl}/Career`;

    constructor(private http: HttpClient) { }

    getExternalJobOpeningsPaged(
        domain: string,
        params: {
            search?: string;
            status?: string;
            lastDateFrom?: string;
            lastDateTo?: string;
            page?: number;
            pageSize?: number;
        } = {}
    ): Observable<PagedResult<JobOpeningDto>> {
        const { search, status = 'Open', lastDateFrom, lastDateTo, page = 1, pageSize = 10 } = params;

        const queryParams: Record<string, string | number> = {
            domain,
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

    getExternalJobOpeningById(id: string): Observable<JobOpeningDto | null> {
        return this.http
            .get<ServiceResponse<JobOpeningDto>>(`${this.apiUrl}/openings/${id}`)
            .pipe(
                map((res) => (res.success && res.data ? res.data : null))
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