import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

// Data models
import { Partner, PasswordChange } from '../data-models/model';

// Env
import { environment } from '../../../environment/environment';

// Service
import { ServiceHelpersService } from './utils/service-helpers.service';

const DOMAIN_URL = environment.apiUrl + '/api/partner';
const KOMERCIJALISTI_URL = '/komercijalsti'
const PASSWORD_CHANGE_URL = '/promena-sifre';

@Injectable({
  providedIn: 'root'
})
export class PartnerService {

  constructor(private http: HttpClient, private serviceHelpersService: ServiceHelpersService) { }

  public getAllSalesPersons(): Observable<Partner[]> {
    const fullUrl = DOMAIN_URL + KOMERCIJALISTI_URL;
    return this.http
      .get<Partner[]>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }

  public promeniSifru(change: PasswordChange, isFirstChange: boolean): Observable<void> {
    const parameterObject = {} as any;
    parameterObject['isPrvaPromena'] = isFirstChange;
    const parametersString = this.serviceHelpersService.formatQueryParameters(parameterObject);

    const fullUrl = DOMAIN_URL + PASSWORD_CHANGE_URL + parametersString;

    return this.http
      .put<void>(fullUrl, change)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }
}
