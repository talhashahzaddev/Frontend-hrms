import { Pipe, PipeTransform } from '@angular/core';
import { DateTimeFormatService } from '@core/services/date-time-format.service';

type DateStyle = Intl.DateTimeFormatOptions['dateStyle'];
type TimeStyle = Intl.DateTimeFormatOptions['timeStyle'];

@Pipe({
  name: 'localizedDateTime',
  standalone: true,
  pure: false
})
export class LocalizedDateTimePipe implements PipeTransform {
  constructor(private formatter: DateTimeFormatService) {}

  transform(
    value: string | Date | null | undefined,
    dateStyle: DateStyle = 'short',
    timeStyle: TimeStyle = 'short',
    fallback = '--'
  ): string {
    return this.formatter.formatDateTime(value, { dateStyle, timeStyle, fallback });
  }
}
