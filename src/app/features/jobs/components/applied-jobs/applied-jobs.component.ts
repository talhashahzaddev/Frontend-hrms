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
import { DragDropModule, CdkDragDrop, transferArrayItem, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApplicationDetailDialogComponent } from '../application-detail-dialog/application-detail-dialog.component';
import { ApplicationProcessDialogComponent } from '../application-process-dialog/application-process-dialog.component';
import { ApplyJobDialogComponent } from '../apply-job-dialog/apply-job-dialog.component';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { JobsService } from '../../services/jobs.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { JobApplicationDto, JobOpeningDto, PagedResult, StageMasterDto } from '@core/models/jobs.models';
import { EditApplicationStageDialogComponent } from '../edit-application-stage-dialog/edit-application-stage-dialog.component';

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
    MatTabsModule,
    DragDropModule
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

  /** Received Application By My Job Post – HR Manager + Super Admin */
  postedByMeApplications: JobApplicationDto[] = [];
  postedByMeFilterForm: FormGroup;
  postedByMePage = 1;
  postedByMePageSize = 10;
  postedByMeTotalCount = 0;
  postedByMeIsLoading = false;

  /** All Job Applications (org-wide) – Super Admin only */
  receivedApplications: JobApplicationDto[] = [];
  receivedFilterForm: FormGroup;
  receivedPage = 1;
  receivedPageSize = 10;
  receivedTotalCount = 0;
  receivedIsLoading = false;

  stageOptions: { value: string; label: string }[] = [];
  jobOptions: { value: string; label: string }[] = [];
  allJobs: JobOpeningDto[] = [];

  /** Mutable per-column arrays for CDK DnD – Posted By Me board */
  postedByMeColumnData: { col: { stageId: string | null; stageName: string }; apps: JobApplicationDto[] }[] = [];
  /** Mutable per-column arrays for CDK DnD – Received board */
  receivedColumnData: { col: { stageId: string | null; stageName: string }; apps: JobApplicationDto[] }[] = [];

  /** Connected drop list IDs for Posted By Me board */
  get postedByMeDropIds(): string[] {
    return this.postedByMeColumnData.map((_, i) => `pbm-col-${i}`);
  }

  /** Connected drop list IDs for Received board */
  get receivedDropIds(): string[] {
    return this.receivedColumnData.map((_, i) => `rec-col-${i}`);
  }

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
    this.postedByMeFilterForm = this.fb.group({
      search: [''],
      applyDateFrom: [null as Date | null],
      applyDateTo: [null as Date | null],
      stageId: [''],
      jobId: ['']
    });
    this.receivedFilterForm = this.fb.group({
      search: [''],
      applyDateFrom: [null as Date | null],
      applyDateTo: [null as Date | null],
      stageId: [''],
      jobId: ['']
    });
  }

  /** Show tab group (MY, PostedByMe, and optionally All) for HR Manager + Super Admin */
  get canSeeReceivedTab(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

  /** Show "All Job Applications" tab only for Super Admin */
  get canSeeAllApplicationsTab(): boolean {
    return this.authService.hasRole('Super Admin');
  }

  ngOnInit(): void {
    this.jobsService.getStages().subscribe({
      next: (list) => {
        this.stages = list ?? [];
        this.stageOptions = [
          { value: '', label: 'All stages' },
          ...this.stages.map((s) => ({ value: s.stageId, label: s.stageName }))
        ];
      }
    });

    this.jobsService.getJobOpeningsPaged({ pageSize: 100 }).subscribe({
      next: (result) => {
        this.allJobs = result.data ?? [];
        this.jobOptions = [
          { value: '', label: 'All jobs' },
          ...this.allJobs.map((j) => ({ value: j.jobId, label: j.jobRoleName }))
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

  loadPostedByMeApplications(): void {
    if (!this.canSeeReceivedTab) return;
    this.postedByMeIsLoading = true;
    const v = this.postedByMeFilterForm.value;
    const applyDateFrom = v.applyDateFrom instanceof Date ? v.applyDateFrom.toISOString().slice(0, 10) : (v.applyDateFrom || null);
    const applyDateTo = v.applyDateTo instanceof Date ? v.applyDateTo.toISOString().slice(0, 10) : (v.applyDateTo || null);
    this.jobsService.getJobApplicationsPostedByMePaged({
      page: this.postedByMePage,
      pageSize: this.postedByMePageSize,
      search: v.search || undefined,
      applyDateFrom: applyDateFrom || undefined,
      applyDateTo: applyDateTo || undefined,
      stageId: v.stageId || undefined,
      jobId: v.jobId || undefined
    }).subscribe({
      next: (result: PagedResult<JobApplicationDto>) => {
        this.postedByMeApplications = result.data ?? [];
        this.postedByMeTotalCount = result.totalCount ?? 0;
        this.postedByMeIsLoading = false;
        this.buildPostedByMeColumnData();
      },
      error: () => {
        this.postedByMeApplications = [];
        this.postedByMeTotalCount = 0;
        this.postedByMeIsLoading = false;
        this.buildPostedByMeColumnData();
      }
    });
  }

  applyPostedByMeFilters(): void {
    this.postedByMePage = 1;
    this.loadPostedByMeApplications();
  }

  clearPostedByMeFilters(): void {
    this.postedByMeFilterForm.patchValue({
      search: '',
      applyDateFrom: null,
      applyDateTo: null,
      stageId: '',
      jobId: ''
    });
    this.postedByMePage = 1;
    this.loadPostedByMeApplications();
  }

  hasPostedByMeFiltersApplied(): boolean {
    const v = this.postedByMeFilterForm.value;
    const fromDate = v.applyDateFrom;
    const toDate = v.applyDateTo;
    return !!(v.search?.trim() || (fromDate && (fromDate instanceof Date || fromDate)) || (toDate && (toDate instanceof Date || toDate)) || v.stageId || v.jobId);
  }

  onPostedByMePageChange(event: PageEvent): void {
    this.postedByMePage = event.pageIndex + 1;
    this.postedByMePageSize = event.pageSize;
    this.loadPostedByMeApplications();
  }

  loadReceivedApplications(): void {
    if (!this.canSeeAllApplicationsTab) return;
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
      stageId: v.stageId || undefined,
      jobId: v.jobId || undefined
    }).subscribe({
      next: (result: PagedResult<JobApplicationDto>) => {
        this.receivedApplications = result.data ?? [];
        this.receivedTotalCount = result.totalCount ?? 0;
        this.receivedIsLoading = false;
        this.buildReceivedColumnData();
      },
      error: () => {
        this.receivedApplications = [];
        this.receivedTotalCount = 0;
        this.receivedIsLoading = false;
        this.buildReceivedColumnData();
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
      stageId: '',
      jobId: ''
    });
    this.receivedPage = 1;
    this.loadReceivedApplications();
  }

  hasReceivedFiltersApplied(): boolean {
    const v = this.receivedFilterForm.value;
    const fromDate = v.applyDateFrom;
    const toDate = v.applyDateTo;
    return !!(v.search?.trim() || (fromDate && (fromDate instanceof Date || fromDate)) || (toDate && (toDate instanceof Date || toDate)) || v.stageId || v.jobId);
  }

  onReceivedPageChange(event: PageEvent): void {
    this.receivedPage = event.pageIndex + 1;
    this.receivedPageSize = event.pageSize;
    this.loadReceivedApplications();
  }

  onTabChange(index: number): void {
    if (index === 1) {
      this.loadPostedByMeApplications();
    } else if (index === 2 && this.canSeeAllApplicationsTab) {
      this.loadReceivedApplications();
    }
  }

  // ==================== Kanban / DnD helpers ====================

  /** Stages sorted by stageOrder for board columns */
  get orderedStages(): StageMasterDto[] {
    if (!this.stages?.length) return [];
    return [...this.stages].sort((a, b) => (a.stageOrder ?? 999) - (b.stageOrder ?? 999));
  }

  /** All board column definitions (Applied + each stage) */
  get boardColumns(): { stageId: string | null; stageName: string }[] {
    return [
      { stageId: null, stageName: 'Applied' },
      ...this.orderedStages.map((s) => ({ stageId: s.stageId, stageName: s.stageName }))
    ];
  }

  /** Build the mutable column-data array used by Posted By Me DnD board */
  private buildPostedByMeColumnData(): void {
    const stageIds = new Set(this.orderedStages.map((s) => s.stageId));
    this.postedByMeColumnData = this.boardColumns.map((col) => ({
      col,
      apps: col.stageId === null
        ? this.postedByMeApplications.filter((a) => !a.currentStageId || !stageIds.has(a.currentStageId))
        : this.postedByMeApplications.filter((a) => a.currentStageId === col.stageId)
    }));
  }

  /** Build the mutable column-data array used by Received DnD board */
  private buildReceivedColumnData(): void {
    const stageIds = new Set(this.orderedStages.map((s) => s.stageId));
    this.receivedColumnData = this.boardColumns.map((col) => ({
      col,
      apps: col.stageId === null
        ? this.receivedApplications.filter((a) => !a.currentStageId || !stageIds.has(a.currentStageId))
        : this.receivedApplications.filter((a) => a.currentStageId === col.stageId)
    }));
  }

  /** Called when a card is dropped in the Posted By Me board */
  onPostedByMeDrop(event: CdkDragDrop<JobApplicationDto[]>, targetColIndex: number): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }
    const app: JobApplicationDto = event.previousContainer.data[event.previousIndex];
    const targetCol = this.postedByMeColumnData[targetColIndex].col;
    const prevStageId = app.currentStageId ?? null;

    // Optimistic move
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);

    this.openStageDnDDialog(app, targetCol, prevStageId,
      () => this.loadPostedByMeApplications());
  }

  /** Called when a card is dropped in the Received board */
  onReceivedDrop(event: CdkDragDrop<JobApplicationDto[]>, targetColIndex: number): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }
    const app: JobApplicationDto = event.previousContainer.data[event.previousIndex];
    const targetCol = this.receivedColumnData[targetColIndex].col;
    const prevStageId = app.currentStageId ?? null;

    // Optimistic move
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);

    this.openStageDnDDialog(app, targetCol, prevStageId,
      () => this.loadReceivedApplications());
  }

  /**
   * Open the EditApplicationStageDialogComponent after a DnD drop.
   * Passes the resolved StageMasterDto so the dialog knows whether it's an interview stage.
   * On cancel/close → revert the optimistic move; on save → reload.
   */
  private openStageDnDDialog(
    app: JobApplicationDto,
    targetCol: { stageId: string | null; stageName: string },
    prevStageId: string | null,
    reloadFn: () => void
  ): void {
    if (!targetCol.stageId) {
      // Dropped to "Applied" column — no stage to create, just notify
      app.currentStageId = undefined;
      app.currentStageName = undefined;
      this.notification.showSuccess(`Moved back to Applied`);
      return;
    }

    // Resolve the full StageMasterDto for the target column
    const stageMaster = this.orderedStages.find((s) => s.stageId === targetCol.stageId);
    if (!stageMaster) {
      this.notification.showError('Stage not found — please try again.');
      reloadFn();
      return;
    }

    const dialogRef = this.dialog.open(EditApplicationStageDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      panelClass: 'edit-stage-dialog-panel',
      disableClose: true,
      data: {
        mode: 'create',
        jobApplyId: app.jobApplyId,
        stageMaster
      }
    });

    dialogRef.afterClosed().subscribe((saved: boolean) => {
      if (saved) {
        // Dialog already persisted the stage; just update the local card optimistically
        app.currentStageId = stageMaster.stageId;
        app.currentStageName = stageMaster.stageName;
        reloadFn();
      } else {
        // User cancelled — revert optimistic move
        reloadFn();
      }
    });
  }

  // ==================== Dialogs ====================

  viewJobDetails(app: JobApplicationDto): void {
    this.dialog.open(ApplicationDetailDialogComponent, {
      width: '560px',
      maxHeight: '90vh',
      panelClass: 'application-detail-dialog-panel',
      data: { jobApplyId: app.jobApplyId }
    });
  }

  openProcessDialog(app: JobApplicationDto): void {
    const ref = this.dialog.open(ApplicationProcessDialogComponent, {
      width: '920px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'application-process-dialog-panel',
      data: { jobApplyId: app.jobApplyId }
    });
    ref.afterClosed().subscribe((refreshed) => {
      if (refreshed) {
        this.loadPostedByMeApplications();
        this.loadReceivedApplications();
      }
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
            this.notification.showError(err?.error?.message || err?.message || 'Failed to withdraw application');
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

  // ==================== Legacy getters (keep for safety) ====================

  get postedByMeOrderedStages(): StageMasterDto[] {
    return this.orderedStages;
  }

  get postedByMeBoardColumns(): { stageId: string | null; stageName: string }[] {
    return this.boardColumns;
  }

  getPostedByMeAppsForColumn(columnStageId: string | null): JobApplicationDto[] {
    const stageIds = new Set(this.orderedStages.map((s) => s.stageId));
    if (columnStageId === null) {
      return this.postedByMeApplications.filter((app) => !app.currentStageId || !stageIds.has(app.currentStageId));
    }
    return this.postedByMeApplications.filter((app) => app.currentStageId === columnStageId);
  }

  get receivedBoardColumns(): { stageId: string | null; stageName: string }[] {
    return this.boardColumns;
  }

  getReceivedAppsForColumn(columnStageId: string | null): JobApplicationDto[] {
    const stageIds = new Set(this.orderedStages.map((s) => s.stageId));
    if (columnStageId === null) {
      return this.receivedApplications.filter((app) => !app.currentStageId || !stageIds.has(app.currentStageId));
    }
    return this.receivedApplications.filter((app) => app.currentStageId === columnStageId);
  }
}
