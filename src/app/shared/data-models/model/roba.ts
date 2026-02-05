import { Manufacture } from "./proizvodjac";
import { PaginatedResponse } from "./page";
import { Slika } from "./slika";
import { WebshopPrimaryFilter } from "../enums/webshop-primary-filter.enum";
import { AvailabilityStatus, ProviderAvailabilityDto } from "./availability";

export class Filter {
  grupe?: string[];
  mandatoryProid?: string[];
  naStanju?: boolean = false;
  podgrupe?: string[];
  pretrazitiGrupe?: boolean;
  proizvodjaci?: string[];
  raspolozivost?: string = 'Svi artikli';
  paged: boolean = false;
  showcase: boolean = false;
  filterBy?: WebshopPrimaryFilter;

  Filter() {
    this.naStanju = false;
    this.raspolozivost = 'Svi artikli';
  }
}

export class RobaTehnickiOpis {
  jedinica?: string;
  oznaka?: string;
  type?: string;
  vrednost?: string;
}
export class RobaBrojevi {
  fabrBroj?: string;
  proizvodjac?: string;
}
export class RobaAplikacija {
  proizvodjacNaziv?: string;
  modelNaziv?: string;
  tipVozila?: string;
  proizOd?: string;
  proizDo?: string;
  hp?: string;
  kw?: string;
  ccm?: string;
}

export interface TecDocDokumentacija {
  docFileTypeName?: string;
  docId?: string;
  docLinkId?: number;
  docText?: string;
  docTypeId?: number;
  docTypeName?: string;
  docUrl?: string;
  dokument?: string | null;
  saniraniUrl?: string;
}
export interface TecDocLinkedManufacturer {
  linkingTargetId: number;
  name: string;
}

export interface TecDocLinkedVariant {
  articleLinkId?: number;
  linkingTargetId?: number;
  carId?: number;
  engine?: string;
  constructionType?: string;
  powerKwFrom?: number;
  powerKwTo?: number;
  powerHpFrom?: number;
  powerHpTo?: number;
  cylinderCapacity?: number;
  productionYearFrom?: number;
  productionYearTo?: number;
}

export interface TecDocLinkedModel {
  modelId?: number;
  modelName?: string;
  variants?: TecDocLinkedVariant[];
}

export interface TecDocLinkedManufacturerTargets {
  manufacturerId?: number;
  manufacturerName?: string;
  models?: TecDocLinkedModel[];
}

export class Magacin {
  categories?: object;
  proizvodjaci?: Manufacture[];
  robaDto?: PaginatedResponse<Roba>;
}

export interface ShowcaseResponse {
  prioritetne: Roba[];
  maziva: Roba[];
  alati: Roba[];
  pribor: Roba[];
}

export class Roba {
  aplikacije?: Map<string, RobaAplikacija[]>;
  asociraniArtikli: Roba[] = [];
  availabilityStatus?: AvailabilityStatus;
  /** Internal UI key for cart identification (supports provider-only items). */
  cartKey?: string;
  cena?: number;
  dokumentacija?: Object;
  dozvoljenoZaAnonimusa?: boolean;
  grupa?: string;
  grupaNaziv?: string;
  katbr?: string;
  katbrpro?: string;
  kolicina?: number;
  naziv?: string;
  podGrupa?: number;
  podGrupaNaziv?: string;
  proizvodjac?: Manufacture;
  proizvodjacLogo?: string | ArrayBuffer;
  providerAvailability?: ProviderAvailabilityDto;
  rabat: number = 0;
  robaid?: number;
  /** TecDoc article identifier for external-only items (when `robaid` is null). */
  tecDocArticleId?: number;
  slika?: Slika;
  stanje: number = 0;
  tdBrojevi?: RobaBrojevi[];
  tdLinkageCriteria?: RobaTehnickiOpis[];
  tehnickiOpis?: RobaTehnickiOpis[];
  tekst?: string;
  uKorpi = false;
  linkedManufacturers?: TecDocLinkedManufacturer[];
}

export class CartItem {
  /** Stable cart identifier. For local items: `ROBA:<robaId>`, for provider items: `PROVIDER:<provider>:<proid>:<articleNumber>` */
  key?: string;
  discount?: number;
  image?: Slika;
  manufacturer?: Manufacture | string;
  manufacturerProid?: string;
  name?: string;
  partNumber?: string;
  quantity?: number;
  robaId?: number | null;
  tecDocArticleId?: number;
  stock?: number;
  totalPrice?: number;
  unitPrice?: number;
  source?: 'STOCK' | 'PROVIDER';
  provider?: string;
  providerArticleNumber?: string;
  providerProductId?: string;
  providerStockToken?: string;
  providerWarehouse?: string;
  providerWarehouseName?: string;
  providerCurrency?: string;
  providerCustomerPrice?: number;
  providerPurchasePrice?: number;
  providerNoReturnable?: boolean;
  providerPackagingUnit?: number;
  providerLeadTimeBusinessDays?: number;
  providerDeliveryToCustomerBusinessDaysMin?: number;
  providerDeliveryToCustomerBusinessDaysMax?: number;
  providerNextDispatchCutoff?: string;
  providerExpectedDelivery?: string;
  providerCoreCharge?: number;
  providerRealtimeChecked?: boolean;
  providerRealtimeCheckedAt?: string;
  technicalDescription?: RobaTehnickiOpis[];
}
