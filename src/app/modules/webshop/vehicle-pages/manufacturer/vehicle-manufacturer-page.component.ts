import { DOCUMENT, CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, of, Subject, switchMap, takeUntil } from 'rxjs';

import { VehicleCategoryType } from '../../../../shared/data-models/enums/vehicle-category-type.enum';
import {
  VehicleCatalogService,
  VehicleManufacturerSummary,
  VehicleModelSummary,
  VehicleTypeDefinition,
} from '../../../../shared/service/utils/vehicle-catalog.service';
import { SeoService } from '../../../../shared/service/seo.service';
import { WebshopNavBreadcrumbs, WebshopNavComponent } from '../../webshop-nav/webshop-nav.component';
import { Filter } from '../../../../shared/data-models/model/roba';
import { TDVehicleDetails } from '../../../../shared/data-models/model/tecdoc';
import { VehicleUrlService } from '../../../../shared/service/utils/vehicle-url.service';

@Component({
  selector: 'app-vehicle-manufacturer-page',
  standalone: true,
  imports: [CommonModule, RouterModule, WebshopNavComponent],
  templateUrl: './vehicle-manufacturer-page.component.html',
  styleUrl: './vehicle-manufacturer-page.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class VehicleManufacturerPageComponent implements OnInit, OnDestroy {
  filter = new Filter();
  searchTerm = '';
  selectedVehicle: TDVehicleDetails | null = null;
  customBreadcrumbs: WebshopNavBreadcrumbs | null = null;
  manufacturer: VehicleManufacturerSummary | null = null;
  models: VehicleModelSummary[] = [];
  familyGroups: Array<{
    base: string;
    variants: Array<{
      variant: string;
      models: VehicleModelSummary[];
    }>;
  }> = [];
  baseFamilies: Array<{ base: string; count: number }> = [];
  activeFamily: string | null = null;
  loading = true;
  notFound = false;

  private destroy$ = new Subject<void>();
  private readonly vehicleTypes: VehicleTypeDefinition[];

  constructor(
    private route: ActivatedRoute,
    private seoService: SeoService,
    private vehicleCatalogService: VehicleCatalogService,
    private vehicleUrlService: VehicleUrlService,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.vehicleTypes = this.vehicleCatalogService.getVehicleTypes();
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          const slug = (params.get('manufacturerSlug') || '').trim();
          if (!slug) {
            this.setNotFoundState();
            return of({ manufacturer: null, models: [] });
          }

          this.loading = true;
          return this.vehicleCatalogService
            .resolveManufacturerBySlug(slug)
            .pipe(
              switchMap((manufacturer) => {
                if (!manufacturer) {
                  this.setNotFoundState(slug);
                  return of({ manufacturer: null, models: [] });
                }

                return this.vehicleCatalogService
                  .getModelsForManufacturer(manufacturer)
                  .pipe(map((models) => ({ manufacturer, models })));
              })
            );
        })
      )
      .subscribe(({ manufacturer, models }) => {
        this.manufacturer = manufacturer;
        this.models = models;
        this.familyGroups = this.groupModelsByFamily(models);
        this.baseFamilies = this.familyGroups.map((group) => ({
          base: group.base,
          count: group.variants.reduce((acc, variant) => acc + variant.models.length, 0),
        }));
        this.loading = false;
        this.notFound = !manufacturer;
        this.customBreadcrumbs = manufacturer
          ? {
              second: 'Korak 1: Tip vozila',
              secondLink: ['/webshop/vozila'],
              third: `Korak 2: ${manufacturer.name}`,
            }
          : {
              second: 'Korak 1: Tip vozila',
              secondLink: ['/webshop/vozila'],
            };
        this.updateSeoTags(manufacturer);
      });
  }

  handleNavVehicleSelected(vehicle: TDVehicleDetails): void {
    this.vehicleUrlService.navigateToVehicle(vehicle);
  }

  trackVariant(_: number, variant: { variant: string }): string {
    return variant.variant;
  }

  selectFamily(base: string): void {
    this.activeFamily = base;
    const anchor = this.familyAnchor(base);
    setTimeout(() => {
      const el = this.document?.getElementById(anchor);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 10);
  }

  private groupModelsByFamily(
    models: VehicleModelSummary[]
  ): Array<{
    base: string;
    variants: Array<{ variant: string; models: VehicleModelSummary[] }>;
  }> {
    const familyMap = new Map<
      string,
      Map<string, VehicleModelSummary[]>
    >();

    models.forEach((model) => {
      const { base, variant } = this.extractBaseAndVariant(model.name || '');
      if (!familyMap.has(base)) {
        familyMap.set(base, new Map());
      }
      const variantsMap = familyMap.get(base)!;
      const variantKey = variant || base;
      if (!variantsMap.has(variantKey)) {
        variantsMap.set(variantKey, []);
      }
      variantsMap.get(variantKey)!.push(model);
    });

    return Array.from(familyMap.entries())
      .map(([base, variantMap]) => ({
        base,
        variants: Array.from(variantMap.entries())
          .map(([variant, grouped]) => ({
            variant,
            models: grouped,
          }))
          .sort((a, b) => a.variant.localeCompare(b.variant, undefined, { numeric: true, sensitivity: 'base' })),
      }))
      .sort((a, b) =>
        a.base.localeCompare(b.base, undefined, { numeric: true, sensitivity: 'base' })
      );
  }

  private extractBaseAndVariant(name: string): { base: string; variant: string } {
    const clean = name.replace(/\(.*?\)/g, '').trim();
    if (!clean) {
      return { base: 'MODEL', variant: '' };
    }
    const tokens = clean.split(/\s+/);
    const base = tokens[0]?.toUpperCase() || 'MODEL';
    const variant = tokens[1]?.toUpperCase() || '';
    return { base, variant };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getVehicleTypeLabel(code?: VehicleCategoryType): string {
    if (!code) {
      return '';
    }
    return (
      this.vehicleTypes.find((type) => type.code === code)?.label ||
      'Vozilo'
    );
  }

  formatModelConstructionRange(model: VehicleModelSummary): string {
    const formatValue = (value?: number): string | null => {
      if (!value) {
        return null;
      }
      const raw = value.toString();
      if (!raw.length) {
        return null;
      }
      const year = raw.substring(0, 4);
      const month = raw.substring(4, 6) || '01';
      return `${month}.${year}`;
    };

    const from = formatValue(model.constructedFrom);
    const to = formatValue(model.constructedTo);

    if (from && to) {
      return `${from} - ${to}`;
    }
    if (from) {
      return `${from} - Trenutno`;
    }
    if (to) {
      return `- ${to}`;
    }
    return 'Godine proizvodnje nisu navedene – proverićemo kompatibilnost za tebe.';
  }

  formatVariantTitle(base: string, variant: string): string {
    return variant === base || !variant
      ? base
      : `${base} ${variant}`;
  }

  formatVariantBadge(base: string, variant: string): string {
    return variant === base || !variant ? base : variant;
  }

  formatModelName(model: VehicleModelSummary, base: string): string {
    const raw = model.name || '';
    const normalizedBase = base.toLowerCase();
    const cleaned = raw.replace(/\(.*?\)/g, '').trim();
    if (cleaned.toLowerCase().startsWith(normalizedBase)) {
      const sliced = cleaned.substring(base.length).trim();
      if (sliced) {
        return sliced;
      }
    }
    return raw;
  }

  familyAnchor(base: string): string {
    return `family-${base}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  private setNotFoundState(slug?: string): void {
    this.manufacturer = null;
    this.models = [];
    this.loading = false;
    this.notFound = true;
    this.updateSeoTags(
      slug
        ? {
            id: 0,
            name: slug,
            slug,
            vehicleType: VehicleCategoryType.PASSENGER,
          }
        : null
    );
  }

  private updateSeoTags(
    manufacturer: VehicleManufacturerSummary | null
  ): void {
    const baseUrl = manufacturer
      ? `https://automaterijal.com/webshop/vozila/${manufacturer.slug}`
      : 'https://automaterijal.com/webshop/vozila';
    const title = manufacturer
      ? `Auto delovi za ${manufacturer.name} – modeli, motori, filteri, ulja`
      : 'Proizvođač vozila nije pronađen';
    const description = manufacturer
      ? `Lista modela i motora za ${manufacturer.name}. Odmah proveri kompatibilne delove: filteri, ulja i maziva, kočnice, trap, elektrika. Brza dostava i podrška.`
      : 'Stranica proizvođača trenutno nije dostupna – potraži vozilo ponovo ili pozovi naš tim za pomoć oko delova.';
    this.seoService.updateSeoTags({
      title: `${title} | Automaterijal`,
      description,
      url: baseUrl,
      robots: manufacturer ? 'index, follow' : 'noindex, follow',
      canonical: baseUrl,
    });
  }
}
