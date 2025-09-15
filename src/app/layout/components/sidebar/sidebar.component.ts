import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';

// Material Modules
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
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
}

@Component({
    selector: 'app-sidebar',
    imports: [
        CommonModule,
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
  
  private destroy$ = new Subject<void>();

  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard'
    },
    {
      label: 'Employee Management',
      icon: 'people',
      children: [
        { label: 'All Employees', icon: 'group', route: '/employees' },
        { label: 'Add Employee', icon: 'person_add', route: '/employees/create', roles: ['Super Admin', 'HR Manager'] },
        { label: 'Departments', icon: 'apartment', route: '/employees/departments', roles: ['Super Admin', 'HR Manager'] },
        { label: 'Positions', icon: 'work', route: '/employees/positions', roles: ['Super Admin', 'HR Manager'] }
      ]
    },
    {
      label: 'Attendance',
      icon: 'schedule',
      children: [
        { label: 'My Attendance', icon: 'access_time', route: '/attendance/my' },
        { label: 'Time Tracker', icon: 'timer', route: '/attendance/tracker' },
        { label: 'Team Attendance', icon: 'groups', route: '/attendance/team', roles: ['Super Admin', 'HR Manager', 'Manager'] },
        { label: 'Reports', icon: 'assessment', route: '/attendance/reports', roles: ['Super Admin', 'HR Manager', 'Manager'] }
      ]
    },
    {
      label: 'Leave Management',
      icon: 'event_available',
      children: [
        { label: 'My Leaves', icon: 'event', route: '/leave/my' },
        { label: 'Apply for Leave', icon: 'add_circle', route: '/leave/apply' },
        { label: 'Team Leaves', icon: 'group_work', route: '/leave/team', roles: ['Super Admin', 'HR Manager', 'Manager'] },
        { label: 'Leave Calendar', icon: 'calendar_month', route: '/leave/calendar' },
        { label: 'Leave Types', icon: 'category', route: '/leave/types', roles: ['Super Admin', 'HR Manager'] }
      ]
    },
    {
      label: 'Payroll',
      icon: 'payments',
      roles: ['Super Admin', 'HR Manager'],
      children: [
        { label: 'Payroll Periods', icon: 'date_range', route: '/payroll/periods' },
        { label: 'Process Payroll', icon: 'calculate', route: '/payroll/process' },
        { label: 'Payroll Reports', icon: 'summarize', route: '/payroll/reports' },
        { label: 'Salary Slips', icon: 'receipt', route: '/payroll/slips' }
      ]
    },
    {
      label: 'Performance',
      icon: 'trending_up',
      children: [
        { label: 'My Performance', icon: 'person_outline', route: '/performance/my' },
        { label: 'Appraisals', icon: 'rate_review', route: '/performance/appraisals' },
        { label: 'Skills Matrix', icon: 'psychology', route: '/performance/skills' },
        { label: 'Goals & KRAs', icon: 'flag', route: '/performance/goals' },
        { label: 'Performance Reports', icon: 'analytics', route: '/performance/reports', roles: ['Super Admin', 'HR Manager', 'Manager'] }
      ]
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscribeToUser();
    this.subscribeToRouterEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onMenuItemClick(item: MenuItem): void {
    if (item.route) {
      this.router.navigate([item.route]);
      this.menuItemClick.emit();
    }
  }

  isActiveRoute(route: string): boolean {
    return this.activeRoute === route || this.activeRoute.startsWith(route + '/');
  }

  isParentActive(item: MenuItem): boolean {
    if (!item.children) return false;
    
    return item.children.some(child => 
      child.route && this.isActiveRoute(child.route)
    );
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
      });
  }
}
