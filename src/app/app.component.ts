import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Subject, filter, takeUntil,take } from 'rxjs';
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

// Services
import { AuthService } from './core/services/auth.service';
import { LoadingService } from './core/services/loading.service';
import { ThemeService } from './core/services/theme.service';


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
        ChatWidgetComponent
    ],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'HRMS - Human Resource Management System';
  isLoading$ = this.loadingService.loading$;
  isAuthenticated$ = this.authService.isAuthenticated$;
  isAiAssistantPage = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private authService: AuthService,
    private loadingService: LoadingService,
    private themeService: ThemeService,
    private serverNotificationService: ServerNotificationService // add this
  ) {}

  ngOnInit(): void {
    this.initializeApp();
    this.handleRouteChanges();

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
    
    // Initialize theme
    this.themeService.initializeTheme();
    
    // Check authentication status
    this.authService.checkAuthStatus();
  
    
 // Redirect user based on role
  this.redirectUserOnInit();

    // Set up error handling
    this.setupGlobalErrorHandling();
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
        
        // Scroll to top on route change
        window.scrollTo(0, 0);
      });
    
    // Check initial route
    this.isAiAssistantPage = this.router.url.includes('/ai-assistant');
  }


private redirectUserOnInit(): void {
  const user = this.authService.getCurrentUserValue();

  if (!user) {
    this.router.navigate(['/login']);
    return;
  }

  this.router.events
    .pipe(
      filter(event => event instanceof NavigationEnd),
      take(1)
    )
    .subscribe((event: NavigationEnd) => {

      const currentUrl = event.urlAfterRedirects;

      const isAdmin = user.roleName === 'Super Admin' || user.roleName === 'HR Manager';
      
      // Employee is trying to access admin dashboard
      if (!isAdmin && currentUrl.startsWith('/dashboard')) {
        this.router.navigate(['/performance/dashboard']);
        return;
      }

      // Admin trying to access employee dashboard
      if (isAdmin && currentUrl.startsWith('/performance')) {
        this.router.navigate(['/dashboard']);
        return;
      }

      // If user is on root or login page → role-based redirect
      if (currentUrl === '/' || currentUrl === '/login') {
        if (isAdmin) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/performance/dashboard']);
        }
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
