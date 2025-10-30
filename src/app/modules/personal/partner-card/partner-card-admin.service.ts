import { Injectable, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

// Data models
import { Partner } from '../../../shared/data-models/model';

// Service
import { PartnerService } from '../../../shared/service/partner.service';

// Components
import { TypeaheadItem } from '../../../shared/components/typeahead/typeahead.component';

export interface PartnerCardAdminSelectionResult {
  partner: Partner | null;
  partnerId?: number;
  error?: string;
}

@Injectable()
export class PartnerCardAdminService implements OnDestroy {
  items: TypeaheadItem[] = [];
  loading = false;
  error = '';
  selection: TypeaheadItem | null = null;
  partner: Partner | null = null;

  private readonly destroy$ = new Subject<void>();
  private readonly partnersIndex = new Map<number, Partner>();
  private activeSearchToken: symbol | null = null;

  constructor(private partnerService: PartnerService) { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  reset(): void {
    this.items = [];
    this.loading = false;
    this.error = '';
    this.partnersIndex.clear();
    this.activeSearchToken = null;
  }

  search(term: string): void {
    const query = term.trim();

    if (!query) {
      this.reset();
      return;
    }

    const requestToken = Symbol('partner-search');
    this.activeSearchToken = requestToken;
    this.loading = true;
    this.error = '';

    this.partnerService
      .searchPartners(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (partners: Partner[]) => {
          if (this.activeSearchToken !== requestToken) {
            return;
          }

          this.partnersIndex.clear();
          this.items = partners.map((partner) => {
            if (partner.ppid !== undefined && partner.ppid !== null) {
              this.partnersIndex.set(partner.ppid, partner);
            }
            return this.toTypeaheadItem(partner);
          });

          this.error = this.items.length ? '' : 'Nema partnera za dati upit.';
          this.loading = false;
          this.activeSearchToken = null;
        },
        error: () => {
          if (this.activeSearchToken !== requestToken) {
            return;
          }
          this.items = [];
          this.error = 'Pretraga nije uspela. Pokušajte ponovo.';
          this.loading = false;
          this.activeSearchToken = null;
        }
      });
  }

  select(item: TypeaheadItem | null): PartnerCardAdminSelectionResult {
    this.selection = item;
    this.error = '';

    if (!item || item.key === undefined || item.key === null) {
      this.partner = null;
      return { partner: null };
    }

    const numericKey = typeof item.key === 'string' ? Number(item.key) : item.key;
    const partner = Number.isFinite(numericKey)
      ? this.partnersIndex.get(Number(numericKey)) ?? null
      : null;

    if (partner) {
      this.partner = partner;
      return { partner, partnerId: partner.ppid };
    }

    if (Number.isFinite(numericKey)) {
      this.partner = null;
      return { partner: null, partnerId: Number(numericKey) };
    }

    this.partner = null;
    this.error = 'Izabrani partner nema važeći identifikator.';
    return { partner: null, error: this.error };
  }

  private toTypeaheadItem(partner: Partner): TypeaheadItem {
    const labelParts: string[] = [];
    const naziv = partner.naziv?.trim();

    if (naziv) {
      labelParts.push(naziv);
    } else {
      labelParts.push('Nepoznat partner');
    }

    if (partner.ppid !== undefined && partner.ppid !== null) {
      labelParts.push(`#${partner.ppid}`);
    }

    const metaParts = [partner.email?.trim()].filter(Boolean) as string[];

    return {
      key: partner.ppid ?? partner.email ?? labelParts.join(' | '),
      value: labelParts.join(' · '),
      meta: metaParts.join(' · ') || undefined
    };
  }
}
