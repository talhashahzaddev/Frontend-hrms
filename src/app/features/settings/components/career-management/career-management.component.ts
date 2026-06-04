import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { QuillModule } from 'ngx-quill';
import { Subject, takeUntil } from 'rxjs';

import {
    SettingsService,
    CareerPageSettings
} from '../../services/settings.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DomainService } from '../../../../core/services/domain.service';

@Component({
    selector: 'app-career-management',
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatDividerModule,
        MatChipsModule,
        QuillModule
    ],
    templateUrl: './career-management.component.html',
    styleUrls: ['./career-management.component.scss']
})
export class CareerManagementComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    form: FormGroup;
    isLoading = false;
    isSaving = false;

    /** View mode vs edit mode toggle */
    isEditMode = false;

    /** The last snapshot saved (or loaded) — drives the view panel */
    savedData: CareerPageSettings | null = null;

    // ─── Upload state ─────────────────────────────────────────────
    isUploadingLogo = false;
    logoFileName: string | null = null;
    isUploadingBg = false;
    bgFileName: string | null = null;
    publicCareerUrl: string = '';

    readonly acceptedImageTypes = 'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml';
    readonly maxFileMb = 5;
    private static readonly MAX_BYTES = 5 * 1024 * 1024;
    private static readonly ALLOWED_TYPES = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'
    ];

    readonly quillHeaderConfig = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ align: [] }],
            ['clean']
        ]
    };

    readonly quillDescConfig = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ header: [1, 2, 3, false] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ align: [] }],
            ['link'],
            ['clean']
        ]
    };

    constructor(
        private fb: FormBuilder,
        private settingsService: SettingsService,
        private notificationService: NotificationService,
        private authService: AuthService,
        private domainService: DomainService
    ) {
        this.form = this.fb.group({
            logoUrl: ['', Validators.required],
            careerBgImageUrl: ['', Validators.required],
            careerHeaderText: ['', Validators.required],
            careerDescription: ['', Validators.required]
        });
        const subdomain = this.domainService.getCurrentSubdomain() || 'companyname';
        this.publicCareerUrl = `${subdomain}.briskpeople.com/career`;
    }

    ngOnInit(): void {
        this.loadSettings();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ─── Load ─────────────────────────────────────────────────────
    loadSettings(): void {
        this.isLoading = true;
        this.settingsService.getCareerPage()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data: CareerPageSettings) => {
                    this.savedData = data;
                    this.patchForm(data);
                    this.isLoading = false;
                },
                error: () => {
                    this.notificationService.showError('Failed to load career page settings');
                    this.isLoading = false;
                }
            });
    }

    private patchForm(data: CareerPageSettings): void {
        this.form.patchValue({
            logoUrl: data.logoUrl ?? '',
            careerBgImageUrl: data.careerBgImageUrl ?? '',
            careerHeaderText: data.careerHeaderText ?? '',
            careerDescription: data.careerDescription ?? ''
        });
        this.logoFileName = this.extractFileName(data.logoUrl);
        this.bgFileName = this.extractFileName(data.careerBgImageUrl);
    }

    // ─── View / Edit toggle ───────────────────────────────────────
    enterEditMode(): void {
        if (this.savedData) this.patchForm(this.savedData);
        this.isEditMode = true;
    }

    cancelEdit(): void {
        if (this.savedData) this.patchForm(this.savedData);
        this.isEditMode = false;
    }

    // ─── Logo upload ──────────────────────────────────────────────
    triggerLogoInput(input: HTMLInputElement): void {
        if (this.isUploadingLogo) return;
        input.value = '';
        input.click();
    }

    onLogoSelected(event: Event, input: HTMLInputElement): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const err = this.validateImage(file);
        if (err) { this.notificationService.showError(err); return; }

        this.isUploadingLogo = true;
        this.logoFileName = file.name;

        this.settingsService.uploadFile(file)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (url) => {
                    this.form.patchValue({ logoUrl: url });
                    this.notificationService.showSuccess('Logo uploaded');
                    this.isUploadingLogo = false;
                },
                error: (err) => {
                    this.notificationService.showError(err?.message || 'Logo upload failed');
                    this.logoFileName = this.extractFileName(this.form.value.logoUrl);
                    this.isUploadingLogo = false;
                }
            });

        input.value = '';
    }

    clearLogo(): void {
        this.form.patchValue({ logoUrl: '' });
        this.logoFileName = null;
    }

    get currentLogoUrl(): string | null {
        const v = this.form.get('logoUrl')?.value;
        return v?.trim() ? v.trim() : null;
    }

    // ─── Background upload ────────────────────────────────────────
    triggerBgInput(input: HTMLInputElement): void {
        if (this.isUploadingBg) return;
        input.value = '';
        input.click();
    }

    onBgSelected(event: Event, input: HTMLInputElement): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const err = this.validateImage(file);
        if (err) { this.notificationService.showError(err); return; }

        this.isUploadingBg = true;
        this.bgFileName = file.name;

        this.settingsService.uploadFile(file)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (url) => {
                    this.form.patchValue({ careerBgImageUrl: url });
                    this.notificationService.showSuccess('Background image uploaded');
                    this.isUploadingBg = false;
                },
                error: (err) => {
                    this.notificationService.showError(err?.message || 'Background image upload failed');
                    this.bgFileName = this.extractFileName(this.form.value.careerBgImageUrl);
                    this.isUploadingBg = false;
                }
            });

        input.value = '';
    }

    clearBg(): void {
        this.form.patchValue({ careerBgImageUrl: '' });
        this.bgFileName = null;
    }

    get currentBgUrl(): string | null {
        const v = this.form.get('careerBgImageUrl')?.value;
        return v?.trim() ? v.trim() : null;
    }

    // ─── Save ─────────────────────────────────────────────────────
    onSave(): void {
        if (this.isSaving) return;

        this.isSaving = true;
        const v = this.form.value;
        const request = {
            logoUrl: v.logoUrl?.trim() || null,
            careerBgImageUrl: v.careerBgImageUrl?.trim() || null,
            careerHeaderText: v.careerHeaderText?.trim() || null,
            careerDescription: v.careerDescription?.trim() || null
        };

        this.settingsService.updateCareerPage(request)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    // Update the displayed snapshot and exit edit mode
                    this.savedData = {
                        ...(this.savedData as CareerPageSettings),
                        ...request
                    };
                    this.notificationService.showSuccess('Career page settings saved successfully');
                    this.isSaving = false;
                    this.isEditMode = false;
                },
                error: (err) => {
                    this.notificationService.showError(err?.message || 'Failed to save career page settings');
                    this.isSaving = false;
                }
            });
    }

    // ─── URL Actions ────────────────────────────────────────────────
    copyUrl(): void {
        const fullUrl = `https://${this.publicCareerUrl}`;
        navigator.clipboard.writeText(fullUrl).then(() => {
            this.notificationService.showSuccess('URL copied to clipboard!');
        }).catch(() => {
            this.notificationService.showError('Failed to copy URL');
        });
    }

    openUrl(): void {
        const fullUrl = `https://${this.publicCareerUrl}`;
        window.open(fullUrl, '_blank');
    }

    // ─── Helpers ──────────────────────────────────────────────────
    hasAnyData(): boolean {
        if (!this.savedData) return false;
        const d = this.savedData;
        return !!(d.logoUrl || d.careerBgImageUrl || d.careerHeaderText || d.careerDescription);
    }

    hasPermission(actionKey: string): boolean {
        return this.authService.hasMenuPermission('Settings', 'Career management', actionKey);
    }

    private validateImage(file: File): string | null {
        if (!CareerManagementComponent.ALLOWED_TYPES.includes(file.type)) {
            return 'Allowed formats: JPG, PNG, GIF, WEBP, SVG';
        }
        if (file.size > CareerManagementComponent.MAX_BYTES) {
            return `File size must be ${this.maxFileMb} MB or less`;
        }
        return null;
    }

    private extractFileName(url: string | null | undefined): string | null {
        if (!url?.trim()) return null;
        try {
            return new URL(url).pathname.split('/').pop() || null;
        } catch {
            return url.split('/').pop() || null;
        }
    }
}
