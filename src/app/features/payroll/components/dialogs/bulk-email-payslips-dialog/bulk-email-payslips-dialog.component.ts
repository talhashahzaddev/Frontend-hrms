import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type BulkEmailRecipientStatus = 'none' | 'draft' | 'generated' | 'sent' | 'viewed' | 'failed' | 'bounced';
export type BulkEmailSendMode = 'all-generated' | 'not-sent' | 'custom';

export interface BulkEmailPeriodOption {
  id: string;
  label: string;
}

export interface BulkEmailRecipientOption {
  id: string;
  employeeName: string;
  employeeEmail: string;
  payrollPeriodId: string;
  hasGeneratedPayslip: boolean;
  alreadySent: boolean;
  status: BulkEmailRecipientStatus;
}

export interface BulkEmailPayslipsDialogData {
  periods: BulkEmailPeriodOption[];
  recipients: BulkEmailRecipientOption[];
  defaultPeriodId?: string;
  defaultSubject?: string;
  defaultMessage?: string;
}

export interface BulkEmailPayslipsDialogPayload {
  payrollPeriodId: string;
  sendToMode: BulkEmailSendMode;
  subject: string;
  message: string;
  employeeIds: string[];
}

@Component({
  selector: 'app-bulk-email-payslips-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './bulk-email-payslips-dialog.component.html',
  styleUrl: './bulk-email-payslips-dialog.component.scss'
})
export class BulkEmailPayslipsDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<BulkEmailPayslipsDialogComponent, BulkEmailPayslipsDialogPayload | undefined>);

  selectionExpanded = true;
  emailExpanded = false;

  readonly selectedRecipientIds = new Set<string>();
  selectionError = false;

  readonly form = this.fb.group({
    payrollPeriodId: [this.data.defaultPeriodId ?? this.data.periods[0]?.id ?? '', Validators.required],
    sendToMode: ['all-generated' as BulkEmailSendMode, Validators.required],
    subject: [
      this.data.defaultSubject ?? 'Payslip for selected period - Enterprise HR',
      [Validators.required, Validators.maxLength(250)]
    ],
    message: [
      this.data.defaultMessage ?? 'Hello,\n\nYour payslip for the selected period is now available. Please find the attached document for your records.\n\nBest regards,\nPayroll Team',
      [Validators.required, Validators.maxLength(2000)]
    ]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: BulkEmailPayslipsDialogData) {
    this.generatedPeriodRecipients.forEach((recipient) => this.selectedRecipientIds.add(recipient.id));

    this.form.get('payrollPeriodId')?.valueChanges.subscribe(() => {
      this.selectionError = false;
      this.reconcileSelection();
    });

    this.form.get('sendToMode')?.valueChanges.subscribe(() => {
      this.selectionError = false;
    });
  }

  get selectedPeriodId(): string {
    return String(this.form.get('payrollPeriodId')?.value ?? '').trim();
  }

  get sendMode(): BulkEmailSendMode {
    return (this.form.get('sendToMode')?.value ?? 'all-generated') as BulkEmailSendMode;
  }

  get periodRecipients(): BulkEmailRecipientOption[] {
    const periodId = this.selectedPeriodId;
    if (!periodId) {
      return [];
    }

    return this.data.recipients.filter((recipient) => recipient.payrollPeriodId === periodId);
  }

  get generatedPeriodRecipients(): BulkEmailRecipientOption[] {
    return this.periodRecipients.filter((recipient) => recipient.hasGeneratedPayslip);
  }

  get customRecipients(): BulkEmailRecipientOption[] {
    return this.generatedPeriodRecipients;
  }

  get displayRecipients(): BulkEmailRecipientOption[] {
    return this.showCustomSelection ? this.customRecipients : this.sendableRecipients;
  }

  get sendableRecipients(): BulkEmailRecipientOption[] {
    if (this.sendMode === 'not-sent') {
      return this.generatedPeriodRecipients.filter((recipient) => !recipient.alreadySent);
    }

    if (this.sendMode === 'custom') {
      return this.generatedPeriodRecipients.filter((recipient) => this.selectedRecipientIds.has(recipient.id));
    }

    return this.generatedPeriodRecipients;
  }

  get sendCount(): number {
    return this.sendableRecipients.length;
  }

  get alreadySentCount(): number {
    return this.sendableRecipients.filter((recipient) => recipient.alreadySent).length;
  }

  get showCustomSelection(): boolean {
    return this.sendMode === 'custom';
  }

  get allCustomSelected(): boolean {
    if (!this.customRecipients.length) {
      return false;
    }

    return this.customRecipients.every((recipient) => this.selectedRecipientIds.has(recipient.id));
  }

  close(): void {
    this.dialogRef.close();
  }

  toggleSelectAllCustom(checked: boolean): void {
    this.selectionError = false;

    if (checked) {
      this.customRecipients.forEach((recipient) => this.selectedRecipientIds.add(recipient.id));
      return;
    }

    this.customRecipients.forEach((recipient) => this.selectedRecipientIds.delete(recipient.id));
  }

  toggleRecipient(id: string, checked: boolean): void {
    this.selectionError = false;

    if (checked) {
      this.selectedRecipientIds.add(id);
      return;
    }

    this.selectedRecipientIds.delete(id);
  }

  isRecipientSelected(id: string): boolean {
    return this.selectedRecipientIds.has(id);
  }

  process(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (!this.emailExpanded) {
        this.emailExpanded = true;
      }
      return;
    }

    if (!this.sendableRecipients.length) {
      this.selectionError = true;
      if (!this.selectionExpanded) {
        this.selectionExpanded = true;
      }
      return;
    }

    const raw = this.form.getRawValue();

    this.dialogRef.close({
      payrollPeriodId: String(raw.payrollPeriodId ?? ''),
      sendToMode: (raw.sendToMode ?? 'all-generated') as BulkEmailSendMode,
      subject: String(raw.subject ?? '').trim(),
      message: String(raw.message ?? '').trim(),
      employeeIds: this.sendableRecipients.map((recipient) => recipient.id)
    });
  }

  private reconcileSelection(): void {
    const visibleRecipientIds = new Set(this.customRecipients.map((recipient) => recipient.id));

    Array.from(this.selectedRecipientIds).forEach((id) => {
      if (!visibleRecipientIds.has(id)) {
        this.selectedRecipientIds.delete(id);
      }
    });

    if (!this.selectedRecipientIds.size) {
      this.customRecipients.forEach((recipient) => this.selectedRecipientIds.add(recipient.id));
    }
  }
}
