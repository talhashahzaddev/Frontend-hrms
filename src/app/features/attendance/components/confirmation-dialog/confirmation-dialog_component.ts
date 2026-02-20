import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  /** Label for the confirm button. Defaults to 'Confirm'. */
  confirmLabel?: string;
  /** Material color for the confirm button: 'primary' | 'warn'. Defaults to 'primary'. */
  confirmColor?: 'primary' | 'warn';
  /** Optional icon shown next to the title. */
  icon?: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirmation-dialog">
      <h2 mat-dialog-title>
        @if (data.icon) {
          <mat-icon class="dialog-icon" [class.warn]="data.confirmColor === 'warn'">
            {{ data.icon }}
          </mat-icon>
        }
        {{ data.title }}
      </h2>

      <mat-dialog-content>
        <p class="message">{{ data.message }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="cancel()">Cancel</button>
        <button
          mat-raised-button
          [color]="data.confirmColor || 'primary'"
          (click)="confirm()">
          {{ data.confirmLabel || 'Confirm' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirmation-dialog {
      min-width: 380px;
      max-width: 480px;

      h2 {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 18px;
        margin: 0;

        .dialog-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
          color: #667eea;

          &.warn { color: #d32f2f; }
        }
      }

      mat-dialog-content {
        padding: 16px 24px;

        .message {
          margin: 0;
          font-size: 14px;
          color: #555;
          line-height: 1.6;
        }
      }

      mat-dialog-actions {
        gap: 8px;
        padding: 12px 24px 16px;
        margin: 0;
        border-top: 1px solid #e0e0e0;
      }
    }

    @media (max-width: 480px) {
      .confirmation-dialog { min-width: auto; width: 100%; }
    }
  `]
})
export class ConfirmationDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {}

  confirm(): void { this.dialogRef.close(true); }
  cancel(): void  { this.dialogRef.close(false); }
}