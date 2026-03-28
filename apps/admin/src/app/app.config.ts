import {
  ApplicationConfig,
  APP_INITIALIZER,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { apiPrefixInterceptor } from './core/api-prefix.interceptor';
import { authInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/auth.service';

function initAuth(auth: AuthService) {
  return () => auth.bootstrap();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([apiPrefixInterceptor, authInterceptor]),
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
