import { firstValueFrom } from 'rxjs';
import { LocalizationService } from '@core/services/localization.service';

export function localizationInitializer(localizationService: LocalizationService) {
  return () => firstValueFrom(localizationService.loadOrganizationLocalization());
}
