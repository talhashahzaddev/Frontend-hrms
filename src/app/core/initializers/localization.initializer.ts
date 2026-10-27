import { firstValueFrom } from 'rxjs';
import { LocalizationService } from '@core/services/localization.service';

export function localizationInitializer(localizationService: LocalizationService) {
  return () => {
    const publicAuthRoutes = [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
      '/set-password'
    ];
    const currentPath = window.location.pathname.replace(/\/+$/, '').toLowerCase();

    if (publicAuthRoutes.includes(currentPath)) {
      return Promise.resolve();
    }

    return firstValueFrom(localizationService.loadOrganizationLocalization());
  };
}
