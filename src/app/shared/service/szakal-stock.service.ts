import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';

export interface SzakalStockCheckItem {
  token?: string | null;
  glid?: string | null;
  quantity?: number | null;
  brand?: string | null;
  group?: string | null;
}

export interface SzakalStockCheckResult {
  token?: string | null;
  glid?: string | null;
  requestedQuantity?: number | null;
  available?: boolean;
  availableQuantity?: number | null;
  orderQuantum?: number | null;
  noReturnable?: boolean | null;
  stockToken?: string | null;
  purchasePrice?: number | null;
  customerPrice?: number | null;
  expectedDelivery?: string | null;
  coreCharge?: number | null;
  currency?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SzakalStockService {
  private readonly baseUrl = `${environment.apiUrl}/api/szakal/stock-check`;

  constructor(private http: HttpClient) {}

  check(items: SzakalStockCheckItem[]): Observable<SzakalStockCheckResult[]> {
    return this.http
      .post<SzakalStockCheckResult[]>(this.baseUrl, { items })
      .pipe(catchError((error: any) => throwError(error)));
  }
}
