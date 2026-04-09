import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, interval, takeUntil } from 'rxjs';
import { GeoFenceService, TeamLiveStreamDto, SystemHealthDto } from '../../services/geofence.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-team-monitoring',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './team-monitoring.component.html',
  styleUrls: ['./team-monitoring.component.scss']
})
export class TeamMonitoringComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  employees: TeamLiveStreamDto[] = [];
  filteredEmployees: TeamLiveStreamDto[] = [];
  systemHealth: SystemHealthDto | null = null;
  isLoading = false;
  searchQuery = '';
  filterStatus = 'all';
  lastUpdated: Date | null = null;
  isRefreshing = false;

  statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'inside', label: 'In Zone' },
    { value: 'outside', label: 'Outside' },
    { value: 'unknown', label: 'Unknown' }
  ];

  constructor(
    private geoFenceService: GeoFenceService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadAll();
    // Auto-refresh every 60 seconds
    interval(60000).pipe(takeUntil(this.destroy$)).subscribe(() => this.refresh());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAll(): void {
    this.isLoading = true;
    this.loadSystemHealth();
    this.loadLiveStream();
  }

  loadSystemHealth(): void {
    this.geoFenceService.getSystemHealth()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: h => { this.systemHealth = h; },
        error: () => {}
      });
  }

  loadLiveStream(): void {
    this.geoFenceService.getTeamLiveStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.employees = data;
          this.applyFilters();
          this.lastUpdated = new Date();
          this.isLoading = false;
          this.isRefreshing = false;
        },
        error: () => {
          this.notification.showError('Failed to load team data');
          this.isLoading = false;
          this.isRefreshing = false;
        }
      });
  }

  refresh(): void {
    this.isRefreshing = true;
    this.loadSystemHealth();
    this.loadLiveStream();
  }

  applyFilters(): void {
    let list = [...this.employees];
    if (this.filterStatus !== 'all') {
      list = list.filter(e => e.locationStatus === this.filterStatus);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(e =>
        e.employeeName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        (e.shiftName || '').toLowerCase().includes(q)
      );
    }
    this.filteredEmployees = list;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'inside': return '#10b981';
      case 'outside': return '#f59e0b';
      case 'violation': return '#ef4444';
      default: return '#64748b';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'inside': return 'check_circle';
      case 'outside': return 'warning';
      case 'violation': return 'cancel';
      default: return 'help_outline';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'inside': return 'In Zone';
      case 'outside': return 'Outside';
      case 'violation': return 'Violation';
      default: return 'Unknown';
    }
  }

  getComplianceColor(pct: number): string {
    if (pct >= 80) return '#10b981';
    if (pct >= 60) return '#f59e0b';
    return '#ef4444';
  }

  get healthPct(): number {
    return this.systemHealth?.attendanceHealthPct || 0;
  }

  get inZoneCount(): number {
    return this.employees.filter(e => e.locationStatus === 'inside').length;
  }
}