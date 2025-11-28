import { Injectable } from '@angular/core';
import { PartnerCardResponse } from '../../data-models/model';

@Injectable({ providedIn: 'root' })
export class PartnerCardCacheService {
  private readonly cache = new Map<string, PartnerCardResponse>();

  get(key: string): PartnerCardResponse | null {
    return this.cache.get(key) ?? null;
  }

  set(key: string, value: PartnerCardResponse): void {
    this.cache.set(key, value);
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
      return;
    }
    this.cache.clear();
  }
}
