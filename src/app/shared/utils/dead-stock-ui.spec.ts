import { buildDeadStockUiState } from './dead-stock-ui';

describe('dead-stock-ui', () => {
  const candidateInfo = {
    candidate: true,
    matched: true,
    daysInDeadStock: 420,
    lastSaleDate: '2025-01-15',
    regularPrice: 1500,
  } as any;

  it('returns strong admin marker for admin candidate', () => {
    const state = buildDeadStockUiState({
      info: candidateInfo,
      isAdmin: true,
      partnerDiscount: 0,
      currentPrice: 1000,
    });

    expect(state.strongAdminMarkerLabel).toBe('MRTAV LAGER');
    expect(state.highlightAdminCandidate).toBeTrue();
    expect(state.adminBadgeText).toContain('420 dana bez prodaje');
    expect(state.adminBadgeText).toContain('Posl. prodaja 15.01.2025.');
  });

  it('does not expose strong admin marker to customer', () => {
    const state = buildDeadStockUiState({
      info: candidateInfo,
      isAdmin: false,
      partnerDiscount: 0,
      currentPrice: 1000,
    });

    expect(state.strongAdminMarkerLabel).toBeNull();
    expect(state.highlightAdminCandidate).toBeFalse();
    expect(state.adminBadgeText).toBeNull();
  });
});
