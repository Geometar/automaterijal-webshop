import { Page } from "./page";
import { Proizvodjac } from "./proizvodjac";
import { Slika } from "./slika";

export class Filter {
  proizvodjacId?: string;
  proizvodjac?: string;
  raspolozivost?: string;
  naStanju?: boolean;
  grupa?: string;
  pretrazitiGrupe?: boolean;

  Filter() {
    this.proizvodjac = '';
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

export class TecDocDokumentacija {
  docFileTypeName?: string;
  docId?: string;
  docLinkId?: number;
  docText?: string;
  docTypeId?: number;
  docTypeName?: string;
  docUrl?: string;
  saniraniUrl?: string;
  dokument?: string | ArrayBuffer;
}

export class Magacin {
  robaDto?: RobaPage;
  podgrupe?: string[];
  proizvodjaci?: Proizvodjac[];
}
export class RobaPage extends Page {
  content?: Roba[] = [];
}

export class Roba {
  robaid?: number;
  slika?: Slika;
  katbr?: string;
  katbrpro?: string;
  dozvoljenoZaAnonimusa?: boolean;
  naziv?: string;
  tekst?: string;
  stanje?: number;
  cena?: number;
  rabat?: number;
  kolicina?: number;
  uKorpi = false;
  proizvodjac?: Proizvodjac;
  proizvodjacLogo?: string | ArrayBuffer;
  tehnickiOpis?: RobaTehnickiOpis[];
  tdBrojevi?: Map<string, RobaBrojevi[]>;
  aplikacije?: Map<string, RobaAplikacija[]>;
  dokumentacija?: Map<string, TecDocDokumentacija[]>;
  asociraniArtikli: Roba[] = [];
}