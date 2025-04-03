import { Injectable } from '@angular/core';
import { catchError, Observable, throwError, timeoutWith } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';

// Data models
import { CreateAccount, Kontakt } from '../data-models/model/email';

const DOMAIN_URL = environment.apiUrl + '/api/email';
const PORUKA_URL = '/poruka';
const REQUEST_ACCOUNT_CREATION_URL = '/registracija';

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  constructor(
    private http: HttpClient) { }


  public posaljiPoruku(poruka: Kontakt): Observable<any> {
    const fullUrl = DOMAIN_URL + PORUKA_URL;
    return this.http.post(fullUrl, poruka)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }

  public createAccountRequest(account: CreateAccount): Observable<void> {
    const fullUrl = DOMAIN_URL + REQUEST_ACCOUNT_CREATION_URL;
    return this.http.post<void>(fullUrl, account)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }
}
