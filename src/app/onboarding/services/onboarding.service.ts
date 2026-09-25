import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface FieldConfig {
  enabled: boolean;
  required: boolean;
}

export interface OnboardingFieldConfig {
  organizationId: string;
  sections: {
    personalInformation: Record<string, FieldConfig>;
    educationDetails: Record<string, FieldConfig>;
    workExperience: Record<string, FieldConfig>;
  };
}

export interface OnboardingEducation {
  degree: string;
  institution: string;
  field: string;
  gpa: string;
  fileName: string;
  description: string;
}

export interface OnboardingWorkExperience {
  jobTitle: string;
  company: string;
  employmentType: string;
  location: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  responsibilities: string;
  fileName: string;
}

export interface OnboardingRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  gender: string;
  nationality: string;
  idNumber: string;
  resumeFileName: string;
  education: OnboardingEducation[];
  workExperience: OnboardingWorkExperience[];
  selectedModuleIds: string[];
  policyAccepted: boolean;
  documentNotes: string;
}

export interface OnboardingStatusResponse {
  onboardingId: string;
  employeeId: string;
  currentStep: number;
  status: string;
  isPolicyAccepted: boolean;
  completionRate: number;
  documentNotes?: string;
  personalInfo?: {
    onboardingId: string;
    employeeId: string;
    fullName: string;
    jobTitle: string;
    email: string;
    phone: string;
    department: string;
    gender: string;
    nationality: string;
    idNumber: string;
    photoUrl?: string;
    resumeUrl?: string;
    resumeFileName?: string;
    currentStep: number;
  };
  educationList: any[];
  workExperienceList: any[];
  bankDetails?: {
    bankDetailsId: string;
    noBankAccount: boolean;
    accountHolderName?: string;
    accountNumber?: string;
    bankName?: string;
    paymentMethod?: string;
    iban?: string;
    branchName?: string;
    branchCode?: string;
  };
}

export interface SaveBankDetailsRequest {
  onboardingId: string;
  bankDetailsId?: string;
  noBankAccount: boolean;
  accountHolderName?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  paymentMethod?: string | null;
  iban?: string | null;
  branchName?: string | null;
  branchCode?: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class OnboardingService {

  private readonly apiUrl = environment.apiUrl;
  private readonly uploadsUrl = `${environment.apiUrl}/uploads`;

  constructor(private http: HttpClient) { }

  // ── File Upload ───────────────────────────────────────────────────────────

  /** Upload a file to the uploads API and return the hosted URL. */
  uploadFile(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.uploadsUrl}/files`, formData).pipe(
      map((res) => {
        if (!res?.url) throw new Error('Upload failed');
        return res.url;
      })
    );
  }

  // ── Personal Info ─────────────────────────────────────────────────────────

  savePersonalInfo(
    fullName: string,
    jobTitle: string,
    email: string,
    phone: string,
    department: string,
    gender: string,
    nationality: string,
    idNumber: string,
    photoUrl?: string | null,
    resumeUrl?: string | null,
    resumeFileName?: string | null
  ): Observable<any> {
    const body: Record<string, any> = {
      fullName, jobTitle, email, phone, department, gender, nationality, idNumber
    };
    if (photoUrl) body['photoUrl'] = photoUrl;
    if (resumeUrl) body['resumeUrl'] = resumeUrl;
    if (resumeFileName) body['resumeFileName'] = resumeFileName;

    return this.http.put<any>(`${this.apiUrl}/onboarding/personal-info`, body).pipe(
      map(response => {
        if (!response?.success) throw new Error(response?.message || 'Failed to save personal information');
        return response;
      }),
      catchError(error => {
        console.error('Personal info save error:', error);
        return throwError(() => error);
      })
    );
  }

  // ── Status ────────────────────────────────────────────────────────────────

  getMyStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/onboarding/my-status`).pipe(
      catchError(error => {
        if (error.status === 404) return of(null);
        return throwError(() => error);
      })
    );
  }

  // ── Education ─────────────────────────────────────────────────────────────

  addEducation(
    education: OnboardingEducation,
    fileUrl?: string | null,
    onboardingId?: string | null
  ): Observable<any> {
    const requestBody: Record<string, any> = {
      degree: education.degree,
      institution: education.institution,
      field: education.field,
      gpa: education.gpa || '',
      fileName: education.fileName || '',
      description: education.description || '',
      onboardingId: onboardingId || undefined,
      onboarding_id: onboardingId || undefined
    };
    if (fileUrl) requestBody['fileUrl'] = fileUrl;

    return this.http.post<any>(`${this.apiUrl}/onboarding/education`, requestBody).pipe(
      map(response => {
        if (!response?.success) throw new Error(response?.message || 'Failed to save education detail');
        return response;
      }),
      catchError(error => { console.error('Education save error:', error); return throwError(() => error); })
    );
  }

  deleteEducation(educationId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/onboarding/education/${educationId}`).pipe(
      map(response => {
        if (response?.success === false) {
          throw new Error(response?.message || 'Failed to delete education record');
        }
        return response;
      }),
      catchError(error => {
        console.error('Education delete error:', error);
        return throwError(() => error);
      })
    );
  }

  // ── Work Experience ───────────────────────────────────────────────────────

  addWorkExperience(
    workExperience: OnboardingWorkExperience,
    fileUrl?: string | null,
    onboardingId?: string | null
  ): Observable<any> {
    const requestBody: Record<string, any> = {
      jobTitle: workExperience.jobTitle,
      company: workExperience.company,
      employmentType: workExperience.employmentType,
      location: workExperience.location || '',
      startDate: workExperience.startDate,
      endDate: workExperience.endDate || '',
      currentlyWorking: workExperience.currentlyWorking,
      responsibilities: workExperience.responsibilities || '',
      fileName: workExperience.fileName || '',
      onboardingId: onboardingId || undefined,
      onboarding_id: onboardingId || undefined
    };
    if (fileUrl) requestBody['fileUrl'] = fileUrl;

    return this.http.post<any>(`${this.apiUrl}/onboarding/work-experience`, requestBody).pipe(
      map(response => {
        if (!response?.success) throw new Error(response?.message || 'Failed to save work experience detail');
        return response;
      }),
      catchError(error => { console.error('Work experience save error:', error); return throwError(() => error); })
    );
  }

  deleteWorkExperience(experienceId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/onboarding/work-experience/${experienceId}`).pipe(
      map(response => {
        if (response?.success === false) {
          throw new Error(response?.message || 'Failed to delete work experience record');
        }
        return response;
      }),
      catchError(error => {
        console.error('Work experience delete error:', error);
        return throwError(() => error);
      })
    );
  }

  // ── Bank Details ──────────────────────────────────────────────────────────

  saveBankDetails(request: SaveBankDetailsRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/onboarding/bank-details`, request).pipe(
      map(response => {
        if (response?.success === false) {
          throw new Error(response?.message || 'Failed to save bank details');
        }
        return response;
      }),
      catchError(error => {
        console.error('Bank details save error:', error);
        return throwError(() => error);
      })
    );
  }

  updateBankDetails(request: SaveBankDetailsRequest): Observable<any> {
    // Backend currently exposes POST for /onboarding/bank-details for save/update.
    return this.saveBankDetails(request).pipe(
      map(response => {
        if (response?.success === false) {
          throw new Error(response?.message || 'Failed to update bank details');
        }
        return response;
      }),
      catchError(error => {
        console.error('Bank details update error:', error);
        return throwError(() => error);
      })
    );
  }

  deleteBankDetails(bankDetailsId?: string | null): Observable<any> {
    if (!bankDetailsId) {
      return throwError(() => new Error('Bank details id is required to delete bank details'));
    }

    const url = `${this.apiUrl}/onboarding/bank-details/${bankDetailsId}`;
    return this.http.delete<any>(url).pipe(
      map(response => {
        if (response?.success === false) {
          throw new Error(response?.message || 'Failed to delete bank details');
        }
        return response;
      }),
      catchError(error => {
        console.error('Bank details delete error:', error);
        return throwError(() => error);
      })
    );
  }

  getBankDetails(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/onboarding/bank-details`).pipe(
      map(response => {
        if (response?.success === false) return null;
        return response;
      }),
      catchError(error => {
        if (error.status === 404) return of(null);
        console.error('Bank details fetch error:', error);
        return throwError(() => error);
      })
    );
  }

  // ── Config ────────────────────────────────────────────────────────────────

  getOnboardingConfig(orgId?: string): Observable<OnboardingFieldConfig> {
    const url = orgId
      ? `${this.apiUrl}/onboarding-config/org/${orgId}`
      : `${this.apiUrl}/onboarding-config`;
    return this.http.get<any>(url).pipe(
      map(res => res.data),
      catchError(err => { console.error('Failed to fetch onboarding config:', err); return throwError(() => err); })
    );
  }

  saveOnboardingConfig(orgId: string, config: OnboardingFieldConfig['sections']): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/onboarding-config/org/${orgId}`,
      { sections: config }
    ).pipe(
      catchError(err => { console.error('Failed to save onboarding config:', err); return throwError(() => err); })
    );
  }

  // ── Final Submit ──────────────────────────────────────────────────────────

  submitOnboarding(request: OnboardingRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/onboarding`, request).pipe(
      map(response => {
        if (!response?.success) throw new Error(response?.message || 'Onboarding submission failed');
        return response;
      }),
      catchError(error => { console.error('Onboarding submit error:', error); return throwError(() => error); })
    );
  }

  saveOnboardingProgress(request: OnboardingRequest): Observable<any> {
    return this.submitOnboarding(request);
  }
}