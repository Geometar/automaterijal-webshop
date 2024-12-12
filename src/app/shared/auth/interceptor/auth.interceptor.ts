import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { SessionStorageService } from 'ngx-webstorage';
import { environment } from '../../../../environment/environment';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const sessionStorageService = inject(SessionStorageService); // Inject the SessionStorageService

  // Check if the request URL should be intercepted
  if (
    !request.url ||
    (request.url.startsWith('http') &&
      !(environment.apiUrl && request.url.startsWith(environment.apiUrl)))
  ) {
    // Add cache-control headers for non-API requests
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

  // Retrieve the token from session storage
  const token: string | null = sessionStorageService.retrieve('authenticationToken');

  // Clone the request and add necessary headers
  const modifiedRequest = request.clone({
    setHeaders: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate'
    },
  });

  // Pass the modified request to the next handler
  return next(modifiedRequest);
};