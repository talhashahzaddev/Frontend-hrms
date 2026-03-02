import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { PublicCareerService } from '../../services/public-career.service';
import { JobOpeningDto, PagedResult } from '@core/models/jobs.models';

@Component({
    selector: 'app-public-career',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatPaginatorModule,
        MatTooltipModule
    ],
    templateUrl: './public-career.component.html',
    styleUrls: ['./public-career.component.scss']
})
export class PublicCareerComponent implements OnInit {
    @ViewChild('jobDetailsDialog') jobDetailsDialog!: TemplateRef<any>;

    searchForm: FormGroup;
    jobs: JobOpeningDto[] = [];
    isLoading = false;
    page = 1;
    pageSize = 10;
    totalCount = 0;
    totalPages = 0;

    // Statistics
    totalOpenings = 0;
    totalLocations = 0;
    totalDepartments = 0;

    // Filter options
    statusOptions = [
        { value: '', label: 'All statuses' },
        { value: 'Open', label: 'Open' },
        { value: 'Closed', label: 'Closed' }
    ];
    departments: string[] = [];
    locations: string[] = [];

    private currentJob: JobOpeningDto | null = null;

    constructor(
        private fb: FormBuilder,
        private publicCareerService: PublicCareerService,
        private dialog: MatDialog,
        private router: Router
    ) {
        this.searchForm = this.fb.group({
            search: [''],
            status: ['Open'],
            lastDateFrom: [null as Date | null],
            lastDateTo: [null as Date | null]
        });
    }

    ngOnInit(): void {
        this.loadStatistics();
        this.loadFilterOptions();
        this.setupSearch();
    }

    private getDomainFromUrl(): string {
        const hostname = window.location.hostname;

        if (hostname.includes('.briskpeople.com')) {
            return hostname.split('.briskpeople.com')[0];
        }

        if (hostname.includes('.localhost')) {
            return hostname.split('.localhost')[0];
        }

        // Simple fallback: if there's a dot, take the first part
        const parts = hostname.split('.');
        if (parts.length > 1) {
            return parts[0];
        }

        return hostname;
    }

    private setupSearch(): void {
        this.searchForm.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(() => this.loadJobs())
        ).subscribe();
    }

    private loadStatistics(): void {
        const domain = this.getDomainFromUrl();
        this.publicCareerService.getExternalJobOpeningsPaged(domain, { page: 1, pageSize: 1, status: 'Open' }).subscribe({
            next: (result) => {
                this.totalOpenings = result.totalCount || 0;
            }
        });
    }

    private loadFilterOptions(): void {
        const domain = this.getDomainFromUrl();
        this.publicCareerService.getExternalJobOpeningsPaged(domain, { page: 1, pageSize: 1000, status: 'Open' }).subscribe({
            next: (result) => {
                const jobs = result.data || [];
                this.departments = [...new Set(jobs.map(j => j.departmentName).filter(Boolean) as string[])];
                this.locations = [...new Set(jobs.map(j => j.location).filter(Boolean) as string[])];
                this.calculateStats();
            }
        });
    }

    private calculateStats(): void {
        this.totalLocations = this.locations.length;
        this.totalDepartments = this.departments.length;
    }

    private loadJobs(): Observable<PagedResult<JobOpeningDto>> {
        this.isLoading = true;
        const { search, status, lastDateFrom, lastDateTo } = this.searchForm.value;
        const domain = this.getDomainFromUrl();

        return this.publicCareerService.getExternalJobOpeningsPaged(domain, {
            search: search || undefined,
            status: status || undefined,
            lastDateFrom: lastDateFrom ? lastDateFrom.toISOString().split('T')[0] : undefined,
            lastDateTo: lastDateTo ? lastDateTo.toISOString().split('T')[0] : undefined,
            page: this.page,
            pageSize: this.pageSize
        }).pipe(
            map((result) => {
                this.jobs = result.data ?? [];
                this.totalCount = result.totalCount ?? 0;
                this.totalPages = result.totalPages ?? 0;
                this.isLoading = false;
                return result;
            })
        );
    }

    searchJobs(): void {
        this.page = 1;
        this.loadJobs().subscribe();
    }

    clearFilters(): void {
        this.searchForm.patchValue({ search: '', status: 'Open', lastDateFrom: null, lastDateTo: null });
        this.page = 1;
        this.loadJobs().subscribe();
    }

    hasFilters(): boolean {
        const v = this.searchForm.value;
        return !!(v.search?.trim() || v.status !== 'Open' || v.lastDateFrom || v.lastDateTo);
    }

    onPageChange(event: PageEvent): void {
        this.page = event.pageIndex + 1;
        this.pageSize = event.pageSize;
        this.loadJobs().subscribe();
    }

    viewJobDetails(job: JobOpeningDto): void {
        this.currentJob = job;
        this.dialog.open(this.jobDetailsDialog, {
            width: '600px',
            maxHeight: '90vh'
        });
    }

    closeJobDetailsDialog(): void {
        this.dialog.closeAll();
    }

    applyForJob(job: JobOpeningDto): void {
        // Navigate to apply page or open application form
        this.router.navigate(['/jobs/apply', job.jobId]);
    }

    getMetaLine(job: JobOpeningDto): string {
        const parts = [];
        if (job.departmentName) parts.push(job.departmentName);
        if (job.location) parts.push(job.location);
        if (job.workMode) parts.push(job.workMode);
        return parts.join(' · ');
    }

    getExperienceText(job: JobOpeningDto): string {
        if (job.experienceMin != null && job.experienceMax != null) {
            return `${job.experienceMin}-${job.experienceMax} yrs`;
        }
        if (job.experienceMin != null) return `${job.experienceMin}+ yrs`;
        if (job.experienceMax != null) return `Up to ${job.experienceMax} yrs`;
        return '';
    }

    getCtcText(job: JobOpeningDto): string {
        if (job.ctcMin == null && job.ctcMax == null) return '';
        const cur = job.currency || '';
        if (job.ctcMin != null && job.ctcMax != null) {
            return `${cur} ${job.ctcMin} - ${job.ctcMax}`;
        }
        if (job.ctcMin != null) return `${cur} ${job.ctcMin}+`;
        if (job.ctcMax != null) return `Up to ${cur} ${job.ctcMax}`;
        return '';
    }
}
