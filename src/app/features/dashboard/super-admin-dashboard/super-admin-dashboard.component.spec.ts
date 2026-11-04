import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { SuperAdminDashboardComponent } from './super-admin-dashboard.component';
import { AuthService } from '@core/services/auth.service';
import { TenantEntitlementService } from '@core/services/tenant-entitlement.service';
import { TenantEntitlements } from '@core/models/entitlement.models';
import { provideTestDefaults } from 'src/testing/test-providers';

describe('SuperAdminDashboardComponent', () => {
  let fixture: ComponentFixture<SuperAdminDashboardComponent>;
  let http: HttpTestingController;

  /** Starter-like plan: employees, attendance, leave, news, AI — nothing else. */
  const starterPlan = (overrides: Partial<TenantEntitlements> = {}): TenantEntitlements => ({
    planCode: 'starter',
    subscriptionStatus: 'active',
    maxUsers: 5,
    userCount: 1,
    userCountType: 'active_and_inactive',
    isReadOnly: false,
    aiQueriesUsedThisMonth: 12,
    features: {
      dashboard: { key: 'dashboard', enabled: true, limit: null },
      employee_management: { key: 'employee_management', enabled: true, limit: null },
      attendance: { key: 'attendance', enabled: true, limit: null },
      leave_management: { key: 'leave_management', enabled: true, limit: null },
      news: { key: 'news', enabled: true, limit: null },
      ai_assistant: { key: 'ai_assistant', enabled: true, limit: 50 },
      payroll_processing: { key: 'payroll_processing', enabled: false, limit: null },
      jobs: { key: 'jobs', enabled: false, limit: null },
      expense: { key: 'expense', enabled: false, limit: null },
      timesheet: { key: 'timesheet', enabled: false, limit: null }
    },
    ...overrides
  });

  function create(plan: TenantEntitlements, grantAll: boolean | ((key: string) => boolean) = true, mode: 'admin' | 'personal' = 'admin') {
    const auth = jasmine.createSpyObj<AuthService>('AuthService',
      ['getCurrentUserValue', 'hasPermissionByActionKey', 'hasMenuParentPermission']);
    auth.getCurrentUserValue.and.returnValue({ userId: 'u', firstName: 'Haris', organizationName: 'Acme' } as any);
    const grant = typeof grantAll === 'function' ? grantAll : () => grantAll;
    auth.hasPermissionByActionKey.and.callFake(grant);
    auth.hasMenuParentPermission.and.callFake(grant);

    const entitlements = jasmine.createSpyObj<TenantEntitlementService>('TenantEntitlementService', ['load']);
    entitlements.load.and.returnValue(of(plan));

    TestBed.configureTestingModule({
      imports: [SuperAdminDashboardComponent],
      providers: [
        ...provideTestDefaults(),
        { provide: AuthService, useValue: auth },
        { provide: TenantEntitlementService, useValue: entitlements }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SuperAdminDashboardComponent);
    fixture.componentRef.setInput('mode', mode);
    fixture.detectChanges();
  }

  const requested = (fragment: string) => http.match(r => r.url.includes(fragment));

  afterEach(() => http.match(() => true)); // drop anything left pending

  it('never requests data for modules the plan does not include', () => {
    create(starterPlan());

    expect(requested('/latest-hires').length).withContext('jobs disabled').toBe(0);
    expect(requested('/Payroll').length).withContext('payroll disabled').toBe(0);
    expect(requested('/Expense').length).withContext('expense disabled').toBe(0);
    expect(requested('/Timesheet').length).withContext('timesheet disabled').toBe(0);
  });

  it('requests data for included modules', () => {
    create(starterPlan());

    expect(requested('/Dashboard/hr-overview').length).toBe(1);
    expect(requested('/Dashboard/manager-overview').length).toBe(1);
    expect(requested('/departments').length).toBe(1);
    expect(requested('/News/getAllNews').length).toBe(1);
  });

  it('dashboard calls are marked to skip the global error toast', () => {
    create(starterPlan());
    const [req] = requested('/Dashboard/hr-overview');
    expect(req.request.headers.get('X-Skip-Global-Error')).toBe('true');
  });

  it('hides quick actions for modules outside the plan', () => {
    create(starterPlan());
    const labels = fixture.componentInstance.quickActions().map(a => a.label);

    expect(labels).toContain('Add employee');
    expect(labels).toContain('Leave requests');
    expect(labels).not.toContain('Run payroll');
    expect(labels).not.toContain('Post a job');
  });

  it('hides widgets the role is not allowed to see even if the plan includes them', () => {
    create(starterPlan(), false);

    expect(requested('/Dashboard/hr-overview').length).toBe(0);
    expect(requested('/Dashboard/manager-overview').length).toBe(0);
    expect(fixture.componentInstance.quickActions().length).toBe(0);
  });

  it('only lists approvals for modules in the plan', () => {
    create(starterPlan());
    requested('/Dashboard/manager-overview')[0].flush({
      success: true,
      data: {
        teamAttendanceSnapshot: { presentCount: 3, absentCount: 1, lateCount: 1, onLeaveCount: 0 },
        teamOvertimeCountToday: 0,
        pendingActions: { pendingLeaveRequests: 2, pendingTimesheetCorrections: 5, pendingShiftSwaps: 1 }
      }
    });
    http.match(() => true).forEach(r => r.flush({ success: true, data: null }));
    fixture.detectChanges();

    const c = fixture.componentInstance;
    expect(c.pendingItems().map(i => i.label)).toEqual(['Leave requests']);
    expect(c.pendingTotal()).toBe(2);
    expect(c.attendanceRate()).toBe(80);
  });

  it('shows plan usage with AI quota', () => {
    create(starterPlan());
    const c = fixture.componentInstance;
    expect(c.planName()).toBe('Starter');
    expect(c.seats()).toEqual({ used: 1, max: 5, pct: 20 });
    expect(c.aiUsage()).toEqual({ used: 12, limit: 50, pct: 24 });
    expect(c.includedModules()).not.toContain('Payroll');
  });

  describe('personal view (employees, managers, HR)', () => {
    /** A plain employee: own overview, attendance and leave — no team or HR widgets. */
    const employeePerms = (key: string) =>
      ['dashboard_my_overview', 'Attendance', 'Leave Management', 'my_leave_request_leave', 'News', 'Holidays'].includes(key);

    it('loads the employee overview and skips team and organization data', () => {
      create(starterPlan(), employeePerms, 'personal');

      expect(requested('/Dashboard/employee-overview').length + requested('/Dashboard/my-overview').length)
        .withContext('own overview').toBeGreaterThan(0);
      expect(requested('/Dashboard/manager-overview').length).toBe(0);
      expect(requested('/Dashboard/hr-overview').length).toBe(0);
      expect(requested('/departments').length).toBe(0);
    });

    it('shows self-service quick actions instead of admin ones', () => {
      create(starterPlan(), employeePerms, 'personal');
      const labels = fixture.componentInstance.quickActions().map(a => a.label);

      expect(labels).toContain('Request leave');
      expect(labels).toContain('My attendance');
      expect(labels).not.toContain('Add employee');
      expect(labels).not.toContain('Team requests');
    });

    it('managers also get team tools', () => {
      create(starterPlan(), k => employeePerms(k) || k === 'dashboard_manager_overview', 'personal');
      const labels = fixture.componentInstance.quickActions().map(a => a.label);

      expect(labels).toContain('Team requests');
      expect(requested('/Dashboard/manager-overview').length).toBe(1);
    });

    it('summarises leave balance and open requests', () => {
      create(starterPlan(), employeePerms, 'personal');
      const req = http.match(r => r.url.toLowerCase().includes('overview'))[0];
      req.flush({
        success: true,
        data: {
          leaveBalances: { totalRemainingDays: 14, byType: [
            { leaveTypeName: 'Annual', color: '', totalDays: 20, usedDays: 8, remainingDays: 12, carryForwardDays: 0 },
            { leaveTypeName: 'Sick', color: '', totalDays: 0, usedDays: 0, remainingDays: 0, carryForwardDays: 0 }
          ] },
          financialSnapshot: { isPayslipAvailable: false },
          activeLoansAndAdvances: { totalRemainingLoanAmount: 0, totalRemainingAdvanceAmount: 0, activeLoans: [], activeAdvances: [] },
          pendingRequests: [{ requestId: '1', requestType: 'Leave', description: 'Annual · 2 days', submittedAt: '2026-11-01' }]
        }
      });
      http.match(() => true).forEach(r => r.flush({ success: true, data: null }));
      fixture.detectChanges();

      const c = fixture.componentInstance;
      expect(c.leaveLeft()).toBe(14);
      expect(c.leaveTypes().map(t => t.label)).toEqual(['Annual']);   // zero-allowance types hidden
      expect(c.myRequests().length).toBe(1);
      expect(c.netPay()).toBeNull();
      expect(c.showSetup()).toBeFalse();
      expect(fixture.nativeElement.textContent).not.toContain('Starter plan');
    });
  });

  it('hides data cards when the API does not have them (older backend)', () => {
    create(starterPlan(), k => k !== 'Subscription', 'personal');
    http.match(r => r.url.includes('/Dashboard/')).forEach(r => r.flush({}, { status: 404, statusText: 'Not Found' }));
    http.match(() => true).forEach(r => r.flush({ success: true, data: [] }));
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).not.toContain('My leave balance');
    expect(text).not.toContain('Attendance today');
    expect(text).not.toContain('Leave days left');
    expect(fixture.componentInstance.quickActions().length).toBeGreaterThan(0);
  });
});
