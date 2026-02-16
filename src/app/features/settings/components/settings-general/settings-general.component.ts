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
import { ManageOfficeIPsDialogComponent } from '../../../attendance/components/manage-office-ips-dialog/manage-office-ips-dialog.component';

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

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {
    this.settingsForm = this.fb.group({
      currency: ['', Validators.required]
    });
    this.availableCurrencies = this.settingsService.getAvailableCurrencies();
  }

  ngOnInit(): void {
    this.checkUserRole();
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
    
    if (!selectedCurrency) {
      this.notificationService.showError('Please select a currency');
      return;
    }

    if (selectedCurrency === this.currentCurrency) {
      this.notificationService.showInfo('Currency is already set to this value');
      return;
    }

    this.isSaving = true;
    this.settingsService.updateCurrency(selectedCurrency)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.currentCurrency = selectedCurrency;
          this.notificationService.showSuccess('Currency updated successfully');
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error updating currency:', error);
          this.notificationService.showError(error.message || 'Failed to update currency');
          this.isSaving = false;
        }
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

  openManageOfficeIPsDialog(): void {
    this.dialog.open(ManageOfficeIPsDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'manage-office-ips-dialog',
      data: {}
    });
  }
}
