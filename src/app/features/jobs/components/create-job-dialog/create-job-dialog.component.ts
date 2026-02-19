import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { CreateJobOpeningRequest, UpdateJobOpeningRequest, JobOpeningDto } from '@core/models/jobs.models';
import { JobsService } from '@features/jobs/services/jobs.service';
import { NotificationService } from '@core/services/notification.service';
import { EmployeeService } from '@features/employee/services/employee.service';
import { Department } from '@core/models/employee.models';

export interface CreateJobDialogData {
  mode: 'create' | 'edit';
  job?: JobOpeningDto;
}

@Component({
  selector: 'app-create-job-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './create-job-dialog.component.html',
  styleUrls: ['./create-job-dialog.component.scss']
})
export class CreateJobDialogComponent implements OnInit {
  jobForm: FormGroup;
  isSubmitting = false;
  departments: Department[] = [];
  get isEditMode(): boolean {
    return this.data?.mode === 'edit' && !!this.data?.job;
  }

  workModeOptions = [
    { value: 'Onsite', label: 'Onsite' },
    { value: 'Remote', label: 'Remote' },
    { value: 'Hybrid', label: 'Hybrid' }
  ];

  employmentTypeOptions = [
    { value: 'Full-time', label: 'Full-time' },
    { value: 'Part-time', label: 'Part-time' },
    { value: 'Contract', label: 'Contract' },
    { value: 'Internship', label: 'Internship' }
  ];

  statusOptions = [
    { value: 'Open', label: 'Open' },
    { value: 'Closed', label: 'Closed' },
    { value: 'Draft', label: 'Draft' }
  ];

  constructor(
    private fb: FormBuilder,
    private jobsService: JobsService,
    private dialogRef: MatDialogRef<CreateJobDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateJobDialogData,
    private notification: NotificationService,
    private employeeService: EmployeeService
  ) {
    this.jobForm = this.fb.group({
      jobRoleName: ['', [Validators.required, Validators.maxLength(200)]],
      departmentId: [null as string | null],
      experienceMin: [null as number | null],
      experienceMax: [null as number | null],
      ctcMin: [null as number | null],
      ctcMax: [null as number | null],
      currency: ['USD', Validators.maxLength(10)],
      vacancies: [1, [Validators.required, Validators.min(1)]],
      location: ['', Validators.maxLength(200)],
      workMode: [null as string | null, Validators.maxLength(50)],
      employmentType: [null as string | null, Validators.maxLength(50)],
      jobIntroduction: [''],
      responsibilities: [''],
      skillset: [''],
      lastDate: [null as string | null],
      postedAs: ['Internal', [Validators.required, Validators.maxLength(20)]],
      externalLink: [''],
      status: ['Open', Validators.maxLength(50)]
    });
  }

  ngOnInit(): void {
    if (!this.data?.mode) this.data = { mode: 'create' };
    if (this.isEditMode && this.data.job) this.patchFormWithJob(this.data.job);
    this.employeeService.getDepartments().subscribe({
      next: (depts: Department[]) => (this.departments = depts),
      error: () => this.notification.showError('Failed to load departments')
    });
  }

  private patchFormWithJob(job: JobOpeningDto): void {
    this.jobForm.patchValue({
      jobRoleName: job.jobRoleName || '',
      departmentId: job.departmentId || null,
      experienceMin: job.experienceMin ?? null,
      experienceMax: job.experienceMax ?? null,
      ctcMin: job.ctcMin ?? null,
      ctcMax: job.ctcMax ?? null,
      currency: job.currency || 'USD',
      vacancies: job.vacancies ?? 1,
      location: job.location || '',
      workMode: job.workMode || null,
      employmentType: job.employmentType || null,
      jobIntroduction: job.jobIntroduction || '',
      responsibilities: job.responsibilities || '',
      skillset: job.skillset || '',
      lastDate: job.lastDate ? new Date(job.lastDate) : null,
      postedAs: job.postedAs || 'Internal',
      externalLink: job.externalLink || '',
      status: job.status || 'Open'
    });
  }

  onSubmit(): void {
    if (this.jobForm.invalid || this.isSubmitting) return;

    const v = this.jobForm.value;
    const lastDateStr = v.lastDate ? new Date(v.lastDate).toISOString() : null;

    if (this.isEditMode && this.data.job?.jobId) {
      const request: UpdateJobOpeningRequest = {
        jobRoleName: v.jobRoleName,
        departmentId: v.departmentId || null,
        experienceMin: v.experienceMin ?? null,
        experienceMax: v.experienceMax ?? null,
        ctcMin: v.ctcMin ?? null,
        ctcMax: v.ctcMax ?? null,
        currency: v.currency || null,
        vacancies: v.vacancies ?? 1,
        location: v.location || null,
        workMode: v.workMode || null,
        employmentType: v.employmentType || null,
        jobIntroduction: v.jobIntroduction || null,
        responsibilities: v.responsibilities || null,
        skillset: v.skillset || null,
        lastDate: lastDateStr,
        postedAs: v.postedAs,
        externalLink: v.externalLink || null,
        status: v.status || 'Open'
      };
      this.isSubmitting = true;
      this.jobsService.updateJobOpening(this.data.job.jobId, request).subscribe({
        next: (updated: JobOpeningDto) => {
          this.notification.showSuccess('Job opening updated successfully');
          this.dialogRef.close(updated);
        },
        error: (err: { message?: string }) => {
          this.isSubmitting = false;
          this.notification.showError(err?.message || 'Failed to update job opening');
        }
      });
    } else {
      const request: CreateJobOpeningRequest = {
        jobRoleName: v.jobRoleName,
        departmentId: v.departmentId || null,
        experienceMin: v.experienceMin ?? null,
        experienceMax: v.experienceMax ?? null,
        ctcMin: v.ctcMin ?? null,
        ctcMax: v.ctcMax ?? null,
        currency: v.currency || null,
        vacancies: v.vacancies ?? 1,
        location: v.location || null,
        workMode: v.workMode || null,
        employmentType: v.employmentType || null,
        jobIntroduction: v.jobIntroduction || null,
        responsibilities: v.responsibilities || null,
        skillset: v.skillset || null,
        lastDate: lastDateStr,
        postedAs: v.postedAs,
        externalLink: v.externalLink || null,
        status: v.status || 'Open'
      };
      this.isSubmitting = true;
      this.jobsService.createJobOpening(request).subscribe({
        next: (created: JobOpeningDto) => {
          this.notification.showSuccess('Job opening created successfully');
          this.dialogRef.close(created);
        },
        error: (err: { message?: string }) => {
          this.isSubmitting = false;
          this.notification.showError(err?.message || 'Failed to create job opening');
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
