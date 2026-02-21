import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { JobOpeningDto } from '@core/models/jobs.models';
import { JobsService } from '@features/jobs/services/jobs.service';

export interface JobViewDialogData {
  jobId: string;
}

@Component({
  selector: 'app-job-view-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './job-view-dialog.component.html',
  styleUrls: ['./job-view-dialog.component.scss']
})
export class JobViewDialogComponent implements OnInit {
  job: JobOpeningDto | null = null;
  isLoading = true;
  error: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: JobViewDialogData,
    private dialogRef: MatDialogRef<JobViewDialogComponent>,
    private jobsService: JobsService
  ) {}

  ngOnInit(): void {
    this.jobsService.getJobOpeningById(this.data.jobId).subscribe({
      next: (j) => {
        this.job = j;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load job details';
        this.isLoading = false;
      }
    });
  }

  getMetaLine(job: JobOpeningDto): string {
    const parts: string[] = [];
    if (job.departmentName) parts.push(job.departmentName);
    if (job.location) parts.push(job.location);
    if (job.workMode) parts.push(job.workMode);
    if (job.employmentType) parts.push(job.employmentType);
    return parts.join(' · ');
  }

  getExperienceText(job: JobOpeningDto): string {
    if (job.experienceMin != null && job.experienceMax != null) return `${job.experienceMin}-${job.experienceMax} yrs`;
    if (job.experienceMin != null) return `${job.experienceMin}+ yrs`;
    if (job.experienceMax != null) return `Up to ${job.experienceMax} yrs`;
    return '—';
  }

  getCtcText(job: JobOpeningDto): string {
    if (job.ctcMin == null && job.ctcMax == null) return '—';
    const cur = job.currency || '';
    if (job.ctcMin != null && job.ctcMax != null) return `${cur} ${job.ctcMin} - ${job.ctcMax}`;
    if (job.ctcMin != null) return `${cur} ${job.ctcMin}+`;
    if (job.ctcMax != null) return `Up to ${cur} ${job.ctcMax}`;
    return '—';
  }

  close(): void {
    this.dialogRef.close();
  }
}
