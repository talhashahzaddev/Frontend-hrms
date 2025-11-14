import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { KRA } from '../../../../core/models/performance.models';
import { CreateKRADialogComponent } from './create-kra-dialog.component';
import { Position } from '../../../../core/models/employee.models';

export interface KRADetailsDialogData {
  kra: KRA;
  positionName: string;
  positions: Position[];
  hasEditPermission: boolean;
}

@Component({
  selector: 'app-kra-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>info</mat-icon>
        KRA Details
      </h2>
      <button mat-icon-button mat-dialog-close class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <div class="kra-details">
        
        <div class="detail-section">
          <div class="detail-item">
            <div class="detail-label">
              <mat-icon>title</mat-icon>
              <span>Title</span>
            </div>
            <div class="detail-value">{{ data.kra.title }}</div>
          </div>

          <div class="detail-item">
            <div class="detail-label">
              <mat-icon>work</mat-icon>
              <span>Position</span>
            </div>
            <div class="detail-value">{{ data.positionName }}</div>
          </div>

          <div class="detail-item" *ngIf="data.kra.description">
            <div class="detail-label">
              <mat-icon>description</mat-icon>
              <span>Description</span>
            </div>
            <div class="detail-value">{{ data.kra.description }}</div>
          </div>

          <div class="detail-item">
            <div class="detail-label">
              <mat-icon>percent</mat-icon>
              <span>Weight</span>
            </div>
            <div class="detail-value">
              <span class="weight-badge">{{ data.kra.weight }}%</span>
            </div>
          </div>

          <div class="detail-item" *ngIf="data.kra.measurementCriteria">
            <div class="detail-label">
              <mat-icon>assessment</mat-icon>
              <span>Measurement Criteria</span>
            </div>
            <div class="detail-value">{{ data.kra.measurementCriteria }}</div>
          </div>

          <div class="detail-item">
            <div class="detail-label">
              <mat-icon>check_circle</mat-icon>
              <span>Status</span>
            </div>
            <div class="detail-value">
              <mat-chip [class]="getStatusClass(data.kra.isActive)" [disabled]="false">
                <mat-icon>{{ data.kra.isActive ? 'check_circle' : 'cancel' }}</mat-icon>
                {{ data.kra.isActive ? 'Active' : 'Inactive' }}
              </mat-chip>
            </div>
          </div>

          <div class="detail-item" *ngIf="data.kra.createdAt">
            <div class="detail-label">
              <mat-icon>calendar_today</mat-icon>
              <span>Created At</span>
            </div>
            <div class="detail-value">{{ data.kra.createdAt | date:'medium' }}</div>
          </div>
        </div>

      </div>
    </mat-dialog-content>

    <div class="dialog-actions">
      <button mat-stroked-button mat-dialog-close>
        Close
      </button>
      <button 
        *ngIf="data.hasEditPermission"
        mat-raised-button 
        color="primary" 
        class="edit-button"
        (click)="openEditDialog()">
        <mat-icon>edit</mat-icon>
        Edit KRA
      </button>
    </div>
  `,
  styles: [`
    ::ng-deep .mat-mdc-dialog-container {
      border-radius: 16px !important;
      padding: 0 !important;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
      max-width: 700px !important;
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

    .kra-details {
      .detail-section {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .detail-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-bottom: 20px;
        border-bottom: 1px solid #e5e7eb;

        &:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
      }

      .detail-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.875rem;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: #667eea;
        }
      }

      .detail-value {
        font-size: 1rem;
        color: #1f2937;
        font-weight: 500;
        line-height: 1.6;

        .weight-badge {
          display: inline-block;
          padding: 6px 12px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          color: #667eea;
          border-radius: 8px;
          font-weight: 600;
        }
      }

      mat-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.875rem;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }

        &.status-active {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%);
          color: #059669;
        }

        &.status-inactive {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%);
          color: #dc2626;
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

          &:hover {
            background: #f9fafb !important;
            border-color: #cbd5e1 !important;
            color: #374151 !important;
          }
        }

        &.edit-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          border: none !important;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3) !important;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
          }

          mat-icon {
            font-size: 20px !important;
            width: 20px !important;
            height: 20px !important;
            margin: 0;
          }
        }
      }
    }

    @media (max-width: 768px) {
      .dialog-content {
        padding: 20px !important;
      }
      .dialog-actions {
        flex-direction: column;
        gap: 12px;
        button {
          width: 100%;
        }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KRADetailsDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<KRADetailsDialogComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: KRADetailsDialogData
  ) {}

  getStatusClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
  }

  openEditDialog(): void {
    this.dialogRef.close({ edit: true });
    
    const editDialogRef = this.dialog.open(CreateKRADialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: {
        positions: this.data.positions,
        kra: this.data.kra,
        isEditMode: true
      },
      disableClose: false
    });

    editDialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dialogRef.close({ refresh: true });
      }
    });
  }
}

