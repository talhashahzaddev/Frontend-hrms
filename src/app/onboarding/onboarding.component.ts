import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject, takeUntil, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { SettingsService, CompanyPolicy, OrgOnboardingConfigItem } from '@features/settings/services/settings.service';
import {
  OnboardingEducation,
  OnboardingRequest,
  OnboardingService,
  OnboardingWorkExperience,
  SaveBankDetailsRequest
} from './services/onboarding.service';

import { SharedCommonModule } from '@shared/shared-common.module';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
// ─── Local interfaces ─────────────────────────────────────────────────────────

export interface ProfileForm {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  department: string;
  gender: string;
  nationality: string;
  idNumber: string;
  photo: File | null;
  resume: File | null;
  resumeFileName: string;
  photoUrl: string | null;
  resumeUrl: string | null;
}

export interface EducationFormEntry extends OnboardingEducation {
  educationId?: string;
  file: File | null;
  fileUrl?: string | null;
  _saved: boolean;
}

export interface WorkExperienceFormEntry extends OnboardingWorkExperience {
  experienceId?: string;
  file: File | null;
  fileUrl?: string | null;
  _saved: boolean;
}

export interface PermissionModule {
  id: string;
  label: string;
  description: string;
  route: string;
  allowed: boolean;
  selected: boolean;
}

// ── Bank Details form ─────────────────────────────────────────────────────────
export interface BankForm {
  bankDetailsId?: string;
  noBankAccount: boolean;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  paymentMethod: string;
  bankName: string;
  iban: string;
  branchName: string;
  branchCode: string;
}

export interface BankErrors {
  accountHolderName?: string;
  accountNumber?: string;
  confirmAccountNumber?: string;
  paymentMethod?: string;
  bankName?: string;
  iban?: string;
  branchName?: string;
  branchCode?: string;
}


@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    SharedCommonModule, 
    CommonModule, 
    FormsModule, 
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss']
})
export class Onboarding implements OnInit, OnDestroy {

  // ── State ─────────────────────────────────────────────────────────────────
  step = 1;
  onboardingId: string | null = null;

  photoPreview: string | null = null;
  hasSavedPhoto = false;
  hasSavedResume = false;

  fieldConfigs: { [key: string]: { enabled: boolean; required: boolean } } = {};

  // ── Lists ─────────────────────────────────────────────────────────────────
  educationList: EducationFormEntry[] = [];
  workExperienceList: WorkExperienceFormEntry[] = [];
  permissionModules: PermissionModule[] = [];
  policies: CompanyPolicy[] = [];

  // ── Edit tracking ──────────────────────────────────────────────────────────
  editingEducationIndex: number | null = null;
  editingExperienceIndex: number | null = null;

  // ── UI flags ──────────────────────────────────────────────────────────────
  isSavingPersonalInfo = false;
  isSavingEducation = false;
  isSavingWorkExperience = false;
  isSavingBankDetails = false;
  isLoadingBankDetails = false;
  isDeletingBankDetails = false;
  bankDetailsSaved = false;
  isSubmitting = false;
  // Flag to indicate the entire onboarding flow has been completed
  onboardingCompleted = false;

  // ── Upload loading flags ───────────────────────────────────────────────────
  isUploadingPhoto = false;
  isUploadingResume = false;
  isUploadingEducationFile = false;
  isUploadingWorkExpFile = false;

  personalInfoError: string | null = null;
  workExperienceError: string | null = null;
  bankDetailsError: string | null = null;

  policyAccepted = false;
  documentNotes = '';
  reviewCompletionRate = 0;

  // ── Forms ─────────────────────────────────────────────────────────────────
  form: ProfileForm = {
    fullName: '', jobTitle: '', email: '', phone: '',
    department: '', gender: '', nationality: '', idNumber: '',
    photo: null, resume: null, resumeFileName: '',
    photoUrl: null, resumeUrl: null
  };

  education: EducationFormEntry = this.blankEducation();
  workExperience: WorkExperienceFormEntry = this.blankWorkExperience();

  bankForm: BankForm = {
    bankDetailsId: undefined,
    noBankAccount: false,
    accountHolderName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    paymentMethod: '',
    bankName: '',
    iban: '',
    branchName: '',
    branchCode: ''
  };

  bankErrors: BankErrors = {};

  // ── File validation ───────────────────────────────────────────────────────
  private readonly allowedWorkExpTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png'
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private settingsService: SettingsService,
    private onboardingService: OnboardingService,
    private notification: NotificationService,
    private dialog: MatDialog
  ) { }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.initializePermissionModules();
    this.loadPublishedPolicies();
    this.loadOrgOnboardingConfig();
    this.loadExistingOnboardingData();
  }

  // Navigate to appropriate dashboard after completion
  goToDashboard(): void {
    const isEmployee = this.authService.hasRole?.('Employee');
    const redirectRoute = isEmployee ? '/employee/dashboard' : '/dashboard';
    this.router.navigate([redirectRoute]);
  }

  /** Heuristic to determine if an incoming payload marks onboarding as completed */
  private isPayloadCompleted(data: any): boolean {
    if (!data) return false;
    if (data.isCompleted === true || data.completed === true) return true;
    if (data.isSubmitted === true || data.submitted === true) return true;
    const status = (data.status ?? '').toString().toLowerCase();
    if (status === 'completed' || status === 'finished' || status === 'submitted') return true;
    return false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Policies ──────────────────────────────────────────────────────────────

  private loadPublishedPolicies(): void {
    this.settingsService.getPolicies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: policies => { this.policies = policies.filter(p => p.isPublished); },
        error: () => { this.policies = []; }
      });
  }

  openPolicyFile(url: string | null | undefined): void {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ── Existing data pre-fill ────────────────────────────────────────────────

  private loadExistingOnboardingData(): void {
    this.onboardingService.getMyStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          const data = response?.data ?? response;

          if (!data) {
            return;
          }

          this.onboardingId = data.onboardingId ?? data.personalInfo?.onboardingId ?? null;

          // ── Personal info ────────────────────────────────────────────────
          if (data.personalInfo) {
            const p = data.personalInfo;
            this.form.fullName = p.fullName ?? '';
            this.form.jobTitle = p.jobTitle ?? '';
            this.form.email = p.email ?? '';
            this.form.phone = p.phone ?? '';
            this.form.department = p.department ?? '';
            this.form.gender = p.gender ?? '';
            this.form.nationality = p.nationality ?? '';
            this.form.idNumber = p.idNumber ?? '';
            this.form.resumeFileName = p.resumeFileName ?? p.resumeName ?? p.resume?.fileName ?? '';
            this.form.resumeUrl = p.resumeUrl ?? p.resume?.url ?? null;
            this.hasSavedResume = !!(this.form.resumeFileName || this.form.resumeUrl);
            this.hasSavedPhoto = !!p.photoUrl;
            if (p.photoUrl) this.photoPreview = p.photoUrl;
          }

          // ── Education list ────────────────────────────────────────────────
          if (data.educationList?.length > 0) {
            this.educationList = data.educationList.map((e: any) => ({
              educationId: e.educationId ?? e.EducationId ?? undefined,
              degree: e.degree ?? '',
              institution: e.institution ?? '',
              field: e.field ?? '',
              gpa: e.gpa ?? '',
              fileName: e.fileName ?? '',
              description: e.description ?? '',
              file: null,
              _saved: true
            }));
          }

          // ── Work experience list ──────────────────────────────────────────
          if (data.workExperienceList?.length > 0) {
            this.workExperienceList = data.workExperienceList.map((e: any) => ({
              experienceId: e.experienceId ?? e.ExperienceId ?? undefined,
              jobTitle: e.jobTitle ?? '',
              company: e.company ?? '',
              employmentType: e.employmentType ?? '',
              location: e.location ?? '',
              startDate: e.startDate ?? '',
              endDate: e.endDate ?? '',
              currentlyWorking: e.currentlyWorking ?? false,
              responsibilities: e.responsibilities ?? '',
              fileName: e.fileName ?? '',
              file: null,
              _saved: true
            }));
          }

          // ── Bank details (status payload or dedicated GET) ─────────────────
          if (data.bankDetails) {
            this.applyBankDetails(data.bankDetails);
          } else if (this.onboardingId) {
            this.loadBankDetails();
          }

          this.documentNotes = data.documentNotes ?? '';
          this.policyAccepted = data.isPolicyAccepted ?? false;

          this.calculateCompletionRate();

          // Mark completed if API payload indicates completion
          this.onboardingCompleted = this.isPayloadCompleted(data);

          // Navigate to furthest step and ensure it's enabled
          let targetStep = 1;
          if (typeof data.currentStep === 'number' && data.currentStep > 1) {
            targetStep = Math.min(data.currentStep, 6);
          } else if (this.workExperienceList.length > 0) {
            targetStep = 4;
          } else if (this.educationList.length > 0) {
            targetStep = 3;
          } else if (this.form.fullName) {
            targetStep = 2;
          }
          while (targetStep > 1 && !this.isStepEnabled(targetStep)) {
            targetStep--;
          }
          this.step = targetStep;
        },
        error: err => {
          console.warn('No existing onboarding data:', err);
        }
      });
  }

  // ── Step 1 – Personal Info ────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.form.photo = file;
    const reader = new FileReader();
    reader.onload = e => { this.photoPreview = e.target?.result as string; };
    reader.readAsDataURL(file);
    // Upload immediately and store URL
    this.isUploadingPhoto = true;
    this.onboardingService.uploadFile(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (url: string) => {
          this.form.photoUrl = url;
          this.isUploadingPhoto = false;
          this.notification.showSuccess('Photo uploaded successfully');
        },
        error: (err: any) => {
          this.isUploadingPhoto = false;
          this.form.photo = null;
          this.photoPreview = null;
          this.notification.showError(err?.message || 'Photo upload failed. Please try again.');
        }
      });
  }

  triggerFileInput(): void {
    (document.querySelector('input[type="file"]') as HTMLInputElement)?.click();
  }

  onResumeSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.form.resume = file;
    this.form.resumeFileName = file.name;
    this.form.resumeUrl = null;
    this.hasSavedResume = true;
    // Upload immediately and store URL
    this.isUploadingResume = true;
    this.onboardingService.uploadFile(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (url: string) => {
          this.form.resumeUrl = url;
          this.hasSavedResume = true;
          this.isUploadingResume = false;
          this.notification.showSuccess('Resume uploaded successfully');
        },
        error: (err: any) => {
          this.isUploadingResume = false;
          this.form.resume = null;
          this.form.resumeUrl = null;
          this.hasSavedResume = !!this.form.resumeFileName;
          this.notification.showError(err?.message || 'Resume upload failed. Please try again.');
        }
      });
  }

  onSubmit(): void {
    if (!this.isPersonalCompleted()) {
      this.personalInfoError = 'Please fill in all required fields.';
      return;
    }
    this.isSavingPersonalInfo = true;
    this.personalInfoError = null;

    this.onboardingService.savePersonalInfo(
      this.form.fullName, this.form.jobTitle, this.form.email,
      this.form.phone, this.form.department, this.form.gender,
      this.form.nationality, this.form.idNumber,
      this.form.photoUrl, this.form.resumeUrl, this.form.resumeFileName
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.isSavingPersonalInfo = false;
        this.onboardingId = this.extractOnboardingId(response);
        this.calculateCompletionRate();
        this.step = this.getNextEnabledStep(1);
      },
      error: err => {
        this.isSavingPersonalInfo = false;
        this.personalInfoError = err?.error?.message || err?.message
          || 'Failed to save personal information. Please try again.';
      }
    });
  }

  // ── Step 2 – Education ────────────────────────────────────────────────────

  onEducationFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.education.file = file;
    this.education.fileName = file.name;
    this.education.fileUrl = null;
    this.isUploadingEducationFile = true;

    this.onboardingService.uploadFile(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (url: string) => {
          this.education.fileUrl = url;
          this.isUploadingEducationFile = false;
          this.notification.showSuccess('Education file uploaded successfully');
        },
        error: (err: any) => {
          this.isUploadingEducationFile = false;
          this.education.file = null;
          this.education.fileName = '';
          this.education.fileUrl = null;
          this.notification.showError(err?.message || 'Education file upload failed. Please try again.');
        }
      });
  }

  addEducation(): void {
    if (!this.isEducationFormValid()) return;
    if (!this.onboardingId) { alert('Please save personal information first.'); return; }

    this.isSavingEducation = true;
    const educationData = {
      degree: this.education.degree,
      institution: this.education.institution,
      field: this.education.field,
      gpa: this.education.gpa,
      fileName: this.education.fileName,
      description: this.education.description
    };

    const fileUrl = this.education.fileUrl || null;
    this.onboardingService.addEducation(educationData, fileUrl, this.onboardingId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isSavingEducation = false;
          this.educationList.push({
            ...this.education,
            educationId: response?.data?.educationId ?? undefined,
            _saved: true
          });
          this.resetEducationForm();
          this.calculateCompletionRate();
        },
        error: (err: any) => {
          this.isSavingEducation = false;
          this.notification.showError(err?.error?.message || err?.message || 'Unable to save education. Please try again.');
        }
      });
  }

  editEducation(index: number): void {
    this.editingEducationIndex = index;
    this.education = { ...this.educationList[index] };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateEducation(): void {
    if (!this.education.degree || !this.education.institution
      || !this.education.field || this.editingEducationIndex === null) return;
    this.educationList[this.editingEducationIndex] = { ...this.education };
    this.editingEducationIndex = null;
    this.resetEducationForm();
  }

  cancelEducationEdit(): void {
    this.editingEducationIndex = null;
    this.resetEducationForm();
  }

  removeEducation(index: number): void {
    const edu = this.educationList[index];
    if (!edu) return;

    const dialogData: ConfirmDeleteData = {
      title: 'Delete Education Entry',
      message: 'Are you sure you want to delete this education entry?',
      itemName: edu.degree || 'this education entry',
      confirmButtonText: 'Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result !== true) return;

      if (edu.educationId) {
        this.onboardingService.deleteEducation(edu.educationId).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: () => {
            this.educationList.splice(index, 1);
            this.calculateCompletionRate();
            this.notification.showSuccess('Education record deleted successfully');
          },
          error: (err: any) => {
            this.notification.showError(err?.message || 'Failed to delete education record.');
          }
        });
      } else {
        this.educationList.splice(index, 1);
        this.calculateCompletionRate();
      }
    });
  }

  resetEducationForm(): void { this.education = this.blankEducation(); }

  continueToWorkExperience(): void { this.step = this.getNextEnabledStep(2); }

  // ── Step 3 – Work Experience ──────────────────────────────────────────────

  onWorkExperienceFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.workExperienceError = null;

    if (!file) {
      this.workExperience.file = null;
      this.workExperience.fileName = '';
      this.workExperience.fileUrl = null;
      return;
    }
    if (!this.allowedWorkExpTypes.includes(file.type)) {
      this.workExperienceError = 'Unsupported file type. Use PDF, DOC, DOCX, JPG, or PNG.';
      input.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.workExperienceError = 'File too large. Maximum 10 MB allowed.';
      input.value = '';
      return;
    }
    this.workExperience.file = file;
    this.workExperience.fileName = file.name;
    this.workExperience.fileUrl = null;
    this.isUploadingWorkExpFile = true;

    this.onboardingService.uploadFile(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (url: string) => {
          this.workExperience.fileUrl = url;
          this.isUploadingWorkExpFile = false;
          this.notification.showSuccess('Work experience file uploaded successfully');
        },
        error: (err: any) => {
          this.isUploadingWorkExpFile = false;
          this.workExperience.file = null;
          this.workExperience.fileName = '';
          this.workExperience.fileUrl = null;
          this.notification.showError(err?.message || 'Work experience file upload failed. Please try again.');
        }
      });
  }

  addWorkExperience(): void {
    this.workExperienceError = null;
    if (!this.isWorkExperienceFormValid()) {
      this.workExperienceError = 'Please fill in all required fields.';
      return;
    }
    if (!this.onboardingId) { alert('Please save personal information first.'); return; }

    this.isSavingWorkExperience = true;
    const workExpData = {
      jobTitle: this.workExperience.jobTitle,
      company: this.workExperience.company,
      employmentType: this.workExperience.employmentType,
      location: this.workExperience.location,
      startDate: this.workExperience.startDate,
      endDate: this.workExperience.endDate,
      currentlyWorking: this.workExperience.currentlyWorking,
      responsibilities: this.workExperience.responsibilities,
      fileName: this.workExperience.fileName
    };

    const fileUrl = this.workExperience.fileUrl || null;
    this.onboardingService.addWorkExperience(workExpData, fileUrl, this.onboardingId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isSavingWorkExperience = false;
          this.workExperienceList.push({
            ...this.workExperience,
            experienceId: response?.data?.experienceId ?? undefined,
            _saved: true
          });
          this.resetWorkExperienceForm();
          this.calculateCompletionRate();
        },
        error: (err: any) => {
          this.isSavingWorkExperience = false;
          this.notification.showError(err?.error?.message || err?.message || 'Unable to save work experience. Please try again.');
        }
      });
  }

  editWorkExperience(index: number): void {
    this.editingExperienceIndex = index;
    this.workExperience = { ...this.workExperienceList[index] };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateWorkExperience(): void {
    if (!this.workExperience.jobTitle || !this.workExperience.company
      || this.editingExperienceIndex === null) return;
    this.workExperienceList[this.editingExperienceIndex] = { ...this.workExperience };
    this.editingExperienceIndex = null;
    this.resetWorkExperienceForm();
  }

  cancelExperienceEdit(): void {
    this.editingExperienceIndex = null;
    this.resetWorkExperienceForm();
  }

  removeWorkExperience(index: number): void {
    const exp = this.workExperienceList[index];
    if (!exp) return;

    const dialogData: ConfirmDeleteData = {
      title: 'Delete Work Experience',
      message: 'Are you sure you want to delete this work experience entry?',
      itemName: exp.jobTitle || 'this work experience entry',
      confirmButtonText: 'Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result !== true) return;

      if (exp.experienceId) {
        this.onboardingService.deleteWorkExperience(exp.experienceId).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: () => {
            this.workExperienceList.splice(index, 1);
            this.calculateCompletionRate();
            this.notification.showSuccess('Work experience record deleted successfully');
          },
          error: (err: any) => {
            this.notification.showError(err?.message || 'Failed to delete work experience record.');
          }
        });
      } else {
        this.workExperienceList.splice(index, 1);
        this.calculateCompletionRate();
      }
    });
  }

  resetWorkExperienceForm(): void {
    this.workExperience = this.blankWorkExperience();
    this.workExperienceError = null;
  }

  continueFromWorkExperience(): void {
    this.calculateCompletionRate();
    this.step = this.getNextEnabledStep(3);
  }

  // ── Step 4 – Bank Details ─────────────────────────────────────────────────

  /** Loads saved bank details for the current session (survives page refresh). */
  private loadBankDetails(): void {
    this.isLoadingBankDetails = true;
    this.onboardingService.getBankDetails()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.isLoadingBankDetails = false;
          const record = this.normalizeBankDetailsPayload(response);
          if (record && this.hasBankDetailsRecord(record)) {
            this.applyBankDetails(record);
          }
        },
        error: () => {
          this.isLoadingBankDetails = false;
        }
      });
  }

  private normalizeBankDetailsPayload(response: any): any | null {
    if (!response) return null;
    const data = response?.data ?? response;
    if (Array.isArray(data)) {
      return data.length > 0 ? data[0] : null;
    }
    return data;
  }

  private hasBankDetailsRecord(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (data.bankDetailsId ?? data.BankDetailsId) return true;
    if (data.noBankAccount === true || data.NoBankAccount === true) return true;
    return !!(
      data.accountNumber ?? data.AccountNumber ??
      data.bankName ?? data.BankName ??
      data.accountHolderName ?? data.AccountHolderName
    );
  }

  /** Maps API / status bank-details payload into the form and saved summary state. */
  private applyBankDetails(b: any): void {
    const accountNumber =
      b.accountNumber ?? b.AccountNumber ?? '';
    this.bankForm.bankDetailsId = String(b.bankDetailsId ?? b.BankDetailsId ?? '') || undefined;
    this.bankForm.noBankAccount = b.noBankAccount ?? b.NoBankAccount ?? false;
    this.bankForm.accountHolderName = b.accountHolderName ?? b.AccountHolderName ?? '';
    this.bankForm.accountNumber = accountNumber;
    this.bankForm.confirmAccountNumber = accountNumber;
    this.bankForm.paymentMethod = b.paymentMethod ?? b.PaymentMethod ?? '';
    this.bankForm.bankName = b.bankName ?? b.BankName ?? '';
    this.bankForm.iban = b.iban ?? b.Iban ?? '';
    this.bankForm.branchName = b.branchName ?? b.BranchName ?? '';
    this.bankForm.branchCode = b.branchCode ?? b.BranchCode ?? '';
    this.bankDetailsSaved = true;
    this.calculateCompletionRate();
  }

  private buildBankDetailsRequest(): SaveBankDetailsRequest {
    return {
      onboardingId: this.onboardingId!,
      bankDetailsId: this.bankForm.bankDetailsId,
      noBankAccount: this.bankForm.noBankAccount,
      accountHolderName: this.bankForm.noBankAccount ? null : this.bankForm.accountHolderName,
      accountNumber: this.bankForm.noBankAccount ? null : this.bankForm.accountNumber,
      bankName: this.bankForm.noBankAccount ? null : this.bankForm.bankName,
      paymentMethod: this.bankForm.noBankAccount ? null : this.bankForm.paymentMethod,
      iban: this.bankForm.noBankAccount ? null : (this.bankForm.iban || null),
      branchName: this.bankForm.noBankAccount ? null : (this.bankForm.branchName || null),
      branchCode: this.bankForm.noBankAccount ? null : (this.bankForm.branchCode || null)
    };
  }

  onNoBankAccountToggle(): void {
    if (this.bankForm.noBankAccount) {
      this.bankErrors = {};
    }
  }

  clearBankError(field: keyof BankErrors): void {
    delete this.bankErrors[field];
  }

  private validateBankForm(): boolean {
    this.bankErrors = {};
    if (this.bankForm.noBankAccount) return true;

    if (this.isFieldEnabled('BANK DETAILS', 'ACCOUNT HOLDER NAME') && this.isFieldRequired('BANK DETAILS', 'ACCOUNT HOLDER NAME') && !this.bankForm.accountHolderName?.trim()) {
      this.bankErrors.accountHolderName = 'Account holder name is required.';
    }
    if (this.isFieldEnabled('BANK DETAILS', 'PAYMENT METHOD') && this.isFieldRequired('BANK DETAILS', 'PAYMENT METHOD') && !this.bankForm.paymentMethod) {
      this.bankErrors.paymentMethod = 'Payment method is required.';
    }
    if (this.isFieldEnabled('BANK DETAILS', 'ACCOUNT NUMBER') && this.isFieldRequired('BANK DETAILS', 'ACCOUNT NUMBER') && !this.bankForm.accountNumber?.trim()) {
      this.bankErrors.accountNumber = 'Account number is required.';
    }
    if (this.isFieldEnabled('BANK DETAILS', 'CONFIRM ACCOUNT NUMBER')) {
      if (this.isFieldRequired('BANK DETAILS', 'CONFIRM ACCOUNT NUMBER') && !this.bankForm.confirmAccountNumber?.trim()) {
        this.bankErrors.confirmAccountNumber = 'Please confirm the account number.';
      } else if (this.bankForm.accountNumber !== this.bankForm.confirmAccountNumber) {
        this.bankErrors.confirmAccountNumber = 'Account numbers do not match.';
      }
    }
    if (this.isFieldEnabled('BANK DETAILS', 'BANK NAME') && this.isFieldRequired('BANK DETAILS', 'BANK NAME') && !this.bankForm.bankName) {
      this.bankErrors.bankName = 'Bank name is required.';
    }
    if (this.isFieldEnabled('BANK DETAILS', 'IBN/SWIFT CODE') && this.isFieldRequired('BANK DETAILS', 'IBN/SWIFT CODE') && !this.bankForm.iban?.trim()) {
      this.bankErrors.iban = 'IBAN / SWIFT Code is required.';
    }
    if (this.isFieldEnabled('BANK DETAILS', 'BRANCH NAME') && this.isFieldRequired('BANK DETAILS', 'BRANCH NAME') && !this.bankForm.branchName?.trim()) {
      this.bankErrors.branchName = 'Branch name is required.';
    }
    if (this.isFieldEnabled('BANK DETAILS', 'BRANCH CODE') && this.isFieldRequired('BANK DETAILS', 'BRANCH CODE') && !this.bankForm.branchCode?.trim()) {
      this.bankErrors.branchCode = 'Branch code is required.';
    }

    return Object.keys(this.bankErrors).length === 0;
  }

  saveBankDetails(): void {
    this.bankDetailsError = null;
    if (!this.validateBankForm()) return;
    if (!this.onboardingId) {
      this.bankDetailsError = 'Please complete personal information first.';
      return;
    }

    this.isSavingBankDetails = true;
    const request = this.buildBankDetailsRequest();
    const save$ = this.bankForm.bankDetailsId
      ? this.onboardingService.updateBankDetails(request)
      : this.onboardingService.saveBankDetails(request);

    save$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        this.isSavingBankDetails = false;
        const saved = response?.data ?? response;
        const newId =
          saved?.bankDetailsId ?? saved?.BankDetailsId ?? this.bankForm.bankDetailsId;
        if (newId) {
          this.bankForm.bankDetailsId = String(newId);
        }
        this.applyBankDetails({
          ...this.bankForm,
          bankDetailsId: this.bankForm.bankDetailsId
        });
      },
      error: err => {
        this.isSavingBankDetails = false;
        this.bankDetailsError = err?.error?.message || err?.message
          || 'Failed to save bank details. Please try again.';
      }
    });
  }

  editBankDetails(): void {
    // Allow editing by temporarily hiding the saved summary and showing the form
    // User can update details and save again
    this.bankDetailsSaved = false;
    // Scroll to bank details form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  removeBankDetails(): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Remove Bank Details',
      message: 'Are you sure you want to remove',
      itemName: this.bankForm.accountHolderName || 'your bank details',
      confirmButtonText: 'Remove'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result !== true) return;

      const resetLocal = () => {
        this.bankForm = {
          bankDetailsId: undefined,
          noBankAccount: false,
          accountHolderName: '',
          paymentMethod: '',
          accountNumber: '',
          confirmAccountNumber: '',
          bankName: '',
          iban: '',
          branchName: '',
          branchCode: ''
        };
        this.bankDetailsSaved = false;
        this.bankErrors = {};
        this.bankDetailsError = null;
        this.calculateCompletionRate();
      };

      const bankDetailsId = this.bankForm.bankDetailsId;
      if (!bankDetailsId) {
        resetLocal();
        return;
      }

      const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
      if (!guidRegex.test(bankDetailsId)) {
        this.bankDetailsError = 'Invalid bank details identifier.';
        return;
      }

      console.debug('Deleting bank details:', bankDetailsId);

      this.isDeletingBankDetails = true;
      this.bankDetailsError = null;
      this.onboardingService.deleteBankDetails(bankDetailsId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isDeletingBankDetails = false;
            resetLocal();
          },
          error: err => {
            this.isDeletingBankDetails = false;
            this.bankDetailsError = err?.error?.message || err?.message
              || 'Failed to delete bank details. Please try again.';
          }
        });
    });
  }

  continueFromBankDetails(): void {
    this.calculateCompletionRate();
    this.step = this.getNextEnabledStep(4);
  }

  isBankDetailsCompleted(): boolean {
    const bankFields = ['ACCOUNT HOLDER NAME', 'PAYMENT METHOD', 'ACCOUNT NUMBER', 'CONFIRM ACCOUNT NUMBER', 'BANK NAME', 'IBN/SWIFT CODE', 'BRANCH NAME', 'BRANCH CODE'];
    const anyBankEnabled = bankFields.some(f => this.isFieldEnabled('BANK DETAILS', f));
    if (!anyBankEnabled) return true;
    return this.bankDetailsSaved || this.bankForm.noBankAccount;
  }

  // ── Step 5 – Verification ─────────────────────────────────────────────────

  editPersonalFromVerification(): void {
    this.step = 1;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editEducationFromVerification(index: number): void {
    this.editEducation(index);
    this.step = 2;
  }

  deleteEducationFromVerification(index: number): void {
    this.removeEducation(index);
  }

  editExperienceFromVerification(index: number): void {
    this.editWorkExperience(index);
    this.step = 3;
  }

  deleteExperienceFromVerification(index: number): void {
    this.removeWorkExperience(index);
  }

  proceedFromVerification(): void {
    this.calculateCompletionRate();
    this.step = this.getNextEnabledStep(5);
  }

  // ── Step 6 – Policies / Submit ────────────────────────────────────────────

  finishOnboarding(): void {
    if (!this.policyAccepted && this.policies.length > 0) return;
    this.isSubmitting = true;
    this.calculateCompletionRate();

    const isEmployee = this.authService.hasRole?.('Employee');
    const redirectRoute = isEmployee ? '/employee/dashboard' : '/dashboard';
    this.submitOnboarding(redirectRoute);
  }

  private submitOnboarding(redirectRoute: string): void {
    const request = this.buildOnboardingRequest();

    this.onboardingService.submitOnboarding(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          // Mark onboarding completed and show completed UI instead of immediate redirect
          this.onboardingCompleted = true;
          this.notification.showSuccess('Onboarding completed successfully');
        },
        error: err => {
          this.isSubmitting = false;
          console.error('Onboarding submit error:', err);
          alert('Unable to submit onboarding. Please try again.');
        }
      });
  }

  private buildOnboardingRequest(): OnboardingRequest {
    const { firstName, lastName } = this.splitName(this.form.fullName);
    return {
      firstName, lastName,
      email: this.form.email,
      phone: this.form.phone,
      jobTitle: this.form.jobTitle,
      department: this.form.department,
      gender: this.form.gender,
      nationality: this.form.nationality,
      idNumber: this.form.idNumber,
      resumeFileName: this.form.resumeFileName,
      education: this.educationList.map(e => ({
        degree: e.degree, institution: e.institution, field: e.field,
        gpa: e.gpa, fileName: e.fileName || '', description: e.description || ''
      })),
      workExperience: this.workExperienceList.map(e => ({
        jobTitle: e.jobTitle, company: e.company, employmentType: e.employmentType,
        location: e.location, startDate: e.startDate, endDate: e.endDate,
        currentlyWorking: e.currentlyWorking, responsibilities: e.responsibilities || '',
        fileName: e.fileName || ''
      })),
      selectedModuleIds: this.permissionModules.filter(m => m.selected).map(m => m.id),
      policyAccepted: this.policyAccepted,
      documentNotes: this.documentNotes
    };
  }

  // ── Permissions ───────────────────────────────────────────────────────────

  initializePermissionModules(): void {
    const savedSelected: string[] = JSON.parse(
      localStorage.getItem('userSelectedModules') || '[]'
    );
    const perms = this.authService.getUserPermissionsValue();
    const allowed = new Set<string>();
    perms?.menus?.forEach((menu: any) => {
      if (menu.subMenus?.some((s: any) => s.actions?.some((a: any) => a.hasPermission))) {
        allowed.add(menu.menuName.toLowerCase());
      }
    });

    this.permissionModules = [
      { id: 'dashboard', label: 'Dashboard', description: 'Overall business health and key metrics', route: '/dashboard', allowed: true, selected: false },
      { id: 'attendance', label: 'Attendance', description: 'Track employee check-ins, shifts, and attendance', route: '/attendance/dashboard', allowed: allowed.has('attendance'), selected: false },
      { id: 'leave', label: 'Leave', description: 'Manage leaves, requests, and balances', route: '/leave/dashboard', allowed: allowed.has('leave management') || allowed.has('leave'), selected: false },
      { id: 'payroll', label: 'Payroll', description: 'Salary processing, payslips and payroll rules', route: '/payroll/periods', allowed: allowed.has('payroll'), selected: false },
      { id: 'assets', label: 'Assets', description: 'Hardware / asset allocation and tracking', route: '/assets/create', allowed: allowed.has('assets management') || allowed.has('assets'), selected: false },
      { id: 'performance', label: 'Performance', description: 'Performance reviews and goals', route: '/performance/dashboard', allowed: allowed.has('performance'), selected: false }
    ].map(m => ({ ...m, selected: m.allowed ? (savedSelected.includes(m.id) || m.allowed) : false }));

    this.savePermissionSelection();
  }

  togglePermissionModule(module: PermissionModule, checked: boolean): void {
    if (!module.allowed) return;
    module.selected = checked;
    this.savePermissionSelection();
  }

  private savePermissionSelection(): void {
    localStorage.setItem(
      'userSelectedModules',
      JSON.stringify(this.permissionModules.filter(m => m.selected).map(m => m.id))
    );
  }

  // ── Completion helpers ────────────────────────────────────────────────────

  isPersonalCompleted(): boolean {
    const f = this.form;
    if (this.isFieldEnabled('Personal Information', 'Full Name') && this.isFieldRequired('Personal Information', 'Full Name') && !f.fullName) return false;
    if (this.isFieldEnabled('Personal Information', 'Job Title') && this.isFieldRequired('Personal Information', 'Job Title') && !f.jobTitle) return false;
    if (this.isFieldEnabled('Personal Information', 'Email Address') && this.isFieldRequired('Personal Information', 'Email Address') && !f.email) return false;
    if (this.isFieldEnabled('Personal Information', 'Phone Number') && this.isFieldRequired('Personal Information', 'Phone Number') && !f.phone) return false;
    if (this.isFieldEnabled('Personal Information', 'Department') && this.isFieldRequired('Personal Information', 'Department') && !f.department) return false;
    if (this.isFieldEnabled('Personal Information', 'Gender') && this.isFieldRequired('Personal Information', 'Gender') && !f.gender) return false;
    if (this.isFieldEnabled('Personal Information', 'Nationality') && this.isFieldRequired('Personal Information', 'Nationality') && !f.nationality) return false;
    if (this.isFieldEnabled('Personal Information', 'National ID/CNIC') && this.isFieldRequired('Personal Information', 'National ID/CNIC') && !f.idNumber) return false;
    if (this.isFieldEnabled('Personal Information', 'Profile Photo') && this.isFieldRequired('Personal Information', 'Profile Photo') && !(f.photo || this.hasSavedPhoto)) return false;
    if (this.isFieldEnabled('Personal Information', 'Resume/CV') && this.isFieldRequired('Personal Information', 'Resume/CV') && !(f.resume || this.hasSavedResume)) return false;
    return true;
  }

  isEducationCompleted(): boolean { return this.educationList.length > 0; }
  isWorkExperienceCompleted(): boolean { return this.workExperienceList.length > 0; }
  isResumeUploaded(): boolean { return !!(this.form.resume || this.hasSavedResume); }

  calculateCompletionRate(): void {
    let done = 0;
    let total = 0;

    // 1. Personal Details
    const personalFields = ['Full Name', 'Job Title', 'Email Address', 'Phone Number', 'Department', 'Gender', 'Nationality', 'National ID/CNIC'];
    const enabledPersonalFields = personalFields.filter(f => this.isFieldEnabled('Personal Information', f));
    if (enabledPersonalFields.length > 0) {
      total++;
      const allFilled = enabledPersonalFields.every(f => {
        if (f === 'Full Name') return !!this.form.fullName;
        if (f === 'Job Title') return !!this.form.jobTitle;
        if (f === 'Email Address') return !!this.form.email;
        if (f === 'Phone Number') return !!this.form.phone;
        if (f === 'Department') return !!this.form.department;
        if (f === 'Gender') return !!this.form.gender;
        if (f === 'Nationality') return !!this.form.nationality;
        if (f === 'National ID/CNIC') return !!this.form.idNumber;
        return true;
      });
      if (allFilled) done++;
    }

    // 2. Profile Photo
    if (this.isFieldEnabled('Personal Information', 'Profile Photo')) {
      total++;
      if (this.form.photo || this.hasSavedPhoto) done++;
    }

    // 3. Resume
    if (this.isFieldEnabled('Personal Information', 'Resume/CV')) {
      total++;
      if (this.form.resume || this.hasSavedResume) done++;
    }

    // 4. Education
    const educationFields = ['Degree Level', 'Institute Name', 'Field of Study', 'GPA', 'ATTACH DOCOMENT', 'Discription'];
    const anyEducationEnabled = educationFields.some(f => this.isFieldEnabled('Qualification Details', f));
    if (anyEducationEnabled) {
      total++;
      if (this.educationList.length > 0) done++;
    }

    // 5. Work Experience
    const workFields = ['JOB TITTLE', 'COMPANY', 'EMPLOYMENT TYPE', 'LOCATION', 'SATRT DATE', 'END DATE', 'Currently working here', 'KEY RESPONSIBILTIES', 'ATTACH DOCOMENT'];
    const anyWorkEnabled = workFields.some(f => this.isFieldEnabled('Work Experience', f));
    if (anyWorkEnabled) {
      total++;
      if (this.workExperienceList.length > 0) done++;
    }

    // 6. Bank Details
    const bankFields = ['ACCOUNT HOLDER NAME', 'PAYMENT METHOD', 'ACCOUNT NUMBER', 'CONFIRM ACCOUNT NUMBER', 'BANK NAME', 'IBN/SWIFT CODE', 'BRANCH NAME', 'BRANCH CODE'];
    const anyBankEnabled = bankFields.some(f => this.isFieldEnabled('BANK DETAILS', f));
    if (anyBankEnabled) {
      total++;
      if (this.isBankDetailsCompleted()) done++;
    }

    // 7. Policies
    if (this.policies.length > 0) {
      total++;
      if (this.policyAccepted) done++;
    }

    this.reviewCompletionRate = total > 0 ? Math.round((done / total) * 100) : 100;
  }

  loadOrgOnboardingConfig(): void {
    this.settingsService.getOrgOnboardingConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          const configs: { [key: string]: { enabled: boolean; required: boolean } } = {};
          for (const item of items) {
            const key = `${item.section.toUpperCase()}:::${item.fieldKey.toUpperCase()}`;
            configs[key] = { enabled: item.enabled, required: item.required };
          }
          this.fieldConfigs = configs;
          this.calculateCompletionRate();
        },
        error: (err) => {
          console.error('Failed to load onboarding config:', err);
          this.calculateCompletionRate();
        }
      });
  }

  isFieldEnabled(section: string, fieldKey: string): boolean {
    const key = `${section.toUpperCase()}:::${fieldKey.toUpperCase()}`;
    const cfg = this.fieldConfigs[key];
    if (cfg !== undefined) {
      return cfg.enabled;
    }
    return true;
  }

  isFieldRequired(section: string, fieldKey: string): boolean {
    const key = `${section.toUpperCase()}:::${fieldKey.toUpperCase()}`;
    const cfg = this.fieldConfigs[key];
    if (cfg !== undefined) {
      return cfg.required;
    }

    const uKey = fieldKey.toUpperCase();
    const uSec = section.toUpperCase();

    if (uSec === 'PERSONAL INFORMATION') {
      const optional = ['JOB TITLE', 'RESUME/CV'];
      return !optional.includes(uKey);
    }
    if (uSec === 'QUALIFICATION DETAILS') {
      const required = ['DEGREE LEVEL', 'INSTITUTE NAME', 'FIELD OF STUDY'];
      return required.includes(uKey);
    }
    if (uSec === 'WORK EXPERIENCE') {
      const required = ['JOB TITTLE', 'COMPANY', 'EMPLOYMENT TYPE', 'SATRT DATE'];
      return required.includes(uKey);
    }
    if (uSec === 'BANK DETAILS') {
      const optional = ['IBN/SWIFT CODE', 'BRANCH NAME', 'BRANCH CODE', 'BANK & BRANCH'];
      return !optional.includes(uKey);
    }

    return false;
  }

  isSectionEnabled(sectionName: string): boolean {
    const prefix = `${sectionName.toUpperCase()}:::`;
    const keys = Object.keys(this.fieldConfigs).filter(k => k.startsWith(prefix));
    if (keys.length === 0) return true;
    return keys.some(k => this.fieldConfigs[k].enabled);
  }

  isStepEnabled(stepNum: number): boolean {
    if (stepNum === 1) return this.isSectionEnabled('Personal Information');
    if (stepNum === 2) return this.isSectionEnabled('Qualification Details');
    if (stepNum === 3) return this.isSectionEnabled('Work Experience');
    if (stepNum === 4) return this.isSectionEnabled('BANK DETAILS');
    return true;
  }

  getNextEnabledStep(currentStep: number): number {
    let next = currentStep + 1;
    while (next <= 6) {
      if (this.isStepEnabled(next)) {
        return next;
      }
      next++;
    }
    return 6;
  }

  getPreviousEnabledStep(currentStep: number): number {
    let prev = currentStep - 1;
    while (prev >= 1) {
      if (this.isStepEnabled(prev)) {
        return prev;
      }
      prev--;
    }
    return 1;
  }

  isEducationFormValid(): boolean {
    if (this.isFieldEnabled('Qualification Details', 'Degree Level') && this.isFieldRequired('Qualification Details', 'Degree Level') && !this.education.degree) return false;
    if (this.isFieldEnabled('Qualification Details', 'Institute Name') && this.isFieldRequired('Qualification Details', 'Institute Name') && !this.education.institution) return false;
    if (this.isFieldEnabled('Qualification Details', 'Field of Study') && this.isFieldRequired('Qualification Details', 'Field of Study') && !this.education.field) return false;
    if (this.isFieldEnabled('Qualification Details', 'GPA') && this.isFieldRequired('Qualification Details', 'GPA') && !this.education.gpa) return false;
    if (this.isFieldEnabled('Qualification Details', 'ATTACH DOCOMENT')) {
      if (this.isFieldRequired('Qualification Details', 'ATTACH DOCOMENT') && !this.education.fileName) return false;
      if (this.education.file && !this.education.fileUrl) return false;
    }
    if (this.isFieldEnabled('Qualification Details', 'Discription') && this.isFieldRequired('Qualification Details', 'Discription') && !this.education.description) return false;
    return true;
  }

  isWorkExperienceFormValid(): boolean {
    if (this.isFieldEnabled('Work Experience', 'JOB TITTLE') && this.isFieldRequired('Work Experience', 'JOB TITTLE') && !this.workExperience.jobTitle) return false;
    if (this.isFieldEnabled('Work Experience', 'COMPANY') && this.isFieldRequired('Work Experience', 'COMPANY') && !this.workExperience.company) return false;
    if (this.isFieldEnabled('Work Experience', 'EMPLOYMENT TYPE') && this.isFieldRequired('Work Experience', 'EMPLOYMENT TYPE') && !this.workExperience.employmentType) return false;
    if (this.isFieldEnabled('Work Experience', 'LOCATION') && this.isFieldRequired('Work Experience', 'LOCATION') && !this.workExperience.location) return false;
    if (this.isFieldEnabled('Work Experience', 'SATRT DATE') && this.isFieldRequired('Work Experience', 'SATRT DATE') && !this.workExperience.startDate) return false;
    if (this.isFieldEnabled('Work Experience', 'END DATE') && this.isFieldRequired('Work Experience', 'END DATE') && !this.workExperience.currentlyWorking && !this.workExperience.endDate) return false;
    if (this.isFieldEnabled('Work Experience', 'KEY RESPONSIBILTIES') && this.isFieldRequired('Work Experience', 'KEY RESPONSIBILTIES') && !this.workExperience.responsibilities) return false;
    if (this.isFieldEnabled('Work Experience', 'ATTACH DOCOMENT')) {
      if (this.isFieldRequired('Work Experience', 'ATTACH DOCOMENT') && !this.workExperience.fileName) return false;
      if (this.workExperience.file && !this.workExperience.fileUrl) return false;
    }
    return true;
  }

  private extractOnboardingId(response: any): string | null {
    const c = response?.data?.onboardingId
      ?? response?.data?.id
      ?? response?.onboardingId
      ?? response?.id
      ?? response?.data?.onboarding_id
      ?? response?.onboarding_id;
    return c ? String(c) : null;
  }

  private splitName(fullName: string): { firstName: string; lastName: string } {
    const parts = (fullName ?? '').trim().split(' ').filter(Boolean);
    return { firstName: parts.shift() || '', lastName: parts.join(' ') };
  }

  private blankEducation(): EducationFormEntry {
    return {
      degree: '', institution: '', field: '', gpa: '',
      file: null, fileName: '', fileUrl: null, description: '', _saved: false
    };
  }

  private blankWorkExperience(): WorkExperienceFormEntry {
    return {
      jobTitle: '', company: '', employmentType: '', location: '',
      startDate: '', endDate: '', currentlyWorking: false,
      responsibilities: '', file: null, fileName: '', fileUrl: null, _saved: false
    };
  }
}
