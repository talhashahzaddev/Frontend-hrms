import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ApiResponse } from '@core/models/auth.models';

interface OrganizationLocalization {
  currency?: string | null;
  timeZone?: string | null;
  culture?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class LocalizationService {
  private readonly cultureKey = 'orgCulture';
  private readonly timeZoneKey = 'orgTimeZone';
  private readonly defaultCulture = 'en-GB';

  private cultureSubject = new BehaviorSubject<string>(this.readStoredCulture());
  private timeZoneSubject = new BehaviorSubject<string | null>(this.readStoredTimeZone());

  readonly culture$ = this.cultureSubject.asObservable();
  readonly timeZone$ = this.timeZoneSubject.asObservable();

  constructor(private http: HttpClient) {}

  getCulture(): string {
    return this.cultureSubject.value || this.defaultCulture;
  }

  getTimeZone(): string | null {
    return this.timeZoneSubject.value;
  }

  loadOrganizationLocalization(): Observable<void> {
    return this.http
      .get<ApiResponse<OrganizationLocalization>>(`${environment.apiUrl}/policies/organization`)
      .pipe(
        map(res => {
          if (!res?.success) {
            throw new Error(res?.message || 'Failed to load localization settings');
          }
          return res.data ?? {};
        }),
        tap(settings => this.setLocalization(settings.culture ?? null, settings.timeZone ?? null)),
        map(() => void 0),
        catchError(error => {
          console.error('Failed to load localization settings:', error);
          return of(void 0);
        })
      );
  }

  setLocalization(culture?: string | null, timeZone?: string | null): void {
    const nextCulture = (culture || '').trim() || this.cultureSubject.value || this.defaultCulture;
    if (nextCulture !== this.cultureSubject.value) {
      this.cultureSubject.next(nextCulture);
      localStorage.setItem(this.cultureKey, nextCulture);
    }

    const normalizedTimeZone = this.normalizeTimeZone(timeZone);
    if (normalizedTimeZone !== this.timeZoneSubject.value) {
      this.timeZoneSubject.next(normalizedTimeZone);
      if (normalizedTimeZone) {
        localStorage.setItem(this.timeZoneKey, normalizedTimeZone);
      } else {
        localStorage.removeItem(this.timeZoneKey);
      }
    }
  }

  private readStoredCulture(): string {
    const stored = localStorage.getItem(this.cultureKey);
    return stored?.trim() || this.defaultCulture;
  }

  private readStoredTimeZone(): string | null {
    const stored = localStorage.getItem(this.timeZoneKey);
    const normalized = this.normalizeTimeZone(stored);
    if (stored && !normalized) {
      localStorage.removeItem(this.timeZoneKey);
    }
    return normalized;
  }

  private normalizeTimeZone(value?: string | null): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    return this.isValidTimeZone(trimmed) ? trimmed : null;
  }

  private isValidTimeZone(timeZone: string): boolean {
    try {
      Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
      return true;
    } catch {
      return false;
    }
  }
}