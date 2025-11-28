export interface PartnerCardItem {
  tip: string;
  nazivDok: string;
  brojDokumenta: string | null;
  datum: string | null;
  datumRoka: string | null;
  duguje: number;
  potrazuje: number;
  stanje: number;
  vrdok?: string | null;
}

export interface PartnerCardGroup {
  tip: string;
  displayTip?: string;
  totalDuguje: number;
  totalPotrazuje: number;
  totalStanje: number;
  stavke: PartnerCardItem[];
}

export interface PartnerCardResponse {
  groups: PartnerCardGroup[];
  ukupnoDuguje: number;
  ukupnoPotrazuje: number;
  ukupnoStanje: number;
}

export interface PartnerCardDetailsImage {
  slikeUrl: string | null;
  robaSlika: string | null;
  url: boolean | null;
}

export interface PartnerCardDetailsItem {
  id?: number | null;
  stavkaId?: number | null;
  robaId?: number | null;
  kolicina?: number | string | null;
  nabavnaCena?: number | string | null; // admin only
  prodajnaCena?: number | string | null;
  prodajnaCenaBezPdv?: number | string | null;
  prodajnaCenaSaPdv?: number | string | null;
  rabat?: number | string | null;
  porez?: number | string | null;
  naziv?: string | null;
  robaNaziv?: string | null;
  katbr?: string | null;
  katbrPro?: string | null;
  barkod?: string | null;
  proizvodjacNaziv?: string | null;
  grupa?: string | null;
  grupaNaziv?: string | null;
  podgrupa?: string | null;
  podgrupaNaziv?: string | null;
  slika?: PartnerCardDetailsImage | null;
  cenaPartnera?: number | string | null;
  cenaPartneraUkupno?: number | string | null;
  punaCena?: number | string | null;
  punaCenaUkupno?: number | string | null;
}

export interface PartnerCardDetailsResponse {
  errorCode: number;
  errorMessage: string;
  stavke: PartnerCardDetailsItem[];
}
