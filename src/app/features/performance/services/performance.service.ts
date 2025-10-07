import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  PerformanceSummary,
  SkillSet,
  EmployeeSkill,
  AppraisalCycle,
  EmployeeAppraisal,
  KRA,
  CreateSkillSetRequest,
  UpdateSkillSetRequest,
  CreateEmployeeSkillRequest,
  UpdateEmployeeSkillRequest,
  CreateAppraisalCycleRequest,
  UpdateAppraisalCycleRequest,
  SubmitAppraisalRequest,
  ReviewAppraisalRequest,
  CreateKRARequest,
  UpdateKRARequest,
  SkillSetFilter,
  EmployeeSkillFilter,
  AppraisalFilter,
  PerformanceReportFilter,
  CreateAppraisal,
  CreateGoalRequest,
  Goal
} from '../../../core/models/performance.models';
import { ApiResponse, PaginatedResponse } from '../../../core/models/common.models';




@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private apiUrl = environment.apiUrl;
  private performanceSummarySubject = new BehaviorSubject<PerformanceSummary | null>(null);

  public performanceSummary$ = this.performanceSummarySubject.asObservable();

  constructor(private http: HttpClient) {}

  // Performance Dashboard
  getPerformanceSummary(cycleId:string): Observable<ApiResponse<PerformanceSummary>> {
    return this.http.get<ApiResponse<PerformanceSummary>>(`${this.apiUrl}/performance/summary/?cycleId=${cycleId}`);
  }

  refreshPerformanceSummary(cycleId:string): void {
    this.getPerformanceSummary(cycleId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.performanceSummarySubject.next(response.data);
        }
      },
      error: (error) => {
        console.error('Error refreshing performance summary:', error);
      }
    });
  }

  // Skill Sets Management
  getSkillSets(filter?: SkillSetFilter, page: number = 1, limit: number = 20): Observable<ApiResponse<PaginatedResponse<SkillSet>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filter) {
      if (filter.category) params = params.set('category', filter.category);
      if (filter.isActive !== undefined) params = params.set('isActive', filter.isActive.toString());
      if (filter.search) params = params.set('search', filter.search);
    }

    return this.http.get<ApiResponse<PaginatedResponse<SkillSet>>>(`${this.apiUrl}/performance/skillsets`, { params });
  }

  getSkillSetById(id: string): Observable<ApiResponse<SkillSet>> {
    return this.http.get<ApiResponse<SkillSet>>(`${this.apiUrl}/performance/skillsets/${id}`);
  }

  createSkillSet(request: CreateSkillSetRequest): Observable<ApiResponse<SkillSet>> {
    return this.http.post<ApiResponse<SkillSet>>(`${this.apiUrl}/performance/skillsets`, request);
  }

  updateSkillSet(id: string, request: UpdateSkillSetRequest): Observable<ApiResponse<SkillSet>> {
    return this.http.put<ApiResponse<SkillSet>>(`${this.apiUrl}/performance/skillsets/${id}`, request);
  }

  deleteSkillSet(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/performance/skillsets/${id}`);
  }

  // Employee Skills Management
  getEmployeeSkills(filter?: EmployeeSkillFilter, page: number = 1, limit: number = 20): Observable<ApiResponse<PaginatedResponse<EmployeeSkill>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filter) {
      if (filter.employeeId) params = params.set('employeeId', filter.employeeId);
      if (filter.skillSetId) params = params.set('skillSetId', filter.skillSetId);
      if (filter.department) params = params.set('department', filter.department);
      if (filter.proficiencyLevel) params = params.set('proficiencyLevel', filter.proficiencyLevel.toString());
      if (filter.search) params = params.set('search', filter.search);
    }

    return this.http.get<ApiResponse<PaginatedResponse<EmployeeSkill>>>(`${this.apiUrl}/performance/employee-skills`, { params });
  }

  getEmployeeSkillsByEmployee(employeeId: string): Observable<ApiResponse<EmployeeSkill[]>> {
    return this.http.get<ApiResponse<EmployeeSkill[]>>(`${this.apiUrl}/performance/employees/${employeeId}/skills`);
  }

  getEmployeeSkillById(id: string): Observable<ApiResponse<EmployeeSkill>> {
    return this.http.get<ApiResponse<EmployeeSkill>>(`${this.apiUrl}/performance/employee-skills/${id}`);
  }

  createEmployeeSkill(request: CreateEmployeeSkillRequest): Observable<ApiResponse<EmployeeSkill>> {
    return this.http.post<ApiResponse<EmployeeSkill>>(`${this.apiUrl}/performance/employee-skills`, request);
  }

  updateEmployeeSkill(id: string, request: UpdateEmployeeSkillRequest): Observable<ApiResponse<EmployeeSkill>> {
    return this.http.put<ApiResponse<EmployeeSkill>>(`${this.apiUrl}/performance/employee-skills/${id}`, request);
  }

  deleteEmployeeSkill(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/performance/employee-skills/${id}`);
  }

  // KRA Management
  getKRAs(page: number = 1, limit: number = 20, search?: string): Observable<ApiResponse<PaginatedResponse<KRA>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<ApiResponse<PaginatedResponse<KRA>>>(`${this.apiUrl}/performance/kras`, { params });
  }

  getKRAById(id: string): Observable<ApiResponse<KRA>> {
    return this.http.get<ApiResponse<KRA>>(`${this.apiUrl}/performance/kras/${id}`);
  }

  createKRA(request: CreateKRARequest): Observable<ApiResponse<KRA>> {
    return this.http.post<ApiResponse<KRA>>(`${this.apiUrl}/performance/kras`, request);
  }

  updateKRA(id: string, request: UpdateKRARequest): Observable<ApiResponse<KRA>> {
    return this.http.put<ApiResponse<KRA>>(`${this.apiUrl}/performance/kras/${id}`, request);
  }

  deleteKRA(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/performance/kras/${id}`);
  }

  // Appraisal Cycles Management
 getAppraisalCycles(page: number = 1, limit: number = 20, search?: string): Observable<ApiResponse<AppraisalCycle[]>> {
  let params = new HttpParams()
    .set('page', page.toString())
    .set('limit', limit.toString());

  if (search) {
    params = params.set('search', search);
  }

  return this.http.get<ApiResponse<AppraisalCycle[]>>(`${this.apiUrl}/performance/cycles`, { params });
}


  getAppraisalCycleById(id: string): Observable<ApiResponse<AppraisalCycle>> {
    return this.http.get<ApiResponse<AppraisalCycle>>(`${this.apiUrl}/performance/appraisal-cycles/${id}`);
  }
//appraisal Cycle
  createAppraisalCycle(request: CreateAppraisalCycleRequest): Observable<ApiResponse<AppraisalCycle>> {
    return this.http.post<ApiResponse<AppraisalCycle>>(`${this.apiUrl}/performance/cycles`, request);
  }

  updateAppraisalCycle(id: string, request: UpdateAppraisalCycleRequest): Observable<ApiResponse<AppraisalCycle>> {
    return this.http.put<ApiResponse<AppraisalCycle>>(`${this.apiUrl}/performance/appraisal-cycles/${id}`, request);
  }

  deleteAppraisalCycle(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/performance/appraisal-cycles/${id}`);
  }

// Create Employee Appraisal
createAppraisal(request: CreateAppraisal): Observable<ApiResponse<EmployeeAppraisal>> {
  return this.http.post<ApiResponse<EmployeeAppraisal>>(
    `${this.apiUrl}/Performance/appraisals`,
    request
  );
}
//get appraisal by id

// Get employee appraisals by cycle
getEmployeeAppraisalsByCycle(cycleId: string, employeeId: string): Observable<ApiResponse<EmployeeAppraisal[]>> {
  return this.http.get<ApiResponse<EmployeeAppraisal[]>>(
    `${this.apiUrl}/Performance/cycles/${cycleId}/appraisals?employeeId=${employeeId}`
  );
}




  // Employee Appraisals Management
  getEmployeeAppraisals(filter?: AppraisalFilter, page: number = 1, limit: number = 20): Observable<ApiResponse<PaginatedResponse<EmployeeAppraisal>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filter) {
      if (filter.appraisalCycleId) params = params.set('appraisalCycleId', filter.appraisalCycleId);
      if (filter.status) params = params.set('status', filter.status);
      if (filter.department) params = params.set('department', filter.department);
      if (filter.employeeId) params = params.set('employeeId', filter.employeeId);
      if (filter.managerId) params = params.set('managerId', filter.managerId);
      if (filter.search) params = params.set('search', filter.search);
    }

    return this.http.get<ApiResponse<PaginatedResponse<EmployeeAppraisal>>>(`${this.apiUrl}/performance/appraisals`, { params });
  }

  getEmployeeAppraisalsByEmployee(employeeId: string): Observable<ApiResponse<EmployeeAppraisal[]>> {
    return this.http.get<ApiResponse<EmployeeAppraisal[]>>(`${this.apiUrl}/performance/employees/${employeeId}/appraisals`);
  }

  getEmployeeAppraisalById(id: string): Observable<ApiResponse<EmployeeAppraisal>> {
    return this.http.get<ApiResponse<EmployeeAppraisal>>(`${this.apiUrl}/performance/appraisals/${id}`);
  }

  submitAppraisal(appraisalId: string, request: SubmitAppraisalRequest): Observable<ApiResponse<EmployeeAppraisal>> {
    return this.http.put<ApiResponse<EmployeeAppraisal>>(`${this.apiUrl}/performance/appraisals/${appraisalId}/submit`, request);
  }

  reviewAppraisal(appraisalId: string, request: ReviewAppraisalRequest): Observable<ApiResponse<EmployeeAppraisal>> {
    return this.http.put<ApiResponse<EmployeeAppraisal>>(`${this.apiUrl}/performance/appraisals/${appraisalId}/review`, request);
  }




 

  // Performance Reports
  generatePerformanceReport(filter?: PerformanceReportFilter): Observable<ApiResponse<any>> {
    let params = new HttpParams();

    if (filter) {
      if (filter.startDate) params = params.set('startDate', filter.startDate);
      if (filter.endDate) params = params.set('endDate', filter.endDate);
      if (filter.department) params = params.set('department', filter.department);
      if (filter.appraisalCycleId) params = params.set('appraisalCycleId', filter.appraisalCycleId);
      if (filter.rating) params = params.set('rating', filter.rating.toString());
    }

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/performance/reports`, { params });
  }

  exportPerformanceReport(filter?: PerformanceReportFilter): Observable<Blob> {
    let params = new HttpParams();

    if (filter) {
      if (filter.startDate) params = params.set('startDate', filter.startDate);
      if (filter.endDate) params = params.set('endDate', filter.endDate);
      if (filter.department) params = params.set('department', filter.department);
      if (filter.appraisalCycleId) params = params.set('appraisalCycleId', filter.appraisalCycleId);
      if (filter.rating) params = params.set('rating', filter.rating.toString());
    }

    return this.http.get(`${this.apiUrl}/performance/reports/export`, {
      params,
      responseType: 'blob'
    });
  }

  // Dashboard Refresh
  refreshDashboardData(cycleId:string): void {
    this.refreshPerformanceSummary(cycleId);
  }

//Goals 

createGoal(request: CreateGoalRequest): Observable<ApiResponse<Goal>> {
  return this.http.post<ApiResponse<Goal>>(`${this.apiUrl}/performance/goals`, request);
}

//get all goals

// Get all goals (for manager)
getAllGoals(): Observable<ApiResponse<Goal[]>> {
  return this.http.get<ApiResponse<Goal[]>>(`${this.apiUrl}/performance/goals`);
}

//Get api by id

/** Get goals by employee ID */
getGoalsByEmployeeId(employeeId: string): Observable<ApiResponse<Goal[]>> {
  return this.http.get<ApiResponse<Goal[]>>(`${this.apiUrl}/performance/goals/employee/${employeeId}`);
}

// Get goal Completed

// Mark a goal as completed
completeGoal(goalId: string): Observable<ApiResponse<any>> {
  return this.http.put<ApiResponse<any>>(
    `${this.apiUrl}/Performance/Goals/${goalId}/complete`,
    {}
  );
}








  // Additional methods for dashboard
  getMyAppraisals(): Observable<ApiResponse<EmployeeAppraisal[]>> {
    return this.http.get<ApiResponse<EmployeeAppraisal[]>>(`${this.apiUrl}/performance/appraisals/my-appraisals`);
  }

  getTeamPerformanceSummary(): Observable<ApiResponse<PerformanceSummary>> {
    return this.http.get<ApiResponse<PerformanceSummary>>(`${this.apiUrl}/performance/team-summary`);
  }

  getMyPerformanceMetrics(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/performance/my-metrics`);
  }

  getMySkills(): Observable<ApiResponse<EmployeeSkill[]>> {
    return this.http.get<ApiResponse<EmployeeSkill[]>>(`${this.apiUrl}/performance/skills`);
  }

  // Skills Matrix
  getSkillsMatrix(): Observable<{ data: SkillSet[]; success: boolean; message: string; errors: any }> {
    return this.http.get<{ data: SkillSet[]; success: boolean; message: string; errors: any }>(`${this.apiUrl}/Performance/skills`);
  }
}
