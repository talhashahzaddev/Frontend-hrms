import { Component, Output, EventEmitter, OnInit, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';

// Material Modules
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';

// Services
import { AuthService } from '@core/services/auth.service';
import { User, UserPermissions } from '@core/models/auth.models';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  menuName?: string;
  subMenuName?: string;
  badge?: number;
  expanded?: boolean;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatExpansionModule,
    MatTooltipModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() menuItemClick = new EventEmitter<void>();

  currentUser: User | null = null;
  activeRoute = '';
  activeItemKey: string | null = null;
  @ViewChildren(MatExpansionPanel) panels!: QueryList<MatExpansionPanel>;

  private destroy$ = new Subject<void>();

  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
      menuName: 'Admin Dashboard',
    },
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/employee/dashboard',
      menuName: 'Employee Dashboard',
    },
    {
      label: 'Employee Management',
      icon: 'people',
      menuName: 'Employee Management',
      children: [
        { label: 'All Employees', icon: 'group', route: '/employees', menuName: 'Employee Management', subMenuName: 'All Employees', exact: true },
        { label: 'Add Employee', icon: 'person_add', route: '/employees/add', menuName: 'Employee Management', subMenuName: 'All Employees' },
        { label: 'Departments', icon: 'apartment', route: '/employees/departments', menuName: 'Employee Management', subMenuName: 'Department' },
        { label: 'Positions', icon: 'work', route: '/employees/positions', menuName: 'Employee Management', subMenuName: 'Positions' }
      ]
    },
    {
      label: 'Attendance',
      icon: 'schedule',
      menuName: 'Attendance',
      children: [
        { label: 'My Attendance', icon: 'access_time', route: '/attendance/dashboard', menuName: 'Attendance', subMenuName: 'My Attendance' },
        { label: 'Time Tracker', icon: 'timer', route: '/attendance/time-tracker', menuName: 'Attendance', subMenuName: 'TimeTracker' },
        { label: 'Team Attendance', icon: 'groups', route: '/attendance/team-attendance', menuName: 'Attendance', subMenuName: 'Team Attendance' },
        { label: 'Timesheet', icon: 'date_range', route: '/attendance/timesheet', menuName: 'Attendance', subMenuName: 'Timesheet' },
        { label: 'Timesheet Dashboard', icon: 'pending_actions', route: '/attendance/approvals', menuName: 'Attendance', subMenuName: 'Timesheet Dashboard' },
        { label: 'Reports', icon: 'assessment', route: '/attendance/reports', menuName: 'Attendance', subMenuName: 'Reports' },
        { label: 'Shifts', icon: 'access_time', route: '/attendance/shift', menuName: 'Attendance', subMenuName: 'Shifts' },
      ]
    },
    {
      label: 'Leave Management',
      icon: 'event_available',
      menuName: 'Leave Management',
      children: [
        {
          label: 'My Leaves',
          icon: 'event',
          route: '/leave/dashboard',
          menuName: 'Leave Management',
          subMenuName: 'My Leaves'
        },
        {
          label: 'Team Leaves',
          icon: 'groups',
          route: '/leave/team',
          menuName: 'Leave Management',
          subMenuName: 'Team Leaves'
        },
        {
          label: 'Team Requests',
          icon: 'group_work',
          route: '/leave/team-requests',
          menuName: 'Leave Management',
          subMenuName: 'Team Requests'
        },
        {
          label: 'Leave Types',
          icon: 'category',
          route: '/leave/types',
          menuName: 'Leave Management',
          subMenuName: 'Leave Types'
        }
      ]
    },
    {
      label: 'Holidays',
      icon: 'celebration',
      menuName: 'Holidays',
      children: [
        { label: 'Holiday Management', icon: 'event', route: '/holidays', menuName: 'Holidays', subMenuName: 'Holiday Management', exact: true },
        { label: 'My Holidays', icon: 'beach_access', route: '/holidays/my-holidays', menuName: 'Holidays', subMenuName: 'My Holidays' },
      ]
    },
    {
      label: 'Payroll',
      icon: 'payments',
      menuName: 'Payroll',
      children: [
        { label: 'Payroll Periods', icon: 'date_range', route: '/payroll/periods', menuName: 'Payroll', subMenuName: 'Payroll Periods' },
        { label: 'Process Payroll', icon: 'calculate', route: '/payroll/process', menuName: 'Payroll', subMenuName: 'Process Payroll' },
        { label: 'Salary Components', icon: 'tune', route: '/payroll/salary-component', menuName: 'Payroll', subMenuName: 'Salary Components' },
        { label: 'Payroll Reports', icon: 'summarize', route: '/payroll/reports', menuName: 'Payroll', subMenuName: 'Payroll Reports' },
        { label: 'Salary Slips', icon: 'receipt', route: '/payroll/slips', menuName: 'Payroll', subMenuName: 'Salary Slips' }
      ]
    },
    {
      label: 'Assets Management',
      icon: 'inventory_2',
      menuName: 'Assets Management',
      children: [
        { label: 'Types of Assets', icon: 'category', route: '/assets/types', menuName: 'Assets Management', subMenuName: 'Type of Assets' },
        { label: 'Assets', icon: 'add_box', route: '/assets/create', menuName: 'Assets Management', subMenuName: 'Assets' }
      ]
    },
    {
      label: 'Performance',
      icon: 'trending_up',
      menuName: 'Performance',
      children: [
        { label: 'My Performance', icon: 'person_outline', route: '/performance/dashboard', menuName: 'Performance', subMenuName: 'My Performance' },
        { label: 'Performance', icon: 'assessment', route: '/performance/dashboard', menuName: 'Performance', subMenuName: 'Performance' },
        { label: 'Appraisal Cycles', icon: 'assessment', route: '/performance/dashboard', menuName: 'Performance', subMenuName: 'Appraisal Cycles' },
        { label: 'Appraisals', icon: 'rate_review', route: '/performance/appraisals', menuName: 'Performance', subMenuName: 'Appraisals' },
        { label: 'Skills Matrix', icon: 'psychology', route: '/performance/skills', menuName: 'Performance', subMenuName: 'Skill Matrix' },
        { label: 'Goals & KRAs', icon: 'flag', route: '/performance/goals', menuName: 'Performance', subMenuName: 'Goals & KRAs' },
        { label: 'Performance Reports', icon: 'analytics', route: '/performance/reports', menuName: 'Performance', subMenuName: 'Performance Reports' }
      ]
    },
    {
      label: 'Calendar',
      icon: 'calendar_month',
      route: '/calendar',
      menuName: 'Calendar'
    },
    {
      label: 'AI Assistant',
      icon: 'smart_toy',
      route: '/ai-assistant',
      menuName: 'AI Assistant'
    },
    {
      label: 'Subscription',
      icon: 'subscriptions',
      route: '/subscription',
      menuName: 'Subscription'
    },
    {
      label: 'Billing',
      icon: 'receipt_long',
      route: '/subscription/billing',
      menuName: 'Billings'
    },
    {
      label: 'Expense',
      icon: 'receipt_long',
      menuName: 'Expense',
      children: [
        { label: 'Category', icon: 'category', route: '/expense/categories', exact: true, menuName: 'Expense', subMenuName: 'Category' },
        { label: 'Claims', icon: 'receipt_long', route: '/expense/claims', exact: true, menuName: 'Expense', subMenuName: 'Claims' },
        { label: 'Recurring Expenses', icon: 'repeat', route: '/expense/recurring', exact: true, menuName: 'Expense', subMenuName: 'Recurring Expenses' },
        { label: 'Reports', icon: 'summarize', route: '/expense/expense-report', exact: true, menuName: 'Expense', subMenuName: 'Reports' }
      ]
    },
    {
      label: 'News',
      icon: 'event_available',
      menuName: 'News',
      children: [
        { label: 'News Dashboard', icon: 'event', route: '/news/dashboard', menuName: 'News', subMenuName: 'New Dashboard' },
        { label: 'Create News', icon: 'event', route: '/news/create-news', exact: true, menuName: 'News', subMenuName: 'New Dashboard' }

      ]
    },
    {
      label: 'Jobs',
      icon: 'work',
      menuName: 'Jobs',
      children: [
        { label: 'Openings', icon: 'work_outline', route: '/jobs/openings', menuName: 'Jobs', subMenuName: 'Openings' },
        { label: 'Job Applications', icon: 'how_to_reg', route: '/jobs/applied', menuName: 'Jobs', subMenuName: 'Job Applications' },
        { label: 'Stage', icon: 'label', route: '/jobs/stage', menuName: 'Jobs', subMenuName: 'Stage' }
      ]
    },
    {
      label: 'Payroll',
      icon: 'payments',
      children: [
        { label: 'Policies', icon: 'rule', route: '/payroll/policies' },
        { label: 'Time Tracking', icon: 'schedule', route: '/payroll/time-tracking' }
      ]
    },
    {
      label: 'Settings',
      icon: 'settings',
      menuName: 'Settings',
      children: [
        { label: 'Company Settings', icon: 'work_outline', route: '/settings/general', menuName: 'Settings', subMenuName: 'Company Name' },
        { label: 'Manage Ips', icon: 'how_to_reg', route: '/settings/ip-address', menuName: 'Settings', subMenuName: 'Manage Ips' },
        { label: 'Career Management', icon: 'business_center', route: '/settings/career-management', menuName: 'Settings', subMenuName: 'Career management' },
        { label: 'Roles', icon: 'admin_panel_settings', route: '/settings/roles', menuName: 'Settings', subMenuName: 'Roles' }
      ]
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.subscribeToUser();
    this.subscribeToRouterEvents();
    // Ensure active state is correct on initial load (before first NavigationEnd)
    this.activeRoute = this.router.url;
    this.setActiveItemByRoute(this.activeRoute);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onMenuItemClick(item: MenuItem, parent?: MenuItem): void {
    this.activeItemKey = this.getItemKey(item);
    if (!parent && (!item.children || item.children.length === 0)) {
      this.collapseAllGroups();
    }
    this.menuItemClick.emit();
  }

  isActiveRoute(route: string, exact = false): boolean {
    if (!route) return false;
    return exact
      ? this.activeRoute === route
      : (this.activeRoute === route || this.activeRoute.startsWith(route + '/'));
  }

  isActiveItem(item: MenuItem): boolean {
    return this.activeItemKey === this.getItemKey(item);
  }

  isParentActive(item: MenuItem): boolean {
    if (!item.children) return false;
    return item.children.some(child => {
      if (!child.route) return false;
      return this.activeRoute === child.route || this.activeRoute.startsWith(child.route + '/');
    });
  }

  isGroupContainsActive(item: MenuItem): boolean {
    if (!item.children) return false;
    return this.getFilteredChildren(item.children).some(child => this.isActiveItem(child));
  }

  hasPermission(item: MenuItem): boolean {
    // If the item has no menuName, it either has no permission requirements or is a standalone item
    if (!item.menuName) {
      return true;
    }

    // For parent menu items (those with children), check if the menu has any visible submenus
    if (item.children && item.children.length > 0) {
      return this.authService.hasMenuParentPermission(item.menuName);
    }

    // For child menu items, check if the specific submenu has permissions
    if (item.subMenuName) {
      return this.authService.hasSubMenuPermission(item.menuName, item.subMenuName);
    }

    // Fallback: allow if we can't determine permissions
    return this.authService.hasMenuParentPermission(item.menuName);
  }

  getFilteredMenuItems(): MenuItem[] {
    return this.menuItems.filter(item => this.hasPermission(item));
  }

  getFilteredChildren(children: MenuItem[]): MenuItem[] {
    return children.filter(child => this.hasPermission(child));
  }

  private getItemKey(item: MenuItem): string {
    return `${item.route || ''}|${item.label}`;
  }

  private setActiveItemByRoute(url: string): void {
    const visibleItems = this.getFilteredMenuItems();
    for (const item of visibleItems) {
      if (!item.children || item.children.length === 0) {
        if (item.route && this.isActiveRoute(item.route, true)) {
          this.activeItemKey = this.getItemKey(item);
          return;
        }
      }
    }
    for (const parent of visibleItems) {
      const children = parent.children ? this.getFilteredChildren(parent.children) : [];
      for (const child of children) {
        if (child.route && this.isActiveRoute(child.route, !!child.exact)) {
          this.activeItemKey = this.getItemKey(child);
          return;
        }
      }
    }
    this.activeItemKey = null;
  }


  private subscribeToUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => { this.currentUser = user; });
  }

  private subscribeToRouterEvents(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe((event) => {
        this.activeRoute = (event as NavigationEnd).url;
        this.setActiveItemByRoute(this.activeRoute);
      });
  }

  private collapseAllGroups(): void {
    if (this.panels) { this.panels.forEach(p => p.close()); }
  }
}
