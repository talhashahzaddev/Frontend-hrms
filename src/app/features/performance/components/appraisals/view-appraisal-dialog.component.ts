import { Component, Inject, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { EmployeeAppraisal, KRA, SkillSet } from '../../../../core/models/performance.models';
import { PerformanceService } from '../../services/performance.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface ViewAppraisalDialogData {
  appraisal: EmployeeAppraisal;
}


@Component({
  selector: 'app-view-appraisal-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>visibility</mat-icon>
          </div>
          <div>
            <h2 class="header-title">Appraisal Details</h2>
            <p class="header-subtitle">View full appraisal information</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-body">
        
        <div class="assign-section">
          <div class="assign-section-header">
            <mat-icon>info</mat-icon>
            <span>Appraisal Information</span>
          </div>
          <div class="assign-section-body">
            <div class="assign-dates-grid">
              <div class="assign-field-group">
                <label class="field-label">Cycle</label>
                <div class="readonly-value">{{ data.appraisal.cycleName }}</div>
              </div>
              <div class="assign-field-group">
                <label class="field-label">Employee</label>
                <div class="readonly-value">{{ data.appraisal.employeeName }}</div>
              </div>
            </div>
            
            <div class="assign-dates-grid">
              <div class="assign-field-group">
                <label class="field-label">Review Type</label>
                <div class="readonly-value">{{ data.appraisal.reviewType | titlecase }}</div>
              </div>
              <div class="assign-field-group">
                <label class="field-label">Reviewer</label>
                <div class="readonly-value">{{ data.appraisal.reviewerName || 'N/A' }}</div>
              </div>
            </div>
            
            <div class="assign-dates-grid">
              <div class="assign-field-group">
                <label class="field-label">Overall Rating</label>
                <div class="readonly-value">
                  <span *ngIf="data.appraisal.overallRating">{{ data.appraisal.overallRating | number:'1.1-1' }} / 5.0</span>
                  <span *ngIf="!data.appraisal.overallRating">N/A</span>
                </div>
              </div>
              <div class="assign-field-group">
                <label class="field-label">Status</label>
                <div>
                  <mat-chip [class]="getStatusChipClass(data.appraisal.status)">
                    {{ data.appraisal.status | titlecase }}
                  </mat-chip>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="assign-section" *ngIf="data.appraisal.feedback">
          <div class="assign-section-header">
            <mat-icon>chat</mat-icon>
            <span>Feedback</span>
          </div>
          <div class="assign-section-body">
            <div class="readonly-value">{{ data.appraisal.feedback }}</div>
          </div>
        </div>

        <div class="assign-section" *ngIf="data.appraisal.improvementAreas">
          <div class="assign-section-header">
            <mat-icon>trending_up</mat-icon>
            <span>Improvement Areas</span>
          </div>
          <div class="assign-section-body">
            <div class="readonly-value">{{ data.appraisal.improvementAreas }}</div>
          </div>
        </div>

        <div class="assign-section" *ngIf="data.appraisal.developmentPlan">
          <div class="assign-section-header">
            <mat-icon>school</mat-icon>
            <span>Development Plan</span>
          </div>
          <div class="assign-section-body">
            <div class="readonly-value">{{ data.appraisal.developmentPlan }}</div>
          </div>
        </div>

        <!-- KRA Ratings Section -->
        <div class="assign-section" *ngIf="hasKraRatings(data.appraisal)">
          <div class="assign-section-header">
            <mat-icon>track_changes</mat-icon>
            <span>KRA Ratings</span>
          </div>
          <div class="assign-section-body">
            <div class="rating-grid">
              <div *ngFor="let kraRating of getKraRatingsList(data.appraisal.kraRatings)" class="rating-item">
                <span class="rating-name">{{ kraRating.kraName || 'KRA' }}</span>
                <span class="rating-badge">{{ kraRating.rating }}/5</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Skill Ratings Section -->
        <div class="assign-section" *ngIf="hasSkillRatings(data.appraisal)">
          <div class="assign-section-header">
            <mat-icon>psychology</mat-icon>
            <span>Skill Ratings</span>
          </div>
          <div class="assign-section-body">
            <div class="rating-grid">
              <div *ngFor="let skillRating of getSkillRatingsList(data.appraisal.skillRatings)" class="rating-item">
                <span class="rating-name">{{ skillRating.skillName || 'Skill' }}</span>
                <span class="rating-badge">{{ skillRating.rating }}/5</span>
              </div>
            </div>
          </div>
        </div>

        <div class="assign-section" *ngIf="data.appraisal.createdAt || data.appraisal.submittedAt || data.appraisal.reviewedAt">
          <div class="assign-section-header">
            <mat-icon>schedule</mat-icon>
            <span>Timeline</span>
          </div>
          <div class="assign-section-body">
            <div class="assign-dates-grid">
              <div class="assign-field-group" *ngIf="data.appraisal.createdAt">
                <label class="field-label">Created</label>
                <div class="readonly-value">{{ data.appraisal.createdAt | localizedDate:'medium' }}</div>
              </div>
              <div class="assign-field-group">
                <label class="field-label">Submitted</label>
                <div class="readonly-value">
                  <span *ngIf="data.appraisal.submittedAt">{{ data.appraisal.submittedAt | localizedDate:'medium' }}</span>
                  <span *ngIf="!data.appraisal.submittedAt">Not submitted</span>
                </div>
              </div>
              <div class="assign-field-group">
                <label class="field-label">Reviewed</label>
                <div class="readonly-value">
                  <span *ngIf="data.appraisal.reviewedAt">{{ data.appraisal.reviewedAt | localizedDate:'medium' }}</span>
                  <span *ngIf="!data.appraisal.reviewedAt">Not reviewed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </mat-dialog-content>

      <div class="dialog-footer">
        <button mat-stroked-button class="btn-cancel" mat-dialog-close>
          <mat-icon>close</mat-icon> Close
        </button>
      </div>
    </div>
  `,
  styles: [`
    @use '../../styles/performance-shared';

    .readonly-value {
      font-size: 14px;
      color: #1e293b;
      font-weight: 500;
      padding: 10px 14px;
      background: #f1f5f9;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      min-height: 20px;
    }

    .rating-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .rating-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    .rating-name {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
    }

    .rating-badge {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-completed { background-color: #10b981 !important; color: white !important; }
    .status-submitted { background-color: #3b82f6 !important; color: white !important; }
    .status-under-review { background-color: #f59e0b !important; color: white !important; }
    .status-draft { background-color: #64748b !important; color: white !important; }
    .status-rejected { background-color: #ef4444 !important; color: white !important; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewAppraisalDialogComponent implements OnInit, OnDestroy {
  allKras: KRA[] = [];
  allSkills: SkillSet[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<ViewAppraisalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ViewAppraisalDialogData,
    private performanceService: PerformanceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAllKras();
    this.loadAllSkills();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAllKras(): void {
    this.performanceService.getKRAs(1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const paginatedData = response.data as any;
            this.allKras = (paginatedData.items || paginatedData.data || []).filter((kra: KRA) => kra.isActive);
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error loading KRAs:', error);
        }
      });
  }

  private loadAllSkills(): void {
    this.performanceService.getSkillsMatrix()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response && response.success) {
            const skills = response.data || [];
            this.allSkills = (Array.isArray(skills) ? skills : []).filter((skill: SkillSet) => skill.isActive !== false);
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error loading skills:', error);
        }
      });
  }

  hasKraRatings(appraisal: EmployeeAppraisal): boolean {
    if (!appraisal || !appraisal.kraRatings) return false;
    return Object.keys(appraisal.kraRatings).length > 0;
  }

  hasSkillRatings(appraisal: EmployeeAppraisal): boolean {
    if (!appraisal || !appraisal.skillRatings) return false;
    return Object.keys(appraisal.skillRatings).length > 0;
  }

  getKraRatingsList(kraRatings: { [kraId: string]: number }): Array<{ kraId: string; kraName: string; rating: number }> {
    if (!kraRatings) return [];
    return Object.entries(kraRatings).map(([kraId, rating]) => {
      const kra = this.allKras.find(k => k.kraId === kraId);
      return {
        kraId,
        kraName: kra?.title || 'Unknown KRA',
        rating
      };
    });
  }

  getSkillRatingsList(skillRatings: { [skillId: string]: number }): Array<{ skillId: string; skillName: string; rating: number }> {
    if (!skillRatings) return [];
    return Object.entries(skillRatings).map(([skillId, rating]) => {
      const skill = this.allSkills.find(s => s.skillId === skillId);
      return {
        skillId,
        skillName: skill?.skillName || 'Unknown Skill',
        rating
      };
    });
  }

  getStatusChipClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'status-completed';
      case 'submitted':
        return 'status-submitted';
      case 'under_review':
        return 'status-under-review';
      case 'draft':
        return 'status-draft';
      case 'rejected':
        return 'status-rejected';
      default:
        return 'status-draft';
    }
  }
}

