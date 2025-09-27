import { Manufacture } from "./proizvodjac";
import { PaginatedResponse } from "./page";
import { Slika } from "./slika";

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
  rabat: number = 0;
  robaid?: number;
  slika?: Slika;
  stanje: number = 0;
  tdBrojevi?: RobaBrojevi[];
  tdLinkageCriteria?: RobaTehnickiOpis[];
  tehnickiOpis?: RobaTehnickiOpis[];
  tekst?: string;
  uKorpi = false;
}

export class CartItem {
  discount?: number;
  image?: Slika;
  manufacturer?: Manufacture;
  name?: string;
  partNumber?: string;
  quantity?: number;
  robaId?: number;
  stock?: number;
  totalPrice?: number;
  unitPrice?: number;
  technicalDescription?: RobaTehnickiOpis[];
}