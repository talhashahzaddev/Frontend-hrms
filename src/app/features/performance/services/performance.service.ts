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
  SelfAssessment,
  CreateSelfAssessmentRequest,
  ManagerReview,
  ManagerReviewRequest,
  ConsolidateAppraisalRequest,
  EmployeePerformanceHistory,
  EmployeeAppraisalForEmployee
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

  // createSkillSet(request: CreateSkillSetRequest): Observable<ApiResponse<SkillSet>> {
  //   return this.http.post<ApiResponse<SkillSet>>(`${this.apiUrl}/performance/skillsets`, request);
  // }

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

  // KRA Management
  getKRAs(page: number = 1, limit: number = 20, search?: string): Observable<ApiResponse<PaginatedResponse<KRA>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<ApiResponse<PaginatedResponse<KRA>>>(`${this.apiUrl}/Performance/Kra`, { params });
  }

  getKRAById(id: string): Observable<ApiResponse<KRA>> {
    return this.http.get<ApiResponse<KRA>>(`${this.apiUrl}/Performance/KraById/${id}`);
  }

  createKRA(request: CreateKRARequest): Observable<ApiResponse<KRA>> {
    let params = new HttpParams();
    params = params.set('PositionId', request.positionId);
    params = params.set('Title', request.title);
    if (request.description) params = params.set('Description', request.description);
    params = params.set('Weight', request.weight.toString());
    if (request.measurementCriteria) params = params.set('MeasurementCriteria', request.measurementCriteria);
    if (request.isActive !== undefined) params = params.set('IsActive', request.isActive.toString());
    
    return this.http.post<ApiResponse<KRA>>(`${this.apiUrl}/Performance/Kra`, {}, { params });
  }

  updateKRA(id: string, request: UpdateKRARequest): Observable<ApiResponse<KRA>> {
    let params = new HttpParams();
    params = params.set('kraId', id);
    if (request.title) params = params.set('Title', request.title);
    if (request.description) params = params.set('Description', request.description);
    if (request.weight !== undefined) params = params.set('Weight', request.weight.toString());
    if (request.measurementCriteria) params = params.set('MeasurementCriteria', request.measurementCriteria);
    if (request.isActive !== undefined) params = params.set('IsActive', request.isActive.toString());
    
    return this.http.put<ApiResponse<KRA>>(`${this.apiUrl}/Performance/KraUpdate`, {}, { params });
  }

  updateKRAStatus(id: string, isActive: boolean): Observable<ApiResponse<string>> {
    return this.http.patch<ApiResponse<string>>(`${this.apiUrl}/Performance/KRAStatus/${id}?isActive=${isActive}`, {});
  }

  deleteKRA(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/Performance/Kra/${id}`);
  }

  // Appraisal Cycles Management
  getAppraisalCycles(): Observable<ApiResponse<AppraisalCycle[]>> {
    return this.http.get<ApiResponse<AppraisalCycle[]>>(`${this.apiUrl}/Performance/cycles`);
  }

  getAppraisalCycleById(id: string): Observable<ApiResponse<AppraisalCycle>> {
    return this.http.get<ApiResponse<AppraisalCycle>>(`${this.apiUrl}/Performance/cycles/${id}`);
  }

  getActiveAppraisalCycle(): Observable<ApiResponse<AppraisalCycle>> {
    return this.http.get<ApiResponse<AppraisalCycle>>(`${this.apiUrl}/Performance/cycles/active`);
  }

  createAppraisalCycle(request: CreateAppraisalCycleRequest): Observable<ApiResponse<AppraisalCycle>> {
    return this.http.post<ApiResponse<AppraisalCycle>>(`${this.apiUrl}/Performance/cycles`, request);
  }

  updateAppraisalCycle(id: string, request: UpdateAppraisalCycleRequest): Observable<ApiResponse<AppraisalCycle>> {
    return this.http.put<ApiResponse<AppraisalCycle>>(`${this.apiUrl}/Performance/cycles/${id}`, request);
  }

  deleteAppraisalCycle(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/Performance/cycles/${id}`);
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

  getMySkills(): Observable<ApiResponse<EmployeeSkill[]>> {
    return this.http.get<ApiResponse<EmployeeSkill[]>>(`${this.apiUrl}/performance/skills`);
  }

  // Skills Matrix
  // getSkillsMatrix(): Observable<{ data: SkillSet[]; success: boolean; message: string; errors: any }> {
  //   return this.http.get<{ data: SkillSet[]; success: boolean; message: string; errors: any }>(`${this.apiUrl}/Performance/skills`);
  // }
  getSkillsMatrix(): Observable<{ data: SkillSet[]; success: boolean; message: string; errors: any }> {
    return this.http.get<{ data: SkillSet[]; success: boolean; message: string; errors: any }>(`${this.apiUrl}/Performance/skills`);
  }

  createSkillSet(request: CreateSkillSetRequest): Observable<{ data: SkillSet; success: boolean; message: string; errors: any }> {
    return this.http.post<{ data: SkillSet; success: boolean; message: string; errors: any }>(
      `${this.apiUrl}/Performance/skills`,
      request
    );
  }

  // Self-Assessment Management
  createSelfAssessment(request: CreateSelfAssessmentRequest): Observable<ApiResponse<SelfAssessment>> {
    return this.http.post<ApiResponse<SelfAssessment>>(`${this.apiUrl}/Performance/SelfAssessment`, request);
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
    return this.http.get<ApiResponse<SelfAssessment[]>>(`${this.apiUrl}/Performance/SelfAssessment/my-assessments`, { params });
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
    return this.http.get<ApiResponse<SelfAssessment[]>>(`${this.apiUrl}/Performance/SelfAssessment/all-employee-assessments`, { params });
  }

  getMyTeamSelfAssessments(filter?: { cycleId?: string; employeeId?: string; kraId?: string; search?: string }): Observable<ApiResponse<SelfAssessment[]>> {
    let params = new HttpParams();
    if (filter) {
      if (filter.cycleId) params = params.set('cycleId', filter.cycleId);
      if (filter.employeeId) params = params.set('employeeId', filter.employeeId);
      if (filter.kraId) params = params.set('kraId', filter.kraId);
      if (filter.search) params = params.set('search', filter.search);
    }
    return this.http.get<ApiResponse<SelfAssessment[]>>(`${this.apiUrl}/Performance/SelfAssessment/my-team-assessments`, { params });
  }

  // Manager Review Management
  submitManagerReview(request: ManagerReviewRequest): Observable<ApiResponse<ManagerReview>> {
    return this.http.post<ApiResponse<ManagerReview>>(`${this.apiUrl}/Performance/Manager/Review`, request);
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
}