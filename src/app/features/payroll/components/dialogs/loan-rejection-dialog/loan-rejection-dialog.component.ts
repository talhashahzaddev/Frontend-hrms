import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface LoanRejectionDialogData {
  title?: string;
  message?: string;
  placeholder?: string;
  submitText?: string;
  cancelText?: string;
}


@Component({
  selector: 'app-loan-rejection-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedCommonModule,CommonModule, FormsModule, MatDialogModule, MatIconModule],
  templateUrl: './loan-rejection-dialog.component.html',
  styleUrl: './loan-rejection-dialog.component.scss'
})
export class LoanRejectionDialogComponent {
  reason = '';

  constructor(
    private dialogRef: MatDialogRef<LoanRejectionDialogComponent, string | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: LoanRejectionDialogData
  ) {}

  close(): void {
    this.dialogRef.close(undefined);
  }

  submit(): void {
    const cleanedReason = this.reason.trim();
    if (!cleanedReason) {
      return;
    }
    this.dialogRef.close(cleanedReason);
  }
}
