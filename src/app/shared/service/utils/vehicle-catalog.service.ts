import { Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, shareReplay, tap } from 'rxjs';

import { VehicleCategoryType } from '../../data-models/enums/vehicle-category-type.enum';
import {
  TDManufacture,
  TDModels,
  TDVehicleDetails,
} from '../../data-models/model/tecdoc';
import { StringUtils } from '../../utils/string-utils';
import { TecdocService } from '../tecdoc.service';

export interface VehicleTypeDefinition {
  code: VehicleCategoryType;
  label: string;
  description: string;
  icon: string;
}

export interface VehicleManufacturerSummary {
  id: number;
  name: string;
  slug: string;
  vehicleType: VehicleCategoryType;
}

export interface VehicleModelSummary {
  modelId: number;
  name: string;
  slug: string;
  constructedFrom?: number;
  constructedTo?: number;
}

@Injectable({
  providedIn: 'root',
})
export class VehicleCatalogService {
  private readonly vehicleTypeDefinitions: VehicleTypeDefinition[] = [
    {
      code: VehicleCategoryType.PASSENGER,
      label: 'Putnička vozila',
      description:
        'Limuzine, hečbek i SUV vozila za svakodnevnu vožnju i putovanja.',
      icon: '/images/icons/car-tab.svg',
    },
    {
      code: VehicleCategoryType.LIGHT_COMMERCIAL,
      label: 'Kombi i dostavna vozila',
      description:
        'Za mala preduzeća i kurirske službe kojima je potreban pouzdan kombi.',
      icon: '/images/icons/light-comercial-tab.svg',
    },
    {
      code: VehicleCategoryType.TRUCK,
      label: 'Kamioni i teška vozila',
      description: 'Transportna i teška vozila za profesionalnu upotrebu.',
      icon: '/images/icons/truck-tab.svg',
    },
    {
      code: VehicleCategoryType.MOTORCYCLE,
      label: 'Motocikli',
      description: 'Dva točka, bilo da je reč o gradskim ili touring modelima.',
      icon: '/images/icons/motorcycle-tab.svg',
    },
    {
      code: VehicleCategoryType.TRACTOR,
      label: 'Poljoprivredne mašine',
      description:
        'Traktori i mehanizacija za građevinu i poljoprivredu.',
      icon: '/images/icons/tractor-tab.svg',
    },
  ];

  private manufacturerCache = new Map<string, VehicleManufacturerSummary>();
  private manufacturerListCache = new Map<
    VehicleCategoryType,
    Observable<VehicleManufacturerSummary[]>
  >();
  private modelListCache = new Map<
    string,
    Observable<VehicleModelSummary[]>
  >();
  private vehicleDetailsCache = new Map<
    string,
    Observable<TDVehicleDetails[]>
  >();

  constructor(private tecdocService: TecdocService) {}

  getVehicleTypes(): VehicleTypeDefinition[] {
    return this.vehicleTypeDefinitions;
  }

  getManufacturersByType(
    type: VehicleCategoryType
  ): Observable<VehicleManufacturerSummary[]> {
    if (!this.manufacturerListCache.has(type)) {
      const stream = this.tecdocService.getManufactures(type).pipe(
        map((manufacturers) =>
          (manufacturers || [])
            .filter((m): m is TDManufacture => !!m?.id && !!m?.name)
            .map((manufacturer) =>
              this.toManufacturerSummary(manufacturer, type)
            )
        ),
        tap((list) =>
          list.forEach((manufacturer) =>
            this.manufacturerCache.set(manufacturer.slug, manufacturer)
          )
        ),
        shareReplay({ bufferSize: 1, refCount: true })
      );
      this.manufacturerListCache.set(type, stream);
    }

    return this.manufacturerListCache.get(type)!;
  }

  resolveManufacturerBySlug(
    slug: string
  ): Observable<VehicleManufacturerSummary | null> {
    const cached = this.manufacturerCache.get(slug);
    if (cached) {
      return of(cached);
    }

    return forkJoin(
      this.vehicleTypeDefinitions.map((definition) =>
        this.getManufacturersByType(definition.code)
      )
    ).pipe(
      map((lists) => lists.flat()),
      map((manufacturers) => manufacturers.find((m) => m.slug === slug) || null)
    );
  }

  getModelsForManufacturer(
    manufacturer: VehicleManufacturerSummary
  ): Observable<VehicleModelSummary[]> {
    const cacheKey = `${manufacturer.id}-${manufacturer.vehicleType}`;
    if (!this.modelListCache.has(cacheKey)) {
      const stream = this.tecdocService
        .getModels(manufacturer.id, manufacturer.vehicleType)
        .pipe(
          map((models) =>
            (models || [])
              .filter((model): model is TDModels => !!model?.modelId && !!model?.name)
              .map((model) => this.toModelSummary(model))
          ),
          shareReplay({ bufferSize: 1, refCount: true })
        );
      this.modelListCache.set(cacheKey, stream);
    }

    return this.modelListCache.get(cacheKey)!;
  }

  resolveModelBySlug(
    manufacturer: VehicleManufacturerSummary,
    modelSlug: string
  ): Observable<VehicleModelSummary | null> {
    return this.getModelsForManufacturer(manufacturer).pipe(
      map((models) => models.find((model) => model.slug === modelSlug) || null)
    );
  }

  getVehiclesForModel(
    manufacturer: VehicleManufacturerSummary,
    model: VehicleModelSummary
  ): Observable<TDVehicleDetails[]> {
    const cacheKey = `${manufacturer.id}-${manufacturer.vehicleType}-${model.modelId}`;
    if (!this.vehicleDetailsCache.has(cacheKey)) {
      const stream = this.tecdocService
        .getTypeOfModel(
          manufacturer.id,
          model.modelId,
          manufacturer.vehicleType
        )
        .pipe(shareReplay({ bufferSize: 1, refCount: true }));
      this.vehicleDetailsCache.set(cacheKey, stream);
    }
    return this.vehicleDetailsCache.get(cacheKey)!;
  }

  private toManufacturerSummary(
    manufacturer: TDManufacture,
    type: VehicleCategoryType
  ): VehicleManufacturerSummary {
    const name = manufacturer.name || 'Proizvođač';
    return {
      id: manufacturer.id!,
      name,
      slug: this.buildSlug(name, `manufacturer-${manufacturer.id}`),
      vehicleType: type,
    };
  }

  private toModelSummary(model: TDModels): VehicleModelSummary {
    const name = model.name || 'Model';
    return {
      modelId: model.modelId!,
      name,
      slug: this.buildSlug(name, `model-${model.modelId}`),
      constructedFrom: model.constructedFrom || undefined,
      constructedTo: model.constructedTo || undefined,
    };
  }

  private buildSlug(value: string, fallback: string): string {
    const slug = StringUtils.slugify(value);
    return slug || fallback;
  }
}
