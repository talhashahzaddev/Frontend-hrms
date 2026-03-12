import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SettingsService, OrganizationSettings } from '../../services/settings.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { NotificationService } from '../../../../core/services/notification.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest } from 'rxjs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ChangeDetectorRef } from '@angular/core';
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
  isSuperAdmin = false;
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
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private notification: NotificationService,
    private notificationService: NotificationService,
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
    this.checkUserRole();
    this.loadTimeZones();
    this.generateCultureOptions();
    if (this.isSuperAdmin) {
      this.loadSettings();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkUserRole(): void {
    this.isSuperAdmin = this.authService.hasRole('Super Admin');
  }


  loadTimeZones(): void {
    this.settingsService.getAllTimeZones().subscribe({
      next: (countries: any[]) => {

        this.timezone = countries
          .filter(c => c.capital?.length && c.timezones?.length)
          .map(country => ({
            value: country.timezones[0],
            label: `${country.name.common}/${country.capital[0]}`
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

        this.cdr.markForCheck();
      },
      error: () => {
        this.notification.showError('Failed to load timezones');
        this.cdr.markForCheck();
      }
    });
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
            this.settingsForm.patchValue({ timeZone: settings.timeZone });
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
    if (!this.isSuperAdmin) return;
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectCurrency(currency: { code: string; name: string; symbol: string }): void {
    this.settingsForm.patchValue({ currency: currency.code });
    this.isDropdownOpen = false;
  }


  onSave(): void {
    if (this.settingsForm.invalid || !this.isSuperAdmin) {
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

  // openManageOfficeIPsDialog(): void {
  //   this.dialog.open(ManageOfficeIPsDialogComponent, {
  //     width: '900px',
  //     maxWidth: '95vw',
  //     panelClass: 'manage-office-ips-dialog',
  //     data: {}
  //   });
  // }
}
