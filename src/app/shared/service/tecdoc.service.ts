import { Injectable } from '@angular/core';
import { environment } from '../../../environment/environment';
import { catchError, Observable, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';

const DOMAIN_URL = environment.apiUrl + '/api/tecdoc';

@Injectable({
  providedIn: 'root'
})
export class TecdocService {

  constructor(private http: HttpClient) { }

  public getDocumentBytes(dokument: string): Observable<ArrayBuffer> {
    const fullUrl = DOMAIN_URL + '/dokument/' + dokument;

    return this.http
      .get<ArrayBuffer>(fullUrl, { responseType: 'arraybuffer' as 'json' }) // Ensure response is ArrayBuffer
      .pipe(catchError((error: any) => throwError(() => new Error(error))));
  }
}
