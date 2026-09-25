import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ViewChild, ElementRef, HostListener } from '@angular/core';
import { SharedCommonModule } from '@shared/shared-common.module';
// Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { ServerNotificationService } from '@core/services/server-notification';

// PrimeNG
import { AvatarModule } from 'primeng/avatar';

// Services
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { NotificationService } from '@core/services/notification.service';
import { User } from '@core/models/auth.models';
import { UiScaleService } from '@core/services/ui-scale.service';

interface SearchItem {
  name: string;
  route: string;
  keywords: string[];
  icon?: string;
  /** Module category label shown in search results */
  category?: string;
  /** If set, item is visible when user has ANY sub-menu permission under this menu */
  menuName?: string;
  /** If set, item is visible when user has any permission under this sub-menu */
  subMenuName?: string;
  /** If set, item is visible only if this specific action key is granted */
  actionKey?: string;
  /** If set, item is visible if ANY of these action keys is granted */
  anyOfActionKeys?: string[];
  /** Fallback: if none of the above – always visible when authenticated */
  alwaysVisible?: boolean;
}
import { PaymentService } from '@core/services/payment.service';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { NotificationDialogueComponent } from '../../../features/notification-dialogue/notification-dialogue.component';


@Component({
  selector: 'app-header',
  imports: [
    SharedCommonModule,
    CommonModule,
    FormsModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDividerModule,
    NotificationDialogueComponent,
    AvatarModule
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {

  @Input() isHandset = false;
  @Output() menuToggle = new EventEmitter<void>();
  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('notificationContainer') notificationContainer!: ElementRef;
  currentUser: User | null = null;
  currentPlanName: string | null = null;
  isSubscriptionExpired: boolean = false;
  currentBillingCycle: string | null = null;
  isDarkMode = false;
  scalePercent = 100;
  zoomOptions = [70, 80, 90, 100, 110, 120, 130, 150];
  recommendedZoom = 90;

  //Search variables
  filteredItems: SearchItem[] = [];

  // All searchable items mapped to the same permission model as the sidebar.
  // Each item uses menuName/subMenuName/actionKey/anyOfActionKeys so that
  // search results are ALWAYS consistent with what the user can see in the sidebar.
  private allSearchItems: SearchItem[] = [

    // ─── Dashboard ───────────────────────────────────────────────
    { name: 'Dashboard', route: '/dashboard', icon: 'dashboard', category: 'Dashboard',
      keywords: ['dashboard', 'home', 'main', 'overview', 'summary'],
      alwaysVisible: true },

    // ─── Employee Management ─────────────────────────────────────
    { name: 'All Employees', route: '/employees', icon: 'group', category: 'Employees',
      keywords: ['employees', 'employee list', 'all employees', 'staff', 'team members', 'people'],
      menuName: 'Employee Management', subMenuName: 'All Employees' },

    { name: 'Add Employee', route: '/employees/add', icon: 'person_add', category: 'Employees',
      keywords: ['add employee', 'new employee', 'create employee', 'hire', 'register employee'],
      menuName: 'Employee Management', subMenuName: 'Add Employee' },

    { name: 'Departments', route: '/employees/departments', icon: 'apartment', category: 'Employees',
      keywords: ['departments', 'department', 'department list', 'team structure'],
      menuName: 'Employee Management', subMenuName: 'Department' },

    { name: 'Positions', route: '/employees/positions', icon: 'work', category: 'Employees',
      keywords: ['positions', 'position', 'job positions', 'job titles'],
      menuName: 'Employee Management', subMenuName: 'Positions' },

    // ─── Attendance ──────────────────────────────────────────────
    { name: 'My Attendance', route: '/attendance/dashboard', icon: 'access_time', category: 'Attendance',
      keywords: ['my attendance', 'attendance dashboard', 'check in', 'check out', 'punch in'],
      menuName: 'Attendance', subMenuName: 'My Attendance' },

    { name: 'Time Tracker', route: '/attendance/time-tracker', icon: 'timer', category: 'Attendance',
      keywords: ['time tracker', 'tracker', 'time tracking', 'clock', 'timer'],
      menuName: 'Attendance', subMenuName: 'Time Tracker' },

    { name: 'Team Attendance', route: '/attendance/team-attendance', icon: 'groups', category: 'Attendance',
      keywords: ['team attendance', 'employee attendance', 'staff attendance'],
      menuName: 'Attendance', subMenuName: 'Team Attendance' },

    { name: 'Attendance Reports', route: '/attendance/reports', icon: 'assessment', category: 'Attendance',
      keywords: ['attendance reports', 'attendance report', 'attendance analytics'],
      menuName: 'Attendance', subMenuName: 'Reports' },

    { name: 'Shifts', route: '/attendance/shift', icon: 'schedule', category: 'Attendance',
      keywords: ['shifts', 'shift', 'work schedule', 'shift management', 'rostering'],
      menuName: 'Attendance', subMenuName: 'Shifts' },

    { name: 'Overtime', route: '/attendance/overtime', icon: 'more_time', category: 'Attendance',
      keywords: ['overtime', 'extra hours', 'ot'],
      menuName: 'Attendance', subMenuName: 'Overtime' },

    { name: 'Geo-Fences', route: '/attendance/geo-fences', icon: 'fence', category: 'Attendance',
      keywords: ['geo fence', 'geofence', 'location fence', 'geo boundary'],
      menuName: 'Attendance', subMenuName: 'Geo-Fences' },

    { name: 'Geo Violations', route: '/attendance/geo-violations', icon: 'warning', category: 'Attendance',
      keywords: ['geo violations', 'geofence violations', 'location violations'],
      menuName: 'Attendance', subMenuName: 'Geo Violations' },

    // ─── Timesheet ───────────────────────────────────────────────
    { name: 'Timesheet Dashboard', route: '/timesheet/dashboard', icon: 'date_range', category: 'Timesheet',
      keywords: ['timesheet', 'timesheet dashboard', 'timesheets'],
      menuName: 'Timesheet', subMenuName: 'Dashboard' },

    { name: 'Timesheet Periods', route: '/timesheet/periods', icon: 'view_list', category: 'Timesheet',
      keywords: ['timesheet periods', 'periods', 'pay periods'],
      menuName: 'Timesheet', subMenuName: 'Periods' },

    { name: 'Timesheet Approvals', route: '/timesheet/approvals', icon: 'check_circle', category: 'Timesheet',
      keywords: ['timesheet approvals', 'approve timesheet'],
      menuName: 'Timesheet', subMenuName: 'Approvals' },

    { name: 'Timesheet Projects', route: '/timesheet/projects', icon: 'work', category: 'Timesheet',
      keywords: ['timesheet projects', 'projects'],
      menuName: 'Timesheet', subMenuName: 'Projects' },

    { name: 'Rate Cards', route: '/timesheet/rate-cards', icon: 'attach_money', category: 'Timesheet',
      keywords: ['rate cards', 'billing rates', 'hourly rates'],
      menuName: 'Timesheet', subMenuName: 'Rate Cards' },

    { name: 'Comp Time', route: '/timesheet/comp-time', icon: 'hourglass_empty', category: 'Timesheet',
      keywords: ['comp time', 'compensatory time', 'compensatory leave'],
      menuName: 'Timesheet', subMenuName: 'Comp Time' },

    { name: 'Payroll Export', route: '/timesheet/payroll-export', icon: 'payments', category: 'Timesheet',
      keywords: ['payroll export', 'export payroll', 'timesheet export'],
      menuName: 'Timesheet', subMenuName: 'Payroll Export' },

    // ─── Leave Management ────────────────────────────────────────
    { name: 'My Leaves', route: '/leave/dashboard', icon: 'event', category: 'Leave',
      keywords: ['my leaves', 'leave dashboard', 'my leave', 'leaves', 'leave balance'],
      menuName: 'Leave Management', subMenuName: 'My Leaves' },

    { name: 'Team Leaves', route: '/leave/team', icon: 'groups', category: 'Leave',
      keywords: ['team leaves', 'team leave', 'employee leaves', 'staff leaves'],
      menuName: 'Leave Management', subMenuName: 'Team Leaves' },

    { name: 'Team Leave Requests', route: '/leave/team-requests', icon: 'group_work', category: 'Leave',
      keywords: ['team requests', 'leave requests', 'pending leaves', 'approve leave'],
      menuName: 'Leave Management', subMenuName: 'Team Requests' },

    { name: 'Leave Types', route: '/leave/types', icon: 'category', category: 'Leave',
      keywords: ['leave types', 'leave type', 'types of leave', 'leave categories'],
      menuName: 'Leave Management', subMenuName: 'Leave Types' },

    // ─── Holidays ────────────────────────────────────────────────
    { name: 'Holiday Management', route: '/holidays', icon: 'celebration', category: 'Holidays',
      keywords: ['holidays', 'public holidays', 'holiday list', 'holiday management'],
      menuName: 'Holidays', subMenuName: 'Holiday Management' },

    { name: 'My Holidays', route: '/holidays/my-holidays', icon: 'beach_access', category: 'Holidays',
      keywords: ['my holidays', 'personal holidays', 'upcoming holidays'],
      menuName: 'Holidays', subMenuName: 'My Holidays' },

    // ─── Performance ─────────────────────────────────────────────
    { name: 'My Performance', route: '/performance/dashboard', icon: 'person_outline', category: 'Performance',
      keywords: ['my performance', 'performance dashboard', 'performance overview'],
      menuName: 'Performance', subMenuName: 'My Performance' },

    { name: 'Appraisal Cycles', route: '/performance/cycles', icon: 'assessment', category: 'Performance',
      keywords: ['appraisal cycles', 'cycles', 'appraisal cycle', 'review cycle'],
      menuName: 'Performance', subMenuName: 'Appraisal Cycles' },

    { name: 'Appraisals', route: '/performance/appraisals', icon: 'rate_review', category: 'Performance',
      keywords: ['appraisal', 'appraisals', 'performance review', 'evaluation', 'reviews'],
      menuName: 'Performance', subMenuName: 'Appraisals' },

    { name: 'Skills Matrix', route: '/performance/skills', icon: 'psychology', category: 'Performance',
      keywords: ['skills', 'skill matrix', 'skills matrix', 'competencies', 'competency'],
      menuName: 'Performance', subMenuName: 'Skill Matrix' },

    { name: 'Goals & KRAs', route: '/performance/goals', icon: 'flag', category: 'Performance',
      keywords: ['goals', 'kra', 'kras', 'key result areas', 'objectives', 'targets', 'okr'],
      menuName: 'Performance', subMenuName: 'Goals & KRAs' },

    { name: 'Performance Reports', route: '/performance/reports', icon: 'analytics', category: 'Performance',
      keywords: ['performance reports', 'performance report', 'performance analytics'],
      menuName: 'Performance', subMenuName: 'Performance Reports' },

    // ─── Assets Management ───────────────────────────────────────
    { name: 'Asset Types', route: '/assets/types', icon: 'folder', category: 'Assets',
      keywords: ['assets', 'asset types', 'type of assets', 'asset categories'],
      menuName: 'Assets Management', subMenuName: 'Type of Assets' },

    { name: 'Assets', route: '/assets/create', icon: 'inventory_2', category: 'Assets',
      keywords: ['assets', 'manage assets', 'asset list', 'company assets'],
      menuName: 'Assets Management', subMenuName: 'Assets' },

    // ─── Calendar ────────────────────────────────────────────────
    { name: 'Calendar', route: '/calendar', icon: 'calendar_month', category: 'Calendar',
      keywords: ['calendar', 'events', 'schedule', 'monthly view'],
      menuName: 'Calendar' },

    // ─── AI Assistant ────────────────────────────────────────────
    { name: 'AI Assistant', route: '/ai-assistant', icon: 'smart_toy', category: 'AI',
      keywords: ['ai', 'assistant', 'ai assistant', 'chat', 'help', 'support', 'bot'],
      menuName: 'AI Assistant' },

    // ─── Subscription & Billing ──────────────────────────────────
    { name: 'Subscription Plans', route: '/subscription', icon: 'subscriptions', category: 'Subscription',
      keywords: ['subscription', 'plans', 'upgrade', 'plan', 'billing plan'],
      menuName: 'Subscription' },

    { name: 'Billing History', route: '/subscription/billing', icon: 'receipt_long', category: 'Billing',
      keywords: ['billing', 'billing history', 'invoices', 'payments', 'receipts'],
      menuName: 'Billings' },

    // ─── Expense ─────────────────────────────────────────────────
    { name: 'Expense Categories', route: '/expense/categories', icon: 'category', category: 'Expense',
      keywords: ['expense', 'expense categories', 'categories'],
      menuName: 'Expense', subMenuName: 'Category' },

    { name: 'Expense Claims', route: '/expense/claims', icon: 'receipt_long', category: 'Expense',
      keywords: ['expense claims', 'claims', 'reimbursement', 'expense request'],
      menuName: 'Expense', subMenuName: 'Claims' },

    { name: 'Recurring Expenses', route: '/expense/recurring', icon: 'repeat', category: 'Expense',
      keywords: ['recurring expenses', 'recurring', 'scheduled expenses'],
      menuName: 'Expense', subMenuName: 'Recurring Expenses' },

    { name: 'Expense Reports', route: '/expense/expense-report', icon: 'summarize', category: 'Expense',
      keywords: ['expense reports', 'expense report', 'expense analytics'],
      menuName: 'Expense', subMenuName: 'Reports' },

    // ─── News ────────────────────────────────────────────────────
    { name: 'News Dashboard', route: '/news/dashboard', icon: 'newspaper', category: 'News',
      keywords: ['news', 'news dashboard', 'company news', 'announcements'],
      menuName: 'News', subMenuName: 'New Dashboard' },

    { name: 'Create News', route: '/news/create-news', icon: 'edit', category: 'News',
      keywords: ['create news', 'post news', 'write announcement', 'new article'],
      menuName: 'News', subMenuName: 'Create News' },

    // ─── Help Desk ───────────────────────────────────────────────
    { name: 'Tickets Dashboard', route: '/help-desk/tickets', icon: 'confirmation_number', category: 'Help Desk',
      keywords: ['help desk', 'tickets', 'support tickets', 'ticket dashboard', 'issue tracker'],
      menuName: 'Help Desk', subMenuName: 'Tickets Dashboard' },

    { name: 'Agent Groups', route: '/help-desk/agent-group', icon: 'groups', category: 'Help Desk',
      keywords: ['agent group', 'agent groups', 'support team'],
      menuName: 'Help Desk', subMenuName: 'Agent Group' },

    { name: 'Ticket Involvement', route: '/help-desk/ticket-involvement', icon: 'assignment_ind', category: 'Help Desk',
      keywords: ['ticket involvement', 'my tickets', 'ticket assignments'],
      menuName: 'Help Desk', subMenuName: 'Ticket Involvement' },

    { name: 'Ticket Category', route: '/help-desk/ticket-category', icon: 'category', category: 'Help Desk',
      keywords: ['ticket category', 'ticket categories', 'ticket types'],
      menuName: 'Help Desk', subMenuName: 'Ticket Category' },

    // ─── Jobs ────────────────────────────────────────────────────
    { name: 'Job Openings', route: '/jobs/openings', icon: 'work_outline', category: 'Jobs',
      keywords: ['jobs', 'openings', 'job openings', 'vacancies', 'recruitment'],
      anyOfActionKeys: ['opnings_view_all'] },

    { name: 'Job Applications', route: '/jobs/applied', icon: 'how_to_reg', category: 'Jobs',
      keywords: ['job applications', 'applications', 'applicants', 'candidates', 'ats'],
      anyOfActionKeys: ['all_job_application', 'received_application_by_my_job_post', 'my_referenced_application', 'ats_inbox_view', 'my_self_application'] },

    { name: 'Recruitment Stages', route: '/jobs/stage', icon: 'label', category: 'Jobs',
      keywords: ['stages', 'recruitment stages', 'hiring stages', 'pipeline stages'],
      anyOfActionKeys: ['stage_view_all'] },

    { name: 'Question Bank', route: '/jobs/question-bank', icon: 'quiz', category: 'Jobs',
      keywords: ['question bank', 'interview questions', 'questions', 'assessment questions'],
      anyOfActionKeys: ['question_bank_view'] },

    // ─── Payroll ─────────────────────────────────────────────────
    { name: 'Bonus & Performance Pay', route: '/payroll/bonus', icon: 'card_giftcard', category: 'Payroll',
      keywords: ['bonus', 'performance pay', 'performance bonus', 'incentive', 'bonus pay'],
      anyOfActionKeys: ['bonus_entry_view', 'performance_pay_view'] },

    { name: 'Loans', route: '/payroll/loans', icon: 'account_balance', category: 'Payroll',
      keywords: ['loans', 'loan', 'employee loan', 'advance salary'],
      anyOfActionKeys: ['loan_admin_view'] },

    { name: 'Provident Funds', route: '/payroll/provident-fund', icon: 'account_balance_wallet', category: 'Payroll',
      keywords: ['provident fund', 'pf', 'pension', 'retirement fund'],
      anyOfActionKeys: ['pf_admin_view'] },

    { name: 'Tax Ledger', route: '/payroll/tax-ledger', icon: 'history_edu', category: 'Payroll',
      keywords: ['tax ledger', 'tax', 'transactions ledger', 'tax records'],
      actionKey: 'get_transaction_ledger' },

    { name: 'Salary Advances', route: '/payroll/salary-advances', icon: 'savings', category: 'Payroll',
      keywords: ['salary advance', 'salary advances', 'advance pay'],
      anyOfActionKeys: ['salary_advance_admin_list', 'salary_advance_admin_view'] },

    { name: 'Gratuity', route: '/payroll/gratuity', icon: 'emoji_events', category: 'Payroll',
      keywords: ['gratuity', 'end of service', 'eos'],
      actionKey: 'gratuity_admin_view' },

    { name: 'Social Security', route: '/payroll/social-security', icon: 'shield_person', category: 'Payroll',
      keywords: ['social security', 'social insurance', 'insurance'],
      menuName: 'Payroll' },

    { name: 'Payslip Management', route: '/payroll/payslips', icon: 'receipt_long', category: 'Payroll',
      keywords: ['payslip', 'payslips', 'salary slip', 'pay stub', 'paycheck'],
      anyOfActionKeys: ['my_payslip', 'compliance_payslip_view', 'payslip_generation', 'mail_upload_payslip'] },

    { name: 'Payroll Policies', route: '/payroll/policies', icon: 'rule', category: 'Payroll',
      keywords: ['payroll policies', 'payroll rules', 'salary policy', 'pay rules'],
      actionKey: 'payroll_rules_view' },

    { name: 'Payroll Time Tracking', route: '/payroll/time-tracking', icon: 'schedule', category: 'Payroll',
      keywords: ['payroll time tracking', 'overtime summary', 'attendance summary', 'late attendance'],
      anyOfActionKeys: ['overtime_entry_view', 'attendance_summary_view', 'late_attendance_view', 'leave_summary_view'] },

    { name: 'Payroll Periods', route: '/payroll/periods', icon: 'date_range', category: 'Payroll',
      keywords: ['payroll periods', 'pay periods', 'payroll schedule'],
      actionKey: 'payroll_period_view' },

    { name: 'My Benefits', route: '/payroll/my-benefits', icon: 'card_giftcard', category: 'Payroll',
      keywords: ['my benefits', 'benefits', 'employee benefits', 'perks'],
      actionKey: 'my_benefits' },

    { name: 'Payroll Calculation', route: '/payroll/calculation', icon: 'calculate', category: 'Payroll',
      keywords: ['payroll calculation', 'calculate payroll', 'salary calculation', 'payroll results'],
      anyOfActionKeys: ['payroll_calculation', 'payroll_result'] },

    // ─── Settings ────────────────────────────────────────────────
    { name: 'Company Settings', route: '/settings/general', icon: 'work_outline', category: 'Settings',
      keywords: ['company settings', 'general settings', 'organization settings', 'company info'],
      menuName: 'Settings', subMenuName: 'Company Name' },

    { name: 'Payslip Template', route: '/settings/payslip-template', icon: 'receipt_long', category: 'Settings',
      keywords: ['payslip template', 'salary slip template', 'payslip design'],
      anyOfActionKeys: ['payslip_template_view', 'payslip_template_edit'] },

    { name: 'Manage IPs', route: '/settings/ip-address', icon: 'how_to_reg', category: 'Settings',
      keywords: ['manage ips', 'ip address', 'ip whitelist', 'ip restriction'],
      menuName: 'Settings', subMenuName: 'Manage Ips' },

    { name: 'Career Management', route: '/settings/career-management', icon: 'business_center', category: 'Settings',
      keywords: ['career management', 'career portal', 'career page'],
      actionKey: 'career_management_view' },

    { name: 'Roles & Permissions', route: '/settings/roles', icon: 'admin_panel_settings', category: 'Settings',
      keywords: ['roles', 'permissions', 'role management', 'access control', 'rbac'],
      menuName: 'Settings', subMenuName: 'Roles' },

    { name: 'Company Policies', route: '/settings/policies', icon: 'policy', category: 'Settings',
      keywords: ['company policies', 'policies', 'hr policies', 'workplace policies'],
      menuName: 'Settings', subMenuName: 'Company Policies' },

    // ─── Onboarding ──────────────────────────────────────────────
    { name: 'Employee Onboarding', route: '/onboarding', icon: 'person_add', category: 'Onboarding',
      keywords: ['onboarding', 'employee onboarding', 'new hire', 'new joiner'],
      menuName: 'Onboarding', subMenuName: 'Employee Onboarding' },

    { name: 'Onboarding Configuration', route: '/settings/onboarding-configuration', icon: 'settings', category: 'Onboarding',
      keywords: ['onboarding config', 'onboarding configuration', 'onboarding settings'],
      menuName: 'Onboarding', subMenuName: 'Onboarding Configuration' },

    // ─── Profile (always visible) ────────────────────────────────
    { name: 'My Profile', route: '/profile', icon: 'person', category: 'Account',
      keywords: ['profile', 'my profile', 'user profile', 'account', 'personal details'],
      alwaysVisible: true },

    { name: 'Change Password', route: '/change-password', icon: 'lock', category: 'Account',
      keywords: ['change password', 'password', 'security', 'update password'],
      alwaysVisible: true },
  ];

  getSearchItems(): SearchItem[] {
    if (!this.currentUser) return [];

    return this.allSearchItems.filter(item => this.canAccessItem(item));
  }

  private canAccessItem(item: SearchItem): boolean {
    // Always visible items (Profile, Change Password, Dashboard)
    if (item.alwaysVisible) return true;

    // actionKey check – exact action must be granted
    if (item.actionKey) {
      if (item.menuName && item.subMenuName) {
        return this.authService.hasMenuPermission(item.menuName, item.subMenuName, item.actionKey);
      }
      return this.authService.hasPermissionByActionKey(item.actionKey);
    }

    // anyOfActionKeys – any of the action keys must be granted
    if (item.anyOfActionKeys && item.anyOfActionKeys.length > 0) {
      return item.anyOfActionKeys.some(key => this.authService.hasPermissionByActionKey(key));
    }

    // subMenuName – user must have any permission under that submenu
    if (item.menuName && item.subMenuName) {
      return this.authService.hasSubMenuPermission(item.menuName, item.subMenuName);
    }

    // menuName only – user must have any permission under that top-level menu
    if (item.menuName) {
      return this.authService.hasMenuParentPermission(item.menuName);
    }

    // No permission requirement specified
    return true;
  }

  notificationCount = 0; // Mock notification count
  slectedProfileFile: File | null = null;
  profilePreviewUrl: string | null = null;
  // Variables
  searchQuery = '';
  isSearchOpen = false;

  private destroy$ = new Subject<void>();

  // ⭐ ADD THIS FOR DROPDOWN ⭐
  isNotificationOpen = false;

  constructor(
    private employeeService: EmployeeService,
    private authService: AuthService,
    private paymentService: PaymentService,
    private themeService: ThemeService,
    private serverNotificationService: ServerNotificationService, // add this
    private notificationService: NotificationService,
    private uiScaleService: UiScaleService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.subscribeToUser();
    this.subscribeToTheme();
    this.uiScaleService.initializeScale();
    this.uiScaleService.scale$
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => {
        this.scalePercent = v;
      });
    // Add this for notifications
    // -----------------------------
    this.serverNotificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifs => {
        // Update badge count immediately
        this.notificationCount = notifs.filter(n => !n.isRead).length;
      });

    // Load notifications immediately if user exists
    const user = this.authService.getCurrentUserValue();
    if (user?.userId) {
      this.serverNotificationService.loadNotifications(user.userId);
    }

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onMenuToggle(): void {
    this.menuToggle.emit();
  }

  onThemeToggle(): void {
    this.themeService.toggleTheme();
  }
  onZoomIn(): void {
    this.uiScaleService.increase();
  }
  onZoomOut(): void {
    this.uiScaleService.decrease();
  }
  setZoom(value: number): void {
    this.uiScaleService.setScale(value);
  }

  // ⭐ UPDATED METHOD ⭐
  onNotificationsClick(): void {
    this.isNotificationOpen = !this.isNotificationOpen;
  }

  // ⭐ OPTIONAL: Close function if needed later ⭐
  closeNotifications(): void {
    this.isNotificationOpen = false;
  }
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isNotificationOpen) return;
    const target = event.target as Node;
    if (!this.notificationContainer?.nativeElement.contains(target)) {
      this.isNotificationOpen = false;
    }
  }

  onProfileClick(): void {
    // routerLink will handle navigation, this is just for any additional logic if needed
    // The menu will close automatically when clicking on mat-menu-item
  }

  onSettingsClick(): void {
    // routerLink will handle navigation, this is just for any additional logic if needed
    // The menu will close automatically when clicking on mat-menu-item
  }

  onLogout(): void {
    // Show loading immediately to prevent screen shrinking
    // The auth service will handle the logout and redirect
    this.authService.logout().subscribe({
      next: () => {
        // Redirect is handled by authService
      },
      error: (error) => {
        // Even if there's an error, redirect is still handled by authService
        console.error('Logout error:', error);
      }
    });
  }


  toggleSearch() {
    this.isSearchOpen = !this.isSearchOpen;
    if (this.isSearchOpen) {
      setTimeout(() => this.searchInput.nativeElement.focus(), 0);
    }
  }

  // Search functionality
  onSearch() {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.isSearchOpen = false;
      return;
    }

    // If there are filtered items, navigate to the first one
    if (this.filteredItems.length > 0) {
      this.navigateToRoute(this.filteredItems[0]);
    } else {
      // Try to find a match by keywords
      const searchItems = this.getSearchItems();
      const matchedItem = searchItems.find(item =>
        item.keywords.some(keyword =>
          query.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(query)
        )
      );

      if (matchedItem) {
        this.navigateToRoute(matchedItem);
      }
    }
  }

  onSearchChange(query: string) {
    if (!query) {
      this.filteredItems = [];
      return;
    }

    const lowerQuery = query.toLowerCase().trim();
    const searchItems = this.getSearchItems();

    // Filter items that match the query in name or keywords
    this.filteredItems = searchItems
      .filter(item => {
        const nameMatch = item.name.toLowerCase().includes(lowerQuery);
        const keywordMatch = item.keywords.some(keyword =>
          keyword.toLowerCase().includes(lowerQuery) ||
          lowerQuery.includes(keyword.toLowerCase())
        );
        return nameMatch || keywordMatch;
      })
      .slice(0, 8); // Limit to 8 results for better UX
  }

  navigateToRoute(item: SearchItem) {
    if (item.route) {
      this.router.navigate([item.route]);
      this.searchQuery = '';
      this.filteredItems = [];
      this.isSearchOpen = false;
    }
  }

  goToSection(item: SearchItem) {
    this.navigateToRoute(item);
  }

  onSearchBlur() {
    // Delay closing to allow click events on suggestions
    setTimeout(() => {
      // Don't close if there are suggestions visible
      if (this.filteredItems.length === 0 && !this.searchQuery.trim()) {
        this.isSearchOpen = false;
      }
    }, 200);
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    const firstName = this.currentUser.firstName || '';
    const lastName = this.currentUser.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  getUserDisplayName(): string {
    if (!this.currentUser) return 'User';
    return `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim();
  }

  private subscribeToUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        // Clear search when user changes
        this.searchQuery = '';
        this.filteredItems = [];
        if (this.currentUser?.userId) {
          this.loademployeeDetails(this.currentUser.userId);
        }
        this.loadSubscriptionDetails();
      });
  }

  private loadSubscriptionDetails(): void {
    // Pass a dummy ID because the backend overwrites it with the logged-in user's organizationId
    // The backend uses [Authorize], so it identifies the user and their organization automatically.
    this.paymentService.getCompanySubscriptionDetailsByCompanyId('00000000-0000-0000-0000-000000000000')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details) => {
          this.currentPlanName = details ? details.planName : 'Trial Account';
          this.isSubscriptionExpired = details ? details.isExpired : false;
          this.currentBillingCycle = details ? details.billingCycle : null;
        },
        error: (err) => {
          console.error('Failed to load subscription details', err);
          this.currentPlanName = 'Trial Account';
          this.isSubscriptionExpired = false;
          this.currentBillingCycle = null;
        }
      });
  }

  private loademployeeDetails(userId: string): void {
    this.employeeService.getEmployee(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employee) => {
          if (!employee) return;

          this.profilePreviewUrl = this.employeeService.resolveProfilePictureUrl(employee.profilePictureUrl);
        },
        error: (error) => {
          console.error('Failed to load employee details', error);
        }
      });
  }

  private subscribeToTheme(): void {
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isDarkMode = this.themeService.isDarkMode();
      });
  }
}
