import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { QuillModule } from 'ngx-quill';

import { PublicCareerService } from '../../services/public-career.service';
import { JobOpeningDto, CreateJobApplicationRequest } from '@core/models/jobs.models';

export interface CareerApplyDialogData {
    job: JobOpeningDto;
    domain: string;
}

@Component({
    selector: 'app-career-apply-dialog',
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
    templateUrl: './career-apply-dialog.component.html',
    styleUrls: ['./career-apply-dialog.component.scss']
})
export class CareerApplyDialogComponent {
    applyForm: FormGroup;
    isSubmitting = false;
    submitSuccess = false;
    submitError = '';

    // Resume upload
    resumeFileName: string | null = null;
    isUploadingResume = false;
    readonly acceptedResumeTypes = '.pdf,.jpg,.jpeg,.png,.gif';
    readonly maxResumeSizeMb = 5;

    private static readonly MAX_RESUME_BYTES = 5 * 1024 * 1024;
    private static readonly ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif'];
    private static readonly ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

    // Quill editor config
    quillConfig = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ header: [1, 2, 3, false] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link'],
            ['clean']
        ]
    };

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<CareerApplyDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: CareerApplyDialogData,
        private publicCareerService: PublicCareerService
    ) {
        this.applyForm = this.fb.group({
            candidateName: ['', [Validators.required, Validators.maxLength(200)]],
            candidateEmail: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
            phone: ['', [Validators.maxLength(50)]],
            linkedInUrl: [''],
            resumeUrl: ['', [Validators.required]],
            coverLetter: ['']
        });
    }

    // ── Resume Upload ──
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
        if (!CareerApplyDialogComponent.ALLOWED_EXTENSIONS.includes(ext)) {
            return { valid: false, error: 'Allowed formats: PDF, JPG, JPEG, PNG, GIF' };
        }
        if (!CareerApplyDialogComponent.ALLOWED_TYPES.includes(file.type) && file.type !== 'image/jpg') {
            return { valid: false, error: 'Invalid file type' };
        }
        if (file.size > CareerApplyDialogComponent.MAX_RESUME_BYTES) {
            return { valid: false, error: `File size must be ${this.maxResumeSizeMb} MB or less` };
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
            this.submitError = validation.error ?? 'Invalid file';
            return;
        }

        this.isUploadingResume = true;
        this.resumeFileName = file.name;
        this.submitError = '';

        this.publicCareerService.uploadFile(file).subscribe({
            next: (url) => {
                this.applyForm.patchValue({ resumeUrl: url });
                this.isUploadingResume = false;
            },
            error: (err) => {
                this.submitError = err?.message || 'Resume upload failed';
                this.resumeFileName = null;
                this.isUploadingResume = false;
            }
        });

        input.value = '';
    }

    clearResume(): void {
        const currentUrl = this.currentResumeUrl;
        if (currentUrl) {
            this.publicCareerService.deleteFile(currentUrl).subscribe({
                error: (err) => console.error('Failed to delete file', err)
            });
        }
        this.applyForm.patchValue({ resumeUrl: '' });
        this.resumeFileName = null;
    }

    // ── Submit ──
    onSubmit(): void {
        if (this.applyForm.invalid) {
            this.applyForm.markAllAsTouched();
            return;
        }

        this.isSubmitting = true;
        this.submitError = '';

        const formVal = this.applyForm.value;
        const request: CreateJobApplicationRequest = {
            jobId: this.data.job.jobId,
            candidateName: formVal.candidateName?.trim() || null,
            candidateEmail: formVal.candidateEmail?.trim() || null,
            phone: formVal.phone?.trim() || null,
            linkedInUrl: formVal.linkedInUrl?.trim() || null,
            resumeUrl: formVal.resumeUrl?.trim() || null,
            coverLetter: formVal.coverLetter || null,
            applicationSource: 'External',
            status: 'Applied'
        };

        this.publicCareerService.applyJobByExternalCandidate(this.data.domain, request).subscribe({
            next: (res) => {
                this.isSubmitting = false;
                if (res.success) {
                    this.submitSuccess = true;
                } else {
                    this.submitError = res.message || 'Something went wrong. Please try again.';
                }
            },
            error: (err) => {
                this.isSubmitting = false;
                this.submitError = err?.error?.message || 'Failed to submit application. Please try again.';
            }
        });
    }

    close(): void {
        this.dialogRef.close(this.submitSuccess);
    }
}
