import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { KRA } from '../../../../core/models/performance.models';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface KRADetailsDialogData {
  kra: KRA;
  hasEditPermission: boolean;
}


@Component({
  selector: 'app-kra-details-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule
  ],
  template: `
    <div class="dialog-container">

      <!-- ── Header ─────────────────────────────────────────────── -->
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-avatar">
            <mat-icon>trending_up</mat-icon>
          </div>
          <div class="header-info">
            <h2 class="header-name">{{ data.kra.title }}</h2>
          </div>
        </div>
      </div>

      <!-- ── Quick Info Strip ───────────────────────────────────── -->
      <div class="info-strip">
        <div class="strip-item">
          <mat-icon>calendar_today</mat-icon>
          <span>{{ data.kra.cycleName }}</span>
        </div>
        <div class="strip-divider"></div>
        <div class="strip-item">
          <span class="status-pill"
            [class.pill-active]="data.kra.isActive"
            [class.pill-inactive]="!data.kra.isActive">
            <span class="pill-dot"></span>
            {{ data.kra.isActive ? 'Active' : 'Inactive' }}
          </span>
        </div>
      </div>

      <!-- ── Scrollable Content ──────────────────────────────────── -->
      <mat-dialog-content>

        <!-- KRA Information -->
        <div class="info-block">
          <div class="block-header">
            <div class="block-icon"><mat-icon>trending_up</mat-icon></div>
            <span>KRA Information</span>
          </div>
          <div class="block-grid">
            <div class="cell cell-wide">
              <span class="cell-label">Title</span>
              <span class="cell-value">{{ data.kra.title }}</span>
            </div>
            <div class="cell cell-wide">
              <span class="cell-label">Description</span>
              <span class="cell-value">{{ data.kra.kraDescription || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Metrics -->
        <div class="info-block">
          <div class="block-header">
            <div class="block-icon"><mat-icon>show_chart</mat-icon></div>
            <span>Metrics</span>
          </div>
          <div class="block-grid">
            <div class="cell">
              <span class="cell-label">Cycle Name</span>
              <span class="cell-value">{{ data.kra.cycleName }}</span>
            </div>
            <div class="cell">
              <span class="cell-label">KRA Rate</span>
              <span class="cell-value">{{ data.kra.kraRate }}</span>
            </div>
          </div>
        </div>

        <!-- Status & Metadata -->
        <div class="info-block">
          <div class="block-header">
            <div class="block-icon"><mat-icon>info</mat-icon></div>
            <span>Status & Metadata</span>
          </div>
          <div class="block-grid">
            <div class="cell">
              <span class="cell-label">Status</span>
              <span class="cell-value">
                <span class="status-pill"
                  [class.pill-active]="data.kra.isActive"
                  [class.pill-inactive]="!data.kra.isActive">
                  <span class="pill-dot"></span>
                  {{ data.kra.isActive ? 'Active' : 'Inactive' }}
                </span>
              </span>
            </div>
            <div class="cell">
              <span class="cell-label">Created By</span>
              <span class="cell-value">{{ data.kra.createdByName || '—' }}</span>
            </div>
            <div class="cell cell-wide" *ngIf="data.kra.createdAt">
              <span class="cell-label">Created At</span>
              <span class="cell-value">{{ data.kra.createdAt | localizedDate:'medium' }}</span>
            </div>
          </div>
        </div>

      </mat-dialog-content>

    </div>
  `,
  styles: [`
    ::ng-deep .mat-mdc-dialog-container {
      padding: 0 !important;
      border-radius: 12px !important;
      overflow: hidden !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08) !important;
      max-width: 600px !important;
      width: 90vw !important;
    }

    .dialog-container {
      width: 100%;
      background: #f7f8fa;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      font-family: 'DM Sans', 'Segoe UI', sans-serif;

      // ─── Header ─────────────────────────────────────────────────
      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 24px 28px 20px;
        background: #ffffff;
        border-bottom: 1px solid #ebebeb;
        gap: 16px;
        flex-shrink: 0;

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
          flex: 1;

          .header-avatar {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: #f0eeff;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border: 2px solid #e0e2e8;

            mat-icon {
              font-size: 24px;
              width: 24px;
              height: 24px;
              background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
          }

          .header-info {
            min-width: 0;

            .header-name {
              margin: 0 0 5px;
              font-size: 18px;
              font-weight: 700;
              color: #111827;
              line-height: 1.2;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              letter-spacing: -0.2px;
            }

            .header-meta {
              display: flex;
              align-items: center;
              gap: 8px;

              .dept-id {
                font-size: 12px;
                font-weight: 500;
                color: #6b7280;
                letter-spacing: 0.2px;
              }
            }
          }
        }
      }

      // ─── Info Strip ─────────────────────────────────────────────
      .info-strip {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 11px 28px;
        background: #ffffff;
        border-bottom: 1px solid #ebebeb;
        flex-shrink: 0;
        flex-wrap: wrap;

        .strip-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          color: #4b5563;
          font-weight: 500;

          mat-icon {
            font-size: 15px;
            width: 15px;
            height: 15px;
            color: #9ca3af;
          }
        }

        .strip-divider {
          width: 1px;
          height: 13px;
          background: #e5e7eb;
          flex-shrink: 0;
        }
      }

      // ─── Status Pills ────────────────────────────────────────────
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        font-weight: 500;
        color: #374151;

        .pill-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        &.pill-active {
          color: #166534;
          .pill-dot { background: #22c55e; }
        }

        &.pill-inactive {
          color: #374151;
          .pill-dot { background: #9ca3af; }
        }
      }

      // ─── Scrollable Body ─────────────────────────────────────────
      mat-dialog-content {
        padding: 16px 16px !important;
        max-height: 58vh;
        overflow-y: auto;
        background: #f7f8fa;

        &::-webkit-scrollbar { width: 4px; }
        &::-webkit-scrollbar-track { background: transparent; }
        &::-webkit-scrollbar-thumb {
          background: #e0e2e8;
          border-radius: 4px;
        }
      }

      // ─── Info Block ──────────────────────────────────────────────
      .info-block {
        background: #ffffff;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid #ebebeb;
        margin-bottom: 10px;

        .block-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 13px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.1px;
          background: #ffffff;

          .block-icon {
            width: 4px;
            height: 16px;
            border-radius: 2px;
            background: #111827;
            flex-shrink: 0;

            mat-icon {
              position: absolute;
              opacity: 0;
              pointer-events: none;
              width: 0;
              height: 0;
              overflow: hidden;
            }
          }
        }

        .block-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);

          .cell {
            display: flex;
            flex-direction: column;
            gap: 5px;
            padding: 14px 20px;
            border-bottom: 1px solid #f5f5f5;
            position: relative;

            &:nth-child(odd) {
              border-right: 1px solid #f5f5f5;
            }

            &:nth-last-child(-n+2) {
              border-bottom: none;
            }

            &:last-child {
              border-bottom: none;
            }

            &.cell-wide {
              grid-column: 1 / -1;
              border-right: none;

              &:not(:last-child) {
                border-bottom: 1px solid #f5f5f5;
              }
            }

            .cell-label {
              font-size: 10.5px;
              font-weight: 600;
              color: #9ca3af;
              text-transform: uppercase;
              letter-spacing: 0.7px;
              line-height: 1;
            }

            .cell-value {
              font-size: 13.5px;
              font-weight: 500;
              color: #111827;
              line-height: 1.4;
              word-break: break-word;

              &.code {
                font-family: 'Fira Code', 'Courier New', monospace;
                font-size: 12.5px;
                color: #374151;
                letter-spacing: 0.3px;
              }
            }
          }
        }
      }

      // ─── Footer ─────────────────────────────────────────────────
      // Removed: Footer section with buttons
    }

    // ─── Mobile ──────────────────────────────────────────────────
    @media (max-width: 600px) {
      .dialog-container {

        .dialog-header {
          padding: 18px 18px 14px;

          .header-left {
            gap: 12px;

            .header-avatar {
              width: 44px;
              height: 44px;

              mat-icon { font-size: 20px; width: 20px; height: 20px; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
            }

            .header-info {
              .header-name { font-size: 16px; }
            }
          }
        }

        .info-strip {
          padding: 10px 18px;
          gap: 12px;

          .strip-divider { display: none; }
          .strip-item { font-size: 11.5px; }
        }

        mat-dialog-content {
          padding: 12px 12px !important;
          max-height: 60vh;
        }

        .info-block {
          border-radius: 9px;

          .block-header {
            padding: 12px 16px;
            font-size: 12.5px;
          }

          .block-grid {
            grid-template-columns: repeat(2, 1fr);

            .cell {
              padding: 11px 16px;

              .cell-label { font-size: 10px; }
              .cell-value {
                font-size: 12.5px;
                &.code { font-size: 12px; }
              }
            }
          }
        }

        .dialog-footer {
          padding: 12px 16px;
          flex-direction: column;
          gap: 10px;

          .btn-close,
          .btn-edit {
            width: 100%;
            height: 40px !important;
          }
        }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KRADetailsDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<KRADetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: KRADetailsDialogData
  ) {}
}








