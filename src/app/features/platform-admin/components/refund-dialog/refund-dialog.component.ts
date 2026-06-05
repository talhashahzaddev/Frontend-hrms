import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SuperAdminService } from '../../services/super-admin.service';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface RefundDialogData {
  transactionId: string;
  amount: number;
  companyName: string;
}


@Component({
  selector: 'app-refund-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon color="warn">replay</mat-icon>
      Issue Refund
    </h2>

    <mat-dialog-content>
      <div class="refund-info">
        <p><strong>Company:</strong> {{ data.companyName }}</p>
        <p><strong>Max Refundable:</strong> \${{ data.amount | number:'1.2-2' }}</p>
      </div>

      @if (errorMessage) {
        <div class="error-banner">
          <mat-icon>error_outline</mat-icon>
          {{ errorMessage }}
        </div>
      }

      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Refund Amount</mat-label>
          <span matPrefix>$ &nbsp;</span>
          <input matInput type="number" formControlName="amount" [max]="data.amount" min="0.01" step="0.01">
          <mat-error>
            @if (form.get('amount')?.hasError('required')) {
              Amount is required
            } @else if (form.get('amount')?.hasError('min')) {
              Minimum refund amount is $0.01
            } @else if (form.get('amount')?.hasError('max')) {
              Cannot exceed \${{ data.amount | number:'1.2-2' }}
            }
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Reason for Refund</mat-label>
          <textarea matInput formControlName="reason" rows="3" placeholder="Provide a reason for the refund..."></textarea>
          <mat-error>Reason is required</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="isSubmitting">Cancel</button>
      <button mat-raised-button color="warn" (click)="submit()" [disabled]="form.invalid || isSubmitting">
        @if (isSubmitting) {
          <mat-spinner diameter="18" class="btn-spinner"></mat-spinner>
          Processing...
        } @else {
          <span class="btn-label"><mat-icon>replay</mat-icon> Issue Refund</span>
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }

    .refund-info {
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;

      p {
        margin: 4px 0;
        font-size: 0.9rem;
        color: #475569;

        strong {
          color: #1e293b;
        }
      }
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fee2e2;
      color: #dc2626;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 0.85rem;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .full-width {
      width: 100%;
    }

    .btn-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    button[mat-raised-button] {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  `]
})
export class RefundDialogComponent {
  form: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RefundDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RefundDialogData,
    private adminService: SuperAdminService
  ) {
    this.form = this.fb.group({
      amount: [data.amount, [Validators.required, Validators.min(0.01), Validators.max(data.amount)]],
      reason: ['', Validators.required]
    });
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    this.adminService.createRefund({
      transactionId: this.data.transactionId,
      amount: this.form.value.amount,
      reason: this.form.value.reason
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.dialogRef.close('success');
        } else {
          this.errorMessage = res.message || 'Refund failed';
          this.isSubmitting = false;
        }
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message || 'An error occurred while processing the refund';
        this.isSubmitting = false;
      }
    });
  }
}
