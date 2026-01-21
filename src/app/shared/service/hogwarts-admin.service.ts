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

export interface SzakalImportResult {
  file: string | null;
  rows: number;
  durationMs: number;
}

export interface SzakalImportSummary {
  master: SzakalImportResult | null;
  priceLists: SzakalImportResult[];
}

export interface SzakalPriceListStatus {
  listNo: number;
  count: number;
}

export interface SzakalStatusSummary {
  masterCount: number | null;
  masterUpdatedAt: number | null;
  priceLists: SzakalPriceListStatus[];
  priceUpdatedAt: number | null;
}

export interface SzakalFileInfo {
  key: string;
  path: string;
  sizeBytes: number | null;
  lastModified: number | null;
}

export interface SzakalFilesSummary {
  dataDir: string | null;
  files: SzakalFileInfo[];
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

  fetchSzakalStatus(): Observable<SzakalStatusSummary> {
    return this.http.get<SzakalStatusSummary>(`${this.baseUrl}/szakal/status`);
  }

  fetchSzakalFiles(): Observable<SzakalFilesSummary> {
    return this.http.get<SzakalFilesSummary>(`${this.baseUrl}/szakal/files`);
  }

  importSzakalMaster(): Observable<SzakalImportSummary> {
    return this.http.post<SzakalImportSummary>(`${this.baseUrl}/szakal/import/master`, {});
  }

  importSzakalPricelists(): Observable<SzakalImportSummary> {
    return this.http.post<SzakalImportSummary>(`${this.baseUrl}/szakal/import/pricelists`, {});
  }

  importSzakalAll(): Observable<SzakalImportSummary> {
    return this.http.post<SzakalImportSummary>(`${this.baseUrl}/szakal/import`, {});
  }

  importSzakalBarcodes(): Observable<SzakalImportResult> {
    return this.http.post<SzakalImportResult>(`${this.baseUrl}/szakal/import/barcodes`, {});
  }
}
