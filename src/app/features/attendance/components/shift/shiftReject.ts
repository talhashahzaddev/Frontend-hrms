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
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="title-section">
          <div class="icon-wrapper warn">
            <mat-icon>block</mat-icon>
          </div>
          <div>
            <h2 class="title">{{ data.title }}</h2>
            <p class="subtitle">Provide a reason for rejecting this request</p>
          </div>
        </div>
      </div>

      <div class="dialog-body">
        <p class="srd-message">
          {{ data.message }}
          <strong *ngIf="data.employeeName"> {{ data.employeeName }}</strong>?
        </p>

        <mat-form-field appearance="outline" class="mat-field reason-field">
          <mat-label>Rejection Reason</mat-label>
          <textarea
            matInput
            rows="4"
            [(ngModel)]="reason"
            placeholder="Write reason for rejecting this shift swap...">
          </textarea>
        </mat-form-field>
      </div>

      <div class="dialog-footer">
        <button mat-stroked-button mat-dialog-close class="btn-cancel">Cancel</button>
        <button mat-flat-button (click)="onReject()" class="btn-save submit-btn warn">Reject</button>
      </div>
    </div>
  `,
  styleUrls: ['./shift-reject-dialog.component.scss']
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
