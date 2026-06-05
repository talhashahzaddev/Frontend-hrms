import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';

import { HolidayService } from '../../services/holiday.service';
import { CompanyHoliday, EmployeeRestrictedHoliday } from '../../../../core/models/holiday.models';
import { NotificationService } from '../../../../core/services/notification.service';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-restricted-holiday-picker',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule
  ],
  templateUrl: './restricted-holiday-picker.component.html',
  styleUrls: ['./restricted-holiday-picker.component.scss']
})
export class RestrictedHolidayPickerComponent implements OnInit {
  availableHolidays = signal<CompanyHoliday[]>([]);
  myHolidays = signal<EmployeeRestrictedHoliday[]>([]);
  loading = signal(false);
  actionLoading = signal<string | null>(null);
  currentYear = new Date().getFullYear();

  selectedIds = computed(() => {
    return new Set(this.myHolidays()
      .filter(h => h.status === 'selected')
      .map(h => h.companyHolidayId));
  });

  upcomingHolidays = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.availableHolidays().filter(h => new Date(h.holidayDate) >= today);
  });

  pastHolidays = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.availableHolidays().filter(h => new Date(h.holidayDate) < today);
  });

  selectedCount = computed(() => this.selectedIds().size);

  constructor(
    private holidayService: HolidayService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.holidayService.getMyAvailableRestrictedHolidays().subscribe({
      next: (holidays) => {
        this.availableHolidays.set(holidays);
        this.loadMyHolidays();
      },
      error: (err: any) => {
        this.notification.showError(err?.error?.message || 'Failed to load restricted holidays');
        this.loading.set(false);
      }
    });
  }

  loadMyHolidays(): void {
    this.holidayService.getMyRestrictedHolidays().subscribe({
      next: (holidays: EmployeeRestrictedHoliday[]) => {
        this.myHolidays.set(holidays);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.notification.showError(err?.error?.message || 'Failed to load your holidays');
        this.loading.set(false);
      }
    });
  }

  isSelected(holidayId: string): boolean {
    return this.selectedIds().has(holidayId);
  }

  isPast(dateStr: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr) < today;
  }

  selectHoliday(holidayId: string): void {
    this.actionLoading.set(holidayId);
    this.holidayService.selectRestrictedHoliday({ companyHolidayId: holidayId }).subscribe({
      next: () => {
        this.notification.showSuccess('Holiday selected successfully');
        this.loadMyHolidays();
        this.actionLoading.set(null);
      },
      error: (err: any) => {
        this.notification.showError(err?.error?.message || 'Failed to select holiday');
        this.actionLoading.set(null);
      }
    });
  }

  cancelHoliday(selectionId: string): void {
    this.actionLoading.set(selectionId);
    this.holidayService.cancelRestrictedHoliday(selectionId).subscribe({
      next: () => {
        this.notification.showSuccess('Holiday selection cancelled');
        this.loadMyHolidays();
        this.actionLoading.set(null);
      },
      error: (err: any) => {
        this.notification.showError(err?.error?.message || 'Failed to cancel holiday');
        this.actionLoading.set(null);
      }
    });
  }

  getSelectionId(holidayId: string): string | undefined {
    return this.myHolidays().find(h => h.companyHolidayId === holidayId && h.status === 'selected')?.id;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getDayOfWeek(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long' });
  }

  getDaysUntil(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
}
