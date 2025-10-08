import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

// Models
import { BrandPageData } from '../data-models/interface';

@Injectable({ providedIn: 'root' })
export class BrandPageService {
  private cache = new Map<string, BrandPageData>();

  constructor(private http: HttpClient) { }

  getBrandPage(slug: string): Observable<BrandPageData> {
    const normalizedSlug = (slug || '').trim().toLowerCase();
    if (!normalizedSlug) {
      throw new Error('Brand slug is required');
    }

    const cached = this.cache.get(normalizedSlug);
    if (cached) {
      return of(cached);
    }

    return this.http
      .get<BrandPageData>(`/brands/${normalizedSlug}.json`)
      .pipe(
        map((data) => ({ ...data })),
        tap((data) => this.cache.set(normalizedSlug, data))
      );
  }
}
