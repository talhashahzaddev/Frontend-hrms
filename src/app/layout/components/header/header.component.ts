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

// PrimeNG
import { AvatarModule } from 'primeng/avatar';

// Services
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { NotificationService } from '@core/services/notification.service';
import { User } from '@core/models/auth.models';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import {NotificationDialogueComponent} from '../../../features/notification-dialogue/notification-dialogue.component'


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
  isDarkMode = false;

  //Search variables
filteredItems: { name: string, id: string }[] = [];

searchItems = [
  { name: 'Quick Action', id: 'quick-actions' },
  { name: 'Upcoming Events', id: 'upcoming-events' },
  { name: 'Performance Stats', id: 'performance-stats' },
  { name: 'Department Chart', id: 'department-chart' },
  { name: 'Recent Activities', id: 'recent-activities' }
];

  notificationCount = 0; // Mock notification count
  slectedProfileFile: File | null = null;
  profilePreviewUrl: string | null = null;
  private backendBaseUrl = 'https://localhost:60485';
// Variables
searchQuery = '';
isSearchOpen = false;

  private destroy$ = new Subject<void>();

  // ⭐ ADD THIS FOR DROPDOWN ⭐
  isNotificationOpen = false;

  constructor(
    private employeeService: EmployeeService,
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

// Search and scroll to the section

onSearch() {
  const query = this.searchQuery.trim().toLowerCase();
  if (!query) return;

  // Map of keywords to IDs
  const sectionMap: { [id: string]: string[] } = {
    'quick-actions': ['quick action','quick','add ','add employee','schedule','leave', 'actions', 'report','approvals'],
    'upcoming-events': ['events','up','upcomming events', 'upcoming event', 'upcoming events'],
    'performance-stats': ['performance', 'performance stats'],
    'department-chart':['chart','department chart'],
    'recent-activities':['recent','acivities','recent activities']
  };

  // Find the ID whose keywords include the query
  const targetId = Object.keys(sectionMap).find(id =>
    sectionMap[id].some(keyword => query.includes(keyword))
  );

  if (targetId) {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      console.warn(`Section with ID "${targetId}" not found in DOM`);
    }
  } else {
    console.warn(`No matching section found for "${query}"`);
  }

  this.searchQuery = '';
  this.isSearchOpen = false;
}


onSearchChange(query: string) {
  if (!query) {
    this.filteredItems = [];
    return;
  }
  const lowerQuery = query.toLowerCase();
  this.filteredItems = this.searchItems.filter(item =>
    item.name.toLowerCase().includes(lowerQuery)
  );
}
goToSection(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  this.searchQuery = '';
  this.filteredItems = [];
  this.isSearchOpen = false;
}



// onSearch() {
//   if (!this.searchQuery) return;

//   const query = this.searchQuery.toLowerCase();

//   // Map search keywords to section IDs
//   const sectionMap: { [key: string]: string } = {
//     'quick action': 'quick-actions',
//     'actions': 'quick-actions',
//     'events': 'upcoming-events',
//     'performance': 'performance-stats',
//     'reports': 'quick-actions'
//   };

//   const targetId = Object.keys(sectionMap).find(key => query.includes(key));
//   if (targetId) {
//     const el = document.getElementById(sectionMap[targetId]);
//     if (el) {
//       el.scrollIntoView({ behavior: 'smooth', block: 'start' });
//     }
//   }

//   // Reset
//   this.searchQuery = '';
//   this.isSearchOpen = false;
// }


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
        if (this.currentUser?.userId) {
          this.loademployeeDetails(this.currentUser.userId);
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
