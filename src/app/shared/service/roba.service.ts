import { Injectable } from '@angular/core';
import { Sort } from '@angular/material/sort';
import { Filter, RobaPage } from '../data-models/model/roba';
import { catchError, Observable, throwError } from 'rxjs';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { ServiceHelpersService } from './utils/service-helpers.service';

const DOMAIN_URL = environment.apiUrl + '/api';
const ROBA_URL = '/roba';

@Injectable({
  providedIn: 'root'
})
export class RobaService {

  constructor(private http: HttpClient, private helperService: ServiceHelpersService) { }


  public pronadjiSvuRobu(sort: Sort | null, pageSize: number, page: number, searchValue: string, filter: Filter): Observable<RobaPage> {
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
    if (filter.proizvodjacId) {
      parameterObject['proizvodjac'] = filter.proizvodjacId;
    }
    if (filter.naStanju) {
      parameterObject['naStanju'] = filter.naStanju;
    }
    if (filter.grupa) {
      parameterObject['grupa'] = filter.grupa;
    }
    if (filter.pretrazitiGrupe) {
      parameterObject['pretrazitiGrupe'] = filter.pretrazitiGrupe;
    }
    const parametersString = this.helperService.formatQueryParameters(parameterObject);
    const fullUrl = DOMAIN_URL + ROBA_URL + parametersString;

    return this.http
      .get<RobaPage>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }
}
