import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ArchivePlanConfirmationData {
  planName: string;
}

@Component({
  selector: 'app-archive-plan-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="archive-dialog">
      <div class="archive-dialog__icon"><mat-icon>archive</mat-icon></div>
      <h2 mat-dialog-title>Archive plan?</h2>
      <mat-dialog-content>
        <p>Are you sure you want to archive <strong>{{ data.planName }}</strong>?</p>
        <p>Existing tenant subscriptions will keep their plan access. This plan won't be available for new subscriptions.</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-flat-button color="warn" (click)="confirm()">Archive plan</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .archive-dialog { color: #172033; padding: 8px 4px 2px; }
    .archive-dialog__icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #fff4e5;
      color: #b54708;
      margin: 4px 0 12px;
    }
    h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
    mat-dialog-content { padding: 0; color: #475467; line-height: 1.55; }
    mat-dialog-content p { margin: 0 0 12px; }
    mat-dialog-content strong { color: #172033; }
    mat-dialog-actions { gap: 8px; padding: 12px 0 0; }
  `]
})
export class ArchivePlanConfirmationDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ArchivePlanConfirmationData,
    private dialogRef: MatDialogRef<ArchivePlanConfirmationDialogComponent, boolean>
  ) {}

  confirm(): void {
    this.dialogRef.close(true);
  }
}
