import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { LocalStorageService } from 'ngx-webstorage';
import { environment } from '../../../../environment/environment';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

// Services
import { AccountService } from '../service/account.service';
import { AccountStateService } from '../../service/state/account-state.service';

let scheduledLogoutForToken: string | null = null;
let logoutTimer: ReturnType<typeof setTimeout> | null = null;

function decodeJwtPayload(token: string): any | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getJwtExpiryMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const expSeconds = payload?.exp;
  if (typeof expSeconds !== 'number') return null;
  return expSeconds * 1000;
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const accountService = inject(AccountService);
  const accountStateService = inject(AccountStateService);
  const localStorageService = inject(LocalStorageService);
  const router = inject(Router);

  if (
    !request.url ||
    (request.url.startsWith('http') &&
      !(environment.apiUrl && request.url.startsWith(environment.apiUrl)))
  ) {
    return next(
      request.clone({
        setHeaders: {
          'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      })
    );
  }

  const isBrowser = typeof window !== 'undefined';
  const token: string | null = isBrowser
    ? localStorageService.retrieve('authenticationToken')
    : null;

  const performLogout = (): void => {
    if (isBrowser) {
      localStorageService.clear('authenticationToken');
      sessionStorage.clear();
    }
    if (logoutTimer) {
      clearTimeout(logoutTimer);
      logoutTimer = null;
    }
    scheduledLogoutForToken = null;
    accountStateService.remove();
    accountService.authenticate(null);
    if (router.url !== '/login') {
      router.navigate(['/login']);
    }
  };

  if (token) {
    const expiryMs = getJwtExpiryMs(token);
    if (typeof expiryMs === 'number') {
      const now = Date.now();
      if (expiryMs <= now) {
        performLogout();
        return throwError(
          () => new HttpErrorResponse({ status: 401, statusText: 'JWT expired' })
        );
      }

      if (scheduledLogoutForToken !== token) {
        if (logoutTimer) clearTimeout(logoutTimer);
        scheduledLogoutForToken = token;
        const delayMs = Math.max(0, expiryMs - now);
        logoutTimer = setTimeout(() => performLogout(), delayMs);
      }
    }
  }

  const modifiedRequest = request.clone({
    setHeaders: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
    },
  });

  return next(modifiedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 || error.status === 403) {
        // Optional: check if backend returned a specific error message
        console.warn('Authentication expired or unauthorized. Logging out.');
        performLogout();
      }

      return throwError(() => error);
    })
  );
};
