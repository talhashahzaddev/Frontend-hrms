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
  OnboardingWorkExperience,
  SaveBankDetailsRequest
} from './services/onboarding.service';

import { SharedCommonModule } from '@shared/shared-common.module';
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
}

export interface EducationFormEntry extends OnboardingEducation {
  educationId?: string;
  file: File | null;
  _saved: boolean;
}

export interface WorkExperienceFormEntry extends OnboardingWorkExperience {
  experienceId?: string;
  file: File | null;
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
  bankDetailsId?:       string;
  noBankAccount:        boolean;
  accountHolderName:    string;
  accountNumber:        string;
  confirmAccountNumber: string;
  paymentMethod:        string;
  bankName:             string;
  iban:                 string;
  branchName:           string;
  branchCode:           string;
}

export interface BankErrors {
  accountHolderName?:    string;
  accountNumber?:        string;
  confirmAccountNumber?: string;
  paymentMethod?:        string;
  bankName?:             string;
  iban?:                 string;
}


@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, FormsModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss']
})
export class Onboarding implements OnInit, OnDestroy {

  // ── State ─────────────────────────────────────────────────────────────────
  step = 1;
  onboardingId: string | null = null;

  photoPreview: string | null = null;
  hasSavedPhoto  = false;
  hasSavedResume = false;

  // ── Lists ─────────────────────────────────────────────────────────────────
  educationList:      EducationFormEntry[]      = [];
  workExperienceList: WorkExperienceFormEntry[]  = [];
  permissionModules:  PermissionModule[]         = [];
  policies:           CompanyPolicy[]            = [];

  // ── Edit tracking ──────────────────────────────────────────────────────────
  editingEducationIndex:  number | null = null;
  editingExperienceIndex: number | null = null;

  // ── UI flags ──────────────────────────────────────────────────────────────
  isSavingPersonalInfo    = false;
  isSavingEducation       = false;
  isSavingWorkExperience  = false;
  isSavingBankDetails     = false;
  isLoadingBankDetails    = false;
  isDeletingBankDetails   = false;
  bankDetailsSaved        = false;
  isSubmitting            = false;

  personalInfoError:   string | null = null;
  workExperienceError: string | null = null;
  bankDetailsError:    string | null = null;

  policyAccepted      = false;
  documentNotes       = '';
  reviewCompletionRate = 0;

  // ── Forms ─────────────────────────────────────────────────────────────────
  form: ProfileForm = {
    fullName: '', jobTitle: '', email: '', phone: '',
    department: '', gender: '', nationality: '', idNumber: '',
    photo: null, resume: null, resumeFileName: ''
  };

  education:      EducationFormEntry      = this.blankEducation();
  workExperience: WorkExperienceFormEntry = this.blankWorkExperience();

  bankForm: BankForm = {
    bankDetailsId:        undefined,
    noBankAccount:        false,
    accountHolderName:    '',
    accountNumber:        '',
    confirmAccountNumber: '',
    paymentMethod:        '',
    bankName:             '',
    iban:                 '',
    branchName:           '',
    branchCode:           ''
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
    private onboardingService: OnboardingService
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.initializePermissionModules();
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
        next:  policies => { this.policies = policies.filter(p => p.isPublished); },
        error: ()       => { this.policies = []; }
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
            if (p.photoUrl) this.photoPreview = p.photoUrl;
          }

          // ── Education list ────────────────────────────────────────────────
          if (data.educationList?.length > 0) {
            this.educationList = data.educationList.map((e: any) => ({
              educationId:  e.educationId  ?? e.EducationId ?? undefined,
              degree:       e.degree       ?? '',
              institution:  e.institution  ?? '',
              field:        e.field        ?? '',
              gpa:          e.gpa          ?? '',
              fileName:     e.fileName     ?? '',
              description:  e.description  ?? '',
              file: null,
              _saved: true
            }));
          }

          // ── Work experience list ──────────────────────────────────────────
          if (data.workExperienceList?.length > 0) {
            this.workExperienceList = data.workExperienceList.map((e: any) => ({
              experienceId:     e.experienceId     ?? e.ExperienceId ?? undefined,
              jobTitle:         e.jobTitle         ?? '',
              company:          e.company          ?? '',
              employmentType:   e.employmentType   ?? '',
              location:         e.location         ?? '',
              startDate:        e.startDate        ?? '',
              endDate:          e.endDate          ?? '',
              currentlyWorking: e.currentlyWorking ?? false,
              responsibilities: e.responsibilities ?? '',
              fileName:         e.fileName         ?? '',
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

          this.documentNotes  = data.documentNotes   ?? '';
          this.policyAccepted = data.isPolicyAccepted ?? false;

          this.calculateCompletionRate();

          // Navigate to furthest step
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
        this.onboardingId = this.extractOnboardingId(response);
        this.calculateCompletionRate();
        this.step = 2;
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
    this.education.file     = file;
    this.education.fileName = file.name;
  }

  addEducation(): void {
    if (!this.education.degree || !this.education.institution || !this.education.field) return;
    if (!this.onboardingId) { alert('Please save personal information first.'); return; }

    this.isSavingEducation = true;
    this.onboardingService.addEducation(
      {
        degree:      this.education.degree,
        institution: this.education.institution,
        field:       this.education.field,
        gpa:         this.education.gpa,
        fileName:    this.education.fileName,
        description: this.education.description
      },
      this.education.file,
      this.onboardingId
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

    if (!file) {
      this.workExperience.file     = null;
      this.workExperience.fileName = '';
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
      {
        jobTitle:         this.workExperience.jobTitle,
        company:          this.workExperience.company,
        employmentType:   this.workExperience.employmentType,
        location:         this.workExperience.location,
        startDate:        this.workExperience.startDate,
        endDate:          this.workExperience.endDate,
        currentlyWorking: this.workExperience.currentlyWorking,
        responsibilities: this.workExperience.responsibilities,
        fileName:         this.workExperience.fileName
      },
      this.workExperience.file,
      this.onboardingId
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
        this.workExperienceError = err?.error?.message || err?.message
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
    this.step = 4;
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
    this.bankForm.bankDetailsId       = String(b.bankDetailsId ?? b.BankDetailsId ?? '') || undefined;
    this.bankForm.noBankAccount       = b.noBankAccount ?? b.NoBankAccount ?? false;
    this.bankForm.accountHolderName   = b.accountHolderName ?? b.AccountHolderName ?? '';
    this.bankForm.accountNumber       = accountNumber;
    this.bankForm.confirmAccountNumber = accountNumber;
    this.bankForm.paymentMethod       = b.paymentMethod ?? b.PaymentMethod ?? '';
    this.bankForm.bankName            = b.bankName ?? b.BankName ?? '';
    this.bankForm.iban                = b.iban ?? b.Iban ?? '';
    this.bankForm.branchName          = b.branchName ?? b.BranchName ?? '';
    this.bankForm.branchCode          = b.branchCode ?? b.BranchCode ?? '';
    this.bankDetailsSaved             = true;
    this.calculateCompletionRate();
  }

  private buildBankDetailsRequest(): SaveBankDetailsRequest {
    return {
      onboardingId:      this.onboardingId!,
      bankDetailsId:     this.bankForm.bankDetailsId,
      noBankAccount:     this.bankForm.noBankAccount,
      accountHolderName: this.bankForm.noBankAccount ? null : this.bankForm.accountHolderName,
      accountNumber:     this.bankForm.noBankAccount ? null : this.bankForm.accountNumber,
      bankName:          this.bankForm.noBankAccount ? null : this.bankForm.bankName,
      paymentMethod:     this.bankForm.noBankAccount ? null : this.bankForm.paymentMethod,
      iban:              this.bankForm.noBankAccount ? null : (this.bankForm.iban || null),
      branchName:        this.bankForm.noBankAccount ? null : (this.bankForm.branchName || null),
      branchCode:        this.bankForm.noBankAccount ? null : (this.bankForm.branchCode || null)
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

    if (!this.bankForm.accountHolderName?.trim())
      this.bankErrors.accountHolderName = 'Account holder name is required.';
    if (!this.bankForm.paymentMethod)
      this.bankErrors.paymentMethod = 'Payment method is required.';
    if (!this.bankForm.accountNumber?.trim())
      this.bankErrors.accountNumber = 'Account number is required.';
    if (!this.bankForm.confirmAccountNumber?.trim()) {
      this.bankErrors.confirmAccountNumber = 'Please confirm the account number.';
    } else if (this.bankForm.accountNumber !== this.bankForm.confirmAccountNumber) {
      this.bankErrors.confirmAccountNumber = 'Account numbers do not match.';
    }
    if (!this.bankForm.bankName)
      this.bankErrors.bankName = 'Bank name is required.';

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
    if (!confirm('Are you sure you want to remove your bank details?')) return;

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

    if (!this.bankForm.bankDetailsId) {
      resetLocal();
      return;
    }

    this.isDeletingBankDetails = true;
    this.bankDetailsError = null;
    this.onboardingService.deleteBankDetails(this.bankForm.bankDetailsId)
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
  }

  continueFromBankDetails(): void {
    this.calculateCompletionRate();
    this.step = 5;
  }

  isBankDetailsCompleted(): boolean {
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
    this.step = 6;
  }

  // ── Step 6 – Policies / Submit ────────────────────────────────────────────

  finishOnboarding(): void {
    if (!this.policyAccepted && this.policies.length > 0) return;
    this.isSubmitting = true;
    this.calculateCompletionRate();

    const isEmployee    = this.authService.hasRole?.('Employee');
    const redirectRoute = isEmployee ? '/employee/dashboard' : '/dashboard';
    this.submitOnboarding(redirectRoute);
  }

  private submitOnboarding(redirectRoute: string): void {
    const request = this.buildOnboardingRequest();

    this.onboardingService.submitOnboarding(request, this.form.photo, this.form.resume)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate([redirectRoute]);
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
      email:       this.form.email,
      phone:       this.form.phone,
      jobTitle:    this.form.jobTitle,
      department:  this.form.department,
      gender:      this.form.gender,
      nationality: this.form.nationality,
      idNumber:    this.form.idNumber,
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
      policyAccepted:    this.policyAccepted,
      documentNotes:     this.documentNotes
    };
  }

  // ── Permissions ───────────────────────────────────────────────────────────

  initializePermissionModules(): void {
    const savedSelected: string[] = JSON.parse(
      localStorage.getItem('userSelectedModules') || '[]'
    );
    const perms   = this.authService.getUserPermissionsValue();
    const allowed = new Set<string>();
    perms?.menus?.forEach((menu: any) => {
      if (menu.subMenus?.some((s: any) => s.actions?.some((a: any) => a.hasPermission))) {
        allowed.add(menu.menuName.toLowerCase());
      }
    });

    this.permissionModules = [
      { id: 'dashboard',   label: 'Dashboard',   description: 'Overall business health and key metrics',           route: '/dashboard',            allowed: true,                                                        selected: false },
      { id: 'attendance',  label: 'Attendance',  description: 'Track employee check-ins, shifts, and attendance',  route: '/attendance/dashboard', allowed: allowed.has('attendance'),                                   selected: false },
      { id: 'leave',       label: 'Leave',       description: 'Manage leaves, requests, and balances',             route: '/leave/dashboard',      allowed: allowed.has('leave management') || allowed.has('leave'),     selected: false },
      { id: 'payroll',     label: 'Payroll',     description: 'Salary processing, payslips and payroll rules',     route: '/payroll/periods',      allowed: allowed.has('payroll'),                                      selected: false },
      { id: 'assets',      label: 'Assets',      description: 'Hardware / asset allocation and tracking',          route: '/assets/create',        allowed: allowed.has('assets management') || allowed.has('assets'),   selected: false },
      { id: 'performance', label: 'Performance', description: 'Performance reviews and goals',                     route: '/performance/dashboard', allowed: allowed.has('performance'),                                 selected: false }
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
    return !!(f.fullName && f.email && f.phone && f.department
      && f.gender && f.nationality && f.idNumber
      && (f.photo || this.hasSavedPhoto));
  }

  isEducationCompleted(): boolean      { return this.educationList.length > 0; }
  isWorkExperienceCompleted(): boolean { return this.workExperienceList.length > 0; }
  isResumeUploaded(): boolean          { return !!(this.form.resume || this.hasSavedResume); }

  calculateCompletionRate(): void {
    let done = 0;
    const total = 7;
    if (this.form.fullName && this.form.email && this.form.phone
      && this.form.department && this.form.gender
      && this.form.nationality && this.form.idNumber) done++;
    if (this.form.photo || this.hasSavedPhoto)           done++;
    if (this.form.resume || this.hasSavedResume)          done++;
    if (this.educationList.length > 0)                    done++;
    if (this.workExperienceList.length > 0)               done++;
    if (this.educationList.length > 0 || this.workExperienceList.length > 0
      || this.form.resume || this.hasSavedResume)         done++;
    if (this.policyAccepted)                              done++;
    this.reviewCompletionRate = Math.round((done / total) * 100);
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
}
