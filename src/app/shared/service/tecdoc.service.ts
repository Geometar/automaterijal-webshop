import { Injectable } from '@angular/core';
import { environment } from '../../../environment/environment';
import { catchError, Observable, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';

// Data models
import { AssemblyGroupDetails, TDManufacture, TDModels, TDVehicleDetails } from '../data-models/model/tecdoc';
import { Filter, Magacin } from '../data-models/model/roba';

// Services
import { ServiceHelpersService } from './utils/service-helpers.service';

const DOMAIN_URL = environment.apiUrl + '/api/tecdoc';

@Injectable({
  providedIn: 'root'
})
export class TecdocService {

  constructor(private http: HttpClient, private helperService: ServiceHelpersService) { }

  public getDocumentBytes(dokument: string): Observable<ArrayBuffer> {
    const fullUrl = DOMAIN_URL + '/dokument/' + dokument;

    return this.http
      .get<ArrayBuffer>(fullUrl, { responseType: 'arraybuffer' as 'json' }) // Ensure response is ArrayBuffer
      .pipe(catchError((error: any) => throwError(() => new Error(error))));
  }

  public getManufactures(type: string = 'PO'): Observable<TDManufacture[]> {
    const fullUrl = DOMAIN_URL + '/manufactures';

    const parameterObject = {} as any;
    parameterObject['type'] = type;
    const parametersString = this.helperService.formatQueryParameters(parameterObject);

    return this.http
      .get<TDManufacture[]>(fullUrl + parametersString)
      .pipe(catchError((error: any) => throwError(() => new Error(error))));
  }

  public getModels(manufactureId: number, type: string = 'PO'): Observable<TDModels[]> {
    const fullUrl = DOMAIN_URL + '/manufactures/' + manufactureId;

    const parameterObject = {} as any;
    parameterObject['type'] = type;
    const parametersString = this.helperService.formatQueryParameters(parameterObject);

    return this.http
      .get<TDModels[]>(fullUrl + parametersString)
      .pipe(catchError((error: any) => throwError(() => new Error(error))));
  }

  public getTypeOfModel(manufactureId: number, modelId: number, type: string = 'PO'): Observable<TDVehicleDetails[]> {
    const fullUrl = DOMAIN_URL + '/manufactures/' + manufactureId + '/' + modelId;

    const parameterObject = {} as any;
    parameterObject['type'] = type;
    const parametersString = this.helperService.formatQueryParameters(parameterObject);

    return this.http
      .get<TDVehicleDetails[]>(fullUrl + parametersString)
      .pipe(catchError((error: any) => throwError(() => new Error(error))));
  }

  public getAssemblyGroups(id: number, type: string): Observable<AssemblyGroupDetails> {
    const fullUrl = DOMAIN_URL + '/assemblygroup/' + id + '/' + type;

    return this.http
      .get<AssemblyGroupDetails>(fullUrl)
      .pipe(catchError((error: any) => throwError(() => new Error(error))));
  }

  public getLinkageTargets(id: number, type: string): Observable<TDVehicleDetails[]> {
    const fullUrl = DOMAIN_URL + '/linkageTargets';
    const parameterObject = {} as any;
    parameterObject['tecdocTargetType'] = type;
    parameterObject['tecdocTargetId'] = id;

    const parametersString = this.helperService.formatQueryParameters(parameterObject);

    return this.http
      .get<TDVehicleDetails[]>(fullUrl + parametersString)
      .pipe(catchError((error: any) => throwError(() => new Error(error))));
  }

  public getAssociatedArticles(id: number, type: string, assembleGroupId: string, pageSize: number, page: number, filter: Filter): Observable<Magacin> {
    const fullUrl = DOMAIN_URL + '/articles';
    const parameterObject = {} as any;
    parameterObject['assembleGroupId'] = assembleGroupId;
    parameterObject['naStanju'] = filter.naStanju;
    parameterObject['page'] = page;
    parameterObject['pageSize'] = pageSize;
    parameterObject['tecdocTargetId'] = id;
    parameterObject['tecdocTargetType'] = type;

    if (filter.proizvodjaci && filter.proizvodjaci.length) {
      parameterObject['proizvodjaci'] = filter.proizvodjaci;
    }

    if (filter.podgrupe) {
      parameterObject['podgrupe'] = filter.podgrupe;
    }

    const parametersString = this.helperService.formatQueryParameters(parameterObject);

    return this.http
      .get<Magacin>(fullUrl + parametersString)
      .pipe(catchError((error: any) => throwError(() => new Error(error))));
  }
}
