import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LocalizedTimePipe } from './pipes/localized-time.pipe';
import { LocalizedDatePipe } from './pipes/localized-date.pipe';
import { LocalizedDateTimePipe } from './pipes/localized-date-time.pipe';

/**
 * Bundles Angular's CommonModule with the app's localization pipes so every
 * component that imports this module can use `localizedDate` / `localizedTime`
 * / `localizedDateTime` in its template without per-component imports.
 *
 * These pipes route all date/time rendering through DateTimeFormatService,
 * which applies the organization's Culture (12h/24h + date format) and the
 * company-configured timezone — the single source of truth for date/time display.
 */
@NgModule({
  imports: [
    CommonModule,
    LocalizedTimePipe,
    LocalizedDatePipe,
    LocalizedDateTimePipe
  ],
  exports: [
    CommonModule,
    LocalizedTimePipe,
    LocalizedDatePipe,
    LocalizedDateTimePipe
  ]
})
export class SharedCommonModule {}
