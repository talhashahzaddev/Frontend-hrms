import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/auth.models';


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

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly apiUrl = `${environment.apiUrl}/Settings`;
  private currencyCache$: Observable<string> | null = null;
  private currencySubject = new BehaviorSubject<string>('USD');
  public organizationCurrency$ = this.currencySubject.asObservable();

  constructor(private http: HttpClient) {
    // Load currency on service initialization
    this.loadOrganizationCurrency();
  }

  getOrganizationSettings(): Observable<OrganizationSettings> {
    return this.http.get<ApiResponse<OrganizationSettings>>(`${this.apiUrl}/organization`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to fetch organization settings');
          }
          return response.data!;
        }),
        tap(settings => {
          // Cache the currency when settings are loaded
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

  private loadOrganizationCurrency(): void {
    this.getOrganizationCurrency().subscribe({
      next: (currency) => {
        this.currencySubject.next(currency);
      },
      error: (error) => {
        console.error('Error loading organization currency:', error);
        // Default to USD on error
        this.currencySubject.next('USD');
      }
    });
  }

  //Getting all timezones
getAllTimeZones() {
  return this.http.get<any[]>(
    'https://restcountries.com/v3.1/all?fields=name,capital,timezones,region'
  );
}

  updateCurrency(currency: string): Observable<boolean> {
    const request: UpdateCurrencyRequest = { currency };
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/currency`, request)
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
    .put<ApiResponse<boolean>>(`${this.apiUrl}/localization`, request)
    .pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to update localization settings');
        }
        return response.data!;
      })
    );
}

  getAvailableCurrencies(): Array<{ code: string; name: string; symbol: string }> {
    return [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
      { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
      { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
      { code: 'THB', name: 'Thai Baht', symbol: '฿' },
      { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
      { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
      { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب' },
      { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك' },
      { code: 'OMR', name: 'Omani Rial', symbol: '﷼' },
      { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼' },
      { code: 'EGP', name: 'Egyptian Pound', symbol: '£' },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
      { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
      { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
      { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
      { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
      { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
      { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
      { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
      { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
      { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
      { code: 'MXN', name: 'Mexican Peso', symbol: '$' }
    ];
  }

  /** GET /api/Settings/career-page — loads career branding for current org */
  getCareerPage(): Observable<CareerPageSettings> {
    return this.http.get<ApiResponse<CareerPageSettings>>(`${this.apiUrl}/career-page`).pipe(
      map(res => {
        if (!res.success || !res.data) throw new Error(res.message || 'Failed to load career page settings');
        return res.data;
      })
    );
  }

  /** PUT /api/Settings/career-page — saves career branding */
  updateCareerPage(request: UpdateCareerPageRequest): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/career-page`, request).pipe(
      map(res => {
        if (!res.success) throw new Error(res.message || 'Failed to update career page settings');
        return res.data ?? true;
      })
    );
  }

  /** POST /api/uploads/files — upload image and get back its URL */
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
}


