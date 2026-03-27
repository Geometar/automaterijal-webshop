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

export interface TecDocBrandMapping {
  proid: string;
  brandId: number | null;
  brandLogoId: string | null;
}

export type DeadStockPricingMode =
  | 'MARKUP_ON_COST'
  | 'AT_COST'
  | 'DISCOUNT_ON_CURRENT_PRICE';

export interface DeadStockImportResponse {
  batchId: number;
  fileName: string;
  totalRowCount: number;
  importedCount: number;
  skippedMissingRobaCount: number;
  duplicateRobaIdCount: number;
  invalidRowCount: number;
  importedAt: string;
  status: string;
}

export interface DeadStockStatusResponse {
  activeSnapshotCount: number;
  activeRuleCount: number;
  lastBatchId: number | null;
  lastFileName: string | null;
  lastItemCount: number | null;
  lastImportedAt: string | null;
  lastStatus: string | null;
}

export interface DeadStockRule {
  id: number;
  name: string;
  minDaysInclusive: number;
  maxDaysInclusive: number | null;
  pricingMode: DeadStockPricingMode;
  pricingValue: number | null;
  badgeLabel: string | null;
  active: boolean;
  sortOrder: number;
}

export interface DeadStockRulePayload {
  name: string;
  minDaysInclusive: number;
  maxDaysInclusive: number | null;
  pricingMode: DeadStockPricingMode;
  pricingValue: number | null;
  badgeLabel: string | null;
  active: boolean;
  sortOrder: number;
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

  importSzakalOeLinks(): Observable<SzakalImportResult> {
    return this.http.post<SzakalImportResult>(`${this.baseUrl}/szakal/import/oe-links`, {});
  }

  fetchTecdocBrandMapping(proid: string): Observable<TecDocBrandMapping> {
    return this.http.get<TecDocBrandMapping>(`${this.baseUrl}/tecdoc-brand-mappings/${proid}`);
  }

  upsertTecdocBrandMapping(proid: string, brandId: number, brandLogoId?: string | null): Observable<TecDocBrandMapping> {
    return this.http.put<TecDocBrandMapping>(
      `${this.baseUrl}/tecdoc-brand-mappings/${proid}`,
      { brandId, brandLogoId: brandLogoId ?? null }
    );
  }

  deleteTecdocBrandMapping(proid: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tecdoc-brand-mappings/${proid}`);
  }

  fetchTecdocBrandMappings(query?: string): Observable<TecDocBrandMapping[]> {
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    return this.http.get<TecDocBrandMapping[]>(`${this.baseUrl}/tecdoc-brand-mappings${q}`);
  }

  uploadDeadStock(file: File): Observable<DeadStockImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<DeadStockImportResponse>(`${this.baseUrl}/dead-stock/import`, formData);
  }

  fetchDeadStockStatus(): Observable<DeadStockStatusResponse> {
    return this.http.get<DeadStockStatusResponse>(`${this.baseUrl}/dead-stock/status`);
  }

  fetchDeadStockRules(): Observable<DeadStockRule[]> {
    return this.http.get<DeadStockRule[]>(`${this.baseUrl}/dead-stock/rules`);
  }

  createDeadStockRule(payload: DeadStockRulePayload): Observable<DeadStockRule> {
    return this.http.post<DeadStockRule>(`${this.baseUrl}/dead-stock/rules`, payload);
  }

  updateDeadStockRule(id: number, payload: DeadStockRulePayload): Observable<DeadStockRule> {
    return this.http.put<DeadStockRule>(`${this.baseUrl}/dead-stock/rules/${id}`, payload);
  }

  deleteDeadStockRule(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/dead-stock/rules/${id}`);
  }
}
