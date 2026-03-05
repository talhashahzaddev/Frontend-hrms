import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { PublicCareerService } from '../../services/public-career.service';
import { JobOpeningDto } from '@core/models/jobs.models';
import { CompanyCareerDetails } from '../public-career/public-career.component';
import { CareerApplyDialogComponent } from '../career-apply-dialog/career-apply-dialog.component';

@Component({
    selector: 'app-career-job-detail',
    standalone: true,
    imports: [
        CommonModule,
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatDialogModule
    ],
    templateUrl: './career-job-detail.component.html',
    styleUrls: ['./career-job-detail.component.scss']
})
export class CareerJobDetailComponent implements OnInit {
    job: JobOpeningDto | null = null;
    companyDetails: CompanyCareerDetails | null = null;
    isLoading = true;
    errorMessage = '';
    currentYear = new Date().getFullYear();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private publicCareerService: PublicCareerService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        const jobCode = this.route.snapshot.paramMap.get('jobCode');
        if (!jobCode) {
            this.errorMessage = 'Job code not provided';
            this.isLoading = false;
            return;
        }

        this.loadCompanyDetails();
        this.loadJobDetails(jobCode);
    }

    // ── Domain helper ──
    private getDomainFromUrl(): string {
        const hostname = window.location.hostname;

        if (hostname.includes('.briskpeople.com')) {
            return hostname.split('.briskpeople.com')[0];
        }

        if (hostname.includes('.localhost')) {
            return hostname.split('.localhost')[0];
        }

        const parts = hostname.split('.');
        if (parts.length > 1) {
            return parts[0];
        }

        return hostname;
    }

    private loadCompanyDetails(): void {
        const domain = this.getDomainFromUrl();
        this.publicCareerService.getCompanyCareerDetails(domain).subscribe({
            next: (details) => {
                this.companyDetails = details;
            },
            error: (err) => {
                console.error('Failed to load company career details', err);
            }
        });
    }

    private loadJobDetails(jobCode: string): void {
        const domain = this.getDomainFromUrl();
        this.isLoading = true;

        this.publicCareerService.getExternalJobByJobCode(jobCode, domain).subscribe({
            next: (job) => {
                if (job) {
                    this.job = job;
                } else {
                    this.errorMessage = 'Job opening not found';
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Failed to load job details', err);
                this.errorMessage = 'Failed to load job details. Please try again.';
                this.isLoading = false;
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/career']);
    }

    applyForJob(): void {
        if (!this.job) return;

        const domain = this.getDomainFromUrl();
        this.dialog.open(CareerApplyDialogComponent, {
            width: '620px',
            maxHeight: '90vh',
            panelClass: 'career-apply-dialog-panel',
            disableClose: false,
            data: {
                job: this.job,
                domain: domain
            }
        });
    }

    getExperienceText(job: JobOpeningDto): string {
        if (job.experienceMin != null && job.experienceMax != null) {
            return `${job.experienceMin} - ${job.experienceMax} years`;
        }
        if (job.experienceMin != null) return `${job.experienceMin}+ years`;
        if (job.experienceMax != null) return `Up to ${job.experienceMax} years`;
        return '';
    }

    getCtcText(job: JobOpeningDto): string {
        if (job.ctcMin == null && job.ctcMax == null) return '';
        const cur = job.currency || '';
        if (job.ctcMin != null && job.ctcMax != null) {
            return `${cur} ${job.ctcMin.toLocaleString()} - ${job.ctcMax.toLocaleString()}`;
        }
        if (job.ctcMin != null) return `${cur} ${job.ctcMin.toLocaleString()}+`;
        if (job.ctcMax != null) return `Up to ${cur} ${job.ctcMax.toLocaleString()}`;
        return '';
    }

    getTimeAgo(dateStr?: string | null): string {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHrs = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHrs / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);

        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
        if (diffHrs < 24) return `${diffHrs} ${diffHrs === 1 ? 'hour' : 'hours'} ago`;
        if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
        if (diffWeeks < 5) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
        return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    }

    getDaysRemaining(dateStr?: string | null): string {
        if (!dateStr) return '';
        const deadline = new Date(dateStr);
        if (isNaN(deadline.getTime())) return '';
        const now = new Date();
        const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) return 'Expired';
        if (diff === 0) return 'Last day!';
        if (diff === 1) return '1 day left';
        return `${diff} days left`;
    }

    isDeadlineUrgent(dateStr?: string | null): boolean {
        if (!dateStr) return false;
        const deadline = new Date(dateStr);
        if (isNaN(deadline.getTime())) return false;
        const now = new Date();
        const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 7;
    }
}
