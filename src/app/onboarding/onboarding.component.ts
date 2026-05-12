import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { SettingsService, CompanyPolicy } from '@features/settings/services/settings.service';
import {
  OnboardingEducation,
  OnboardingRequest,
  OnboardingService,
  OnboardingWorkExperience
} from './services/onboarding.service';

// ─── Local interfaces ─────────────────────────────────────────────────────────

export interface ProfileForm {
  fullName:       string;
  jobTitle:       string;
  email:          string;
  phone:          string;
  department:     string;
  gender:         string;
  nationality:    string;
  idNumber:       string;
  photo:          File | null;
  resume:         File | null;
  resumeFileName: string;
}

export interface EducationFormEntry extends OnboardingEducation {
  educationId?: string;
  file:    File | null;
  _saved:  boolean;
}

export interface WorkExperienceFormEntry extends OnboardingWorkExperience {
  experienceId?: string;
  file:   File | null;
  _saved: boolean;
}

/** Bank Details form model — mirrors the screenshot fields exactly */
export interface BankDetailsForm {
  noBankAccount:      boolean;
  accountHolderName:  string;
  paymentMethod:      string;
  accountNumber:      string;
  confirmAccountNumber: string;
  bankName:           string;
  iban:               string;
  branchName:         string;
  branchCode:         string;
}

/** Inline validation errors for Bank Details */
export interface BankDetailsErrors {
  accountHolderName?:  string;
  paymentMethod?:      string;
  accountNumber?:      string;
  confirmAccountNumber?: string;
  bankName?:           string;
  iban?:               string;
}

@Component({
  selector:    'app-onboarding',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './onboarding.component.html',
  styleUrls:   ['./onboarding.component.scss']
})
export class Onboarding implements OnInit, OnDestroy {

  // ── State ─────────────────────────────────────────────────────────────────
  step         = 1;
  onboardingId: string | null = null;

  photoPreview:       string | null = null;
  hasSavedPhoto       = false;
  hasSavedResume      = false;
  isJobTitleReadOnly  = false;

  // ── Lists ─────────────────────────────────────────────────────────────────
  educationList:      EducationFormEntry[]    = [];
  workExperienceList: WorkExperienceFormEntry[] = [];
  policies:           CompanyPolicy[]           = [];

  // ── Edit tracking ─────────────────────────────────────────────────────────
  editingEducationIndex:  number | null = null;
  editingExperienceIndex: number | null = null;

  // ── UI flags ──────────────────────────────────────────────────────────────
  isSavingPersonalInfo   = false;
  isSavingEducation      = false;
  isSavingWorkExperience = false;
  isSavingBankDetails    = false;
  isSubmitting           = false;

  personalInfoError:   string | null = null;
  workExperienceError: string | null = null;
  bankDetailsError:    string | null = null;

  /** True once bank details have been saved to the API in this session */
  bankDetailsSaved = false;

  policyAccepted    = false;
  documentNotes     = '';
  reviewCompletionRate = 0;

  // ── Personal form ─────────────────────────────────────────────────────────
  form: ProfileForm = {
    fullName: '', jobTitle: '', email: '', phone: '',
    department: '', gender: '', nationality: '', idNumber: '',
    photo: null, resume: null, resumeFileName: ''
  };

  // ── Education form ────────────────────────────────────────────────────────
  education: EducationFormEntry = this.blankEducation();

  // ── Work experience form ──────────────────────────────────────────────────
  workExperience: WorkExperienceFormEntry = this.blankWorkExperience();

  // ── Bank details form ─────────────────────────────────────────────────────
  bankForm: BankDetailsForm = this.blankBankForm();
  bankErrors: BankDetailsErrors = {};

  // ── File validation ───────────────────────────────────────────────────────
  private readonly allowedWorkExpTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png'
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private authService:       AuthService,
    private router:            Router,
    private settingsService:   SettingsService,
    private onboardingService: OnboardingService
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadPublishedPolicies();
    this.loadExistingOnboardingData();
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
        next:  p => { this.policies = p.filter(x => x.isPublished); },
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
          if (!data) return;

          this.onboardingId = data.onboardingId ?? data.personalInfo?.onboardingId ?? null;

          if (data.personalInfo) {
            const p = data.personalInfo;
            this.form.fullName       = p.fullName       ?? '';
            this.form.jobTitle       = p.jobTitle       ?? '';
            this.form.email          = p.email          ?? '';
            this.form.phone          = p.phone          ?? '';
            this.form.department     = p.department     ?? '';
            this.form.gender         = p.gender         ?? '';
            this.form.nationality    = p.nationality    ?? '';
            this.form.idNumber       = p.idNumber       ?? '';
            this.form.resumeFileName = p.resumeFileName ?? '';
            this.hasSavedResume      = !!p.resumeFileName;
            this.hasSavedPhoto       = !!p.photoUrl;
            this.isJobTitleReadOnly  = !!p.jobTitle;
            if (p.photoUrl) this.photoPreview = p.photoUrl;
          }

          if (data.educationList?.length > 0) {
            this.educationList = data.educationList.map((e: any) => ({
              educationId: e.educationId ?? e.EducationId ?? undefined,
              degree: e.degree ?? '', institution: e.institution ?? '',
              field: e.field ?? '', gpa: e.gpa ?? '',
              fileName: e.fileName ?? '', description: e.description ?? '',
              file: null, _saved: true
            }));
          }

          if (data.workExperienceList?.length > 0) {
            this.workExperienceList = data.workExperienceList.map((e: any) => ({
              experienceId: e.experienceId ?? e.ExperienceId ?? undefined,
              jobTitle: e.jobTitle ?? '', company: e.company ?? '',
              employmentType: e.employmentType ?? '', location: e.location ?? '',
              startDate: e.startDate ?? '', endDate: e.endDate ?? '',
              currentlyWorking: e.currentlyWorking ?? false,
              responsibilities: e.responsibilities ?? '', fileName: e.fileName ?? '',
              file: null, _saved: true
            }));
          }

          // Pre-fill bank details if already saved
          if (data.bankDetails) {
            const b = data.bankDetails;
            this.bankForm = {
              noBankAccount:       b.noBankAccount       ?? false,
              accountHolderName:   b.accountHolderName   ?? '',
              paymentMethod:       b.paymentMethod       ?? '',
              accountNumber:       b.accountNumber       ?? '',
              confirmAccountNumber: b.accountNumber      ?? '',
              bankName:            b.bankName            ?? '',
              iban:                b.iban                ?? '',
              branchName:          b.branchName          ?? '',
              branchCode:          b.branchCode          ?? ''
            };
            this.bankDetailsSaved = true;
          }

          this.documentNotes  = data.documentNotes    ?? '';
          this.policyAccepted = data.isPolicyAccepted ?? false;

          this.calculateCompletionRate();

          if (typeof data.currentStep === 'number' && data.currentStep > 1) {
            this.step = Math.min(data.currentStep, 6);
          } else if (this.workExperienceList.length > 0) {
            this.step = 4;
          } else if (this.educationList.length > 0) {
            this.step = 3;
          } else if (this.form.fullName) {
            this.step = 2;
          }
        },
        error: err => console.warn('No existing onboarding data:', err)
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
  }

  triggerFileInput(): void {
    (document.querySelector('input[type="file"]') as HTMLInputElement)?.click();
  }

  onResumeSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.form.resume         = file;
    this.form.resumeFileName = file.name;
  }

  onSubmit(): void {
    if (!this.isPersonalCompleted()) {
      this.personalInfoError = 'Please fill in all required fields.';
      return;
    }
    this.isSavingPersonalInfo = true;
    this.personalInfoError    = null;

    this.onboardingService.savePersonalInfo(
      this.form.fullName, this.form.jobTitle, this.form.email,
      this.form.phone, this.form.department, this.form.gender,
      this.form.nationality, this.form.idNumber,
      this.form.photo, this.form.resume
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.isSavingPersonalInfo = false;
        this.onboardingId         = this.extractOnboardingId(response);
        this.calculateCompletionRate();
        this.step = 2;
      },
      error: err => {
        this.isSavingPersonalInfo = false;
        this.personalInfoError    = err?.error?.message || err?.message
          || 'Failed to save personal information. Please try again.';
      }
    });
  }

  // ── Step 2 – Education ────────────────────────────────────────────────────

  onEducationFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.education.file     = file;
    this.education.fileName = file.name;
  }

  addEducation(): void {
    if (!this.education.degree || !this.education.institution || !this.education.field) return;
    if (!this.onboardingId) { alert('Please save personal information first.'); return; }

    this.isSavingEducation = true;
    this.onboardingService.addEducation(
      { degree: this.education.degree, institution: this.education.institution,
        field: this.education.field, gpa: this.education.gpa,
        fileName: this.education.fileName, description: this.education.description },
      this.education.file, this.onboardingId
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.isSavingEducation = false;
        this.educationList.push({
          ...this.education,
          educationId: response?.data?.educationId ?? undefined,
          _saved: true
        });
        this.resetEducationForm();
        this.calculateCompletionRate();
      },
      error: () => {
        this.isSavingEducation = false;
        alert('Unable to save education. Please try again.');
      }
    });
  }

  editEducation(index: number): void {
    this.editingEducationIndex = index;
    this.education = { ...this.educationList[index] };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateEducation(): void {
    if (!this.education.degree || !this.education.institution || !this.education.field
        || this.editingEducationIndex === null) return;
    this.educationList[this.editingEducationIndex] = { ...this.education };
    this.editingEducationIndex = null;
    this.resetEducationForm();
  }

  cancelEducationEdit(): void {
    this.editingEducationIndex = null;
    this.resetEducationForm();
  }

  removeEducation(index: number): void {
    if (!confirm('Delete this education entry?')) return;
    this.educationList.splice(index, 1);
    this.calculateCompletionRate();
  }

  resetEducationForm(): void { this.education = this.blankEducation(); }

  continueToWorkExperience(): void { this.step = 3; }

  // ── Step 3 – Work Experience ──────────────────────────────────────────────

  onWorkExperienceFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    this.workExperienceError = null;
    if (!file) { this.workExperience.file = null; this.workExperience.fileName = ''; return; }
    if (!this.allowedWorkExpTypes.includes(file.type)) {
      this.workExperienceError = 'Unsupported file type. Use PDF, DOC, DOCX, JPG, or PNG.';
      input.value = ''; return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.workExperienceError = 'File too large. Maximum 10 MB allowed.';
      input.value = ''; return;
    }
    this.workExperience.file     = file;
    this.workExperience.fileName = file.name;
  }

  addWorkExperience(): void {
    this.workExperienceError = null;
    if (!this.workExperience.jobTitle || !this.workExperience.company
        || !this.workExperience.employmentType || !this.workExperience.startDate) {
      this.workExperienceError = 'Job title, company, employment type, and start date are required.';
      return;
    }
    if (!this.onboardingId) { alert('Please save personal information first.'); return; }

    this.isSavingWorkExperience = true;
    this.onboardingService.addWorkExperience(
      { jobTitle: this.workExperience.jobTitle, company: this.workExperience.company,
        employmentType: this.workExperience.employmentType, location: this.workExperience.location,
        startDate: this.workExperience.startDate, endDate: this.workExperience.endDate,
        currentlyWorking: this.workExperience.currentlyWorking,
        responsibilities: this.workExperience.responsibilities, fileName: this.workExperience.fileName },
      this.workExperience.file, this.onboardingId
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.isSavingWorkExperience = false;
        this.workExperienceList.push({
          ...this.workExperience,
          experienceId: response?.data?.experienceId ?? undefined,
          _saved: true
        });
        this.resetWorkExperienceForm();
        this.calculateCompletionRate();
      },
      error: err => {
        this.isSavingWorkExperience = false;
        this.workExperienceError    = err?.error?.message || err?.message
          || 'Unable to save work experience. Please try again.';
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
    if (!confirm('Delete this work experience entry?')) return;
    this.workExperienceList.splice(index, 1);
    this.calculateCompletionRate();
  }

  resetWorkExperienceForm(): void {
    this.workExperience      = this.blankWorkExperience();
    this.workExperienceError = null;
  }

  continueFromWorkExperience(): void {
    this.calculateCompletionRate();
    this.step = 4;   // → Bank Details
  }

  // ── Step 4 – Bank Details ─────────────────────────────────────────────────

  /** Called when "I don't have a bank account" toggle is flipped */
  onNoBankAccountToggle(): void {
    if (this.bankForm.noBankAccount) {
      // Clear all bank fields and errors when toggling on
      this.bankForm = { ...this.blankBankForm(), noBankAccount: true };
      this.bankErrors = {};
      this.bankDetailsError = null;
    }
  }

  /** Clear a single field's inline error on user input */
  clearBankError(field: keyof BankDetailsErrors): void {
    this.bankErrors[field] = undefined;
  }

  /**
   * Validate bank form.
   * Returns true if valid; populates bankErrors and returns false if not.
   */
  private validateBankForm(): boolean {
    this.bankErrors = {};

    if (this.bankForm.noBankAccount) return true;   // No validation needed

    if (!this.bankForm.accountHolderName?.trim()) {
      this.bankErrors.accountHolderName = 'Account holder name is required.';
    }

    if (!this.bankForm.paymentMethod) {
      this.bankErrors.paymentMethod = 'Payment method is required.';
    }

    if (!this.bankForm.accountNumber?.trim()) {
      this.bankErrors.accountNumber = 'Account number is required.';
    } else if (!/^\d{8,}$/.test(this.bankForm.accountNumber.trim())) {
      this.bankErrors.accountNumber = 'Account number must be at least 8 digits (numbers only).';
    }

    if (!this.bankForm.confirmAccountNumber?.trim()) {
      this.bankErrors.confirmAccountNumber = 'Please confirm your account number.';
    } else if (this.bankForm.accountNumber !== this.bankForm.confirmAccountNumber) {
      this.bankErrors.confirmAccountNumber = 'Account numbers do not match.';
    }

    if (!this.bankForm.bankName) {
      this.bankErrors.bankName = 'Please select a bank.';
    }

    // IBAN optional — validate format if provided
    if (this.bankForm.iban?.trim()) {
      const ibanClean = this.bankForm.iban.trim().toUpperCase().replace(/\s/g, '');
      if (!/^[A-Z]{2}[A-Z0-9]{2,34}$/.test(ibanClean)) {
        this.bankErrors.iban = 'Invalid IBAN format. Should start with a 2-letter country code (e.g. GB29NWBK…).';
      }
    }

    return Object.keys(this.bankErrors).length === 0;
  }

  /**
   * Save bank details to the API.
   * On success, sets bankDetailsSaved = true so the Continue button unlocks.
   */
  saveBankDetails(): void {
    this.bankDetailsError = null;

    if (!this.validateBankForm()) {
      this.bankDetailsError = 'Please fix the errors above before saving.';
      return;
    }

    if (!this.onboardingId) {
      this.bankDetailsError = 'Onboarding session not found. Please complete Step 1 first.';
      return;
    }

    this.isSavingBankDetails = true;

    const payload = {
      onboardingId:       this.onboardingId,
      noBankAccount:      this.bankForm.noBankAccount,
      accountHolderName:  this.bankForm.noBankAccount ? null : this.bankForm.accountHolderName.trim(),
      accountNumber:      this.bankForm.noBankAccount ? null : this.bankForm.accountNumber.trim(),
      bankName:           this.bankForm.noBankAccount ? null : this.bankForm.bankName,
      paymentMethod:      this.bankForm.noBankAccount ? null : this.bankForm.paymentMethod,
      iban:               this.bankForm.noBankAccount ? null : (this.bankForm.iban?.trim() || null),
      branchName:         this.bankForm.noBankAccount ? null : (this.bankForm.branchName?.trim() || null),
      branchCode:         this.bankForm.noBankAccount ? null : (this.bankForm.branchCode?.trim() || null)
    };

    this.onboardingService.saveBankDetails(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSavingBankDetails = false;
          this.bankDetailsSaved    = true;
          this.bankDetailsError    = null;
          this.calculateCompletionRate();
        },
        error: err => {
          this.isSavingBankDetails = false;
          this.bankDetailsError    = err?.error?.message || err?.message
            || 'Failed to save bank details. Please try again.';
        }
      });
  }

  continueFromBankDetails(): void {
    if (!this.bankDetailsSaved && !this.bankForm.noBankAccount) return;
    this.calculateCompletionRate();
    this.step = 5;   // → Verification Hub
  }

  // ── Step 5 – Verification ─────────────────────────────────────────────────

  editPersonalFromVerification(): void { this.step = 1; window.scrollTo({ top: 0, behavior: 'smooth' }); }
  editEducationFromVerification(index: number): void { this.editEducation(index); this.step = 2; }
  deleteEducationFromVerification(index: number): void { this.removeEducation(index); }
  editExperienceFromVerification(index: number): void { this.editWorkExperience(index); this.step = 3; }
  deleteExperienceFromVerification(index: number): void { this.removeWorkExperience(index); }

  proceedFromVerification(): void {
    this.calculateCompletionRate();
    this.step = 6;   // → Company Policies
  }

  // ── Step 6 – Policies → Final submit ─────────────────────────────────────

  /**
   * Final submit. Module Access step has been removed —
   * onboarding completes directly after policy acceptance.
   */
  finishOnboarding(): void {
    if (!this.policyAccepted && this.policies.length > 0) return;

    this.isSubmitting = true;
    this.calculateCompletionRate();

    const { firstName, lastName } = this.splitName(this.form.fullName);
    const request = {
      firstName, lastName,
      email:          this.form.email,
      phone:          this.form.phone,
      jobTitle:       this.form.jobTitle,
      department:     this.form.department,
      gender:         this.form.gender,
      nationality:    this.form.nationality,
      idNumber:       this.form.idNumber,
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
      selectedModuleIds: [],   // Module Access removed
      policyAccepted:    this.policyAccepted,
      documentNotes:     this.documentNotes
    };

    this.onboardingService.submitOnboarding(request as any, this.form.photo, this.form.resume)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          const isEmployee    = this.authService.hasRole?.('Employee');
          const redirectRoute = isEmployee ? '/employee/dashboard' : '/dashboard';
          this.router.navigate([redirectRoute]);
        },
        error: err => {
          this.isSubmitting = false;
          console.error('Onboarding submit error:', err);
          alert('Unable to submit onboarding. Please try again.');
        }
      });
  }

  // ── Completion helpers ────────────────────────────────────────────────────

  isPersonalCompleted(): boolean {
    const f = this.form;
    return !!(f.fullName && f.email && f.phone && f.department
      && f.gender && f.nationality && f.idNumber
      && (f.photo || this.hasSavedPhoto));
  }

  isEducationCompleted(): boolean      { return this.educationList.length > 0; }
  isWorkExperienceCompleted(): boolean { return this.workExperienceList.length > 0; }
  isResumeUploaded(): boolean          { return !!(this.form.resume || this.hasSavedResume); }

  /** Bank details complete = saved OR employee has no bank account */
  isBankDetailsCompleted(): boolean    { return this.bankDetailsSaved || this.bankForm.noBankAccount; }

  calculateCompletionRate(): void {
    let done = 0;
    const total = 8;
    if (this.form.fullName && this.form.email && this.form.phone
        && this.form.department && this.form.gender
        && this.form.nationality && this.form.idNumber) done++;
    if (this.form.photo    || this.hasSavedPhoto)  done++;
    if (this.form.resume   || this.hasSavedResume) done++;
    if (this.educationList.length > 0)      done++;
    if (this.workExperienceList.length > 0) done++;
    if (this.isBankDetailsCompleted())      done++;
    if (this.educationList.length > 0 || this.workExperienceList.length > 0
        || this.form.resume || this.hasSavedResume) done++;
    if (this.policyAccepted) done++;
    this.reviewCompletionRate = Math.round((done / total) * 100);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private extractOnboardingId(response: any): string | null {
    const c = response?.data?.onboardingId ?? response?.data?.id
      ?? response?.onboardingId ?? response?.id
      ?? response?.data?.onboarding_id ?? response?.onboarding_id;
    return c ? String(c) : null;
  }

  private splitName(fullName: string): { firstName: string; lastName: string } {
    const parts = (fullName ?? '').trim().split(' ').filter(Boolean);
    return { firstName: parts.shift() || '', lastName: parts.join(' ') };
  }

  private blankEducation(): EducationFormEntry {
    return {
      degree: '', institution: '', field: '', gpa: '',
      file: null, fileName: '', description: '', _saved: false
    };
  }

  private blankWorkExperience(): WorkExperienceFormEntry {
    return {
      jobTitle: '', company: '', employmentType: '', location: '',
      startDate: '', endDate: '', currentlyWorking: false,
      responsibilities: '', file: null, fileName: '', _saved: false
    };
  }

  private blankBankForm(): BankDetailsForm {
    return {
      noBankAccount: false, accountHolderName: '', paymentMethod: '',
      accountNumber: '', confirmAccountNumber: '',
      bankName: '', iban: '', branchName: '', branchCode: ''
    };
  }
}