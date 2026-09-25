import { Pipe, PipeTransform } from '@angular/core';
import { DateTimeFormatService } from '@core/services/date-time-format.service';

type DateStyle = Intl.DateTimeFormatOptions['dateStyle'];
type TimeStyle = Intl.DateTimeFormatOptions['timeStyle'];

@Pipe({
  name: 'localizedDate',
  standalone: true,
  pure: false
})
export class LocalizedDatePipe implements PipeTransform {
  constructor(private formatter: DateTimeFormatService) {}

  transform(
    value: string | Date | null | undefined,
    format?: string,
    _timezone?: string,
    _locale?: string
  ): string {
    if (value === null || value === undefined || value === '') return '';
    if (!format) {
      return this.formatter.formatDate(value, { dateStyle: 'medium', fallback: '' });
    }

    const normalized = format.toString();
    const lower = normalized.toLowerCase();

    if (lower.endsWith('time')) {
      const includeSeconds = lower.includes('mediumtime') || lower.includes('longtime');
      return this.formatter.formatTime(value, { includeSeconds, fallback: '' });
    }

    if (lower.endsWith('date')) {
      return this.formatter.formatDate(value, { dateStyle: this.mapDateStyle(lower), fallback: '' });
    }

    if (['short', 'medium', 'long', 'full'].includes(lower)) {
      return this.formatter.formatDateTime(value, {
        dateStyle: lower as DateStyle,
        timeStyle: this.mapTimeStyle(lower),
        fallback: ''
      });
    }

    const hasDateTokens = /y|M|d/.test(normalized);
    const hasTimeTokens = /H|h|m|s|a/.test(normalized);

    if (hasDateTokens && hasTimeTokens) {
      return this.formatter.formatDateTime(value, { dateStyle: 'short', timeStyle: 'short', fallback: '' });
    }

    if (hasTimeTokens) {
      const includeSeconds = /s/.test(normalized);
      return this.formatter.formatTime(value, { includeSeconds, fallback: '' });
    }

    return this.formatter.formatDate(value, { dateStyle: 'short', fallback: '' });
  }

  private mapDateStyle(format: string): DateStyle {
    if (format.startsWith('full')) return 'full';
    if (format.startsWith('long')) return 'long';
    if (format.startsWith('medium')) return 'medium';
    return 'short';
  }

  private mapTimeStyle(format: string): TimeStyle {
    if (format.startsWith('full')) return 'short';
    if (format.startsWith('long')) return 'short';
    if (format.startsWith('medium')) return 'medium';
    return 'short';
  }
}
