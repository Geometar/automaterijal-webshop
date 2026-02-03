import {
  APP_INITIALIZER,
  ApplicationConfig,
  LOCALE_ID,
  provideZoneChangeDetection,
} from '@angular/core';
import { authInterceptor } from './shared/auth/interceptor/auth.interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideClientHydration } from '@angular/platform-browser';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import {
  provideNgxWebstorage,
  withLocalStorage,
  withNgxWebstorageConfig,
  withSessionStorage,
} from 'ngx-webstorage';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import { routes } from './app.routes';

// Services
import { AccountService } from './shared/auth/service/account.service';
import { AuthServerProvider } from './shared/auth/service/auth-jwt.service';
import { AccountStateService } from './shared/service/state/account-state.service';


export const appInitializer = (
  accountService: AccountService,
  accountStateService: AccountStateService,
  authServerProvider: AuthServerProvider
) => {
  return () => {
    const account = accountStateService.get();
    const token = authServerProvider.getToken();

    if (account?.ppid) {
      // 🧠 Ručno ubacujemo postojeći korisnik iz sessionStorage u memoriju
      accountService.authenticate(account);
      return Promise.resolve(); // ⬅️ Vrati odmah jer si već "ulogovan"
    }

    // Ako nema tokena, ne zovi partner/read i ne salji na login.
    if (!token) {
      accountService.authenticate(null);
      return Promise.resolve();
    }

    // 🔄 Ako token postoji, probaj da pozoveš API (npr. nakon token refresh)
    return accountService.identity().toPromise();
  };
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withDisabledInitialNavigation()),
    provideClientHydration(),
    provideAnimationsAsync(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideNgxWebstorage(
      withNgxWebstorageConfig({
        prefix: '',
        separator: '',
        caseSensitive: false,
      }),
      withLocalStorage(), // Enable local storage
      withSessionStorage() // Enable session storage
    ),
    { provide: LOCALE_ID, useValue: 'sr-Latn' }, {
      provide: APP_INITIALIZER,
      useFactory: appInitializer,
      deps: [AccountService, AccountStateService, AuthServerProvider],
      multi: true,
    }
  ],
};
