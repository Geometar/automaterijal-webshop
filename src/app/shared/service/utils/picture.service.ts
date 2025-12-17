import { Injectable } from '@angular/core';
import { Roba } from '../../data-models/model/roba';
import { InvoiceItem } from '../../data-models/model';
import { Slika } from '../../data-models/model/slika';
import { environment } from '../../../../environment/environment';

export interface ProductImageMeta {
  src: string;
  alt: string;
  title: string;
  hasImage: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PictureService {

  private readonly fallbackImage = 'https://automaterijal.com/images/no-image/no-image.png';
  private readonly fallbackAlt = 'Nema dostupne slike';
  private readonly apiBase = (environment.apiUrl || '').replace(/\/$/, '');
  private readonly fallbackComparisons = new Set<string>([
    '/images/no-image/no-image.png',
  ]);

  constructor() { }

  convertByteToImageArray(roba: Roba[]): void {
    roba.forEach(r => {
      this.convertByteToImage(r);
    });
  }

  convertByteToImage(r: Roba): void {
    if (r.slika) {
      const normalized = this.normalizeImagePath(r.slika.slikeUrl);
      if (normalized) {
        r.slika.slikeUrl = normalized;
        this.updateUrlFlag(r.slika, true);
      } else {
        r.slika.slikeUrl = undefined;
        this.updateUrlFlag(r.slika, false);
      }
    }

    if (r.proizvodjacLogo && typeof r.proizvodjacLogo === 'string') {
      const logo = r.proizvodjacLogo.trim();
      if (!logo) {
        r.proizvodjacLogo = undefined;
      } else if (logo.startsWith('data:') || /^https?:\/\//i.test(logo)) {
        r.proizvodjacLogo = logo;
      } else if (/[.\\/]/.test(logo)) {
        r.proizvodjacLogo = this.normalizeImagePath(logo) ?? logo;
      } else {
        r.proizvodjacLogo = this.toDataUrl(logo, 'image/jpeg') ?? r.proizvodjacLogo;
      }
    }
  }

  convertByteToImageInvoice(r: InvoiceItem): void {
    if (!r.slika) return;
    const normalizedUrl = this.normalizeImagePath(r.slika.slikeUrl);
    if (normalizedUrl) {
      r.slika.slikeUrl = normalizedUrl;
      this.updateUrlFlag(r.slika, true);
    } else {
      r.slika.slikeUrl = undefined;
      this.updateUrlFlag(r.slika, false);
    }
  }

  hasImage(slika?: Slika | null): boolean {
    if (!slika) return false;
    const normalized = this.normalizeImagePath(slika.slikeUrl);
    if (!normalized) return false;
    return !this.isFallbackImage(normalized);
  }

  buildImageSrc(slika?: Slika | null, fallback: string = this.fallbackImage): string {
    if (!slika) {
      return fallback;
    }

    const normalized = this.normalizeImagePath(slika.slikeUrl);
    if (!normalized || this.isFallbackImage(normalized)) {
      return fallback;
    }
    return normalized;
  }

  buildProductImageMeta(roba?: Roba | null): ProductImageMeta {
    const hasImage = this.hasImage(roba?.slika);
    const src = hasImage ? this.buildImageSrc(roba?.slika, this.fallbackImage) : this.fallbackImage;
    const alt = hasImage ? this.composeAlt(roba) : this.fallbackAlt;
    return {
      src,
      alt,
      title: alt,
      hasImage,
    };
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

  private updateUrlFlag(slika: Slika, value: boolean): void {
    slika.isUrl = value ? true : undefined;
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

  private normalizeImagePath(src?: string | null): string | null {
    if (!src) return null;
    const trimmed = src.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('data:') || /^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    if (this.apiBase && this.isApiPath(path)) {
      return `${this.apiBase}${path}`;
    }
    return path;
  }

  private isApiPath(path: string): boolean {
    return /^\/api(?:\/|\?|#|$)/i.test(path);
  }

  private normalizeForComparison(url: string): string {
    if (!url) return '';
    let trimmed = url.trim().toLowerCase();
    if (!trimmed) return '';
    trimmed = trimmed.replace(/^https?:\/\//, '');
    if (trimmed.startsWith('automaterijal.com')) {
      trimmed = trimmed.slice('automaterijal.com'.length);
    }
    if (!trimmed.startsWith('/')) {
      trimmed = '/' + trimmed;
    }
    return trimmed;
  }

  private isFallbackImage(url: string): boolean {
    const comparison = this.normalizeForComparison(url);
    return this.fallbackComparisons.has(comparison);
  }

  private composeAlt(roba?: Roba | null): string {
    if (!roba) {
      return this.fallbackAlt;
    }

    const brand = this.normalizeText(roba.proizvodjac?.naziv);
    const name = this.normalizeText(roba.naziv);
    const sku = this.normalizeText(roba.katbr);
    const keySpec = this.extractKeySpec(roba);

    const base = [brand, name, sku].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    const alt = keySpec ? `${base}${base ? ' – ' : ''}${keySpec}` : base;
    return alt || this.fallbackAlt;
  }

  private extractKeySpec(roba: Roba): string | null {
    const candidates = [...(roba.tehnickiOpis ?? []), ...(roba.tdLinkageCriteria ?? [])];
    for (const spec of candidates) {
      const labelParts = [spec?.oznaka, spec?.vrednost, spec?.jedinica]
        .map((part) => this.normalizeText(part))
        .filter(Boolean);
      if (labelParts.length) {
        return labelParts.join(' ').replace(/\s+/g, ' ').trim();
      }
    }
    return null;
  }

  private normalizeText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }
}
