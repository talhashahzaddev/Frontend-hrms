import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ApplicationDetailDialogComponent } from '../application-detail-dialog/application-detail-dialog.component';
import { ApplyJobDialogComponent } from '../apply-job-dialog/apply-job-dialog.component';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { JobsService } from '../../services/jobs.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { JobApplicationDto, PagedResult, StageMasterDto } from '@core/models/jobs.models';

@Component({
  selector: 'app-applied-jobs',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatTabsModule
  ],
  templateUrl: './applied-jobs.component.html',
  styleUrls: ['./applied-jobs.component.scss']
})
export class AppliedJobsComponent implements OnInit {
  applications: JobApplicationDto[] = [];
  stages: StageMasterDto[] = [];
  isLoading = false;
  filterForm: FormGroup;
  page = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;

  /** Received (org-wide) applications – only for HR Manager / Super Admin */
  receivedApplications: JobApplicationDto[] = [];
  receivedFilterForm: FormGroup;
  receivedPage = 1;
  receivedPageSize = 10;
  receivedTotalCount = 0;
  receivedIsLoading = false;

  stageOptions: { value: string; label: string }[] = [];
  // statusOptions: { value: string; label: string }[] = [];

  constructor(
    private dialog: MatDialog,
    private jobsService: JobsService,
    private authService: AuthService,
    private notification: NotificationService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      stageId: [''],
      status: ['']
    });
    this.receivedFilterForm = this.fb.group({
      search: [''],
      applyDateFrom: [null as Date | null],
      applyDateTo: [null as Date | null],
      stageId: ['']
    });
  }

  get canSeeReceivedTab(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

  ngOnInit(): void {
    this.jobsService.getStages().subscribe({
      next: (list) => {
        this.stages = list ?? [];
        this.stageOptions = [
          { value: '', label: 'All stages' },
          ...this.stages.map((s) => ({ value: s.stageId, label: s.stageName }))
        ];
        // this.statusOptions = [
        //   { value: '', label: 'All statuses' },
        //   ...this.stages.map((s) => ({ value: s.stageName, label: s.stageName }))
        // ];
      }
    });
    this.loadApplications();
  }

  loadApplications(): void {
    this.isLoading = true;
    const search = this.filterForm.get('search')?.value;
    const stageId = this.filterForm.get('stageId')?.value;
    const status = this.filterForm.get('status')?.value;
    this.jobsService.getMyJobApplicationsPaged({
      page: this.page,
      pageSize: this.pageSize,
      search: search?.trim() || undefined,
      stageId: stageId || undefined,
      status: status || undefined
    }).subscribe({
      next: (result: PagedResult<JobApplicationDto>) => {
        this.applications = result.data ?? [];
        this.totalCount = result.totalCount ?? 0;
        this.totalPages = result.totalPages ?? 0;
        this.isLoading = false;
      },
      error: () => {
        this.applications = [];
        this.totalCount = 0;
        this.totalPages = 0;
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.loadApplications();
  }

  clearFilters(): void {
    this.filterForm.patchValue({ search: '', stageId: '', status: '' });
    this.page = 1;
    this.loadApplications();
  }

  hasFiltersApplied(): boolean {
    const v = this.filterForm.value;
    return !!(v.search?.trim() || v.stageId || v.status);
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadApplications();
  }

  loadReceivedApplications(): void {
    if (!this.canSeeReceivedTab) return;
    this.receivedIsLoading = true;
    const v = this.receivedFilterForm.value;
    const applyDateFrom = v.applyDateFrom instanceof Date ? v.applyDateFrom.toISOString().slice(0, 10) : (v.applyDateFrom || null);
    const applyDateTo = v.applyDateTo instanceof Date ? v.applyDateTo.toISOString().slice(0, 10) : (v.applyDateTo || null);
    this.jobsService.getReceivedJobApplicationsPaged({
      page: this.receivedPage,
      pageSize: this.receivedPageSize,
      search: v.search || undefined,
      applyDateFrom: applyDateFrom || undefined,
      applyDateTo: applyDateTo || undefined,
      stageId: v.stageId || undefined
    }).subscribe({
      next: (result: PagedResult<JobApplicationDto>) => {
        this.receivedApplications = result.data ?? [];
        this.receivedTotalCount = result.totalCount ?? 0;
        this.receivedIsLoading = false;
      },
      error: () => {
        this.receivedApplications = [];
        this.receivedTotalCount = 0;
        this.receivedIsLoading = false;
      }
    });
  }

  applyReceivedFilters(): void {
    this.receivedPage = 1;
    this.loadReceivedApplications();
  }

  clearReceivedFilters(): void {
    this.receivedFilterForm.patchValue({
      search: '',
      applyDateFrom: null,
      applyDateTo: null,
      stageId: ''
    });
    this.receivedPage = 1;
    this.loadReceivedApplications();
  }

  hasReceivedFiltersApplied(): boolean {
    const v = this.receivedFilterForm.value;
    const fromDate = v.applyDateFrom;
    const toDate = v.applyDateTo;
    return !!(v.search?.trim() || (fromDate && (fromDate instanceof Date || fromDate)) || (toDate && (toDate instanceof Date || toDate)) || v.stageId);
  }

  onReceivedPageChange(event: PageEvent): void {
    this.receivedPage = event.pageIndex + 1;
    this.receivedPageSize = event.pageSize;
    this.loadReceivedApplications();
  }

  onTabChange(index: number): void {
    if (index === 1) {
      this.loadReceivedApplications();
    }
  }

  viewJobDetails(app: JobApplicationDto): void {
    this.dialog.open(ApplicationDetailDialogComponent, {
      width: '560px',
      maxHeight: '90vh',
      panelClass: 'application-detail-dialog-panel',
      data: { jobApplyId: app.jobApplyId }
    });
  }

  editApplication(app: JobApplicationDto): void {
    const dialogRef = this.dialog.open(ApplyJobDialogComponent, {
      width: '560px',
      maxHeight: '90vh',
      panelClass: 'apply-job-dialog-panel',
      data: { mode: 'edit', application: app }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.loadApplications();
      }
    });
  }

  deleteApplication(app: JobApplicationDto): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Withdraw application',
      message: 'Are you sure you want to withdraw your application for',
      itemName: app.jobRoleName ?? 'this job',
      confirmButtonText: 'Yes, Withdraw'
    };
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-action-dialog-panel'
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.jobsService.deleteJobApplication(app.jobApplyId).subscribe({
          next: () => {
            this.notification.showSuccess('Application withdrawn successfully');
            this.loadApplications();
          },
          error: (err) => {
            this.notification.showError(err?.message || 'Failed to withdraw application');
          }
        });
      }
    });
  }

  getAppliedDate(app: JobApplicationDto): string {
    const d = app.createdDate;
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }
}
