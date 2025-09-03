import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { Roba } from '../../data-models/model/roba';

export interface ShowcaseItem {
  podgrupa: string;
  artikli: Roba[];
}

@Injectable({
  providedIn: 'root'
})
export class ShowcaseStateService {
  private readonly storageKey = 'showcase_products';
  private readonly dateKey = 'showcase_last_updated';

  constructor(private localStorageService: LocalStorageService) { }

  /** Čuva artikle i datum kada su postavljeni */
  set(products: ShowcaseItem[]): void {
    this.localStorageService.store(this.storageKey, products);
    this.localStorageService.store(this.dateKey, new Date().toISOString());
  }

  /** Vraća proizvode iz keša */
  get(): ShowcaseItem[] {
    return this.localStorageService.retrieve(this.storageKey) ?? [];
  }

  /** Datum kad su proizvodi poslednji put postavljeni */
  getLastUpdated(): Date | null {
    const raw = this.localStorageService.retrieve(this.dateKey);
    return raw ? new Date(raw) : null;
  }

  /** Da li treba osvežiti (npr. ako je prošlo više od 7 dana) */
  isExpired(days = 7): boolean {
    const last = this.getLastUpdated();
    if (!last) return true;
    const diff = Date.now() - last.getTime();
    return diff > days * 24 * 60 * 60 * 1000;
  }

  /** Obriši sve */
  clear(): void {
    this.localStorageService.clear(this.storageKey);
    this.localStorageService.clear(this.dateKey);
  }
}