import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { EmployeeAppraisal } from '../../../../core/models/performance.models';

export interface ViewAppraisalDialogData {
  appraisal: EmployeeAppraisal;
}

@Component({
  selector: 'app-view-appraisal-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>visibility</mat-icon>
        Appraisal Details
      </h2>
      <button mat-icon-button mat-dialog-close class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <div class="appraisal-details">
        <div class="detail-section mb-4">
          <h3 class="text-xl font-semibold mb-2">Appraisal Information</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <strong>Cycle:</strong> {{ data.appraisal.cycleName }}
            </div>
            <div>
              <strong>Employee:</strong> {{ data.appraisal.employeeName }}
            </div>
            <div>
              <strong>Review Type:</strong> {{ data.appraisal.reviewType | titlecase }}
            </div>
            <div>
              <strong>Reviewer:</strong> {{ data.appraisal.reviewerName || 'N/A' }}
            </div>
            <div>
              <strong>Overall Rating:</strong> 
              <span *ngIf="data.appraisal.overallRating">{{ data.appraisal.overallRating | number:'1.1-1' }}</span>
              <span *ngIf="!data.appraisal.overallRating">N/A</span>
            </div>
            <div>
              <strong>Status:</strong>
              <mat-chip [class]="getStatusChipClass(data.appraisal.status)">
                {{ data.appraisal.status | titlecase }}
              </mat-chip>
            </div>
          </div>
        </div>

        <div class="detail-section mb-4" *ngIf="data.appraisal.feedback">
          <h3 class="text-lg font-semibold mb-2">Feedback</h3>
          <p>{{ data.appraisal.feedback }}</p>
        </div>

        <div class="detail-section mb-4" *ngIf="data.appraisal.improvementAreas">
          <h3 class="text-lg font-semibold mb-2">Improvement Areas</h3>
          <p>{{ data.appraisal.improvementAreas }}</p>
        </div>

        <div class="detail-section mb-4" *ngIf="data.appraisal.developmentPlan">
          <h3 class="text-lg font-semibold mb-2">Development Plan</h3>
          <p>{{ data.appraisal.developmentPlan }}</p>
        </div>

        <!-- KRA Ratings Section -->
        <div class="detail-section mb-4" *ngIf="hasKraRatings(data.appraisal)">
          <h3 class="text-lg font-semibold mb-2">KRA Ratings</h3>
          <div class="kra-ratings-list">
            <div *ngFor="let kraRating of getKraRatingsList(data.appraisal.kraRatings)" class="kra-rating-item">
              <div class="kra-rating-header">
                <strong>{{ kraRating.kraName || 'KRA' }}</strong>
                <span class="rating-badge">{{ kraRating.rating }}/5</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Skill Ratings Section -->
        <div class="detail-section mb-4" *ngIf="hasSkillRatings(data.appraisal)">
          <h3 class="text-lg font-semibold mb-2">Skill Ratings</h3>
          <div class="skill-ratings-list">
            <div *ngFor="let skillRating of getSkillRatingsList(data.appraisal.skillRatings)" class="skill-rating-item">
              <div class="skill-rating-header">
                <strong>{{ skillRating.skillName || 'Skill' }}</strong>
                <span class="rating-badge">{{ skillRating.rating }}/5</span>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-section mb-4" *ngIf="data.appraisal.createdAt || data.appraisal.submittedAt || data.appraisal.reviewedAt">
          <h3 class="text-lg font-semibold mb-2">Timeline</h3>
          <div class="grid grid-cols-2 gap-4">
            <div *ngIf="data.appraisal.createdAt">
              <strong>Created:</strong> {{ data.appraisal.createdAt | date:'medium' }}
            </div>
            <div>
              <strong>Submitted:</strong> 
              <span *ngIf="data.appraisal.submittedAt">{{ data.appraisal.submittedAt | date:'medium' }}</span>
              <span *ngIf="!data.appraisal.submittedAt">Not submitted</span>
            </div>
            <div>
              <strong>Reviewed:</strong>
              <span *ngIf="data.appraisal.reviewedAt">{{ data.appraisal.reviewedAt | date:'medium' }}</span>
              <span *ngIf="!data.appraisal.reviewedAt">Not reviewed</span>
            </div>
          </div>
        </div>
      </div>
    </mat-dialog-content>

    <div class="dialog-actions">
      <button mat-stroked-button mat-dialog-close>
        <mat-icon>close</mat-icon>
        Close
      </button>
    </div>
  `,
  styles: [`
    ::ng-deep .mat-mdc-dialog-container {
      border-radius: 16px !important;
      padding: 0 !important;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
      max-width: 900px !important;
      width: 90vw !important;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;

      h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        color: white;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          color: white;
        }
      }

      .close-button {
        color: white;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: rotate(90deg);
        }
      }
    }

    .dialog-content {
      padding: 28px !important;
      max-height: 70vh;
      overflow-y: auto;
    }

    .appraisal-details {
      .detail-section {
        margin-bottom: 24px;

        h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 16px 0;
          padding-bottom: 12px;
          border-bottom: 2px solid #e5e7eb;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;

          div {
            strong {
              color: #374151;
              font-weight: 600;
              margin-right: 8px;
            }
          }
        }
      }

      .kra-ratings-list,
      .skill-ratings-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .kra-rating-item,
      .skill-rating-item {
        padding: 12px;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }

      .kra-rating-header,
      .skill-rating-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        strong {
          color: #1f2937;
          font-weight: 600;
        }

        .rating-badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.875rem;
        }
      }
    }

    .dialog-actions {
      padding: 20px 28px !important;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 12px;

      button {
        height: 44px;
        padding: 0 28px !important;
        border-radius: 12px !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        text-transform: none !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        display: flex;
        align-items: center;
        gap: 8px;

        &[mat-stroked-button] {
          background: white !important;
          color: #6b7280 !important;
          border: 2px solid #e5e7eb !important;

          &:hover:not([disabled]) {
            background: #f9fafb !important;
            border-color: #cbd5e1 !important;
            color: #374151 !important;
          }
        }
      }
    }

    .status-completed {
      background-color: #10b981 !important;
      color: white !important;
    }

    .status-submitted {
      background-color: #3b82f6 !important;
      color: white !important;
    }

    .status-under-review {
      background-color: #f59e0b !important;
      color: white !important;
    }

    .status-draft {
      background-color: #6b7280 !important;
      color: white !important;
    }

    .status-rejected {
      background-color: #ef4444 !important;
      color: white !important;
    }

    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr !important;
      }

      ::ng-deep .mat-mdc-dialog-container {
        width: 95vw !important;
        max-width: 95vw !important;
      }

      .dialog-content {
        max-height: 80vh;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewAppraisalDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ViewAppraisalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ViewAppraisalDialogData
  ) {}

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
    return Object.entries(kraRatings).map(([kraId, rating]) => ({
      kraId,
      kraName: `KRA ${kraId.substring(0, 8)}`,
      rating
    }));
  }

  getSkillRatingsList(skillRatings: { [skillId: string]: number }): Array<{ skillId: string; skillName: string; rating: number }> {
    if (!skillRatings) return [];
    return Object.entries(skillRatings).map(([skillId, rating]) => ({
      skillId,
      skillName: `Skill ${skillId.substring(0, 8)}`,
      rating
    }));
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

