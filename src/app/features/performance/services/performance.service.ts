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
  AppraisalCycleDto,
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
  SelfAssessment,
  CreateSelfAssessmentRequest,
  ManagerReview,
  ManagerReviewRequest,
  ManagerReviewDto,
  ConsolidateAppraisalRequest,
  EmployeePerformanceHistory,
  EmployeeAppraisalForEmployee,
  TeamPerformanceOverview,
  Goal,
  CreateGoalRequest,
  UpdateGoalRequest,
  HrReviewDto,
  SkillWithEmployees,
  EmployeeSkillSummary,
  EmployeeSkillFullDetail,
  PagedResult
} from '../../../core/models/performance.models';
import { ApiResponse, PaginatedResponse } from '../../../core/models/common.models';

export interface ServiceResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

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
//My performance service
getMyPerformanceSummary(): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/Performance/My/summary`);
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
  getSkillSets(params?: {
    search?: string;
    category?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Observable<ServiceResponse<PagedResult<SkillSet>>> {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.category) httpParams = httpParams.set('category', params.category);
    if (params?.isActive !== undefined) httpParams = httpParams.set('isActive', String(params.isActive));
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<ServiceResponse<PagedResult<SkillSet>>>(`${this.apiUrl}/Performance/skills`, { params: httpParams });
  }

  getSkillWithEmployees(skillId: string): Observable<ServiceResponse<SkillWithEmployees>> {
    return this.http.get<ServiceResponse<SkillWithEmployees>>(`${this.apiUrl}/Performance/skills/${skillId}`);
  }

  toggleSkillStatus(skillId: string): Observable<ServiceResponse<SkillSet>> {
    return this.http.patch<ServiceResponse<SkillSet>>(`${this.apiUrl}/Performance/skills/${skillId}/toggle-status`, {});
  }

  getSkillSetById(id: string): Observable<ApiResponse<SkillSet>> {
    return this.http.get<ApiResponse<SkillSet>>(`${this.apiUrl}/Performance/skillsets/${id}`);
  }

  // createSkillSet(request: CreateSkillSetRequest): Observable<ApiResponse<SkillSet>> {
  //   return this.http.post<ApiResponse<SkillSet>>(`${this.apiUrl}/performance/skillsets`, request);
  // }

  updateSkillSet(id: string, request: UpdateSkillSetRequest): Observable<ApiResponse<SkillSet>> {
    return this.http.put<ApiResponse<SkillSet>>(`${this.apiUrl}/performance/skillsets/${id}`, request);
  }

  deleteSkill(skillId: string): Observable<ServiceResponse<boolean>> {
    return this.http.delete<ServiceResponse<boolean>>(`${this.apiUrl}/Performance/skills/${skillId}`);
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

  getMyTeamEmployeeSkills(filter?: EmployeeSkillFilter, page: number = 1, limit: number = 20): Observable<ApiResponse<PaginatedResponse<EmployeeSkill>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filter) {
      if (filter.employeeId) params = params.set('employeeId', filter.employeeId);
      if (filter.skillSetId) params = params.set('skillSetId', filter.skillSetId);
      if (filter.proficiencyLevel) params = params.set('proficiencyLevel', filter.proficiencyLevel.toString());
      if (filter.search) params = params.set('search', filter.search);
    }

    return this.http.get<ApiResponse<PaginatedResponse<EmployeeSkill>>>(`${this.apiUrl}/Performance/employee-skills/my-team`, { params });
  }

  getEmployeeSkillsByEmployee(employeeId: string): Observable<ApiResponse<EmployeeSkill[]>> {
    return this.http.get<ApiResponse<EmployeeSkill[]>>(`${this.apiUrl}/performance/employees/${employeeId}/skills`);
  }

  getOtherEmployeeSkills(employeeId: string): Observable<ApiResponse<EmployeeSkill[]>> {
    return this.http.get<ApiResponse<EmployeeSkill[]>>(`${this.apiUrl}/Performance/Otheremployees/${employeeId}/skills`);
  }

  getEmployeeSkillById(id: string): Observable<ApiResponse<EmployeeSkill>> {
    return this.http.get<ApiResponse<EmployeeSkill>>(`${this.apiUrl}/performance/employee-skills/${id}`);
  }

  createEmployeeSkill(request: CreateEmployeeSkillRequest): Observable<ApiResponse<EmployeeSkill>> {
    return this.http.post<ApiResponse<EmployeeSkill>>(`${this.apiUrl}/Performance/create-Employee-skills`, request);
  }

  updateEmployeeSkill(id: string, request: UpdateEmployeeSkillRequest): Observable<ApiResponse<EmployeeSkill>> {
    return this.http.put<ApiResponse<EmployeeSkill>>(`${this.apiUrl}/performance/employee-skills/${id}`, request);
  }

  deleteEmployeeSkill(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/performance/employee-skills/${id}`);
  }


getKRAs(
  page: number = 1,
  limit: number = 20,
  search?: string
): Observable<ApiResponse<PaginatedResponse<KRA>>> {

  let params = new HttpParams()
    .set('page', page.toString())
    .set('limit', limit.toString());

  if (search && search.trim()) {
    params = params.set('search', search.trim());
  }

  return this.http.get<ApiResponse<PaginatedResponse<KRA>>>(
    `${this.apiUrl}/Performance/get-allKra`,
    { params }
  );
}


  getKRAById(id: string): Observable<ApiResponse<KRA>> {
    return this.http.get<ApiResponse<KRA>>(`${this.apiUrl}/Performance/KraById/${id}`);
  }

  getAllKRAs(): Observable<ApiResponse<KRA[]>> {
    return this.http.get<ApiResponse<KRA[]>>(`${this.apiUrl}/Performance/get-allKra?page=1&limit=1000`);
  }

  createKRA(request: CreateKRARequest): Observable<ApiResponse<KRA>> {
  let params = new HttpParams();

  params = params.set('Title', request.title);

  if (request.kraDescription) {
    params = params.set('KraDescription', request.kraDescription);
  }

  params = params.set('CycleId', request.cycleId);

  if (request.isActive !== undefined) {
    params = params.set('IsActive', request.isActive.toString());
  }

  return this.http.post<ApiResponse<KRA>>(
    `${this.apiUrl}/Performance/create-Kra`,
    {},
    { params }
  );
}

updateKRA(id: string, request: UpdateKRARequest): Observable<ApiResponse<KRA>> {
  let params = new HttpParams();

  params = params.set('kraId', id);
  params = params.set('Title', request.title);

  if (request.kraDescription) {
    params = params.set('KraDescription', request.kraDescription);
  }

  params = params.set('CycleId', request.cycleId);
  params = params.set('IsActive', request.isActive.toString());

  return this.http.put<ApiResponse<KRA>>(
    `${this.apiUrl}/Performance/KraUpdate`,
    {},
    { params }
  );
}


  updateKRAStatus(id: string, isActive: boolean): Observable<ApiResponse<string>> {
    return this.http.patch<ApiResponse<string>>(`${this.apiUrl}/Performance/KRAStatus/${id}?isActive=${isActive}`, {});
  }

  deleteKRA(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/Performance/Kra/${id}`);
  }

  // Appraisal Cycles Management
  getAppraisalCycles(): Observable<ApiResponse<AppraisalCycle[]>> {
    return this.http.get<ApiResponse<AppraisalCycle[]>>(`${this.apiUrl}/Performance/get-allcycles`);
  }

  getAppraisalCycleById(id: string): Observable<ApiResponse<AppraisalCycle>> {
    return this.http.get<ApiResponse<AppraisalCycle>>(`${this.apiUrl}/Performance/cycles/${id}`);
  }

  getActiveAppraisalCycle(): Observable<ApiResponse<AppraisalCycle>> {
    return this.http.get<ApiResponse<AppraisalCycle>>(`${this.apiUrl}/Performance/cycles/active`);
  }

 createAppraisalCycle(request: CreateAppraisalCycleRequest): Observable<ApiResponse<AppraisalCycle>> {
    return this.http.post<ApiResponse<AppraisalCycle>>(`${this.apiUrl}/Performance/create-cycles`, request);
}


  updateAppraisalCycle(cycleId: string, request: UpdateAppraisalCycleRequest): Observable<ApiResponse<AppraisalCycle>> {
    return this.http.put<ApiResponse<AppraisalCycle>>(`${this.apiUrl}/Performance/cycles/${cycleId}`, request);
  }

  deleteAppraisalCycle(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/Performance/delete-cycle/${id}`);
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

    return this.http.get<ApiResponse<PaginatedResponse<EmployeeAppraisal>>>(`${this.apiUrl}/Performance/appraisals`, { params });
  }

  getEmployeeAppraisalsByEmployee(employeeId: string): Observable<ApiResponse<EmployeeAppraisal[]>> {
    return this.http.get<ApiResponse<EmployeeAppraisal[]>>(`${this.apiUrl}/performance/employees/${employeeId}/appraisals`);
  }

  getEmployeeAppraisalById(id: string): Observable<ApiResponse<EmployeeAppraisal>> {
    return this.http.get<ApiResponse<EmployeeAppraisal>>(`${this.apiUrl}/Performance/appraisals/${id}`);
  }

  deleteAppraisal(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/Performance/appraisals/${id}`);
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

  // Additional methods for dashboard
  getTeamPerformanceSummary(): Observable<ApiResponse<PerformanceSummary>> {
    return this.http.get<ApiResponse<PerformanceSummary>>(`${this.apiUrl}/performance/team-summary`);
  }

  getMyPerformanceMetrics(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/performance/my-metrics`);
  }

  getMySkills(): Observable<ServiceResponse<EmployeeSkill[]>> {
    return this.http.get<ServiceResponse<EmployeeSkill[]>>(`${this.apiUrl}/Performance/my-skills`);
  }

  addMySkill(request: CreateEmployeeSkillRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Performance/my-skills`, request);
  }

  updateMySkill(employeeSkillId: string, request: UpdateEmployeeSkillRequest): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/Performance/my-skills/${employeeSkillId}`, request);
  }

  deleteMySkill(employeeSkillId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/Performance/my-skills/${employeeSkillId}`);
  }

  getAllEmployeeSkills(params?: {
    employeeId?: string;
    skillSetId?: string;
    department?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<ServiceResponse<PagedResult<EmployeeSkillSummary>>> {
    let httpParams = new HttpParams();
    if (params?.employeeId) httpParams = httpParams.set('employeeId', params.employeeId);
    if (params?.skillSetId) httpParams = httpParams.set('skillSetId', params.skillSetId);
    if (params?.department) httpParams = httpParams.set('department', params.department);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<ServiceResponse<PagedResult<EmployeeSkillSummary>>>(`${this.apiUrl}/Performance/employee-skills`, { params: httpParams });
  }

  getTeamSelfAddedSkills(params?: {
    employeeId?: string;
    skillSetId?: string;
    department?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<ServiceResponse<PagedResult<EmployeeSkill>>> {
    let httpParams = new HttpParams();
    if (params?.employeeId) httpParams = httpParams.set('employeeId', params.employeeId);
    if (params?.skillSetId) httpParams = httpParams.set('skillSetId', params.skillSetId);
    if (params?.department) httpParams = httpParams.set('department', params.department);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<ServiceResponse<PagedResult<EmployeeSkill>>>(`${this.apiUrl}/Performance/employee-skills/team-summary`, { params: httpParams });
  }

  getEmployeeSkillDetail(employeeId: string): Observable<ServiceResponse<EmployeeSkillFullDetail>> {
    return this.http.get<ServiceResponse<EmployeeSkillFullDetail>>(`${this.apiUrl}/Performance/employee-skills/detail/${employeeId}`);
  }

  assessEmployeeSkill(employeeSkillId: string, request: UpdateEmployeeSkillRequest): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/Performance/employee-skills/${employeeSkillId}/assess`, request);
  }
  
  // Skills Matrix
  // getSkillsMatrix(): Observable<{ data: SkillSet[]; success: boolean; message: string; errors: any }> {
  //   return this.http.get<{ data: SkillSet[]; success: boolean; message: string; errors: any }>(`${this.apiUrl}/Performance/skills`);
  // }
  getSkillsMatrix(): Observable<{ data: SkillSet[]; success: boolean; message: string; errors: any }> {
    return this.http.get<{ data: SkillSet[]; success: boolean; message: string; errors: any }>(`${this.apiUrl}/Performance/skills`);
  }

  createSkillSet(request: CreateSkillSetRequest): Observable<ServiceResponse<SkillSet>> {
    return this.http.post<ServiceResponse<SkillSet>>(`${this.apiUrl}/Performance/skills`, request);
  }

  // Self-Assessment Management
  createSelfAssessment(request: CreateSelfAssessmentRequest): Observable<ApiResponse<SelfAssessment>> {
    return this.http.post<ApiResponse<SelfAssessment>>(`${this.apiUrl}/Performance/create-selfassessment`, request);
  }

  getSelfAssessments(employeeId: string, cycleId: string): Observable<ApiResponse<SelfAssessment[]>> {
    return this.http.get<ApiResponse<SelfAssessment[]>>(`${this.apiUrl}/Performance/SelfAssessment/${employeeId}/${cycleId}`);
  }

  getMySelfAssessments(filter?: { cycleId?: string; kraId?: string; search?: string }): Observable<ApiResponse<SelfAssessment[]>> {
    let params = new HttpParams();
    if (filter) {
      if (filter.cycleId) params = params.set('cycleId', filter.cycleId);
      if (filter.kraId) params = params.set('kraId', filter.kraId);
      if (filter.search) params = params.set('search', filter.search);
    }
    return this.http.get<ApiResponse<SelfAssessment[]>>(`${this.apiUrl}/Performance/SelfAssessment/my`, { params });
  }

  getMyAppraisals(filter?: { cycleId?: string; kraId?: string; search?: string; status?: string }): Observable<ApiResponse<EmployeeAppraisalForEmployee[]>> {
    let params = new HttpParams();
    if (filter) {
      if (filter.cycleId) params = params.set('cycleId', filter.cycleId);
      if (filter.kraId) params = params.set('kraId', filter.kraId);
      if (filter.search) params = params.set('search', filter.search);
      if (filter.status) params = params.set('status', filter.status);
    }
    return this.http.get<ApiResponse<EmployeeAppraisalForEmployee[]>>(`${this.apiUrl}/Performance/appraisals/my-appraisals`, { params });
  }

  getMyTeamEmployees(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/Performance/appraisals/my-team-employees`);
  }

  getMyCreatedAppraisals(filter?: AppraisalFilter, page: number = 1, limit: number = 20): Observable<ApiResponse<PaginatedResponse<EmployeeAppraisal>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filter) {
      if (filter.appraisalCycleId) params = params.set('appraisalCycleId', filter.appraisalCycleId);
      if (filter.status) params = params.set('status', filter.status);
      if (filter.employeeId) params = params.set('employeeId', filter.employeeId);
      if (filter.search) params = params.set('search', filter.search);
    }

    return this.http.get<ApiResponse<PaginatedResponse<EmployeeAppraisal>>>(`${this.apiUrl}/Performance/appraisals/my-created-appraisals`, { params });
  }

  submitSelfAssessment(employeeId: string, cycleId: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/Performance/SelfAssessment/Submit`, {
      employeeId,
      cycleId
    });
  }

  getTeamSelfAssessments(managerId: string, cycleId: string): Observable<ApiResponse<SelfAssessment[]>> {
    return this.http.get<ApiResponse<SelfAssessment[]>>(`${this.apiUrl}/Performance/Manager/Self-Assessments/${managerId}/${cycleId}`);
  }

  getAllEmployeeSelfAssessments(filter?: { cycleId?: string; employeeId?: string; kraId?: string; search?: string }): Observable<ApiResponse<SelfAssessment[]>> {
    let params = new HttpParams();
    if (filter) {
      if (filter.cycleId) params = params.set('cycleId', filter.cycleId);
      if (filter.employeeId) params = params.set('employeeId', filter.employeeId);
      if (filter.kraId) params = params.set('kraId', filter.kraId);
      if (filter.search) params = params.set('search', filter.search);
    }
    return this.http.get<ApiResponse<SelfAssessment[]>>(`${this.apiUrl}/Performance/selfassessment/my`, { params });
  }


  getMyTeamSelfAssessments(filter?: { cycleId?: string; employeeId?: string; kraId?: string; search?: string }): Observable<ApiResponse<SelfAssessment[]>> {
    let params = new HttpParams();
    if (filter) {
      if (filter.cycleId) params = params.set('cycleId', filter.cycleId);
      if (filter.employeeId) params = params.set('employeeId', filter.employeeId);
      if (filter.kraId) params = params.set('kraId', filter.kraId);
      if (filter.search) params = params.set('search', filter.search);
    }
    return this.http.get<ApiResponse<SelfAssessment[]>>(`${this.apiUrl}/Performance/selfassessment/team`, { params });
  }

  // Manager Review Management
  submitManagerReview(request: ManagerReviewRequest): Observable<ApiResponse<ManagerReview>> {
    return this.http.post<ApiResponse<ManagerReview>>(`${this.apiUrl}/Performance/Manager/Review`, request);
  }
//routee name chnageeieng here
  getMyManagerReviews(): Observable<ApiResponse<ManagerReviewDto[]>> {
    return this.http.get<ApiResponse<ManagerReviewDto[]>>(`${this.apiUrl}/Performance/getall/created/Manager/Reviews`);
  }

  getEmployeeSelfAssessment(employeeId: string, cycleId: string): Observable<ApiResponse<SelfAssessment[]>> {
    return this.http.get<ApiResponse<SelfAssessment[]>>(`${this.apiUrl}/Performance/Manager/Self-Assessment/${employeeId}/${cycleId}`);
  }

  // Appraisal Consolidation
  consolidateAppraisal(request: ConsolidateAppraisalRequest): Observable<ApiResponse<EmployeeAppraisal>> {
    return this.http.post<ApiResponse<EmployeeAppraisal>>(`${this.apiUrl}/Performance/appraisals/consolidate`, request);
  }

  // Employee Performance History
  getEmployeePerformanceHistory(employeeId: string): Observable<ApiResponse<EmployeePerformanceHistory>> {
    return this.http.get<ApiResponse<EmployeePerformanceHistory>>(`${this.apiUrl}/Performance/employee/${employeeId}/history`);
  }

  // Top Performers
  getTopPerformers(count: number = 10): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/Performance/top-performers?count=${count}`);
  }

  // Team Performance Overview
  getTeamPerformanceOverview(): Observable<ApiResponse<TeamPerformanceOverview>> {
    return this.http.get<ApiResponse<TeamPerformanceOverview>>(`${this.apiUrl}/Performance/team-performance-overview`);
  }

  // Goals Management
  getAllGoals(): Observable<ApiResponse<Goal[]>> {
    return this.http.get<ApiResponse<Goal[]>>(`${this.apiUrl}/Performance/goals`);
  }

  getGoalsByEmployeeId(employeeId: string): Observable<ApiResponse<Goal[]>> {
    return this.http.get<ApiResponse<Goal[]>>(`${this.apiUrl}/Performance/goals/employee/${employeeId}`);
  }

  getEmployeeGoals(): Observable<ApiResponse<Goal[]>> {
    return this.http.get<ApiResponse<Goal[]>>(`${this.apiUrl}/Performance/employee/Assigned/goals`);
  }

  getGoalById(goalId: string): Observable<ApiResponse<Goal>> {
    return this.http.get<ApiResponse<Goal>>(`${this.apiUrl}/Performance/goals/${goalId}`);
  }

  createGoal(request: CreateGoalRequest): Observable<ApiResponse<Goal>> {
    return this.http.post<ApiResponse<Goal>>(`${this.apiUrl}/Performance/create-goal`, request);
  }

  updateGoal(goalId: string, request: UpdateGoalRequest): Observable<ApiResponse<Goal>> {
    return this.http.put<ApiResponse<Goal>>(`${this.apiUrl}/Performance/update-goal`, request);
  }

  completeGoal(goalId: string): Observable<ApiResponse<Goal>> {
    return this.http.patch<ApiResponse<Goal>>(`${this.apiUrl}/Performance/goals/${goalId}/complete`, {});
  }

  deleteGoal(goalId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/Performance/delete-goal/${goalId}`);
  }

  assignGoal(payload: { goalId: string; assignedTo: string }): Observable<ApiResponse<boolean>> {
    const params = new HttpParams()
      .set('goalId', payload.goalId)
      .set('assignedTo', payload.assignedTo);
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/Performance/goals/assign-employee`, {}, { params });
  }

  updateGoalStatus(goalId: string, status: string): Observable<ApiResponse<Goal>> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<ApiResponse<Goal>>(`${this.apiUrl}/Performance/GoalStatus/${goalId}`, {}, { params });
  }

  // Get reviews received by employee from their managers
  getEmployeeReceivedReviews(): Observable<ApiResponse<ManagerReviewDto[]>> {
    return this.http.get<ApiResponse<ManagerReviewDto[]>>(`${this.apiUrl}/Performance/employee/manager-reviews`);
  }

  // Get all HR reviews given to other employees by this HR
  getHrReviews(): Observable<ApiResponse<HrReviewDto[]>> {
    return this.http.get<ApiResponse<HrReviewDto[]>>(`${this.apiUrl}/Performance/HR/Reviews`);
  }

  // Get employee's own HR reviews (reviews given to the employee by HR)
  getEmployeeHrReviews(): Observable<ApiResponse<HrReviewDto[]>> {
    return this.http.get<ApiResponse<HrReviewDto[]>>(`${this.apiUrl}/Performance/Employee/HR/Reviews`);
  }

  // Submit HR Review
  submitHrReview(request: {
    employeeId: string;
    cycleId: string;
    finalRating: number;
    hrComments?: string;
    improvementArea?: string;
    feedback?: string;
    status?: string;
  }): Observable<ApiResponse<HrReviewDto>> {
    return this.http.post<ApiResponse<HrReviewDto>>(`${this.apiUrl}/Performance/Create/HR/Appraisal`, request);
  }
  
  //Getting overall managers reviews
  getAllManagerReviews(search?: any): Observable<ApiResponse<ManagerReviewDto[]>> {
  return this.http.get<ApiResponse<ManagerReviewDto[]>>(
    `${this.apiUrl}/Performance/getAllManagers/Reviews`,
    { params: search }
  );
}

}
