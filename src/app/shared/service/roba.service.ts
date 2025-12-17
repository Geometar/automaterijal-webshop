import { Injectable } from '@angular/core';
import { Sort } from '@angular/material/sort';
import { Filter, Magacin, Roba, ShowcaseResponse } from '../data-models/model/roba';
import { catchError, Observable, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { ServiceHelpersService } from './utils/service-helpers.service';

const DOMAIN_URL = environment.apiUrl + '/api';
const ROBA_URL = '/roba';

@Injectable({
  providedIn: 'root'
})
export class RobaService {

  constructor(private http: HttpClient, private helperService: ServiceHelpersService) { }

  public fetchDetails(robaId: number): Observable<Roba> {
    const fullUrl = DOMAIN_URL + ROBA_URL + '/' + robaId;

    return this.http
      .get<Roba>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }


  public pronadjiSvuRobu(sort: Sort | null, pageSize: number, page: number, searchValue: string, filter: Filter): Observable<Magacin> {
    const trimmedSearch = (searchValue || '').trim();

    const parameterObject = {} as any;
    parameterObject['pageSize'] = pageSize;
    parameterObject['page'] = page;
    parameterObject['naStanju'] = filter.naStanju;

    if (sort) {
      parameterObject['sortBy'] = sort.active.toLocaleUpperCase();
      parameterObject['sortDirection'] = sort.direction.toLocaleUpperCase();
    }

    if (trimmedSearch) {
      parameterObject['searchTerm'] = trimmedSearch;
    }

    if (filter.proizvodjaci && filter.proizvodjaci.length) {
      parameterObject['proizvodjaci'] = filter.proizvodjaci;
    }

    if (filter.mandatoryProid && filter.mandatoryProid.length) {
      parameterObject['mandatoryProid'] = filter.mandatoryProid;
    }

    if (filter.podgrupe) {
      parameterObject['podgrupe'] = filter.podgrupe;
    }

    if (filter.grupe) {
      parameterObject['grupe'] = filter.grupe;
    }

    if (filter.pretrazitiGrupe) {
      parameterObject['pretrazitiGrupe'] = filter.pretrazitiGrupe;
    }

    if (filter.paged) {
      parameterObject['paged'] = true;
    }

    if (filter.showcase) {
      parameterObject['showcase'] = true;
    }

    if (filter.filterBy) {
      parameterObject['filterBy'] = filter.filterBy;
    }

    const parametersString = this.helperService.formatQueryParameters(parameterObject);

    const realDataUrl = DOMAIN_URL + ROBA_URL + parametersString;
    const mockDataUrl = '/mocks/api-roba.json';

    const finalUrl = environment.devDown ? mockDataUrl : realDataUrl;

    return this.http
      .get<Magacin>(finalUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }

  public uploadImage(robaId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${DOMAIN_URL}${ROBA_URL}/${robaId}/image`;

    return this.http.post(url, formData).pipe(
      catchError((error: any) => throwError(() => error))
    );
  }

  public saveTecDocAttributes(robaId: number, attributes: any[]): Observable<void> {
    const url = `${DOMAIN_URL}${ROBA_URL}/${robaId}/atributi`;
    return this.http.post<void>(url, attributes).pipe(
      catchError((error: any) => throwError(() => error))
    );
  }

  public removeTecDocAttributes(robaId: number): Observable<void> {
    const url = `${DOMAIN_URL}${ROBA_URL}/${robaId}/atributi`;
    return this.http.delete<void>(url).pipe(
      catchError((error: any) => throwError(() => error))
    );
  }

  public removeImage(robaId: number): Observable<void> {
    const url = `${DOMAIN_URL}${ROBA_URL}/${robaId}/image`;
    return this.http.delete<void>(url).pipe(
      catchError((error: any) => throwError(() => error))
    );
  }

  public saveText(robaId: number, text: string): Observable<void> {
    const url = `${DOMAIN_URL}/roba/${robaId}`;
    return this.http.post<void>(url, text, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /** Fetch showcase (backend already caches & prepares) */
  public fetchShowcase(): Observable<ShowcaseResponse> {
    const url = `${DOMAIN_URL}${ROBA_URL}/showcase`;
    return this.http.get<ShowcaseResponse>(url).pipe(
      catchError((error: any) => throwError(() => error))
    );
  }
}
