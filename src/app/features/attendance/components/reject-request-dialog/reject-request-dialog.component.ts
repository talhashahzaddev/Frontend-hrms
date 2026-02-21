import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

export interface RejectRequestDialogData {
  employeeName: string;
  workDate: string;
}

@Component({
  selector: 'app-reject-request-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  template: `
    <div class="reject-dialog">
      <h2 mat-dialog-title>
        <mat-icon class="dialog-icon">cancel</mat-icon>
        Reject Attendance Correction Request
      </h2>
      
      <mat-dialog-content>
        <div class="employee-info">
          <p><strong>Employee:</strong> {{ data.employeeName }}</p>
          <p><strong>Work Date:</strong> {{ data.workDate }}</p>
        </div>

        <form [formGroup]="rejectForm">
          <mat-form-field appearance="outline" class="full-width">
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
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="onCancel()">
          Cancel
        </button>
        <button 
          mat-raised-button 
          color="warn" 
          (click)="onConfirm()"
          [disabled]="!rejectForm.valid">
          <mat-icon>cancel</mat-icon>
          Reject Request
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .reject-dialog {
      min-width: 500px;

      h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #d32f2f;

        .dialog-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
        }
      }

      .employee-info {
        background: #f5f5f5;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 20px;

        p {
          margin: 4px 0;
          font-size: 14px;
          color: #333;

          strong {
            color: #666;
          }
        }
      }

      .full-width {
        width: 100%;
      }

      mat-dialog-actions {
        gap: 8px;
        padding: 16px 0 0;
        margin: 0;
      }
    }

    @media (max-width: 600px) {
      .reject-dialog {
        min-width: auto;
        width: 100%;
      }
    }
  `]
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
