import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { SettingsService, OrgOnboardingConfigItem } from '../../services/settings.service';
import { SharedCommonModule } from '@shared/shared-common.module';

/** The hardcoded org ID used by the API */
const ORG_ID = 'd245460a-816b-43fb-8fb8-1944e65562c5';

export interface SectionField {
  fieldKey: string;
  label: string;
  enabled: boolean;
  required: boolean;
}

export interface ConfigSection {
  sectionKey: string;
  displayName: string;
  icon: string;
  description: string;
  fields: SectionField[];
}

@Component({
  selector: 'app-onboarding-configuration',
  standalone: true,
  imports: [
    SharedCommonModule,
    PageHeaderComponent,
    CommonModule,
    FormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule
  ],
  templateUrl: './onboarding-configuration.component.html',
  styleUrls: ['./onboarding-configuration.component.scss']
})
export class OnboardingConfigurationComponent implements OnInit {
  isSaving = false;
  isLoading = true;
  loadError = false;
  selectedTab = 0;

  readonly orgId = ORG_ID;

  sections: ConfigSection[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.loadConfiguration();
  }

  loadConfiguration(): void {
    this.isLoading = true;
    this.loadError = false;
    this.settingsService.getOrgOnboardingConfig().subscribe({
      next: (items) => {
        this.isLoading = false;
        this.buildSections(items);
      },
      error: () => {
        this.isLoading = false;
        this.loadError = true;
        this.notificationService.showError('Failed to load onboarding configuration.');
        this.buildSections([]);
      }
    });
  }

  private buildSections(items: OrgOnboardingConfigItem[]): void {
    const defaultSections: Array<{ sectionKey: string; displayName: string; icon: string; description: string; fields: Array<{ fieldKey: string; label: string }> }> = [
      {
        sectionKey: 'Personal Information',
        displayName: 'Personal Information',
        icon: 'person',
        description: 'Toggle fields used in the Personal Information step of onboarding.',
        fields: [
          { fieldKey: 'Profile Photo',    label: 'Profile Photo' },
          { fieldKey: 'Full Name',         label: 'Full Name' },
          { fieldKey: 'Job Title',         label: 'Job Title' },
          { fieldKey: 'Email Address',     label: 'Email Address' },
          { fieldKey: 'Phone Number',      label: 'Phone Number' },
          { fieldKey: 'Department',        label: 'Department' },
          { fieldKey: 'Gender',            label: 'Gender' },
          { fieldKey: 'Nationality',       label: 'Nationality' },
          { fieldKey: 'National ID/CNIC',  label: 'National ID / CNIC' },
          { fieldKey: 'Resume/CV',         label: 'Resume / CV' },
        ]
      },
      {
        sectionKey: 'Qualification Details',
        displayName: 'Qualification Details',
        icon: 'school',
        description: 'Configure fields for the education / qualification step.',
        fields: [
          { fieldKey: 'Degree Level',      label: 'Degree Level' },
          { fieldKey: 'Institute Name',    label: 'Institution Name' },
          { fieldKey: 'Field of Study',    label: 'Field of Study' },
          { fieldKey: 'GPA',               label: 'GPA' },
          { fieldKey: 'ATTACH DOCOMENT',   label: 'Attach Document' },
          { fieldKey: 'Discription',       label: 'Description' },
        ]
      },
      {
        sectionKey: 'Work Experience',
        displayName: 'Work Experience',
        icon: 'work',
        description: 'Manage fields for the work experience step.',
        fields: [
          { fieldKey: 'JOB TITTLE',              label: 'Job Title' },
          { fieldKey: 'COMPANY',                 label: 'Company' },
          { fieldKey: 'EMPLOYMENT TYPE',         label: 'Employment Type' },
          { fieldKey: 'LOCATION',                label: 'Location' },
          { fieldKey: 'SATRT DATE',              label: 'Start Date' },
          { fieldKey: 'END DATE',                label: 'End Date' },
          { fieldKey: 'Currently working here',  label: 'Currently Working Here' },
          { fieldKey: 'KEY RESPONSIBILTIES',     label: 'Key Responsibilities' },
          { fieldKey: 'ATTACH DOCOMENT',         label: 'Attach Document' },
        ]
      },
      {
        sectionKey: 'BANK DETAILS',
        displayName: 'Bank Details',
        icon: 'account_balance',
        description: 'Control which bank fields are shown during onboarding.',
        fields: [
          { fieldKey: 'ACCOUNT HOLDER NAME',   label: 'Account Holder Name' },
          { fieldKey: 'PAYMENT METHOD',         label: 'Payment Method' },
          { fieldKey: 'ACCOUNT NUMBER',         label: 'Account Number' },
          { fieldKey: 'CONFIRM ACCOUNT NUMBER', label: 'Confirm Account Number' },
          { fieldKey: 'BANK NAME',              label: 'Bank Name' },
          { fieldKey: 'IBN/SWIFT CODE',         label: 'IBAN / SWIFT Code' },
          { fieldKey: 'BRANCH NAME',            label: 'Branch Name' },
          { fieldKey: 'BRANCH CODE',            label: 'Branch Code' },
          { fieldKey: 'BANK & BRANCH',          label: 'Bank & Branch' },
        ]
      }
    ];

    const lookup = new Map<string, OrgOnboardingConfigItem>();
    for (const item of items) {
      const key = `${item.section.toUpperCase()}:::${item.fieldKey.toUpperCase()}`;
      lookup.set(key, item);
    }

    this.sections = defaultSections.map(sec => ({
      sectionKey: sec.sectionKey,
      displayName: sec.displayName,
      icon: sec.icon,
      description: sec.description,
      fields: sec.fields.map(f => {
        const key = `${sec.sectionKey.toUpperCase()}:::${f.fieldKey.toUpperCase()}`;
        const apiItem = lookup.get(key);
        return {
          fieldKey: f.fieldKey,
          label: f.label,
          enabled: apiItem ? apiItem.enabled : true,
          required: apiItem ? apiItem.required : false
        };
      })
    }));
  }

  toggleEnabled(field: SectionField): void {
    field.enabled = !field.enabled;
    if (!field.enabled) {
      field.required = false;
    }
  }

  toggleRequired(field: SectionField): void {
    if (!field.enabled) return;
    field.required = !field.required;
  }

  saveConfiguration(): void {
    this.isSaving = true;
    const items: OrgOnboardingConfigItem[] = [];
    for (const sec of this.sections) {
      for (const f of sec.fields) {
        items.push({
          organizationId: this.orgId,
          section: sec.sectionKey,
          fieldKey: f.fieldKey,
          enabled: f.enabled,
          required: f.required
        });
      }
    }
    this.settingsService.updateOrgOnboardingConfig(items).subscribe({
      next: () => {
        this.isSaving = false;
        this.notificationService.showSuccess('Onboarding configuration saved successfully.');
      },
      error: (err) => {
        this.isSaving = false;
        this.notificationService.showError(err?.message || 'Failed to save onboarding configuration.');
      }
    });
  }
}
