import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WebshopConfig } from '../data-models/interface';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private configUrl = '/config/webshop-config.json';
  private configCache: WebshopConfig | null = null;

  constructor(private http: HttpClient) { }

  getConfig(): Observable<WebshopConfig> {
    if (this.configCache) {
      return new Observable((obs) => {
        obs.next(this.configCache!);
        obs.complete();
      });
    }
    return this.http.get<WebshopConfig>(this.configUrl).pipe(
      tap((cfg) => (this.configCache = cfg))
    );
  }

  getConfigSync(): WebshopConfig | null {
    return this.configCache;
  }
}
