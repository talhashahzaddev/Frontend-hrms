import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface PayRollRuleDto {
  id: string;
  organizationId: string;
  ruleName: string;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
}

export interface PayRollPolicySectionDto {
  rulesCount: number;
  rules: PayRollRuleDto[];
}

export interface PayRollRulesGroupedDto {
  overtimePolicy: PayRollPolicySectionDto;
  attendanceDeductionPolicy: PayRollPolicySectionDto;
  lateArrivalPolicy: PayRollPolicySectionDto;
  leaveDeductionPolicy: PayRollPolicySectionDto;
  performanceBonusPolicy: PayRollPolicySectionDto;
  employeeLoanPolicy: PayRollPolicySectionDto;
  salaryAdvancePolicy: PayRollPolicySectionDto;
  providentFundPolicy: PayRollPolicySectionDto;
  incomeTaxPolicy: PayRollPolicySectionDto;
  socialSecurityPolicy: PayRollPolicySectionDto;
  gratuityPolicy: PayRollPolicySectionDto;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class PayrollService {
  private readonly apiUrl = `${environment.apiUrl}/PayRoll`;

  constructor(private http: HttpClient) { }

  getAllRules(): Observable<PayRollRulesGroupedDto> {
    return this.http.get<ApiResponse<PayRollRulesGroupedDto>>(`${this.apiUrl}/rules`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || response;
        })
      );
  }

  createOvertimeRule(data: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/overtime-rules`, data)
      .pipe(
        map((response: any) => {
          if (response && !response.success && response.message) {
            throw new Error(response.message);
          }
          return response?.data || response;
        })
      );
  }

  updateOvertimeRule(id: string, data: any): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/overtime-rules/${id}`, data)
      .pipe(
        map((response: any) => {
          if (response && !response.success && response.message) {
            throw new Error(response.message);
          }
          return response?.data || response;
        })
      );
  }

  getOvertimeRules(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/overtime-rules`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || [];
        })
      );
  }
  getOvertimeActiveRules(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/overtime-rules/active`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || [];
        })
      );
  }

  deleteOvertimeRule(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/overtime-rules/${id}`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || response.success;
        })
      );
  }

  getOvertimeEntries(params?: any): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/overtime-entries`, { params })
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  createOvertimeEntry(data: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/overtime-entries`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  updateOvertimeEntry(id: string, data: any): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/overtime-entries/${id}`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  deleteOvertimeEntry(id: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/overtime-entries/${id}`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  toggleOvertimeRuleStatus(id: string): Observable<boolean> {
    return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/overtime-rules/${id}/toggle-status`, {})
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || response.success;
        })
      );
  }

  // Payroll Periods
  getPayrollPeriods(params?: any): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/periods`, { params })
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  createPayrollPeriod(data: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/periods`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  updatePayrollPeriod(id: string, data: any): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/periods/${id}`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  deletePayrollPeriod(id: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/periods/${id}`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  // Attendance Deduction Rules
  getAttendanceDeductionRules(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/attendance-deduction-rules`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || [];
        })
      );
  }

  createAttendanceDeductionRule(data: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/attendance-deduction-rules`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  updateAttendanceDeductionRule(id: string, data: any): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/attendance-deduction-rules/${id}`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  deleteAttendanceDeductionRule(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/attendance-deduction-rules/${id}`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || response.success;
        })
      );
  }
}
