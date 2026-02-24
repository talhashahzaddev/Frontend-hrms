import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDeleteData {
  title: string;
  message: string;
  itemName: string;
  confirmButtonText?: string;
}

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="cdd">
      <h2 class="cdd-title">{{ data.title }}</h2>
      <mat-dialog-content class="cdd-body">
        <p class="cdd-message">
          {{ data.message }}
          <strong *ngIf="data.itemName"> {{ data.itemName }}</strong>?
        </p>
      </mat-dialog-content>
      <div class="cdd-footer">
        <button mat-stroked-button mat-dialog-close class="cdd-cancel">Cancel</button>
        <button mat-flat-button (click)="onConfirm()" class="cdd-confirm">
          {{ data.confirmButtonText || 'Delete' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* Fix: Material gives the dialog container a large default min-width.
       Override it so the dialog wraps tightly around .cdd */
    :host ::ng-deep .mdc-dialog__surface {
      min-width: unset !important;
      width: auto !important;
    }

    .cdd {
      width: 400px;
      max-width: 90vw;
      background: white;
      border-radius: 12px;
      padding: 26px 26px 20px;
      font-family: 'Inter', 'DM Sans', sans-serif;
      box-sizing: border-box;
    }

    .cdd-title {
      margin: 0 0 12px;
      font-size: 17px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.2px;
    }

    .cdd-body {
      padding: 0 !important;
      max-height: unset !important;
      overflow: visible !important;
    }

    .cdd-message {
      margin: 0;
      font-size: 14px;
      color: #4b5563;
      line-height: 1.65;
      font-weight: 400;
    }

    .cdd-message strong {
      color: #111827;
      font-weight: 600;
    }

    .cdd-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 24px;
    }

    .cdd-cancel {
      height: 38px !important;
      padding: 0 20px !important;
      border-radius: 8px !important;
      font-size: 13.5px !important;
      font-weight: 500 !important;
      color: #374151 !important;
      border-color: #d1d5db !important;
      transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    .cdd-cancel:hover {
      background: #f9fafb !important;
      border-color: #9ca3af !important;
    }

    .cdd-confirm {
      height: 38px !important;
      padding: 0 22px !important;
      border-radius: 8px !important;
      font-size: 13.5px !important;
      font-weight: 600 !important;
      background: #dc2626 !important;
      color: white !important;
      box-shadow: 0 2px 6px rgba(220, 38, 38, 0.28) !important;
      transition: all 0.15s ease !important;
    }

    .cdd-confirm:hover {
      background: #b91c1c !important;
      box-shadow: 0 4px 10px rgba(220, 38, 38, 0.38) !important;
    }

    @media (max-width: 480px) {
      .cdd { padding: 20px 18px 16px; width: 100%; }
      .cdd-title { font-size: 15.5px; }
      .cdd-message { font-size: 13.5px; }
      .cdd-cancel, .cdd-confirm { flex: 1; }
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