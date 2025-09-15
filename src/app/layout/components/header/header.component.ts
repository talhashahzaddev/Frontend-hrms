import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

// PrimeNG
import { AvatarModule } from 'primeng/avatar';

// Services
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { NotificationService } from '@core/services/notification.service';
import { User } from '@core/models/auth.models';

@Component({
    selector: 'app-header',
    imports: [
        CommonModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatBadgeModule,
        MatTooltipModule,
        MatDividerModule,
        AvatarModule
    ],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() isHandset = false;
  @Output() menuToggle = new EventEmitter<void>();

  currentUser: User | null = null;
  isDarkMode = false;
  notificationCount = 3; // Mock notification count
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscribeToUser();
    this.subscribeToTheme();
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

  onNotificationsClick(): void {
    // TODO: Open notifications panel
    console.log('Notifications clicked');
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
        // Still redirect to login even if API call fails
        this.router.navigate(['/login']);
      }
    });
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
