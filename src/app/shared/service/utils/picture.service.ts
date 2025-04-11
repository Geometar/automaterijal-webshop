import { Injectable } from '@angular/core';
import { Roba } from '../../data-models/model/roba';
import { InvoiceItem } from '../../data-models/model';

@Injectable({
  providedIn: 'root'
})
export class PictureService {

  constructor() { }

  convertByteToImageArray(roba: Roba[]): void {
    roba.forEach(r => {
      this.convertByteToImage(r);
    });
  }

  convertByteToImage(r: Roba): void {
    if (!r.slika?.isUrl && r.slika?.slikeByte) {
      r.slika.slikeUrl = 'data:image/jpeg;base64,' + r.slika.slikeByte;
    }
    if (r.proizvodjacLogo && !r.proizvodjacLogo.toString().startsWith('data:')) {
      r.proizvodjacLogo = 'data:image/jpeg;base64,' + r.proizvodjacLogo;
    }
  }

  convertByteToImageInvoice(r: InvoiceItem): void {
    if (!r.slika?.isUrl && r.slika?.slikeByte) {
      r.slika.slikeUrl = 'data:image/jpeg;base64,' + r.slika.slikeByte;
    }
  }

  convertByteToImageByte(value: string): string {
    return !value.includes('data:image/jpeg;base64') ? 'data:image/jpeg;base64,' + value : value;
  }
}
