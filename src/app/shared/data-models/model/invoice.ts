import { ValueHelp } from './cart';
import { Manufacture } from './proizvodjac';
import { Slika } from './slika';

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
  nacinPlacanja?: ValueHelp;
  nacinPrevoza?: ValueHelp;
  napomena?: string;
  orderId?: number;
  partner?: string;
  status?: ValueHelp;
  vremePorucivanja?: string;

  constructor(init?: Partial<Invoice>) {
    Object.assign(this, init);
  }
}

/**
 * Represents an individual invoice item (stavka fakture).
 */
export class InvoiceItem {
  cena?: number;
  kataloskiBroj?: string;
  kolicina?: number;
  naziv?: string;
  potvrdjenaKolicina?: number;
  proizvodjac?: Manufacture;
  rabat?: number;
  robaId?: number;
  slika?: Slika;
  status?: ValueHelp;
  vremePorucivanja?: string;

  constructor(init?: Partial<InvoiceItem>) {
    Object.assign(this, init);
  }
}