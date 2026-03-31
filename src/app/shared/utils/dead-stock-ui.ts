import { DeadStockInfo } from '../data-models/model/roba';

const TRAILING_DISCOUNT_SUFFIX_REGEX = /\s+\d+\s*%?\s*$/;

export interface DeadStockUiState {
  badgeLabel: string | null;
  marketingLabel: string | null;
  isClearance: boolean;
  adminBadgeText: string | null;
  regularPrice: number | null;
  showReferencePrice: boolean;
  discountPercent: number | null;
  discountLabel: string | null;
}

export function getDeadStockBadgeLabel(info?: DeadStockInfo | null): string | null {
  if (!info?.matched) {
    return null;
  }
  const label = info?.badgeLabel?.trim();
  return label ? label : null;
}

export function getDeadStockMarketingLabel(info?: DeadStockInfo | null): string | null {
  const label = getDeadStockBadgeLabel(info);
  if (!label) {
    return null;
  }

  const normalized = label.replace(TRAILING_DISCOUNT_SUFFIX_REGEX, '').trim();
  return normalized || label;
}

export function isDeadStockClearance(info?: DeadStockInfo | null): boolean {
  return (getDeadStockMarketingLabel(info) ?? '').toLowerCase().includes('rasprod');
}

export function getDeadStockAdminBadgeText(
  isAdmin: boolean,
  info?: DeadStockInfo | null
): string | null {
  if (!isAdmin || !info?.candidate || info.daysInDeadStock == null) {
    return null;
  }

  const parts: string[] = [];
  parts.push(`${info.daysInDeadStock} dana bez prodaje`);
  const lastSaleDate = formatDeadStockDate(info?.lastSaleDate);
  if (lastSaleDate) {
    parts.push(`Posl. prodaja ${lastSaleDate}`);
  }
  if (info?.suppressedForCustomer) {
    parts.push(
      info?.overrideUpdatedByName
        ? `Kupcu sakrio ${info.overrideUpdatedByName}`
        : 'Skriveno za kupca'
    );
  }

  return parts.join(' • ');
}

export function getDeadStockRegularPrice(info?: DeadStockInfo | null): number | null {
  const regular = Number(info?.regularPrice);
  if (!Number.isFinite(regular) || regular <= 0) {
    return null;
  }

  return Math.round(regular * 100) / 100;
}

export function showDeadStockReferencePrice(
  info: DeadStockInfo | null | undefined,
  currentPrice: number
): boolean {
  if (!info?.matched) {
    return false;
  }
  const regular = getDeadStockRegularPrice(info);
  return !!regular && Number.isFinite(currentPrice) && regular > currentPrice;
}

export function getDeadStockDiscountPercent(
  info: DeadStockInfo | null | undefined,
  partnerDiscount: number,
  currentPrice: number
): number | null {
  if (!info?.matched) {
    return null;
  }
  const rawDeadStockValue = Number(info?.pricingValue);
  const deadStockConfiguredDiscount =
    info?.pricingMode === 'DISCOUNT_ON_CURRENT_PRICE' &&
    Number.isFinite(rawDeadStockValue) &&
    rawDeadStockValue > 0
      ? Math.round(rawDeadStockValue)
      : 0;

  const effective = Math.max(partnerDiscount, deadStockConfiguredDiscount);
  if (effective > 0) {
    return effective;
  }

  const regular = getDeadStockRegularPrice(info);
  if (!regular || !Number.isFinite(currentPrice) || currentPrice <= 0 || regular <= currentPrice) {
    return null;
  }

  const percent = Math.round(((regular - currentPrice) / regular) * 100);
  return percent > 0 ? percent : null;
}

export function getDeadStockDiscountLabel(
  info: DeadStockInfo | null | undefined,
  partnerDiscount: number,
  currentPrice: number
): string | null {
  const percent = getDeadStockDiscountPercent(info, partnerDiscount, currentPrice);
  return percent ? `-${percent}%` : null;
}

export function parsePricingPercent(raw: unknown): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : 0;
  }

  if (typeof raw === 'string') {
    const normalized = raw.replace('%', '').replace(/\s+/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function buildOldPriceFromDiscount(
  currentPrice: number,
  discountPercent: number
): number | null {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    return null;
  }

  const denom = 1 - discountPercent / 100;
  if (!Number.isFinite(discountPercent) || discountPercent <= 0 || denom <= 0) {
    return null;
  }

  return Math.round((currentPrice / denom) * 100) / 100;
}

export function buildSavingsAmount(currentPrice: number, oldPrice: number | null): number | null {
  if (!oldPrice || !Number.isFinite(currentPrice) || currentPrice <= 0) {
    return null;
  }

  const savings = oldPrice - currentPrice;
  return savings > 0 ? Math.round(savings * 100) / 100 : null;
}

export function buildDeadStockUiState(params: {
  info?: DeadStockInfo | null;
  isAdmin: boolean;
  partnerDiscount: number;
  currentPrice: number;
}): DeadStockUiState {
  const { info, isAdmin, partnerDiscount, currentPrice } = params;
  const badgeLabel = getDeadStockBadgeLabel(info);
  const marketingLabel = getDeadStockMarketingLabel(info);
  const isClearance = isDeadStockClearance(info);
  const adminBadgeText = getDeadStockAdminBadgeText(isAdmin, info);
  const regularPrice = getDeadStockRegularPrice(info);
  const showReferencePrice = showDeadStockReferencePrice(info, currentPrice);
  const discountPercent = getDeadStockDiscountPercent(info, partnerDiscount, currentPrice);

  return {
    badgeLabel,
    marketingLabel,
    isClearance,
    adminBadgeText,
    regularPrice,
    showReferencePrice,
    discountPercent,
    discountLabel: discountPercent ? `-${discountPercent}%` : null,
  };
}

export function formatDeadStockDate(raw?: string | null): string | null {
  if (!raw) {
    return null;
  }
  const simpleDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (simpleDateMatch) {
    return `${simpleDateMatch[3]}.${simpleDateMatch[2]}.${simpleDateMatch[1]}.`;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}.`;
}
