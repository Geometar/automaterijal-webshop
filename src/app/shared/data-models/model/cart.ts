import { Manufacture } from "./proizvodjac";
import { Slika } from "./slika";

export class ValueHelp {
  id?: number;
  naziv?: string;
}

export class Cart {
  public roba: CartItem[] = [];
  public ukupno: number = 0;
  public nacinPlacanja?: number;
  public nacinIsporuke?: number;
  public napomena?: string;

  constructor(init?: Partial<CartItem>) {
    Object.assign(this, init);
  }

  public getUkupno(): number {
    return this.roba.reduce((sum, item) => sum + (item.cenaUkupno ?? 0), 0);
  }
}
export class CartItem {
  public readonly cenaKom: number;
  public readonly cenaUkupno: number;
  public readonly katbr: string;
  public readonly kolicina: number;
  public readonly naziv: string;
  public readonly proizvodjac?: Manufacture;
  public readonly rabat?: number;
  public readonly robaid: number;
  public readonly slika?: Slika;
  public readonly stanje?: number;
  public readonly zaAnonimusa?: boolean;

  constructor(
    robaid: number,
    katbr: string,
    naziv: string,
    proizvodjac: Manufacture,
    kolicina: number,
    rabat: number = 0,
    cenaKom: number,
    stanje?: number,
    slika?: Slika,
    zaAnonimusa: boolean = false
  ) {
    this.cenaKom = cenaKom;
    this.cenaUkupno = +(cenaKom * kolicina).toFixed(2); // two decimals
    this.katbr = katbr;
    this.kolicina = kolicina;
    this.naziv = naziv;
    this.proizvodjac = proizvodjac;
    this.rabat = rabat;
    this.robaid = robaid;
    this.slika = slika;
    this.stanje = stanje;
    this.zaAnonimusa = zaAnonimusa;
  }
}