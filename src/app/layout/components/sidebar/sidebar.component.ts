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
import { User } from '@core/models/auth.models';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  roles?: string[];
  badge?: number;
  expanded?: boolean;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
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
      roles: ['Super Admin', 'HR Manager']
    },
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/performance/dashboard',
      roles: ['Manager', 'Employee']
    }
    ,
    {
      label: 'Employee Management',
      icon: 'people',
      roles: ['Super Admin', 'HR Manager'],
      children: [
        { label: 'All Employees', icon: 'group', route: '/employees', exact: true },
        { label: 'Add Employee', icon: 'person_add', route: '/employees/add', roles: ['Super Admin', 'HR Manager'] },
        { label: 'Departments', icon: 'apartment', route: '/employees/departments', roles: ['Super Admin', 'HR Manager'] },
        { label: 'Positions', icon: 'work', route: '/employees/positions', roles: ['Super Admin', 'HR Manager'] }
      ]
    },
    {
      label: 'Attendance',
      icon: 'schedule',
      children: [
        { label: 'My Attendance', icon: 'access_time', route: '/attendance/dashboard' },
        { label: 'Time Tracker', icon: 'timer', route: '/attendance/time-tracker' },
        { label: 'Team Attendance', icon: 'groups', route: '/attendance/team-attendance', roles: ['Super Admin', 'HR Manager', 'Manager'] },
        { label: 'Reports', icon: 'assessment', route: '/attendance/reports', roles: ['Super Admin', 'HR Manager', 'Manager'] },
        { label: 'Shifts', icon: 'access_time', route: '/attendance/shift' },
      ]
    },
    {
      label: 'Leave Management',
      icon: 'event_available',
      children: [
        { label: 'My Leaves', icon: 'event', route: '/leave/dashboard' },
        { label: 'Apply for Leave', icon: 'add_circle', route: '/leave/apply' },
        { label: 'Team Leaves', icon: 'group_work', route: '/leave/team', roles: ['Super Admin', 'HR Manager', 'Manager'] },
        { label: 'Leave Calendar', icon: 'calendar_month', route: '/leave/calendar' },
        { label: 'Leave Types', icon: 'category', route: '/leave/types', roles: ['Super Admin', 'HR Manager'] }
      ]
    },
    {
      label: 'Payroll',
      icon: 'payments',
      roles: ['Super Admin'],
      children: [
        { label: 'Payroll Periods', icon: 'date_range', route: '/payroll/periods' },
        { label: 'Process Payroll', icon: 'calculate', route: '/payroll/process' },
        { label: 'Salary Components', icon: 'tune', route: '/payroll/salary-component' },
        { label: 'Payroll Reports', icon: 'summarize', route: '/payroll/reports' },
        { label: 'Salary Slips', icon: 'receipt', route: '/payroll/slips' }
      ]
    },
    {
      label: 'Assets Management',
      icon: 'inventory_2',
      roles: ['Super Admin', 'HR Manager', 'Manager'],
      children: [
        { label: 'Types of Assets', icon: 'category', route: '/assets/types', roles: ['Super Admin', 'HR Manager'] },
        { label: 'Create Assets', icon: 'add_box', route: '/assets/create', roles: ['Super Admin', 'HR Manager', 'Manager'] }
      ]
    },
    {
      label: 'Performance',
      icon: 'trending_up',
      children: [
        { label: 'My Performance', icon: 'person_outline', route: '/performance/dashboard', roles: ['Employee'] },
        { label: 'Performance', icon: 'assessment', route: '/performance/dashboard', roles: ['Manager'] },
        { label: 'Appraisal Cycles', icon: 'assessment', route: '/performance/dashboard', roles: ['Super Admin', 'HR Manager'] },
        { label: 'Appraisals', icon: 'rate_review', route: '/performance/appraisals' },
        { label: 'Skills Matrix', icon: 'psychology', route: '/performance/skills' },
        { label: 'Goals & KRAs', icon: 'flag', route: '/performance/goals' },
        { label: 'Performance Reports', icon: 'analytics', route: '/performance/reports', roles: ['Super Admin', 'HR Manager', 'Manager'] }
      ]
    },
    {
      label: 'Calendar',
      icon: 'calendar_month',
      route: '/calendar'
    },
    {
      label: 'AI Assistant',
      icon: 'smart_toy',
      route: '/ai-assistant'
    },
    {
      label: 'Subscription',
      icon: 'subscriptions',
      route: '/subscription',
      roles: ['Super Admin']
    },
    {
      label: 'Expense',
      icon: 'receipt_long',
      roles: ['Super Admin', 'HR Manager', 'Manager', 'Employee'],
      children: [
        { label: 'Category', icon: 'category', route: '/expense/categories', exact: true, roles: ['Super Admin', 'HR Manager'] },
        { label: 'Claims', icon: 'receipt_long', route: '/expense/claims', exact: true },
        { label: 'Recurring Expenses', icon: 'repeat', route: '/expense/recurring', exact: true, roles: ['Super Admin', 'HR Manager'] },
        { label: 'Reports', icon: 'summarize', route: '/expense/expense-report', exact: true, roles: ['Super Admin'] }
      ]
    },
    {
      label: 'News',
      icon: 'event_available',
      children: [
        { label: 'News Dashboard', icon: 'event', route: '/news/dashboard' }
      ]
    },
    {
      label: 'Jobs',
      icon: 'work',
      children: [
        { label: 'Openings', icon: 'work_outline', route: '/jobs/openings' },
        { label: 'Applied Jobs', icon: 'how_to_reg', route: '/jobs/applied' },
        { label: 'Stage', icon: 'label', route: '/jobs/stage', roles: ['Super Admin'] }
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
    const children = this.getFilteredChildren(item.children);
    return children.some(child => this.isActiveItem(child));
  }

  hasPermission(item: MenuItem): boolean {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }

    return this.authService.hasAnyRole(item.roles);
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
    // Build a visible menu list and pick the first match by route
    const visibleItems = this.getFilteredMenuItems();
    // Check top-level single items
    for (const item of visibleItems) {
      if (!item.children || item.children.length === 0) {
        if (item.route && this.isActiveRoute(item.route, true)) {
          this.activeItemKey = this.getItemKey(item);
          return;
        }
      }
    }
    // Check children items within groups
    for (const parent of visibleItems) {
      const children = parent.children ? this.getFilteredChildren(parent.children) : [];
      for (const child of children) {
        if (child.route && this.isActiveRoute(child.route, !!child.exact)) {
          this.activeItemKey = this.getItemKey(child);
          return;
        }
      }
    }
    // If no match found, clear active
    this.activeItemKey = null;
  }

  private subscribeToUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  private subscribeToRouterEvents(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        this.activeRoute = (event as NavigationEnd).url;
        this.setActiveItemByRoute(this.activeRoute);
      });
  }

  private collapseAllGroups(): void {
    if (this.panels) {
      this.panels.forEach(p => p.close());
    }
  }
}
