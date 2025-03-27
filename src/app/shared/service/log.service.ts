import { Injectable } from '@angular/core';
import { environment } from '../../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

// Data models
import { LogsLogin, LogWeb, PaginatedResponse } from '../data-models/model';

// Services
import { ServiceHelpersService } from './utils/service-helpers.service';

const ADMIN_URL = '/admin';
const DOMAIN_URL = environment.apiUrl + '/api';
const LOG_URL = '/logs';

@Injectable({
  providedIn: 'root'
})
export class LogService {

  constructor(private http: HttpClient, private helperService: ServiceHelpersService) { }

  public getLoginLogs(page: number, pageSize: number): Observable<PaginatedResponse<LogsLogin>> {
    const parameterObject = {} as any;
    parameterObject['page'] = page;
    parameterObject['pageSize'] = pageSize;

    const parametersString = this.helperService.formatQueryParameters(parameterObject);
    const fullUrl = DOMAIN_URL + ADMIN_URL + LOG_URL + parametersString;
    return this.http
      .get<PaginatedResponse<LogsLogin>>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }

  public getLoginDetails(ppid: number, page: number, pageSize: number): Observable<PaginatedResponse<LogWeb>> {
    const parameterObject = {} as any;
    parameterObject['page'] = page;
    parameterObject['pageSize'] = pageSize;
    parameterObject['ppid'] = ppid;

    const parametersString = this.helperService.formatQueryParameters(parameterObject);
    const fullUrl = DOMAIN_URL + LOG_URL + parametersString;
    return this.http
      .get<PaginatedResponse<LogWeb>>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }
}
