import { Injectable } from '@angular/core';
import { Roba } from '../../data-models/model/roba';

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
    if (r.proizvodjacLogo && !r.proizvodjacLogo.toString().includes('data:image/jpeg;base64')) {
      r.proizvodjacLogo = 'data:image/jpeg;base64,' + r.proizvodjacLogo;
    }
  }

  convertByteToImageByte(value: string): string {
    return !value.includes('data:image/jpeg;base64') ? 'data:image/jpeg;base64,' + value : value;
  }
}
