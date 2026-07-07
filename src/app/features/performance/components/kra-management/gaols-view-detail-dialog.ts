import { Component, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Goal } from '../../../../core/models/performance.models';

export interface GoalDetailsDialogData {
  goal: Goal;
}

@Component({
  selector: 'app-goals-view-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>flag</mat-icon>
          </div>
          <div>
            <h2 class="header-title">{{ data.goal.title }}</h2>
            <p class="header-subtitle">Goal Details</p>
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
            <span>Goal Information</span>
          </div>
          <div class="assign-section-body">
            <div class="assign-dates-grid">
              <div class="assign-field-group">
                <label class="field-label">Title</label>
                <div class="readonly-value">{{ data.goal.title }}</div>
              </div>
              <div class="assign-field-group">
                <label class="field-label">KRA</label>
                <div class="readonly-value">{{ data.goal.kraName || '—' }}</div>
              </div>
            </div>
            <div class="assign-field-group">
              <label class="field-label">Description</label>
              <div class="readonly-value">{{ data.goal.description || '—' }}</div>
            </div>
          </div>
        </div>

        <div class="assign-section">
          <div class="assign-section-header">
            <mat-icon>assessment</mat-icon>
            <span>Performance Details</span>
          </div>
          <div class="assign-section-body">
            <div class="assign-dates-grid">
              <div class="assign-field-group">
                <label class="field-label">Progress</label>
                <div class="readonly-value">{{ data.goal.progress || '—' }}</div>
              </div>
              <div class="assign-field-group">
                <label class="field-label">Status</label>
                <div class="readonly-value" style="display:flex; align-items:center; gap:6px;">
                  <span class="status-indicator" [ngStyle]="{'background': data.goal.isActive ? '#22c55e' : '#9ca3af', 'width': '8px', 'height': '8px', 'border-radius': '50%', 'display': 'inline-block'}"></span>
                  {{ data.goal.isActive ? 'Active' : 'Inactive' }}
                </div>
              </div>
            </div>
            <div class="assign-dates-grid">
              <div class="assign-field-group">
                <label class="field-label">Start Date</label>
                <div class="readonly-value">{{ data.goal.startDate ? (data.goal.startDate | slice:0:10) : '—' }}</div>
              </div>
              <div class="assign-field-group">
                <label class="field-label">End Date</label>
                <div class="readonly-value">{{ data.goal.endDate ? (data.goal.endDate | slice:0:10) : '—' }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="assign-section">
          <div class="assign-section-header">
            <mat-icon>assignment</mat-icon>
            <span>Assignment Information</span>
          </div>
          <div class="assign-section-body">
            <div class="assign-dates-grid">
              <div class="assign-field-group">
                <label class="field-label">Assigned To</label>
                <div class="readonly-value">{{ data.goal.assignedtoName || '—' }}</div>
              </div>
              <div class="assign-field-group">
                <label class="field-label">Created By</label>
                <div class="readonly-value">{{ data.goal.createdByName || '—' }}</div>
              </div>
            </div>
          </div>
        </div>

      </mat-dialog-content>

      <div class="dialog-footer">
        <button mat-stroked-button class="btn-cancel" mat-dialog-close>Close</button>
      </div>
    </div>
  `,
  styles: [`
    @use '../../styles/performance-shared';

    .readonly-value {
      font-size: 14px;
      color: #1e293b;
      font-weight: 500;
      padding: 8px 12px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      min-height: 20px;
      word-break: break-word;
    }

    .field-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 4px;
      display: block;
    }
  `]
})
export class GoalsViewDetailDialogComponent implements OnInit {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: GoalDetailsDialogData,
    private dialogRef: MatDialogRef<GoalsViewDetailDialogComponent>
  ) {}

  ngOnInit(): void {
    // Component initialization if needed
  }
}
