import { EnvironmentProviders, Provider, importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatNativeDateModule } from '@angular/material/core';
import { ToastrModule } from 'ngx-toastr';
import { MessageService } from 'primeng/api';

/** Minimal stand-in for a MatDialogRef so dialog components can be created in tests. */
export const dialogRefStub = {
  close: jasmine.createSpy('close'),
  afterClosed: () => ({ subscribe: () => ({ unsubscribe() {} }) }),
  backdropClick: () => ({ subscribe: () => ({ unsubscribe() {} }) }),
  keydownEvents: () => ({ subscribe: () => ({ unsubscribe() {} }) }),
  updateSize: () => dialogRefStub,
  disableClose: false
};

/**
 * Providers that the real app registers in main.ts and most components depend on.
 * HTTP calls go to HttpTestingController, so no request ever leaves the browser.
 */
export function provideTestDefaults(dialogData: unknown = {}): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
    provideNoopAnimations(),
    importProvidersFrom(ToastrModule.forRoot(), MatNativeDateModule),
    MessageService,
    { provide: MatDialogRef, useValue: dialogRefStub },
    { provide: MAT_DIALOG_DATA, useValue: dialogData }
  ];
}

/** Builds an unsigned JWT-shaped string with the given payload (enough for client-side decoding). */
export function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}
