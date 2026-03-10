import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { PlatformAdminAuthService } from '../services/platform-admin-auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-platform-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './platform-layout.component.html',
  styleUrls: ['./platform-layout.component.scss']
})
export class PlatformLayoutComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  currentRoute = '';
  adminName = '';

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/platform-admin/dashboard' },
    { label: 'Organizations', icon: 'business', route: '/platform-admin/organizations' },
    { label: 'Demo Inquiries', icon: 'contact_mail', route: '/platform-admin/inquiries' }
  ];

  private destroy$ = new Subject<void>();

  private authService = inject(PlatformAdminAuthService);
  private router = inject(Router);

  constructor() {}

  ngOnInit(): void {
    this.adminName = this.authService.getAdminName();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
      this.currentRoute = event.urlAfterRedirects || event.url;
    });

    this.currentRoute = this.router.url;
  }

  isActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/platform-admin/login']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
