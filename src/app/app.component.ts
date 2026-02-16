import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd, NavigationStart, NavigationCancel, NavigationError } from '@angular/router';
import { Subject, filter, takeUntil, take, map, combineLatest } from 'rxjs';
import { ServerNotificationService } from './core/services/server-notification';
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


@Component({
  selector: 'app-root',
  imports: [
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
    private progressBarService: ProgressBarService
  ) { }

  ngOnInit(): void {
    this.initializeApp();
    this.handleRouteChanges();
    this.setupRouterProgress();
    this.setFavicon();

    // 🔥 Subscribe to authentication/user changes
    // this.authService.isAuthenticated$
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(isAuth => {
    //     if (isAuth) {
    //       const user = this.authService.getCurrentUserValue();
    //       if (user?.userId) {
    //         this.serverNotificationService.loadNotifications(user.userId);
    //       }
    //     } else {
    //       // Optional: clear notifications on logout
    //       // this.serverNotificationService.clearNotifications();
    //     }
    //   });

    // // Optional: refresh notifications every 60 seconds
    // interval(60000)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(() => {
    //     const user = this.authService.getCurrentUserValue();
    //     if (user?.userId) this.serverNotificationService.loadNotifications(user.userId);
    //   });

  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

        // Update page title based on route
        this.updatePageTitle(url);

        // Ensure favicon is set after navigation
        this.setFavicon();

        // Scroll to top on route change
        window.scrollTo(0, 0);
      });

    // Check initial route
    this.isAiAssistantPage = this.router.url.includes('/ai-assistant');
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
      const isAdmin = user.roleName === 'Super Admin' || user.roleName === 'HR Manager';

      // ✅ Employee manually trying to access /dashboard → redirect to /performance/dashboard
      if (!isAdmin && currentPath === '/dashboard' ||currentPath==='/') {
        this.router.navigate(['/performance/dashboard']);
      }
    });
}



  private updatePageTitle(url: string): void {
    const routeTitles: { [key: string]: string } = {
      '/dashboard': 'Dashboard',
      '/employees': 'Employee Management',
      '/attendance': 'Attendance Tracking',
      '/leave': 'Leave Management',
      '/payroll': 'Payroll Management',
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
}
