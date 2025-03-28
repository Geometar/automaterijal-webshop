import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WebshopConfig } from '../data-models/interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private configUrl = '/config/webshop-config.json';

  constructor(private http: HttpClient) { }

  getConfig(): Observable<WebshopConfig> {
    return this.http.get<WebshopConfig>(this.configUrl);
  }
}
