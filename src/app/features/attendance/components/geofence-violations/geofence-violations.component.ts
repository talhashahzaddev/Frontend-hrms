import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { GeoFenceService, ViolationReportDto } from '../../services/geofence.service';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-geo-fence-violations',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './geofence-violations.component.html',
  styleUrls: ['./geofence-violations.component.scss']
})
export class GeoFenceViolationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  violations: ViolationReportDto[] = [];
  filteredViolations: ViolationReportDto[] = [];
  expandedRowId: string | null = null;
  isLoading = false;
  searchQuery = '';

  startDate: string = this.formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  endDate: string = this.formatDate(new Date());

  constructor(
    private geoFenceService: GeoFenceService
  ) {}

  ngOnInit(): void {
    this.loadViolations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  loadViolations(): void {
    this.isLoading = true;
    this.geoFenceService.getViolations(this.startDate, this.endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.violations = data;
          this.applySearch();
          this.isLoading = false;
        },
        error: () => {
          this.violations = [];
          this.filteredViolations = [];
          this.isLoading = false;
        }
      });
  }

  applySearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredViolations = q
      ? this.violations.filter(v =>
          v.employeeName.toLowerCase().includes(q) ||
          v.employeeCode.toLowerCase().includes(q) ||
          (v.geoFenceName || '').toLowerCase().includes(q)
        )
      : [...this.violations];
  }

  toggleRow(id: string): void {
    this.expandedRowId = this.expandedRowId === id ? null : id;
  }

  getActionClass(action: string): string {
    switch (action) {
      case 'blocked': return 'action-blocked';
      case 'allowed_with_warning': return 'action-warning';
      case 'escalated': return 'action-escalated';
      default: return '';
    }
  }

  getActionLabel(action: string): string {
    switch (action) {
      case 'blocked': return 'Blocked';
      case 'allowed_with_warning': return 'Warning Issued';
      case 'escalated': return 'Escalated';
      default: return action;
    }
  }

  getFaceMatchIcon(result?: string): string {
    switch (result) {
      case 'match': return 'verified_user';
      case 'no_match': return 'gpp_bad';
      case 'low_confidence': return 'gpp_maybe';
      default: return 'help_outline';
    }
  }

  getFaceMatchColor(result?: string): string {
    switch (result) {
      case 'match': return '#10b981';
      case 'no_match': return '#ef4444';
      case 'low_confidence': return '#f59e0b';
      default: return '#64748b';
    }
  }

  get totalViolations(): number { return this.violations.length; }
  get resolvedCount(): number { return this.violations.filter(v => v.resolved).length; }
  get blockedCount(): number { return this.violations.filter(v => v.actionTaken === 'blocked').length; }
}
