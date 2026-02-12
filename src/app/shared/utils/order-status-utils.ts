export type OrderOutcome = 'pass' | 'fail' | 'pending';

export interface OrderStatusInput {
  statusId?: number | null;
  statusName?: string | null;
  orderedAmount?: number | null;
  confirmedAmount?: number | null;
}

const FINAL_STATUS_IDS = new Set([4, 7, 8]); // POTVRDJENA, KONACNA, ARHIVIRANA

function normalizeStatus(value: unknown): string {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  // Keep ascii-only normalization so mojibake like "KonaÄna" still matches "kona".
  return raw
    .replace(/[šś]/g, 's')
    .replace(/[čć]/g, 'c')
    .replace(/[ž]/g, 'z')
    .replace(/[đ]/g, 'dj');
}

function isExplicitFailStatus(id: number | null | undefined, normalizedName: string): boolean {
  if (id === 6) {
    return true; // PONISTENA
  }

  return (
    normalizedName.includes('ponist') ||
    normalizedName.includes('odbij') ||
    normalizedName.includes('storno') ||
    normalizedName.includes('otkaz') ||
    normalizedName.includes('neusp')
  );
}

function toAmount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function resolveOrderOutcome(input: OrderStatusInput | null | undefined): OrderOutcome {
  const statusId = Number(input?.statusId);
  const id = Number.isFinite(statusId) ? statusId : null;
  const name = normalizeStatus(input?.statusName);
  const ordered = toAmount(input?.orderedAmount);
  const confirmed = toAmount(input?.confirmedAmount);

  if (isExplicitFailStatus(id, name)) {
    return 'fail';
  }

  if (id != null && FINAL_STATUS_IDS.has(id)) {
    if (ordered > 0 && confirmed + 0.01 < ordered) {
      return 'fail';
    }
    return 'pass';
  }

  // Non-final statuses are treated as "expected to pass" unless explicitly failed.
  return 'pending';
}

export function orderOutcomeToBadgeValue(outcome: OrderOutcome): boolean | null {
  if (outcome === 'pass') return true;
  if (outcome === 'fail') return false;
  return null;
}

export function orderOutcomeIcon(outcome: OrderOutcome): string {
  return outcome === 'fail' ? '✕' : '✓';
}

