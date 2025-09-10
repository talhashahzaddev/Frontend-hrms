import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';

// Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';

// PrimeNG
import { ToastModule } from 'primeng/toast';

// App Components
import { LayoutComponent } from './layout/layout.component';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';

// Services
import { AuthService } from './core/services/auth.service';
import { LoadingService } from './core/services/loading.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
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
    LoadingSpinnerComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'HRMS - Human Resource Management System';
  isLoading$ = this.loadingService.loading$;
  isAuthenticated$ = this.authService.isAuthenticated$;
  
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private authService: AuthService,
    private loadingService: LoadingService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.initializeApp();
    this.handleRouteChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeApp(): void {
    // Initialize theme
    this.themeService.initializeTheme();
    
    // Check authentication status
    this.authService.checkAuthStatus();

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
        // Update page title based on route
        this.updatePageTitle((event as NavigationEnd).url);
        
        // Scroll to top on route change
        window.scrollTo(0, 0);
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
