import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs';

import { SettingsService } from '../../../../settings/services/settings.service';

import { SharedCommonModule } from '@shared/shared-common.module';
export type SocialSecurityAdminActionMode =
  | 'approve-request'
  | 'reject-request'
  | 'approve-claim'
  | 'reject-claim'
  | 'mark-claim-paid';

export type SocialSecurityPctSource = 'requested' | 'rule' | 'custom';

export interface SocialSecurityAdminActionDialogData {
  mode: SocialSecurityAdminActionMode;
  subject: string;          // e.g. employee name + request type / claim type
  defaultEmployeePct?: number | null;   // value the employee requested
  defaultEmployerPct?: number | null;   // value the employee requested
  ruleEmployeePct?: number | null;      // the linked rule's default %
  ruleEmployerPct?: number | null;      // the linked rule's default %
  ruleName?: string | null;
  defaultSalaryCap?: number | null;
  defaultEffectiveDate?: string | null;
  claimedAmount?: number | null;
  approvedAmount?: number | null;
}

export interface SocialSecurityAdminActionResult {
  remarks?: string;
  rejectionReason?: string;
  overrideEmployeePct?: number | null;
  overrideEmployerPct?: number | null;
  overrideSalaryCap?: number | null;
  effectiveDate?: string | null;
  approvedAmount?: number | null;
  paidAmount?: number | null;
  paymentDate?: string | null;
  paymentReference?: string | null;
  authorityReference?: string | null;
}


@Component({
  selector: 'app-social-security-admin-action-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedCommonModule,CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './social-security-admin-action-dialog.component.html',
  styleUrl: '../add-social-security-transaction-dialog/add-social-security-transaction-dialog.component.scss'
})
export class SocialSecurityAdminActionDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<SocialSecurityAdminActionDialogComponent, SocialSecurityAdminActionResult | undefined>);
  private readonly settingsService = inject(SettingsService);

  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  readonly mode: SocialSecurityAdminActionMode;

  readonly form = this.fb.group({
    remarks: [''],
    rejectionReason: [''],
    pctSource: ['requested' as SocialSecurityPctSource],
    overrideEmployeePct: [null as number | null],
    overrideEmployerPct: [null as number | null],
    overrideSalaryCap: [null as number | null],
    effectiveDate: [''],
    approvedAmount: [0, [Validators.min(0)]],
    paidAmount: [0, [Validators.min(0)]],
    paymentDate: [''],
    paymentReference: [''],
    authorityReference: ['']
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: SocialSecurityAdminActionDialogData) {
    this.mode = data?.mode ?? 'approve-request';

    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (code) => this.currencySymbol.set(this.settingsService.getCurrencySymbol(code)),
        error: () => this.currencySymbol.set(this.settingsService.getCurrencySymbol())
      });

    this.form.patchValue({
      // Default to honouring what the employee requested; the override inputs are
      // only used when the admin explicitly picks the "Custom" source.
      pctSource: 'requested',
      overrideSalaryCap: data?.defaultSalaryCap ?? null,
      effectiveDate: data?.defaultEffectiveDate ?? '',
      approvedAmount: data?.approvedAmount ?? data?.claimedAmount ?? 0,
      paidAmount: data?.approvedAmount ?? data?.claimedAmount ?? 0,
      paymentDate: new Date().toISOString().slice(0, 10)
    });

    if (this.mode === 'reject-request' || this.mode === 'reject-claim') {
      this.form.get('rejectionReason')?.setValidators([Validators.required, Validators.maxLength(500)]);
      this.form.get('rejectionReason')?.updateValueAndValidity();
    }
    if (this.mode === 'approve-claim') {
      this.form.get('approvedAmount')?.setValidators([Validators.required, Validators.min(0)]);
      this.form.get('approvedAmount')?.updateValueAndValidity();
    }
    if (this.mode === 'mark-claim-paid') {
      this.form.get('paidAmount')?.setValidators([Validators.required, Validators.min(0)]);
      this.form.get('paymentDate')?.setValidators([Validators.required]);
      this.form.get('paidAmount')?.updateValueAndValidity();
      this.form.get('paymentDate')?.updateValueAndValidity();
    }
  }

  get title(): string {
    switch (this.mode) {
      case 'approve-request':  return 'Approve enrollment request';
      case 'reject-request':   return 'Reject enrollment request';
      case 'approve-claim':    return 'Approve benefit claim';
      case 'reject-claim':     return 'Reject benefit claim';
      case 'mark-claim-paid':  return 'Mark claim as paid';
    }
  }

  get submitLabel(): string {
    switch (this.mode) {
      case 'approve-request':
      case 'approve-claim':    return 'Approve';
      case 'reject-request':
      case 'reject-claim':     return 'Reject';
      case 'mark-claim-paid':  return 'Mark paid';
    }
  }

  get isApproveRequest(): boolean { return this.mode === 'approve-request'; }
  get isRejectRequest(): boolean { return this.mode === 'reject-request'; }
  get isApproveClaim(): boolean { return this.mode === 'approve-claim'; }
  get isRejectClaim(): boolean { return this.mode === 'reject-claim'; }
  get isMarkPaid(): boolean { return this.mode === 'mark-claim-paid'; }

  get requestedEmployeePct(): number | null { return this.toNullableNumber(this.data?.defaultEmployeePct); }
  get requestedEmployerPct(): number | null { return this.toNullableNumber(this.data?.defaultEmployerPct); }
  get ruleEmployeePct(): number | null { return this.toNullableNumber(this.data?.ruleEmployeePct); }
  get ruleEmployerPct(): number | null { return this.toNullableNumber(this.data?.ruleEmployerPct); }
  get ruleName(): string { return (this.data?.ruleName ?? '').trim() || 'linked rule'; }

  // Only offer the "rule default" choice when the request is actually tied to a
  // rule that has a usable percentage defined.
  get hasRulePct(): boolean {
    return this.ruleEmployeePct !== null || this.ruleEmployerPct !== null;
  }

  get pctSource(): SocialSecurityPctSource {
    return (this.form.get('pctSource')?.value as SocialSecurityPctSource) ?? 'requested';
  }

  setPctSource(source: SocialSecurityPctSource): void {
    this.form.patchValue({ pctSource: source });
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

    const result: SocialSecurityAdminActionResult = {};

    if (this.isApproveRequest) {
      result.remarks = raw.remarks?.trim() || undefined;

      // Resolve the contribution percentages from the chosen source:
      //  - requested → send null so the backend keeps the employee's requested values
      //  - rule      → push the linked rule's default percentages
      //  - custom    → use whatever the admin typed in the override inputs
      const source = (raw.pctSource as SocialSecurityPctSource) ?? 'requested';
      if (source === 'rule') {
        result.overrideEmployeePct = this.ruleEmployeePct;
        result.overrideEmployerPct = this.ruleEmployerPct;
      } else if (source === 'custom') {
        result.overrideEmployeePct = this.toNullableNumber(raw.overrideEmployeePct);
        result.overrideEmployerPct = this.toNullableNumber(raw.overrideEmployerPct);
      } else {
        result.overrideEmployeePct = null;
        result.overrideEmployerPct = null;
      }

      result.overrideSalaryCap = this.toNullableNumber(raw.overrideSalaryCap);
      result.effectiveDate = raw.effectiveDate ? String(raw.effectiveDate) : null;
    } else if (this.isRejectRequest || this.isRejectClaim) {
      result.rejectionReason = raw.rejectionReason?.trim() || undefined;
    } else if (this.isApproveClaim) {
      result.approvedAmount = Number(raw.approvedAmount ?? 0);
      result.remarks = raw.remarks?.trim() || undefined;
    } else if (this.isMarkPaid) {
      result.paidAmount = Number(raw.paidAmount ?? 0);
      result.paymentDate = raw.paymentDate ? String(raw.paymentDate) : null;
      result.paymentReference = raw.paymentReference?.trim() || undefined;
      result.authorityReference = raw.authorityReference?.trim() || undefined;
    }

    this.dialogRef.close(result);
  }

  private toNullableNumber(v: number | null | undefined): number | null {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return null;
    return Number(v);
  }
}
