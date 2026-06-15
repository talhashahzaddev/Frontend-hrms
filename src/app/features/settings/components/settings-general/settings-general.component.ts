import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SettingsService, OrganizationSettings } from '../../services/settings.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { NotificationService } from '../../../../core/services/notification.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest } from 'rxjs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { LocalizationService } from '../../../../core/services/localization.service';
import { SharedCommonModule } from '@shared/shared-common.module';
export interface UpdateLocalizationRequest {
  currency: string;
  timeZone: string;
  culture: string;
}

export interface CultureOption {
  code: string;
  name: string;
  preview: string;
}




@Component({
  selector: 'app-settings-general',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  templateUrl: './settings-general.component.html',
  styleUrls: ['./settings-general.component.scss']
})
export class SettingsGeneralComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  settingsForm: FormGroup;
  organizationSettings: OrganizationSettings | null = null;
  availableCurrencies: Array<{ code: string; name: string; symbol: string }> = [];
  isLoading = false;
  isSaving = false;
  isDropdownOpen = false;
  currentCurrency: string | null = null;
  currentTimeZone: string | null = null;
  currentCulture: string | null = null;
  updatelocalizationRequest: UpdateLocalizationRequest | null = null;
  availableCultures: CultureOption[] = [];
  // availableTimeZones: string[] = [];

  timezone: { value: string; label: string }[] = [];
  timeSlots: string[] = [];
  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
    private notification: NotificationService,
    private notificationService: NotificationService,
    private localizationService: LocalizationService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.settingsForm = this.fb.group({
      currency: ['', Validators.required],
      timeZone: ['', Validators.required], // Yeh add karein
      culture: ['', Validators.required]
    });
    this.availableCurrencies = this.settingsService.getAvailableCurrencies();
  }

  ngOnInit(): void {
    this.loadTimeZones();
    this.generateCultureOptions();
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTimeZones(): void {
    // Hardcoded timezone data
    const hardcodedTimezones = [
      { value: 'America/New_York', label: 'United States/New York' },
      { value: 'America/Chicago', label: 'United States/Chicago' },
      { value: 'America/Denver', label: 'United States/Denver' },
      { value: 'America/Los_Angeles', label: 'United States/Los Angeles' },
      { value: 'Europe/London', label: 'United Kingdom/London' },
      { value: 'Europe/Paris', label: 'France/Paris' },
      { value: 'Europe/Berlin', label: 'Germany/Berlin' },
      { value: 'Europe/Madrid', label: 'Spain/Madrid' },
      { value: 'Europe/Amsterdam', label: 'Netherlands/Amsterdam' },
      { value: 'Europe/Moscow', label: 'Russia/Moscow' },
      { value: 'Asia/Dubai', label: 'United Arab Emirates/Dubai' },
      { value: 'Asia/Kolkata', label: 'India/Kolkata' },
      { value: 'Asia/Bangkok', label: 'Thailand/Bangkok' },
      { value: 'Asia/Hong_Kong', label: 'China/Hong Kong' },
      { value: 'Asia/Shanghai', label: 'China/Shanghai' },
      { value: 'Asia/Tokyo', label: 'Japan/Tokyo' },
      { value: 'Asia/Seoul', label: 'South Korea/Seoul' },
      { value: 'Asia/Singapore', label: 'Singapore/Singapore' },
      { value: 'Asia/Manila', label: 'Philippines/Manila' },
      { value: 'Australia/Sydney', label: 'Australia/Sydney' },
      { value: 'Australia/Melbourne', label: 'Australia/Melbourne' },
      { value: 'Australia/Brisbane', label: 'Australia/Brisbane' },
      { value: 'Pacific/Auckland', label: 'New Zealand/Auckland' },
      { value: 'Africa/Cairo', label: 'Egypt/Cairo' },
      { value: 'Africa/Johannesburg', label: 'South Africa/Johannesburg' },
      { value: 'Africa/Lagos', label: 'Nigeria/Lagos' },
      { value: 'America/Toronto', label: 'Canada/Toronto' },
      { value: 'America/Vancouver', label: 'Canada/Vancouver' },
      { value: 'America/Mexico_City', label: 'Mexico/Mexico City' },
      { value: 'America/Sao_Paulo', label: 'Brazil/Sao Paulo' },
      { value: 'America/Buenos_Aires', label: 'Argentina/Buenos Aires' }
    ];

    this.timezone = hardcodedTimezones.sort((a, b) => a.label.localeCompare(b.label));
    this.normalizeTimeZoneSelection();
    
    this.cdr.markForCheck();
  }



  
  loadSettings(): void {
    this.isLoading = true;
    this.settingsService.getOrganizationSettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (settings) => {
          this.organizationSettings = settings;
          this.currentCurrency = settings.currency;
          if (settings.currency) {
            this.settingsForm.patchValue({ currency: settings.currency });
            const normalizedTimeZone = this.normalizeTimeZoneValue(settings.timeZone);
            this.settingsForm.patchValue({ timeZone: normalizedTimeZone });
            this.settingsForm.patchValue({ culture: settings.culture });
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading settings:', error);
          this.notificationService.showError('Failed to load organization settings');
          this.isLoading = false;
        }
      });
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectCurrency(currency: { code: string; name: string; symbol: string }): void {
    this.settingsForm.patchValue({ currency: currency.code });
    this.isDropdownOpen = false;
  }


  onSave(): void {
    if (this.settingsForm.invalid) {
      return;
    }

    const selectedCurrency = this.settingsForm.get('currency')?.value;
    const selectedTimeZone = this.settingsForm.get('timeZone')?.value;
    const selectedCulture = this.settingsForm.get('culture')?.value;


    const request: UpdateLocalizationRequest = {
      currency: selectedCurrency,
      timeZone: selectedTimeZone,
      culture: selectedCulture
    };

    this.localizationService.setLocalization(selectedCulture, selectedTimeZone);

    this.isSaving = true;

    this.settingsService.updateLocalization(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update current values
          this.currentCurrency = selectedCurrency;
          this.currentTimeZone = selectedTimeZone;
          this.currentCulture = selectedCulture;

          this.notificationService.showSuccess('Settings updated successfully');
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error updating settings:', error);
          this.notificationService.showError(
            error.message || 'Failed to update settings'
          );
          this.isSaving = false;
        }
      });
  }



  // 5. Ye function codes ko human-readable formats mein convert karega
  private generateCultureOptions(): void {
    // Ye wahi codes hain jo aapki image mein thay
    const codes = [
      'en-US', 'en-GB', 'ur-PK', 'az-AZ', 'ar-SA', 'be-BY',
      'bg-BG', 'bn-BD', 'fr-FR', 'de-DE', 'tr-TR'
    ];

    const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
    const now = new Date();

    this.availableCultures = codes.map(code => {
      const formatter = new Intl.DateTimeFormat(code, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      return {
        code: code,
        name: displayNames.of(code.split('-')[0]) || code,
        preview: formatter.format(now) // Example: "Mar 5, 2026, 12:00 PM"
      };
    });
  }

hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Settings', 'Company Name', actionKey);
  }




  getCurrencyDisplay(currencyCode: string | null): string {
    if (!currencyCode) return 'Not Set';
    const currency = this.availableCurrencies.find(c => c.code === currencyCode);
    return currency ? `${currency.code} - ${currency.name} (${currency.symbol})` : currencyCode;
  }

  getCurrencySymbol(currencyCode: string | null): string {
    if (!currencyCode) return '';
    const currency = this.availableCurrencies.find(c => c.code === currencyCode);
    return currency ? currency.symbol : '';
  }

  private normalizeTimeZoneSelection(): void {
    const current = this.settingsForm.get('timeZone')?.value;
    const normalized = this.normalizeTimeZoneValue(current);
    if (normalized && normalized !== current) {
      this.settingsForm.patchValue({ timeZone: normalized });
    }
  }

  private normalizeTimeZoneValue(value?: string | null): string | null {
    if (!value) return null;
    const direct = this.timezone.find(tz => tz.value === value)?.value;
    if (direct) return direct;
    const byLabel = this.timezone.find(tz => tz.label === value);
    return byLabel?.value ?? value;
  }

  // openManageOfficeIPsDialog(): void {
  //   this.dialog.open(ManageOfficeIPsDialogComponent, {
  //     width: '900px',
  //     maxWidth: '95vw',
  //     panelClass: 'manage-office-ips-dialog',
  //     data: {}
  //   });
  // }
}
