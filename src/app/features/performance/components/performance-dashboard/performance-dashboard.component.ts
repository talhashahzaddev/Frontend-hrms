import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject, takeUntil } from 'rxjs';

import { PerformanceSummary, PerformanceMetrics, DepartmentPerformance, SkillGap, EmployeeAppraisal, AppraisalStatus } from '../../../../core/models/performance.models';

@Component({
  selector: 'app-performance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule
  ],
  template: `
    <!-- Performance Dashboard Container -->
    <div class="performance-dashboard-container">
      
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">
            <mat-icon>trending_up</mat-icon>
            Performance Dashboard
          </h1>
          <p class="page-subtitle">Track employee performance, skills, and appraisal progress</p>
        </div>
        
        <div class="header-actions">
          <button mat-stroked-button routerLink="/performance/skills" class="action-btn">
            <mat-icon>stars</mat-icon>
            Skills Management
          </button>
          <button mat-stroked-button routerLink="/performance/appraisals" class="action-btn">
            <mat-icon>assignment</mat-icon>
            Appraisals
          </button>
          <button mat-flat-button routerLink="/performance/cycles" class="process-btn">
            <mat-icon>add</mat-icon>
            New Cycle
          </button>
        </div>
      </div>

      <!-- Performance Metrics Cards -->
      <div class="metrics-grid" *ngIf="mockMetrics">
        <mat-card class="metric-card primary">
          <mat-card-content>
            <div class="metric-content">
              <div class="metric-icon">
                <mat-icon>star</mat-icon>
              </div>
              <div class="metric-info">
                <div class="metric-value">{{ mockMetrics.averageRating.toFixed(1) }}</div>
                <div class="metric-label">Average Rating</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card success">
          <mat-card-content>
            <div class="metric-content">
              <div class="metric-icon">
                <mat-icon>assignment_turned_in</mat-icon>
              </div>
              <div class="metric-info">
                <div class="metric-value">{{ mockMetrics.totalAppraisals }}</div>
                <div class="metric-label">Total Appraisals</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card info">
          <mat-card-content>
            <div class="metric-content">
              <div class="metric-icon">
                <mat-icon>check_circle</mat-icon>
              </div>
              <div class="metric-info">
                <div class="metric-value">{{ mockMetrics.completionRate }}%</div>
                <div class="metric-label">Completion Rate</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card warning">
          <mat-card-content>
            <div class="metric-content">
              <div class="metric-icon">
                <mat-icon>emoji_events</mat-icon>
              </div>
              <div class="metric-info">
                <div class="metric-value">{{ mockMetrics.topPerformers }}</div>
                <div class="metric-label">Top Performers</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Department Performance -->
      <mat-card class="department-performance-card">
        <mat-card-header>
          <mat-card-title>Department Performance</mat-card-title>
          <div class="card-actions">
            <button mat-stroked-button>View Details</button>
          </div>
        </mat-card-header>
        
        <mat-card-content>
          <div class="department-list">
            <div *ngFor="let dept of mockDepartmentPerformance" class="department-item">
              <div class="department-info">
                <div class="department-name">{{ dept.department }}</div>
                <div class="department-stats">
                  {{ dept.completedAppraisals }}/{{ dept.totalEmployees }} employees
                </div>
              </div>
              
              <div class="performance-metrics">
                <div class="rating-display">
                  <div class="rating-value">{{ dept.averageRating.toFixed(1) }}</div>
                  <div class="rating-stars">
                    <mat-icon *ngFor="let star of getStarArray(dept.averageRating)" 
                             [class.filled]="star <= dept.averageRating">star</mat-icon>
                  </div>
                </div>
                
                <div class="completion-progress">
                  <div class="progress-label">{{ dept.completionRate }}% Complete</div>
                  <mat-progress-bar [value]="dept.completionRate" mode="determinate"></mat-progress-bar>
                </div>
              </div>
            </div>
          </div>
          
          <div class="empty-state" *ngIf="mockDepartmentPerformance.length === 0">
            <mat-icon>business</mat-icon>
            <h3>No department data</h3>
            <p>No performance data available for departments.</p>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Recent Appraisals and Skill Gaps Row -->
      <div class="dashboard-row">
        <!-- Recent Appraisals -->
        <mat-card class="recent-appraisals-card">
          <mat-card-header>
            <mat-card-title>Recent Appraisals</mat-card-title>
            <div class="card-actions">
              <button mat-stroked-button routerLink="/performance/appraisals">View All</button>
            </div>
          </mat-card-header>
          
          <mat-card-content>
            <div class="appraisals-list">
              <div *ngFor="let appraisal of mockRecentAppraisals" class="appraisal-item">
                <div class="employee-info">
                  <div class="employee-avatar">
                    <mat-icon>person</mat-icon>
                  </div>
                  <div class="employee-details">
                    <div class="employee-name">{{ getEmployeeName(appraisal) }}</div>
                    <div class="appraisal-cycle">{{ appraisal.appraisalCycle?.name }}</div>
                  </div>
                </div>
                
                <div class="appraisal-status">
                  <div [class]="'status-indicator ' + appraisal.status">
                    {{ appraisal.status | titlecase }}
                  </div>
                  <div class="rating" *ngIf="appraisal.managerRating">
                    {{ appraisal.managerRating }}/5
                  </div>
                </div>
              </div>
            </div>
            
            <div class="empty-state" *ngIf="mockRecentAppraisals.length === 0">
              <mat-icon>assignment</mat-icon>
              <h3>No recent appraisals</h3>
              <p>No appraisals found.</p>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Top Skill Gaps -->
        <mat-card class="skill-gaps-card">
          <mat-card-header>
            <mat-card-title>Top Skill Gaps</mat-card-title>
            <div class="card-actions">
              <button mat-stroked-button routerLink="/performance/skills">Manage Skills</button>
            </div>
          </mat-card-header>
          
          <mat-card-content>
            <div class="skill-gaps-list">
              <div *ngFor="let gap of mockSkillGaps" class="skill-gap-item">
                <div class="skill-info">
                  <div class="skill-name">{{ gap.skillName }}</div>
                  <div class="employee-count">{{ gap.employeeCount }} employees</div>
                </div>
                
                <div class="gap-visualization">
                  <div class="gap-levels">
                    <span class="current-level">Current: {{ gap.currentLevel }}/5</span>
                    <span class="target-level">Target: {{ gap.targetLevel }}/5</span>
                  </div>
                  <div class="gap-indicator">
                    <div class="gap-bar">
                      <div class="current-progress" [style.width.%]="(gap.currentLevel / 5) * 100"></div>
                      <div class="target-marker" [style.left.%]="(gap.targetLevel / 5) * 100"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="empty-state" *ngIf="mockSkillGaps.length === 0">
              <mat-icon>trending_up</mat-icon>
              <h3>No skill gaps identified</h3>
              <p>All skills are at target levels.</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styleUrls: ['./performance-dashboard.component.scss']
})
export class PerformanceDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Mock data for demonstration
  mockMetrics: PerformanceMetrics = {
    averageRating: 4.2,
    totalAppraisals: 145,
    completionRate: 87,
    topPerformers: 23,
    improvementNeeded: 12
  };

  mockDepartmentPerformance: DepartmentPerformance[] = [
    {
      department: 'Engineering',
      averageRating: 4.5,
      totalEmployees: 45,
      completedAppraisals: 42,
      completionRate: 93
    },
    {
      department: 'Sales',
      averageRating: 4.1,
      totalEmployees: 28,
      completedAppraisals: 25,
      completionRate: 89
    },
    {
      department: 'Marketing',
      averageRating: 3.9,
      totalEmployees: 18,
      completedAppraisals: 14,
      completionRate: 78
    },
    {
      department: 'HR',
      averageRating: 4.3,
      totalEmployees: 8,
      completedAppraisals: 7,
      completionRate: 88
    }
  ];

  mockSkillGaps: SkillGap[] = [
    {
      skillName: 'Project Management',
      currentLevel: 2.8,
      targetLevel: 4.0,
      gap: 1.2,
      employeeCount: 15
    },
    {
      skillName: 'Data Analysis',
      currentLevel: 3.1,
      targetLevel: 4.5,
      gap: 1.4,
      employeeCount: 22
    },
    {
      skillName: 'Leadership',
      currentLevel: 2.5,
      targetLevel: 4.0,
      gap: 1.5,
      employeeCount: 12
    }
  ];

  mockRecentAppraisals: EmployeeAppraisal[] = [
    {
      employeeAppraisalId: '1',
      employeeId: '1',
      appraisalCycleId: '1',
      kraId: '1',
      selfRating: 4,
      managerRating: 4,
      achievements: 'Exceeded project delivery targets',
      challenges: 'Time management in multiple projects',
      developmentPlan: 'Project management certification',
      managerComments: 'Strong performer with growth potential',
      status: AppraisalStatus.COMPLETED,
      employee: {
        employeeId: '1',
        firstName: 'John',
        lastName: 'Doe',
        employeeNumber: 'EMP001',
        department: 'Engineering'
      },
      appraisalCycle: {
        appraisalCycleId: '1',
        name: 'Q1 2024 Performance Review',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        reviewStartDate: '2024-04-01',
        reviewEndDate: '2024-04-15',
        status: AppraisalStatus.COMPLETED,
        organizationId: '1',
        totalEmployees: 150,
        completedAppraisals: 130,
        createdAt: '2024-01-01'
      }
    },
    {
      employeeAppraisalId: '2',
      employeeId: '2',
      appraisalCycleId: '1',
      kraId: '1',
      selfRating: 3,
      achievements: 'Met quarterly sales targets',
      challenges: 'Client relationship management',
      developmentPlan: 'Sales training program',
      status: AppraisalStatus.SUBMITTED,
      employee: {
        employeeId: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        employeeNumber: 'EMP002',
        department: 'Sales'
      },
      appraisalCycle: {
        appraisalCycleId: '1',
        name: 'Q1 2024 Performance Review',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        reviewStartDate: '2024-04-01',
        reviewEndDate: '2024-04-15',
        status: AppraisalStatus.IN_PROGRESS,
        organizationId: '1',
        totalEmployees: 150,
        completedAppraisals: 130,
        createdAt: '2024-01-01'
      }
    }
  ];

  ngOnInit(): void {
    // Load actual data here
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getEmployeeName(appraisal: EmployeeAppraisal): string {
    return `${appraisal.employee?.firstName} ${appraisal.employee?.lastName}`;
  }

  getStarArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }
}
