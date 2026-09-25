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
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>trending_up</mat-icon>
          </div>
          <div>
            <h2 class="header-title">{{ data.kra.title }}</h2>
            <p class="header-subtitle">KRA Details</p>
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
            <span>KRA Information</span>
          </div>
          <div class="assign-section-body">
            <div class="assign-info-grid">
              <div class="assign-info-item">
                <span class="assign-info-label">Title</span>
                <span class="assign-info-value">{{ data.kra.title }}</span>
              </div>
              <div class="assign-info-item">
                <span class="assign-info-label">Description</span>
                <span class="assign-info-value">{{ data.kra.kraDescription || '—' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="assign-section">
          <div class="assign-section-header">
            <mat-icon>show_chart</mat-icon>
            <span>Metrics & Cycle</span>
          </div>
          <div class="assign-section-body">
            <div class="assign-info-grid" style="grid-template-columns: 1fr 1fr;">
              <div class="assign-info-item">
                <span class="assign-info-label">Appraisal Cycle</span>
                <span class="assign-info-value">{{ data.kra.cycleName }}</span>
              </div>
              <div class="assign-info-item">
                <span class="assign-info-label">KRA Rate</span>
                <span class="assign-info-value">{{ data.kra.kraRate }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="assign-section">
          <div class="assign-section-header">
            <mat-icon>inventory_2</mat-icon>
            <span>Status & Metadata</span>
          </div>
          <div class="assign-section-body">
            <div class="assign-info-grid" style="grid-template-columns: 1fr 1fr;">
              <div class="assign-info-item">
                <span class="assign-info-label">Status</span>
                <span class="assign-info-value">
                  <span class="status-pill" [class.active]="data.kra.isActive" [class.inactive]="!data.kra.isActive">
                    {{ data.kra.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </span>
              </div>
              <div class="assign-info-item">
                <span class="assign-info-label">Created By</span>
                <span class="assign-info-value">{{ data.kra.createdByName || '—' }}</span>
              </div>
              <div class="assign-info-item" *ngIf="data.kra.createdAt" style="grid-column: 1 / -1;">
                <span class="assign-info-label">Created At</span>
                <span class="assign-info-value">{{ data.kra.createdAt | localizedDate:'medium' }}</span>
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

    .status-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      &.active {
        background: #dcfce7;
        color: #166534;
      }
      &.inactive {
        background: #f1f5f9;
        color: #475569;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KRADetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<KRADetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: KRADetailsDialogData
  ) {}
}
