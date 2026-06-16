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

      <!-- ── Header ─────────────────────────────────────────────── -->
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-avatar">
            <mat-icon>flag</mat-icon>
          </div>
          <div class="header-info">
            <h2 class="header-name">{{ data.goal.title }}</h2>
          </div>
        </div>
      </div>

      <!-- ── Quick Info Strip ───────────────────────────────────── -->
      <div class="info-strip">
        <div class="strip-item">
          <mat-icon>trending_up</mat-icon>
          <span>Progress: {{ data.goal.progress || '—' }}</span>
        </div>
        <div class="strip-divider"></div>
        <div class="strip-item">
          <span class="status-pill"
            [class.pill-active]="data.goal.isActive"
            [class.pill-inactive]="!data.goal.isActive">
            <span class="pill-dot"></span>
            {{ data.goal.isActive ? 'Active' : 'Inactive' }}
          </span>
        </div>
      </div>

      <!-- ── Scrollable Content ──────────────────────────────────── -->
      <mat-dialog-content>

        <!-- Goal Information -->
        <div class="info-block">
          <div class="block-header">
            <div class="block-icon"><mat-icon>flag</mat-icon></div>
            <span>Goal Information</span>
          </div>
          <div class="block-grid">
            <div class="cell cell-wide">
              <span class="cell-label">Title</span>
              <span class="cell-value">{{ data.goal.title }}</span>
            </div>
            <div class="cell cell-wide">
              <span class="cell-label">Description</span>
              <span class="cell-value">{{ data.goal.description || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Performance Details -->
        <div class="info-block">
          <div class="block-header">
            <div class="block-icon"><mat-icon>assessment</mat-icon></div>
            <span>Performance Details</span>
          </div>
          <div class="block-grid">
            <div class="cell">
              <span class="cell-label">KRA</span>
              <span class="cell-value">{{ data.goal.kraName || '—' }}</span>
            </div>
            <div class="cell">
              <span class="cell-label">Progress</span>
              <span class="cell-value">{{ data.goal.progress || '—' }}</span>
            </div>
            <div class="cell">
              <span class="cell-label">Start Date</span>
              <span class="cell-value">{{ data.goal.startDate ? (data.goal.startDate | slice:0:10) : '—' }}</span>
            </div>
            <div class="cell">
              <span class="cell-label">End Date</span>
              <span class="cell-value">{{ data.goal.endDate ? (data.goal.endDate | slice:0:10) : '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Assignment & Status -->
        <div class="info-block">
          <div class="block-header">
            <div class="block-icon"><mat-icon>assignment</mat-icon></div>
            <span>Assignment & Status</span>
          </div>
          <div class="block-grid">
            <div class="cell">
              <span class="cell-label">Assigned To</span>
              <span class="cell-value">{{ data.goal.assignedtoName || '—' }}</span>
            </div>
            <div class="cell">
              <span class="cell-label">Status</span>
              <span class="cell-value">
                <span class="status-pill"
                  [class.pill-active]="data.goal.isActive"
                  [class.pill-inactive]="!data.goal.isActive">
                  <span class="pill-dot"></span>
                  {{ data.goal.isActive ? 'Active' : 'Inactive' }}
                </span>
              </span>
            </div>
          </div>
        </div>

        <!-- Additional Info -->
        <div class="info-block" *ngIf="data.goal.createdByName || data.goal.organizationId">
          <div class="block-header">
            <div class="block-icon"><mat-icon>info</mat-icon></div>
            <span>Additional Information</span>
          </div>
          <div class="block-grid">
            <div class="cell" *ngIf="data.goal.createdByName">
              <span class="cell-label">Created By</span>
              <span class="cell-value">{{ data.goal.createdByName }}</span>
            </div>
        
          </div>
        </div>

      </mat-dialog-content>

      <!-- ── Footer ─────────────────────────────────────────────── -->
      <div class="dialog-footer">
        <button mat-stroked-button mat-dialog-close class="btn-close">
          <mat-icon>close</mat-icon>
          Close
        </button>
      </div>

    </div>
  `,
  styles: [`
    .dialog-container {
      width: 100%;
      background: #f7f8fa;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      font-family: 'DM Sans', 'Segoe UI', sans-serif;
    }

    /* ─── Header ───────────────────────────────────────────────── */
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px 10px;
      background: #ffffff;
      border-bottom: 1px solid #ebebeb;
      gap: 12px;
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1;
    }

    .header-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #f0eeff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 2px solid #e0e2e8;
    }

    .header-avatar mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-info {
      min-width: 0;
    }

    .header-name {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.2px;
    }

    /* ─── Info Strip ────────────────────────────────────────────── */
    .info-strip {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      background: #ffffff;
      border-bottom: 1px solid #ebebeb;
      flex-shrink: 0;
      flex-wrap: wrap;
    }

    .strip-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #4b5563;
      font-weight: 500;
    }

    .strip-item mat-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
      color: #9ca3af;
    }

    .strip-divider {
      width: 1px;
      height: 10px;
      background: #e5e7eb;
      flex-shrink: 0;
    }

    /* ─── Status Pills ──────────────────────────────────────────── */
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 500;
      color: #374151;
    }

    .pill-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-pill.pill-active {
      color: #166534;
    }

    .status-pill.pill-active .pill-dot {
      background: #22c55e;
    }

    .status-pill.pill-inactive {
      color: #374151;
    }

    .status-pill.pill-inactive .pill-dot {
      background: #9ca3af;
    }

    /* ─── Scrollable Body ──────────────────────────────────────── */
    ::ng-deep mat-dialog-content {
      padding: 10px 12px !important;
      background: #f7f8fa;
      max-height: none !important;
      overflow-y: visible !important;
    }

    ::ng-deep mat-dialog-content::-webkit-scrollbar {
      display: none;
    }

    /* ─── Info Block ────────────────────────────────────────────── */
    .info-block {
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #ebebeb;
      margin-bottom: 8px;
    }

    .block-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 12px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.1px;
      background: #ffffff;
    }

    .block-icon {
      width: 4px;
      height: 14px;
      border-radius: 2px;
      background: #111827;
      flex-shrink: 0;
    }

    .block-icon mat-icon {
      position: absolute;
      opacity: 0;
      pointer-events: none;
      width: 0;
      height: 0;
      overflow: hidden;
    }

    .block-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
    }

    .cell {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 10px 14px;
      border-bottom: 1px solid #f5f5f5;
      position: relative;
    }

    .cell:nth-child(odd) {
      border-right: 1px solid #f5f5f5;
    }

    .cell:nth-last-child(-n+2) {
      border-bottom: none;
    }

    .cell:last-child {
      border-bottom: none;
    }

    .cell-wide {
      grid-column: 1 / -1;
      border-right: none;
    }

    .cell-wide:not(:last-child) {
      border-bottom: 1px solid #f5f5f5;
    }

    .cell-label {
      font-size: 9px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1;
    }

    .cell-value {
      font-size: 12px;
      font-weight: 500;
      color: #111827;
      line-height: 1.3;
      word-break: break-word;
    }

    .cell-value.code {
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 11px;
      color: #374151;
      letter-spacing: 0.3px;
    }

    /* Hide additional info block to keep dialog compact */
    .info-block:last-of-type {
      display: none;
    }

    /* ─── Footer ────────────────────────────────────────────────── */
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 10px 14px;
      border-top: 1px solid #ebebeb;
      background: #ffffff;
      flex-shrink: 0;
    }

    .btn-close {
      height: 32px;
      padding: 0 14px !important;
      border-radius: 6px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      color: #374151 !important;
      border-color: #d1d5db !important;
      transition: all 0.15s ease !important;
    }

    .btn-close mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      margin-right: 4px;
    }

    .btn-close:hover {
      background: #f3f4f6 !important;
      border-color: #9ca3af !important;
    }

    /* ─── Mobile ────────────────────────────────────────────────── */
    @media (max-width: 600px) {
      .dialog-header {
        padding: 10px 12px;
      }

      .header-left {
        gap: 8px;
      }

      .header-avatar {
        width: 32px;
        height: 32px;
      }

      .header-avatar mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .header-name {
        font-size: 12px;
      }

      .info-strip {
        padding: 8px 12px;
        gap: 10px;
      }

      .strip-divider {
        display: none;
      }

      .strip-item {
        font-size: 10px;
      }

      ::ng-deep mat-dialog-content {
        padding: 8px 8px !important;
      }

      .info-block {
        border-radius: 7px;
      }

      .block-header {
        padding: 8px 12px;
        font-size: 11px;
      }

      .block-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .cell {
        padding: 8px 12px;
      }

      .cell-label {
        font-size: 8px;
      }

      .cell-value {
        font-size: 11px;
      }

      .cell-value.code {
        font-size: 10px;
      }

      .dialog-footer {
        padding: 8px 12px;
      }

      .btn-close {
        width: 100%;
        justify-content: center;
        height: 32px !important;
      }
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
