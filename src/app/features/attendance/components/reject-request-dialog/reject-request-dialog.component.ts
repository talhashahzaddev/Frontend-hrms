import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface RejectRequestDialogData {
  employeeName: string;
  workDate: string;
}


@Component({
  selector: 'app-reject-request-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  template: `
    <div class="dialog-container reject-dialog">
      <div class="dialog-header">
        <div class="title-section">
          <div class="icon-wrapper warn">
            <mat-icon>cancel</mat-icon>
          </div>
          <div>
            <h2 class="title">Reject Attendance Correction Request</h2>
            <p class="subtitle">Provide a reason for rejecting this request</p>
          </div>
        </div>
      </div>

      <div class="dialog-body">
        <div class="employee-info">
          <p><strong>Employee:</strong> {{ data.employeeName }}</p>
          <p><strong>Work Date:</strong> {{ data.workDate }}</p>
        </div>

        <form [formGroup]="rejectForm">
          <mat-form-field appearance="outline" class="mat-field full-width">
            <mat-label>Rejection Reason</mat-label>
            <textarea
              matInput
              formControlName="rejectionReason"
              rows="4"
              placeholder="Enter the reason for rejecting this request..."
              required>
            </textarea>
            <mat-error *ngIf="rejectForm.get('rejectionReason')?.hasError('required')">
              Rejection reason is required
            </mat-error>
            <mat-error *ngIf="rejectForm.get('rejectionReason')?.hasError('minlength')">
              Reason must be at least 10 characters long
            </mat-error>
          </mat-form-field>
        </form>
      </div>

      <div class="dialog-footer">
        <button class="btn-cancel cancel-btn" mat-stroked-button (click)="onCancel()">Cancel</button>
        <button class="btn-save submit-btn warn" (click)="onConfirm()" [disabled]="!rejectForm.valid">
          <mat-icon>cancel</mat-icon>
          Reject Request
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./reject-request-dialog.component.scss']
})
export class RejectRequestDialogComponent {
  rejectForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RejectRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RejectRequestDialogData
  ) {
    this.rejectForm = this.fb.group({
      rejectionReason: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.rejectForm.valid) {
      const rejectionReason = this.rejectForm.get('rejectionReason')?.value;
      this.dialogRef.close(rejectionReason);
    }
  }
}
