import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface FieldConfig {
  enabled:  boolean;
  required: boolean;
}

export interface OnboardingFieldConfig {
  organizationId: string;
  sections: {
    personalInformation: Record<string, FieldConfig>;
    educationDetails:    Record<string, FieldConfig>;
    workExperience:      Record<string, FieldConfig>;
  };
}

export interface OnboardingEducation {
  degree:      string;
  institution: string;
  field:       string;
  gpa:         string;
  fileName:    string;
  description: string;
}

export interface OnboardingWorkExperience {
  jobTitle:         string;
  company:          string;
  employmentType:   string;
  location:         string;
  startDate:        string;
  endDate:          string;
  currentlyWorking: boolean;
  responsibilities: string;
  fileName:         string;
}

export interface OnboardingRequest {
  firstName:         string;
  lastName:          string;
  email:             string;
  phone:             string;
  jobTitle:          string;
  department:        string;
  gender:            string;
  nationality:       string;
  idNumber:          string;
  resumeFileName:    string;
  education:         OnboardingEducation[];
  workExperience:    OnboardingWorkExperience[];
  selectedModuleIds: string[];
  policyAccepted:    boolean;
  documentNotes:     string;
}

export interface OnboardingStatusResponse {
  onboardingId:     string;
  employeeId:       string;
  currentStep:      number;
  status:           string;
  isPolicyAccepted: boolean;
  completionRate:   number;
  documentNotes?:   string;
  personalInfo?: {
    onboardingId:    string;
    employeeId:      string;
    fullName:        string;
    jobTitle:        string;
    email:           string;
    phone:           string;
    department:      string;
    gender:          string;
    nationality:     string;
    idNumber:        string;
    photoUrl?:       string;
    resumeUrl?:      string;
    resumeFileName?: string;
    currentStep:     number;
  };
  educationList:      any[];
  workExperienceList: any[];
  bankDetails?: {
    bankDetailsId:      string;
    noBankAccount:      boolean;
    accountHolderName?: string;
    accountNumber?:     string;
    bankName?:          string;
    paymentMethod?:     string;
    iban?:              string;
    branchName?:        string;
    branchCode?:        string;
  };
}

export interface SaveBankDetailsRequest {
  onboardingId:       string;
  noBankAccount:      boolean;
  accountHolderName?: string | null;
  accountNumber?:     string | null;
  bankName?:          string | null;
  paymentMethod?:     string | null;
  iban?:              string | null;
  branchName?:        string | null;
  branchCode?:        string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class OnboardingService {

  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Personal Info ─────────────────────────────────────────────────────────

  savePersonalInfo(
    fullName:    string,
    jobTitle:    string,
    email:       string,
    phone:       string,
    department:  string,
    gender:      string,
    nationality: string,
    idNumber:    string,
    photo?:  File | null,
    resume?: File | null
  ): Observable<any> {
    const formData = new FormData();
    formData.append('fullName',    fullName);
    formData.append('jobTitle',    jobTitle);
    formData.append('email',       email);
    formData.append('phone',       phone);
    formData.append('department',  department);
    formData.append('gender',      gender);
    formData.append('nationality', nationality);
    formData.append('idNumber',    idNumber);
    if (photo)  formData.append('photo',  photo,  photo.name);
    if (resume) formData.append('resume', resume, resume.name);

    return this.http.put<any>(`${this.apiUrl}/onboarding/personal-info`, formData).pipe(
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

  // ── Employee Job Title ────────────────────────────────────────────────────

  /**
   * Normalises an employee / profile payload to a single display title
   * (position title, designation, or assigned role name).
   */
  private extractAssignedTitleFromResponse(response: any): string | null {
    const root = response?.data !== undefined ? response.data : response;
    const pick = (data: any): string | null => {
      if (!data || typeof data !== 'object') return null;
      const t = (v: unknown): string | null =>
        typeof v === 'string' && v.trim() ? v.trim() : null;
      return (
        t(data.position?.positionTitle) ??
        t(data.position?.roleName) ??
        t(data.positionTitle) ??
        t(data.jobTitle) ??
        t(data.designation) ??
        t(data.roleName) ??
        t(data.role?.roleName) ??
        (typeof data.role === 'string' ? t(data.role) : null) ??
        null
      );
    };
    return pick(root) ?? pick(root?.employee);
  }

  /**
   * Fetches the logged-in employee's assigned role / position title for onboarding.
   *
   * Tries, in order (first non-empty title wins):
   *   1. GET /employees/my-profile
   *   2. GET /employees/me
   *   3. GET /Employee/{employeeId} — same pattern as EmployeeService.getEmployee
   *
   * @param employeeId optional employee GUID from the auth token (see AuthService.getEmployeeIdFromToken)
   */
  getEmployeeJobTitle(employeeId?: string | null): Observable<string | null> {
    const fetchTitle = (url: string) =>
      this.http.get<any>(url).pipe(
        map(res => this.extractAssignedTitleFromResponse(res)),
        catchError(() => of<string | null>(null))
      );

    return fetchTitle(`${this.apiUrl}/employees/my-profile`).pipe(
      switchMap(title =>
        title ? of(title) : fetchTitle(`${this.apiUrl}/employees/me`)
      ),
      switchMap(title =>
        title
          ? of(title)
          : employeeId
            ? fetchTitle(`${this.apiUrl}/Employee/${employeeId}`)
            : of(null)
      )
    );
  }

  // ── Education ─────────────────────────────────────────────────────────────

  addEducation(
    education:     OnboardingEducation,
    attachment?:   File | null,
    onboardingId?: string | null
  ): Observable<any> {
    const requestBody = {
      degree:        education.degree,
      institution:   education.institution,
      field:         education.field,
      gpa:           education.gpa || '',
      fileName:      education.fileName || '',
      description:   education.description || '',
      onboardingId:  onboardingId || undefined,
      onboarding_id: onboardingId || undefined
    };

    if (attachment) {
      const formData = new FormData();
      formData.append('degree',       requestBody.degree);
      formData.append('institution',  requestBody.institution);
      formData.append('field',        requestBody.field);
      formData.append('gpa',          requestBody.gpa);
      formData.append('fileName',     requestBody.fileName);
      formData.append('description',  requestBody.description);
      if (onboardingId) {
        formData.append('onboardingId',  onboardingId);
        formData.append('onboarding_id', onboardingId);
      }
      formData.append('file', attachment, attachment.name);

      return this.http.post<any>(`${this.apiUrl}/onboarding/education`, formData).pipe(
        map(response => {
          if (!response?.success) throw new Error(response?.message || 'Failed to save education detail');
          return response;
        }),
        catchError(error => { console.error('Education save error:', error); return throwError(() => error); })
      );
    }

    return this.http.post<any>(`${this.apiUrl}/onboarding/education`, requestBody).pipe(
      map(response => {
        if (!response?.success) throw new Error(response?.message || 'Failed to save education detail');
        return response;
      }),
      catchError(error => { console.error('Education save error:', error); return throwError(() => error); })
    );
  }

  // ── Work Experience ───────────────────────────────────────────────────────

  addWorkExperience(
    workExperience: OnboardingWorkExperience,
    attachment?:    File | null,
    onboardingId?:  string | null
  ): Observable<any> {
    const requestBody = {
      jobTitle:         workExperience.jobTitle,
      company:          workExperience.company,
      employmentType:   workExperience.employmentType,
      location:         workExperience.location || '',
      startDate:        workExperience.startDate,
      endDate:          workExperience.endDate || '',
      currentlyWorking: workExperience.currentlyWorking,
      responsibilities: workExperience.responsibilities || '',
      fileName:         workExperience.fileName || '',
      onboardingId:     onboardingId || undefined,
      onboarding_id:    onboardingId || undefined
    };

    if (attachment) {
      const formData = new FormData();
      formData.append('jobTitle',         requestBody.jobTitle);
      formData.append('company',          requestBody.company);
      formData.append('employmentType',   requestBody.employmentType);
      formData.append('location',         requestBody.location);
      formData.append('startDate',        requestBody.startDate);
      formData.append('endDate',          requestBody.endDate);
      formData.append('currentlyWorking', String(requestBody.currentlyWorking));
      formData.append('responsibilities', requestBody.responsibilities);
      formData.append('fileName',         requestBody.fileName);
      if (onboardingId) {
        formData.append('onboardingId',  onboardingId);
        formData.append('onboarding_id', onboardingId);
      }
      formData.append('file', attachment, attachment.name);

      return this.http.post<any>(`${this.apiUrl}/onboarding/work-experience`, formData).pipe(
        map(response => {
          if (!response?.success) throw new Error(response?.message || 'Failed to save work experience detail');
          return response;
        }),
        catchError(error => { console.error('Work experience save error:', error); return throwError(() => error); })
      );
    }

    return this.http.post<any>(`${this.apiUrl}/onboarding/work-experience`, requestBody).pipe(
      map(response => {
        if (!response?.success) throw new Error(response?.message || 'Failed to save work experience detail');
        return response;
      }),
      catchError(error => { console.error('Work experience save error:', error); return throwError(() => error); })
    );
  }

  // ── Bank Details ──────────────────────────────────────────────────────────

  saveBankDetails(request: SaveBankDetailsRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/onboarding/bank-details`, request).pipe(
      map(response => {
        if (!response?.success) throw new Error(response?.message || 'Failed to save bank details');
        return response;
      }),
      catchError(error => {
        console.error('Bank details save error:', error);
        return throwError(() => error);
      })
    );
  }

  getBankDetails(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/onboarding/bank-details`).pipe(
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

  submitOnboarding(
    request: OnboardingRequest,
    photo?:  File | null,
    resume?: File | null
  ): Observable<any> {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(request));
    if (photo)  formData.append('photo',  photo,  photo.name);
    if (resume) formData.append('resume', resume, resume.name);

    return this.http.post<any>(`${this.apiUrl}/onboarding`, formData).pipe(
      map(response => {
        if (!response?.success) throw new Error(response?.message || 'Onboarding submission failed');
        return response;
      }),
      catchError(error => { console.error('Onboarding submit error:', error); return throwError(() => error); })
    );
  }

  saveOnboardingProgress(
    request: OnboardingRequest,
    photo?:  File | null,
    resume?: File | null
  ): Observable<any> {
    return this.submitOnboarding(request, photo, resume);
  }
}