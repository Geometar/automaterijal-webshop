import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Subject, finalize, takeUntil } from 'rxjs';
import { InputFieldsComponent } from '../../../../../shared/components/input-fields/input-fields.component';
import { AutomIconComponent } from '../../../../../shared/components/autom-icon/autom-icon.component';
import { InputTypeEnum } from '../../../../../shared/data-models/enums';
import {
  TecDocLinkedManufacturer,
  TecDocLinkedManufacturerTargets,
  TecDocLinkedModel,
  TecDocLinkedVariant,
  Roba,
} from '../../../../../shared/data-models/model/roba';
import { TecdocService } from '../../../../../shared/service/tecdoc.service';
import { IconsEnum } from '../../../../../shared/data-models/enums/icons.enum';

@Component({
  selector: 'app-vehicle-compatibility',
  standalone: true,
  imports: [CommonModule, InputFieldsComponent, AutomIconComponent],
  templateUrl: './vehicle-compatibility.component.html',
  styleUrls: ['./vehicle-compatibility.component.scss'],
})
export class VehicleCompatibilityComponent implements OnChanges, OnDestroy {
  @Input() product: Roba | null = null;
  @Output() targetsChange = new EventEmitter<TecDocLinkedManufacturerTargets[]>();

  inputTypeEnum = InputTypeEnum;
  iconEnum = IconsEnum;

  compatibilitySearchTerm = '';
  flatManufacturers: TecDocLinkedManufacturer[] = [];
  displayedManufacturers: TecDocLinkedManufacturer[] = [];
  private manufacturerDetails = new Map<number, TecDocLinkedManufacturerTargets>();
  private filteredDetails = new Map<number, TecDocLinkedManufacturerTargets>();
  linkedTargetsLoading = false;
  private detailedTargetsLoaded = false;
  private requestedDetailedTargets = false;
  private readonly collator: Intl.Collator =
    typeof Intl !== 'undefined' ? new Intl.Collator('sr', { sensitivity: 'base' }) : new Intl.Collator();

  private expandedManufacturers = new Set<number>();
  private expandedModels = new Set<string>();

  private destroy$ = new Subject<void>();
  private destroyed = false;

  constructor(private tecDocService: TecdocService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product']) {
      this.initializeFromProduct();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCompatibilityInput(raw: any): void {
    const value =
      raw && typeof raw === 'object' && 'target' in raw
        ? ((raw.target as HTMLInputElement | null)?.value ?? '')
        : typeof raw === 'string'
          ? raw
          : raw != null
            ? String(raw)
            : '';
    this.compatibilitySearchTerm = value;
    this.handleSearchFilters();
  }

  trackManufacturer(_: number, manufacturer: TecDocLinkedManufacturer): number {
    return Number(manufacturer?.linkingTargetId ?? 0);
  }

  trackModel(_: number, model: TecDocLinkedModel): number | string {
    const id = Number(model?.modelId ?? Number.NaN);
    if (Number.isFinite(id)) {
      return id;
    }
    return this.normalizeWhitespace(model?.modelName ?? '');
  }

  getManufacturerDetailForDisplay(
    manufacturer: TecDocLinkedManufacturer
  ): TecDocLinkedManufacturerTargets | undefined {
    const id = Number(manufacturer?.linkingTargetId ?? Number.NaN);
    if (!Number.isFinite(id)) return undefined;
    return this.filteredDetails.get(id) ?? this.manufacturerDetails.get(id);
  }

  isManufacturerExpanded(manufacturer: TecDocLinkedManufacturer): boolean {
    const id = Number(manufacturer?.linkingTargetId ?? Number.NaN);
    return Number.isFinite(id) && this.expandedManufacturers.has(id);
  }

  toggleManufacturer(manufacturer: TecDocLinkedManufacturer): void {
    const id = Number(manufacturer?.linkingTargetId ?? Number.NaN);
    if (!Number.isFinite(id)) {
      return;
    }
    if (this.expandedManufacturers.has(id)) {
      this.expandedManufacturers.delete(id);
      this.collapseModelsForManufacturer(id);
    } else {
      this.expandedManufacturers.add(id);
      if (!this.detailedTargetsLoaded && !this.linkedTargetsLoading && !this.requestedDetailedTargets) {
        this.fetchLinkedTargets();
      }
    }
  }

  isModelExpanded(manufacturerId: number, model: TecDocLinkedModel): boolean {
    const key = this.buildModelKey(manufacturerId, model);
    return key ? this.expandedModels.has(key) : false;
  }

  toggleModel(manufacturerId: number, model: TecDocLinkedModel): void {
    const key = this.buildModelKey(manufacturerId, model);
    if (!key) return;
    if (this.expandedModels.has(key)) {
      this.expandedModels.delete(key);
    } else {
      this.expandedModels.add(key);
    }
  }

  get manufacturerSearchSummary(): string {
    return this.compatibilitySearchTerm.trim();
  }

  private initializeFromProduct(): void {
    this.resetState();

    if (!this.product) {
      this.emitTargetsChange(true);
      return;
    }

    const raw = Array.isArray(this.product.linkedManufacturers)
      ? this.product.linkedManufacturers
      : [];

    const unique = new Map<number, TecDocLinkedManufacturer>();
    raw
      .map((manufacturer) => {
        const id = Number((manufacturer as any)?.linkingTargetId ?? Number.NaN);
        const name = this.normalizeWhitespace((manufacturer as any)?.name ?? '');
        if (!Number.isFinite(id) || !name) {
          return null;
        }
        return { linkingTargetId: id, name };
      })
      .filter((item): item is TecDocLinkedManufacturer => !!item)
      .forEach((item) => unique.set(item.linkingTargetId, item));

    this.flatManufacturers = Array.from(unique.values()).sort((a, b) =>
      this.collator.compare(a.name, b.name)
    );
    this.displayedManufacturers = this.flatManufacturers;

    this.emitTargetsChange(true);
  }

  private resetState(): void {
    this.compatibilitySearchTerm = '';
    this.flatManufacturers = [];
    this.displayedManufacturers = [];
    this.manufacturerDetails.clear();
    this.filteredDetails.clear();
    this.expandedManufacturers.clear();
    this.expandedModels.clear();
    this.detailedTargetsLoaded = false;
    this.requestedDetailedTargets = false;
    this.linkedTargetsLoading = false;
  }

  private fetchLinkedTargets(): void {
    const id = Number(this.product?.robaid ?? Number.NaN);
    if (!Number.isFinite(id) || this.requestedDetailedTargets) {
      return;
    }

    this.requestedDetailedTargets = true;
    this.linkedTargetsLoading = true;

    this.tecDocService
      .getArticleLinkedTargets(id, 'VOLB')
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.linkedTargetsLoading = false;
          this.requestedDetailedTargets = false;
        })
      )
      .subscribe({
        next: (targets) => {
          if (Array.isArray(targets) && targets.length) {
            this.applyDetailedTargets(targets);
            this.detailedTargetsLoaded = true;
          } else {
            this.detailedTargetsLoaded = true;
          }
        },
        error: () => {
          this.detailedTargetsLoaded = false;
        },
      });
  }

  private applyDetailedTargets(targets: TecDocLinkedManufacturerTargets[]): void {
    targets.forEach((target) => {
      const normalized = this.normalizeDetailedTarget(target);
      if (!normalized || !Number.isFinite(normalized.manufacturerId ?? Number.NaN)) {
        return;
      }
      this.manufacturerDetails.set(normalized.manufacturerId as number, normalized);
    });

    this.emitTargetsChange();
    this.handleSearchFilters(false);
  }

  private filterManufacturers(term: string): TecDocLinkedManufacturer[] {
    const tokens = this.buildSearchTokens(term);
    this.filteredDetails.clear();

    if (!tokens.length) {
      return this.flatManufacturers;
    }

    const result: TecDocLinkedManufacturer[] = [];

    this.flatManufacturers.forEach((manufacturer) => {
      const id = Number(manufacturer.linkingTargetId ?? Number.NaN);
      const detail = Number.isFinite(id) ? this.manufacturerDetails.get(id) : undefined;

      if (detail) {
        const filteredDetail = this.filterDetail(detail, tokens, manufacturer.name, id);
        if (filteredDetail) {
          const resolvedId = Number.isFinite(filteredDetail.manufacturerId ?? Number.NaN)
            ? (filteredDetail.manufacturerId as number)
            : id;
          this.filteredDetails.set(resolvedId, {
            ...filteredDetail,
            manufacturerId: resolvedId,
          });
          result.push(manufacturer);
        }
      } else {
        const brandName = this.normalizeWhitespace(manufacturer.name).toLowerCase();
        if (!tokens.length || tokens.every((token) => brandName.includes(token))) {
          result.push(manufacturer);
        } else if (!this.detailedTargetsLoaded) {
          result.push(manufacturer);
        }
      }
    });

    return result;
  }

  private handleSearchFilters(requestDetails: boolean = true): void {
    const tokens = this.buildSearchTokens(this.compatibilitySearchTerm);

    if (
      requestDetails &&
      tokens.length &&
      !this.detailedTargetsLoaded &&
      !this.requestedDetailedTargets
    ) {
      this.fetchLinkedTargets();
    }

    const filtered = tokens.length
      ? this.filterManufacturers(this.compatibilitySearchTerm)
      : this.flatManufacturers;
    const hasFilter = tokens.length > 0;

    if (hasFilter) {
      const ids = new Set<number>();
      const expandedModelKeys = new Set<string>();

      filtered.forEach((item) => {
        const id = Number(item.linkingTargetId ?? Number.NaN);
        if (!Number.isFinite(id)) return;
        ids.add(id);

        const detail =
          this.filteredDetails.get(id) ??
          (this.manufacturerDetails.has(id)
            ? this.filterDetail(this.manufacturerDetails.get(id)!, tokens, item.name, id)
            : null);

        if (!detail?.models) return;
        detail.models.forEach((model) => {
          const key = this.buildModelKey(id, model);
          if (key) {
            expandedModelKeys.add(key);
          }
        });
      });

      this.expandedManufacturers = ids;
      this.expandedModels = expandedModelKeys;
    } else {
      this.filteredDetails.clear();
      this.expandedManufacturers.clear();
      this.expandedModels.clear();
    }

    this.displayedManufacturers = filtered;
  }

  private buildSearchTokens(term: string): string[] {
    return term
      .toLowerCase()
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  private filterDetail(
    detail: TecDocLinkedManufacturerTargets | null,
    tokens: string[],
    manufacturerName: string,
    manufacturerId?: number
  ): TecDocLinkedManufacturerTargets | null {
    if (!detail) {
      return null;
    }
    if (!tokens.length) {
      return detail;
    }

    const filteredModels: TecDocLinkedModel[] = [];
    const models = Array.isArray(detail.models) ? detail.models : [];

    models.forEach((model) => {
      const variants = Array.isArray(model.variants) ? model.variants : [];
      const filteredVariants = variants.filter((variant) =>
        this.variantMatchesTokens(manufacturerName, model, variant, tokens)
      );

      if (filteredVariants.length) {
        filteredModels.push({
          ...model,
          variants: filteredVariants,
        });
      }
    });

    if (!filteredModels.length) {
      return null;
    }

    const resolvedIdCandidate = Number(detail.manufacturerId ?? manufacturerId ?? Number.NaN);
    const resolvedId = Number.isFinite(resolvedIdCandidate) ? resolvedIdCandidate : manufacturerId;

    return {
      ...detail,
      manufacturerId: resolvedId,
      manufacturerName: detail.manufacturerName ?? manufacturerName,
      models: filteredModels,
    };
  }

  private variantMatchesTokens(
    manufacturerName: string,
    model: TecDocLinkedModel,
    variant: TecDocLinkedVariant,
    tokens: string[]
  ): boolean {
    const combined = [
      this.normalizeWhitespace(manufacturerName).toLowerCase(),
      this.normalizeWhitespace(model.modelName).toLowerCase(),
      this.normalizeWhitespace(variant.engine).toLowerCase(),
      this.normalizeWhitespace(variant.constructionType).toLowerCase(),
      String(variant.cylinderCapacity ?? '').toLowerCase(),
      this.formatCylinderCapacity(variant.cylinderCapacity).toLowerCase(),
      this.formatNumericRange(variant.powerKwFrom, variant.powerKwTo, 'kW').toLowerCase(),
      this.formatNumericRange(variant.powerHpFrom, variant.powerHpTo, 'KS').toLowerCase(),
      this.formatProductionPeriod(variant).toLowerCase(),
    ].join(' ');

    return tokens.every((token) => combined.includes(token));
  }

  private buildSeoTargets(): TecDocLinkedManufacturerTargets[] {
    const detailed = Array.from(this.manufacturerDetails.values());
    if (detailed.length) {
      return detailed;
    }

    return this.flatManufacturers.map((item) => ({
      manufacturerId: Number.isFinite(Number(item.linkingTargetId ?? Number.NaN))
        ? Number(item.linkingTargetId)
        : undefined,
      manufacturerName: item.name,
      models: [],
    }));
  }

  private emitTargetsChange(defer: boolean = false): void {
    const emit = () => {
      if (this.destroyed) {
        return;
      }
      const seoTargets = this.buildSeoTargets();
      this.targetsChange.emit(seoTargets);
    };

    if (defer) {
      queueMicrotask(emit);
      return;
    }

    emit();
  }

  private normalizeDetailedTarget(
    target: TecDocLinkedManufacturerTargets | undefined | null
  ): TecDocLinkedManufacturerTargets | null {
    if (!target) {
      return null;
    }
    const manufacturerId = Number(
      (target as any)?.manufacturerId ?? (target as any)?.linkingTargetId ?? Number.NaN
    );
    const manufacturerName = this.normalizeWhitespace(
      (target as any)?.manufacturerName ?? (target as any)?.name ?? ''
    );
    if (!Number.isFinite(manufacturerId) || !manufacturerName) {
      return null;
    }

    const models = Array.isArray(target.models) ? target.models : [];
    const normalizedModels: TecDocLinkedModel[] = models
      .map((model) => {
        const modelName = this.normalizeWhitespace((model as any)?.modelName ?? '');
        if (!modelName) {
          return null;
        }
        const modelId = Number((model as any)?.modelId ?? Number.NaN);
        const variants = Array.isArray(model.variants) ? model.variants : [];
        const normalizedVariants = variants
          .map((variant) => this.normalizeVariant(variant))
          .filter((variant): variant is TecDocLinkedVariant => !!variant)
          .sort((a, b) => this.compareVariants(a, b));

        return {
          modelId: Number.isFinite(modelId) ? modelId : undefined,
          modelName,
          variants: normalizedVariants,
        } as TecDocLinkedModel;
      })
      .filter((model): model is TecDocLinkedModel => !!model)
      .sort((a, b) => this.compareModelNames(a.modelName, b.modelName));

    return {
      manufacturerId,
      manufacturerName,
      models: normalizedModels,
    };
  }

  private compareModelNames(nameA?: string, nameB?: string): number {
    const a = this.normalizeWhitespace(nameA);
    const b = this.normalizeWhitespace(nameB);
    if (this.collator) {
      return this.collator.compare(a, b);
    }
    return a.localeCompare(b);
  }

  private compareVariants(a: TecDocLinkedVariant, b: TecDocLinkedVariant): number {
    const fromA = Number(a.productionYearFrom ?? Number.NaN);
    const fromB = Number(b.productionYearFrom ?? Number.NaN);
    const hasFromA = Number.isFinite(fromA);
    const hasFromB = Number.isFinite(fromB);
    if (hasFromA && hasFromB && fromA !== fromB) {
      return fromA - fromB;
    }
    if (hasFromA && !hasFromB) {
      return -1;
    }
    if (!hasFromA && hasFromB) {
      return 1;
    }

    const engineA = this.normalizeWhitespace(a.engine).toLowerCase();
    const engineB = this.normalizeWhitespace(b.engine).toLowerCase();
    if (engineA && engineB) {
      return this.collator ? this.collator.compare(engineA, engineB) : engineA.localeCompare(engineB);
    }
    if (engineA) return -1;
    if (engineB) return 1;

    const bodyA = this.normalizeWhitespace(a.constructionType).toLowerCase();
    const bodyB = this.normalizeWhitespace(b.constructionType).toLowerCase();
    if (bodyA && bodyB) {
      return this.collator ? this.collator.compare(bodyA, bodyB) : bodyA.localeCompare(bodyB);
    }
    if (bodyA) return -1;
    if (bodyB) return 1;

    return 0;
  }

  private normalizeVariant(variant: TecDocLinkedVariant | undefined | null): TecDocLinkedVariant | null {
    if (!variant) {
      return null;
    }

    const engine = this.normalizeWhitespace((variant as any)?.engine ?? '');
    const constructionType = this.normalizeWhitespace((variant as any)?.constructionType ?? '');
    const hasEngine = !!engine;
    const hasYears =
      Number.isFinite(variant?.productionYearFrom) || Number.isFinite(variant?.productionYearTo);
    const hasCapacity = Number.isFinite(variant?.cylinderCapacity);
    const hasPower =
      Number.isFinite(variant?.powerKwFrom) ||
      Number.isFinite(variant?.powerKwTo) ||
      Number.isFinite(variant?.powerHpFrom) ||
      Number.isFinite(variant?.powerHpTo);
    const hasBody = !!constructionType;

    if (!(hasEngine || hasYears || hasCapacity || hasPower || hasBody)) {
      return null;
    }

    return {
      ...variant,
      engine: engine || undefined,
      constructionType: constructionType || undefined,
    };
  }

  formatVariantPower(variant: TecDocLinkedVariant): string {
    const kw = this.formatNumericRange(variant.powerKwFrom, variant.powerKwTo, 'kW');
    const hp = this.formatNumericRange(variant.powerHpFrom, variant.powerHpTo, 'KS');
    if (kw && hp) {
      return `${kw} / ${hp}`;
    }
    return kw || hp || '—';
  }

  formatCylinderCapacity(value?: number | null): string {
    if (!Number.isFinite(value ?? NaN)) return '—';
    const formatter =
      typeof Intl !== 'undefined'
        ? new Intl.NumberFormat('sr-RS')
        : { format: (v: number) => String(v) };
    return `${formatter.format(Number(value))} cm³`;
  }

  formatProductionPeriod(variant: TecDocLinkedVariant): string {
    const from = this.formatYearMonth(variant.productionYearFrom);
    const to = this.formatYearMonth(variant.productionYearTo);
    if (from && to) {
      if (from === to) return from;
      return `${from} – ${to}`;
    }
    if (from) return `od ${from}`;
    if (to) return `do ${to}`;
    return '—';
  }

  private formatYearMonth(value?: number | null): string {
    if (!Number.isFinite(value ?? NaN)) return '';
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (raw.length === 4) {
      return raw;
    }
    const padded = raw.padStart(6, '0');
    const year = padded.slice(0, 4);
    const month = padded.slice(4, 6);
    if (month === '00') {
      return year;
    }
    return `${month}/${year}`;
  }

  private formatNumericRange(
    from?: number | null,
    to?: number | null,
    unit?: string
  ): string {
    const start = Number(from ?? NaN);
    const end = Number(to ?? NaN);
    const hasStart = Number.isFinite(start);
    const hasEnd = Number.isFinite(end);
    if (!hasStart && !hasEnd) return '';
    const unitSuffix = unit ? ` ${unit}` : '';
    if (hasStart && hasEnd) {
      if (start === end) {
        return `${start}${unitSuffix}`;
      }
      return `${Math.min(start, end)} – ${Math.max(start, end)}${unitSuffix}`;
    }
    if (hasStart) return `od ${start}${unitSuffix}`;
    if (hasEnd) return `do ${end}${unitSuffix}`;
    return '';
  }

  private buildModelKey(manufacturerId: number, model: TecDocLinkedModel): string {
    if (!Number.isFinite(manufacturerId)) return '';
    const modelId = Number(model?.modelId ?? Number.NaN);
    if (Number.isFinite(modelId)) {
      return `${manufacturerId}:model-${modelId}`;
    }
    const modelName = this.normalizeWhitespace(model?.modelName);
    return modelName ? `${manufacturerId}:model-${modelName.toLowerCase()}` : '';
  }

  private collapseModelsForManufacturer(manufacturerId: number): void {
    const prefix = `${manufacturerId}:model-`;
    Array.from(this.expandedModels)
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => this.expandedModels.delete(key));
  }

  private normalizeWhitespace(value: string | undefined | null): string {
    return (value ?? '').replace(/\s+/g, ' ').trim();
  }
}
