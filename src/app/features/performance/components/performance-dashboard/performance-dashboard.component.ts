import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NgChartsModule } from 'ng2-charts';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { PerformanceService } from '../../services/performance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  EmployeeAppraisal, 
  AppraisalCycle, 
  PerformanceSummary,
  EmployeeSkill,
  PerformanceMetrics
} from '../../../../core/models/performance.models';
import { User } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-performance-dashboard',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatProgressBarModule,
    NgChartsModule
  ],
  template: `
    <div class="performance-dashboard-container">
      
      <!-- Header -->
      <div class="dashboard-header">
        <h1 class="page-title">
          <mat-icon>star</mat-icon>
          Performance Management
        </h1>
      </div>

      <!-- Performance Overview -->
      <div class="overview-section">
        <div class="overview-grid">
          
          <!-- My Performance Card -->
          <mat-card class="performance-overview-card">
            <mat-card-header>
              <mat-card-title>My Performance</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="performance-summary" *ngIf="myPerformanceMetrics">
                <div class="rating-display">
                  <div class="current-rating">
                    <span class="rating-value">{{ myPerformanceMetrics.currentRating | number:'1.1-1' }}</span>
                    <div class="rating-stars">
                      <mat-icon *ngFor="let star of starRatings" 
                                [ngClass]="{ 'filled': star <= myPerformanceMetrics.currentRating }">
                        star
                      </mat-icon>
                    </div>
                  </div>
                  <div class="rating-trend" [ngClass]="'trend-' + myPerformanceMetrics.ratingTrend">
                    <mat-icon>{{ getTrendIcon(myPerformanceMetrics.ratingTrend) }}</mat-icon>
                    {{ myPerformanceMetrics.ratingTrend | titlecase }}
                  </div>
                </div>

                <div class="performance-stats">
                  <div class="stat-item">
                    <span class="stat-label">Skills</span>
                    <span class="stat-value">{{ myPerformanceMetrics.skillsCount }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Goals Completed</span>
                    <span class="stat-value">{{ myPerformanceMetrics.goalsCompleted }}/{{ myPerformanceMetrics.totalGoals }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Last Review</span>
                    <span class="stat-value">{{ (myPerformanceMetrics.lastAppraisalDate | date:'mediumDate') || 'Not available' }}</span>
                  </div>
                </div>
              </div>

              <div *ngIf="!myPerformanceMetrics && !isLoading" class="empty-state">
                <mat-icon>info</mat-icon>
                <p>No performance data available</p>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Skills Card -->
          <mat-card class="skills-card">
            <mat-card-header>
              <mat-card-title>My Skills</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="skills-list" *ngIf="mySkills.length > 0">
                <div *ngFor="let skill of mySkills" class="skill-item">
                  <div class="skill-info">
                    <span class="skill-name">{{ skill.skillName }}</span>
                    <span class="skill-level">Level {{ skill.proficiencyLevel }}/5</span>
                  </div>
                  <mat-progress-bar 
                    mode="determinate" 
                    [value]="(skill.proficiencyLevel / 5) * 100"
                    [color]="getSkillLevelColor(skill.proficiencyLevel)">
                  </mat-progress-bar>
                </div>
              </div>

              <div *ngIf="!mySkills.length && !isLoading" class="empty-state">
                <mat-icon>school</mat-icon>
                <p>No skills assessed yet</p>
              </div>
            </mat-card-content>
          </mat-card>

        </div>
      </div>

      <!-- Main Content Tabs -->
      <mat-card class="main-content-card">
        <mat-tab-group>
          
          <!-- My Appraisals Tab -->
          <mat-tab label="My Appraisals">
            <div class="tab-content">
              <div class="appraisals-section">
                
                <div class="appraisals-list" *ngIf="myAppraisals.length > 0">
                  <mat-card *ngFor="let appraisal of myAppraisals" class="appraisal-card">
                    <mat-card-content>
                      <div class="appraisal-header">
                        <div class="appraisal-info">
                          <h4>{{ appraisal.cycleName }}</h4>
                          <p>{{ appraisal.reviewType | titlecase }} Review by {{ appraisal.reviewerName }}</p>
                        </div>
                        <div class="appraisal-rating" *ngIf="appraisal.overallRating">
                          <div class="rating-value">{{ appraisal.overallRating | number:'1.1-1' }}</div>
                          <div class="rating-stars">
                            <mat-icon *ngFor="let star of starRatings" 
                                      [ngClass]="{ 'filled': star <= appraisal.overallRating! }">
                              star
                            </mat-icon>
                          </div>
                        </div>
                        <mat-chip [color]="getAppraisalStatusColor(appraisal.status)">
                          {{ appraisal.status | titlecase }}
                        </mat-chip>
                      </div>

                      <div class="appraisal-feedback" *ngIf="appraisal.feedback">
                        <h5>Feedback</h5>
                        <p>{{ appraisal.feedback }}</p>
                      </div>

                      <div class="appraisal-development" *ngIf="appraisal.developmentPlan">
                        <h5>Development Plan</h5>
                        <p>{{ appraisal.developmentPlan }}</p>
                      </div>

                      <div class="appraisal-dates">
                        <span *ngIf="appraisal.submittedAt">Submitted: {{ appraisal.submittedAt | date:'mediumDate' }}</span>
                        <span *ngIf="appraisal.reviewedAt">Reviewed: {{ appraisal.reviewedAt | date:'mediumDate' }}</span>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>

                <div *ngIf="!myAppraisals.length && !isLoading" class="empty-state">
                  <mat-icon>assessment</mat-icon>
                  <h3>No Appraisals</h3>
                  <p>You don't have any performance appraisals yet.</p>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Team Performance Tab (for managers) -->
          <mat-tab label="Team Performance" *ngIf="hasManagerRole()">
            <div class="tab-content">
              <div class="team-performance-section">
                <h3>Team Performance Overview</h3>
                
                <div *ngIf="teamPerformanceSummary" class="team-summary">
                  <div class="summary-stats">
                    <div class="stat-card">
                      <div class="stat-value">{{ teamPerformanceSummary.averageRating | number:'1.1-1' }}</div>
                      <div class="stat-label">Average Rating</div>
                    </div>
                    <div class="stat-card">
                      <div class="stat-value">{{ teamPerformanceSummary.totalAppraisals }}</div>
                      <div class="stat-label">Total Appraisals</div>
                    </div>
                    <div class="stat-card">
                      <div class="stat-value">{{ teamPerformanceSummary.pendingAppraisals }}</div>
                      <div class="stat-label">Pending Reviews</div>
                    </div>
                  </div>

                  <div class="top-performers" *ngIf="teamPerformanceSummary.topPerformers.length > 0">
                    <h4>Top Performers</h4>
                    <div class="performers-list">
                      <div *ngFor="let performer of teamPerformanceSummary.topPerformers" class="performer-item">
                        <div class="performer-info">
                          <span class="performer-name">{{ performer.employeeName }}</span>
                          <span class="performer-dept">{{ performer.department }}</span>
                        </div>
                        <div class="performer-rating">
                          <span>{{ performer.rating | number:'1.1-1' }}</span>
                          <div class="rating-stars">
                            <mat-icon *ngFor="let star of starRatings" 
                                      [ngClass]="{ 'filled': star <= performer.rating }">
                              star
                            </mat-icon>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div *ngIf="!teamPerformanceSummary && !isLoading" class="empty-state">
                  <mat-icon>group</mat-icon>
                  <h3>No Team Data</h3>
                  <p>No team performance data available.</p>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Appraisal Cycles Tab (for HR) -->
          <mat-tab label="Appraisal Cycles" *ngIf="hasHRRole()">
            <div class="tab-content">
              <div class="cycles-section">
                <div class="section-header">
                  <h3>Appraisal Cycles</h3>
                  <button mat-raised-button color="primary" (click)="createAppraisalCycle()">
                    <mat-icon>add</mat-icon>
                    New Cycle
                  </button>
                </div>

                <div class="cycles-list">
                  <mat-card *ngFor="let cycle of appraisalCycles" class="cycle-card">
                    <mat-card-content>
                      <div class="cycle-header">
                        <h4>{{ cycle.cycleName }}</h4>
                        <mat-chip [color]="getCycleStatusColor(cycle.status)">
                          {{ cycle.status | titlecase }}
                        </mat-chip>
                      </div>
                      <p class="cycle-description">{{ cycle.description }}</p>
                      <div class="cycle-dates">
                        <span>{{ cycle.startDate | date:'mediumDate' }} - {{ cycle.endDate | date:'mediumDate' }}</span>
                      </div>
                      <div class="cycle-actions">
                        <button mat-stroked-button (click)="viewCycleDetails(cycle)">
                          <mat-icon>visibility</mat-icon>
                          View Details
                        </button>
                        <button mat-stroked-button (click)="manageCycle(cycle)">
                          <mat-icon>settings</mat-icon>
                          Manage
                        </button>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>

                <div *ngIf="!appraisalCycles.length && !isLoading" class="empty-state">
                  <mat-icon>event</mat-icon>
                  <h3>No Appraisal Cycles</h3>
                  <p>No appraisal cycles have been created yet.</p>
                  <button mat-raised-button color="primary" (click)="createAppraisalCycle()">
                    <mat-icon>add</mat-icon>
                    Create First Cycle
                  </button>
                </div>
              </div>
            </div>
          </mat-tab>

        </mat-tab-group>
      </mat-card>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="60"></mat-spinner>
        <p>Loading performance data...</p>
      </div>

    </div>
  `,
  styleUrls: ['./performance-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  // Array for star ratings
  starRatings = [1, 2, 3, 4, 5];

  // Data properties
  currentUser: User | null = null;
  myPerformanceMetrics: PerformanceMetrics | null = null;
  mySkills: EmployeeSkill[] = [];
  myAppraisals: EmployeeAppraisal[] = [];
  teamPerformanceSummary: PerformanceSummary | null = null;
  appraisalCycles: AppraisalCycle[] = [];

  // UI state
  isLoading = false;
  selectedTab = 0;

  constructor(
    private performanceService: PerformanceService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUserValue();
  }

  private loadInitialData(): void {
    this.isLoading = true;

    const requests: any[] = [
      this.performanceService.getMyPerformanceMetrics(),
      this.performanceService.getMySkills(),
      this.performanceService.getMyAppraisals()
    ];

    if (this.hasManagerRole()) {
      requests.push(this.performanceService.getTeamPerformanceSummary());
    }

    if (this.hasHRRole()) {
      requests.push(this.performanceService.getAppraisalCycles());
    }

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results: any[]) => {
          this.myPerformanceMetrics = results[0] || null;
          this.mySkills = results[1] || [];
          this.myAppraisals = results[2] || [];
          
          if (this.hasManagerRole() && results[3]) {
            this.teamPerformanceSummary = results[3];
          }
          
          if (this.hasHRRole() && results[4]) {
            this.appraisalCycles = results[4];
          }

          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading performance data:', error);
          this.notificationService.showError('Failed to load performance data');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  createAppraisalCycle(): void {
    this.notificationService.showInfo('Create appraisal cycle dialog will be implemented');
  }

  viewCycleDetails(cycle: AppraisalCycle): void {
    this.notificationService.showInfo('Cycle details view will be implemented');
  }

  manageCycle(cycle: AppraisalCycle): void {
    this.notificationService.showInfo('Cycle management will be implemented');
  }

  hasManagerRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager', 'Manager']);
  }

  hasHRRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

  getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      case 'stable': return 'trending_flat';
      default: return 'remove';
    }
  }

  getSkillLevelColor(level: number): 'primary' | 'accent' | 'warn' {
    if (level >= 4) return 'primary';
    if (level >= 3) return 'accent';
    return 'warn';
  }

  getAppraisalStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'primary';
      case 'submitted':
      case 'under_review':
        return 'accent';
      case 'draft':
        return 'warn';
      default:
        return undefined;
    }
  }

  getCycleStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'primary';
      case 'completed':
        return 'accent';
      case 'cancelled':
        return 'warn';
      default:
        return undefined;
    }
  }
}