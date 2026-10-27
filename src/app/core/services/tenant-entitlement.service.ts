import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, of, shareReplay, tap } from 'rxjs';
import { environment } from '@environments/environment';
import {
  EntitlementApiResponse,
  TenantEntitlements
} from '../models/entitlement.models';

@Injectable({ providedIn: 'root' })
export class TenantEntitlementService {
  private readonly API_URL = `${environment.apiUrl}/Entitlements`;
  private readonly entitlementsSubject = new BehaviorSubject<TenantEntitlements | null>(null);
  private request$?: Observable<TenantEntitlements>;

  readonly entitlements$ = this.entitlementsSubject.asObservable();

  constructor(private http: HttpClient) {}

  load(forceRefresh = false): Observable<TenantEntitlements> {
    const existing = this.entitlementsSubject.value;
    if (existing && !forceRefresh) {
      return of(existing);
    }

    if (!this.request$ || forceRefresh) {
      this.request$ = this.http
        .get<EntitlementApiResponse<TenantEntitlements>>(`${this.API_URL}/me`)
        .pipe(
          map(response => {
            if (!response.success || !response.data) {
              throw new Error(response.message || 'Unable to load tenant plan access.');
            }
            return response.data;
          }),
          tap(entitlements => this.entitlementsSubject.next(entitlements)),
          tap({
            error: error => console.error('Failed to load tenant entitlements.', error),
            complete: () => { this.request$ = undefined; }
          }),
          // Share the in-flight response across route guards and the sidebar.
          shareReplay({ bufferSize: 1, refCount: true }),
          tap({
            error: () => { this.request$ = undefined; }
          })
        );
    }

    return this.request$;
  }

  isEnabled(featureKey: string): boolean {
    return this.entitlementsSubject.value?.features[featureKey]?.enabled === true;
  }

  clear(): void {
    this.request$ = undefined;
    this.entitlementsSubject.next(null);
  }
}
