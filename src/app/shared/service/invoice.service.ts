import { environment } from '../../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Invoice } from '../data-models/model';
import { catchError, throwError } from 'rxjs';
import { Roba } from '../data-models/model/roba';

const DOMAIN_URL = environment.apiUrl + '/api';
const INVOICE_URL = '/fakture';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {

  constructor(private http: HttpClient) { }


  public submit(invoice: Invoice) {
    const fullUrl = DOMAIN_URL + INVOICE_URL;
    return this.http
      .post<Roba[]>(fullUrl, invoice)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }
}
