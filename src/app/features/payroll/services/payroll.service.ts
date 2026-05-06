import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { TimesheetPayrollSummaryDto, TimesheetPeriodLinkDto } from '../../../core/models/attendance.models';

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
  bonusPolicy: PayRollPolicySectionDto;
}

export interface LeaveRuleDto {
  ruleId: string;
  organizationId: string;
  ruleName: string;
  description?: string;
  unpaidMultiplier: number;
  halfPaidMultiplier: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveSummary {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  periodId: string;
  ruleId?: string;
  ruleName?: string;
  paidDays: number;
  unpaidDays: number;
  halfPaidDays: number;
  unpaidDeduction: number;
  halfPaidDeduction: number;
  totalLeaveDays: number;
  totalDeduction: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveSummaryFilter {
  employeeName?: string;
  ruleId?: string;
  periodId?: string;
  page: number;
  pageSize: number;
}

export interface TaxRegimeDto {
  regimeId: string;
  organizationId: string;
  country?: string;
  regimeName?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface TaxCategoryDto {
  categoryId: string;
  regimeId: string;
  regimeName?: string;
  categoryName?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
}

export interface TaxSlabDto {
  slabId: string;
  categoryId: string;
  categoryName?: string;
  slabOrder: number;
  minIncome: number;
  maxIncome?: number | null;
  fixedAmount: number;
  percentage: number;
  isDeleted: boolean;
  createdAt: string;
}

export interface TaxComponentRuleDto {
  componentRuleId: string;
  regimeId: string;
  regimeName?: string;
  organizationId: string;
  componentName?: string;
  taxability?: string;
  limitAmount: number;
  limitPercentage: number;
  applyStage?: string;
  isDeleted: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface SocialSecurityJurisdictionOption {
  jurisdictionId: string;
  jurisdictionCode: string;
  jurisdictionName: string;
  countryCode?: string;
  currency?: string;
  isDefault?: boolean;
}

export interface SocialSecurityAuthorityOption {
  authorityId: string;
  jurisdictionId: string;
  authorityCode: string;
  authorityName: string;
  portalUrl?: string;
  remittanceFrequency?: string;
}

export interface SocialSecuritySchemeOption {
  schemeId: string;
  jurisdictionId: string;
  authorityId?: string;
  schemeCode: string;
  schemeName: string;
  schemeType?: string;
  mandatoryMode?: string;
}

export interface SocialSecurityRuleOption {
  ruleId: string;
  schemeId: string;
  ruleName: string;
  description?: string;
  contributionBasis?: string;
  employeeDefaultPct?: number;
  employerDefaultPct?: number;
  employeeFixedAmount?: number | null;
  employerFixedAmount?: number | null;
  minSalaryLimit?: number | null;
  maxSalaryLimit?: number | null;
  annualSalaryCap?: number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive?: boolean;
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

  getAttendanceActiveRules(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/attendance-deduction-rules/active`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || [];
        })
      );
  }

  getLateArrivalActiveRules(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/late-arrival-rules/active`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || [];
        })
      );
  }

  getLeaveActiveRules(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/leave-rules/active`)
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

  getActiveAttendanceDeductionRules(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/attendance-deduction-rules/active`)
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

  // Late Arrival Rules
  getLateArrivalRules(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/late-arrival-rules`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || [];
        })
      );
  }

  getActiveLateArrivalRules(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/late-arrival-rules/active`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || [];
        })
      );
  }

  createLateArrivalRule(data: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/late-arrival-rules`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  updateLateArrivalRule(id: string, data: any): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/late-arrival-rules/${id}`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  deleteLateArrivalRule(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/late-arrival-rules/${id}`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || response.success;
        })
      );
  }

  // Attendance Summaries (Absents)
  getAttendanceSummaries(params?: any): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/attendance-summaries`, { params })
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
       );
  }

  createAttendanceSummary(data: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/attendance-summaries`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  updateAttendanceSummary(id: string, data: any): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/attendance-summaries/${id}`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  deleteAttendanceSummary(id: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/attendance-summaries/${id}`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  // Late Attendance
  getLateAttendances(params?: any): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/late-attendance`, { params })
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  createLateAttendance(data: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/late-attendance`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  updateLateAttendance(id: string, data: any): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/late-attendance/${id}`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  deleteLateAttendance(id: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/late-attendance/${id}`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  // Leave Rules
  getLeaveRules(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/leave-rules`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || [];
        })
      );
  }

  getActiveLeaveRules(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/leave-rules/active`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || [];
        })
      );
  }

  createLeaveRule(data: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/leave-rules`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  updateLeaveRule(id: string, data: any): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/leave-rules/${id}`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  deleteLeaveRule(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/leave-rules/${id}`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || response.success;
        })
      );
  }

  // Leave Summary
  getLeaveSummaries(params?: any): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/leave-summaries`, { params })
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  getLeaveSummaryById(id: string): Observable<LeaveSummary> {
    return this.http.get<ApiResponse<LeaveSummary>>(`${this.apiUrl}/leave-summaries/${id}`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  createLeaveSummary(data: any): Observable<LeaveSummary> {
    return this.http.post<ApiResponse<LeaveSummary>>(`${this.apiUrl}/leave-summaries`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  updateLeaveSummary(id: string, data: any): Observable<LeaveSummary> {
    return this.http.put<ApiResponse<LeaveSummary>>(`${this.apiUrl}/leave-summaries/${id}`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  deleteLeaveSummary(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/leave-summaries/${id}`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || response.success;
        })
      );
  }

  // Performance Rules
  getPerformanceRules(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/performance-rules`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || [];
        })
      );
  }

  getActivePerformanceRules(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/performance-rules/active`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || [];
        })
      );
  }

  createPerformanceRule(data: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/performance-rules`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  updatePerformanceRule(id: string, data: any): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/performance-rules/${id}`, data)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
  }

  deletePerformanceRule(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/performance-rules/${id}`)
      .pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data || response.success;
        })
      );
  }

    // Bonus Rules
    getBonusRules(): Observable<any[]> {
      return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/bonus-rules`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    getActiveBonusRules(): Observable<any[]> {
      return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/bonus-rules/active`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    createBonusRule(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/bonus-rules`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateBonusRule(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/bonus-rules/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteBonusRule(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/bonus-rules/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    // Performance Pay
    getPerformancePays(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/performance-pay`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createPerformancePay(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/performance-pay`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updatePerformancePay(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/performance-pay/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deletePerformancePay(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/performance-pay/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    // Bonus Entries
    getBonusEntries(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/bonus-entries`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    getBonusEntryById(id: string): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/bonus-entries/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createBonusEntry(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/bonus-entries`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateBonusEntry(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/bonus-entries/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteBonusEntry(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/bonus-entries/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    // Loan Rules
    getLoanRules(): Observable<any[]> {
      return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/loan-rules`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    getActiveLoanRules(): Observable<any[]> {
      return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/loan-rules/active`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    // Provident Fund Rules
    getProvidentFundRules(): Observable<any[]> {
      return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/provident-fund-rules`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    getActiveProvidentFundRules(): Observable<any[]> {
      return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/provident-fund-rules/active`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    getAllProvidentFundRequests(filter?: {
      SearchTerm?: string;
      RequestType?: string;
      Status?: string;
      Page?: number;
      PageSize?: number;
    }): Observable<any> {
      let params = new HttpParams();
      if (filter) {
        Object.keys(filter).forEach((key) => {
          const value = (filter as any)[key];
          if (value !== null && value !== undefined && value !== '') {
            params = params.set(key, value);
          }
        });
      }

      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/provident-fund/requests`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    getAllProvidentFundAccounts(filter?: {
      SearchTerm?: string;
      PfStatus?: string;
      Page?: number;
      PageSize?: number;
    }): Observable<any> {
      let params = new HttpParams();
      if (filter) {
        Object.keys(filter).forEach((key) => {
          const value = (filter as any)[key];
          if (value !== null && value !== undefined && value !== '') {
            params = params.set(key, value);
          }
        });
      }

      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/provident-fund/accounts`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    approveProvidentFundRequest(data: { requestId: string }): Observable<boolean> {
      return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/provident-fund/requests/approve`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    rejectProvidentFundRequest(requestId: string, data: { remarks: string }): Observable<boolean> {
      return this.http.put<ApiResponse<boolean>>(`${environment.apiUrl}/admin/provident-fund/requests/${requestId}/reject`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    addProvidentFundMonthlyTransaction(data: { employeeId: string; periodId: string }): Observable<boolean> {
      return this.http.post<ApiResponse<boolean>>(`${environment.apiUrl}/admin/provident-fund/monthly-transaction`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    manualProvidentFundEnrollment(data: {
      ruleId: string;
      employeeId: string;
      employeePct: number;
      employerPct: number;
      effectiveFrom: string;
    }): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/admin/provident-fund/manual-enroll`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createProvidentFundEnrollmentRequest(data: {
      ruleId: string;
      employeePct: number;
      effectiveFrom: string;
    }): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/provident-fund/enroll`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateProvidentFundEnrollmentRequest(requestId: string, data: {
      ruleId: string;
      employeePct: number;
      effectiveFrom: string;
    }): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${environment.apiUrl}/employee/provident-fund/enroll/${requestId}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateProvidentFundPercentage(data: { ruleId: string; employeePct: number }): Observable<any> {
      const payload = {
        RuleId: data.ruleId,
        EmployeePct: data.employeePct
      };

      return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/provident-fund/update-percentage`, payload)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createProvidentFundWithdrawalRequest(data: { amount: number; withdrawalType: 'temporary' | 'permanent'; reason: string }): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/employee/provident-fund/withdraw`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteProvidentFundRequest(requestId: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${environment.apiUrl}/employee/provident-fund/request/${requestId}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    getMyProvidentFundRequests(filter?: {
      requestType?: string | null;
      status?: string | null;
      page?: number;
      pageSize?: number;
    }): Observable<PagedResult<any>> {
      let params = new HttpParams();
      if (filter) {
        if (filter.requestType !== null && filter.requestType !== undefined && String(filter.requestType).trim()) {
          params = params.set('requestType', String(filter.requestType).trim());
        }
        if (filter.status !== null && filter.status !== undefined && String(filter.status).trim()) {
          params = params.set('status', String(filter.status).trim());
        }
        if (filter.page !== null && filter.page !== undefined) {
          params = params.set('page', String(filter.page));
        }
        if (filter.pageSize !== null && filter.pageSize !== undefined) {
          params = params.set('pageSize', String(filter.pageSize));
        }
      }

      return this.http.get<ApiResponse<any>>(`${environment.apiUrl}/employee/provident-fund/my-pending-request`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            const data = response.data ?? response;
            return {
              items: Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data) ? data.data : []),
              totalCount: Number(data?.totalCount ?? data?.count ?? 0),
              page: Number(data?.page ?? filter?.page ?? 1),
              pageSize: Number(data?.pageSize ?? filter?.pageSize ?? 10)
            };
          })
        );
    }

    getMyActiveProvidentFund(): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${environment.apiUrl}/employee/provident-fund/my-active-request`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    getMyProvidentFundTransactions(filter?: {
      year?: number | null;
      transactionType?: string | null;
      page?: number;
      pageSize?: number;
    }): Observable<any> {
      let params = new HttpParams();
      if (filter) {
        if (filter.year !== null && filter.year !== undefined) {
          params = params.set('year', String(filter.year));
        }
        if (filter.transactionType !== null && filter.transactionType !== undefined && String(filter.transactionType).trim()) {
          params = params.set('transactionType', String(filter.transactionType).trim());
        }
        if (filter.page !== null && filter.page !== undefined) {
          params = params.set('page', String(filter.page));
        }
        if (filter.pageSize !== null && filter.pageSize !== undefined) {
          params = params.set('pageSize', String(filter.pageSize));
        }
      }

      return this.http.get<ApiResponse<any>>(`${environment.apiUrl}/employee/provident-fund/my-transactions`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    // Salary Advance Rules
    getSalaryAdvanceRules(): Observable<any[]> {
      return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/salary-advance-rules`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    getActiveSalaryAdvanceRules(): Observable<any[]> {
      return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/salary-advance-rules/active`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    createProvidentFundRule(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/provident-fund-rules`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateProvidentFundRule(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/provident-fund-rules/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteProvidentFundRule(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/provident-fund-rules/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    // Tax Slabs
    getTaxSlabs(params?: any): Observable<TaxSlabDto[]> {
      return this.http.get<ApiResponse<TaxSlabDto[]>>(`${this.apiUrl}/tax-slabs`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    getActiveTaxSlabs(): Observable<TaxSlabDto[]> {
      return this.http.get<ApiResponse<TaxSlabDto[]>>(`${this.apiUrl}/tax-slabs/active`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    // Tax Regimes
    getTaxRegimes(): Observable<TaxRegimeDto[]> {
      return this.http.get<ApiResponse<TaxRegimeDto[]>>(`${this.apiUrl}/tax-regimes`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    getActiveTaxRegimes(): Observable<TaxRegimeDto[]> {
      return this.http.get<ApiResponse<TaxRegimeDto[]>>(`${this.apiUrl}/tax-regimes/active`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    createTaxRegime(data: {
      country?: string;
      regimeName?: string;
      startDate: string;
      endDate: string;
      isActive: boolean;
    }): Observable<TaxRegimeDto> {
      return this.http.post<ApiResponse<TaxRegimeDto>>(`${this.apiUrl}/tax-regimes`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateTaxRegime(id: string, data: {
      country?: string;
      regimeName?: string;
      startDate: string;
      endDate: string;
      isActive: boolean;
    }): Observable<TaxRegimeDto> {
      return this.http.put<ApiResponse<TaxRegimeDto>>(`${this.apiUrl}/tax-regimes/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteTaxRegime(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/tax-regimes/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    // Tax Categories
    getTaxCategories(): Observable<TaxCategoryDto[]> {
      return this.http.get<ApiResponse<TaxCategoryDto[]>>(`${this.apiUrl}/tax-categories`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    getActiveTaxCategories(): Observable<TaxCategoryDto[]> {
      return this.http.get<ApiResponse<TaxCategoryDto[]>>(`${this.apiUrl}/tax-categories/active`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    getTaxCategoriesByRegimeId(regimeId: string): Observable<TaxCategoryDto[]> {
      return this.http.get<ApiResponse<TaxCategoryDto[]>>(`${this.apiUrl}/tax-categories/regime/${regimeId}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    createTaxCategory(data: { regimeId: string; categoryName?: string; isActive: boolean }): Observable<TaxCategoryDto> {
      return this.http.post<ApiResponse<TaxCategoryDto>>(`${this.apiUrl}/tax-categories`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateTaxCategory(id: string, data: { regimeId: string; categoryName?: string; isActive: boolean }): Observable<TaxCategoryDto> {
      return this.http.put<ApiResponse<TaxCategoryDto>>(`${this.apiUrl}/tax-categories/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteTaxCategory(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/tax-categories/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    createLoanRule(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/loan-rules`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createSalaryAdvanceRule(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/salary-advance-rules`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createTaxSlab(data: any): Observable<TaxSlabDto> {
      return this.http.post<ApiResponse<TaxSlabDto>>(`${this.apiUrl}/tax-slabs`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateTaxSlab(id: string, data: any): Observable<TaxSlabDto> {
      return this.http.put<ApiResponse<TaxSlabDto>>(`${this.apiUrl}/tax-slabs/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteTaxSlab(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/tax-slabs/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    // Tax Component Rules
    getTaxComponentRules(): Observable<TaxComponentRuleDto[]> {
      return this.http.get<ApiResponse<TaxComponentRuleDto[]>>(`${this.apiUrl}/tax-component-rules`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    getActiveTaxComponentRules(): Observable<TaxComponentRuleDto[]> {
      return this.http.get<ApiResponse<TaxComponentRuleDto[]>>(`${this.apiUrl}/tax-component-rules/active`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    createTaxComponentRule(data: {
      regimeId: string;
      componentName?: string;
      taxability?: string;
      limitAmount: number;
      limitPercentage: number;
      applyStage?: string;
    }): Observable<TaxComponentRuleDto> {
      return this.http.post<ApiResponse<TaxComponentRuleDto>>(`${this.apiUrl}/tax-component-rules`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateTaxComponentRule(id: string, data: {
      regimeId: string;
      componentName?: string;
      taxability?: string;
      limitAmount: number;
      limitPercentage: number;
      applyStage?: string;
    }): Observable<TaxComponentRuleDto> {
      return this.http.put<ApiResponse<TaxComponentRuleDto>>(`${this.apiUrl}/tax-component-rules/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteTaxComponentRule(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/tax-component-rules/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    getTaxTransactions(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/tax-transactions`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createTaxTransaction(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/tax-transactions`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    // Social Security
    getSocialSecurityJurisdictions(): Observable<SocialSecurityJurisdictionOption[]> {
      return this.http.get<ApiResponse<SocialSecurityJurisdictionOption[]>>(`${this.apiUrl}/social-security/jurisdictions`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    getSocialSecurityAuthorities(jurisdictionId?: string): Observable<SocialSecurityAuthorityOption[]> {
      const params = jurisdictionId ? { jurisdictionId } : undefined;
      return this.http.get<ApiResponse<SocialSecurityAuthorityOption[]>>(`${this.apiUrl}/social-security/authorities`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    getSocialSecuritySchemes(jurisdictionId?: string, authorityId?: string): Observable<SocialSecuritySchemeOption[]> {
      let params = new HttpParams();
      if (jurisdictionId) {
        params = params.set('jurisdictionId', jurisdictionId);
      }
      if (authorityId) {
        params = params.set('authorityId', authorityId);
      }

      return this.http.get<ApiResponse<SocialSecuritySchemeOption[]>>(`${this.apiUrl}/social-security/schemes`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    getSocialSecurityRules(schemeId?: string): Observable<SocialSecurityRuleOption[]> {
      const params = schemeId ? { schemeId } : undefined;
      return this.http.get<ApiResponse<SocialSecurityRuleOption[]>>(`${this.apiUrl}/social-security/rules`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    createSocialSecurityJurisdiction(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/social-security/jurisdictions`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateSocialSecurityJurisdiction(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/social-security/jurisdictions/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteSocialSecurityJurisdiction(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/social-security/jurisdictions/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    createSocialSecurityAuthority(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/social-security/authorities`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateSocialSecurityAuthority(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/social-security/authorities/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteSocialSecurityAuthority(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/social-security/authorities/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    createSocialSecurityScheme(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/social-security/schemes`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateSocialSecurityScheme(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/social-security/schemes/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteSocialSecurityScheme(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/social-security/schemes/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    createSocialSecurityRule(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/social-security/rules`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateSocialSecurityRule(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/social-security/rules/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteSocialSecurityRule(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/social-security/rules/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    getSocialSecurityConfigs(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/social-security-configs`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    getActiveSocialSecurityConfigs(): Observable<any[]> {
      return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/social-security-configs/active`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || [];
          })
        );
    }

    createSocialSecurityConfig(data: any): Observable<any> {
      const payload = {
        configName: data?.configName,
        description: data?.description ?? null,
        jurisdictionId: data?.jurisdictionId ?? null,
        authorityId: data?.authorityId ?? null,
        schemeId: data?.schemeId ?? null,
        ruleId: data?.ruleId ?? null,
        contributionBasis: data?.contributionBasis ?? 'gross',
        employeeContributionPct: Number(data?.employeeContributionPct ?? data?.employeePercentage ?? 0),
        employerContributionPct: Number(data?.employerContributionPct ?? data?.employerPercentage ?? 0),
        employeeFixedAmount: data?.employeeFixedAmount == null ? null : Number(data.employeeFixedAmount),
        employerFixedAmount: data?.employerFixedAmount == null ? null : Number(data.employerFixedAmount),
        minSalaryLimit: data?.minSalaryLimit == null ? null : Number(data.minSalaryLimit),
        maxSalaryCap: data?.maxSalaryCap ?? data?.maxSalaryCapPkr ?? null,
        currency: data?.currency ?? null,
        isStatutory: data?.isStatutory !== false,
        allowVoluntary: !!data?.allowVoluntary,
        allowWithdrawal: data?.allowWithdrawal !== false,
        metadata: data?.metadata ?? null,
        effectiveFrom: data?.effectiveFrom ?? null,
        effectiveTo: data?.effectiveTo ?? null,
        isActive: typeof data?.isActive === 'boolean'
          ? data.isActive
          : String(data?.status ?? 'active').toLowerCase() !== 'inactive'
      };

      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/social-security-configs`, payload)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateSocialSecurityConfig(id: string, data: any): Observable<any> {
      const payload = {
        configName: data?.configName,
        description: data?.description ?? null,
        jurisdictionId: data?.jurisdictionId ?? null,
        authorityId: data?.authorityId ?? null,
        schemeId: data?.schemeId ?? null,
        ruleId: data?.ruleId ?? null,
        contributionBasis: data?.contributionBasis ?? 'gross',
        employeeContributionPct: Number(data?.employeeContributionPct ?? data?.employeePercentage ?? 0),
        employerContributionPct: Number(data?.employerContributionPct ?? data?.employerPercentage ?? 0),
        employeeFixedAmount: data?.employeeFixedAmount == null ? null : Number(data.employeeFixedAmount),
        employerFixedAmount: data?.employerFixedAmount == null ? null : Number(data.employerFixedAmount),
        minSalaryLimit: data?.minSalaryLimit == null ? null : Number(data.minSalaryLimit),
        maxSalaryCap: data?.maxSalaryCap ?? data?.maxSalaryCapPkr ?? null,
        currency: data?.currency ?? null,
        isStatutory: data?.isStatutory !== false,
        allowVoluntary: !!data?.allowVoluntary,
        allowWithdrawal: data?.allowWithdrawal !== false,
        metadata: data?.metadata ?? null,
        effectiveFrom: data?.effectiveFrom ?? null,
        effectiveTo: data?.effectiveTo ?? null,
        isActive: typeof data?.isActive === 'boolean'
          ? data.isActive
          : String(data?.status ?? 'active').toLowerCase() !== 'inactive'
      };

      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/social-security-configs/${id}`, payload)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteSocialSecurityConfig(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/social-security-configs/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    getSocialSecurityTransactions(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/social-security-transactions`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    getSocialSecurityTransactionById(id: string): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/social-security-transactions/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createSocialSecurityTransaction(data: any): Observable<any> {
      const payload = {
        employeeId: data?.employeeId,
        periodId: data?.periodId,
        configId: data?.configId || null,
        ruleId: data?.ruleId || null,
        actualSalary: Number(data?.actualSalary ?? 0),
        isEnrolled: data?.isEnrolled !== false,
        requestStatus: data?.requestStatus ?? 'pending'
      };

      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/social-security-transactions`, payload)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateSocialSecurityTransaction(id: string, data: any): Observable<any> {
      const payload = {
        configId: data?.configId || null,
        ruleId: data?.ruleId || null,
        actualSalary: Number(data?.actualSalary ?? 0),
        isEnrolled: data?.isEnrolled !== false,
        requestStatus: data?.requestStatus ?? 'pending'
      };

      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/social-security-transactions/${id}`, payload)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteSocialSecurityTransaction(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/social-security-transactions/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    getMySocialSecurityTransactions(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/social-security-transactions/my`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    // Gratuity
    getGratuityConfigs(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/gratuity-configs`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createGratuityConfig(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/gratuity-configs`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateGratuityConfig(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/gratuity-configs/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteGratuityConfig(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/gratuity-configs/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    getGratuityTransactions(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/gratuity-transactions`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createGratuityTransaction(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/gratuity-transactions`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateLoanRule(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/loan-rules/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateSalaryAdvanceRule(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/salary-advance-rules/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateGratuityTransaction(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/gratuity-transactions/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteLoanRule(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/loan-rules/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    deleteSalaryAdvanceRule(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/salary-advance-rules/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    deleteGratuityTransaction(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/gratuity-transactions/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    getPayrollOverview(): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/overview`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    // Loans
    getLoans(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/loans`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createLoan(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/loans`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    requestLoan(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/loans/request`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateLoan(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/loans/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteLoan(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/loans/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    // Loan Payments
    getLoanPayments(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/loan-payments`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createLoanPayment(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/loan-payments`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateLoanPayment(data: any): Observable<boolean> {
      return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/loans/payment`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    deleteLoanPayment(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/loan-payments/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    // Salary Advances (mapped to existing backend endpoints)
    getMySalaryAdvances(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/salary-advance/my-requests`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    getMySalaryAdvanceById(id: string): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/salary-advance/my-requests/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createSalaryAdvanceRequest(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/salary-advance/request`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateMySalaryAdvance(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/salary-advance/my-requests/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    cancelMySalaryAdvance(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/salary-advance/my-requests/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    getAllSalaryAdvanceRequests(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/salary-advance/all`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    getSalaryAdvanceRequestById(id: string): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/salary-advance/all/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    approveSalaryAdvance(id: string): Observable<boolean> {
      return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/salary-advance/${id}/approve`, {})
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    rejectSalaryAdvance(id: string, data: { rejectionReason: string }): Observable<boolean> {
      return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/salary-advance/${id}/reject`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    disburseSalaryAdvance(id: string, data: { disbursementNote?: string | null }): Observable<boolean> {
      return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/salary-advance/${id}/disburse`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    // Backward compatible aliases for older screens.
    getSalaryAdvances(params?: any): Observable<any> {
      return this.getAllSalaryAdvanceRequests(params);
    }

    createSalaryAdvance(data: any): Observable<any> {
      return this.createSalaryAdvanceRequest(data);
    }

    updateSalaryAdvance(id: string, data: any): Observable<any> {
      return this.createSalaryAdvanceRequest(data);
    }

    deleteSalaryAdvance(id: string): Observable<boolean> {
      return this.cancelMySalaryAdvance(id);
    }

    // Advance Payments
    getAdvancePayments(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/advance-payments`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createAdvancePayment(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/advance-payments`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateAdvancePayment(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/advance-payments/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteAdvancePayment(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/advance-payments/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    // Payslips
    getPayslips(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/payslips`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    getPayslipById(id: string): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/payslips/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createPayslip(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/payslips`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    reissuePayslip(id: string, data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/payslips/${id}/reissue`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    bulkGeneratePayslips(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/payslips/bulk-generate`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    bulkEmailPayslips(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/payslips/bulk-email`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    getMyLoans(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/loans/my-requests`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    getMyActiveLoans(): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/loans/my-active-loans`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteLoanRequest(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/loans/my-requests/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    getMyPendingLoans(): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/loans/my-pending-loans`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateLoanRequest(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/loans/my-requests/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    getAllLoans(filter?: any): Observable<any> {
      let params = new HttpParams();
      if (filter) {
        Object.keys(filter).forEach(key => {
          if (filter[key] !== null && filter[key] !== undefined && filter[key] !== '') {
            params = params.set(key, filter[key]);
          }
        });
      }
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/loans/all`, { params }).pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
    }

    getDisbursedLoans(filter?: any): Observable<any> {
      let params = new HttpParams();
      if (filter) {
        Object.keys(filter).forEach(key => {
          if (filter[key] !== null && filter[key] !== undefined && filter[key] !== '') {
            params = params.set(key, filter[key]);
          }
        });
      }
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/loans/disbursed-loans`, { params }).pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
    }

    getDisbursedActiveLoans(filter?: any): Observable<any> {
      let params = new HttpParams();
      if (filter) {
        Object.keys(filter).forEach(key => {
          if (filter[key] !== null && filter[key] !== undefined && filter[key] !== '') {
            params = params.set(key, filter[key]);
          }
        });
      }
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/loans/disbursed-active-loans`, { params }).pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
    }

    addLoanPayment(data: any): Observable<boolean> {
      return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/loans/payment`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
    }

    getAllRepayments(filter?: any): Observable<any> {
      let params = new HttpParams();
      if (filter) {
        Object.keys(filter).forEach(key => {
          if (filter[key] !== null && filter[key] !== undefined && filter[key] !== '') {
            params = params.set(key, filter[key]);
          }
        });
      }
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/repayments/all`, { params }).pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
    }

    getAllProvidentFundRepayments(filter?: any): Observable<any> {
      let params = new HttpParams();
      if (filter) {
        Object.keys(filter).forEach((key) => {
          if (filter[key] !== null && filter[key] !== undefined && filter[key] !== '') {
            params = params.set(key, filter[key]);
          }
        });
      }
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/provident-fund/repayments`, { params }).pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
    }

    updateLoanStatus(data: { loanId: string, requestStatus: string, rejectionReason?: string }): Observable<any> {
      return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/loans/status`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    disburseLoan(data: { loanId: string, startDate: string, endDate: string }): Observable<any> {
      return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/loans/disburse`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    getMyLoanHistory(filter?: any): Observable<any> {
      let params = new HttpParams();
      if (filter) {
        Object.keys(filter).forEach(key => {
          if (filter[key] !== null && filter[key] !== undefined && filter[key] !== '') {
            params = params.set(key, filter[key]);
          }
        });
      }
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/loans/my-loan-history`, { params }).pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
    }

    getMyLoanReferences(): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/loans/my-references`).pipe(
        map((response: any) => {
          if (!response.success && response.message) {
            throw new Error(response.message);
          }
          return response.data;
        })
      );
    }

    // ─── Gratuity (additions) ────────────────────────────────────────────────

    getActiveGratuityConfigs(): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/gratuity-configs/active`).pipe(
        map((response: any) => {
          if (!response.success && response.message) throw new Error(response.message);
          return response.data;
        })
      );
    }

    approveGratuityTransaction(id: string, data: { notes?: string }): Observable<any> {
      return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/gratuity-transactions/${id}/approve`, data).pipe(
        map((response: any) => {
          if (!response.success && response.message) throw new Error(response.message);
          return response.data;
        })
      );
    }

    markGratuityPaid(id: string, data: { notes?: string; periodId?: string | null; paymentMethod?: string; paidAt?: string | null }): Observable<any> {
      return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/gratuity-transactions/${id}/mark-paid`, data).pipe(
        map((response: any) => {
          if (!response.success && response.message) throw new Error(response.message);
          return response.data;
        })
      );
    }

    getMyGratuityStatus(): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/gratuity-transactions/my-status`).pipe(
        map((response: any) => {
          if (!response.success && response.message) throw new Error(response.message);
          return response.data;
        })
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // TIMESHEET → PAYROLL BRIDGE
    // Same endpoints as AttendanceService — mirrored here so payroll components
    // don't need to import from another module.
    // ───────────────────────────────────────────────────────────────────────

    /** List finalized timesheets payroll can attach to a payroll run. */
    getFinalizedTimesheetLinks(): Observable<TimesheetPeriodLinkDto[]> {
      const url = `${environment.apiUrl}/Attendance/timesheet/finalized-links`;
      return this.http.get<ApiResponse<TimesheetPeriodLinkDto[]>>(url).pipe(
        map((response: any) => {
          if (!response.success && response.message) throw new Error(response.message);
          return response.data || [];
        })
      );
    }

    /** Returns the per-employee payroll summary for one finalized timesheet. */
    getTimesheetPayrollSummary(timesheetId: string): Observable<TimesheetPayrollSummaryDto> {
      const url = `${environment.apiUrl}/Attendance/timesheet/payroll-summary`;
      const params = new HttpParams().set('timesheetId', timesheetId);
      return this.http.get<ApiResponse<TimesheetPayrollSummaryDto>>(url, { params }).pipe(
        map((response: any) => {
          if (!response.success && response.message) throw new Error(response.message);
          return response.data;
        })
      );
    }

    /** Lock a finalized timesheet — call after payroll has consumed it. */
    lockTimesheet(timesheetId: string, payrollPeriodId?: string): Observable<boolean> {
      const url = `${environment.apiUrl}/Attendance/timesheet/lock`;
      return this.http.post<ApiResponse<boolean>>(url, { timesheetId, payrollPeriodId }).pipe(
        map((response: any) => {
          if (!response.success && response.message) throw new Error(response.message);
          return response.data ?? false;
        })
      );
    }

    // ────────────────────────────────────────────────────────────────────────────
    //  Social Security — Employee lifecycle (enrollments, requests, claims, docs)
    // ────────────────────────────────────────────────────────────────────────────

    getMySocialSecurityEnrollment(): Observable<SocialSecurityEnrollment | null> {
      return this.http.get<ApiResponse<SocialSecurityEnrollment | null>>(`${this.apiUrl}/social-security/my/enrollment`).pipe(
        map((response: any) => {
          if (!response.success && response.message) throw new Error(response.message);
          return response.data ?? null;
        })
      );
    }

    getMySocialSecurityRequests(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/social-security/my/enrollment-requests`, { params }).pipe(
        map((response: any) => {
          if (!response.success && response.message) throw new Error(response.message);
          return response.data;
        })
      );
    }

    createMySocialSecurityRequest(data: CreateSocialSecurityEnrollmentRequestPayload): Observable<string> {
      return this.http.post<ApiResponse<string>>(`${this.apiUrl}/social-security/my/enrollment-requests`, data).pipe(
        map((response: any) => {
          if (!response.success) throw new Error(response.message || 'Failed to submit request');
          return response.data;
        })
      );
    }

    getSocialSecurityEnrollmentRequests(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/social-security/enrollment-requests`, { params }).pipe(
        map((response: any) => {
          if (!response.success && response.message) throw new Error(response.message);
          return response.data;
        })
      );
    }

    approveSocialSecurityEnrollmentRequest(requestId: string, data: ApproveSocialSecurityEnrollmentRequestPayload): Observable<boolean> {
      return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/social-security/enrollment-requests/${requestId}/approve`, data).pipe(
        map((response: any) => {
          if (!response.success) throw new Error(response.message || 'Failed to approve request');
          return response.data ?? true;
        })
      );
    }

    rejectSocialSecurityEnrollmentRequest(requestId: string, data: RejectSocialSecurityEnrollmentRequestPayload): Observable<boolean> {
      return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/social-security/enrollment-requests/${requestId}/reject`, data).pipe(
        map((response: any) => {
          if (!response.success) throw new Error(response.message || 'Failed to reject request');
          return response.data ?? true;
        })
      );
    }

    getMySocialSecurityClaims(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/social-security/my/claims`, { params }).pipe(
        map((response: any) => {
          if (!response.success && response.message) throw new Error(response.message);
          return response.data;
        })
      );
    }

    createMySocialSecurityClaim(data: CreateSocialSecurityClaimPayload): Observable<string> {
      return this.http.post<ApiResponse<string>>(`${this.apiUrl}/social-security/my/claims`, data).pipe(
        map((response: any) => {
          if (!response.success) throw new Error(response.message || 'Failed to submit claim');
          return response.data;
        })
      );
    }

    getSocialSecurityClaims(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/social-security/claims`, { params }).pipe(
        map((response: any) => {
          if (!response.success && response.message) throw new Error(response.message);
          return response.data;
        })
      );
    }

    approveSocialSecurityClaim(claimId: string, data: ApproveSocialSecurityClaimPayload): Observable<boolean> {
      return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/social-security/claims/${claimId}/approve`, data).pipe(
        map((response: any) => {
          if (!response.success) throw new Error(response.message || 'Failed to approve claim');
          return response.data ?? true;
        })
      );
    }

    rejectSocialSecurityClaim(claimId: string, data: RejectSocialSecurityClaimPayload): Observable<boolean> {
      return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/social-security/claims/${claimId}/reject`, data).pipe(
        map((response: any) => {
          if (!response.success) throw new Error(response.message || 'Failed to reject claim');
          return response.data ?? true;
        })
      );
    }

    markSocialSecurityClaimPaid(claimId: string, data: MarkSocialSecurityClaimPaidPayload): Observable<boolean> {
      return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/social-security/claims/${claimId}/mark-paid`, data).pipe(
        map((response: any) => {
          if (!response.success) throw new Error(response.message || 'Failed to mark claim paid');
          return response.data ?? true;
        })
      );
    }

    getSocialSecurityRequestDocuments(requestId: string): Observable<SocialSecurityRequestDocument[]> {
      return this.http.get<ApiResponse<SocialSecurityRequestDocument[]>>(`${this.apiUrl}/social-security/requests/${requestId}/documents`).pipe(
        map((response: any) => {
          if (!response.success && response.message) throw new Error(response.message);
          return response.data ?? [];
        })
      );
    }

    uploadSocialSecurityFile(file: File): Observable<string> {
      const formData = new FormData();
      formData.append('file', file);
      return this.http.post<{ url: string } | ApiResponse<any>>(`${environment.apiUrl}/uploads/files`, formData).pipe(
        map((res: any) => {
          const url = res?.url ?? res?.data?.url;
          if (!url) throw new Error('Upload failed');
          return url as string;
        })
      );
    }
}

// ────────────────────────────────────────────────────────────────────────────
//  Social Security — Employee lifecycle interfaces
// ────────────────────────────────────────────────────────────────────────────

export interface SocialSecurityEnrollment {
  enrollmentId: string;
  organizationId: string;
  employeeId: string;
  ruleId: string;
  ruleName?: string;
  schemeId?: string;
  schemeName?: string;
  configId?: string;
  configName?: string;
  externalMemberId?: string;
  enrollmentType: string;
  enrollmentStatus: string;
  effectiveDate: string;
  endDate?: string | null;
  employeeCustomPct?: number | null;
  employerCustomPct?: number | null;
  salaryCapOverride?: number | null;
  ruleEmployeeDefaultPct?: number | null;
  ruleEmployerDefaultPct?: number | null;
  contributionBasis?: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SocialSecurityEnrollmentRequest {
  requestId: string;
  organizationId: string;
  employeeId: string;
  employeeName: string;
  enrollmentId?: string | null;
  ruleId?: string | null;
  ruleName?: string | null;
  configId?: string | null;
  configName?: string | null;
  requestType: string;
  requestStatus: string;
  requestedAt: string;
  reason?: string | null;
  remarks?: string | null;
  rejectionReason?: string | null;
  requestedEmployeePct?: number | null;
  requestedEmployerPct?: number | null;
  requestedSalaryCap?: number | null;
  requestedEffectiveDate?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  processedAt?: string | null;
  documentCount: number;
}

export interface SocialSecurityClaim {
  claimId: string;
  organizationId: string;
  employeeId: string;
  employeeName: string;
  enrollmentId?: string | null;
  requestId?: string | null;
  claimType: string;
  claimStatus: string;
  claimDate: string;
  incidentDate?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  currency?: string | null;
  claimedAmount?: number | null;
  approvedAmount?: number | null;
  paidAmount?: number | null;
  paymentReference?: string | null;
  paymentDate?: string | null;
  authorityReference?: string | null;
  decisionNotes?: string | null;
  rejectionReason?: string | null;
  documentCount: number;
}

export interface SocialSecurityRequestDocument {
  documentId: string;
  requestId?: string | null;
  claimId?: string | null;
  organizationId: string;
  employeeId: string;
  documentType: string;
  documentName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
  issuer?: string | null;
  issuedDate?: string | null;
  expiryDate?: string | null;
  verifiedStatus: string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface SocialSecurityRequestDocumentInput {
  documentType: string;
  documentName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
  issuer?: string | null;
  issuedDate?: string | null;
  expiryDate?: string | null;
}

export interface CreateSocialSecurityEnrollmentRequestPayload {
  ruleId?: string | null;
  configId?: string | null;
  requestType: string;
  reason?: string | null;
  requestedEmployeePct?: number | null;
  requestedEmployerPct?: number | null;
  requestedSalaryCap?: number | null;
  requestedEffectiveDate?: string | null;
  documents: SocialSecurityRequestDocumentInput[];
}

export interface ApproveSocialSecurityEnrollmentRequestPayload {
  remarks?: string | null;
  overrideEmployeePct?: number | null;
  overrideEmployerPct?: number | null;
  overrideSalaryCap?: number | null;
  effectiveDate?: string | null;
}

export interface RejectSocialSecurityEnrollmentRequestPayload {
  rejectionReason?: string | null;
}

export interface CreateSocialSecurityClaimPayload {
  claimType: string;
  incidentDate?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  currency?: string | null;
  claimedAmount?: number | null;
  decisionNotes?: string | null;
  documents: SocialSecurityRequestDocumentInput[];
}

export interface ApproveSocialSecurityClaimPayload {
  approvedAmount: number;
  decisionNotes?: string | null;
}

export interface RejectSocialSecurityClaimPayload {
  rejectionReason?: string | null;
}

export interface MarkSocialSecurityClaimPaidPayload {
  paidAmount: number;
  paymentDate: string;
  paymentReference?: string | null;
  authorityReference?: string | null;
}
