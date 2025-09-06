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

  toDataUrl(
    src: string | ArrayBuffer | null | undefined,
    fallbackMime: 'image/jpeg' | 'image/png' | 'image/gif' | 'application/pdf' = 'image/jpeg'
  ): string | null {
    if (!src) return null;

    // Ako je već data URL – vrati kako jeste
    if (typeof src === 'string' && src.trim().startsWith('data:')) {
      return src.trim();
    }

    // Ako je string bez prefiksa – tretiraj kao base64 payload
    if (typeof src === 'string') {
      const base64 = src.trim();
      if (!base64) return null;
      return `data:${fallbackMime};base64,${base64}`;
    }

    // Ako je ArrayBuffer – konvertuj u base64 i prefiksuj
    if (src instanceof ArrayBuffer) {
      const base64 = this.arrayBufferToBase64(src);
      return `data:${fallbackMime};base64,${base64}`;
    }

    return null;
  }

  private arrayBufferToBase64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // btoa je OK jer dolazi binarni string (nije UTF-8)
    return btoa(binary);
  }
}
