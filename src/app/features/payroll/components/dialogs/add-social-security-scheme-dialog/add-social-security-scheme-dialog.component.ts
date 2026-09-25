import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import {
  SocialSecurityAuthorityOption,
  SocialSecurityJurisdictionOption
} from '../../../services/payroll.service';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface SocialSecuritySchemeDialogPayload {
  jurisdictionId: string;
  authorityId: string | null;
  schemeCode: string;
  schemeName: string;
  schemeType: string | null;
  mandatoryMode: string | null;
}

interface SocialSecuritySchemeDialogData {
  mode?: 'create' | 'edit';
  jurisdictions?: SocialSecurityJurisdictionOption[];
  authorities?: SocialSecurityAuthorityOption[];
  initialValue?: Partial<SocialSecuritySchemeDialogPayload>;
}


@Component({
  selector: 'app-add-social-security-scheme-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedCommonModule,CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-social-security-scheme-dialog.component.html',
  styleUrl: '../add-social-security-transaction-dialog/add-social-security-transaction-dialog.component.scss'
})
export class AddSocialSecuritySchemeDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddSocialSecuritySchemeDialogComponent, SocialSecuritySchemeDialogPayload | undefined>);

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';
  readonly jurisdictions = this.data?.jurisdictions ?? [];
  readonly authorities = this.data?.authorities ?? [];

  readonly form = this.fb.group({
    jurisdictionId: ['', [Validators.required]],
    authorityId: [''],
    schemeCode: ['', [Validators.required]],
    schemeName: ['', [Validators.required]],
    schemeType: [''],
    mandatoryMode: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: SocialSecuritySchemeDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        jurisdictionId: this.data.initialValue.jurisdictionId ?? '',
        authorityId: this.data.initialValue.authorityId ?? '',
        schemeCode: this.data.initialValue.schemeCode ?? '',
        schemeName: this.data.initialValue.schemeName ?? '',
        schemeType: this.data.initialValue.schemeType ?? '',
        mandatoryMode: this.data.initialValue.mandatoryMode ?? ''
      });
    }
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit scheme' : 'Add scheme';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Save changes' : 'Create scheme';
  }

  get filteredAuthorities(): SocialSecurityAuthorityOption[] {
    const jurisdictionId = String(this.form.get('jurisdictionId')?.value ?? '');
    if (!jurisdictionId) {
      return this.authorities;
    }
    return this.authorities.filter((authority) => authority.jurisdictionId === jurisdictionId);
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
      authorityId: this.toNullable(raw.authorityId),
      schemeCode: String(raw.schemeCode ?? '').trim(),
      schemeName: String(raw.schemeName ?? '').trim(),
      schemeType: this.toNullable(raw.schemeType),
      mandatoryMode: this.toNullable(raw.mandatoryMode)
    });
  }

  private toNullable(value: string | null | undefined): string | null {
    const trimmed = String(value ?? '').trim();
    return trimmed ? trimmed : null;
  }
}
