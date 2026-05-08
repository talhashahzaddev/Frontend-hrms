import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import {
  CreateSocialSecurityEnrollmentRequestPayload,
  PayrollService,
  SocialSecurityEnrollment,
  SocialSecurityRequestDocumentInput
} from '../../../services/payroll.service';

interface RequestSocialSecurityChangeDialogData {
  currentEnrollment: SocialSecurityEnrollment | null;
}

interface UploadedDoc extends SocialSecurityRequestDocumentInput {
  uploading: boolean;
  error: boolean;
}

@Component({
  selector: 'app-request-social-security-change-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './request-social-security-change-dialog.component.html',
  styleUrl: '../add-social-security-transaction-dialog/add-social-security-transaction-dialog.component.scss'
})
export class RequestSocialSecurityChangeDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly payrollService = inject(PayrollService);
  private readonly dialogRef = inject(MatDialogRef<RequestSocialSecurityChangeDialogComponent, CreateSocialSecurityEnrollmentRequestPayload | undefined>);

  readonly hasCurrentEnrollment: boolean;
  readonly defaultRequestType: string;

  documents: UploadedDoc[] = [];
  isSubmitting = false;
  uploadError: string | null = null;

  readonly form = this.fb.group({
    requestType: ['enrollment', Validators.required],
    reason: ['', [Validators.required, Validators.maxLength(1000)]],
    requestedEmployeePct: [null as number | null],
    requestedEmployerPct: [null as number | null],
    requestedSalaryCap: [null as number | null],
    requestedEffectiveDate: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: RequestSocialSecurityChangeDialogData) {
    this.hasCurrentEnrollment = !!data?.currentEnrollment;
    this.defaultRequestType = this.hasCurrentEnrollment ? 'update' : 'enrollment';
    this.form.patchValue({ requestType: this.defaultRequestType });
  }

  get dialogTitle(): string {
    return this.hasCurrentEnrollment ? 'Request enrollment change' : 'Request social security enrollment';
  }

  get showRateFields(): boolean {
    const t = String(this.form.get('requestType')?.value ?? '');
    return t === 'enrollment' || t === 'update' || t === 'reactivation';
  }

  get availableRequestTypes(): { value: string; label: string }[] {
    return this.hasCurrentEnrollment
      ? [
          { value: 'update', label: 'Update voluntary contribution' },
          { value: 'withdrawal', label: 'Withdraw / opt out' },
          { value: 'suspension', label: 'Suspend temporarily' },
          { value: 'reactivation', label: 'Reactivate' },
          { value: 'exemption', label: 'Request exemption' },
          { value: 'correction', label: 'Correction' }
        ]
      : [
          { value: 'enrollment', label: 'Enroll / opt in' },
          { value: 'exemption', label: 'Request exemption' }
        ];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    files.forEach((file) => this.uploadDocument(file));
  }

  removeDocument(doc: UploadedDoc): void {
    this.documents = this.documents.filter((d) => d !== doc);
  }

  retryDocument(doc: UploadedDoc, file?: File): void {
    if (!file) {
      return;
    }
    this.removeDocument(doc);
    this.uploadDocument(file);
  }

  private uploadDocument(file: File): void {
    if (file.size > 10 * 1024 * 1024) {
      this.uploadError = `File "${file.name}" is larger than 10 MB.`;
      return;
    }

    const entry: UploadedDoc = {
      documentType: 'supporting',
      documentName: file.name,
      fileUrl: '',
      mimeType: file.type,
      fileSize: file.size,
      uploading: true,
      error: false
    };

    this.documents = [...this.documents, entry];
    this.uploadError = null;

    this.payrollService.uploadSocialSecurityFile(file).subscribe({
      next: (url) => {
        entry.fileUrl = url;
        entry.uploading = false;
      },
      error: () => {
        entry.uploading = false;
        entry.error = true;
        this.uploadError = `Failed to upload "${file.name}". Try again.`;
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.documents.some((d) => d.uploading)) {
      this.uploadError = 'Please wait for files to finish uploading.';
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CreateSocialSecurityEnrollmentRequestPayload = {
      requestType: String(raw.requestType ?? 'enrollment'),
      reason: String(raw.reason ?? '').trim() || null,
      requestedEmployeePct: this.toNullableNumber(raw.requestedEmployeePct),
      requestedEmployerPct: this.toNullableNumber(raw.requestedEmployerPct),
      requestedSalaryCap: this.toNullableNumber(raw.requestedSalaryCap),
      requestedEffectiveDate: raw.requestedEffectiveDate ? String(raw.requestedEffectiveDate) : null,
      documents: this.documents
        .filter((d) => !d.error && !!d.fileUrl)
        .map((d) => ({
          documentType: d.documentType,
          documentName: d.documentName,
          fileUrl: d.fileUrl,
          mimeType: d.mimeType ?? null,
          fileSize: d.fileSize ?? null,
          issuer: d.issuer ?? null,
          issuedDate: d.issuedDate ?? null,
          expiryDate: d.expiryDate ?? null
        }))
    };

    this.dialogRef.close(payload);
  }

  private toNullableNumber(v: number | null | undefined): number | null {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return null;
    return Number(v);
  }
}
