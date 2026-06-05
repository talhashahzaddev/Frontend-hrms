import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HolidayService } from '../../services/holiday.service';
import { CatalogCountry, HolidayCatalog } from '../../../../core/models/holiday.models';

import { SharedCommonModule } from '@shared/shared-common.module';
// Country code to flag emoji mapping
const FLAG_OFFSETS: Record<string, string> = {};


@Component({
  selector: 'app-holiday-catalog-picker',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './holiday-catalog-picker.component.html',
  styleUrl: './holiday-catalog-picker.component.scss'
})
export class HolidayCatalogPickerComponent implements OnInit {
  step: 'country' | 'holidays' = 'country';

  countries: CatalogCountry[] = [];
  selectedCountry: CatalogCountry | null = null;
  loadingCountries = false;

  catalogHolidays: HolidayCatalog[] = [];
  selectedHolidayIds = new Set<string>();
  loadingHolidays = false;

  importType: 'mandatory' | 'restricted' | 'optional' = 'mandatory';
  importing = false;

  constructor(
    private holidayService: HolidayService,
    private dialogRef: MatDialogRef<HolidayCatalogPickerComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { year: number }
  ) {}

  ngOnInit(): void {
    this.loadCountries();
  }

  loadCountries(): void {
    this.loadingCountries = true;
    this.holidayService.getAvailableCountries().subscribe({
      next: (countries) => {
        this.countries = countries;
        this.loadingCountries = false;
      },
      error: () => {
        this.snackBar.open('Failed to load countries', 'Close', { duration: 3000 });
        this.loadingCountries = false;
      }
    });
  }

  selectCountry(country: CatalogCountry): void {
    this.selectedCountry = country;
  }

  loadHolidays(): void {
    if (!this.selectedCountry) return;
    this.loadingHolidays = true;
    this.step = 'holidays';
    this.selectedHolidayIds.clear();

    this.holidayService.getCatalogByCountry(this.selectedCountry.countryCode).subscribe({
      next: (holidays) => {
        this.catalogHolidays = holidays;
        this.loadingHolidays = false;
      },
      error: () => {
        this.snackBar.open('Failed to load holidays', 'Close', { duration: 3000 });
        this.loadingHolidays = false;
      }
    });
  }

  toggleHoliday(catalogId: string): void {
    if (this.selectedHolidayIds.has(catalogId)) {
      this.selectedHolidayIds.delete(catalogId);
    } else {
      this.selectedHolidayIds.add(catalogId);
    }
  }

  get allSelected(): boolean {
    return this.catalogHolidays.length > 0 && this.selectedHolidayIds.size === this.catalogHolidays.length;
  }

  get someSelected(): boolean {
    return this.selectedHolidayIds.size > 0;
  }

  toggleSelectAll(checked: boolean): void {
    if (checked) {
      this.catalogHolidays.forEach(h => this.selectedHolidayIds.add(h.catalogId));
    } else {
      this.selectedHolidayIds.clear();
    }
  }

  importSelected(): void {
    if (this.selectedHolidayIds.size === 0) return;
    this.importing = true;

    this.holidayService.importFromCatalog({
      catalogHolidayIds: Array.from(this.selectedHolidayIds),
      holidayType: this.importType,
      year: this.data?.year
    }).subscribe({
      next: (imported) => {
        this.importing = false;
        this.dialogRef.close({
          imported: true,
          message: `Successfully imported ${imported.length} holidays`
        });
      },
      error: (err: any) => {
        this.importing = false;
        this.snackBar.open(err.error?.message || 'Failed to import holidays', 'Close', { duration: 3000 });
      }
    });
  }

  getCountryFlag(countryCode: string): string {
    // Convert country code to regional indicator symbol (flag emoji)
    const code = countryCode.toUpperCase();
    if (code.length !== 2) return '🏳️';
    const offset = 0x1F1E6 - 65; // 'A' = 65
    const first = String.fromCodePoint(code.charCodeAt(0) + offset);
    const second = String.fromCodePoint(code.charCodeAt(1) + offset);
    return first + second;
  }
}
