import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  TimesheetConfig,
  TimesheetPeriod,
  TimesheetDay,
  EmployeeTimesheet,
  TimesheetCorrection,
  TimesheetBulkApprove,
  TimesheetOverride,
  TimesheetLockBlockers,
  TimesheetAuditEntry,
  TimesheetPeriodLink,
  TimesheetPayrollSummary,
  TimesheetApprovalWorkflow,
  TimesheetApprovalProgress,
  TimesheetReopenRequest,
  TimesheetProject,
  TimesheetTask,
  TimeAllocation,
  SaveTimeAllocation,
  CompTimeBalance,
  TimesheetDashboard,
  TimesheetDelegation,
  CreateTimesheetDelegation,
  EmployeeRateCard,
  BulkCopyRequest,
  BulkAutoFillRequest,
  PendingCorrection
} from '../models/timesheet.models';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

@Injectable({ providedIn: 'root' })
export class TimesheetService {
  private baseUrl = `${environment.apiUrl}/timesheet`;

  constructor(private http: HttpClient) {}

  // ── Config ──
  getConfig(): Observable<TimesheetConfig> {
    return this.http.get<ApiResponse<TimesheetConfig>>(`${this.baseUrl}/config`).pipe(map(r => r.data));
  }

  updateConfig(dto: TimesheetConfig): Observable<TimesheetConfig> {
    return this.http.put<ApiResponse<TimesheetConfig>>(`${this.baseUrl}/config`, dto).pipe(map(r => r.data));
  }

  // ── Periods ──
  getPeriods(from?: string, to?: string): Observable<TimesheetPeriod[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<ApiResponse<TimesheetPeriod[]>>(`${this.baseUrl}/periods`, { params }).pipe(map(r => r.data));
  }

  getPeriod(id: string): Observable<TimesheetPeriod> {
    return this.http.get<ApiResponse<TimesheetPeriod>>(`${this.baseUrl}/periods/${id}`).pipe(map(r => r.data));
  }

  createPeriod(dto: {
    periodName: string; periodStart: string; periodEnd: string;
    month?: number; year?: number;
    scopeType?: string; departmentIds?: string[]; employeeIds?: string[];
  }): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/periods`, dto).pipe(map(r => r.data));
  }

  transitionStatus(timesheetId: string, newStatus: string, reason?: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/periods/${timesheetId}/transition`, { newStatus, reason }).pipe(map(r => r.data));
  }

  getBlockers(timesheetId: string): Observable<TimesheetLockBlockers> {
    return this.http.get<ApiResponse<TimesheetLockBlockers>>(`${this.baseUrl}/periods/${timesheetId}/blockers`).pipe(map(r => r.data));
  }

  // ── Employee Days ──
  getEmployeeDays(periodId: string, employeeId?: string): Observable<EmployeeTimesheet[]> {
    let params = new HttpParams();
    if (employeeId) params = params.set('employeeId', employeeId);
    return this.http.get<ApiResponse<EmployeeTimesheet[]>>(`${this.baseUrl}/periods/${periodId}/days`, { params }).pipe(map(r => r.data));
  }

  // ── Corrections ──
  getPendingCorrections(timesheetId: string): Observable<PendingCorrection[]> {
    return this.http.get<ApiResponse<PendingCorrection[]>>(`${this.baseUrl}/corrections/pending?timesheetId=${timesheetId}`).pipe(map(r => r.data));
  }

  submitCorrection(dto: TimesheetCorrection): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/corrections`, dto).pipe(map(r => r.data));
  }

  approveCorrection(correctionId: string): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/corrections/${correctionId}/approve`, {}).pipe(map(r => r.data));
  }

  rejectCorrection(correctionId: string, reason: string): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/corrections/${correctionId}/reject`, { reason }).pipe(map(r => r.data));
  }

  approveBulk(dto: TimesheetBulkApprove): Observable<number> {
    return this.http.post<ApiResponse<number>>(`${this.baseUrl}/corrections/approve-bulk`, dto).pipe(map(r => r.data));
  }

  // ── Overrides ──
  applyOverride(timesheetId: string, dto: TimesheetOverride): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/overrides?timesheetId=${timesheetId}`, dto).pipe(map(r => r.data));
  }

  // ── Finalization ──
  finalize(timesheetId: string, employeeId?: string): Observable<number> {
    let params = new HttpParams();
    if (employeeId) params = params.set('employeeId', employeeId);
    return this.http.post<ApiResponse<number>>(`${this.baseUrl}/periods/${timesheetId}/finalize`, null, { params }).pipe(map(r => r.data));
  }

  // ── Payroll Bridge ──
  getFinalizedForPayroll(): Observable<TimesheetPeriodLink[]> {
    return this.http.get<ApiResponse<TimesheetPeriodLink[]>>(`${this.baseUrl}/payroll/finalized-periods`).pipe(map(r => r.data));
  }

  getPayrollSummary(timesheetId: string): Observable<TimesheetPayrollSummary> {
    return this.http.get<ApiResponse<TimesheetPayrollSummary>>(`${this.baseUrl}/payroll/summary/${timesheetId}`).pipe(map(r => r.data));
  }

  lockForPayroll(timesheetId: string, payrollPeriodId?: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/payroll/lock`, { timesheetId, payrollPeriodId }).pipe(map(r => r.data));
  }

  // ── Workflow & Approval Queue ──
  getWorkflows(): Observable<TimesheetApprovalWorkflow[]> {
    return this.http.get<ApiResponse<TimesheetApprovalWorkflow[]>>(`${this.baseUrl}/workflows`).pipe(map(r => r.data));
  }

  createWorkflow(dto: TimesheetApprovalWorkflow): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/workflows`, dto).pipe(map(r => r.data));
  }

  getApprovalQueue(): Observable<TimesheetApprovalProgress[]> {
    return this.http.get<ApiResponse<TimesheetApprovalProgress[]>>(`${this.baseUrl}/approvals/queue`).pipe(map(r => r.data));
  }

  approveStep(progressId: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/approvals/${progressId}/approve`, {}).pipe(map(r => r.data));
  }

  rejectStep(progressId: string, reason: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/approvals/${progressId}/reject`, { reason }).pipe(map(r => r.data));
  }

  // ── Reopen Requests ──
  requestReopen(timesheetId: string, reason: string): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/periods/${timesheetId}/request-reopen`, { reason }).pipe(map(r => r.data));
  }

  getPendingReopenRequests(): Observable<TimesheetReopenRequest[]> {
    return this.http.get<ApiResponse<TimesheetReopenRequest[]>>(`${this.baseUrl}/reopen-requests/pending`).pipe(map(r => r.data));
  }

  approveReopenRequest(reopenId: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/reopen-requests/${reopenId}/approve`, {}).pipe(map(r => r.data));
  }

  rejectReopenRequest(reopenId: string, reason: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/reopen-requests/${reopenId}/reject`, { reason }).pipe(map(r => r.data));
  }

  // ── Audit ──
  getAuditLog(timesheetId: string): Observable<TimesheetAuditEntry[]> {
    return this.http.get<ApiResponse<TimesheetAuditEntry[]>>(`${this.baseUrl}/periods/${timesheetId}/audit`).pipe(map(r => r.data));
  }

  // ── Projects ──
  getProjects(): Observable<TimesheetProject[]> {
    return this.http.get<ApiResponse<TimesheetProject[]>>(`${this.baseUrl}/projects`).pipe(map(r => r.data));
  }

  createProject(dto: TimesheetProject): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/projects`, dto).pipe(map(r => r.data));
  }

  getProjectTasks(projectId: string): Observable<TimesheetTask[]> {
    return this.http.get<ApiResponse<TimesheetTask[]>>(`${this.baseUrl}/projects/${projectId}/tasks`).pipe(map(r => r.data));
  }

  updateProject(dto: TimesheetProject): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/projects/${dto.projectId}`, dto).pipe(map(r => r.data));
  }

  deleteProject(projectId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/projects/${projectId}`).pipe(map(r => r.data));
  }

  createTask(projectId: string, dto: TimesheetTask): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/projects/${projectId}/tasks`, dto).pipe(map(r => r.data));
  }

  updateTask(projectId: string, dto: TimesheetTask): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/projects/${projectId}/tasks/${dto.taskId}`, dto).pipe(map(r => r.data));
  }

  deleteTask(projectId: string, taskId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/projects/${projectId}/tasks/${taskId}`).pipe(map(r => r.data));
  }

  // ── Time Allocations ──
  getTimeAllocations(timesheetId: string, employeeId: string): Observable<TimeAllocation[]> {
    const params = new HttpParams().set('employeeId', employeeId);
    return this.http.get<ApiResponse<TimeAllocation[]>>(`${this.baseUrl}/periods/${timesheetId}/allocations`, { params }).pipe(map(r => r.data));
  }

  saveTimeAllocations(timesheetId: string, dto: SaveTimeAllocation): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/periods/${timesheetId}/allocations`, dto).pipe(map(r => r.data));
  }

  // ── Comp Time ──
  getCompTimeBalance(employeeId: string, year: number): Observable<CompTimeBalance> {
    const params = new HttpParams().set('employeeId', employeeId).set('year', year.toString());
    return this.http.get<ApiResponse<CompTimeBalance>>(`${this.baseUrl}/comp-time`, { params }).pipe(map(r => r.data));
  }

  // ── Dashboard ──
  getDashboard(periodId?: string): Observable<TimesheetDashboard> {
    let params = new HttpParams();
    if (periodId) { params = params.set('periodId', periodId); }
    return this.http.get<ApiResponse<TimesheetDashboard>>(`${this.baseUrl}/dashboard`, { params }).pipe(map(r => r.data));
  }

  // ── Delegation ──
  getActiveDelegation(approverId: string): Observable<TimesheetDelegation | null> {
    const params = new HttpParams().set('approverId', approverId);
    return this.http.get<ApiResponse<TimesheetDelegation | null>>(`${this.baseUrl}/delegations/active`, { params }).pipe(map(r => r.data));
  }

  createDelegation(dto: CreateTimesheetDelegation): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/delegations`, dto).pipe(map(r => r.data));
  }

  // ── Rate Cards ──
  getRateCards(): Observable<EmployeeRateCard[]> {
    return this.http.get<ApiResponse<EmployeeRateCard[]>>(`${this.baseUrl}/rate-cards`).pipe(map(r => r.data));
  }

  // ── Bulk Operations ──
  bulkCopyFromPrevious(dto: BulkCopyRequest): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/periods/bulk-copy`, dto).pipe(map(r => r.data));
  }

  autoFillFromSchedule(dto: BulkAutoFillRequest): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/periods/autofill`, dto).pipe(map(r => r.data));
  }

  // ── Leave Types (for correction dialog) ──
  getLeaveTypes(): Observable<{ id: string; name: string }[]> {
    const leaveBaseUrl = `${environment.apiUrl}/leave`;
    return this.http.get<ApiResponse<any[]>>(`${leaveBaseUrl}/typesforrequest`).pipe(
      map(r => (r.data || []).map(lt => ({ id: lt.leaveTypeId || lt.id, name: lt.typeName || lt.name })))
    );
  }
}
