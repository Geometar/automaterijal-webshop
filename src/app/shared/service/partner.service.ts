import { Injectable } from '@angular/core';
import { environment } from '../../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { Partner } from '../data-models/model';

const DOMAIN_URL = environment.apiUrl + '/api/partner';
const KOMERCIJALISTI_URL = '/komercijalsti'

@Injectable({
  providedIn: 'root'
})
export class PartnerService {

  constructor(private http: HttpClient) { }

  public getAllSalesPersons(): Observable<Partner[]> {
    const fullUrl = DOMAIN_URL + KOMERCIJALISTI_URL;
    return this.http
      .get<Partner[]>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );

  }
}
