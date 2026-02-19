import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { QuillModule } from 'ngx-quill';
import { JobOpeningDto, JobApplicationDto } from '@core/models/jobs.models';
import { JobsService } from '@features/jobs/services/jobs.service';
import { NotificationService } from '@core/services/notification.service';
import { ExpenseService } from '@features/expense/services/expense.service';

export interface ApplyJobDialogData {
  job?: JobOpeningDto;
  mode?: 'create' | 'edit';
  application?: JobApplicationDto;
}

@Component({
  selector: 'app-apply-job-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    QuillModule
  ],
  templateUrl: './apply-job-dialog.component.html',
  styleUrls: ['./apply-job-dialog.component.scss']
})
export class ApplyJobDialogComponent {
  applyForm: FormGroup;
  isSubmitting = false;
  resumeFileName: string | null = null;
  isUploadingResume = false;

  readonly acceptedResumeTypes = '.pdf,.jpg,.jpeg,.png,.gif';
  readonly maxResumeSizeMb = 5;

  quillConfig = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ header: [1, 2, 3, false] }],
      [{ align: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean']
    ]
  };

  private static readonly MAX_RESUME_BYTES = 5 * 1024 * 1024;
  private static readonly ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif'];
  private static readonly ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

  constructor(
    private fb: FormBuilder,
    private jobsService: JobsService,
    private expenseService: ExpenseService,
    private dialogRef: MatDialogRef<ApplyJobDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ApplyJobDialogData,
    private notification: NotificationService
  ) {
    this.applyForm = this.fb.group({
      candidateName: ['', [Validators.required, Validators.maxLength(200)]],
      candidateEmail: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
      phone: ['', [Validators.required, Validators.maxLength(50)]],
      linkedInUrl: ['', [Validators.maxLength(500)]],
      resumeUrl: ['', [Validators.required]],
      coverLetter: [''],
      applicationSource: ['Internal', [Validators.maxLength(100)]]
    });
    if (this.isEditMode && this.data.application) {
      this.patchFormWithApplication(this.data.application);
    }
  }

  get isEditMode(): boolean {
    return this.data?.mode === 'edit' && !!this.data?.application;
  }

  get job(): JobOpeningDto {
    if (this.data?.job) return this.data.job;
    const app = this.data?.application;
    return app ? { jobId: app.jobId, jobRoleName: app.jobRoleName ?? 'Job' } as JobOpeningDto : {} as JobOpeningDto;
  }

  private patchFormWithApplication(app: JobApplicationDto): void {
    this.applyForm.patchValue({
      candidateName: app.candidateName ?? '',
      candidateEmail: app.candidateEmail ?? '',
      phone: app.phone ?? '',
      linkedInUrl: app.linkedInUrl ?? '',
      resumeUrl: app.resumeUrl ?? '',
      coverLetter: app.coverLetter ?? '',
      applicationSource: app.applicationSource ?? 'Internal'
    });
    if (app.resumeUrl) {
      try {
        const u = new URL(app.resumeUrl);
        this.resumeFileName = u.pathname.split('/').pop() || 'Resume';
      } catch {
        this.resumeFileName = 'Resume';
      }
    }
  }

  get currentResumeUrl(): string | null {
    const url = this.applyForm.get('resumeUrl')?.value;
    return url && typeof url === 'string' && url.trim() ? url.trim() : null;
  }

  triggerResumeInput(input: HTMLInputElement): void {
    if (this.isUploadingResume) return;
    input.value = '';
    input.click();
  }

  private validateResumeFile(file: File): { valid: boolean; error?: string } {
    if (!file?.name) return { valid: false, error: 'No file selected' };
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!ApplyJobDialogComponent.ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: 'Allowed formats: PDF, JPG, JPEG, PNG, GIF' };
    }
    if (!ApplyJobDialogComponent.ALLOWED_TYPES.includes(file.type) && file.type !== 'image/jpg') {
      return { valid: false, error: 'Invalid file type' };
    }
    if (file.size > ApplyJobDialogComponent.MAX_RESUME_BYTES) {
      return { valid: false, error: 'File size must be 5 MB or less' };
    }
    return { valid: true };
  }

  onResumeFileSelected(event: Event, input: HTMLInputElement): void {
    event.preventDefault();
    event.stopPropagation();
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const validation = this.validateResumeFile(file);
    if (!validation.valid) {
      this.notification.showError(validation.error ?? 'Invalid file');
      return;
    }

    this.isUploadingResume = true;
    this.resumeFileName = file.name;

    this.expenseService.uploadReceipt(file).subscribe({
      next: (url) => {
        this.applyForm.patchValue({ resumeUrl: url });
        this.notification.showSuccess('Resume uploaded');
        this.isUploadingResume = false;
      },
      error: (err) => {
        this.notification.showError(err?.message || 'Upload failed');
        this.resumeFileName = null;
        this.isUploadingResume = false;
      }
    });

    input.value = '';
  }

  clearResume(): void {
    this.applyForm.patchValue({ resumeUrl: '' });
    this.resumeFileName = null;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.applyForm.invalid || this.isSubmitting) {
      this.applyForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    const value = this.applyForm.getRawValue();
    if (this.isEditMode && this.data.application) {
      const updateRequest = {
        candidateName: value.candidateName?.trim() || undefined,
        candidateEmail: value.candidateEmail?.trim() || undefined,
        phone: value.phone?.trim() || undefined,
        linkedInUrl: value.linkedInUrl?.trim() || undefined,
        resumeUrl: value.resumeUrl?.trim() || undefined,
        coverLetter: value.coverLetter?.trim() || undefined,
        applicationSource: value.applicationSource?.trim() || undefined
      };
      this.jobsService.updateJobApplication(this.data.application.jobApplyId, updateRequest).subscribe({
        next: () => {
          this.notification.showSuccess('Application updated successfully');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notification.showError(err?.message || 'Failed to update application');
        }
      });
    } else {
      const request = {
        jobId: this.job.jobId,
        candidateName: value.candidateName?.trim() || undefined,
        candidateEmail: value.candidateEmail?.trim() || undefined,
        phone: value.phone?.trim() || undefined,
        linkedInUrl: value.linkedInUrl?.trim() || undefined,
        resumeUrl: value.resumeUrl?.trim() || undefined,
        coverLetter: value.coverLetter?.trim() || undefined,
        applicationSource: value.applicationSource?.trim() || undefined
      };
      this.jobsService.createJobApplication(request).subscribe({
        next: () => {
          this.notification.showSuccess('Application submitted successfully');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notification.showError(err?.message || 'Failed to submit application');
        }
      });
    }
  }
}
