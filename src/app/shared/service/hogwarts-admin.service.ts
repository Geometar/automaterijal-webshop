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

export interface HogwartsRevenueMetrics {
  orders: number;
  revenue: number;
  activePartners: number;
  aov: number | null;
  ordersPerActivePartner: number | null;
}

export interface HogwartsRevenuePeriodRow {
  year: number;
  from: number;
  to: number;
  metrics: HogwartsRevenueMetrics;
}

export interface HogwartsRevenueOverviewResponse {
  generatedAt: number;
  days: number;
  years: number;
  currentFrom: number;
  currentTo: number;
  current: HogwartsRevenueMetrics;
  history: HogwartsRevenuePeriodRow[];
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

  fetchRevenueOverview(days = 30, years = 10): Observable<HogwartsRevenueOverviewResponse> {
    return this.http.get<HogwartsRevenueOverviewResponse>(
      `${this.baseUrl}/revenue-overview?days=${days}&years=${years}`
    );
  }
}
