export interface PartnerCardItem {
  tip: string;
  nazivDok: string;
  brojDokumenta: string | null;
  datum: string | null;
  datumRoka: string | null;
  duguje: number;
  potrazuje: number;
  stanje: number;
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
