// ============================================================
// FILE: features/settings/services/settings.service.ts
//
// CHANGE — buildPolicyFormData():
//   1. 'fileUrl' field append kiya gaya — pre-uploaded URL string
//      (mirrors Profile sending 'profileurl' in FormData).
//   2. 'fileName' field append kiya gaya — original file name
//      for display purposes in admin + employee views.
//   All other service methods are completely unchanged.
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { catchError, map, tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/auth.models';
import { OnboardingFieldConfig } from '@/app/onboarding/services/onboarding.service';


export interface OrganizationSettings {
  organizationId: string;
  currency: string | null;
  organizationName: string;
  timeZone: string | null;
  culture: string | null;
}

export interface UpdateCurrencyRequest {
  currency: string;
}

export interface UpdateLocalizationRequest {
  currency: string;
  timeZone: string;
  culture: string;
}

export interface CareerPageSettings {
  organizationId: string;
  name: string | null;
  logoUrl: string | null;
  careerBgImageUrl: string | null;
  careerHeaderText: string | null;
  careerDescription: string | null;
}

export interface UpdateCareerPageRequest {
  careerBgImageUrl?: string | null;
  careerHeaderText?: string | null;
  careerDescription?: string | null;
  logoUrl?: string | null;
}

export interface PayslipTemplateSectionConfig {
  visible: boolean;
  title?: string | null;
}

export interface PayslipTemplateFieldItemConfig {
  visible: boolean;
  label?: string | null;
}

export interface PayslipTemplateOptions {
  hideZeroAmountLines: boolean;
  hideEmptyJsonSections: boolean;
}

export interface PayslipTemplateFieldConfig {
  sections: Record<string, PayslipTemplateSectionConfig>;
  employeeFields: Record<string, PayslipTemplateFieldItemConfig>;
  earningFields: Record<string, PayslipTemplateFieldItemConfig>;
  deductionFields: Record<string, PayslipTemplateFieldItemConfig>;
  netPayFields: Record<string, PayslipTemplateFieldItemConfig>;
  options: PayslipTemplateOptions;
}

export interface PayslipLayoutOption {
  layoutKey: string;
  displayName: string;
  description?: string | null;
  previewImageUrl?: string | null;
  rendererKey: string;
  sortOrder: number;
}

export interface PayslipTemplate {
  templateId?: string | null;
  organizationId: string;
  name: string;
  isActive: boolean;
  logoUrl?: string | null;
  headerTitle: string;
  headerSubtitle?: string | null;
  companyAddress?: string | null;
  footerText?: string | null;
  primaryColor: string;
  accentColor: string;
  sectionTitleColor: string;
  showGeneratedAt: boolean;
  showPayrollCalculatedAt: boolean;
  layoutKey: string;
  layoutConfig?: Record<string, unknown> | null;
  fieldConfig: PayslipTemplateFieldConfig;
  isCustom: boolean;
}

export interface UpsertPayslipTemplateRequest {
  name: string;
  logoUrl?: string | null;
  headerTitle: string;
  headerSubtitle?: string | null;
  companyAddress?: string | null;
  footerText?: string | null;
  primaryColor: string;
  accentColor: string;
  sectionTitleColor: string;
  showGeneratedAt: boolean;
  showPayrollCalculatedAt: boolean;
  layoutKey: string;
  layoutConfig?: Record<string, unknown> | null;
  fieldConfig: PayslipTemplateFieldConfig;
}

export const PAYSLIP_LAYOUT_FALLBACKS: PayslipLayoutOption[] = [
  {
    layoutKey: 'classic_stacked',
    displayName: 'Classic stacked',
    description: 'Traditional payslip with stacked sections.',
    rendererKey: 'classic_stacked',
    sortOrder: 1
  },
  {
    layoutKey: 'split_columns',
    displayName: 'Split columns',
    description: 'Earnings and deductions shown side by side.',
    rendererKey: 'split_columns',
    sortOrder: 2
  },
  {
    layoutKey: 'compact_corporate',
    displayName: 'Compact corporate',
    description: 'Summary strip with compact line items.',
    rendererKey: 'compact_corporate',
    sortOrder: 3
  }
];

export function createDefaultPayslipFieldConfig(): PayslipTemplateFieldConfig {
  return {
    sections: {
      employeeInfo: { visible: true, title: 'Employee Details' },
      earnings: { visible: true, title: 'EARNINGS' },
      deductions: { visible: true, title: 'DEDUCTIONS' },
      netPay: { visible: true, title: 'NET PAY' },
      footer: { visible: true }
    },
    employeeFields: {
      employeeName: { visible: true, label: 'Employee' },
      employeeCode: { visible: true, label: 'Employee code' },
      departmentName: { visible: true, label: 'Department' },
      payPeriod: { visible: true, label: 'Pay period' }
    },
    earningFields: {
      basicSalary: { visible: true, label: 'Basic salary' },
      totalBonuses: { visible: true, label: 'Total bonuses' },
      performanceBonuses: { visible: true, label: 'Performance bonus' },
      generalBonuses: { visible: true, label: 'General bonus' },
      gratuity: { visible: true, label: 'Gratuity' },
      overtime: { visible: true, label: 'Overtime' },
      grossPayLine: { visible: true, label: 'GROSS PAY (basic + bonuses)' }
    },
    deductionFields: {
      loanDeductions: { visible: true, label: 'Loan deductions' },
      salaryAdvance: { visible: true, label: 'Salary advance' },
      providentFund: { visible: true, label: 'Provident fund' },
      socialSecurity: { visible: true, label: 'Social security' },
      tax: { visible: true, label: 'Tax' },
      attendance: { visible: true, label: 'Attendance' },
      lateAttendance: { visible: true, label: 'Late attendance' },
      leave: { visible: true, label: 'Leave' },
      totalDeductions: { visible: true, label: 'Total deductions' }
    },
    netPayFields: {
      netPayable: { visible: true, label: 'NET PAYABLE' }
    },
    options: {
      hideZeroAmountLines: true,
      hideEmptyJsonSections: true
    }
  };
}

export interface OnboardingFieldConfiguration {
  enabled: boolean;
  required: boolean;
}

export interface OnboardingConfiguration {
  organizationId: string;
  personalInformation: {
    name: OnboardingFieldConfiguration;
    idNumber: OnboardingFieldConfiguration;
    resume: OnboardingFieldConfiguration;
  };
  educationDetails: {
    university: OnboardingFieldConfiguration;
    documents: OnboardingFieldConfiguration;
  };
  workExperience: {
    endDate: OnboardingFieldConfiguration;
    documents: OnboardingFieldConfiguration;
  };
}

/** Flat item returned by GET /api/onboarding-config/org/{orgId} */
export interface OrgOnboardingConfigItem {
  organizationId: string;
  section: string;
  fieldKey: string;
  enabled: boolean;
  required: boolean;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  status: string;
  fieldsEnabled: number;
  fieldsRequired: number;
  documentsRequired: number;
}

export interface PolicyFieldToggles {
  nameRequired:       boolean;
  categoryRequired:   boolean;
  contentRequired:    boolean;
  attachmentRequired: boolean;
}

export interface CompanyPolicy {
  policyId:       string;
  organizationId: string;
  policyName:     string;
  category:       string;
  policyContent:  string;
  isPublished:    boolean;
  fileUrl?:       string | null;
  fileName?:      string | null;
  fieldToggles?:  string | null;
  createdAt:      string;
  updatedAt:      string;
}

export interface CreatePolicyRequest {
  policyName:    string;
  category:      string;
  policyContent: string;
  isPublished:   boolean;
  fieldToggles?: string | null;
  attachment?:   File | null;      // kept for backwards compatibility
  fileUrl?:      string | null;    // pre-uploaded URL (mirrors profileurl in Profile)
  fileName?:     string | null;    // original file name for display
}

export interface UpdatePolicyRequest {
  policyName:    string;
  category:      string;
  policyContent: string;
  isPublished:   boolean;
  fieldToggles?: string | null;
  attachment?:   File | null;
  fileUrl?:      string | null;    // pre-uploaded URL
  fileName?:     string | null;    // original file name for display
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly apiUrl = `${environment.apiUrl}/policies`;
  private readonly settingsUrl = `${environment.apiUrl}/Settings`;

  private currencyCache$: Observable<string> | null = null;
  private currencySubject = new BehaviorSubject<string>('USD');
  public organizationCurrency$ = this.currencySubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadOrganizationCurrency();
  }

  // ── All methods below are UNCHANGED ──────────────────────────────────────

  getOrganizationSettings(): Observable<OrganizationSettings> {
    return this.http.get<ApiResponse<OrganizationSettings>>(`${this.settingsUrl}/organization`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch organization settings');
          }
          return response.data!;
        }),
        tap(settings => {
          if (settings.currency) {
            this.currencySubject.next(settings.currency);
          }
        })
      );
  }

  getOrganizationCurrency(): Observable<string> {
    if (!this.currencyCache$) {
      this.currencyCache$ = this.getOrganizationSettings().pipe(
        map(settings => settings.currency || 'USD'),
        shareReplay(1)
      );
    }
    return this.currencyCache$;
  }

  getOrganizationCurrencyCode(): string {
    return this.currencySubject.value;
  }

  getCurrencySymbol(currencyCode?: string): string {
    const code = currencyCode || this.currencySubject.value;
    const currency = this.getAvailableCurrencies().find(c => c.code === code);
    return currency?.symbol || '$';
  }

  getOnboardingConfig(orgId?: string): Observable<OnboardingFieldConfig> {
    const url = orgId
      ? `${this.apiUrl}/onboarding-config/org/${orgId}`
      : `${this.apiUrl}/onboarding-config`;
    return this.http.get<any>(url).pipe(
      map(res => res.data),
      catchError(err => {
        console.error('Failed to fetch onboarding config:', err);
        return throwError(() => err);
      })
    );
  }

  saveOnboardingConfig(orgId: string, config: OnboardingFieldConfiguration): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/onboarding-config/org/${orgId}`,
      { sections: config }
    ).pipe(
      catchError(err => {
        console.error('Failed to save onboarding config:', err);
        return throwError(() => err);
      })
    );
  }

  /** GET /api/onboarding-config/getOrganizationConfiguration — returns flat array of field configs */
  getOrgOnboardingConfig(): Observable<OrgOnboardingConfigItem[]> {
    return this.http.get<{ success: boolean; data: OrgOnboardingConfigItem[] }>(
      `${environment.apiUrl}/onboarding-config/getOrganizationConfiguration`
    ).pipe(
      map(res => {
        if (!res.success) throw new Error('Failed to load onboarding config');
        return res.data || [];
      }),
      catchError(err => {
        console.error('Failed to fetch org onboarding config:', err);
        return throwError(() => err);
      })
    );
  }

  /** PUT /api/onboarding-config/update/onboardingConfiguration — saves flat array of field configs */
  updateOrgOnboardingConfig(items: OrgOnboardingConfigItem[]): Observable<any> {
    const payload = {
      fields: items.map(item => ({
        section: item.section,
        fieldKey: item.fieldKey,
        enabled: item.enabled,
        required: item.required
      }))
    };
    return this.http.put<any>(
      `${environment.apiUrl}/onboarding-config/update/onboardingConfiguration`,
      payload
    ).pipe(
      catchError(err => {
        console.error('Failed to save org onboarding config:', err);
        return throwError(() => err);
      })
    );
  }

  getPolicies(): Observable<CompanyPolicy[]> {
    return this.http.get<any>(`${this.apiUrl}/get/all/policies`).pipe(
      map(res => res.data ?? []),
      catchError(err => {
        console.error('Failed to fetch policies:', err);
        return of([]);
      })
    );
  }

  getPolicyById(id: string): Observable<CompanyPolicy | null> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data ?? null),
      catchError(err => {
        console.error('Failed to fetch policy:', err);
        return of(null);
      })
    );
  }

  createPolicy(request: CreatePolicyRequest): Observable<CompanyPolicy> {
    const fd = this.buildPolicyFormData(request);
    return this.http.post<any>(`${this.apiUrl}/Create/Policy`, fd).pipe(
      map(res => res.data),
      catchError(err => throwError(() => err))
    );
  }

  updatePolicy(id: string, request: UpdatePolicyRequest): Observable<any> {
    const fd = this.buildPolicyFormData(request);
    return this.http.put<any>(`${this.apiUrl}/${id}`, fd).pipe(
      catchError(err => throwError(() => err))
    );
  }

  deletePolicy(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      catchError(err => {
        console.error('Delete Policy Error:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * CHANGED:
   * 1. Appends `fileUrl`  — pre-uploaded URL string (mirrors Profile's 'profileurl').
   * 2. Appends `fileName` — original filename so backend can persist it for
   *    display in both admin (view/edit dialog) and employee (policy step) screens.
   *
   * If a raw File is still supplied (backwards compat), it is appended as before.
   * In the new Policy flow, attachment will be null and fileUrl + fileName carry the data.
   */
  private buildPolicyFormData(
    request: CreatePolicyRequest | UpdatePolicyRequest
  ): FormData {
    const fd = new FormData();
    fd.append('policyName',    request.policyName    ?? '');
    fd.append('category',      request.category      ?? '');
    fd.append('policyContent', request.policyContent ?? '');
    fd.append('isPublished',   String(!!request.isPublished));

    if (request.fieldToggles) {
      fd.append('fieldToggles', request.fieldToggles);
    }

    // Raw file (legacy / direct-upload path) — kept for backwards compatibility
    if (request.attachment) {
      fd.append('attachment', request.attachment, request.attachment.name);
    }

    // Pre-uploaded URL — mirrors Profile sending 'profileurl' in FormData.
    // Backend reads this to persist fileUrl on the policy record.
    if (request.fileUrl) {
      fd.append('fileUrl', request.fileUrl);
    }

    // ── NEW: original filename for display ────────────────────────────────
    // Sent alongside fileUrl so backend can persist fileName on the record.
    // Used in admin dialog (existing-file-row, view-file-card) and
    // in employee policy view to label the attachment chip.
    if (request.fileName) {
      fd.append('fileName', request.fileName);
    }

    return fd;
  }

  private loadOrganizationCurrency(): void {
    this.getOrganizationCurrency().subscribe({
      next:  (currency) => { this.currencySubject.next(currency); },
      error: (error)    => {
        console.error('Error loading organization currency:', error);
        this.currencySubject.next('USD');
      }
    });
  }

  getAllTimeZones() {
    return this.http.get<any[]>(
      'https://restcountries.com/v3.1/all?fields=name,capital,timezones,region'
    );
  }

  updateCurrency(currency: string): Observable<boolean> {
    const request: UpdateCurrencyRequest = { currency };
    return this.http.put<ApiResponse<boolean>>(`${this.settingsUrl}/currency`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to update currency');
          }
          return response.data!;
        })
      );
  }

  updateLocalization(request: UpdateLocalizationRequest): Observable<boolean> {
    return this.http
      .put<ApiResponse<boolean>>(`${this.settingsUrl}/localization`, request)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to update localization settings');
          }
          return response.data!;
        })
      );
  }

  getOnboardingConfiguration(orgId: string): Observable<OnboardingConfiguration> {
    return this.http.get<ApiResponse<OnboardingConfiguration>>(`${this.apiUrl}/onboarding-configuration/${orgId}`).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to load onboarding configuration');
        }
        this.saveLocalOnboardingConfiguration(orgId, response.data);
        return response.data;
      }),
      catchError(() => {
        const storedValue = localStorage.getItem(this.getOnboardingConfigurationKey(orgId));
        if (storedValue) {
          return of(JSON.parse(storedValue) as OnboardingConfiguration);
        }
        return of({
          organizationId: orgId,
          personalInformation: {
            name:     { enabled: true, required: true },
            idNumber: { enabled: true, required: true },
            resume:   { enabled: true, required: false }
          },
          educationDetails: {
            university: { enabled: true, required: true },
            documents:  { enabled: true, required: false }
          },
          workExperience: {
            endDate:   { enabled: true, required: true },
            documents: { enabled: true, required: false }
          }
        });
      })
    );
  }

  saveOnboardingConfiguration(orgId: string, configuration: OnboardingConfiguration): Observable<OnboardingConfiguration> {
    return this.http.put<ApiResponse<OnboardingConfiguration>>(`${this.apiUrl}/onboarding-configuration/${orgId}`, configuration).pipe(
      map(response => {
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to save onboarding configuration');
        }
        this.saveLocalOnboardingConfiguration(orgId, response.data);
        return response.data;
      }),
      catchError(() => {
        this.saveLocalOnboardingConfiguration(orgId, configuration);
        return of(configuration);
      })
    );
  }

  private getOnboardingConfigurationKey(orgId: string): string {
    return `onboarding-configuration-${orgId}`;
  }

  private saveLocalOnboardingConfiguration(orgId: string, configuration: OnboardingConfiguration): void {
    localStorage.setItem(this.getOnboardingConfigurationKey(orgId), JSON.stringify(configuration));
  }

  getAvailableCurrencies(): Array<{ code: string; name: string; symbol: string }> {
    return [
      { code: 'USD', name: 'US Dollar',          symbol: '$'    },
      { code: 'PKR', name: 'Pakistani Rupee',    symbol: '₨'   },
      { code: 'INR', name: 'Indian Rupee',       symbol: '₹'   },
      { code: 'AED', name: 'UAE Dirham',         symbol: 'د.إ' },
      { code: 'SAR', name: 'Saudi Riyal',        symbol: '﷼'   },
      { code: 'EUR', name: 'Euro',               symbol: '€'    },
      { code: 'GBP', name: 'British Pound',      symbol: '£'    },
      { code: 'JPY', name: 'Japanese Yen',       symbol: '¥'    },
      { code: 'CNY', name: 'Chinese Yuan',       symbol: '¥'    },
      { code: 'AUD', name: 'Australian Dollar',  symbol: 'A$'   },
      { code: 'CAD', name: 'Canadian Dollar',    symbol: 'C$'   },
      { code: 'CHF', name: 'Swiss Franc',        symbol: 'CHF'  },
      { code: 'SGD', name: 'Singapore Dollar',   symbol: 'S$'   },
      { code: 'MYR', name: 'Malaysian Ringgit',  symbol: 'RM'   },
      { code: 'THB', name: 'Thai Baht',          symbol: '฿'   },
      { code: 'IDR', name: 'Indonesian Rupiah',  symbol: 'Rp'   },
      { code: 'PHP', name: 'Philippine Peso',    symbol: '₱'   },
      { code: 'BHD', name: 'Bahraini Dinar',     symbol: '.د.ب'},
      { code: 'KWD', name: 'Kuwaiti Dinar',      symbol: 'د.ك' },
      { code: 'OMR', name: 'Omani Rial',         symbol: '﷼'   },
      { code: 'QAR', name: 'Qatari Riyal',       symbol: '﷼'   },
      { code: 'EGP', name: 'Egyptian Pound',     symbol: '£'    },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R'    },
      { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$'  },
      { code: 'KRW', name: 'South Korean Won',   symbol: '₩'   },
      { code: 'HKD', name: 'Hong Kong Dollar',   symbol: 'HK$'  },
      { code: 'NOK', name: 'Norwegian Krone',    symbol: 'kr'   },
      { code: 'SEK', name: 'Swedish Krona',      symbol: 'kr'   },
      { code: 'DKK', name: 'Danish Krone',       symbol: 'kr'   },
      { code: 'PLN', name: 'Polish Zloty',       symbol: 'zł'  },
      { code: 'TRY', name: 'Turkish Lira',       symbol: '₺'   },
      { code: 'RUB', name: 'Russian Ruble',      symbol: '₽'   },
      { code: 'BRL', name: 'Brazilian Real',     symbol: 'R$'   },
      { code: 'MXN', name: 'Mexican Peso',       symbol: '$'    }
    ];
  }

  getCareerPage(): Observable<CareerPageSettings> {
    return this.http.get<ApiResponse<CareerPageSettings>>(`${environment.apiUrl}/settings/career-page`).pipe(
      map(res => {
        if (!res.success || !res.data) throw new Error(res.message || 'Failed to load career page settings');
        return res.data;
      })
    );
  }

  updateCareerPage(request: UpdateCareerPageRequest): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${environment.apiUrl}/settings/career-page`, request).pipe(
      map(res => {
        if (!res.success) throw new Error(res.message || 'Failed to update career page settings');
        return res.data ?? true;
      })
    );
  }

  /**
   * POST /api/uploads/files — upload a file and receive its public URL.
   * Used by both Profile (as authService.uploadProfilePic) and now Policy.
   * UNCHANGED.
   */
  uploadFile(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${environment.apiUrl}/uploads/files`, formData).pipe(
      map(res => {
        if (!res?.url) throw new Error('Upload failed');
        return res.url;
      })
    );
  }

  getPayslipTemplate(): Observable<PayslipTemplate> {
    return this.http.get<ApiResponse<PayslipTemplate>>(`${this.settingsUrl}/payslip-template`).pipe(
      map(res => {
        if (!res.success || !res.data) {
          throw new Error(res.message || 'Failed to load payslip template');
        }
        return {
          ...res.data,
          layoutKey: res.data.layoutKey || 'classic_stacked'
        };
      })
    );
  }

  getPayslipLayoutOptions(): Observable<PayslipLayoutOption[]> {
    return this.http.get<ApiResponse<PayslipLayoutOption[]>>(`${this.settingsUrl}/payslip-template/layouts`).pipe(
      map(res => {
        if (!res.success || !res.data?.length) {
          return PAYSLIP_LAYOUT_FALLBACKS;
        }
        return res.data;
      }),
      catchError(() => of(PAYSLIP_LAYOUT_FALLBACKS))
    );
  }

  updatePayslipTemplate(request: UpsertPayslipTemplateRequest): Observable<PayslipTemplate> {
    return this.http.put<ApiResponse<PayslipTemplate>>(`${this.settingsUrl}/payslip-template`, request).pipe(
      map(res => {
        if (!res.success || !res.data) {
          throw new Error(res.message || 'Failed to save payslip template');
        }
        return res.data;
      })
    );
  }

  previewPayslipTemplate(template?: UpsertPayslipTemplateRequest): Observable<Blob> {
    return this.http.post(
      `${this.settingsUrl}/payslip-template/preview`,
      { template: template ?? null },
      { responseType: 'blob' }
    );
  }
}