import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface ShiftRejectData {
  title: string;
  message: string;
  employeeName?: string;
}


@Component({
  selector: 'app-shift-reject-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="srd">
      <h2 class="srd-title">{{ data.title }}</h2>

      <mat-dialog-content class="srd-body">

        <p class="srd-message">
          {{ data.message }}
          <strong *ngIf="data.employeeName"> {{ data.employeeName }}</strong>?
        </p>

        <mat-form-field appearance="outline" class="reason-field">
          <mat-label>Rejection Reason</mat-label>
          <textarea
            matInput
            rows="4"
            [(ngModel)]="reason"
            placeholder="Write reason for rejecting this shift swap...">
          </textarea>
        </mat-form-field>

      </mat-dialog-content>

      <div class="srd-footer">
        <button mat-stroked-button mat-dialog-close class="srd-cancel">
          Cancel
        </button>

        <button mat-flat-button (click)="onReject()" class="srd-reject">
          Reject
        </button>
      </div>
    </div>
  `,
  styles: [`

:host ::ng-deep .mdc-dialog__surface {
  min-width: unset !important;
  width: auto !important;
}

/* Container */

.srd {
  width: 420px;
  max-width: 90vw;
  background: white;
  border-radius: 12px;
  padding: 26px 26px 20px;
  font-family: 'Inter', 'DM Sans', sans-serif;
  box-sizing: border-box;
}

/* Title */

.srd-title {
  margin: 0 0 12px;
  font-size: 17px;
  font-weight: 700;
  color: #111827;
}

/* Body */

.srd-body {
  padding: 0 !important;
  overflow: visible !important;
}

.srd-message {
  margin: 0 0 16px;
  font-size: 14px;
  color: #4b5563;
  line-height: 1.6;
}

.srd-message strong {
  color: #111827;
  font-weight: 600;
}

/* Textarea */

.reason-field {
  width: 100%;
}

textarea {
  font-size: 13.5px;
}

/* Footer */

.srd-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

/* Cancel Button */

.srd-cancel {
  height: 38px !important;
  padding: 0 20px !important;
  border-radius: 8px !important;
  font-size: 13.5px !important;
  font-weight: 500 !important;
  color: #374151 !important;
  border-color: #d1d5db !important;
}

.srd-cancel:hover {
  background: #f9fafb !important;
}

/* Reject Button (same red style as delete) */

.srd-reject {
  height: 38px !important;
  padding: 0 22px !important;
  border-radius: 8px !important;
  font-size: 13.5px !important;
  font-weight: 600 !important;
  background: #dc2626 !important;
  color: white !important;
  box-shadow: 0 2px 6px rgba(220, 38, 38, 0.28) !important;
}

.srd-reject:hover {
  background: #b91c1c !important;
  box-shadow: 0 4px 10px rgba(220, 38, 38, 0.38) !important;
}

/* Mobile */

@media (max-width:480px) {

  .srd {
    padding: 20px 18px 16px;
    width: 100%;
  }

  .srd-footer button {
    flex: 1;
  }

}
`]
})
export class ShiftRejectDialogComponent {

  reason: string = '';

  constructor(
    public dialogRef: MatDialogRef<ShiftRejectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ShiftRejectData
  ) {}

  onReject(): void {
    this.dialogRef.close({
      rejected: true,
      reason: this.reason
    });
  }
}
