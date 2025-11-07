import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDeleteData {
  title: string;
  message: string;
  itemName: string;
}

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="confirm-delete-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title>
          <mat-icon class="warning-icon">warning</mat-icon>
          {{ data.title }}
        </h2>
        <button mat-icon-button mat-dialog-close class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content>
        <div class="dialog-content">
          <div class="warning-message">
            <p>{{ data.message }}</p>
            <p class="item-name" *ngIf="data.itemName">
              <strong>{{ data.itemName }}</strong>
            </p>
          </div>
          <div class="warning-note">
            <mat-icon>info</mat-icon>
            <span>This action cannot be undone.</span>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button mat-dialog-close class="cancel-button">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        <button mat-raised-button color="warn" (click)="onConfirm()" class="confirm-button">
          <mat-icon>check</mat-icon>
          Yes, Delete
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-delete-dialog {
      width: 450px;
      max-width: 90vw;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;

      h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: white;

        .warning-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          color: #ffeb3b;
        }
      }

      .close-button {
        color: white;

        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        mat-icon {
          color: white;
        }
      }
    }

    mat-dialog-content {
      padding: 24px;
      max-height: 300px;
      overflow-y: auto;

      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 20px;

        .warning-message {
          p {
            margin: 0 0 12px 0;
            font-size: 16px;
            line-height: 1.6;
            color: #333;

            &:first-child {
              margin-bottom: 8px;
            }
          }

          .item-name {
            margin: 0;
            padding: 12px;
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            border-radius: 4px;
            font-size: 15px;

            strong {
              color: #856404;
              font-weight: 600;
            }
          }
        }

        .warning-note {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          border-radius: 4px;
          font-size: 14px;
          color: #1565c0;

          mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
            color: #2196f3;
          }
        }
      }
    }

    mat-dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      gap: 12px;
      background: #f9fafb;

      button {
        min-width: 120px;
        height: 44px;
        font-weight: 600;
        font-size: 14px;

        mat-icon {
          margin-right: 8px;
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .cancel-button {
        color: #666;
        border-color: #e0e0e0;

        &:hover {
          background: #f5f5f5;
        }
      }

      .confirm-button {
        background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
        color: white;
        box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);

        &:hover {
          background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
          box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
        }
      }
    }
  `]
})
export class ConfirmDeleteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDeleteData
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}




