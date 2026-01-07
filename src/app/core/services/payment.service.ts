import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '@environments/environment';

export interface SubscriptionPlanDto {
  planId: string;
  name: string;
  monthlyPrice?: number;
  annualPrice?: number;
  maxUsers?: number;
  features?: { [key: string]: any } | any[];
  isCustom: boolean;
  isActive: boolean;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface CreateCompanySubscriptionRequest {
  companyId?: string; // Optional because the backend might infer it or it might be set by the controller using the token
  planId: string;
  status: string;
  billingCycle: string;
  startDate?: string; // ISO string
  endDate?: string; // ISO string
}

export interface CompanySubscriptionDto {
  subscriptionId: string;
  companyId: string;
  planId: string;
  status: string;
  billingCycle: string;
  startDate?: string;
  endDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly API_URL = `${environment.apiUrl}/Payment`;

  constructor(private http: HttpClient) { }

  /**
   * Get all active subscription plans
   */
  getActiveSubscriptionPlans(): Observable<SubscriptionPlanDto[]> {
    return this.http.get<ServiceResponse<SubscriptionPlanDto[]>>(`${this.API_URL}/subscription-plans/active`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to fetch subscription plans');
          }
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Create a company subscription
   */
  createCompanySubscription(request: CreateCompanySubscriptionRequest): Observable<CompanySubscriptionDto> {
    return this.http.post<ServiceResponse<CompanySubscriptionDto>>(`${this.API_URL}/company-subscriptions`, request)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to create subscription');
          }
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred while processing the request';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error('Payment Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}

