import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { SettingsService } from '../../services/settings.service';
import { OnboardingConfiguration } from '../../services/settings.service';

@Component({
  selector: 'app-onboarding-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './onboarding-configuration.component.html',
  styleUrls: ['./onboarding-configuration.component.scss']
})
export class OnboardingConfigurationComponent implements OnInit {
  unauthorized = false;
  isSaving = false;
  personalFields: Array<'name' | 'idNumber' | 'resume'> = ['name', 'idNumber', 'resume'];
  educationFields: Array<'documents' | 'university'> = ['documents', 'university'];
  experienceFields: Array<'documents' | 'endDate'> = ['documents', 'endDate'];
  configuration: OnboardingConfiguration = this.getDefaultConfiguration();

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    if (!this.authService.hasRole('Super Admin')) {
      this.unauthorized = true;
      return;
    }
    this.loadConfiguration('default');
  }

  loadConfiguration(orgId: string): void {
    this.settingsService.getOnboardingConfiguration(orgId).subscribe({
      next: (config) => {
        this.configuration = config;
      },
      error: () => {
        this.configuration = this.getDefaultConfiguration();
      }
    });
  }

  saveConfiguration(): void {
    this.isSaving = true;
    this.settingsService.saveOnboardingConfiguration('default', this.configuration).subscribe({
      next: () => {
        this.isSaving = false;
        this.notificationService.showSuccess('Onboarding configuration saved successfully.');
      },
      error: (error) => {
        this.isSaving = false;
        this.notificationService.showError(error?.message || 'Failed to save onboarding configuration.');
      }
    });
  }

  toggleField(section: 'personalInformation' | 'educationDetails' | 'workExperience', field: string): void {
    const current = (this.configuration as any)[section][field];
    current.enabled = !current.enabled;
    current.required = current.enabled; // If enabled, mark as required
  }

  getDefaultConfiguration(): OnboardingConfiguration {
    return {
      organizationId: 'default',
      personalInformation: {
        name: { enabled: true, required: true },
        idNumber: { enabled: true, required: true },
        resume: { enabled: true, required: false }
      },
      educationDetails: {
        university: { enabled: true, required: true },
        documents: { enabled: true, required: false }
      },
      workExperience: {
        endDate: { enabled: true, required: true },
        documents: { enabled: true, required: false }
      }
    };
  }
}
