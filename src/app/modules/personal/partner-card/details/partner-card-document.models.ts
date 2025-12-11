import { Slika } from '../../../../shared/data-models/model/slika';

export interface DocumentRowView {
  id?: number | null;
  title: string;
  code?: string | null;
  barkod?: string | null;
  manufacturer?: string | null;
  groupLabel?: string | null;
  subgroupLabel?: string | null;
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
  fullGrossOriginal: number;
  fullGrossTotalOriginal: number;
  fullPriceEdited?: boolean;
  image: string;
  costPrice?: number;
  routeParam?: string | null;
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
