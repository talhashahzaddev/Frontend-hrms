import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { QuillModule } from 'ngx-quill';
import * as signalR from '@microsoft/signalr';

import { PublicCareerService } from '../../services/public-career.service';
import { JobOpeningDto, CreateJobApplicationRequest, JobQuestionDto } from '@core/models/jobs.models';
import { CompanyCareerDetails } from '../public-career/public-career.component';
import { QuestionBankService } from '../../services/question-bank.service';
import { environment } from '../../../../../environments/environment';

import { SharedCommonModule } from '@shared/shared-common.module';

@Component({
    selector: 'app-career-apply-page',
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [
        SharedCommonModule,
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatSelectModule,
        MatRadioModule,
        QuillModule
    ],
    templateUrl: './career-apply-page.component.html',
    styleUrls: ['./career-apply-page.component.scss']
})
export class CareerApplyPageComponent implements OnInit, OnDestroy {
    job: JobOpeningDto | null = null;
    companyDetails: CompanyCareerDetails | null = null;
    isLoadingJob = true;
    errorMessage = '';
    currentYear = new Date().getFullYear();

    applyForm: FormGroup;
    isSubmitting = false;
    submitSuccess = false;
    submitError = '';

    // Questions
    jobQuestions: JobQuestionDto[] = [];

    // Resume upload
    resumeFileName: string | null = null;
    isUploadingResume = false;
    readonly acceptedResumeTypes = '.pdf,.jpg,.jpeg,.png,.gif';
    readonly maxResumeSizeMb = 5;

    // SignalR CV Parsing
    private hubConnection: signalR.HubConnection | null = null;
    parsingStatus: string = '';
    isParsing = false;

    private static readonly MAX_RESUME_BYTES = 5 * 1024 * 1024;
    private static readonly ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif'];
    private static readonly ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

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
        private route: ActivatedRoute,
        private router: Router,
        private location: Location,
        private publicCareerService: PublicCareerService,
        private qbService: QuestionBankService
    ) {
        this.applyForm = this.fb.group({
            firstName: ['', [Validators.required, Validators.maxLength(100)]],
            lastName: ['', [Validators.required, Validators.maxLength(100)]],
            candidateEmail: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
            phone: ['', [Validators.required, Validators.maxLength(50)]],
            linkedInUrl: [''],
            salaryExpectation: [''],
            resumeUrl: ['', [Validators.required]],
            coverLetter: [''],
            answers: this.fb.group({}) // dynamic answers
        });
    }

    ngOnInit(): void {
        const jobCode = this.route.snapshot.paramMap.get('jobCode');
        if (!jobCode) {
            this.errorMessage = 'Job code not provided.';
            this.isLoadingJob = false;
            return;
        }

        this.loadCompanyDetails();
        this.loadJobDetails(jobCode);
    }

    ngOnDestroy(): void {
        if (this.hubConnection) {
            this.hubConnection.stop();
        }
    }

    private getDomainFromUrl(): string {
        const hostname = window.location.hostname;
        if (hostname.includes('.briskpeople.com')) return hostname.split('.briskpeople.com')[0];
        if (hostname.includes('.localhost')) return hostname.split('.localhost')[0];
        const parts = hostname.split('.');
        if (parts.length > 1) return parts[0];
        return hostname;
    }

    private loadCompanyDetails(): void {
        const domain = this.getDomainFromUrl();
        this.publicCareerService.getCompanyCareerDetails(domain).subscribe({
            next: (details) => this.companyDetails = details,
            error: (err) => console.error('Failed to load company config', err)
        });
    }

    private loadJobDetails(jobCode: string): void {
        const domain = this.getDomainFromUrl();
        this.publicCareerService.getExternalJobByJobCode(jobCode, domain).subscribe({
            next: (job) => {
                if (job) {
                    this.job = job;
                    this.loadJobQuestions(job.jobId);
                }
                else {
                    this.errorMessage = 'Job opening not found.';
                    this.isLoadingJob = false;
                }
            },
            error: () => {
                this.errorMessage = 'Failed to load job details.';
                this.isLoadingJob = false;
            }
        });
    }

    private loadJobQuestions(jobId: string): void {
        const domain = this.getDomainFromUrl();
        this.qbService.getJobQuestions(jobId, domain).subscribe({
            next: (questions) => {
                this.jobQuestions = questions;
                const answersGroup = this.applyForm.get('answers') as FormGroup;
                this.jobQuestions.forEach(q => {
                    // if it's multiple choice, options are comma separated
                    answersGroup.addControl(q.questionId, new FormControl('', q.isRequired ? Validators.required : null));
                });
                this.isLoadingJob = false;
            },
            error: () => {
                this.isLoadingJob = false;
            }
        });
    }

    getOptionsArray(optionsStr: string | null | undefined): string[] {
        if (!optionsStr) return [];
        const trimmed = optionsStr.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.map(s => String(s).trim());
                }
            } catch (e) {
                // Fall back to comma-separated split if JSON parsing fails
            }
        }
        return optionsStr.split(',').map(s => s.trim());
    }

    goBack(): void {
        this.location.back();
    }

    goHome(): void {
        this.router.navigate(['/career']);
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
        if (!CareerApplyPageComponent.ALLOWED_EXTENSIONS.includes(ext)) {
            return { valid: false, error: 'Allowed formats: PDF, JPG, JPEG, PNG, GIF' };
        }
        if (!CareerApplyPageComponent.ALLOWED_TYPES.includes(file.type) && file.type !== 'image/jpg') {
            return { valid: false, error: 'Invalid file type' };
        }
        if (file.size > CareerApplyPageComponent.MAX_RESUME_BYTES) {
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
            this.publicCareerService.deleteFile(currentUrl).subscribe();
        }
        this.applyForm.patchValue({ resumeUrl: '' });
        this.resumeFileName = null;
    }

    private startSignalRConnection(jobApplyId: string): void {
        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(`${environment.apiUrl.replace('/api', '')}/cvparsinghub`)
            .withAutomaticReconnect()
            .build();

        this.hubConnection.on('ReceiveParsingStatus', (status: string, message: string) => {
            this.parsingStatus = message;
            if (status === 'Completed' || status === 'Failed') {
                this.isParsing = false;
                // Disconnect after finished
                this.hubConnection?.stop();
            }
        });

        this.hubConnection.start()
            .then(() => {
                this.hubConnection?.invoke('JoinGroup', jobApplyId);
                this.isParsing = true;
                this.parsingStatus = 'Analyzing your resume...';
            })
            .catch(err => console.error('Error while starting connection: ' + err));
    }

    onSubmit(): void {
        if (this.applyForm.invalid) {
            this.applyForm.markAllAsTouched();
            return;
        }

        this.isSubmitting = true;
        this.submitError = '';

        const formVal = this.applyForm.value;

        // Combine first and last name since the API payload signature holds 'candidateName'
        const combinedName = `${formVal.firstName || ''} ${formVal.lastName || ''}`.trim();

        // format answers
        const formattedAnswers = Object.keys(formVal.answers).map(key => ({
            questionId: key,
            answerText: formVal.answers[key]
        }));

        const request: CreateJobApplicationRequest = {
            jobId: this.job!.jobId,
            candidateName: combinedName || null,
            candidateEmail: formVal.candidateEmail?.trim() || null,
            phone: formVal.phone?.trim() || null,
            linkedInUrl: formVal.linkedInUrl?.trim() || null,
            resumeUrl: formVal.resumeUrl?.trim() || null,
            coverLetter: formVal.coverLetter || null,
            applicationSource: 'External',
            status: 'Applied',
            answers: formattedAnswers.length > 0 ? formattedAnswers : null
        };

        const domain = this.getDomainFromUrl();
        this.publicCareerService.applyJobByExternalCandidate(domain, request).subscribe({
            next: (res: any) => {
                this.isSubmitting = false;
                if (res.success || res.jobApplyId) {
                    this.submitSuccess = true;
                    // res.data could have jobApplyId, if backend wraps it
                    const applyId = res.data?.jobApplyId || res.jobApplyId || null;
                    if (applyId) {
                        this.startSignalRConnection(applyId);
                    }
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
}
