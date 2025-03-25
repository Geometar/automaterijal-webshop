import { Injectable } from '@angular/core';
import { environment } from '../../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { ServiceHelpersService } from './utils/service-helpers.service';
import { catchError, Observable, throwError } from 'rxjs';
import { PaginatedResponse, SalesReport } from '../data-models/model';

const DOMAIN_URL = environment.apiUrl + '/api';
const SALES_URL = '/izvestaj';

@Injectable({
  providedIn: 'root'
})
export class SalesReportsService {

  constructor(private http: HttpClient, private helperService: ServiceHelpersService) { }

  public getSalesReports(page: number, pageSize: number, searchTerm: string | null, dateFrom: Date | null, dateTo: Date | null, salesPpid: number | null): Observable<PaginatedResponse<SalesReport>> {
    const parameterObject = {} as any;
    parameterObject['page'] = page;
    parameterObject['pageSize'] = pageSize;

    if (dateFrom) {
      parameterObject['dateFrom'] = dateFrom.getTime();
    }
    if (dateTo) {
      parameterObject['dateTo'] = dateTo.getTime();
    }
    if (searchTerm) {
      parameterObject['searchTerm'] = searchTerm;
    }
    if (salesPpid) {
      parameterObject['komercijalista'] = salesPpid;
    }

    const parametersString = this.helperService.formatQueryParameters(parameterObject);
    const fullUrl = DOMAIN_URL + SALES_URL + parametersString;
    return this.http
      .get<PaginatedResponse<SalesReport>>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }
}
