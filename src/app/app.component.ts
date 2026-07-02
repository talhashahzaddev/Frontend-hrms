import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd, NavigationStart, NavigationCancel, NavigationError } from '@angular/router';
import { Subject, filter, takeUntil, take, map, combineLatest } from 'rxjs';
import { ServerNotificationService } from './core/services/server-notification';
import { SharedCommonModule } from '@shared/shared-common.module';
// Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { interval } from 'rxjs';

// PrimeNG
import { ToastModule } from 'primeng/toast';

// App Components
import { LayoutComponent } from './layout/layout.component';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';
import { ChatWidgetComponent } from './shared/components/chat-widget/chat-widget.component';
import { ProgressBarComponent } from './shared/components/progress-bar/progress-bar.component';

// Services
import { AuthService } from './core/services/auth.service';
import { LoadingService } from './core/services/loading.service';
import { ThemeService } from './core/services/theme.service';
import { ProgressBarService } from './core/services/progress-bar.service';
import { RoleHubService } from './features/settings/services/role-hub.service';
import { NotificationService } from './core/services/notification.service';



@Component({
  selector: 'app-root',
  imports: [
    SharedCommonModule,
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatMenuModule,
    MatBadgeModule,
    ToastModule,
    LayoutComponent,
    LoadingSpinnerComponent,
    ChatWidgetComponent,
    ProgressBarComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'HRMS - Human Resource Management System';
  isLoading$ = this.loadingService.loading$;
  isAuthenticated$ = this.authService.isAuthenticated$;
  isLoggingOut$ = this.authService.isLoggingOut$;
  isAiAssistantPage = false;
  isAuthPage = false;

  // Computed observable for loading message
  // Show "Signing out..." only when explicitly logging out
  // Otherwise show "Logging in..." when loading and not authenticated
  loadingTitle$ = combineLatest([this.isLoggingOut$, this.isLoading$, this.isAuthenticated$]).pipe(
    map(([isLoggingOut, isLoading, isAuthenticated]) => {
      if (isLoggingOut) {
        return 'Signing out...';
      } else if (isLoading && !isAuthenticated) {
        return 'Logging in...';
      } else {
        return 'Loading...';
      }
    })
  );

  loadingMessage$ = combineLatest([this.isLoggingOut$, this.isLoading$, this.isAuthenticated$]).pipe(
    map(([isLoggingOut, isLoading, isAuthenticated]) => {
      if (isLoggingOut) {
        return 'Please wait while we sign you out';
      } else if (isLoading && !isAuthenticated) {
        return 'Please wait while we sign you in';
      } else {
        return 'Please wait while we process your request';
      }
    })
  );

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private authService: AuthService,
    private loadingService: LoadingService,
    private themeService: ThemeService,
    private serverNotificationService: ServerNotificationService,
    private progressBarService: ProgressBarService,
    private roleHubService: RoleHubService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.initializeApp();
    this.handleRouteChanges();
    this.setupRouterProgress();
    this.setFavicon();
    this.setupSignalRNotifications();
  }


  ngOnDestroy(): void {
    // Unsubscribe from all observables
    this.destroy$.next();
    this.destroy$.complete();

    // Disconnect from SignalR gracefully
    this.roleHubService.disconnect().catch(err => {
      console.error('Error disconnecting from SignalR:', err);
    });
  }

  private initializeApp(): void {
    // Domain validation is now handled by APP_INITIALIZER before app loads
    // No need to validate here as it's already done

    // Domain validation is now handled by APP_INITIALIZER before app loads
    // Pending auth is handled automatically by AuthService constructor checking URL params

    // Initialize theme
    this.themeService.initializeTheme();

    // Check authentication status
    this.authService.checkAuthStatus();


    // Redirect user based on role
    this.redirectUserOnInit();

    // Set up error handling
    this.setupGlobalErrorHandling();
  }

  /**
   * Setup progress bar for router navigation
   */
  private setupRouterProgress(): void {
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event instanceof NavigationStart) {
          // Start progress bar on navigation start
          this.progressBarService.start();
        } else if (
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        ) {
          // Complete progress bar when navigation ends
          this.progressBarService.complete();
        }
      });
  }

  private handleRouteChanges(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        const url = (event as NavigationEnd).url;

        // Check if we're on the AI assistant page
        this.isAiAssistantPage = url.includes('/ai-assistant');

        // Check if we're on an auth-style page (login, register, etc.)
        const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
        this.isAuthPage = authRoutes.some(route => url.startsWith(route));

        // Update page title based on route
        this.updatePageTitle(url);

        // Ensure favicon is set after navigation
        this.setFavicon();

        // Scroll to top on route change
        window.scrollTo(0, 0);
      });

    // Check initial route
    this.isAiAssistantPage = this.router.url.includes('/ai-assistant');
    const initialAuthRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
    this.isAuthPage = initialAuthRoutes.some(route => this.router.url.startsWith(route));
  }


  private redirectUserOnInit(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$) // keeps subscription alive until component destroyed
      )
      .subscribe((event: NavigationEnd) => {
        const user = this.authService.getCurrentUserValue();
        if (!user) return; // user not logged in, let guards handle it

        const currentPath = (event as NavigationEnd).urlAfterRedirects.split('?')[0];

        // // ✅ Employee manually trying to access /dashboard → redirect to /performance/dashboard
        // if (!isAdmin && currentPath === '/dashboard' ||currentPath==='/') {
        //   this.router.navigate(['/employee/dashboard']);
        // }
      });
  }



  private updatePageTitle(url: string): void {
    const routeTitles: { [key: string]: string } = {
      '/dashboard': 'Dashboard',
      '/employees': 'Employee Management',
      '/attendance': 'Attendance Tracking',
      '/leave': 'Leave Management',
      '/performance': 'Performance Management',
      '/settings': 'Settings',
      '/profile': 'My Profile'
    };

    const baseTitle = 'HRMS';
    const routeTitle = Object.keys(routeTitles).find(route => url.startsWith(route));

    if (routeTitle) {
      document.title = `${routeTitles[routeTitle]} - ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }

  private setFavicon(): void {
    // Remove ALL existing favicon links (including favicon.ico references)
    const existingLinks = document.querySelectorAll('link[rel*="icon"], link[rel*="shortcut"]');
    existingLinks.forEach(link => link.remove());

    // Get base href to construct correct path
    const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
    const faviconPath = `${baseHref}hub.png?v=${Date.now()}`; // Cache busting

    // Create and add new favicon links with priority order
    const faviconSizes = [
      { sizes: '512x512', rel: 'icon' },
      { sizes: '192x192', rel: 'icon' },
      { sizes: '32x32', rel: 'icon' },
      { sizes: '16x16', rel: 'icon' },
      { rel: 'icon' }, // Default icon without sizes
      { rel: 'shortcut icon' },
      { sizes: '180x180', rel: 'apple-touch-icon' }
    ];

    faviconSizes.forEach(fav => {
      const link = document.createElement('link');
      link.rel = fav.rel || 'icon';
      link.type = 'image/png';
      link.href = faviconPath;
      if (fav.sizes) {
        link.setAttribute('sizes', fav.sizes);
      }
      document.head.appendChild(link);
    });

    // Force browser to reload favicon by updating the link
    const faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (faviconLink) {
      faviconLink.href = faviconPath;
    }
  }

  private setupGlobalErrorHandling(): void {
    // Global error handling for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    });

    // Global error handling for JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });
  }

  /**
   * Setup SignalR real-time notifications for role updates
   */
  private async setupSignalRNotifications(): Promise<void> {
    try {
      console.log('🔌 [AppComponent] Setting up SignalR notifications...');

      // Check if user is authenticated before setting up SignalR
      if (!this.authService.isAuthenticated) {
        console.log('⚠️ [AppComponent] User not authenticated, skipping SignalR setup');
        return;
      }

      console.log('✅ [AppComponent] User is authenticated');

      // Connect to SignalR hub
      try {
        await this.roleHubService.connect();
        console.log('✅ [AppComponent] Connected to SignalR RoleHub');
      } catch (connectError) {
        console.error('❌ [AppComponent] Failed to connect to SignalR:', connectError);
        this.notificationService.showError('Failed to connect to real-time notifications');
        return;
      }

      // Get organizationId and roleId from JWT token
      const token = this.authService.getToken();
      if (!token) {
        console.error('❌ [AppComponent] No auth token available');
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const organizationId = payload['organizationId'] || payload['organizationId'] || null;
        const roleId = payload['roleId'] || payload['roleId'] || null;

        console.log('📦 [AppComponent] Extracted from JWT Token:', { organizationId, roleId });

        if (!organizationId || !roleId) {
          console.error('❌ [AppComponent] organizationId or roleId not found in JWT token');
          console.error('   organizationId:', organizationId);
          console.error('   roleId:', roleId);
          return;
        }

        // Join the role group
        try {
          await this.roleHubService.joinRole(organizationId, roleId);
          // After joining role group, refresh permissions and notify
          this.refreshUserPermissions();
          const groupName = `role_${organizationId.trim()}_${roleId.trim()}`;
          console.log(`✅ [AppComponent] Joined role group: ${groupName}`);
        } catch (joinError) {
          console.error('❌ [AppComponent] Failed to join role group:', joinError);
          this.notificationService.showError('Failed to join role group for notifications');
          return;
        }

        // Join the employee-specific group so this client receives EmployeeUpdated events
        try {
          const currentUser = this.authService.getCurrentUserValue();
          const userId = currentUser?.userId;
          if (userId) {
            await this.roleHubService.joinEmployee(organizationId, userId);
            // After joining employee group, refresh permissions and notify
            this.refreshUserPermissions();
          }
        } catch (joinEmpErr) {
          console.error('❌ [AppComponent] Failed to join employee group:', joinEmpErr);
        }
      } catch (jwtError) {
        console.error('❌ [AppComponent] Error decoding JWT token:', jwtError);
        this.notificationService.showError('Error reading user credentials for notifications');
        return;
      }

      // Subscribe to role update notifications
      this.roleHubService.roleUpdated$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (payload) => {
            console.log('📢 [AppComponent] Role Updated Event received:', payload);

            // Refresh user permissions immediately
            this.refreshUserPermissions();
          },
          error: (err) => {
            console.error('❌ [AppComponent] Error listening to role updates:', err);
            this.notificationService.showError('Failed to listen to role updates');
          }
        });

      // Listen for employee position updates
      this.roleHubService.employeeUpdated$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (payload) => {
            console.log('📢 [AppComponent] Employee Updated Event received:', payload);
            // Show a notification explaining the position change
            // this.notificationService.showInfo(payload.Message || 'Your position has been updated.');

            // Refresh permissions and let `refreshUserPermissions()` handle redirect to first allowed
            this.refreshUserPermissions();
          },
          error: (err) => {
            console.error('❌ [AppComponent] Error listening to employee updates:', err);
          }
        });



      console.log('✅ [AppComponent] Subscribed to role updates');
    } catch (error) {
      console.error('❌ [AppComponent] Unexpected error setting up SignalR notifications:', error);
      this.notificationService.showError('Failed to setup real-time notifications');
    }
  }

  /**
   * Refreshes user permissions after role update via SignalR
   * Fetches latest permissions from backend and redirects to first allowed page if needed
   */
  private refreshUserPermissions(): void {
    this.authService.refreshPermissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (permissions) => {
          if (permissions) {
            console.log('✅ [AppComponent] Permissions refreshed successfully');

            // Get the current route
            const currentUrl = this.router.url.split('?')[0];
            const currentRoute = currentUrl || '/dashboard';

            // Get the first allowed route based on new permissions
            const firstAllowedRoute = this.authService.getFirstAllowedRoute();

            console.log(`📍 [AppComponent] Current route: ${currentRoute}`);
            console.log(`📍 [AppComponent] First allowed route: ${firstAllowedRoute}`);

            // Check if user still has access to current page
            // If not, redirect to first allowed route with first allowed submenu
            if (currentRoute !== firstAllowedRoute) {
              // Get the module name from firstAllowedRoute (e.g., "attendance" from "/attendance")
              const moduleName = firstAllowedRoute.split('/')[1] || 'dashboard';

              // Get first allowed submenu route in that module
              const routeWithSubmenu = this.authService.getFirstAllowedRouteInModule(moduleName);

              console.log(`🔄 [AppComponent] Redirecting from ${currentRoute} to ${routeWithSubmenu}`);
              this.notificationService.showInfo(
                'Your permissions have been updated. Redirecting...'
              );

              // Small delay to ensure notification is shown
              setTimeout(() => {
                if (routeWithSubmenu && routeWithSubmenu !== '/undefined') {
                  this.router.navigateByUrl(routeWithSubmenu, { replaceUrl: true });
                } else {
                  this.router.navigateByUrl(firstAllowedRoute || '/dashboard', { replaceUrl: true });
                }
              }, 300);
            } else {
              // User still has access to current page
              this.notificationService.showSuccess(
                'Your permissions have been updated.'
              );
            }
          } else {
            console.warn('⚠️ [AppComponent] Permissions refresh returned null');
          }
        },
        error: (err) => {
          console.error('❌ [AppComponent] Failed to refresh permissions:', err);
          this.notificationService.showError('Failed to refresh your permissions. Please refresh the page.');
        }
      });
  }
}
