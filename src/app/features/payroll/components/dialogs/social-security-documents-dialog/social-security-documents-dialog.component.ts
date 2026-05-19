import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { PayrollService, SocialSecurityRequestDocument } from '../../../services/payroll.service';
import { NotificationService } from '@core/services/notification.service';

export interface SocialSecurityDocumentsDialogData {
  requestId: string;
  title: string;
  /** When false, hide verify/reject controls (read-only view for employees). */
  canVerify?: boolean;
}

@Component({
  selector: 'app-social-security-documents-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  templateUrl: './social-security-documents-dialog.component.html',
  styleUrl: '../add-social-security-transaction-dialog/add-social-security-transaction-dialog.component.scss'
})
export class SocialSecurityDocumentsDialogComponent {
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<SocialSecurityDocumentsDialogComponent, boolean>);

  readonly canVerify: boolean;
  readonly loading = signal(true);
  readonly documents = signal<SocialSecurityRequestDocument[]>([]);
  readonly busyId = signal<string | null>(null);
  private touched = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: SocialSecurityDocumentsDialogData) {
    this.canVerify = data?.canVerify ?? true;
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.payrollService.getSocialSecurityRequestDocuments(this.data.requestId).subscribe({
      next: (docs) => {
        this.documents.set(docs ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.documents.set([]);
        this.loading.set(false);
        this.notification.showError('Failed to load documents.');
      }
    });
  }

  statusClass(status: string): string {
    const s = String(status ?? '').toLowerCase();
    if (s === 'verified') return 'status-approved';
    if (s === 'rejected' || s === 'expired') return 'status-cancelled';
    return 'status-pending';
  }

  open(doc: SocialSecurityRequestDocument): void {
    if (!doc.fileUrl) {
      this.notification.showError('This document has no file URL.');
      return;
    }
    window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
  }

  verify(doc: SocialSecurityRequestDocument, status: 'verified' | 'rejected'): void {
    if (this.busyId()) return;
    this.busyId.set(doc.documentId);
    this.payrollService.verifySocialSecurityRequestDocument(doc.documentId, status).subscribe({
      next: () => {
        this.touched = true;
        this.busyId.set(null);
        this.documents.update((list) =>
          list.map((d) => (d.documentId === doc.documentId ? { ...d, verifiedStatus: status } : d)));
        this.notification.showSuccess(`Document ${status}.`);
      },
      error: (err) => {
        this.busyId.set(null);
        this.notification.showError(err?.error?.message || err?.message || 'Failed to update document.');
      }
    });
  }

  close(): void {
    this.dialogRef.close(this.touched);
  }
}
