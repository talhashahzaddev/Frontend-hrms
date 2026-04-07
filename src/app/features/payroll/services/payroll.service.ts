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

    // Tax Slabs
    getTaxSlabs(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/tax-slabs`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createTaxSlab(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/tax-slabs`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateTaxSlab(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/tax-slabs/${id}`, data)
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

    // Social Security
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

    createSocialSecurityConfig(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/social-security-configs`, data)
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
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/social-security-configs/${id}`, data)
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

    updateLoanPayment(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/loan-payments/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
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

    // Salary Advances
    getSalaryAdvances(params?: any): Observable<any> {
      return this.http.get<ApiResponse<any>>(`${this.apiUrl}/salary-advances`, { params })
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    createSalaryAdvance(data: any): Observable<any> {
      return this.http.post<ApiResponse<any>>(`${this.apiUrl}/salary-advances`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    updateSalaryAdvance(id: string, data: any): Observable<any> {
      return this.http.put<ApiResponse<any>>(`${this.apiUrl}/salary-advances/${id}`, data)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data;
          })
        );
    }

    deleteSalaryAdvance(id: string): Observable<boolean> {
      return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/salary-advances/${id}`)
        .pipe(
          map((response: any) => {
            if (!response.success && response.message) {
              throw new Error(response.message);
            }
            return response.data || response.success;
          })
        );
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
}
