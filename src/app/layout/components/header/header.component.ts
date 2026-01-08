import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ViewChild, ElementRef } from '@angular/core';
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

interface SearchItem {
  name: string;
  route: string;
  keywords: string[];
  roles?: string[];
}
import { PaymentService } from '@core/services/payment.service';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { NotificationDialogueComponent } from '../../../features/notification-dialogue/notification-dialogue.component'
import { environment } from '@/environments/environment';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    FormsModule,
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
  currentUser: User | null = null;
  currentPlanName: string | null = null;
  isSubscriptionExpired: boolean = false;
  currentBillingCycle: string | null = null;
  isDarkMode = false;

  //Search variables
  filteredItems: SearchItem[] = [];

  // All searchable items with routes, keywords, and role permissions
  private allSearchItems: SearchItem[] = [
    // Dashboard
    {
      name: 'Dashboard',
      route: '/dashboard',
      keywords: ['dashboard', 'home', 'main', 'overview'],
      roles: ['Super Admin', 'HR Manager']
    },
    {
      name: 'Dashboard',
      route: '/performance/dashboard',
      keywords: ['dashboard', 'home', 'main', 'overview', 'my performance'],
      roles: ['Manager', 'Employee']
    },

    // Attendance - Employee accessible
    {
      name: 'My Attendance',
      route: '/attendance/dashboard',
      keywords: ['attendance', 'my attendance', 'attendance dashboard', 'check in', 'check out'],
      roles: ['Super Admin', 'HR Manager', 'Manager', 'Employee']
    },
    {
      name: 'Time Tracker',
      route: '/attendance/time-tracker',
      keywords: ['time tracker', 'tracker', 'time tracking', 'clock', 'timer'],
      roles: ['Super Admin', 'HR Manager', 'Manager', 'Employee']
    },
    {
      name: 'Shifts',
      route: '/attendance/shift',
      keywords: ['shift', 'shifts', 'schedule', 'work schedule', 'shift management'],
      roles: ['Super Admin', 'HR Manager', 'Manager', 'Employee']
    },

    // Attendance - Manager/Admin only
    {
      name: 'Team Attendance',
      route: '/attendance/team-attendance',
      keywords: ['team attendance', 'team', 'employee attendance'],
      roles: ['Super Admin', 'HR Manager', 'Manager']
    },
    {
      name: 'Attendance Reports',
      route: '/attendance/reports',
      keywords: ['attendance reports', 'reports', 'attendance report'],
      roles: ['Super Admin', 'HR Manager', 'Manager']
    },
    {
      name: 'Attendance Calendar',
      route: '/attendance/calendar',
      keywords: ['attendance calendar', 'calendar'],
      roles: ['Super Admin', 'HR Manager', 'Manager', 'Employee']
    },

    // Leave - Employee accessible
    {
      name: 'My Leaves',
      route: '/leave/dashboard',
      keywords: ['leave', 'my leaves', 'leave dashboard', 'my leave', 'leaves'],
      roles: ['Super Admin', 'HR Manager', 'Manager', 'Employee']
    },
    {
      name: 'Apply for Leave',
      route: '/leave/apply',
      keywords: ['apply leave', 'apply for leave', 'request leave', 'new leave', 'leave request'],
      roles: ['Super Admin', 'HR Manager', 'Manager', 'Employee']
    },
    {
      name: 'Leave Calendar',
      route: '/leave/calendar',
      keywords: ['leave calendar', 'calendar', 'leave schedule'],
      roles: ['Super Admin', 'HR Manager', 'Manager', 'Employee']
    },

    // Leave - Manager/Admin only
    {
      name: 'Team Leaves',
      route: '/leave/team',
      keywords: ['team leaves', 'team leave', 'employee leaves'],
      roles: ['Super Admin', 'HR Manager', 'Manager']
    },
    {
      name: 'Leave Types',
      route: '/leave/types',
      keywords: ['leave types', 'leave type', 'types of leave'],
      roles: ['Super Admin', 'HR Manager']
    },

    // Performance - Employee accessible
    {
      name: 'My Performance',
      route: '/performance/dashboard',
      keywords: ['performance', 'my performance', 'performance dashboard', 'my performance dashboard'],
      roles: ['Employee']
    },
    {
      name: 'Appraisals',
      route: '/performance/appraisals',
      keywords: ['appraisal', 'appraisals', 'review', 'performance review', 'evaluation'],
      roles: ['Super Admin', 'HR Manager', 'Manager', 'Employee']
    },
    {
      name: 'Skills Matrix',
      route: '/performance/skills',
      keywords: ['skills', 'skill matrix', 'skills matrix', 'competencies', 'competency'],
      roles: ['Super Admin', 'HR Manager', 'Manager', 'Employee']
    },
    {
      name: 'Goals & KRAs',
      route: '/performance/goals',
      keywords: ['goals', 'kra', 'kras', 'key result areas', 'objectives', 'targets', 'goals and kras'],
      roles: ['Super Admin', 'HR Manager', 'Manager', 'Employee']
    },

    // Performance - Manager/Admin only
    {
      name: 'Performance Reports',
      route: '/performance/reports',
      keywords: ['performance reports', 'reports', 'performance report'],
      roles: ['Super Admin', 'HR Manager', 'Manager']
    },
    {
      name: 'Appraisal Cycles',
      route: '/performance/cycles',
      keywords: ['appraisal cycles', 'cycles', 'appraisal cycle'],
      roles: ['Super Admin', 'HR Manager']
    },

    // Employee Management - Admin/HR only
    {
      name: 'All Employees',
      route: '/employees',
      keywords: ['employees', 'employee list', 'all employees', 'staff', 'team members'],
      roles: ['Super Admin', 'HR Manager']
    },
    {
      name: 'Add Employee',
      route: '/employees/add',
      keywords: ['add employee', 'new employee', 'create employee', 'hire'],
      roles: ['Super Admin', 'HR Manager']
    },
    {
      name: 'Departments',
      route: '/employees/departments',
      keywords: ['departments', 'department', 'department list'],
      roles: ['Super Admin', 'HR Manager']
    },
    {
      name: 'Positions',
      route: '/employees/positions',
      keywords: ['positions', 'position', 'job positions', 'roles'],
      roles: ['Super Admin', 'HR Manager']
    },

    // Payroll - Super Admin only
    {
      name: 'Payroll Periods',
      route: '/payroll/periods',
      keywords: ['payroll periods', 'payroll period', 'periods', 'pay period', 'salary period'],
      roles: ['Super Admin']
    },
    {
      name: 'Process Payroll',
      route: '/payroll/process',
      keywords: ['process payroll', 'payroll process', 'run payroll', 'calculate payroll', 'generate payroll'],
      roles: ['Super Admin']
    },
    {
      name: 'Salary Components',
      route: '/payroll/salary-component',
      keywords: ['salary components', 'salary component', 'components', 'pay components', 'salary structure'],
      roles: ['Super Admin']
    },
    {
      name: 'Payroll Reports',
      route: '/payroll/reports',
      keywords: ['payroll reports', 'payroll report', 'salary reports', 'payroll analytics'],
      roles: ['Super Admin']
    },
    {
      name: 'Salary Slips',
      route: '/payroll/slips',
      keywords: ['salary slips', 'salary slip', 'payslips', 'payslip', 'pay slip', 'pay slips'],
      roles: ['Super Admin']
    },

    // Profile & Settings
    {
      name: 'My Profile',
      route: '/profile',
      keywords: ['profile', 'my profile', 'user profile', 'account'],
      roles: ['Super Admin', 'HR Manager', 'Manager', 'Employee']
    },
    {
      name: 'Settings',
      route: '/settings',
      keywords: ['settings', 'preferences', 'configuration', 'config'],
      roles: ['Super Admin', 'HR Manager', 'Manager', 'Employee']
    },

    // AI Assistant
    {
      name: 'AI Assistant',
      route: '/ai-assistant',
      keywords: ['ai', 'assistant', 'ai assistant', 'chat', 'help', 'support'],
      roles: ['Super Admin', 'HR Manager', 'Manager', 'Employee']
    }
  ];

  getSearchItems(): SearchItem[] {
    if (!this.currentUser) return [];

    // Filter items based on user role
    return this.allSearchItems.filter(item => {
      if (!item.roles || item.roles.length === 0) return true;
      return this.authService.hasAnyRole(item.roles);
    });
  }

  notificationCount = 0; // Mock notification count
  slectedProfileFile: File | null = null;
  profilePreviewUrl: string | null = null;
  private backendBaseUrl = `${environment.apiUrl}`;
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
    private router: Router
  ) { }

  ngOnInit(): void {
    this.subscribeToUser();
    this.subscribeToTheme();
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

  // ⭐ UPDATED METHOD ⭐
  onNotificationsClick(): void {
    this.isNotificationOpen = !this.isNotificationOpen;
  }

  // ⭐ OPTIONAL: Close function if needed later ⭐
  closeNotifications(): void {
    this.isNotificationOpen = false;
  }

  onProfileClick(): void {
    this.router.navigate(['/profile']);
  }

  onSettingsClick(): void {
    this.router.navigate(['/settings']);
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.notificationService.logoutSuccess();
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.router.navigate(['/login']);
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

        if (this.currentUser?.roleName === 'Super Admin') {
          this.loadSubscriptionDetails();
        } else {
          this.currentPlanName = null;
        }
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

          if (employee.profilePictureUrl) {
            this.profilePreviewUrl = employee.profilePictureUrl.startsWith('http')
              ? employee.profilePictureUrl
              : `${this.backendBaseUrl}${employee.profilePictureUrl}`;
          } else {
            this.profilePreviewUrl = null;
          }
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
