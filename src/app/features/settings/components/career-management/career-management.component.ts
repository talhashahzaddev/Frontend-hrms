import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil } from 'rxjs';

import {
    SettingsService,
    CareerPageSettings
} from '../../services/settings.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
    selector: 'app-career-management',
    standalone: true,
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
        MatDividerModule
    ],
    templateUrl: './career-management.component.html',
    styleUrls: ['./career-management.component.scss']
})
export class CareerManagementComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    form: FormGroup;
    isLoading = false;
    isSaving = false;
    isSuperAdmin = false;

    // Logo upload state
    isUploadingLogo = false;
    logoFileName: string | null = null;

    // Background image upload state
    isUploadingBg = false;
    bgFileName: string | null = null;

    readonly acceptedImageTypes = 'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml';
    readonly maxFileMb = 5;
    private static readonly MAX_BYTES = 5 * 1024 * 1024;
    private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

    constructor(
        private fb: FormBuilder,
        private settingsService: SettingsService,
        private authService: AuthService,
        private notificationService: NotificationService
    ) {
        this.form = this.fb.group({
            logoUrl: [''],
            careerBgImageUrl: [''],
            careerHeaderText: [''],
            careerDescription: ['']
        });
    }

    ngOnInit(): void {
        this.isSuperAdmin = this.authService.hasRole('Super Admin');
        if (this.isSuperAdmin) {
            this.loadSettings();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadSettings(): void {
        this.isLoading = true;
        this.settingsService.getCareerPage()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data: CareerPageSettings) => {
                    this.form.patchValue({
                        logoUrl: data.logoUrl ?? '',
                        careerBgImageUrl: data.careerBgImageUrl ?? '',
                        careerHeaderText: data.careerHeaderText ?? '',
                        careerDescription: data.careerDescription ?? ''
                    });
                    this.logoFileName = this.extractFileName(data.logoUrl);
                    this.bgFileName = this.extractFileName(data.careerBgImageUrl);
                    this.isLoading = false;
                },
                error: () => {
                    this.notificationService.showError('Failed to load career page settings');
                    this.isLoading = false;
                }
            });
    }

    // ─── Logo upload ───────────────────────────────────────────────
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

    // ─── Background image upload ─────────────────────────────────
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

    // ─── Save ──────────────────────────────────────────────────────
    onSave(): void {
        if (!this.isSuperAdmin || this.isSaving) return;

        this.isSaving = true;
        const v = this.form.value;

        this.settingsService.updateCareerPage({
            logoUrl: v.logoUrl?.trim() || null,
            careerBgImageUrl: v.careerBgImageUrl?.trim() || null,
            careerHeaderText: v.careerHeaderText?.trim() || null,
            careerDescription: v.careerDescription?.trim() || null
        }).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.notificationService.showSuccess('Career page settings saved successfully');
                    this.isSaving = false;
                },
                error: (err) => {
                    this.notificationService.showError(err?.message || 'Failed to save career page settings');
                    this.isSaving = false;
                }
            });
    }

    // ─── Helpers ───────────────────────────────────────────────────
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
