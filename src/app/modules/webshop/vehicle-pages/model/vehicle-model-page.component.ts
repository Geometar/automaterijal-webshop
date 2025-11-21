import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, of, Subject, switchMap, takeUntil } from 'rxjs';

import {
  VehicleCatalogService,
  VehicleManufacturerSummary,
  VehicleModelSummary,
} from '../../../../shared/service/utils/vehicle-catalog.service';
import { TDVehicleDetails } from '../../../../shared/data-models/model/tecdoc';
import { VehicleUrlService } from '../../../../shared/service/utils/vehicle-url.service';
import { SeoService } from '../../../../shared/service/seo.service';
import { WebshopNavBreadcrumbs, WebshopNavComponent } from '../../webshop-nav/webshop-nav.component';
import { Filter } from '../../../../shared/data-models/model/roba';
import { TecdocSearchHistoryService } from '../../../../shared/service/utils/tecdoc-search-history.service';

@Component({
  selector: 'app-vehicle-model-page',
  standalone: true,
  imports: [CommonModule, RouterModule, WebshopNavComponent],
  templateUrl: './vehicle-model-page.component.html',
  styleUrl: './vehicle-model-page.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class VehicleModelPageComponent implements OnInit, OnDestroy {
  filter = new Filter();
  searchTerm = '';
  selectedVehicle: TDVehicleDetails | null = null;
  customBreadcrumbs: WebshopNavBreadcrumbs | null = null;
  manufacturer: VehicleManufacturerSummary | null = null;
  model: VehicleModelSummary | null = null;
  vehicles: TDVehicleDetails[] = [];
  vehicleSearchTerm = '';
  loading = true;
  notFound = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private seoService: SeoService,
    private vehicleCatalogService: VehicleCatalogService,
    public vehicleUrlService: VehicleUrlService,
    private searchHistoryService: TecdocSearchHistoryService
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          const manufacturerSlug = (params.get('manufacturerSlug') || '').trim();
          const modelSlug = (params.get('modelSlug') || '').trim();
          if (!manufacturerSlug || !modelSlug) {
            this.setNotFoundState();
            return of({ manufacturer: null, model: null, vehicles: [] });
          }

          this.loading = true;
          return this.vehicleCatalogService
            .resolveManufacturerBySlug(manufacturerSlug)
            .pipe(
              switchMap((manufacturer) => {
                if (!manufacturer) {
                  this.setNotFoundState();
                  return of({ manufacturer: null, model: null, vehicles: [] });
                }

                return this.vehicleCatalogService
                  .resolveModelBySlug(manufacturer, modelSlug)
                  .pipe(
                    switchMap((model) => {
                      if (!model) {
                        this.setNotFoundState(manufacturer);
                        return of({
                          manufacturer,
                          model: null,
                          vehicles: [],
                        });
                      }

                      return this.vehicleCatalogService
                        .getVehiclesForModel(manufacturer, model)
                        .pipe(
                          map((vehicles) => ({
                            manufacturer,
                            model,
                            vehicles,
                          }))
                        );
                    })
                  );
              })
            );
        })
      )
      .subscribe(({ manufacturer, model, vehicles }) => {
        this.manufacturer = manufacturer;
        this.model = model;
        this.vehicles = vehicles;
        this.loading = false;
        this.notFound = !manufacturer || !model;
        this.customBreadcrumbs = this.buildBreadcrumbs(manufacturer, model);
        this.updateSeoTags(manufacturer, model);
      });
  }

  get filteredVehicles(): TDVehicleDetails[] {
    const term = this.vehicleSearchTerm.trim().toLowerCase();
    if (!term) {
      return this.vehicles;
    }
    return this.vehicles.filter((vehicle) => this.vehicleMatchesTerm(vehicle, term));
  }

  get hasActiveVehicleFilter(): boolean {
    return !!this.vehicleSearchTerm.trim();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatVehiclePower(vehicle: TDVehicleDetails): string {
    const kw = vehicle.kiloWattsTo || vehicle.kiloWattsFrom;
    const hp = vehicle.horsePowerTo || vehicle.horsePowerFrom;

    if (!kw && !hp) {
      return 'Snaga nije navedena';
    }

    if (kw && hp) {
      return `${kw} kw / ${hp} hp`;
    }

    if (kw) {
      return `${kw} kw`;
    }

    return `${hp} hp`;
  }

  formatVehicleYears(vehicle: TDVehicleDetails): string {
    const from = vehicle.beginYearMonth
      ? this.formatYearMonth(vehicle.beginYearMonth)
      : null;
    const to = vehicle.endYearMonth
      ? this.formatYearMonth(vehicle.endYearMonth)
      : 'Trenutno';

    if (from && to) {
      return `${from} - ${to}`;
    }

    return from || to || 'Godine proizvodnje nisu navedene';
  }

  private formatYearMonth(source: string): string {
    const raw = source.replace(/[^0-9]/g, '');
    const year = raw.substring(0, 4);
    const month = raw.substring(4, 6) || '01';
    return `${month}.${year}`;
  }

  private setNotFoundState(
    manufacturer?: VehicleManufacturerSummary | null
  ): void {
    this.notFound = true;
    this.loading = false;
    this.vehicles = [];
    this.updateSeoTags(manufacturer ?? null, null);
  }

  private updateSeoTags(
    manufacturer: VehicleManufacturerSummary | null,
    model: VehicleModelSummary | null
  ): void {
    const slugParts = [
      'https://automaterijal.com/webshop/vozila',
      manufacturer?.slug,
      model?.slug,
    ]
      .filter(Boolean)
      .join('/');

    const url = slugParts || 'https://automaterijal.com/webshop/vozila';
    const title = manufacturer && model
      ? `Motori i karoserije za ${manufacturer.name} ${model.name}`
      : 'Model vozila nije pronađen';
    const description = manufacturer && model
      ? `Lista motora i karoserija za ${manufacturer.name} ${model.name}. Filtriraj po snazi (kW/HP), karoseriji ili šifri motora i nastavi na stranicu sa delovima.`
      : 'Pokušajte ponovo ili se vratite na listu proizvođača.';

    this.seoService.updateSeoTags({
      title: `${title} | Automaterijal`,
      description,
      url,
      robots: manufacturer && model ? 'index, follow' : 'noindex, follow',
      canonical: url,
    });
  }

  handleNavVehicleSelected(vehicle: TDVehicleDetails): void {
    this.vehicleUrlService.navigateToVehicle(vehicle);
  }

  handleVehicleClick(vehicle: TDVehicleDetails): void {
    this.saveVehicleToGarage(vehicle);
  }

  handleVehicleSearch(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.vehicleSearchTerm = target?.value ?? '';
  }

  private buildBreadcrumbs(
    manufacturer: VehicleManufacturerSummary | null,
    model: VehicleModelSummary | null
  ): WebshopNavBreadcrumbs {
    if (manufacturer && model) {
      return {
        second: `Korak 2: ${manufacturer.name}`,
        secondLink: ['/webshop', 'vozila', manufacturer.slug],
        third: `Korak 3: ${model.name}`,
      };
    }

    if (manufacturer) {
      return {
        second: 'Korak 1: Tip vozila',
        secondLink: ['/webshop/vozila'],
        third: `Korak 2: ${manufacturer.name}`,
        thirdLink: ['/webshop', 'vozila', manufacturer.slug],
      };
    }

    return {
      second: 'Korak 1: Tip vozila',
      secondLink: ['/webshop/vozila'],
    };
  }

  private vehicleMatchesTerm(vehicle: TDVehicleDetails, term: string): boolean {
    const engineCodes = (vehicle.engines || []).map((engine) => engine?.code);
    const parts: Array<string | number | undefined | null> = [
      vehicle.description,
      vehicle.salesDescription,
      vehicle.bodyStyle,
      vehicle.fuelType,
      vehicle.engineType,
      vehicle.vehicleModelSeriesName,
      vehicle.mfrName,
      vehicle.mfrShortName,
      ...engineCodes,
      vehicle.kiloWattsFrom,
      vehicle.kiloWattsTo,
      vehicle.horsePowerFrom,
      vehicle.horsePowerTo,
      vehicle.capacityLiters,
      vehicle.beginYearMonth,
      vehicle.endYearMonth,
    ];

    const haystack = parts
      .filter((part) => part !== undefined && part !== null)
      .map((part) => String(part).toLowerCase())
      .join(' ');

    return haystack.includes(term);
  }

  private saveVehicleToGarage(vehicle: TDVehicleDetails): void {
    if (!vehicle?.linkageTargetId || !vehicle?.subLinkageTargetType) {
      return;
    }

    const kw =
      vehicle.kiloWattsTo ??
      vehicle.kiloWattsFrom ??
      vehicle.horsePowerTo ??
      vehicle.horsePowerFrom;
    const descriptionParts = [
      this.manufacturer?.name,
      this.model?.name,
      vehicle.description,
      vehicle.engineType,
      kw ? `${kw}kw` : null,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    this.searchHistoryService.saveVehicle({
      id: vehicle.linkageTargetId,
      type: vehicle.subLinkageTargetType,
      description: descriptionParts,
      vehicleType: this.manufacturer?.vehicleType,
    });
  }
}
