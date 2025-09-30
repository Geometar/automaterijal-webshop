import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
// Data models
import { Manufacture } from '../data-models/model';

// Env
import { environment } from '../../../environment/environment';

const DOMAIN_URL = environment.apiUrl + '/api/manufacturers';

@Injectable({
  providedIn: 'root'
})
export class ManufactureService {

  constructor(private http: HttpClient) { }

  /**
   * Get manufacturer by slug
   * @param slug SEO-friendly naziv (npr. "fleetguard")
   */
  getBySlug(slug: string): Observable<Manufacture> {
    return this.http.get<Manufacture>(`${DOMAIN_URL}/${slug}`);
  }

  getAll(): Observable<Manufacture[]> {
    return this.http.get<Manufacture[]>(DOMAIN_URL);
  }
}
