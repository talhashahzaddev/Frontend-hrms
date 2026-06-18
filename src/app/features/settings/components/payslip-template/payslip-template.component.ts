import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import {
  createDefaultPayslipFieldConfig,
  PayslipTemplate,
  PayslipTemplateFieldConfig,
  SettingsService,
  UpsertPayslipTemplateRequest
} from '../../services/settings.service';
import { SharedCommonModule } from '@shared/shared-common.module';

type FieldGroupKey = 'employeeFields' | 'earningFields' | 'deductionFields' | 'netPayFields';

interface FieldGroupMeta {
  key: FieldGroupKey;
  title: string;
  icon: string;
  fields: Array<{ key: string; label: string }>;
}

interface DisplayOptionMeta {
  control: string;
  label: string;
  hint: string;
  icon: string;
}

interface SectionToggleMeta {
  key: string;
  label: string;
  hint: string;
  icon: string;
}

@Component({
  selector: 'app-payslip-template',
  standalone: true,
  imports: [SharedCommonModule, CommonModule, ReactiveFormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './payslip-template.component.html',
  styleUrls: ['./payslip-template.component.scss']
})
export class PayslipTemplateComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  form!: FormGroup;
  fieldConfig: PayslipTemplateFieldConfig = createDefaultPayslipFieldConfig();
  savedTemplate: PayslipTemplate | null = null;

  isLoading = false;
  isSaving = false;
  isPreviewing = false;
  isUploadingLogo = false;
  isEditMode = false;
  logoFileName: string | null = null;
  previewUrl: string | null = null;
  safePreviewUrl: SafeResourceUrl | null = null;

  readonly acceptedImageTypes = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
  readonly displayOptions: DisplayOptionMeta[] = [
    { control: 'showGeneratedAt', label: 'Generated timestamp', hint: 'Show when the PDF was created', icon: 'schedule' },
    { control: 'showPayrollCalculatedAt', label: 'Payroll calculated timestamp', hint: 'Show payroll calculation date', icon: 'calculate' },
    { control: 'hideZeroAmountLines', label: 'Hide zero amounts', hint: 'Omit lines with 0 value from the slip', icon: 'money_off' },
    { control: 'hideEmptyJsonSections', label: 'Hide empty breakdowns', hint: 'Skip sections with no deduction or bonus data', icon: 'filter_alt_off' }
  ];

  readonly sectionToggles: SectionToggleMeta[] = [
    { key: 'employeeInfo', label: 'Employee information', hint: 'Name, code, department and period', icon: 'badge' },
    { key: 'earnings', label: 'Earnings', hint: 'Salary, bonuses and gross pay block', icon: 'trending_up' },
    { key: 'deductions', label: 'Deductions', hint: 'Tax, PF, loans and other deductions', icon: 'trending_down' },
    { key: 'netPay', label: 'Net pay', hint: 'Final payable amount highlight', icon: 'payments' },
    { key: 'footer', label: 'Footer', hint: 'Footer text and timestamps', icon: 'notes' }
  ];

  readonly fieldGroups: FieldGroupMeta[] = [
    {
      key: 'employeeFields',
      title: 'Employee fields',
      icon: 'person',
      fields: [
        { key: 'employeeName', label: 'Employee name' },
        { key: 'employeeCode', label: 'Employee code' },
        { key: 'departmentName', label: 'Department' },
        { key: 'payPeriod', label: 'Pay period' }
      ]
    },
    {
      key: 'earningFields',
      title: 'Earning lines',
      icon: 'add_circle_outline',
      fields: [
        { key: 'basicSalary', label: 'Basic salary' },
        { key: 'totalBonuses', label: 'Total bonuses' },
        { key: 'performanceBonuses', label: 'Performance bonus' },
        { key: 'generalBonuses', label: 'General bonus' },
        { key: 'gratuity', label: 'Gratuity' },
        { key: 'overtime', label: 'Overtime' },
        { key: 'grossPayLine', label: 'Gross pay total' }
      ]
    },
    {
      key: 'deductionFields',
      title: 'Deduction lines',
      icon: 'remove_circle_outline',
      fields: [
        { key: 'loanDeductions', label: 'Loan deductions' },
        { key: 'salaryAdvance', label: 'Salary advance' },
        { key: 'providentFund', label: 'Provident fund' },
        { key: 'socialSecurity', label: 'Social security' },
        { key: 'tax', label: 'Tax' },
        { key: 'attendance', label: 'Attendance' },
        { key: 'lateAttendance', label: 'Late attendance' },
        { key: 'leave', label: 'Leave' },
        { key: 'totalDeductions', label: 'Total deductions' }
      ]
    },
    {
      key: 'netPayFields',
      title: 'Net pay',
      icon: 'account_balance_wallet',
      fields: [{ key: 'netPayable', label: 'Net payable' }]
    }
  ];

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {
    this.form = this.fb.group({
      name: ['Default', Validators.required],
      logoUrl: [''],
      headerTitle: ['SALARY SLIP', [Validators.required, Validators.maxLength(150)]],
      headerSubtitle: [''],
      companyAddress: [''],
      footerText: ['This is a system-generated payslip.'],
      primaryColor: ['#1E3A5F', Validators.required],
      accentColor: ['#DBEAFE', Validators.required],
      sectionTitleColor: ['#E2E8F0', Validators.required],
      showGeneratedAt: [true],
      showPayrollCalculatedAt: [true],
      hideZeroAmountLines: [true],
      hideEmptyJsonSections: [true]
    });
  }

  ngOnInit(): void {
    this.loadTemplate();
  }

  ngOnDestroy(): void {
    this.revokePreviewUrl();
    this.destroy$.next();
    this.destroy$.complete();
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasPermissionByActionKey(actionKey);
  }

  get canEdit(): boolean {
    return this.hasPermission('payslip_template_edit');
  }

  loadTemplate(): void {
    this.isLoading = true;
    this.settingsService.getPayslipTemplate()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (template) => {
          this.savedTemplate = template;
          this.applyTemplate(template);
          this.isLoading = false;
        },
        error: () => {
          this.notificationService.showError('Failed to load payslip template');
          this.isLoading = false;
        }
      });
  }

  enterEditMode(): void {
    if (!this.canEdit) return;
    if (this.savedTemplate) {
      this.applyTemplate(this.savedTemplate);
    }
    this.isEditMode = true;
  }

  cancelEdit(): void {
    if (this.savedTemplate) {
      this.applyTemplate(this.savedTemplate);
    }
    this.isEditMode = false;
  }

  onSave(): void {
    if (!this.canEdit || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const payload = this.buildRequest();

    this.settingsService.updatePayslipTemplate(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (template) => {
          this.savedTemplate = template;
          this.applyTemplate(template);
          this.isEditMode = false;
          this.isSaving = false;
          this.notificationService.showSuccess('Payslip template saved.');
        },
        error: (err) => {
          this.isSaving = false;
          this.notificationService.showError(err?.message || 'Failed to save payslip template.');
        }
      });
  }

  onPreview(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isPreviewing = true;
    const payload = this.buildRequest();

    this.settingsService.previewPayslipTemplate(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.revokePreviewUrl();
          this.previewUrl = URL.createObjectURL(blob);
          this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl);
          this.isPreviewing = false;
        },
        error: async (err) => {
          this.isPreviewing = false;
          let message = 'Failed to generate preview.';
          if (err?.error instanceof Blob) {
            try {
              const text = await err.error.text();
              const parsed = JSON.parse(text);
              message = parsed?.message || message;
            } catch {
              // keep default message
            }
          } else if (err?.message) {
            message = err.message;
          }
          this.notificationService.showError(message);
        }
      });
  }

  openPreviewInNewTab(): void {
    if (!this.previewUrl) return;
    window.open(this.previewUrl, '_blank', 'noopener,noreferrer');
  }

  triggerLogoInput(input: HTMLInputElement): void {
    if (this.isUploadingLogo) return;
    input.value = '';
    input.click();
  }

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.notificationService.showError('Please upload an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.notificationService.showError('Logo must be 5 MB or smaller.');
      return;
    }

    this.isUploadingLogo = true;
    this.logoFileName = file.name;

    this.settingsService.uploadFile(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (url) => {
          this.form.patchValue({ logoUrl: url });
          this.isUploadingLogo = false;
          this.notificationService.showSuccess('Logo uploaded.');
        },
        error: () => {
          this.isUploadingLogo = false;
          this.notificationService.showError('Logo upload failed.');
        }
      });
  }

  clearLogo(): void {
    this.form.patchValue({ logoUrl: '' });
    this.logoFileName = null;
  }

  toggleSection(key: string): void {
    const section = this.fieldConfig.sections[key];
    if (!section) return;
    section.visible = !section.visible;
  }

  toggleField(group: FieldGroupKey, key: string): void {
    const field = this.fieldConfig[group][key];
    if (!field) return;
    field.visible = !field.visible;
  }

  isSectionVisible(key: string): boolean {
    return this.fieldConfig.sections[key]?.visible !== false;
  }

  isFieldVisible(group: FieldGroupKey, key: string): boolean {
    return this.fieldConfig[group][key]?.visible !== false;
  }

  get currentLogoUrl(): string | null {
    const value = this.form.get('logoUrl')?.value;
    return value?.trim() ? value.trim() : null;
  }

  get usingDefaultTemplate(): boolean {
    return this.savedTemplate != null && !this.savedTemplate.isCustom;
  }

  private applyTemplate(template: PayslipTemplate): void {
    this.form.patchValue({
      name: template.name || 'Default',
      logoUrl: template.logoUrl ?? '',
      headerTitle: template.headerTitle || 'SALARY SLIP',
      headerSubtitle: template.headerSubtitle ?? '',
      companyAddress: template.companyAddress ?? '',
      footerText: template.footerText ?? '',
      primaryColor: template.primaryColor || '#1E3A5F',
      accentColor: template.accentColor || '#DBEAFE',
      sectionTitleColor: template.sectionTitleColor || '#E2E8F0',
      showGeneratedAt: template.showGeneratedAt,
      showPayrollCalculatedAt: template.showPayrollCalculatedAt,
      hideZeroAmountLines: template.fieldConfig?.options?.hideZeroAmountLines ?? true,
      hideEmptyJsonSections: template.fieldConfig?.options?.hideEmptyJsonSections ?? true
    });

    this.fieldConfig = this.mergeFieldConfig(template.fieldConfig);
    this.logoFileName = this.extractFileName(template.logoUrl);
  }

  private buildRequest(): UpsertPayslipTemplateRequest {
    const raw = this.form.getRawValue();
    return {
      name: raw.name,
      logoUrl: raw.logoUrl || null,
      headerTitle: raw.headerTitle,
      headerSubtitle: raw.headerSubtitle || null,
      companyAddress: raw.companyAddress || null,
      footerText: raw.footerText || null,
      primaryColor: raw.primaryColor,
      accentColor: raw.accentColor,
      sectionTitleColor: raw.sectionTitleColor,
      showGeneratedAt: !!raw.showGeneratedAt,
      showPayrollCalculatedAt: !!raw.showPayrollCalculatedAt,
      fieldConfig: {
        ...this.fieldConfig,
        options: {
          hideZeroAmountLines: !!raw.hideZeroAmountLines,
          hideEmptyJsonSections: !!raw.hideEmptyJsonSections
        }
      }
    };
  }

  private mergeFieldConfig(config?: PayslipTemplateFieldConfig | null): PayslipTemplateFieldConfig {
    const defaults = createDefaultPayslipFieldConfig();
    if (!config) return defaults;

    return {
      sections: { ...defaults.sections, ...(config.sections ?? {}) },
      employeeFields: { ...defaults.employeeFields, ...(config.employeeFields ?? {}) },
      earningFields: { ...defaults.earningFields, ...(config.earningFields ?? {}) },
      deductionFields: { ...defaults.deductionFields, ...(config.deductionFields ?? {}) },
      netPayFields: { ...defaults.netPayFields, ...(config.netPayFields ?? {}) },
      options: { ...defaults.options, ...(config.options ?? {}) }
    };
  }

  private extractFileName(url?: string | null): string | null {
    if (!url) return null;
    try {
      const parts = url.split('/');
      return parts[parts.length - 1] || null;
    } catch {
      return null;
    }
  }

  private revokePreviewUrl(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
      this.safePreviewUrl = null;
    }
  }
}
