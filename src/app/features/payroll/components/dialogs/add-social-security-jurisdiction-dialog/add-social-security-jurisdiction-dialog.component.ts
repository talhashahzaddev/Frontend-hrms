import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface SocialSecurityJurisdictionDialogPayload {
  jurisdictionCode: string;
  jurisdictionName: string;
  countryCode: string | null;
  currency: string | null;
  isDefault: boolean;
}

interface SocialSecurityJurisdictionDialogData {
  mode?: 'create' | 'edit';
  initialValue?: Partial<SocialSecurityJurisdictionDialogPayload>;
}


@Component({
  selector: 'app-add-social-security-jurisdiction-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedCommonModule,CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-social-security-jurisdiction-dialog.component.html',
  styleUrl: '../add-social-security-transaction-dialog/add-social-security-transaction-dialog.component.scss'
})
export class AddSocialSecurityJurisdictionDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddSocialSecurityJurisdictionDialogComponent, SocialSecurityJurisdictionDialogPayload | undefined>);

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';

  readonly form = this.fb.group({
    jurisdictionCode: ['', [Validators.required]],
    jurisdictionName: ['', [Validators.required]],
    countryCode: [''],
    currency: [''],
    isDefault: [false]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: SocialSecurityJurisdictionDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        jurisdictionCode: this.data.initialValue.jurisdictionCode ?? '',
        jurisdictionName: this.data.initialValue.jurisdictionName ?? '',
        countryCode: this.data.initialValue.countryCode ?? '',
        currency: this.data.initialValue.currency ?? '',
        isDefault: !!this.data.initialValue.isDefault
      });
    }
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit jurisdiction' : 'Add jurisdiction';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Save changes' : 'Create jurisdiction';
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
      jurisdictionCode: String(raw.jurisdictionCode ?? '').trim(),
      jurisdictionName: String(raw.jurisdictionName ?? '').trim(),
      countryCode: this.toNullable(raw.countryCode),
      currency: this.toNullable(raw.currency),
      isDefault: !!raw.isDefault
    });
  }

  private toNullable(value: string | null | undefined): string | null {
    const trimmed = String(value ?? '').trim();
    return trimmed ? trimmed : null;
  }
}
