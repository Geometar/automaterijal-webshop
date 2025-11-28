import { Slika } from '../../../../shared/data-models/model/slika';

export interface DocumentRowView {
  id?: number | null;
  title: string;
  code?: string | null;
  barkod?: string | null;
  quantity: number;
  rabat?: number | null;
  rabatLabel?: string | null;
  partnerNet: number;
  partnerVat: number;
  partnerGross: number;
  partnerNetTotal: number;
  partnerVatTotal: number;
  partnerGrossTotal: number;
  fullGross: number;
  fullGrossTotal: number;
  image: string;
  costPrice?: number;
}

export interface DocumentTotals {
  partnerVat: number;
  partnerGross: number;
  fullGross: number;
}

export interface DocumentCacheMeta {
  documentDate: string | null;
  documentDueDate: string | null;
  documentTotal: number | null;
}
