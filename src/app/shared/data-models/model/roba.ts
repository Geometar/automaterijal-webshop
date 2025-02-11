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

  Filter() {
    this.naStanju = false;
    this.raspolozivost = 'Svi artikli';
  }
}

export class RobaTehnickiOpis {
  oznaka?: number;
  vrednost?: number;
  jedinica?: number;
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
  dokument?: string;
  saniraniUrl?: string;
}

export class Magacin {
  categories?: object;
  proizvodjaci?: Manufacture[];
  robaDto?: PaginatedResponse<Roba>;
}

export class Roba {
  aplikacije?: Map<string, RobaAplikacija[]>;
  asociraniArtikli: Roba[] = [];
  cena?: number;
  dokumentacija?: Object;
  dozvoljenoZaAnonimusa?: boolean;
  katbr?: string;
  katbrpro?: string;
  kolicina?: number;
  naziv?: string;
  podGrupaNaziv?: string;
  proizvodjac?: Manufacture;
  proizvodjacLogo?: string | ArrayBuffer;
  rabat: number = 0;
  robaid?: number;
  slika?: Slika;
  stanje: number = 0;
  tdBrojevi?: RobaBrojevi[];
  tehnickiOpis?: RobaTehnickiOpis[];
  tekst?: string;
  uKorpi = false;
}
