import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

// Data models
import { Partner, PasswordChange, PartnerCardDetailsResponse, PartnerCardResponse } from '../data-models/model';

// Env
import { environment } from '../../../environment/environment';

// Service
import { ServiceHelpersService } from './utils/service-helpers.service';

const DOMAIN_URL = environment.apiUrl + '/api/partner';
const KOMERCIJALISTI_URL = '/komercijalsti';
const PARTNER_CARD_URL = '/kartica';
const PARTNER_CARD_ADMIN_URL = '/kartica-admin';
const PARTNER_CARD_DETAILS_URL = '/kartica/detalji';
const PARTNER_CARD_ADMIN_DETAILS_URL = '/kartica-admin/detalji';
const PARTNER_SEARCH_URL = '/pretraga';
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

  public getPartnerCard(): Observable<PartnerCardResponse> {
    const fullUrl = DOMAIN_URL + PARTNER_CARD_URL;
    return this.http
      .get<PartnerCardResponse>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }

  public getPartnerCardAdmin(partnerPpid: number): Observable<PartnerCardResponse> {
    const fullUrl = `${DOMAIN_URL}/${partnerPpid}${PARTNER_CARD_ADMIN_URL}`;
    return this.http
      .get<PartnerCardResponse>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }

  public getPartnerCardDetails(
    vrdok: string,
    brdok: string | number,
    partnerPpid?: number
  ): Observable<PartnerCardDetailsResponse> {
    const params = this.serviceHelpersService.formatQueryParameters({ vrdok, brdok });
    const baseUrl = partnerPpid !== undefined
      ? `${DOMAIN_URL}/${partnerPpid}${PARTNER_CARD_ADMIN_DETAILS_URL}`
      : DOMAIN_URL + PARTNER_CARD_DETAILS_URL;
    const fullUrl = `${baseUrl}${params}`;

    return this.http
      .get<PartnerCardDetailsResponse>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }

  public searchPartners(term: string): Observable<Partner[]> {
    const parameterObject = {} as any;
    parameterObject['naziv'] = term ?? '';
    const parametersString = this.serviceHelpersService.formatQueryParameters(parameterObject);

    const fullUrl = DOMAIN_URL + PARTNER_SEARCH_URL + parametersString;
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
