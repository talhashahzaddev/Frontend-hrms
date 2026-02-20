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
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ApplicationDetailDialogComponent } from '../application-detail-dialog/application-detail-dialog.component';
import { ApplyJobDialogComponent } from '../apply-job-dialog/apply-job-dialog.component';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { JobsService } from '../../services/jobs.service';
import { NotificationService } from '@core/services/notification.service';
import { JobApplicationDto, PagedResult, StageMasterDto } from '@core/models/jobs.models';

@Component({
  selector: 'app-my-applications',
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
    MatPaginatorModule,
    MatTooltipModule
  ],
  templateUrl: './my-applications.component.html',
  styleUrls: ['./my-applications.component.scss']
})
export class MyApplicationsComponent implements OnInit {
  applications: JobApplicationDto[] = [];
  isLoading = false;
  filterForm: FormGroup;
  page = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;
  stageOptions: { value: string; label: string }[] = [];

  constructor(
    private dialog: MatDialog,
    private jobsService: JobsService,
    private notification: NotificationService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      stageId: [''],
      status: ['']
    });
  }

  ngOnInit(): void {
    this.jobsService.getStages().subscribe({
      next: (list: StageMasterDto[]) => {
        this.stageOptions = [
          { value: '', label: 'All stages' },
          ...(list ?? []).map((s) => ({ value: s.stageId, label: s.stageName }))
        ];
      }
    });
    this.loadApplications();
  }

  loadApplications(): void {
    this.isLoading = true;
    const search = this.filterForm.get('search')?.value;
    const stageId = this.filterForm.get('stageId')?.value;
    const status = this.filterForm.get('status')?.value;
    this.jobsService.getMySelfJobApplicationsPaged({
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
