import { environment } from '../../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Invoice, PaginatedResponse } from '../data-models/model';
import { catchError, Observable, throwError } from 'rxjs';
import { Roba } from '../data-models/model/roba';
import { ServiceHelpersService } from './utils/service-helpers.service';

const DOMAIN_URL = environment.apiUrl + '/api';
const INVOICE_URL = '/fakture';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {

  constructor(private http: HttpClient, private helperService: ServiceHelpersService) { }

  public getInvoices(page: number, pageSize: number, ppid: number, dateFrom: Date | null, dateTo: Date | null): Observable<PaginatedResponse<Invoice>> {
    const parameterObject = {} as any;
    parameterObject['page'] = page;
    parameterObject['pageSize'] = pageSize;

    if (dateFrom) {
      parameterObject['dateFrom'] = dateFrom.getTime();
    }
    if (dateTo) {
      parameterObject['dateTo'] = dateTo.getTime();
    }

    const parametersString = this.helperService.formatQueryParameters(parameterObject);
    const fullUrl = DOMAIN_URL + INVOICE_URL + '/' + ppid + parametersString;
    return this.http
      .get<PaginatedResponse<Invoice>>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }

  public submit(invoice: Invoice): Observable<Roba[]> {
    const fullUrl = DOMAIN_URL + INVOICE_URL;
    return this.http
      .post<Roba[]>(fullUrl, invoice)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }
}
