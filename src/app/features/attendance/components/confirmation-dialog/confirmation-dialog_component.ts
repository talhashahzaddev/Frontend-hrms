import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface ConfirmationDialogData {
  title: string;
  message: string;

  confirmLabel?: string;

  confirmColor?: 'primary' | 'warn';

  icon?: string;
}


@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-container confirmation-dialog">
      <div class="dialog-header">
        <div class="title-section">
          <div class="icon-wrapper" [class.warn]="data.confirmColor === 'warn'">
            <mat-icon>{{ data.icon || 'help_outline' }}</mat-icon>
          </div>
          <div>
            <h2 class="title">{{ data.title }}</h2>
          </div>
        </div>
      </div>

      <div class="dialog-body">
        <p class="message">{{ data.message }}</p>
      </div>

      <div class="dialog-footer">
        <button class="btn-cancel cancel-btn" mat-stroked-button (click)="cancel()">Cancel</button>
        <button class="btn-save submit-btn" [class.warn]="data.confirmColor === 'warn'" (click)="confirm()">
          {{ data.confirmLabel || 'Confirm' }}
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {}

  confirm(): void { this.dialogRef.close(true); }
  cancel(): void  { this.dialogRef.close(false); }
}
