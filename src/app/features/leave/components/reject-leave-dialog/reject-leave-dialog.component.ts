import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface RejectLeaveDialogData {
  employeeName: string;
  leaveTypeName: string;
  startDate: Date | string;
  endDate: Date | string;
  daysRequested: number;
}

@Component({
  selector: 'app-reject-leave-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>cancel</mat-icon>
        Reject Leave Request
      </h2>
      <button mat-icon-button mat-dialog-close class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <!-- Leave Request Summary -->
      <div class="request-summary">
        <div class="summary-item">
          <mat-icon>person</mat-icon>
          <div class="summary-details">
            <span class="label">Employee</span>
            <span class="value">{{ data.employeeName }}</span>
          </div>
        </div>
        <div class="summary-item">
          <mat-icon>category</mat-icon>
          <div class="summary-details">
            <span class="label">Leave Type</span>
            <span class="value">{{ data.leaveTypeName }}</span>
          </div>
        </div>
        <div class="summary-item">
          <mat-icon>date_range</mat-icon>
          <div class="summary-details">
            <span class="label">Duration</span>
            <span class="value">{{ data.startDate | date:'mediumDate' }} - {{ data.endDate | date:'mediumDate' }}</span>
          </div>
        </div>
        <div class="summary-item">
          <mat-icon>event_note</mat-icon>
          <div class="summary-details">
            <span class="label">Days</span>
            <span class="value">{{ data.daysRequested }} {{ data.daysRequested === 1 ? 'day' : 'days' }}</span>
          </div>
        </div>
      </div>

      <!-- Rejection Form -->
      <form [formGroup]="rejectForm" class="reject-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Reason for Rejection *</mat-label>
          <textarea matInput 
                    formControlName="reason" 
                    placeholder="Please provide a clear reason for rejecting this leave request..."
                    rows="5"
                    maxlength="500"></textarea>
          <mat-hint align="start">Required - This will be sent to the employee</mat-hint>
          <mat-hint align="end">{{ rejectForm.get('reason')?.value?.length || 0 }}/500</mat-hint>
          <mat-error *ngIf="rejectForm.get('reason')?.hasError('required')">
            Rejection reason is required
          </mat-error>
          <mat-error *ngIf="rejectForm.get('reason')?.hasError('minlength')">
            Please provide at least 10 characters
          </mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-stroked-button (click)="onCancel()" [disabled]="isSubmitting">
        Cancel
      </button>
      <button mat-flat-button 
              class="reject-button"
              (click)="onReject()" 
              [disabled]="!rejectForm.valid || isSubmitting">
        <mat-spinner diameter="20" *ngIf="isSubmitting"></mat-spinner>
        <mat-icon *ngIf="!isSubmitting">cancel</mat-icon>
        {{ isSubmitting ? 'Rejecting...' : 'Reject Request' }}
      </button>
    </mat-dialog-actions>
  `,
  styleUrls: ['./reject-leave-dialog.component.scss']
})
export class RejectLeaveDialogComponent {
  rejectForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RejectLeaveDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RejectLeaveDialogData
  ) {
    this.rejectForm = this.fb.group({
      reason: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onReject(): void {
    if (!this.rejectForm.valid) return;

    this.isSubmitting = true;
    const reason = this.rejectForm.get('reason')?.value;
    this.dialogRef.close({ rejected: true, reason });
  }
}







