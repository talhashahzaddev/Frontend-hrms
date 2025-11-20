import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { NgChartsModule } from 'ng2-charts';
import { Subject, takeUntil } from 'rxjs';

import { PerformanceService } from '../../services/performance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EmployeePerformanceHistory, EmployeeAppraisal, SkillGapAnalysis } from '../../../../core/models/performance.models';
import { User } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-employee-performance-history',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatExpansionModule,
    MatTabsModule,
    NgChartsModule
  ],
  templateUrl: './employee-performance-history.component.html',
  styleUrls: ['./employee-performance-history.component.scss']
})
export class EmployeePerformanceHistoryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isLoading = false;
  currentUser: User | null = null;
  employeeId: string | null = null;
  performanceHistory: EmployeePerformanceHistory | null = null;
  selectedTab = 0;

  displayedColumns: string[] = ['cycle', 'rating', 'status', 'date', 'actions'];

  constructor(
    private performanceService: PerformanceService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUserValue();
    this.route.paramMap.subscribe(params => {
      this.employeeId = params.get('id') || this.currentUser?.userId || null;
      if (this.employeeId) {
        this.loadPerformanceHistory();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPerformanceHistory(): void {
    if (!this.employeeId) return;

    // Check if user can view this employee's history
    if (this.currentUser?.userId !== this.employeeId && 
        !this.authService.hasAnyRole(['Super Admin', 'HR Manager', 'Manager'])) {
      this.notificationService.showError('You do not have permission to view this employee\'s performance history');
      return;
    }

    this.isLoading = true;
    this.performanceService.getEmployeePerformanceHistory(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.performanceHistory = response.data;
          } else {
            this.notificationService.showWarning('No performance history found');
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading performance history:', error);
          this.notificationService.showError('Failed to load performance history');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (status?.toLowerCase()) {
      case 'completed': return 'primary';
      case 'submitted': return 'accent';
      case 'draft': return undefined;
      default: return undefined;
    }
  }

  viewAppraisalDetails(appraisal: EmployeeAppraisal): void {
    // Navigate to appraisal details or open dialog
    this.notificationService.showInfo(`Viewing appraisal: ${appraisal.appraisalId}`);
  }

  getSkillGapSeverity(gap: number): string {
    if (gap >= 3) return 'high';
    if (gap >= 2) return 'medium';
    return 'low';
  }
}





