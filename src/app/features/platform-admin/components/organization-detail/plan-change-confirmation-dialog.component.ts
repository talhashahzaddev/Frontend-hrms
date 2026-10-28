import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface PlanChangeConfirmationData {
  organizationName: string;
  planName: string;
  currentMaxUsers: number | null;
  newMaxUsers: number | null;
}

@Component({
  selector: 'app-plan-change-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="plan-change-dialog">
      <div class="plan-change-dialog__icon"><mat-icon>warning_amber</mat-icon></div>
      <h2 mat-dialog-title>Confirm plan change</h2>
      <mat-dialog-content>
        <p>Changing <strong>{{ data.organizationName }}</strong> to <strong>{{ data.planName }}</strong> may reduce feature access or user capacity.</p>
        <p>User limit: <strong>{{ data.currentMaxUsers ?? 'Unlimited' }}</strong> to <strong>{{ data.newMaxUsers ?? 'Unlimited' }}</strong>.</p>
        <p>Continue with this change?</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Keep current plan</button>
        <button mat-flat-button color="primary" (click)="confirm()">Continue</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .plan-change-dialog { color: #172033; padding: 8px 4px 2px; }
    .plan-change-dialog__icon {
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
export class PlanChangeConfirmationDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PlanChangeConfirmationData,
    private dialogRef: MatDialogRef<PlanChangeConfirmationDialogComponent, boolean>
  ) {}

  confirm(): void {
    this.dialogRef.close(true);
  }
}
