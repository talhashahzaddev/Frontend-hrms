import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs';

import {
  CreateSocialSecurityClaimPayload,
  PayrollService,
  SocialSecurityRequestDocumentInput
} from '../../../services/payroll.service';
import { SettingsService } from '../../../../settings/services/settings.service';

interface UploadedDoc extends SocialSecurityRequestDocumentInput {
  uploading: boolean;
  error: boolean;
}

@Component({
  selector: 'app-social-security-claim-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './social-security-claim-dialog.component.html',
  styleUrl: '../add-social-security-transaction-dialog/add-social-security-transaction-dialog.component.scss'
})
export class SocialSecurityClaimDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly payrollService = inject(PayrollService);
  private readonly settingsService = inject(SettingsService);
  private readonly dialogRef = inject(MatDialogRef<SocialSecurityClaimDialogComponent, CreateSocialSecurityClaimPayload | undefined>);

  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());
  private readonly currencyCode = signal(this.settingsService.getOrganizationCurrencyCode() || 'USD');

  documents: UploadedDoc[] = [];
  uploadError: string | null = null;

  readonly form = this.fb.group(
    {
      claimType: ['retirement', Validators.required],
      claimedAmount: [0, [Validators.required, Validators.min(0)]],
      incidentDate: [''],
      periodFrom: [''],
      periodTo: [''],
      decisionNotes: ['']
    },
    { validators: [this.periodRangeValidator()] }
  );

  constructor() {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (code) => {
          this.currencyCode.set(code || 'USD');
          this.currencySymbol.set(this.settingsService.getCurrencySymbol(code));
        },
        error: () => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol());
        }
      });
  }

  get showRangeError(): boolean {
    return this.form.hasError('invalidPeriodRange') &&
      ((this.form.get('periodFrom')?.touched ?? false) || (this.form.get('periodTo')?.touched ?? false));
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

  private uploadDocument(file: File): void {
    if (file.size > 10 * 1024 * 1024) {
      this.uploadError = `File "${file.name}" is larger than 10 MB.`;
      return;
    }

    const entry: UploadedDoc = {
      documentType: 'claim_evidence',
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
    const payload: CreateSocialSecurityClaimPayload = {
      claimType: String(raw.claimType ?? 'retirement'),
      claimedAmount: Number(raw.claimedAmount ?? 0),
      currency: this.currencyCode(),
      incidentDate: raw.incidentDate ? String(raw.incidentDate) : null,
      periodFrom: raw.periodFrom ? String(raw.periodFrom) : null,
      periodTo: raw.periodTo ? String(raw.periodTo) : null,
      decisionNotes: raw.decisionNotes ? String(raw.decisionNotes).trim() : null,
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

  private periodRangeValidator(): ValidatorFn {
    return (group): ValidationErrors | null => {
      const from = String(group.get('periodFrom')?.value ?? '');
      const to = String(group.get('periodTo')?.value ?? '');
      if (from && to && to < from) {
        return { invalidPeriodRange: true };
      }
      return null;
    };
  }
}
