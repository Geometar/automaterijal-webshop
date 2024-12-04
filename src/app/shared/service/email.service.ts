import { Injectable } from '@angular/core';
import { catchError, Observable, throwError, timeoutWith } from 'rxjs';
import { Kontakt } from '../data-models/model/kontakt';
import { HttpClient } from '@angular/common/http';

const DOMAIN_URL = 'https://localhost:8443' + '/api/email';
const PORUKA_URL = '/poruka';

const TIMEOUT = 15000;
const TIMEOUT_ERROR = 'Timeout error!';

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
        timeoutWith(TIMEOUT, throwError(TIMEOUT_ERROR)),
        catchError((error: any) => throwError(error))
      );
  }
}
