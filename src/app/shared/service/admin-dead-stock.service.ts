import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';

export interface AdminDeadStockItem {
  robaId: number;
  katbr: string | null;
  naziv: string | null;
  proid: string | null;
  proizvodjacNaziv: string | null;
  bucket: string | null;
  daysInDeadStock: number | null;
  lastSaleDate: string | null;
  hasRule: boolean;
  customerVisible: boolean;
  suppressedForCustomer: boolean;
  badgeLabel: string | null;
  regularPrice: number | null;
  specialPrice: number | null;
  overrideReason: string | null;
  overrideUpdatedAt: string | null;
  overrideUpdatedByName: string | null;
  overrideUpdatedByPpid: number | null;
}

export interface AdminDeadStockOverridePayload {
  suppressedForCustomer: boolean;
  reason?: string | null;
}

export interface AdminDeadStockOverrideResponse {
  robaId: number;
  suppressedForCustomer: boolean;
  reason: string | null;
  updatedAt: string | null;
  updatedByName: string | null;
  updatedByPpid: number | null;
}

export interface AdminDeadStockItemsPage {
  items: AdminDeadStockItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  availableBuckets: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminDeadStockService {
  private readonly baseUrl = `${environment.apiUrl}/api/admin/dead-stock`;

  constructor(private http: HttpClient) {}

  fetchItems(params: {
    page: number;
    size: number;
    search?: string | null;
    status?: string | null;
    bucket?: string | null;
  }): Observable<AdminDeadStockItemsPage> {
    return this.http.get<AdminDeadStockItemsPage>(`${this.baseUrl}/items`, {
      params: {
        page: params.page,
        size: params.size,
        search: params.search ?? '',
        status: params.status ?? 'all',
        bucket: params.bucket ?? '',
      },
    });
  }

  updateOverride(
    robaId: number,
    payload: AdminDeadStockOverridePayload
  ): Observable<AdminDeadStockOverrideResponse> {
    return this.http.put<AdminDeadStockOverrideResponse>(
      `${this.baseUrl}/items/${robaId}/override`,
      payload
    );
  }
}
