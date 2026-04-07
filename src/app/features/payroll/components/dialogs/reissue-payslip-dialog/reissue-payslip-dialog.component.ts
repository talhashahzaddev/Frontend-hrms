import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type ReissueHistoryStatus = 'draft' | 'generated' | 'sent' | 'viewed';

export interface ReissueVersionHistoryItem {
  versionNo: number;
  status: ReissueHistoryStatus;
  issuedAt: string;
}

export interface ReissuePayslipDialogData {
  payslipLabel: string;
  nextVersionNo: number;
  history: ReissueVersionHistoryItem[];
  defaultReason?: string;
  defaultNotes?: string;
}

export interface ReissuePayslipDialogPayload {
  reason: string;
  notes: string;
  sendEmail: boolean;
  nextVersionNo: number;
}

@Component({
  selector: 'app-reissue-payslip-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './reissue-payslip-dialog.component.html',
  styleUrl: './reissue-payslip-dialog.component.scss'
})
export class ReissuePayslipDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ReissuePayslipDialogComponent, ReissuePayslipDialogPayload | undefined>);

  readonly form = this.fb.group({
    reason: [this.data.defaultReason ?? '', [Validators.required, Validators.maxLength(200)]],
    notes: [this.data.defaultNotes ?? '', [Validators.maxLength(600)]],
    sendEmail: [true]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: ReissuePayslipDialogData) {}

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    this.dialogRef.close({
      reason: String(raw.reason ?? '').trim(),
      notes: String(raw.notes ?? '').trim(),
      sendEmail: Boolean(raw.sendEmail),
      nextVersionNo: this.data.nextVersionNo
    });
  }

  statusClass(status: ReissueHistoryStatus): string {
    if (status === 'viewed') return 'status-viewed';
    if (status === 'sent') return 'status-sent';
    if (status === 'generated') return 'status-generated';
    return 'status-draft';
  }
}
