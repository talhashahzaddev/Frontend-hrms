import { Injectable } from '@angular/core';
import { LocalizationService } from './localization.service';

type DateStyle = Intl.DateTimeFormatOptions['dateStyle'];
type TimeStyle = Intl.DateTimeFormatOptions['timeStyle'];

@Injectable({
  providedIn: 'root'
})
export class DateTimeFormatService {
  constructor(private localization: LocalizationService) {}

  formatTime(
    value: string | Date | null | undefined,
    options?: { includeSeconds?: boolean; fallback?: string }
  ): string {
    const fallback = options?.fallback ?? '--';
    if (value === null || value === undefined || value === '') return fallback;

    const parsed = this.parseTimeValue(value);
    if (!parsed) return fallback;

    const formatOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit'
    };
    if (options?.includeSeconds) {
      formatOptions.second = '2-digit';
    }

    const timeZone = parsed.isTimeOnly ? 'UTC' : this.localization.getTimeZone();
    if (timeZone) {
      formatOptions.timeZone = timeZone;
    }

    return new Intl.DateTimeFormat(this.localization.getCulture(), formatOptions).format(parsed.date);
  }

  formatDateTime(
    value: string | Date | null | undefined,
    options?: { dateStyle?: DateStyle; timeStyle?: TimeStyle; fallback?: string }
  ): string {
    const fallback = options?.fallback ?? '--';
    if (value === null || value === undefined || value === '') return fallback;

    const date = this.parseDateValue(value);
    if (!date) return fallback;

    const formatOptions: Intl.DateTimeFormatOptions = {
      dateStyle: options?.dateStyle ?? 'short',
      timeStyle: options?.timeStyle ?? 'short'
    };

    const timeZone = this.localization.getTimeZone();
    if (timeZone) {
      formatOptions.timeZone = timeZone;
    }

    return new Intl.DateTimeFormat(this.localization.getCulture(), formatOptions).format(date);
  }

  formatDate(
    value: string | Date | null | undefined,
    options?: { dateStyle?: DateStyle; fallback?: string }
  ): string {
    const fallback = options?.fallback ?? '--';
    if (value === null || value === undefined || value === '') return fallback;

    const formatOptions: Intl.DateTimeFormatOptions = {
      dateStyle: options?.dateStyle ?? 'medium'
    };

    // Date-only values (a `date` column, or a midnight timestamp) must show the
    // literal calendar date and never shift across timezones. Build the date from
    // its exact Y/M/D components and render in UTC so the output is offset-proof.
    const dateOnly = this.parseDateOnly(value);
    if (dateOnly) {
      formatOptions.timeZone = 'UTC';
      return new Intl.DateTimeFormat(this.localization.getCulture(), formatOptions).format(dateOnly);
    }

    // A real timestamp rendered as a date: use the company timezone so the
    // calendar date reflects the configured zone (not the viewer's browser).
    const date = this.parseDateValue(value);
    if (!date) return fallback;

    const timeZone = this.localization.getTimeZone();
    if (timeZone) {
      formatOptions.timeZone = timeZone;
    }

    return new Intl.DateTimeFormat(this.localization.getCulture(), formatOptions).format(date);
  }

  /**
   * Returns a UTC Date built from the literal Y/M/D of a date-only value
   * ("2026-06-04", "2026-06-04T00:00:00", "...00:00:00.000Z"), or null when the
   * value carries a meaningful time-of-day (a real timestamp).
   */
  private parseDateOnly(value: string | Date): Date | null {
    if (value instanceof Date) return null;
    if (typeof value !== 'string') return null;

    const match = value
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ]00:00(?::00)?(?:\.0+)?Z?)?$/);
    if (!match) return null;

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    return new Date(Date.UTC(year, month - 1, day));
  }

  private parseTimeValue(
    value: string | Date
  ): { date: Date; isTimeOnly: boolean } | null {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : { date: value, isTimeOnly: false };
    }

    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (this.looksLikeDateTime(trimmed)) {
      const date = this.parseDateValue(trimmed);
      if (date) return { date, isTimeOnly: false };
    }

    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?$/);
    if (!match) return null;

    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const second = match[3] ? parseInt(match[3], 10) : 0;
    const meridiem = match[4]?.toUpperCase();

    if (meridiem) {
      hour = hour % 12;
      if (meridiem === 'PM') hour += 12;
    }

    if (hour > 23 || minute > 59 || second > 59) return null;

    const date = new Date(Date.UTC(1970, 0, 1, hour, minute, second));
    return { date, isTimeOnly: true };
  }

  private parseDateValue(value: string | Date): Date | null {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const normalized =
      /^\d{4}-\d{2}-\d{2}\s/.test(trimmed) ? trimmed.replace(' ', 'T') : trimmed;
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date;
  }

  private looksLikeDateTime(value: string): boolean {
    return value.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(value);
  }
}
