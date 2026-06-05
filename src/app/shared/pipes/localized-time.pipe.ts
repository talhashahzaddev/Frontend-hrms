import { Pipe, PipeTransform } from '@angular/core';
import { DateTimeFormatService } from '@core/services/date-time-format.service';

@Pipe({
  name: 'localizedTime',
  standalone: true,
  pure: false
})
export class LocalizedTimePipe implements PipeTransform {
  constructor(private formatter: DateTimeFormatService) {}

  transform(
    value: string | Date | null | undefined,
    includeSeconds = false,
    fallback = '--'
  ): string {
    return this.formatter.formatTime(value, { includeSeconds, fallback });
  }
}
