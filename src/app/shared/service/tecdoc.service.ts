import { Injectable } from '@angular/core';
import { environment } from '../../../environment/environment';
import { catchError, Observable, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';

// Data models
import { AssemblyGroup, TDManufacture, TDModels, TDVehicleDetails } from '../data-models/model/tecdoc';

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

  public getManufactures(): Observable<TDManufacture[]> {
    const fullUrl = DOMAIN_URL + '/manufactures';

    return this.http
      .get<TDManufacture[]>(fullUrl)
      .pipe(catchError((error: any) => throwError(() => new Error(error))));
  }

  public getModels(manufactureId: number): Observable<TDModels[]> {
    const fullUrl = DOMAIN_URL + '/manufactures/' + manufactureId;

    return this.http
      .get<TDModels[]>(fullUrl)
      .pipe(catchError((error: any) => throwError(() => new Error(error))));
  }

  public getTypeOfModel(manufactureId: number, modelId: number): Observable<TDVehicleDetails[]> {
    const fullUrl = DOMAIN_URL + '/manufactures/' + manufactureId + '/' + modelId;

    return this.http
      .get<TDVehicleDetails[]>(fullUrl)
      .pipe(catchError((error: any) => throwError(() => new Error(error))));
  }

  public getAssemblyGroups(id: number, type: string): Observable<AssemblyGroup[]> {
    const fullUrl = DOMAIN_URL + '/assemblygroup/' + id + '/' + type;

    return this.http
      .get<AssemblyGroup[]>(fullUrl)
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
}
