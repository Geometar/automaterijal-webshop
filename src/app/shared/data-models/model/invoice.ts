import { ValueHelp } from './cart';
import { Manufacture } from './proizvodjac';
import { Slika } from './slika';
import { AvailabilityStatus, ProviderAvailabilityDto } from './availability';

export interface ProviderOrderOption {
  providerKey: string;
  deliveryParty?: string;
}

/**
 * Represents a complete invoice (Faktura).
 */
export class Invoice {
  adresa?: ValueHelp;
  brojStavki?: number;
  detalji?: InvoiceItem[];
  id?: number;
  iznosNarucen?: number;
  iznosPotvrdjen?: number;
  /** 1 = interna porudžbina (zaposleni), 0 = kupac */
  internalOrder?: number;
  nacinPlacanja?: ValueHelp;
  nacinPrevoza?: ValueHelp;
  napomena?: string;
  orderId?: number;
  partner?: string;
  /** Partner identifier (used by admin screens). */
  ppid?: number;
  /** Client-generated key used to deduplicate checkout retries. */
  idempotencyKey?: string;
  status?: ValueHelp;
  vremePorucivanja?: string;
  providerOptions?: ProviderOrderOption[];

  constructor(init?: Partial<Invoice>) {
    Object.assign(this, init);
  }
}

/**
 * Represents an individual invoice item (stavka fakture).
 */
export class InvoiceItem {
  availabilityStatus?: AvailabilityStatus;
  availabilityLabel?: string;
  cena?: number;
  /**
   * Item source in fulfillment flow.
   * - STOCK: fulfilled from internal stock (also written to ERP outbox)
   * - PROVIDER: fulfilled from external warehouse/provider (web-only)
   */
  izvor?: 'STOCK' | 'PROVIDER';
  /** Convenience label for UI rendering. */
  izvorLabel?: string;
  kataloskiBroj?: string;
  kataloskiBrojProizvodjaca?: string;
  kolicina?: number;
  naziv?: string;
  potvrdjenaKolicina?: number;
  proizvodjac?: Manufacture;
  providerBackorder?: boolean;
  providerAvailability?: ProviderAvailabilityDto;
  /** Nabavna cena (koristi se za interne porudžbine). */
  nabavnaCena?: number | null;
  providerDeliveryParty?: string;
  providerMessage?: string;
  providerInfo?: string;
  providerResponse?: string;
  rabat?: number;
  robaId?: number;
  tecDocArticleId?: number;
  slika?: Slika;
  status?: ValueHelp;
  vremePorucivanja?: string;

  constructor(init?: Partial<InvoiceItem>) {
    Object.assign(this, init);
  }
}
