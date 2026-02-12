import { AvailabilityStatus, ProviderAvailabilityDto } from '../data-models/model/availability';
import { Roba } from '../data-models/model/roba';

export type AvailabilityTone = 'green' | 'blue' | 'red' | 'yellow';

export const EXTERNAL_WAREHOUSE_LABEL = 'Eksterni magacin';
export const EXTERNAL_AVAILABILITY_LABEL_STAFF = 'Dostupno (eksterni magacin)';
export const EXTERNAL_AVAILABILITY_LABEL_CUSTOMER = 'Na stanju (eksterni magacin)';
export const FEBI_PROVIDER_KEY = 'febi-stock';

export function getExternalAvailabilityLabel(isStaff: boolean): string {
  return isStaff
    ? EXTERNAL_AVAILABILITY_LABEL_STAFF
    : EXTERNAL_AVAILABILITY_LABEL_CUSTOMER;
}

export function isProviderSource(
  source?: 'STOCK' | 'PROVIDER',
  provider?: ProviderAvailabilityDto | null
): boolean {
  return source === 'PROVIDER' || !!provider?.available;
}

export function isFebiProvider(provider: ProviderAvailabilityDto | null | undefined): boolean {
  const key = (provider?.provider || '').toString().trim().toLowerCase();
  return key === FEBI_PROVIDER_KEY;
}

export function getProviderAvailableQuantity(
  provider: ProviderAvailabilityDto | null | undefined
): number {
  const warehouse = Number(provider?.warehouseQuantity);
  const total = Number(provider?.totalQuantity);
  const resolved =
    Number.isFinite(warehouse) && warehouse > 0
      ? warehouse
      : Number.isFinite(total) && total > 0
      ? total
      : 0;
  return Math.max(0, resolved);
}

export interface AvailabilityVm {
  status: AvailabilityStatus;
  label: string;
  tone: AvailabilityTone;
  purchasableStock: number;
  displayPrice: number;
  hasValidPrice: boolean;
  priceVerified: boolean;
  showProviderBox: boolean;
  showDiscount: boolean;
  provider: {
    deliveryLabel: string | null;
    cutoffLabel: string | null;
    quantity: number | null;
    noReturnable?: boolean;
    coreCharge?: number | null;
    admin: {
      isAdmin: boolean;
      sourceLabel: string | null;
      customerPriceLabel: string | null;
      purchasePriceLabel: string | null;
      packagingUnitLabel: string | null;
    };
    warehouseSplit: {
      enabled: boolean;
      sabacQuantity: number;
      beogradQuantity: number;
      beogradLabel: string;
      totalQuantity: number;
    };
  };
}

export function getAvailabilityStatus(
  roba: Pick<Roba, 'availabilityStatus' | 'stanje' | 'providerAvailability'> | null | undefined
): AvailabilityStatus {
  const status = roba?.availabilityStatus;
  if (status === 'IN_STOCK' || status === 'AVAILABLE' || status === 'OUT_OF_STOCK') {
    return status;
  }

  const stanje = Number(roba?.stanje) || 0;
  if (stanje > 0) return 'IN_STOCK';

  const providerAvailable = !!roba?.providerAvailability?.available;
  return providerAvailable ? 'AVAILABLE' : 'OUT_OF_STOCK';
}

export function shouldShowProviderAvailability(
  roba: Pick<Roba, 'availabilityStatus' | 'stanje' | 'providerAvailability'> | null | undefined
): boolean {
  return getAvailabilityStatus(roba) === 'AVAILABLE' && !!roba?.providerAvailability?.available;
}

export function getPurchasableStock(
  roba: Pick<Roba, 'availabilityStatus' | 'stanje' | 'providerAvailability'> | null | undefined,
  opts?: { isAdmin?: boolean }
): number {
  const localQty = Math.max(0, Number(roba?.stanje) || 0);
  const febiProviderQty = getProviderAvailableQuantity(roba?.providerAvailability);
  if (
    isFebiProvider(roba?.providerAvailability) &&
    !!roba?.providerAvailability?.available &&
    febiProviderQty > 0
  ) {
    const packagingUnit = resolvePackagingUnit(roba?.providerAvailability);
    const providerMax =
      packagingUnit > 1
        ? Math.floor(febiProviderQty / packagingUnit) * packagingUnit
        : febiProviderQty;
    const minOrder = resolveMinOrderQuantity(roba?.providerAvailability);
    if (providerMax < minOrder) {
      return localQty;
    }
    const constrainedExternal = packagingUnit > 1 || minOrder > 1;
    if (constrainedExternal) {
      // For MOQ/packaging-constrained providers, quantities above local stock
      // should follow provider buckets directly (e.g. 1 -> 20 -> 40), not local+bucket.
      return Math.max(localQty, providerMax);
    }
    // FEBI combined mode: local and external stock can be combined.
    // External part still follows MOQ/packaging constraints.
    return Math.max(0, localQty + Math.max(0, providerMax));
  }

  const status = getAvailabilityStatus(roba);
  if (status === 'IN_STOCK') {
    return localQty;
  }

  if (status === 'AVAILABLE') {
    const providerQty = getProviderAvailableQuantity(roba?.providerAvailability);
    const packagingUnit = resolvePackagingUnit(roba?.providerAvailability);
    const maxPieces =
      packagingUnit > 1 ? Math.floor(providerQty / packagingUnit) * packagingUnit : providerQty;
    const minOrder = resolveMinOrderQuantity(roba?.providerAvailability);
    if (maxPieces < minOrder) {
      return 0;
    }
    return Math.max(0, maxPieces);
  }

  return 0;
}

export function resolvePackagingUnit(
  provider: ProviderAvailabilityDto | null | undefined
): number {
  const unit = Number(provider?.packagingUnit);
  return Number.isFinite(unit) && unit > 1 ? Math.floor(unit) : 1;
}

export function resolveMinOrderQuantity(
  provider: ProviderAvailabilityDto | null | undefined
): number {
  const step = resolvePackagingUnit(provider);
  const raw = Number(provider?.minOrderQuantity);
  if (!Number.isFinite(raw) || raw <= 0) {
    return step;
  }
  if (step <= 1) {
    return Math.max(1, Math.floor(raw));
  }
  const min = Math.ceil(raw / step) * step;
  return Math.max(step, min);
}

export interface CombinedWarehouseSplit {
  localQuantity: number;
  externalQuantity: number;
  hasMixed: boolean;
}

export function splitCombinedWarehouseQuantity(
  requestedQty: number,
  localQty: number,
  provider?: ProviderAvailabilityDto | null | undefined
): CombinedWarehouseSplit {
  const requested = Math.max(0, Number(requestedQty) || 0);
  const local = Math.max(0, Number(localQty) || 0);
  const step = Math.max(1, resolvePackagingUnit(provider));
  const min = Math.max(1, resolveMinOrderQuantity(provider));
  const constrainedExternal = step > 1 || min > 1;
  if (requested > local && constrainedExternal) {
    const providerOnlyEligible =
      requested >= min && (step <= 1 || requested % step === 0);
    if (providerOnlyEligible) {
      return {
        localQuantity: 0,
        externalQuantity: requested,
        hasMixed: false,
      };
    }
  }
  const localQuantity = Math.min(requested, local);
  const externalQuantity = Math.max(0, requested - localQuantity);
  return {
    localQuantity,
    externalQuantity,
    hasMixed: localQuantity > 0 && externalQuantity > 0,
  };
}

export function isAdminExternalProviderOrderFlow(input: {
  isAdmin: boolean;
  provider: ProviderAvailabilityDto | null | undefined;
}): boolean {
  return !!input?.isAdmin && !!input?.provider?.available;
}

export function resolveFlowLocalWarehouseQuantity(input: {
  isAdmin: boolean;
  provider: ProviderAvailabilityDto | null | undefined;
  localQty: number;
}): number {
  if (isAdminExternalProviderOrderFlow(input)) {
    return 0;
  }
  return Math.max(0, Number(input?.localQty) || 0);
}

export function resolveFlowStockQuantity(input: {
  isAdmin: boolean;
  provider: ProviderAvailabilityDto | null | undefined;
  defaultStock: number;
}): number {
  if (isAdminExternalProviderOrderFlow(input)) {
    return getProviderAvailableQuantity(input?.provider);
  }
  return Math.max(0, Number(input?.defaultStock) || 0);
}

export function resolveFlowAvailabilityLabel(input: {
  isAdmin: boolean;
  isStaff: boolean;
  isOutOfStock: boolean;
  provider: ProviderAvailabilityDto | null | undefined;
  fallbackLabel: string;
}): string {
  if (isAdminExternalProviderOrderFlow(input) && !input?.isOutOfStock) {
    return getExternalAvailabilityLabel(!!input?.isStaff);
  }
  return input?.fallbackLabel || 'Nema na stanju';
}

export function splitWarehouseQuantityForFlow(input: {
  requestedQty: number;
  localQty: number;
  isAdmin: boolean;
  provider: ProviderAvailabilityDto | null | undefined;
}): CombinedWarehouseSplit {
  const localForFlow = resolveFlowLocalWarehouseQuantity({
    isAdmin: !!input?.isAdmin,
    provider: input?.provider,
    localQty: Number(input?.localQty) || 0,
  });
  return splitCombinedWarehouseQuantity(
    Number(input?.requestedQty) || 0,
    localForFlow,
    input?.provider
  );
}

export function requiresExternalWarehouseForFlow(input: {
  requestedQty: number;
  localQty: number;
  isAdmin: boolean;
  provider: ProviderAvailabilityDto | null | undefined;
}): boolean {
  if (!input?.provider?.available) {
    return false;
  }
  if (isAdminExternalProviderOrderFlow(input)) {
    return true;
  }
  const requested = Math.max(0, Number(input?.requestedQty) || 0);
  if (requested <= 0) {
    return false;
  }
  return (
    splitWarehouseQuantityForFlow({
      requestedQty: requested,
      localQty: input?.localQty,
      isAdmin: !!input?.isAdmin,
      provider: input?.provider,
    }).externalQuantity > 0
  );
}

export function resolveCombinedAvailabilityTone(input: {
  combinedEnabled: boolean;
  requestedQty: number;
  localQty: number;
  isOutOfStock: boolean;
  defaultTone: AvailabilityTone;
}): AvailabilityTone {
  if (!input?.combinedEnabled) {
    return input?.defaultTone ?? 'red';
  }
  if (input?.isOutOfStock) {
    return 'red';
  }
  const requested = Math.max(1, Number(input?.requestedQty) || 1);
  const local = Math.max(0, Number(input?.localQty) || 0);
  return requested > local ? 'blue' : 'green';
}

export function resolveCombinedAvailabilityLabel(input: {
  combinedEnabled: boolean;
  tone: AvailabilityTone;
  defaultLabel: string;
}): string {
  if (!input?.combinedEnabled) {
    return input?.defaultLabel || 'Nema na stanju';
  }
  return input?.tone === 'blue' ? 'Na stanju (više magacina)' : 'Na stanju';
}

export function shouldForceCombinedProviderAvailabilityBox(input: {
  combinedEnabled: boolean;
  hasProviderDeliveryLabel: boolean;
  tone: AvailabilityTone;
}): boolean {
  return (
    !!input?.combinedEnabled &&
    !!input?.hasProviderDeliveryLabel &&
    input?.tone === 'blue'
  );
}

export function clampCombinedWarehouseQuantity(input: {
  requestedQty: number;
  maxStock: number;
  localQty: number;
  provider: ProviderAvailabilityDto | null | undefined;
  minQuantity?: number;
}): number {
  const fallbackMin = Math.max(1, Math.floor(Number(input?.minQuantity) || 1));
  const requestedQty = Number(input?.requestedQty);
  if (!Number.isFinite(requestedQty)) {
    return fallbackMin;
  }

  const maxStock = Math.max(0, Number(input?.maxStock) || 0);
  if (maxStock <= 0) {
    return 0;
  }

  const localQty = Math.max(0, Number(input?.localQty) || 0);
  const bounded = Math.max(1, Math.min(Math.floor(requestedQty), maxStock));
  if (bounded <= localQty) {
    return bounded;
  }

  const providerStep = Math.max(1, resolvePackagingUnit(input?.provider));
  const providerMin = Math.max(1, resolveMinOrderQuantity(input?.provider));
  const constrainedExternal = providerStep > 1 || providerMin > 1;
  if (constrainedExternal) {
    const providerAvailable = Math.max(0, getProviderAvailableQuantity(input?.provider));
    const providerMax =
      providerStep > 1
        ? Math.floor(providerAvailable / providerStep) * providerStep
        : providerAvailable;
    if (providerMax < providerMin) {
      return localQty > 0 ? Math.floor(Math.min(localQty, maxStock)) : Math.floor(maxStock);
    }

    let providerOnly = Math.max(providerMin, bounded);
    if (providerStep > 1) {
      providerOnly = Math.ceil(providerOnly / providerStep) * providerStep;
    }

    if (providerOnly <= providerMax) {
      return Math.min(providerOnly, Math.floor(maxStock));
    }

    let capped = providerMax;
    if (providerStep > 1) {
      capped = Math.floor(capped / providerStep) * providerStep;
    }
    if (capped >= providerMin) {
      return Math.min(capped, Math.floor(maxStock));
    }

    return localQty > 0 ? Math.floor(Math.min(localQty, maxStock)) : Math.floor(maxStock);
  }

  const externalRaw = Math.max(0, bounded - localQty);
  let external = Math.max(providerMin, externalRaw);
  if (providerStep > 1) {
    external = Math.ceil(external / providerStep) * providerStep;
  }
  let next = localQty + external;
  if (next <= maxStock) {
    return next;
  }

  const providerMaxRaw = Math.max(0, Math.floor(maxStock - localQty));
  if (providerMaxRaw < providerMin) {
    return localQty > 0 ? Math.floor(localQty) : Math.floor(maxStock);
  }

  let capped = providerMaxRaw;
  if (providerStep > 1) {
    capped = Math.floor(capped / providerStep) * providerStep;
  }
  if (capped < providerMin) {
    return localQty > 0 ? Math.floor(localQty) : Math.floor(maxStock);
  }
  return localQty + capped;
}

export function getPurchasableUnitPrice(
  roba: Pick<Roba, 'availabilityStatus' | 'cena' | 'providerAvailability'> | null | undefined,
  opts?: { isAdmin?: boolean; isStaff?: boolean }
): number {
  const status = getAvailabilityStatus(roba as any);
  if (status === 'AVAILABLE') {
    const p = Number(roba?.providerAvailability?.price);
    if (Number.isFinite(p) && p > 0) {
      return p;
    }
    const allowFallback = !!opts?.isAdmin || !!opts?.isStaff;
    if (allowFallback) {
      const purchase = Number(roba?.providerAvailability?.purchasePrice);
      return Number.isFinite(purchase) && purchase > 0 ? purchase : 0;
    }
    return 0;
  }

  const cena = Number((roba as any)?.cena);
  return Number.isFinite(cena) ? cena : 0;
}

function pluralizeBusinessDays(n: number): string {
  const abs = Math.abs(n);
  if (abs === 1) return 'radni dan';
  if (abs % 10 >= 2 && abs % 10 <= 4 && (abs % 100 < 10 || abs % 100 >= 20)) return 'radna dana';
  return 'radnih dana';
}

export function formatDeliveryEstimate(
  provider: ProviderAvailabilityDto | null | undefined
): string | null {
  const expected = provider?.expectedDelivery;
  if (expected) {
    const date = new Date(expected);
    if (!Number.isNaN(date.getTime())) {
      const datePart = date.toLocaleDateString('sr-RS');
      const timePart = date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
      return `${datePart} ${timePart}`;
    }
  }
  const providerKey = (provider?.provider || '').toString().trim().toLowerCase();
  const warehouse = (provider?.warehouse || '').toString().trim().toUpperCase();
  if (providerKey === 'szakal' && warehouse === 'PL3') {
    return '> 3 dana';
  }

  const min = Number(provider?.deliveryToCustomerBusinessDaysMin);
  const max = Number(provider?.deliveryToCustomerBusinessDaysMax);

  if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > 0) {
    if (min === max) return `${min} ${pluralizeBusinessDays(min)}`;
    return `${min}–${max} ${pluralizeBusinessDays(max)}`;
  }

  const lead = Number(provider?.leadTimeBusinessDays);
  if (Number.isFinite(lead) && lead > 0) {
    return `${lead} ${pluralizeBusinessDays(lead)}`;
  }

  return null;
}

export function formatProviderPrice(provider: ProviderAvailabilityDto | null | undefined): string | null {
  return formatMoney(provider?.price, provider?.currency);
}

export function formatProviderPurchasePrice(provider: ProviderAvailabilityDto | null | undefined): string | null {
  return formatMoney(provider?.purchasePrice, provider?.currency);
}

function formatMoney(value: unknown, currency: unknown): string | null {
  const n = typeof value === 'number' ? value : Number(value);
  const curr = typeof currency === 'string' ? currency.trim() : '';

  if (!Number.isFinite(n) || n <= 0 || !curr) {
    return null;
  }

  try {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: curr,
      currencyDisplay: 'code',
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    const rounded = Math.round(n * 100) / 100;
    return `${rounded} ${curr}`;
  }
}

export function formatDispatchCutoff(cutoffIso: string | null | undefined): string | null {
  const raw = (cutoffIso || '').trim();
  if (!raw) return null;

  // backend may send just time, e.g. "16:00"
  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    return raw;
  }

  const dt = new Date(raw);
  if (!Number.isFinite(dt.getTime())) return null;

  const now = new Date();
  const isSameDay =
    dt.getFullYear() === now.getFullYear() &&
    dt.getMonth() === now.getMonth() &&
    dt.getDate() === now.getDate();

  const time = dt.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
  if (isSameDay) return time;

  const date = dt.toLocaleDateString('sr-RS');
  return `${date} ${time}`;
}

export function buildAvailabilityVm(
  roba: Pick<Roba, 'availabilityStatus' | 'stanje' | 'cena' | 'rabat' | 'providerAvailability'> | null | undefined,
  opts?: { isAdmin?: boolean; isTecDocOnly?: boolean; isStaff?: boolean }
): AvailabilityVm {
  const isAdmin = !!opts?.isAdmin;
  const isStaff = isAdmin || !!opts?.isStaff;
  const isTecDocOnly = !!opts?.isTecDocOnly;

  const status: AvailabilityStatus = isTecDocOnly ? 'OUT_OF_STOCK' : getAvailabilityStatus(roba as any);

  let label = 'Nema na stanju';
  let tone: AvailabilityTone = 'red';

  if (isTecDocOnly) {
    label = 'TecDoc artikal';
    tone = 'yellow';
  } else if (status === 'IN_STOCK') {
    label = 'Na stanju';
    tone = 'green';
  } else if (status === 'AVAILABLE') {
    label = getExternalAvailabilityLabel(isStaff);
    tone = isStaff ? 'blue' : 'green';
  }

  const purchasableStock = isTecDocOnly ? 0 : getPurchasableStock(roba as any, { isAdmin });
  const displayPrice = getPurchasableUnitPrice(roba as any, {
    isAdmin,
    isStaff,
  });
  const hasValidPrice = displayPrice > 0;

  const showProviderBox = !isTecDocOnly && status === 'AVAILABLE' && !!roba?.providerAvailability?.available;
  const providerKey = (roba?.providerAvailability?.provider || '').toString().trim().toLowerCase();
  const isProvider = status === 'AVAILABLE' && !!roba?.providerAvailability?.available;
  const realtimeFlag = roba?.providerAvailability?.realtimeChecked;
  let priceVerified = true;
  if (isProvider) {
    if (realtimeFlag !== undefined && realtimeFlag !== null) {
      priceVerified = !!realtimeFlag;
    } else if (providerKey === 'szakal') {
      priceVerified = false;
    }
  }
  const noReturnable = providerKey === 'szakal' && !!roba?.providerAvailability?.providerNoReturnable;
  const providerQty = getProviderAvailableQuantity(roba?.providerAvailability);
  const localQty = Math.max(0, Number(roba?.stanje) || 0);
  const sourceLabel = isAdmin
    ? roba?.providerAvailability?.warehouseName ?? EXTERNAL_WAREHOUSE_LABEL
    : null;
  const warehouseSplitEnabled =
    !isTecDocOnly &&
    isFebiProvider(roba?.providerAvailability) &&
    !!roba?.providerAvailability?.available &&
    (localQty > 0 || providerQty > 0);
  const beogradLabel = isAdmin ? 'FEBI (Magacin Beograd)' : 'Magacin Beograd';

  const rabat = Number((roba as any)?.rabat) || 0;
  const showDiscount = !isTecDocOnly && rabat > 0 && rabat < 100 && displayPrice > 0 && priceVerified;
  const packagingUnit = Number(roba?.providerAvailability?.packagingUnit);
  const packagingUnitLabel =
    Number.isFinite(packagingUnit) && packagingUnit > 1 ? `${packagingUnit} kom` : null;

  return {
    status,
    label,
    tone,
    purchasableStock,
    displayPrice,
    hasValidPrice,
    priceVerified,
    showProviderBox,
    showDiscount,
    provider: {
      deliveryLabel: formatDeliveryEstimate(roba?.providerAvailability),
      cutoffLabel: formatDispatchCutoff(roba?.providerAvailability?.nextDispatchCutoff),
      quantity: providerQty > 0 ? providerQty : null,
      noReturnable,
      coreCharge: Number(roba?.providerAvailability?.coreCharge) || null,
      admin: {
        isAdmin,
        sourceLabel,
        customerPriceLabel: isAdmin ? formatProviderPrice(roba?.providerAvailability) : null,
        purchasePriceLabel: isAdmin ? formatProviderPurchasePrice(roba?.providerAvailability) : null,
        packagingUnitLabel,
      },
      warehouseSplit: {
        enabled: warehouseSplitEnabled,
        sabacQuantity: localQty,
        beogradQuantity: providerQty,
        beogradLabel,
        totalQuantity: localQty + providerQty,
      },
    },
  };
}
