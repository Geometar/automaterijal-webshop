import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

// Data models
import { TDVehicleDetails } from '../../data-models/model/tecdoc';

// Utils
import { StringUtils } from '../../utils/string-utils';

type AssemblyGroupSummary = {
  assemblyGroupName?: string | null;
  assemblyGroupNodeId?: number | string | null;
};

@Injectable({
  providedIn: 'root',
})
export class VehicleUrlService {
  constructor(private router: Router) { }

  navigateToVehicle(vehicle: TDVehicleDetails): void {
    const commands = this.buildVehicleNavigationCommands(vehicle);
    this.router.navigate(commands);
  }

  navigateToVehicleGroup(
    vehicle: TDVehicleDetails,
    assemblyGroup?: AssemblyGroupSummary | null
  ): void {
    const commands = this.buildVehicleGroupCommands(vehicle, assemblyGroup);
    this.router.navigate(commands);
  }

  buildVehicleNavigationCommands(vehicle: TDVehicleDetails): string[] {
    if (!vehicle.linkageTargetId || !vehicle.linkageTargetType) {
      return ['/webshop'];
    }

    const manufacturerSlug = this.buildSlugOrFallback(
      vehicle.mfrName || vehicle.mfrShortName,
      'vozilo'
    );
    const modelSource =
      vehicle.vehicleModelSeriesName ||
      vehicle.salesDescription ||
      vehicle.hmdMfrModelName ||
      vehicle.description ||
      (vehicle.mfrName ? `${vehicle.mfrName} model` : '');
    const modelSlug = this.buildSlugOrFallback(modelSource, 'model');
    const detailSlug = this.buildSlugOrFallback(
      this.composeVehicleDetailSlug(vehicle),
      'detalji'
    );
    const identifierPart = `${(vehicle.linkageTargetType || 'V').toLowerCase()}-${vehicle.linkageTargetId}`;
    const vehicleSlug = [identifierPart, detailSlug].filter(Boolean).join('-');

    return [
      '/webshop',
      'vozila',
      manufacturerSlug,
      modelSlug,
      vehicleSlug,
    ];
  }

  buildVehicleGroupCommands(
    vehicle: TDVehicleDetails,
    assemblyGroup?: AssemblyGroupSummary | null
  ): string[] {
    const baseCommands = this.buildVehicleNavigationCommands(vehicle);
    if (
      !assemblyGroup ||
      assemblyGroup.assemblyGroupNodeId === null ||
      assemblyGroup.assemblyGroupNodeId === undefined
    ) {
      return baseCommands;
    }

    const groupSlug = this.buildAssemblyGroupSlug(
      assemblyGroup.assemblyGroupName,
      assemblyGroup.assemblyGroupNodeId
    );

    return [...baseCommands, groupSlug];
  }

  buildVehiclePath(vehicle: TDVehicleDetails): string {
    return this.commandsToPath(this.buildVehicleNavigationCommands(vehicle));
  }

  buildVehicleGroupPath(
    vehicle: TDVehicleDetails,
    assemblyGroup?: AssemblyGroupSummary | null
  ): string {
    const commands = this.buildVehicleGroupCommands(vehicle, assemblyGroup);
    return this.commandsToPath(commands);
  }

  private commandsToPath(commands: Array<string>): string {
    const segments = commands
      .map((segment) =>
        typeof segment === 'string' ? segment.replace(/^\//, '').trim() : ''
      )
      .filter((segment) => !!segment);

    if (!segments.length) {
      return '/webshop';
    }

    return `/${segments.join('/')}`;
  }

  private buildSlugOrFallback(
    value?: string | null,
    fallback: string = 'detalji'
  ): string {
    if (!value || !value.trim()) {
      return fallback;
    }
    const slug = StringUtils.slugify(value);
    return slug || fallback;
  }

  private composeVehicleDetailSlug(vehicle: TDVehicleDetails): string {
    const parts: string[] = [
      vehicle.description,
      this.buildPowerLabel(vehicle),
      this.buildYearRange(vehicle.beginYearMonth, vehicle.endYearMonth),
    ].filter((value): value is string => !!value && value.trim().length > 0);

    const engineCodes = (vehicle.engines || [])
      .map((engine) => engine.code)
      .filter((code): code is string => !!code)
      .join(' ');

    if (engineCodes) {
      parts.push(engineCodes);
    }

    const normalizedDescription = (vehicle.description || '').toLowerCase();
    const engineType = (vehicle.engineType || '').trim();
    const fuelType = (vehicle.fuelType || '').trim();

    if (
      engineType &&
      !normalizedDescription.includes(engineType.toLowerCase())
    ) {
      parts.push(engineType);
    }

    if (fuelType && fuelType.toLowerCase() !== engineType.toLowerCase()) {
      parts.push(fuelType);
    }

    return parts.join(' ');
  }

  private buildPowerLabel(vehicle: TDVehicleDetails): string | null {
    const kw = vehicle.kiloWattsTo ?? vehicle.kiloWattsFrom;
    const hp = vehicle.horsePowerTo ?? vehicle.horsePowerFrom;
    const parts: string[] = [];

    if (kw) {
      parts.push(`${kw} kw`);
    }

    if (hp) {
      parts.push(`${hp} hp`);
    }

    return parts.length ? parts.join(' ') : null;
  }

  private buildYearRange(
    from?: string | null,
    to?: string | null
  ): string | null {
    const start = this.sanitizeYearMonth(from);
    const end = this.sanitizeYearMonth(to);

    if (!start && !end) {
      return null;
    }

    if (start && end) {
      return `${start}-${end}`;
    }

    return start || end;
  }

  private sanitizeYearMonth(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const cleaned = value.trim().replace(/[^0-9-]/g, '');
    return cleaned || null;
  }

  private buildAssemblyGroupSlug(
    name?: string | null,
    id?: number | string | null
  ): string {
    const label = this.buildSlugOrFallback(name, 'grupa');
    const idPart =
      id !== null && id !== undefined && `${id}`.trim().length
        ? `${id}`.trim()
        : '';
    return idPart ? `${label}-${idPart}` : label;
  }
}
