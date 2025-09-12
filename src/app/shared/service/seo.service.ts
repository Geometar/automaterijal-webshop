// shared/service/seo.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export interface UpdateSeoArgs {
  title: string;
  description: string;
  url: string;                // also used for og:url
  image?: string;             // absolute URL
  type?: string;              // og:type (website | article | product ...)
  keywords?: string;
  robots?: string;            // e.g. "index, follow" | "noindex, follow"
  siteName?: string;          // og:site_name
  locale?: string;            // og:locale (e.g. 'sr_RS')
  imageAlt?: string;          // og:image:alt and twitter:image:alt
  canonical?: string;         // canonical href (defaults to url)
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  constructor(
    private titleService: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private doc: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  setHtmlLang(lang: string) {
    const html = this.doc.documentElement;
    if (html && html.lang !== lang) html.lang = lang;
  }

  // ===== NEW: OG image meta (sa dimenzijama) =====
  setOgImageMeta(opts: {
    url: string;
    alt?: string;
    type?: string;      // image/png, image/webp...
    width?: number;     // u px
    height?: number;    // u px
  }) {
    this.upsertProp('og:image', opts.url);
    if (opts.alt) this.upsertProp('og:image:alt', opts.alt);
    if (opts.type) this.upsertProp('og:image:type', opts.type);
    if (opts.width) this.upsertProp('og:image:width', String(opts.width));
    if (opts.height) this.upsertProp('og:image:height', String(opts.height));
  }

  // (opciono) očisti meta po potrebi na specifičnim rutama
  clearMetaBySelector(selector: string) {
    Array.from(this.doc.head.querySelectorAll(`meta[${selector}]`)).forEach(m => m.remove());
  }

  // ===== High-level entry point =====

  /**
   * Update all essential SEO tags at once:
   * - Title, description, keywords, robots
   * - Open Graph tags (og:title, og:description, og:image...)
   * - Twitter tags
   * - Canonical link
   */
  updateSeoTags({
    title,
    description,
    url,
    image = 'https://automaterijal.com/images/logo/logo.svg',
    type = 'website',
    keywords,
    robots,
    siteName = 'Automaterijal',
    locale = 'sr_RS',
    imageAlt,
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

    this.setHtmlLang('sr-RS');
    // Canonical
    this.ensureCanonical(canonical || url);
  }

  /** Quickly update only the robots directive */
  setRobots(value: string) {
    this.upsertName('robots', value);
  }

  // ===== Canonical and link relations =====

  /** Force set canonical (creates <link rel="canonical"> if missing) */
  setCanonicalUrl(href: string) {
    let link = this.doc.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  /** Update canonical only if different (avoids reflow) */
  ensureCanonical(href: string) {
    const current = this.doc.querySelector<HTMLLinkElement>("link[rel='canonical']")?.href;
    if (current !== href) this.setCanonicalUrl(href);
  }

  /** Remove canonical (rarely needed) */
  clearCanonical() {
    this.doc.querySelector("link[rel='canonical']")?.remove();
  }

  /** Add <link rel="prev/next"> for pagination */
  setLinkRel(rel: 'prev' | 'next', href: string | null) {
    const sel = `link[rel='${rel}']`;
    let link = this.doc.querySelector<HTMLLinkElement>(sel);
    if (!href) { if (link) link.remove(); return; }
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', rel);
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  // ===== JSON-LD (schema.org) =====

  /** Insert/replace JSON-LD script by ID (default = 'seo-jsonld') */
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

  /** Alias for backward compatibility */
  updateJsonLd(json: unknown, id: string = 'seo-jsonld'): void {
    this.setJsonLd(json, id);
  }

  /** Remove JSON-LD script by ID */
  clearJsonLd(id: string = 'seo-jsonld'): void {
    this.doc.getElementById(id)?.remove();
  }

  // ===== Hreflang =====

  /**
   * Set alternate hreflang links for multi-language sites
   * Example: { 'sr-RS': 'https://.../sr', 'en': 'https://.../en' }
   */
  setHreflang(alternates: Record<string, string>) {
    this.doc.querySelectorAll("link[rel='alternate'][hreflang]").forEach(el => el.remove());
    Object.entries(alternates).forEach(([lang, href]) => {
      const link = this.doc.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', lang);
      link.setAttribute('href', href);
      this.doc.head.appendChild(link);
    });
  }

  // ===== Performance helpers =====

  /** Preload main image (improves LCP for product pages) */
  preloadImage(src?: string) {
    if (!src || !isPlatformBrowser(this.platformId)) return;
    const exists = Array.from(this.doc.head.querySelectorAll('link[rel="preload"]'))
      .some(l => (l as HTMLLinkElement).href === src);
    if (exists) return;

    const link = this.doc.createElement('link');
    link.setAttribute('rel', 'preload');
    link.setAttribute('as', 'image');
    link.setAttribute('href', src);
    this.doc.head.appendChild(link);
  }

  // ===== Low-level helpers =====

  /** Upsert meta tag by "name" attribute */
  private upsertName(name: string, content: string) {
    this.meta.updateTag({ name, content }, `name='${name}'`);
  }

  /** Upsert meta tag by "property" attribute */
  private upsertProp(property: string, content: string) {
    this.meta.updateTag({ property, content }, `property='${property}'`);
  }
}