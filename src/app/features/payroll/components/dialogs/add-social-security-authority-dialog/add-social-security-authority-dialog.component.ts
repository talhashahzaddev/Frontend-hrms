import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SocialSecurityJurisdictionOption } from '../../../services/payroll.service';

export interface SocialSecurityAuthorityDialogPayload {
  jurisdictionId: string;
  authorityCode: string;
  authorityName: string;
  portalUrl: string | null;
  remittanceFrequency: string | null;
}

interface SocialSecurityAuthorityDialogData {
  mode?: 'create' | 'edit';
  jurisdictions?: SocialSecurityJurisdictionOption[];
  initialValue?: Partial<SocialSecurityAuthorityDialogPayload>;
}

@Component({
  selector: 'app-add-social-security-authority-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-social-security-authority-dialog.component.html',
  styleUrl: '../add-social-security-transaction-dialog/add-social-security-transaction-dialog.component.scss'
})
export class AddSocialSecurityAuthorityDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddSocialSecurityAuthorityDialogComponent, SocialSecurityAuthorityDialogPayload | undefined>);

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';
  readonly jurisdictions = this.data?.jurisdictions ?? [];

  readonly form = this.fb.group({
    jurisdictionId: ['', [Validators.required]],
    authorityCode: ['', [Validators.required]],
    authorityName: ['', [Validators.required]],
    portalUrl: [''],
    remittanceFrequency: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: SocialSecurityAuthorityDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        jurisdictionId: this.data.initialValue.jurisdictionId ?? '',
        authorityCode: this.data.initialValue.authorityCode ?? '',
        authorityName: this.data.initialValue.authorityName ?? '',
        portalUrl: this.data.initialValue.portalUrl ?? '',
        remittanceFrequency: this.data.initialValue.remittanceFrequency ?? ''
      });
    }
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit authority' : 'Add authority';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Save changes' : 'Create authority';
  }

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
      jurisdictionId: String(raw.jurisdictionId ?? '').trim(),
      authorityCode: String(raw.authorityCode ?? '').trim(),
      authorityName: String(raw.authorityName ?? '').trim(),
      portalUrl: this.toNullable(raw.portalUrl),
      remittanceFrequency: this.toNullable(raw.remittanceFrequency)
    });
  }

  private toNullable(value: string | null | undefined): string | null {
    const trimmed = String(value ?? '').trim();
    return trimmed ? trimmed : null;
  }
}
