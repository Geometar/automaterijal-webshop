import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environment/environment';

export interface PriceReloadResponse {
  count: number;
  path: string | null;
  lastModified: number | null;
  sizeBytes: number | null;
}

export interface PriceFileInfoResponse {
  path: string | null;
  lastModified: number | null;
  sizeBytes: number | null;
}

export interface PriceStatusResponse {
  count: number;
  dbUpdatedAt: number | null;
  path: string | null;
  lastModified: number | null;
  sizeBytes: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class FebiPriceAdminService {
  private readonly baseUrl = `${environment.apiUrl}/api/admin/febi/prices`;

  constructor(private http: HttpClient) { }

  uploadPriceList(file: File): Observable<PriceReloadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<PriceReloadResponse>(this.baseUrl, formData);
  }

  reloadFromDisk(): Observable<PriceReloadResponse> {
    return this.http.post<PriceReloadResponse>(`${this.baseUrl}/reload`, {});
  }

  fetchMeta(): Observable<PriceFileInfoResponse> {
    return this.http.get<PriceFileInfoResponse>(`${this.baseUrl}/meta`);
  }

  fetchStatus(): Observable<PriceStatusResponse> {
    return this.http.get<PriceStatusResponse>(`${this.baseUrl}/status`);
  }
}
