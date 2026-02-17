import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { CreateJobDialogComponent } from '../create-job-dialog/create-job-dialog.component';
import { ApplyJobDialogComponent } from '../apply-job-dialog/apply-job-dialog.component';
import { JobViewDialogComponent } from '../job-view-dialog/job-view-dialog.component';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { JobsService } from '../../services/jobs.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';
import { JobOpeningDto, PagedResult } from '@core/models/jobs.models';

@Component({
  selector: 'app-openings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatTooltipModule
  ],
  templateUrl: './openings.component.html',
  styleUrls: ['./openings.component.scss']
})
export class OpeningsComponent implements OnInit {
  openings: JobOpeningDto[] = [];
  isLoading = false;
  filterForm: FormGroup;
  page = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;

  get canManageJobs(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

  statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'Open', label: 'Open' },
    { value: 'Closed', label: 'Closed' },
    { value: 'Draft', label: 'Draft' }
  ];

  constructor(
    private dialog: MatDialog,
    private jobsService: JobsService,
    private notification: NotificationService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      status: [''],
      lastDateFrom: [null as Date | null],
      lastDateTo: [null as Date | null]
    });
  }

  ngOnInit(): void {
    this.loadOpenings();
  }

  loadOpenings(): void {
    this.isLoading = true;
    const search = this.filterForm.get('search')?.value;
    const status = this.filterForm.get('status')?.value;
    const lastDateFrom = this.filterForm.get('lastDateFrom')?.value as Date | null;
    const lastDateTo = this.filterForm.get('lastDateTo')?.value as Date | null;
    this.jobsService.getJobOpeningsPaged({
      search: search || undefined,
      status: status || undefined,
      lastDateFrom: lastDateFrom ? lastDateFrom.toISOString().split('T')[0] : undefined,
      lastDateTo: lastDateTo ? lastDateTo.toISOString().split('T')[0] : undefined,
      page: this.page,
      pageSize: this.pageSize
    }).subscribe({
      next: (result: PagedResult<JobOpeningDto>) => {
        this.openings = result.data ?? [];
        this.totalCount = result.totalCount ?? 0;
        this.totalPages = result.totalPages ?? 0;
        this.isLoading = false;
      },
      error: () => {
        this.openings = [];
        this.totalCount = 0;
        this.totalPages = 0;
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.loadOpenings();
  }

  clearFilters(): void {
    this.filterForm.patchValue({ search: '', status: '', lastDateFrom: null, lastDateTo: null });
    this.page = 1;
    this.loadOpenings();
  }

  hasFiltersApplied(): boolean {
    const v = this.filterForm.value;
    return !!(v.search?.trim() || v.status || v.lastDateFrom || v.lastDateTo);
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadOpenings();
  }

  openCreateJobDialog(): void {
    const dialogRef = this.dialog.open(CreateJobDialogComponent, {
      width: '900px',
      maxHeight: '90vh',
      panelClass: 'create-job-dialog-panel',
      data: { mode: 'create' }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.page = 1;
      this.loadOpenings();
    });
  }

  viewDetails(job: JobOpeningDto): void {
    this.dialog.open(JobViewDialogComponent, {
      width: '560px',
      maxHeight: '90vh',
      data: { jobId: job.jobId }
    });
  }

  openApplyJobDialog(job: JobOpeningDto): void {
    this.dialog.open(ApplyJobDialogComponent, {
      width: '560px',
      maxHeight: '90vh',
      panelClass: 'apply-job-dialog-panel',
      data: { job }
    });
  }

  editJob(job: JobOpeningDto): void {
    const dialogRef = this.dialog.open(CreateJobDialogComponent, {
      width: '900px',
      maxHeight: '90vh',
      panelClass: 'create-job-dialog-panel',
      data: { mode: 'edit', job }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.page = 1;
      this.loadOpenings();
    });
  }

  deleteJob(job: JobOpeningDto): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Job Opening',
      message: `Are you sure you want to delete "${job.jobRoleName}"?`,
      itemName: job.jobRoleName,
      confirmButtonText: 'Yes, Delete'
    };
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-action-dialog-panel'
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.jobsService.deleteJobOpening(job.jobId).subscribe({
          next: () => {
            this.notification.showSuccess('Job opening deleted successfully');
            this.page = 1;
            this.loadOpenings();
          },
          error: (err) => {
            this.notification.showError(err?.message || 'Failed to delete job opening');
            this.loadOpenings();
          }
        });
      }
    });
  }

  getMetaParts(job: JobOpeningDto): string[] {
    const parts: string[] = [];
    if (job.departmentName) parts.push(job.departmentName);
    if (job.location) parts.push(job.location);
    if (job.workMode) parts.push(job.workMode);
    if (job.employmentType) parts.push(job.employmentType);
    return parts;
  }

  getMetaLine(job: JobOpeningDto): string {
    return this.getMetaParts(job).join(' · ');
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
