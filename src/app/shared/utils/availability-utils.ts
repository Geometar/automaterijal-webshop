import { AvailabilityStatus, ProviderAvailabilityDto } from '../data-models/model/availability';
import { Roba } from '../data-models/model/roba';

export type AvailabilityTone = 'green' | 'blue' | 'red' | 'yellow';

export const EXTERNAL_WAREHOUSE_LABEL = 'Eksterni magacin';
export const EXTERNAL_AVAILABILITY_LABEL_STAFF = 'Dostupno (eksterni magacin)';
export const EXTERNAL_AVAILABILITY_LABEL_CUSTOMER = 'Na stanju (eksterni magacin)';

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

export interface AvailabilityVm {
  status: AvailabilityStatus;
  label: string;
  tone: AvailabilityTone;
  purchasableStock: number;
  displayPrice: number;
  hasValidPrice: boolean;
  showProviderBox: boolean;
  showDiscount: boolean;
  provider: {
    deliveryLabel: string | null;
    cutoffLabel: string | null;
    quantity: number | null;
    admin: {
      isAdmin: boolean;
      sourceLabel: string | null;
      customerPriceLabel: string | null;
      purchasePriceLabel: string | null;
      packagingUnitLabel: string | null;
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
  const status = getAvailabilityStatus(roba);
  if (status === 'IN_STOCK') {
    return Math.max(0, Number(roba?.stanje) || 0);
  }

  if (status === 'AVAILABLE') {
    const providerQty =
      Number(roba?.providerAvailability?.warehouseQuantity) ||
      Number(roba?.providerAvailability?.totalQuantity) ||
      0;
    const packagingUnit = Number(roba?.providerAvailability?.packagingUnit);
    if (Number.isFinite(packagingUnit) && packagingUnit > 1) {
      const maxPieces = Math.floor(providerQty / packagingUnit) * packagingUnit;
      return Math.max(0, maxPieces);
    }
    return Math.max(0, providerQty);
  }

  return 0;
}

export function getPurchasableUnitPrice(
  roba: Pick<Roba, 'availabilityStatus' | 'cena' | 'providerAvailability'> | null | undefined
): number {
  const status = getAvailabilityStatus(roba as any);
  if (status === 'AVAILABLE') {
    const p = Number(roba?.providerAvailability?.price);
    return Number.isFinite(p) ? p : 0;
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
  const displayPrice = getPurchasableUnitPrice(roba as any);
  const hasValidPrice = displayPrice > 0;

  const showProviderBox = !isTecDocOnly && status === 'AVAILABLE' && !!roba?.providerAvailability?.available;
  const providerQty =
    Number(roba?.providerAvailability?.warehouseQuantity) ||
    Number(roba?.providerAvailability?.totalQuantity) ||
    0;
  const sourceLabel = isAdmin
    ? roba?.providerAvailability?.warehouseName ?? EXTERNAL_WAREHOUSE_LABEL
    : null;

  const rabat = Number((roba as any)?.rabat) || 0;
  const showDiscount = !isTecDocOnly && rabat > 0 && rabat < 100 && displayPrice > 0;
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
    showProviderBox,
    showDiscount,
    provider: {
      deliveryLabel: formatDeliveryEstimate(roba?.providerAvailability),
      cutoffLabel: formatDispatchCutoff(roba?.providerAvailability?.nextDispatchCutoff),
      quantity: providerQty > 0 ? providerQty : null,
      admin: {
        isAdmin,
        sourceLabel,
        customerPriceLabel: isAdmin ? formatProviderPrice(roba?.providerAvailability) : null,
        purchasePriceLabel: isAdmin ? formatProviderPurchasePrice(roba?.providerAvailability) : null,
        packagingUnitLabel,
      },
    },
  };
}
