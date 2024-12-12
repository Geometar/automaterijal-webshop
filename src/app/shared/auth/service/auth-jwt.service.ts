import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../../environment/environment';
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { SessionStorageService } from 'ngx-webstorage';
import { Credentials, JwtToken } from '../../data-models/model';
import { isPlatformBrowser } from '@angular/common';

const LOGIN_URL = environment.apiUrl + '/api/auth/signin';
const LOGOUT_URL = environment.apiUrl + '/logout';
const PARTNER_URL = environment.apiUrl + '/api/partner';

@Injectable({
  providedIn: 'root'
})
export class AuthServerProvider {

  constructor(private http: HttpClient, private sessionStorageService: SessionStorageService, @Inject(PLATFORM_ID) private platformId: Object) { }

  getToken(): string {
    const tokenInSessionStorage: string | null = this.sessionStorageService.retrieve('authenticationToken');
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
    const jwt = this.sessionStorageService.retrieve('authenticationToken');

    if (!jwt) return of();

    return this.http.post(LOGOUT_URL, {}).pipe(
      catchError((error: HttpErrorResponse) => throwError(error)),
      switchMap(() => {
        if (this.isBrowser()) {
          this.sessionStorageService.clear('authenticationToken');
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
      this.sessionStorageService.store('authenticationToken', jwt);
    }
  }
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
