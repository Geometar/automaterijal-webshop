import { Injectable } from '@angular/core';
import { Sort } from '@angular/material/sort';
import { Filter, Magacin } from '../data-models/model/roba';
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


  public pronadjiSvuRobu(sort: Sort | null, pageSize: number, page: number, searchValue: string, filter: Filter): Observable<Magacin> {
    const parameterObject = {} as any;
    parameterObject['pageSize'] = pageSize;
    parameterObject['page'] = page;
    if (sort) {
      parameterObject['sortBy'] = sort.active.toLocaleUpperCase();
      parameterObject['sortDirection'] = sort.direction.toLocaleUpperCase();
    }
    if (searchValue) {
      parameterObject['searchTerm'] = searchValue;
    }
    if (filter.proizvodjaci && filter.proizvodjaci.length) {
      parameterObject['proizvodjaci'] = filter.proizvodjaci;
    }
    parameterObject['naStanju'] = filter.naStanju;

    if (filter.grupe) {
      parameterObject['grupe'] = filter.grupe;
    }
    if (filter.pretrazitiGrupe) {
      parameterObject['pretrazitiGrupe'] = filter.pretrazitiGrupe;
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
}
