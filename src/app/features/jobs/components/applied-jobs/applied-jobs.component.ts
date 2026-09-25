import { Component, OnInit, HostListener } from '@angular/core';
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
import { JobApplicationDto, JobOpeningDto, PagedResult, StageMasterDto, CandidateAnswerDto, ParsedResumeDto } from '@core/models/jobs.models';
import { EditApplicationStageDialogComponent } from '../edit-application-stage-dialog/edit-application-stage-dialog.component';
import { QuestionBankService } from '../../services/question-bank.service';
import { forkJoin, of } from 'rxjs';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-applied-jobs',
  standalone: true,
  imports: [
    SharedCommonModule,
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
  @HostListener('document:click') onDocumentClick(): void {
    this.closeAllDropdowns();
  }

  applications: JobApplicationDto[] = [];
  stages: StageMasterDto[] = [];
  isLoading = false;
  filterForm: FormGroup;
  page = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;

  /** My Applications (Self) – Employee / Manager */
  myApps: JobApplicationDto[] = [];
  myAppsFilterForm: FormGroup;
  myAppsPage = 1;
  myAppsPageSize = 10;
  myAppsTotalCount = 0;
  myAppsIsLoading = false;

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
  jobOptions: { value: string; label: string; status: string }[] = [];
  allJobs: JobOpeningDto[] = [];

  /** ATS Inbox tab – unreviewed applications sorted by score */
  atsApplications: JobApplicationDto[] = [];
  atsFilterForm: FormGroup;
  atsPage = 1;
  atsPageSize = 10;
  atsTotalCount = 0;
  atsTotalPages = 0;
  atsIsLoading = false;
  /** ID of the currently expanded ATS row (for show/hide detail) */
  atsExpandedId: string | null = null;
  /** Parsed resume cache per jobApplyId */
  atsParsedResumes: Map<string, ParsedResumeDto | null> = new Map();
  /** Candidate answers cache per jobApplyId */
  atsAnswers: Map<string, CandidateAnswerDto[]> = new Map();
  /** Loading indicator per jobApplyId for expandable detail */
  atsDetailLoading: Map<string, boolean> = new Map();
  /** Multi-select job filter for ATS tab (independent set) */
  atsSelectedJobIds: string[] = [];
  atsJobDropdownOpen = false;

  /** Multi-select job filter state */
  selectedJobIds: string[] = [];
  postedByMeJobDropdownOpen = false;
  receivedJobDropdownOpen = false;

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
    private fb: FormBuilder,
    private questionBankService: QuestionBankService
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      stageId: [''],
      status: ['']
    });
    this.myAppsFilterForm = this.fb.group({
      search: [''],
      stageId: [''],
      status: ['']
    });
    this.postedByMeFilterForm = this.fb.group({
      search: [''],
      applyDateFrom: [null as Date | null],
      applyDateTo: [null as Date | null],
      stageId: ['']
    });
    this.receivedFilterForm = this.fb.group({
      search: [''],
      applyDateFrom: [null as Date | null],
      applyDateTo: [null as Date | null],
      stageId: ['']
    });
    this.atsFilterForm = this.fb.group({
      search: [''],
      applyDateFrom: [null as Date | null],
      applyDateTo: [null as Date | null],
      passedKnockout: ['']
    });
  }

  /** Show 'My Referenced Applications' tab */
  get canSeeMyReferenced(): boolean {
    return this.hasPermission('my_referenced_application');
  }

  /** Show 'Received Application By My Job Post' tab */
  get canSeeReceivedByMyJobPost(): boolean {
    return this.hasPermission('received_application_by_my_job_post');
  }

  /** Show 'All Job Applications' tab */
  get canSeeAllApplications(): boolean {
    return this.hasPermission('all_job_application');
  }

  /** Show ATS Inbox tab */
  get canSeeAtsInbox(): boolean {
    return this.hasPermission('ats_inbox_view');
  }

  /** Show My Applications (Self) tab */
  get canSeeMySelfApplications(): boolean {
    return this.hasPermission('my_self_application');
  }

  /** Any manager-level tab visible? */
  get canSeeAnyManagerTabs(): boolean {
    return this.canSeeMyReferenced || this.canSeeReceivedByMyJobPost || this.canSeeAllApplications || this.canSeeAtsInbox;
  }

  /** Permission helper for this component (delegates to AuthService) */
  hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Jobs', 'Job Applications', actionKey);
  }

  // --- Summary Dashboards for Super Admin ---
  get inProgressStat(): number {
    return this.receivedApplications.filter(a =>
      !['Rejected', 'Selected', 'Hired'].includes(a.status || '') &&
      !['Rejected', 'Selected', 'Hired'].includes(a.currentStageName || '')
    ).length;
  }

  get selectedStat(): number {
    return this.receivedApplications.filter(a =>
      ['Selected', 'Hired'].includes(a.status || '') ||
      ['Selected', 'Hired'].includes(a.currentStageName || '')
    ).length;
  }

  get rejectedStat(): number {
    return this.receivedApplications.filter(a =>
      a.status === 'Rejected' ||
      a.currentStageName === 'Rejected'
    ).length;
  }

  ngOnInit(): void {
    if (this.authService.hasPermissionByActionKey('stage_view_all')) {
      this.jobsService.getStages().subscribe({
        next: (list) => {
          this.stages = list ?? [];
          this.stageOptions = [
            { value: '', label: 'All stages' },
            ...this.stages.map((s) => ({ value: s.stageId, label: s.stageName }))
          ];
        }
      });
    } else {
      this.stages = [];
      this.stageOptions = [{ value: '', label: 'All stages' }];
    }

    this.jobsService.getJobOpeningsPaged({ pageSize: 100 }).subscribe({
      next: (result) => {
      this.allJobs = result.data ?? [];
        this.jobOptions = this.allJobs.map((j) => ({ value: j.jobId, label: j.jobRoleName, status: j.status || 'Open' }));
      }
    });

    if (!this.canSeeAnyManagerTabs) {
      this.loadMySelfApplications();
    } else {
      // Load the first visible tab's data
      this.onTabChange(0);
    }
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

  // ==================== My Applications (Self) – Employee / Manager ====================

  loadMySelfApplications(): void {
    this.myAppsIsLoading = true;
    const search = this.myAppsFilterForm.get('search')?.value;
    const stageId = this.myAppsFilterForm.get('stageId')?.value;
    const status = this.myAppsFilterForm.get('status')?.value;
    this.jobsService.getMySelfJobApplicationsPaged({
      page: this.myAppsPage,
      pageSize: this.myAppsPageSize,
      search: search?.trim() || undefined,
      stageId: stageId || undefined,
      status: status || undefined
    }).subscribe({
      next: (result: PagedResult<JobApplicationDto>) => {
        this.myApps = result.data ?? [];
        this.myAppsTotalCount = result.totalCount ?? 0;
        this.myAppsIsLoading = false;
      },
      error: () => {
        this.myApps = [];
        this.myAppsTotalCount = 0;
        this.myAppsIsLoading = false;
      }
    });
  }

  applyMyAppsFilters(): void {
    this.myAppsPage = 1;
    this.loadMySelfApplications();
  }

  clearMyAppsFilters(): void {
    this.myAppsFilterForm.patchValue({ search: '', stageId: '', status: '' });
    this.myAppsPage = 1;
    this.loadMySelfApplications();
  }

  hasMyAppsFiltersApplied(): boolean {
    const v = this.myAppsFilterForm.value;
    return !!(v.search?.trim() || v.stageId || v.status);
  }

  onMyAppsPageChange(event: PageEvent): void {
    this.myAppsPage = event.pageIndex + 1;
    this.myAppsPageSize = event.pageSize;
    this.loadMySelfApplications();
  }

  onEmployeeTabChange(index: number): void {
    if (index === 1) {
      this.loadMySelfApplications();
    }
  }

  loadPostedByMeApplications(): void {
    if (!this.canSeeReceivedByMyJobPost) return;
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
      jobIds: this.selectedJobIds.length > 0 ? this.selectedJobIds : undefined
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
      stageId: ''
    });
    this.selectedJobIds = [];
    this.postedByMePage = 1;
    this.loadPostedByMeApplications();
  }

  hasPostedByMeFiltersApplied(): boolean {
    const v = this.postedByMeFilterForm.value;
    const fromDate = v.applyDateFrom;
    const toDate = v.applyDateTo;
    return !!(v.search?.trim() || (fromDate && (fromDate instanceof Date || fromDate)) || (toDate && (toDate instanceof Date || toDate)) || v.stageId || this.selectedJobIds.length > 0);
  }

  onPostedByMePageChange(event: PageEvent): void {
    this.postedByMePage = event.pageIndex + 1;
    this.postedByMePageSize = event.pageSize;
    this.loadPostedByMeApplications();
  }

  loadReceivedApplications(): void {
    if (!this.canSeeAllApplications) return;
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
      jobIds: this.selectedJobIds.length > 0 ? this.selectedJobIds : undefined
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
      stageId: ''
    });
    this.selectedJobIds = [];
    this.receivedPage = 1;
    this.loadReceivedApplications();
  }

  hasReceivedFiltersApplied(): boolean {
    const v = this.receivedFilterForm.value;
    const fromDate = v.applyDateFrom;
    const toDate = v.applyDateTo;
    return !!(v.search?.trim() || (fromDate && (fromDate instanceof Date || fromDate)) || (toDate && (toDate instanceof Date || toDate)) || v.stageId || this.selectedJobIds.length > 0);
  }

  onReceivedPageChange(event: PageEvent): void {
    this.receivedPage = event.pageIndex + 1;
    this.receivedPageSize = event.pageSize;
    this.loadReceivedApplications();
  }

  // ==================== ATS Inbox Tab ====================

  loadAtsApplications(): void {
    this.atsIsLoading = true;
    const v = this.atsFilterForm.value;
    const applyDateFrom = v.applyDateFrom instanceof Date ? v.applyDateFrom.toISOString().slice(0, 10) : (v.applyDateFrom || null);
    const applyDateTo = v.applyDateTo instanceof Date ? v.applyDateTo.toISOString().slice(0, 10) : (v.applyDateTo || null);

    let passedKnockout: boolean | null = null;
    if (v.passedKnockout === 'pass') passedKnockout = true;
    else if (v.passedKnockout === 'fail') passedKnockout = false;

    this.jobsService.getAtsApplicationsPaged({
      page: this.atsPage,
      pageSize: this.atsPageSize,
      search: v.search || undefined,
      applyDateFrom: applyDateFrom || undefined,
      applyDateTo: applyDateTo || undefined,
      jobIds: this.atsSelectedJobIds.length > 0 ? this.atsSelectedJobIds : undefined,
      passedKnockout: passedKnockout !== null ? passedKnockout : undefined
    }).subscribe({
      next: (result: PagedResult<JobApplicationDto>) => {
        this.atsApplications = result.data ?? [];
        this.atsTotalCount = result.totalCount ?? 0;
        this.atsTotalPages = result.totalPages ?? 0;
        this.atsIsLoading = false;
      },
      error: () => {
        this.atsApplications = [];
        this.atsTotalCount = 0;
        this.atsTotalPages = 0;
        this.atsIsLoading = false;
      }
    });
  }

  applyAtsFilters(): void {
    this.atsPage = 1;
    this.atsExpandedId = null;
    this.loadAtsApplications();
  }

  clearAtsFilters(): void {
    this.atsFilterForm.patchValue({ search: '', applyDateFrom: null, applyDateTo: null, passedKnockout: '' });
    this.atsSelectedJobIds = [];
    this.atsPage = 1;
    this.atsExpandedId = null;
    this.loadAtsApplications();
  }

  hasAtsFiltersApplied(): boolean {
    const v = this.atsFilterForm.value;
    const fromDate = v.applyDateFrom;
    const toDate = v.applyDateTo;
    return !!(v.search?.trim() || (fromDate && (fromDate instanceof Date || fromDate)) || (toDate && (toDate instanceof Date || toDate)) || v.passedKnockout || this.atsSelectedJobIds.length > 0);
  }

  onAtsPageChange(event: PageEvent): void {
    this.atsPage = event.pageIndex + 1;
    this.atsPageSize = event.pageSize;
    this.loadAtsApplications();
  }

  toggleAtsRow(app: JobApplicationDto): void {
    const id = app.jobApplyId;
    if (this.atsExpandedId === id) {
      this.atsExpandedId = null;
      return;
    }
    this.atsExpandedId = id;
    // Lazy-load details if not already cached
    if (!this.atsParsedResumes.has(id) && !this.atsDetailLoading.get(id)) {
      this.atsDetailLoading.set(id, true);
      forkJoin({
        resume: this.questionBankService.getParsedResume(id),
        answers: this.questionBankService.getCandidateAnswers(id)
      }).subscribe({
        next: ({ resume, answers }) => {
          this.atsParsedResumes.set(id, resume);
          this.atsAnswers.set(id, answers ?? []);
          this.atsDetailLoading.set(id, false);
        },
        error: () => {
          this.atsParsedResumes.set(id, null);
          this.atsAnswers.set(id, []);
          this.atsDetailLoading.set(id, false);
        }
      });
    }
  }

  enterToStage(app: JobApplicationDto, event: Event): void {
    event.stopPropagation();
    this.jobsService.enterApplicationToStage(app.jobApplyId).subscribe({
      next: (success) => {
        if (success) {
          this.notification.showSuccess(`${app.candidateName || 'Candidate'} has been entered into the hiring pipeline!`);
          this.atsApplications = this.atsApplications.filter(a => a.jobApplyId !== app.jobApplyId);
          this.atsTotalCount--;
          if (this.atsExpandedId === app.jobApplyId) this.atsExpandedId = null;
          // Refresh the kanban boards so the app appears there
          if (this.canSeeReceivedByMyJobPost) this.loadPostedByMeApplications();
          if (this.canSeeAllApplications) this.loadReceivedApplications();
        }
      },
      error: () => { /* already handled */ }
    });
  }

  getAtsParsedSkills(app: JobApplicationDto): string[] {
    const id = app.jobApplyId;
    const pr = this.atsParsedResumes.get(id);
    if (!pr?.skills) return [];

    let candidateSkills: string[] = [];
    try {
      candidateSkills = JSON.parse(pr.skills);
    } catch {
      candidateSkills = pr.skills.split(',').map(s => s.trim());
    }

    // Look up job in loaded job openings as a fallback to avoid depending on backend restart
    const job = this.allJobs.find(j => j.jobId === app.jobId);
    const mandatorySkillsStr = job?.mandatorySkills || app.mandatorySkills;
    if (!mandatorySkillsStr) {
      return [];
    }

    let mandatorySkills: string[] = [];
    try {
      mandatorySkills = JSON.parse(mandatorySkillsStr);
    } catch {
      mandatorySkills = mandatorySkillsStr.split(',').map(s => s.trim());
    }

    const normalizedMandatory = mandatorySkills.map(s => s.toLowerCase().trim()).filter(s => !!s);
    if (normalizedMandatory.length === 0) return [];

    // Substring match (case-insensitive) just like the backend scorer:
    // Match is successful if the candidate skill contains or is contained in any mandatory skill.
    return candidateSkills.filter(cs => {
      const normalizedCs = cs.toLowerCase().trim();
      if (!normalizedCs) return false;
      return normalizedMandatory.some(ms => normalizedCs.includes(ms) || ms.includes(normalizedCs));
    });
  }

  getAtsExperience(id: string): any[] {
    const pr = this.atsParsedResumes.get(id);
    if (!pr?.workExperience) return [];
    try { return JSON.parse(pr.workExperience); } catch { return []; }
  }

  getAtsEducation(id: string): any[] {
    const pr = this.atsParsedResumes.get(id);
    if (!pr?.education) return [];
    try { return JSON.parse(pr.education); } catch { return []; }
  }

  // ATS multi-select job filter
  toggleAtsJobDropdown(event: Event): void {
    event.stopPropagation();
    this.atsJobDropdownOpen = !this.atsJobDropdownOpen;
  }

  toggleAtsJobSelection(jobId: string): void {
    const idx = this.atsSelectedJobIds.indexOf(jobId);
    if (idx === -1) {
      this.atsSelectedJobIds = [...this.atsSelectedJobIds, jobId];
    } else {
      this.atsSelectedJobIds = this.atsSelectedJobIds.filter(id => id !== jobId);
    }
  }

  areAllAtsJobsSelected(): boolean {
    return this.jobOptions.length > 0 && this.atsSelectedJobIds.length === this.jobOptions.length;
  }

  toggleSelectAllAtsJobs(): void {
    if (this.areAllAtsJobsSelected()) {
      this.atsSelectedJobIds = [];
    } else {
      this.atsSelectedJobIds = this.jobOptions.map(j => j.value);
    }
  }

  isAtsJobSelected(jobId: string): boolean {
    return this.atsSelectedJobIds.includes(jobId);
  }

  getAtsSelectedJobsDisplayText(): string {
    if (this.atsSelectedJobIds.length === 0) return 'Select Jobs';
    if (this.areAllAtsJobsSelected()) return 'All Jobs';
    if (this.atsSelectedJobIds.length === 1) {
      const job = this.jobOptions.find(j => j.value === this.atsSelectedJobIds[0]);
      return job ? job.label : '1 Job';
    }
    return `${this.atsSelectedJobIds.length} Jobs Selected`;
  }

  // ==================== Multi-select Job Filter Helpers ====================


  toggleJobSelection(jobId: string): void {
    const idx = this.selectedJobIds.indexOf(jobId);
    if (idx === -1) {
      this.selectedJobIds = [...this.selectedJobIds, jobId];
    } else {
      this.selectedJobIds = this.selectedJobIds.filter(id => id !== jobId);
    }
  }

  toggleSelectAllJobs(): void {
    if (this.areAllJobsSelected()) {
      this.selectedJobIds = [];
    } else {
      this.selectedJobIds = this.jobOptions.map(j => j.value);
    }
  }

  areAllJobsSelected(): boolean {
    return this.jobOptions.length > 0 && this.selectedJobIds.length === this.jobOptions.length;
  }

  isJobSelected(jobId: string): boolean {
    return this.selectedJobIds.includes(jobId);
  }

  getSelectedJobsDisplayText(): string {
    if (this.selectedJobIds.length === 0) return 'Select Jobs';
    if (this.areAllJobsSelected()) return 'All Jobs';
    if (this.selectedJobIds.length === 1) {
      const job = this.jobOptions.find(j => j.value === this.selectedJobIds[0]);
      return job ? job.label : '1 Job';
    }
    return `${this.selectedJobIds.length} Jobs Selected`;
  }

  togglePostedByMeJobDropdown(event: Event): void {
    event.stopPropagation();
    this.postedByMeJobDropdownOpen = !this.postedByMeJobDropdownOpen;
    this.receivedJobDropdownOpen = false;
  }

  toggleReceivedJobDropdown(event: Event): void {
    event.stopPropagation();
    this.receivedJobDropdownOpen = !this.receivedJobDropdownOpen;
    this.postedByMeJobDropdownOpen = false;
  }

  onDropdownItemClick(event: Event): void {
    event.stopPropagation();
  }

  closeAllDropdowns(): void {
    this.postedByMeJobDropdownOpen = false;
    this.receivedJobDropdownOpen = false;
    this.atsJobDropdownOpen = false;
  }

  /** Order-aware visible manager tabs (used to map tab index -> permission key) */
  visibleManagerTabs(): string[] {
    const ordered = [
      'my_referenced_application',
      'received_application_by_my_job_post',
      'all_job_application',
      'ats_inbox_view'
    ];
    return ordered.filter((k) => this.hasPermission(k));
  }

  onTabChange(index: number): void {
    if (this.canSeeAnyManagerTabs) {
      const tabs = this.visibleManagerTabs();
      const key = tabs[index];
      if (!key) return;
      if (key === 'received_application_by_my_job_post') {
        this.loadPostedByMeApplications();
      } else if (key === 'all_job_application') {
        this.loadReceivedApplications();
      } else if (key === 'my_referenced_application') {
        this.loadApplications();
      } else if (key === 'ats_inbox_view') {
        this.loadAtsApplications();
      }
      return;
    }

    // Employee (no manager tabs) layout
    if (index === 1) {
      this.loadMySelfApplications();
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
      width: '680px',
      maxWidth: '95vw',
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
            // Already handled by ErrorInterceptor
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
