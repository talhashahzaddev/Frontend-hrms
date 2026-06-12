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
          <div class="header-avatar">
            <mat-icon>assignment</mat-icon>
          </div>
          <div class="header-info">
            <h2 class="header-name">{{ data?.employeeName || data?.managerName || 'Details' }}</h2>
            <div class="header-meta">
              <span class="dept-id" *ngIf="data?.goalName">{{ data?.goalName }}</span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button mat-icon-button aria-label="close" (click)="close()"><mat-icon>close</mat-icon></button>
        </div>
      </div>

      <div class="info-strip">
        <div class="strip-item">
          <mat-icon>calendar_today</mat-icon>
          <span>{{ data?.cycleName || '—' }}</span>
        </div>
        <div class="strip-divider"></div>
        <div class="strip-item">
          <span class="status-pill" [class.pill-active]="(data?.status || '').toLowerCase() === 'completed'" [class.pill-inactive]="(data?.status || '').toLowerCase() !== 'completed'">
            <span class="pill-dot"></span>
            {{ data?.status ? (data.status | titlecase) : '—' }}
          </span>
        </div>
      </div>

      <mat-dialog-content>
        <!-- Manager Review View -->
        <div *ngIf="isManagerReview()" class="info-block">
          <div class="block-header"><div class="block-icon"></div><span>Manager Review - Overview</span></div>
          <div class="block-grid">
            <div class="cell" *ngIf="data?.kraName">
              <span class="cell-label">KRA</span>
              <span class="cell-value"><mat-chip [class]="getKraChipClass(data?.kraName)">{{ data?.kraName }}</mat-chip></span>
            </div>
            <div class="cell" *ngIf="data?.goalName">
              <span class="cell-label">Goal</span>
              <span class="cell-value">{{ data?.goalName }}</span>
            </div>
            <div class="cell">
              <span class="cell-label">Manager</span>
              <span class="cell-value">{{ data?.managerName || '—' }}</span>
            </div>
            <div class="cell">
              <span class="cell-label">Submitted</span>
              <span class="cell-value">{{ (data?.submittedAt || data?.createdAt) ? ((data.submittedAt || data.createdAt) | date:'medium') : '—' }}</span>
            </div>
            <div class="cell cell-wide">
              <span class="cell-label">Rating</span>
              <span class="cell-value">
                <span class="star-row compact">
                  <mat-icon *ngFor="let s of [1,2,3,4,5]" [ngClass]="getStarClass(s, data?.rating)">star</mat-icon>
                  <span class="numeric-rating">{{ getRatingDisplay(data?.rating ?? getRatingValue()) }}</span>
                </span>
              </span>
            </div>
          </div>

          <div *ngIf="data?.feedback || data?.comments" class="block-grid">
            <div class="cell cell-wide">
              <span class="cell-label">Feedback</span>
              <span class="cell-value mono">{{ data?.feedback || data?.comments || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Self Assessment View -->
        <div *ngIf="isSelfAssessment()" class="info-block">
          <div class="block-header"><div class="block-icon"></div><span>Self Assessment - Overview</span></div>
          <div class="block-grid">
            <div class="cell" *ngIf="data?.kraName">
              <span class="cell-label">KRA</span>
              <span class="cell-value"><mat-chip [class]="getKraChipClass(data?.kraName)">{{ data?.kraName }}</mat-chip></span>
            </div>
            <div class="cell" *ngIf="data?.goalName">
              <span class="cell-label">Goal</span>
              <span class="cell-value">{{ data?.goalName }}</span>
            </div>
            <div class="cell">
              <span class="cell-label">Employee</span>
              <span class="cell-value">{{ data?.employeeName || '—' }}</span>
            </div>
            <div class="cell">
              <span class="cell-label">Submitted</span>
              <span class="cell-value">{{ (data?.submittedAt || data?.createdAt) ? ((data.submittedAt || data.createdAt) | date:'medium') : '—' }}</span>
            </div>
            <div class="cell cell-wide">
              <span class="cell-label">Self Rating</span>
              <span class="cell-value">
                <span class="star-row compact">
                  <mat-icon *ngFor="let s of [1,2,3,4,5]" [ngClass]="getStarClass(s, data?.selfRating)">star</mat-icon>
                  <span class="numeric-rating">{{ getRatingDisplay(data?.selfRating ?? getRatingValue()) }}</span>
                </span>
              </span>
            </div>
          </div>

          <div *ngIf="data?.selfComment" class="block-grid">
            <div class="cell cell-wide">
              <span class="cell-label">Comment</span>
              <span class="cell-value mono">{{ data?.selfComment || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- HR Review View -->
        <div *ngIf="isHrReview()" class="info-block">
          <div class="block-header"><div class="block-icon"></div><span>HR Review - Overview</span></div>
          <div class="block-grid">
            <div class="cell" *ngIf="data?.kraName">
              <span class="cell-label">KRA</span>
              <span class="cell-value"><mat-chip [class]="getKraChipClass(data?.kraName)">{{ data?.kraName }}</mat-chip></span>
            </div>
            <div class="cell" *ngIf="data?.goalName">
              <span class="cell-label">Goal</span>
              <span class="cell-value">{{ data?.goalName }}</span>
            </div>
            <div class="cell">
              <span class="cell-label">Employee</span>
              <span class="cell-value">{{ data?.employeeName || '—' }}</span>
            </div>
            <div class="cell">
              <span class="cell-label">Submitted</span>
              <span class="cell-value">{{ (data?.submittedAt || data?.createdAt) ? ((data.submittedAt || data.createdAt) | date:'medium') : '—' }}</span>
            </div>
            <div class="cell cell-wide">
              <span class="cell-label">Final Rating</span>
              <span class="cell-value">
                <span class="star-row compact">
                  <mat-icon *ngFor="let s of [1,2,3,4,5]" [ngClass]="getStarClass(s, data?.finalRating)">star</mat-icon>
                  <span class="numeric-rating">{{ getRatingDisplay(data?.finalRating ?? getRatingValue()) }}</span>
                </span>
              </span>
            </div>
          </div>

          <div *ngIf="data?.hrComments || data?.feedback" class="block-grid">
            <div class="cell cell-wide">
              <span class="cell-label">HR Comments</span>
              <span class="cell-value mono">{{ data?.hrComments || data?.feedback || '—' }}</span>
            </div>
          </div>
        </div>
      </mat-dialog-content>

      <div class="dialog-footer">
        <button mat-stroked-button mat-dialog-close class="btn-close" (click)="close()"><mat-icon>close</mat-icon>Close</button>
      </div>

    </div>
  `,
  styles: [
    `
    .dialog-container { width:520px; max-width: calc(100vw - 48px); max-height:80vh; background: #f7f8fa; border-radius: 10px; overflow: hidden; display:flex; flex-direction:column; font-family: 'DM Sans', 'Segoe UI', sans-serif; box-shadow: 0 6px 18px rgba(16,24,40,0.08); }
    .dialog-header { display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:#fff; border-bottom:1px solid #ebebeb }
    .header-left { display:flex; align-items:center; gap:12px }
    .header-avatar { width:44px; height:44px; border-radius:50%; background:#f0eeff; display:flex; align-items:center; justify-content:center; border:1px solid #e6e6e9 }
    .header-avatar mat-icon { font-size:20px; background:linear-gradient(135deg,#8b5cf6 0%,#6366f1 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent }
    .header-name { margin:0; font-size:15px; font-weight:700; color:#111827 }
    .header-meta .dept-id { font-size:12px; color:#6b7280 }
    .info-strip { display:flex; align-items:center; gap:12px; padding:8px 14px; background:#fff; border-bottom:1px solid #ebebeb }
    .strip-item { display:flex; align-items:center; gap:8px; font-size:13px; color:#374151 }
    .strip-divider { width:1px; height:14px; background:#e5e7eb }
    .status-pill { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600 }
    .pill-dot { width:8px; height:8px; border-radius:50% }
    .pill-active .pill-dot { background:#22c55e }
    .pill-inactive .pill-dot { background:#9ca3af }
    mat-dialog-content { padding:10px 10px; max-height:60vh; overflow-y:auto }
    .info-block { background:#fff; border-radius:8px; border:1px solid #ebebeb; margin-bottom:8px }
    .block-header { display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid #f5f5f5; font-weight:700 }
    .block-grid { display:grid; grid-template-columns: repeat(2,1fr); gap:0 }
    .cell { padding:8px 10px; border-bottom:1px solid #f5f5f5; font-size:13px }
    .cell:nth-child(odd) { border-right:1px solid #f5f5f5 }
    .cell-wide { grid-column:1 / -1 }
    .cell-label { display:block; font-size:11px; color:#9ca3af; font-weight:700; text-transform:uppercase }
    .cell-value { font-size:13px; color:#111827; margin-top:6px }
    .mono { font-family: 'Fira Code', monospace; background:#fafafa; padding:8px; border-radius:6px }
    .star-row.compact mat-icon { font-size:18px; vertical-align:middle; margin-right:4px }
    .star-row.compact .active-star { color:#f59e0b }
    .star-row.compact .inactive-star { color:#e5e7eb }
    .numeric-rating { margin-left:8px; color:#374151; font-weight:600 }
    .dialog-footer { display:flex; justify-content:flex-end; padding:10px 12px; background:#fff; border-top:1px solid #ebebeb }
    .btn-close { height:34px; padding:0 12px; border-radius:8px }

    @media (max-width:600px) {
      .dialog-container { width: calc(100vw - 24px); max-width: calc(100vw - 24px); }
      .block-grid { grid-template-columns: repeat(1,1fr) }
      .header-avatar { width:36px; height:36px }
      .header-name { font-size:13px }
    }
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
