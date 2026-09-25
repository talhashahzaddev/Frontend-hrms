import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-appraisal-all-tables-view-details',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>assignment</mat-icon>
          </div>
          <div>
            <h2 class="header-title">{{ data?.employeeName || data?.managerName || 'Details' }}</h2>
            <p class="header-subtitle">{{ data?.goalName || 'Performance Review Details' }}</p>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-body">
        <!-- Status & Cycle Header Info -->
        <div class="assign-section">
          <div class="assign-section-body" style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
              <mat-icon style="color:#64748b; font-size:18px; width:18px; height:18px;">calendar_today</mat-icon>
              <span style="font-size:14px; color:#334155; font-weight:500;">{{ data?.cycleName || '—' }}</span>
            </div>
            <div>
              <mat-chip [class]="getStatusChipClass(data?.status)">
                {{ data?.status ? (data.status | titlecase) : '—' }}
              </mat-chip>
            </div>
          </div>
        </div>

        <!-- Manager Review View -->
        <div class="assign-section" *ngIf="isManagerReview()">
          <div class="assign-section-header">
            <mat-icon>person_search</mat-icon>
            <span>Manager Review Overview</span>
          </div>
          <div class="assign-section-body">
            <div class="assign-dates-grid">
              <div class="assign-field-group" *ngIf="data?.kraName">
                <label class="field-label">KRA</label>
                <div class="readonly-value"><mat-chip [class]="getKraChipClass(data?.kraName)">{{ data?.kraName }}</mat-chip></div>
              </div>
              <div class="assign-field-group" *ngIf="data?.goalName">
                <label class="field-label">Goal</label>
                <div class="readonly-value">{{ data?.goalName }}</div>
              </div>
              <div class="assign-field-group">
                <label class="field-label">Manager</label>
                <div class="readonly-value">{{ data?.managerName || '—' }}</div>
              </div>
              <div class="assign-field-group">
                <label class="field-label">Submitted</label>
                <div class="readonly-value">{{ (data?.submittedAt || data?.createdAt) ? ((data.submittedAt || data.createdAt) | date:'medium') : '—' }}</div>
              </div>
            </div>

            <div class="assign-field-group" style="margin-top:12px;">
              <label class="field-label">Rating</label>
              <div class="readonly-value" style="display:flex; align-items:center; gap:12px;">
                <div class="star-row">
                  <mat-icon *ngFor="let s of [1,2,3,4,5]" [ngClass]="getStarClass(s, data?.rating)">star</mat-icon>
                </div>
                <span style="font-weight:600; color:#334155;">{{ getRatingDisplay(data?.rating ?? getRatingValue()) }} / 5.0</span>
              </div>
            </div>

            <div class="assign-field-group" style="margin-top:12px;" *ngIf="data?.feedback || data?.comments">
              <label class="field-label">Feedback</label>
              <div class="readonly-value" style="min-height:60px;">{{ data?.feedback || data?.comments || '—' }}</div>
            </div>
          </div>
        </div>

        <!-- Self Assessment View -->
        <div class="assign-section" *ngIf="isSelfAssessment()">
          <div class="assign-section-header">
            <mat-icon>self_improvement</mat-icon>
            <span>Self Assessment Overview</span>
          </div>
          <div class="assign-section-body">
            <div class="assign-dates-grid">
              <div class="assign-field-group" *ngIf="data?.kraName">
                <label class="field-label">KRA</label>
                <div class="readonly-value"><mat-chip [class]="getKraChipClass(data?.kraName)">{{ data?.kraName }}</mat-chip></div>
              </div>
              <div class="assign-field-group" *ngIf="data?.goalName">
                <label class="field-label">Goal</label>
                <div class="readonly-value">{{ data?.goalName }}</div>
              </div>
              <div class="assign-field-group">
                <label class="field-label">Employee</label>
                <div class="readonly-value">{{ data?.employeeName || '—' }}</div>
              </div>
              <div class="assign-field-group">
                <label class="field-label">Submitted</label>
                <div class="readonly-value">{{ (data?.submittedAt || data?.createdAt) ? ((data.submittedAt || data.createdAt) | date:'medium') : '—' }}</div>
              </div>
            </div>

            <div class="assign-field-group" style="margin-top:12px;">
              <label class="field-label">Self Rating</label>
              <div class="readonly-value" style="display:flex; align-items:center; gap:12px;">
                <div class="star-row">
                  <mat-icon *ngFor="let s of [1,2,3,4,5]" [ngClass]="getStarClass(s, data?.selfRating)">star</mat-icon>
                </div>
                <span style="font-weight:600; color:#334155;">{{ getRatingDisplay(data?.selfRating ?? getRatingValue()) }} / 5.0</span>
              </div>
            </div>

            <div class="assign-field-group" style="margin-top:12px;" *ngIf="data?.selfComment">
              <label class="field-label">Comment</label>
              <div class="readonly-value" style="min-height:60px;">{{ data?.selfComment || '—' }}</div>
            </div>
          </div>
        </div>

        <!-- HR Review View -->
        <div class="assign-section" *ngIf="isHrReview()">
          <div class="assign-section-header">
            <mat-icon>fact_check</mat-icon>
            <span>HR Review Overview</span>
          </div>
          <div class="assign-section-body">
            <div class="assign-dates-grid">
              <div class="assign-field-group" *ngIf="data?.kraName">
                <label class="field-label">KRA</label>
                <div class="readonly-value"><mat-chip [class]="getKraChipClass(data?.kraName)">{{ data?.kraName }}</mat-chip></div>
              </div>
              <div class="assign-field-group" *ngIf="data?.goalName">
                <label class="field-label">Goal</label>
                <div class="readonly-value">{{ data?.goalName }}</div>
              </div>
              <div class="assign-field-group">
                <label class="field-label">Employee</label>
                <div class="readonly-value">{{ data?.employeeName || '—' }}</div>
              </div>
              <div class="assign-field-group">
                <label class="field-label">Submitted</label>
                <div class="readonly-value">{{ (data?.submittedAt || data?.createdAt) ? ((data.submittedAt || data.createdAt) | date:'medium') : '—' }}</div>
              </div>
            </div>

            <div class="assign-field-group" style="margin-top:12px;">
              <label class="field-label">Final Rating</label>
              <div class="readonly-value" style="display:flex; align-items:center; gap:12px;">
                <div class="star-row">
                  <mat-icon *ngFor="let s of [1,2,3,4,5]" [ngClass]="getStarClass(s, data?.finalRating)">star</mat-icon>
                </div>
                <span style="font-weight:600; color:#334155;">{{ getRatingDisplay(data?.finalRating ?? getRatingValue()) }} / 5.0</span>
              </div>
            </div>

            <div class="assign-field-group" style="margin-top:12px;" *ngIf="data?.hrComments || data?.feedback">
              <label class="field-label">HR Comments / Feedback</label>
              <div class="readonly-value" style="min-height:60px;">{{ data?.hrComments || data?.feedback || '—' }}</div>
            </div>
          </div>
        </div>

      </mat-dialog-content>

      <div class="dialog-footer">
        <button mat-stroked-button class="btn-cancel" mat-dialog-close (click)="close()">
          <mat-icon>close</mat-icon> Close
        </button>
      </div>
    </div>
  `,
  styles: [
    `
    @use '../../styles/performance-shared';
    
    .readonly-value {
      font-size: 14px;
      color: #1e293b;
      font-weight: 500;
      padding: 10px 14px;
      background: #f1f5f9;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .star-row {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .star-row mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .active-star { color: #f59e0b; }
    .inactive-star { color: #e5e7eb; }

    .status-completed { background-color: #10b981 !important; color: white !important; }
    .status-submitted { background-color: #3b82f6 !important; color: white !important; }
    .status-under-review { background-color: #f59e0b !important; color: white !important; }
    .status-draft { background-color: #64748b !important; color: white !important; }
    .status-rejected { background-color: #ef4444 !important; color: white !important; }
    `
  ]
})
export class AppraisalAllTablesViewDetailsComponent {
  constructor(
    private dialogRef: MatDialogRef<AppraisalAllTablesViewDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  getRatingValue(): number | undefined {
    const r = this.data?.rating ?? this.data?.selfRating ?? this.data?.finalRating ?? this.data?.overallRating;
    if (r === null || r === undefined) return undefined;
    return typeof r === 'number' ? r : (Number(r) || undefined);
  }

  getRatingDisplay(rating?: number | string | undefined): string {
    if (rating === null || rating === undefined) {
      const val = this.getRatingValue();
      return val === undefined ? 'N/A' : val.toFixed(1);
    }
    return typeof rating === 'number' ? rating.toFixed(1) : String(rating);
  }

  getStarClass(starNumber: number, rating?: number | undefined): string {
    const r = rating ?? this.getRatingValue();
    if (r === null || r === undefined) return '';
    return starNumber <= Math.round(r) ? 'active-star' : 'inactive-star';
  }

  isSelfAssessment(): boolean {
    return !!(this.data && (this.data.selfAssessmentId || this.data.selfRating !== undefined || this.data.selfComment !== undefined));
  }

  isHrReview(): boolean {
    return !!(this.data && (this.data.hrReviewId || this.data.finalRating !== undefined || this.data.hrComments !== undefined));
  }

  isManagerReview(): boolean {
    return !!(this.data && (this.data.managerReviewId || this.data.managerName !== undefined || this.data.rating !== undefined));
  }

  getStatusChipClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed': return 'status-completed';
      case 'submitted': return 'status-submitted';
      case 'under_review': return 'status-under-review';
      case 'draft': return 'status-draft';
      case 'rejected': return 'status-rejected';
      default: return 'status-draft';
    }
  }

  getKraChipClass(kraName: string): string {
    if (!kraName) return 'kra-productivity';
    const kraLower = kraName.toLowerCase();
    if (kraLower.includes('productivity') || kraLower.includes('efficiency')) return 'kra-productivity';
    if (kraLower.includes('revenue') || kraLower.includes('sales') || kraLower.includes('growth')) return 'kra-revenue';
    if (kraLower.includes('experience') || kraLower.includes('ux') || kraLower.includes('user')) return 'kra-experience';
    return 'kra-productivity';
  }

  roundedRating(): number {
    const val = this.getRatingValue() ?? 0;
    return Math.round(val || 0);
  }
}
