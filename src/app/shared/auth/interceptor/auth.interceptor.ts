import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { LocalStorageService } from 'ngx-webstorage';
import { environment } from '../../../../environment/environment';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

// Services
import { AccountStateService } from '../../service/state/account-state.service';
import { AccountService } from '../service/account.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const localStorageService = inject(LocalStorageService);
  const accountStateService = inject(AccountStateService);
  const accountService = inject(AccountService);
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

  const token: string | null = localStorageService.retrieve('authenticationToken');

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

        localStorageService.clear('authenticationToken');  // Remove authentication token
        accountStateService.remove(); // Remove logged in user
        accountService.authenticate(null); // Clear authentication state
        router.navigate(['/login']);   // Redirect to login
      }

      return throwError(() => error);
    })
  );
};