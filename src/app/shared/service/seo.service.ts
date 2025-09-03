import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface UpdateSeoArgs {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string;           // og:type
  keywords?: string;
  robots?: string;
  siteName?: string;       // og:site_name
  locale?: string;         // og:locale (npr. 'sr_RS')
  imageAlt?: string;       // og:image:alt i twitter:image:alt
  twitterCard?: 'summary' | 'summary_large_image';
  canonical?: string;      // canonical href (podrazumevano = url)
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  constructor(
    private titleService: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private doc: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  updateSeoTags({
    title,
    description,
    url,
    image = 'https://www.automaterijal.com/images/logo/logo.svg',
    type = 'website',
    keywords,
    robots,
    siteName = 'Automaterijal',
    locale = 'sr_RS',
    imageAlt,
    twitterCard = 'summary_large_image',
    canonical
  }: UpdateSeoArgs): void {
    // Title
    this.titleService.setTitle(title);

    // Basic meta
    this.upsertName('description', description);
    if (keywords) this.upsertName('keywords', keywords);
    if (robots) this.upsertName('robots', robots);

    // Open Graph
    this.upsertProp('og:title', title);
    this.upsertProp('og:description', description);
    this.upsertProp('og:url', url);
    this.upsertProp('og:type', type);
    this.upsertProp('og:image', image);
    this.upsertProp('og:site_name', siteName);
    this.upsertProp('og:locale', locale);
    if (imageAlt) this.upsertProp('og:image:alt', imageAlt);

    // Twitter
    this.upsertName('twitter:card', twitterCard);
    this.upsertName('twitter:title', title);
    this.upsertName('twitter:description', description);
    this.upsertName('twitter:image', image);
    if (imageAlt) this.upsertName('twitter:image:alt', imageAlt);

    // Canonical
    this.setCanonical(canonical || url);
  }
  clearJsonLd(id: string = 'seo-jsonld'): void {
    const el = this.doc.getElementById(id);
    if (el) el.remove();
  }

  /** JSON-LD (schema.org) – npr. Product, BreadcrumbList, Organization... */
  setJsonLd(json: unknown, id: string = 'seo-jsonld'): void {
    let script = this.doc.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = this.doc.createElement('script');
      script.type = 'application/ld+json';
      script.id = id;
      this.doc.head.appendChild(script);
    }
    script.text = JSON.stringify(json);
  }

  /** Alias za kompatibilnost sa starim pozivom */
  updateJsonLd(json: unknown, id: string = 'seo-jsonld'): void {
    this.setJsonLd(json, id);
  }

  /** Helperi: pouzdano upsert meta tagova bez duplikata */
  private upsertName(name: string, content: string) {
    this.meta.updateTag({ name, content }, `name='${name}'`);
  }
  private upsertProp(property: string, content: string) {
    this.meta.updateTag({ property, content }, `property='${property}'`);
  }

  // u SeoService
  setLinkRel(rel: 'prev' | 'next', href: string | null) {
    const sel = `link[rel='${rel}']`;
    let link = this.doc.querySelector(sel) as HTMLLinkElement | null;
    if (!href) { if (link) link.remove(); return; }
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', rel);
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  /** Canonical link */
  private setCanonical(href: string) {
    let link: HTMLLinkElement | null = this.doc.querySelector("link[rel='canonical']");
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}