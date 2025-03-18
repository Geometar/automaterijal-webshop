import { Injectable } from '@angular/core';
import { environment } from '../../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { ValueHelp } from '../data-models/model/cart';

const DOMAIN_URL = environment.apiUrl + '/api';
const INFO_URL = '/informacije';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  constructor(private http: HttpClient) { }

  public getInformationAboutPaying(): Observable<ValueHelp[]> {
    const fullUrl = DOMAIN_URL + INFO_URL + '/placanje';

    return this.http
      .get<ValueHelp[]>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }
  public getInformationAboutTransport(): Observable<ValueHelp[]> {
    const fullUrl = DOMAIN_URL + INFO_URL + '/prevoz';

    return this.http
      .get<ValueHelp[]>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }
}
