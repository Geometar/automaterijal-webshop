import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  Subject,
  Subscription,
  catchError,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
  shareReplay,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs';

// Components
import { ShowcaseComponent, ShowcaseSection } from '../../../shared/components/showcase/showcase.component';

// Data models
import { Brand, BrandPageData, BrandPageSectionHighlight } from '../../../shared/data-models/interface';
import { Filter, Magacin, Roba } from '../../../shared/data-models/model/roba';

// Services
import { BrandPageService } from '../../../shared/service/brand-page.service';
import { ConfigService } from '../../../shared/service/config.service';
import { RobaService } from '../../../shared/service/roba.service';
import { SeoService } from '../../../shared/service/seo.service';

// Utils
import { SITE_ORIGIN, buildCanonicalFromPath } from '../../../shared/utils/seo-utils';
import { StringUtils } from '../../../shared/utils/string-utils';
import { DividerComponent } from '../../../shared/components/divider/divider.component';

interface BrandPageViewModel {
  slug: string;
  page: BrandPageData;
  brandConfig: Brand | null;
  manufacturerId: string | null;
  manufacturerSlug: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  ctaRouterLink: any[] | string | null;
  ctaQueryParams: Record<string, string> | null;
  ctaExternal: boolean;
}

@Component({
  selector: 'app-brand-page',
  standalone: true,
  imports: [CommonModule, RouterModule, AsyncPipe, ShowcaseComponent, DividerComponent],
  templateUrl: './brand-page.component.html',
  styleUrls: ['./brand-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly configService = inject(ConfigService);
  private readonly brandPageService = inject(BrandPageService);
  private readonly seoService = inject(SeoService);
  private readonly robaService = inject(RobaService);

  private readonly destroy$ = new Subject<void>();
  private showcaseSub: Subscription | null = null;

  heroBackground = '#f6f6f9';
  heroTextColor = '#0f172a';
  accentColor = '#f97316';

  showcaseSections: ShowcaseSection[] = [];
  showcaseLoading = false;

  readonly vm$ = this.route.paramMap.pipe(
    map((params) => params.get('slug') ?? ''),
    map((slug) => slug.trim().toLowerCase()),
    distinctUntilChanged(),
    tap(() => {
      this.showcaseSections = [];
      this.showcaseLoading = false;
      this.seoService.clearJsonLd('brand-jsonld');
    }),
    switchMap((slug) => {
      if (!slug) {
        return of(null);
      }

      return forkJoin({
        config: this.configService.getConfig().pipe(take(1)),
        page: this.brandPageService.getBrandPage(slug),
      }).pipe(
        map(({ config, page }) => {
          const brandConfig = config.brands.find((brand) => brand.slug === slug) ?? null;
          const manufacturerId = page.manufacturerId ?? brandConfig?.id ?? brandConfig?.label ?? null;
          const manufacturerSlug = brandConfig?.slug ?? StringUtils.slugify(page.name ?? slug);

          const defaultLabel = page.cta?.label ?? 'Pogledaj sve proizvode ovog brenda';
          let ctaLabel: string | null = page.cta?.label ?? null;
          let ctaHref = page.cta?.url ?? null;
          let ctaRouterLink: any[] | string | null = null;
          let ctaQueryParams: Record<string, string> | null = null;
          let ctaExternal = false;

          if (!ctaHref) {
            if (manufacturerSlug) {
              ctaRouterLink = ['/webshop', 'manufacturers', manufacturerSlug];
              ctaHref = `/webshop/manufacturers/${manufacturerSlug}`;
            } else if (manufacturerId) {
              ctaRouterLink = ['/webshop'];
              ctaQueryParams = { proizvodjaci: manufacturerId };
              ctaHref = `/webshop?proizvodjaci=${encodeURIComponent(manufacturerId)}`;
            } else {
              ctaHref = '/webshop';
              ctaRouterLink = ['/webshop'];
            }
          } else if (ctaHref.startsWith('http')) {
            ctaExternal = true;
          } else {
            ctaRouterLink = ctaHref;
            ctaExternal = false;
          }

          if (ctaHref && !ctaLabel) {
            ctaLabel = defaultLabel;
          }

          this.applyHeroStyles(page);
          this.updateSeo(slug, page);
          this.updateBrandSchema(slug, page);
          this.loadShowcase(manufacturerId, manufacturerSlug, page);

          return {
            slug,
            page,
            brandConfig,
            manufacturerId,
            manufacturerSlug,
            ctaLabel,
            ctaHref,
            ctaRouterLink,
            ctaQueryParams,
            ctaExternal,
          } as BrandPageViewModel;
        }),
        catchError((error) => {
          console.error('Failed to load brand page:', error);
          this.seoService.setRobots('noindex, follow');
          return of(null);
        })
      );
    }),
    shareReplay(1)
  );

  ngOnDestroy(): void {
    this.showcaseSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackSection(_index: number, section: { title: string }): string {
    return section.title;
  }

  getHighlights(section: BrandPageData['sections'][number]): BrandPageSectionHighlight[] {
    return section.highlights ?? [];
  }

  private applyHeroStyles(page: BrandPageData): void {
    this.heroBackground = page.hero?.background || '#f6f6f9';
    this.heroTextColor = page.hero?.textColor || '#0f172a';
    this.accentColor = page.hero?.accentColor || '#f97316';
  }

  private updateSeo(slug: string, page: BrandPageData): void {
    const path = `/brendovi/${slug}`;
    const canonical = buildCanonicalFromPath(path);
    const keywords = page.seo.keywords?.join(', ');

    this.seoService.updateSeoTags({
      title: page.seo.title,
      description: page.seo.description,
      url: canonical,
      canonical,
      image: page.seo.ogImage || page.logo,
      keywords,
    });
    this.seoService.preloadImage(page.logo);
  }

  private updateBrandSchema(slug: string, page: BrandPageData): void {
    const brandUrl = buildCanonicalFromPath(`/brendovi/${slug}`);
    const logoUrl = this.toAbsoluteUrl(page.logo);
    const knowsAbout = (page.sections ?? [])
      .map((section) => section.title?.trim())
      .filter((title): title is string => Boolean(title));
    const offerUrl = this.resolveCtaHref(page, slug);

    const brandSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Brand',
      '@id': `${brandUrl}#brand`,
      name: page.name,
      description: page.description,
      url: brandUrl,
      logo: logoUrl,
      image: logoUrl,
      brandOverview: page.hero?.tagline,
      parentOrganization: {
        '@id': `${SITE_ORIGIN}/#organization`,
      },
      hasOfferCatalog: offerUrl
        ? {
            '@type': 'OfferCatalog',
            name: `${page.name} proizvodi`,
            url: offerUrl,
          }
        : undefined,
      knowsAbout: knowsAbout.length ? knowsAbout : undefined,
    };

    // Remove undefined fields before serializing
    Object.keys(brandSchema).forEach((key) => {
      if (brandSchema[key] === undefined) {
        delete brandSchema[key];
      }
    });

    this.seoService.setJsonLd(brandSchema, 'brand-jsonld');
  }

  private toAbsoluteUrl(path?: string | null): string {
    if (!path) {
      return `${SITE_ORIGIN}/images/logo/logo.svg`;
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private resolveCtaHref(page: BrandPageData, slug: string): string | null {
    const { cta } = page;
    if (cta?.url) {
      return this.toAbsoluteUrl(cta.url);
    }
    return `${SITE_ORIGIN}/webshop/manufacturers/${slug}`;
  }

  private loadShowcase(manufacturerId: string | null, manufacturerSlug: string, page: BrandPageData): void {
    this.showcaseSub?.unsubscribe();

    if (!manufacturerId) {
      this.showcaseSections = [];
      this.showcaseLoading = false;
      return;
    }

    const limit = Math.max(1, page.showcase?.limit ?? 5);

    const filter = new Filter();
    filter.naStanju = true;
    filter.proizvodjaci = [manufacturerId];

    this.showcaseLoading = true;

    this.showcaseSub = this.robaService
      .pronadjiSvuRobu(null, limit * 3, 0, '', filter)
      .pipe(
        take(1),
        finalize(() => {
          this.showcaseLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (magacin: Magacin) => {
          const artikli = ((magacin?.robaDto?.content ?? []) as Roba[]).slice(0, limit);
          if (!artikli.length) {
            this.showcaseSections = [];
            return;
          }

          const title = page.showcase?.title ?? 'Popularni artikli';
          this.showcaseSections = [
            {
              title,
              titleUrl: `/webshop/manufacturers/${manufacturerSlug}`,
              artikli,
            },
          ];
        },
        error: (err) => {
          console.error('Showcase fetch failed:', err);
          this.showcaseSections = [];
        },
      });
  }
}
