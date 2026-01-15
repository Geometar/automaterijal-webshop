import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';

export interface HogwartsStatusSnapshot {
  status: number;
  count: number;
  windowMinutes: number;
  updatedLastWindow: number | null;
  oldestMinutes: number | null;
  p95Minutes: number | null;
}

export interface HogwartsStuckOrder {
  id: number | null;
  orderId: number | null;
  ppid: number | null;
  partnerName: string | null;
  status: number | null;
  lastUpdate: number | null;
  ageMinutes: number | null;
  total: number | null;
}

export interface HogwartsProviderSnapshot {
  providerKey: string | null;
  lastOrderAt: number | null;
  ordersLast10d: number | null;
  backorderCountLast10d: number | null;
  messageCountLast10d: number | null;
}

export interface HogwartsOverviewResponse {
  generatedAt: number;
  statuses: HogwartsStatusSnapshot[];
  stuckOrders: HogwartsStuckOrder[];
  providers: HogwartsProviderSnapshot[];
}

@Injectable({
  providedIn: 'root',
})
export class HogwartsAdminService {
  private readonly baseUrl = `${environment.apiUrl}/api/admin/hogwarts`;

  constructor(private http: HttpClient) { }

  fetchOverview(): Observable<HogwartsOverviewResponse> {
    return this.http.get<HogwartsOverviewResponse>(`${this.baseUrl}/overview`);
  }
}
