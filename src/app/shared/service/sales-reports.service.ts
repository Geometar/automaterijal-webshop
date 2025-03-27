import { Injectable } from '@angular/core';
import { environment } from '../../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

// Data models
import { Company, PaginatedResponse, SalesReport, SalesReportCreate } from '../data-models/model';

// Services
import { ServiceHelpersService } from './utils/service-helpers.service';

const COMPANY_URL = '/companies';
const DOMAIN_URL = environment.apiUrl + '/api';
const SALES_URL = '/sales-reports';

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

  public getSalesReportDetails(salesReportId: number): Observable<SalesReport> {
    const fullUrl = DOMAIN_URL + SALES_URL + '/details/' + salesReportId;
    return this.http
      .get<SalesReport>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }

  public updateSalesReportDetails(salesReportId: number, salesReportDetails: SalesReport): Observable<SalesReport> {
    const fullUrl = DOMAIN_URL + SALES_URL + '/details/' + salesReportId;
    return this.http
      .put<SalesReport>(fullUrl, salesReportDetails)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }

  public fetchAllCompanies(): Observable<Company[]> {
    const fullUrl = DOMAIN_URL + SALES_URL + COMPANY_URL;
    return this.http
      .get<Company[]>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }

  public createSalesReport(data: SalesReportCreate): Observable<void> {
    const fullUrl = DOMAIN_URL + SALES_URL;
    return this.http.post<void>(fullUrl, data).pipe(
      catchError((error: any) => throwError(() => error))
    );
  }
}
