import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../../environment/environment';
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { LocalStorageService } from 'ngx-webstorage';
import { Credentials, JwtToken } from '../../data-models/model';
import { isPlatformBrowser } from '@angular/common';

const LOGIN_URL = environment.apiUrl + '/api/auth/signin';
const LOGOUT_URL = environment.apiUrl + '/api/logout';
const PARTNER_URL = environment.apiUrl + '/api/partner';

@Injectable({
  providedIn: 'root'
})
export class AuthServerProvider {

  constructor(private http: HttpClient, private localStorageService: LocalStorageService, @Inject(PLATFORM_ID) private platformId: Object) { }

  getToken(): string {
    if (!this.isBrowser()) {
      return '';
    }

    const tokenInSessionStorage: string | null = this.localStorageService.retrieve('authenticationToken');
    return tokenInSessionStorage ?? '';
  }

  login(credential: Credentials): Observable<any> {
    return this.http
      .post<JwtToken>(LOGIN_URL, credential)
      .pipe(
        map((response: JwtToken) => {
          this.authenticateSuccess(response);
          return response;
        })
      )
      .pipe(catchError((error: HttpErrorResponse) => throwError(error)));
  }


  logout(): Observable<void> {
    if (!this.isBrowser()) {
      return of();
    }

    const jwt = this.localStorageService.retrieve('authenticationToken');

    if (!jwt) return of();

    return this.http.post(LOGOUT_URL, {}).pipe(
      catchError((error: HttpErrorResponse) => throwError(error)),
      switchMap(() => {
        if (this.isBrowser()) {
          this.localStorageService.clear('authenticationToken');
        }
        return new Observable<void>((observer) => {
          observer.complete();
        });
      })
    );
  }

  private authenticateSuccess(response: JwtToken): void {
    const jwt = response.token;
    if (this.isBrowser()) {
      this.localStorageService.store('authenticationToken', jwt);
    }
  }
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
