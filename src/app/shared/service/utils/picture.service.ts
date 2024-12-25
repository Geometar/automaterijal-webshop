import { Injectable } from '@angular/core';
import { Roba } from '../../data-models/model/roba';

@Injectable({
  providedIn: 'root'
})
export class PictureService {

  constructor() { }

  convertByteToImage(roba: Roba[]): void {
    roba.forEach(r => {
      if (!r.slika?.isUrl && r.slika?.slikeByte) {
        r.slika.slikeUrl = 'data:image/jpeg;base64,' + r.slika.slikeByte;
      }
    });
  }
}
