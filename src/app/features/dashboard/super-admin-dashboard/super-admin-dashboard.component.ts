import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, forkJoin, interval, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { AuthService } from '@core/services/auth.service';
import { TenantEntitlementService } from '@core/services/tenant-entitlement.service';
import { NotificationService } from '@core/services/notification.service';
import { TenantEntitlements } from '@core/models/entitlement.models';
import { EmployeeOverview, HrOverview, HrStats, LatestHiredEmployee, ManagerOverview, PendingRequestSummary } from '@core/models/dashboard.models';
import { TimeTrackingSession } from '@core/models/attendance.models';
import { Department } from '@core/models/employee.models';
import { CompanyHoliday } from '@core/models/holiday.models';
import { NewsDto } from '@core/models/news.models';
import { DashboardService } from '../services/dashboard.service';
import { AttendanceService } from '../../attendance/services/attendance.service';
import { GeoClockInRequest, GeoFenceService } from '../../attendance/services/geofence.service';
import { EmployeeService } from '../../employee/services/employee.service';
import { HolidayService } from '../../holiday/services/holiday.service';
import { NewsService } from '../../news/services/news.services';
import { SettingsService } from '../../settings/services/settings.service';
import { PayrollService } from '../../payroll/services/payroll.service';
import { CommentDialogComponent } from '@shared/components/comment-dialog/comment-dialog.component';

/** A widget is shown only when the plan includes its feature AND the role can use it. */
interface Access {
  feature?: string;      // plan feature key (TenantEntitlements.features)
  permission?: string;   // role action key
  menu?: string;         // role menu name (any permission inside it)
}

interface QuickAction extends Access {
  label: string;
  icon: string;
  route: string;
  tone: string;
}

interface PendingItem extends Access {
  label: string;
  icon: string;
  count: number;
  route: string;
  tone: string;
}

interface Segment {
  key: string;
  label: string;
  value: number;
  icon: string;
  colorVar: string;
}

interface BarDatum {
  label: string;
  value: number;
  detail?: string[];
}

interface Tooltip {
  x: number;
  y: number;
  title: string;
  lines: string[];
}

interface SetupStep {
  label: string;
  done: boolean;
  route: string;
}

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatTooltipModule, MatDialogModule],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuperAdminDashboardComponent implements OnInit {
  /**
   * 'admin'    – organization view for the Super Admin (setup checklist, plan & usage).
   * 'personal' – everyone else: their own work first, then team/organization widgets their role allows.
   */
  readonly mode = input<'admin' | 'personal'>('admin');
  readonly isPersonal = computed(() => this.mode() === 'personal');

  /** Decorative avatar colors, cycled by position. */
  readonly avatarTones = ['blue', 'violet', 'teal', 'rose', 'orange', 'indigo'];

  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly entitlementService = inject(TenantEntitlementService);
  private readonly dashboard = inject(DashboardService);
  private readonly attendance = inject(AttendanceService);
  private readonly geoFence = inject(GeoFenceService);
  private readonly employees = inject(EmployeeService);
  private readonly holidays = inject(HolidayService);
  private readonly news = inject(NewsService);
  private readonly settings = inject(SettingsService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly payroll = inject(PayrollService);

  // ── State ──────────────────────────────────────────────────────────────
  readonly loading = signal(true);
  readonly now = signal(new Date());
  readonly plan = signal<TenantEntitlements | null>(null);
  readonly hrOverview = signal<HrOverview | null>(null);
  readonly hrStats = signal<HrStats | null>(null);
  readonly team = signal<ManagerOverview | null>(null);
  readonly me = signal<EmployeeOverview | null>(null);
  readonly pendingLoans = signal(0);
  readonly pendingAdvances = signal(0);
  readonly hires = signal<LatestHiredEmployee[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly upcomingHolidays = signal<CompanyHoliday[]>([]);
  readonly latestNews = signal<NewsDto[]>([]);
  readonly session = signal<TimeTrackingSession | null>(null);
  readonly clockBusy = signal(false);
  readonly currency = signal(this.settings.getCurrencySymbol());
  readonly tooltip = signal<Tooltip | null>(null);

  readonly user = this.auth.getCurrentUserValue();
  readonly firstName = this.user?.firstName || 'there';
  readonly organizationName = (this.user?.organizationName || '').trim();

  // ── Access rules ───────────────────────────────────────────────────────
  readonly rules = {
    workforce:   { feature: 'employee_management', permission: 'dashboard_hr_overview' },
    demographics:{ feature: 'employee_management', permission: 'dashboard_hr_stats' },
    departments: { feature: 'employee_management', menu: 'Employee Management' },
    attendance:  { feature: 'attendance', permission: 'dashboard_manager_overview' },
    clock:       { feature: 'attendance', menu: 'Attendance' },
    payroll:     { feature: 'payroll_processing', permission: 'dashboard_hr_overview' },
    expenses:    { feature: 'expense', permission: 'dashboard_hr_stats' },
    hires:       { feature: 'jobs', permission: 'dashboard_latest_hires' },
    holidays:    { feature: 'leave_management', menu: 'Holidays' },   // lives under Leave in the sidebar
    news:        { feature: 'news', menu: 'News' },
    ai:          { feature: 'ai_assistant', menu: 'AI Assistant' },
    billing:     { menu: 'Subscription' },
    myOverview:  { permission: 'dashboard_my_overview' },
    loans:       { feature: 'loans_advances', permission: 'loan_admin_view' },
    advances:    { feature: 'loans_advances', permission: 'salary_advance_admin_list' }
  } satisfies Record<string, Access>;

  /** Personal view: self-service first, then team tools for people who manage a team. */
  private readonly personalQuickActions: QuickAction[] = [
    { label: 'Request leave', icon: 'event_available', route: '/leave', feature: 'leave_management', permission: 'my_leave_request_leave', tone: 'teal' },
    { label: 'My attendance', icon: 'schedule', route: '/attendance/time-tracker', feature: 'attendance', menu: 'Attendance', tone: 'green' },
    { label: 'Submit expense', icon: 'receipt_long', route: '/expense/claims', feature: 'expense', permission: 'claims_add_claims', tone: 'orange' },
    { label: 'My payslips', icon: 'payments', route: '/payroll/my-payslips', feature: 'payslips', tone: 'violet' },
    { label: 'Team requests', icon: 'fact_check', route: '/leave/team-requests', feature: 'leave_management', permission: 'dashboard_manager_overview', tone: 'indigo' },
    { label: 'Team attendance', icon: 'groups', route: '/attendance/team-attendance', feature: 'attendance', permission: 'dashboard_manager_overview', tone: 'blue' },
    { label: 'Raise a ticket', icon: 'support_agent', route: '/help-desk/tickets', feature: 'help_desk', permission: 'Create_Ticket_Button', tone: 'rose' },
    { label: 'My profile', icon: 'person', route: '/profile', tone: 'blue' },
    { label: 'Ask AI assistant', icon: 'auto_awesome', route: '/ai-assistant', feature: 'ai_assistant', menu: 'AI Assistant', tone: 'indigo' }
  ];

  private readonly allQuickActions: QuickAction[] = [
    { label: 'Add employee', icon: 'person_add', route: '/employees/add', feature: 'employee_management', menu: 'Employee Management', tone: 'blue' },
    { label: 'Leave requests', icon: 'event_available', route: '/leave/team-requests', feature: 'leave_management', menu: 'Leave Management', tone: 'teal' },
    { label: 'Team attendance', icon: 'groups', route: '/attendance/team-attendance', feature: 'attendance', menu: 'Attendance', tone: 'green' },
    { label: 'Run payroll', icon: 'payments', route: '/payroll', feature: 'payroll_processing', menu: 'Payroll', tone: 'violet' },
    { label: 'Post a job', icon: 'work_outline', route: '/jobs', feature: 'jobs', menu: 'Jobs', tone: 'orange' },
    { label: 'Publish news', icon: 'campaign', route: '/news', feature: 'news', menu: 'News', tone: 'rose' },
    { label: 'Ask AI assistant', icon: 'auto_awesome', route: '/ai-assistant', feature: 'ai_assistant', menu: 'AI Assistant', tone: 'indigo' },
    { label: 'Holidays', icon: 'beach_access', route: '/holidays', feature: 'leave_management', menu: 'Holidays', tone: 'amber' }
  ];

  can(access: Access): boolean {
    const plan = this.plan();
    if (access.feature && !plan?.features?.[access.feature]?.enabled) return false;
    if (access.permission && !this.auth.hasPermissionByActionKey(access.permission)) return false;
    if (access.menu && !this.auth.hasMenuParentPermission(access.menu)) return false;
    return true;
  }

  // ── Derived view data ──────────────────────────────────────────────────
  readonly greeting = computed(() => {
    const h = this.now().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  });

  readonly quickActions = computed(() => {
    this.plan(); // re-evaluate once the plan is known
    const list = this.isPersonal() ? this.personalQuickActions : this.allQuickActions;
    return list.filter(a => this.can(a)).slice(0, 6);
  });

  readonly planName = computed(() => {
    const code = this.plan()?.planCode ?? '';
    return code ? code.charAt(0).toUpperCase() + code.slice(1) : '';
  });

  readonly planStatus = computed(() => (this.plan()?.subscriptionStatus ?? '').toLowerCase());

  readonly seats = computed(() => {
    const p = this.plan();
    if (!p) return null;
    const max = p.maxUsers ?? null;
    return { used: p.userCount ?? 0, max, pct: max ? Math.min(100, Math.round((p.userCount / max) * 100)) : 0 };
  });

  readonly aiUsage = computed(() => {
    const p = this.plan();
    if (!p || !this.can(this.rules.ai)) return null;
    const limit = p.features?.['ai_assistant']?.limit ?? null;
    const used = p.aiQueriesUsedThisMonth ?? 0;
    return { used, limit, pct: limit ? Math.min(100, Math.round((used / limit) * 100)) : 0 };
  });

  readonly includedModules = computed(() => {
    const features = this.plan()?.features ?? {};
    const labels: Record<string, string> = {
      employee_management: 'Employees', attendance: 'Attendance', leave_management: 'Leave',
      payroll: 'Payroll', performance: 'Performance', assets_management: 'Assets', expense: 'Expenses',
      help_desk: 'Help desk', jobs: 'Recruitment', news: 'News', timesheet: 'Timesheets',
      ai_assistant: 'AI assistant', onboarding: 'Onboarding'
    };
    return Object.keys(labels).filter(k => features[k]?.enabled).map(k => labels[k]);
  });

  readonly activeEmployees = computed(() => this.hrOverview()?.workforceMetrics?.totalActiveEmployees ?? null);
  readonly openPositions = computed(() => this.hrOverview()?.workforceMetrics?.totalOpenPositions ?? 0);

  readonly attendanceSegments = computed<Segment[]>(() => {
    const s = this.team()?.teamAttendanceSnapshot;
    if (!s) return [];
    return [
      { key: 'present', label: 'Present', value: s.presentCount, icon: 'check_circle', colorVar: '--sa-good' },
      { key: 'late', label: 'Late', value: s.lateCount, icon: 'schedule', colorVar: '--sa-warning' },
      { key: 'leave', label: 'On leave', value: s.onLeaveCount, icon: 'beach_access', colorVar: '--sa-series-1' },
      { key: 'absent', label: 'Absent', value: s.absentCount, icon: 'cancel', colorVar: '--sa-critical' }
    ];
  });

  readonly attendanceTotal = computed(() => this.attendanceSegments().reduce((t, s) => t + s.value, 0));

  readonly attendanceRate = computed(() => {
    const s = this.team()?.teamAttendanceSnapshot;
    const total = this.attendanceTotal();
    if (!s || !total) return null;
    return Math.round(((s.presentCount + s.lateCount) / total) * 100);
  });

  readonly pendingItems = computed<PendingItem[]>(() => {
    const items: PendingItem[] = [];
    const a = this.team()?.pendingActions;
    if (a) {
      items.push(
        { label: 'Leave requests', icon: 'event_note', count: a.pendingLeaveRequests, route: '/leave/team-requests', feature: 'leave_management', tone: 'teal' },
        { label: 'Timesheet corrections', icon: 'edit_calendar', count: a.pendingTimesheetCorrections, route: '/timesheet', feature: 'timesheet', tone: 'violet' },
        { label: 'Shift swaps', icon: 'swap_horiz', count: a.pendingShiftSwaps, route: '/attendance/shift', feature: 'shifts_overtime', tone: 'orange' }
      );
    }
    if (this.can(this.rules.loans)) {
      items.push({ label: 'Loan requests', icon: 'account_balance', count: this.pendingLoans(), route: '/payroll/loans/requests', tone: 'indigo' });
    }
    if (this.can(this.rules.advances)) {
      items.push({ label: 'Salary advances', icon: 'request_quote', count: this.pendingAdvances(), route: '/payroll/salary-advances', tone: 'rose' });
    }
    return items.filter(i => this.can(i));
  });

  readonly pendingTotal = computed(() => this.pendingItems().reduce((t, i) => t + i.count, 0));

  // ── Personal view data ─────────────────────────────────────────────────
  readonly showMe = computed(() => this.isPersonal() && this.can(this.rules.myOverview));
  readonly leaveLeft = computed(() => this.me()?.leaveBalances?.totalRemainingDays ?? null);
  readonly leaveTypes = computed(() =>
    (this.me()?.leaveBalances?.byType ?? [])
      .filter(t => (t.totalDays ?? 0) > 0)
      .map(t => ({ label: t.leaveTypeName, left: t.remainingDays ?? 0, total: t.totalDays ?? 0, used: t.usedDays ?? 0 })));
  readonly myRequests = computed<PendingRequestSummary[]>(() => this.me()?.pendingRequests ?? []);
  readonly netPay = computed(() => {
    const f = this.me()?.financialSnapshot;
    return f && f.lastNetSalary != null ? f : null;
  });
  readonly loanBalance = computed(() => {
    const l = this.me()?.activeLoansAndAdvances;
    return l ? (l.totalRemainingLoanAmount ?? 0) + (l.totalRemainingAdvanceAmount ?? 0) : 0;
  });

  requestIcon(type: string): { icon: string; tone: string } {
    const t = (type || '').toLowerCase();
    if (t.includes('leave')) return { icon: 'event_note', tone: 'teal' };
    if (t.includes('loan')) return { icon: 'account_balance', tone: 'indigo' };
    if (t.includes('advance')) return { icon: 'request_quote', tone: 'rose' };
    if (t.includes('expense') || t.includes('claim')) return { icon: 'receipt_long', tone: 'orange' };
    if (t.includes('time') || t.includes('correction')) return { icon: 'edit_calendar', tone: 'violet' };
    return { icon: 'pending_actions', tone: 'amber' };
  }

  readonly departmentBars = computed<BarDatum[]>(() =>
    [...this.departments()]
      .filter(d => d.isActive !== false)
      .sort((a, b) => (b.employeeCount ?? 0) - (a.employeeCount ?? 0))
      .slice(0, 6)
      .map(d => ({ label: d.departmentName, value: d.employeeCount ?? 0 })));

  readonly departmentMax = computed(() => Math.max(1, ...this.departmentBars().map(b => b.value)));
  readonly departmentHeadcount = computed(() => this.departmentBars().reduce((t, b) => t + b.value, 0));

  readonly genderSegments = computed<Segment[]>(() => {
    const d = this.hrStats()?.demographics;
    if (!d || (d.malePercentage + d.femalePercentage) <= 0) return [];
    const other = Math.max(0, 100 - d.malePercentage - d.femalePercentage);
    const segs: Segment[] = [
      { key: 'male', label: 'Male', value: Math.round(d.malePercentage), icon: 'male', colorVar: '--sa-series-1' },
      { key: 'female', label: 'Female', value: Math.round(d.femalePercentage), icon: 'female', colorVar: '--sa-series-2' }
    ];
    if (other >= 1) segs.push({ key: 'other', label: 'Not specified', value: Math.round(other), icon: 'person', colorVar: '--sa-series-3' });
    return segs;
  });

  readonly ageBars = computed<BarDatum[]>(() => {
    const groups = this.hrStats()?.demographics?.ageGroupPercentages ?? {};
    const bars = Object.entries(groups).map(([label, value]) => ({ label, value: Math.round(value) }));
    return bars.some(b => b.value > 0) ? bars : [];
  });

  readonly largestDepartment = computed(() => {
    const d = this.hrStats()?.demographics;
    return d && d.largestDepartmentName && d.largestDepartmentName !== 'N/A'
      ? `${d.largestDepartmentName} · ${Math.round(d.largestDepartmentPercentage)}%`
      : null;
  });

  readonly payrollBars = computed<BarDatum[]>(() =>
    (this.hrStats()?.payrollOutflow ?? []).slice(-6).map(p => ({
      label: p.periodName,
      value: p.basicSalarySum,
      detail: [
        `Basic salary: ${this.money(p.basicSalarySum)}`,
        `Bonuses: ${this.money(p.totalBonusesSum)}`,
        `Deductions: ${this.money(p.totalDeductionsSum)}`
      ]
    })));

  readonly expenseBars = computed<BarDatum[]>(() =>
    (this.hrStats()?.monthlyExpenses ?? []).slice(-6).map(e => ({ label: e.month, value: e.totalExpense })));

  readonly payrollMax = computed(() => Math.max(1, ...this.payrollBars().map(b => b.value)));
  readonly expenseMax = computed(() => Math.max(1, ...this.expenseBars().map(b => b.value)));

  readonly setupSteps = computed<SetupStep[]>(() => {
    if (this.loading() || this.isPersonal()) return [];
    const steps: SetupStep[] = [];
    if (this.can(this.rules.departments)) {
      steps.push({ label: 'Add your team members', done: (this.activeEmployees() ?? this.departmentHeadcount()) > 1, route: '/employees/add' });
      steps.push({ label: 'Assign people to departments', done: this.departmentHeadcount() > 0, route: '/employees/departments' });
    }
    if (this.can(this.rules.holidays)) {
      steps.push({ label: 'Set up company holidays', done: this.upcomingHolidays().length > 0, route: '/holidays' });
    }
    return steps;
  });

  readonly setupDone = computed(() => this.setupSteps().filter(s => s.done).length);
  readonly showSetup = computed(() => this.setupSteps().some(s => !s.done));

  // ── Lifecycle ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    interval(30_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.now.set(new Date()));

    // Plan first: every other request depends on what the plan includes.
    this.entitlementService.load()
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe(plan => {
        this.plan.set(plan);
        this.loadWidgets();
      });
  }

  private loadWidgets(): void {
    const when = <T>(access: Access, request: () => Observable<T>, fallback: T): Observable<T> =>
      this.can(access) ? request().pipe(catchError(() => of(fallback))) : of(fallback);

    const year = new Date().getFullYear();
    // hr-stats feeds three widgets; fetch it if any of them is visible.
    const needsHrStats = this.can(this.rules.demographics) || this.can(this.rules.payroll) || this.can(this.rules.expenses);

    forkJoin({
      hrOverview: when(this.rules.workforce, () => this.dashboard.getHrOverview(true).pipe(map(r => r?.data ?? null)), null as HrOverview | null),
      hrStats: needsHrStats
        ? this.dashboard.getHrStats(true).pipe(map(r => r?.data ?? null), catchError(() => of(null)))
        : of(null),
      team: when(this.rules.attendance, () => this.dashboard.getManagerOverview(true).pipe(map(r => r?.data ?? null)), null as ManagerOverview | null),
      hires: when(this.rules.hires, () => this.dashboard.getLatestHires(true).pipe(map(r => r?.data ?? [])), [] as LatestHiredEmployee[]),
      departments: when(this.rules.departments, () => this.employees.getDepartments(), [] as Department[]),
      holidays: when(this.rules.holidays, () => this.holidays.getCompanyHolidays(year), [] as CompanyHoliday[]),
      news: when(this.rules.news, () => this.news.getAllNews({ page: 1, pageSize: 3, status: 'Published' }).pipe(map(r => r?.data ?? [])), [] as NewsDto[]),
      session: when(this.rules.clock, () => this.attendance.getCurrentSession(), null as TimeTrackingSession | null),
      me: this.showMe()
        ? this.dashboard.getEmployeeOverview(true).pipe(map(r => r?.data ?? null), catchError(() => of(null)))
        : of(null as EmployeeOverview | null),
      pendingLoans: when(this.rules.loans, () => this.payroll.getAllLoans({ Status: 'pending', Page: 1, PageSize: 50 }).pipe(map(r => this.countOf(r))), 0),
      pendingAdvances: when(this.rules.advances, () => this.payroll.getAllSalaryAdvanceRequests({ Status: 'pending', Page: 1, PageSize: 50 }).pipe(map(r => this.countOf(r))), 0)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        // APIs may answer with `data: null`; widgets treat that the same as "no data".
        this.hrOverview.set(result.hrOverview ?? null);
        this.hrStats.set(result.hrStats ?? null);
        this.team.set(result.team ?? null);
        this.hires.set(Array.isArray(result.hires) ? result.hires : []);
        this.departments.set(Array.isArray(result.departments) ? result.departments : []);
        this.upcomingHolidays.set(this.nextHolidays(Array.isArray(result.holidays) ? result.holidays : []));
        this.latestNews.set(Array.isArray(result.news) ? result.news : []);
        this.session.set(result.session ?? null);
        this.me.set(result.me ?? null);
        this.pendingLoans.set(result.pendingLoans ?? 0);
        this.pendingAdvances.set(result.pendingAdvances ?? 0);
        this.loading.set(false);
      });

    if (this.can(this.rules.payroll) || this.can(this.rules.expenses) || this.showMe()) {
      this.settings.getOrganizationCurrency()
        .pipe(catchError(() => of('')), takeUntilDestroyed(this.destroyRef))
        .subscribe(code => this.currency.set(this.settings.getCurrencySymbol(code || undefined)));
    }
  }

  /** Paged list APIs answer in a few shapes; count the pending items either way. */
  private countOf(response: any): number {
    const body = response?.data ?? response;
    if (Array.isArray(body)) return body.length;
    const total = body?.totalCount ?? body?.totalRecords ?? body?.total;
    if (typeof total === 'number') return total;
    return Array.isArray(body?.data) ? body.data.length : Array.isArray(body?.items) ? body.items.length : 0;
  }

  private nextHolidays(all: CompanyHoliday[]): CompanyHoliday[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (all ?? [])
      .filter(h => h.isActive !== false && new Date(h.holidayDate) >= today)
      .sort((a, b) => new Date(a.holidayDate).getTime() - new Date(b.holidayDate).getTime())
      .slice(0, 3);
  }

  // ── Clock in / out ─────────────────────────────────────────────────────
  get isClockedIn(): boolean {
    const s = this.session();
    return !!s && s.isActive && !s.checkOutTime;
  }

  clockIn(): void {
    this.geoClock('in');
  }

  clockOut(): void {
    this.dialog.open(CommentDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      panelClass: 'attendance-dialog-panel',
      data: { title: 'Clock out', label: 'Day updates / comments', placeholder: 'E.g., finished payroll review…', required: false }
    }).afterClosed().subscribe(comment => {
      if (comment !== undefined) this.geoClock('out', comment);
    });
  }

  private geoClock(action: 'in' | 'out', notes?: string): void {
    this.clockBusy.set(true);
    const send = (location: { latitude?: number; longitude?: number }) => {
      const request: GeoClockInRequest = {
        action,
        ...location,
        notes,
        matchResult: 'match',
        deviceInfo: JSON.stringify({ userAgent: navigator.userAgent.substring(0, 200), timestamp: new Date().toISOString() })
      };
      this.geoFence.geoClock(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => {
          this.notification.showSuccess(res.message || (action === 'in' ? 'Clocked in.' : 'Clocked out.'));
          this.attendance.getCurrentSession().pipe(catchError(() => of(null))).subscribe(s => this.session.set(s));
          this.clockBusy.set(false);
        },
        error: e => {
          this.notification.showError(e?.error?.message || e?.message || `Couldn't clock ${action}. Please try again.`);
          this.clockBusy.set(false);
        }
      });
    };

    if (!navigator.geolocation) {
      send({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      p => send({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => send({}),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  // ── Chart helpers ──────────────────────────────────────────────────────
  pct(value: number, max: number): number {
    return max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  }

  segmentWidth(segments: Segment[], seg: Segment): number {
    const total = segments.reduce((t, s) => t + s.value, 0);
    return total ? (seg.value / total) * 100 : 0;
  }

  showTip(event: MouseEvent | FocusEvent, title: string, lines: string[]): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event instanceof MouseEvent && event.clientX ? event.clientX : rect.left + rect.width / 2;
    const y = event instanceof MouseEvent && event.clientY ? event.clientY : rect.top;
    this.tooltip.set({ x, y, title, lines });
  }

  hideTip(): void {
    this.tooltip.set(null);
  }

  money(value: number): string {
    return `${this.currency()} ${this.compact(value)}`;
  }

  compact(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    if (abs >= 10_000) return `${(value / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}K`;
    return Math.round(value).toLocaleString();
  }

  daysUntil(date: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    return days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
  }
}
