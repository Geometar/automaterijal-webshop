import {
  clampCombinedWarehouseQuantity,
  formatDeliveryEstimate,
  getPurchasableStock,
  requiresExternalWarehouseForFlow,
  resolveFlowStockQuantity,
  splitWarehouseQuantityForFlow,
  splitCombinedWarehouseQuantity,
} from './availability-utils';

describe('availability-utils (FEBI combined)', () => {
  const febiConstrainedProvider = {
    provider: 'febi-stock',
    available: true,
    warehouseQuantity: 50,
    totalQuantity: 50,
    packagingUnit: 20,
    minOrderQuantity: 20,
  };

  it('calculates purchasable stock using provider buckets for constrained FEBI', () => {
    const stock = getPurchasableStock({
      stanje: 1,
      availabilityStatus: 'IN_STOCK',
      providerAvailability: febiConstrainedProvider,
    });

    expect(stock).toBe(40);
  });

  it('splits constrained FEBI request as provider-only bucket when eligible', () => {
    const split = splitCombinedWarehouseQuantity(20, 1, febiConstrainedProvider);

    expect(split.localQuantity).toBe(0);
    expect(split.externalQuantity).toBe(20);
    expect(split.hasMixed).toBeFalse();
  });

  it('clamps constrained FEBI quantity to valid bucket progression', () => {
    const clampedFromTwo = clampCombinedWarehouseQuantity({
      requestedQty: 2,
      maxStock: 40,
      localQty: 1,
      provider: febiConstrainedProvider,
      minQuantity: 1,
    });
    const clampedFromTwentyTwo = clampCombinedWarehouseQuantity({
      requestedQty: 22,
      maxStock: 40,
      localQty: 1,
      provider: febiConstrainedProvider,
      minQuantity: 1,
    });

    expect(clampedFromTwo).toBe(20);
    expect(clampedFromTwentyTwo).toBe(40);
  });

  it('combines local and external stock when provider is not constrained', () => {
    const provider = {
      provider: 'febi-stock',
      available: true,
      warehouseQuantity: 5,
      totalQuantity: 5,
      packagingUnit: 1,
      minOrderQuantity: 1,
    };

    const stock = getPurchasableStock({
      stanje: 4,
      availabilityStatus: 'IN_STOCK',
      providerAvailability: provider,
    });

    expect(stock).toBe(9);
  });

  it('uses provider-only split for admin external flow', () => {
    const split = splitWarehouseQuantityForFlow({
      requestedQty: 2,
      localQty: 2,
      isAdmin: true,
      provider: febiConstrainedProvider as any,
    });

    expect(split.localQuantity).toBe(0);
    expect(split.externalQuantity).toBe(2);
    expect(split.hasMixed).toBeFalse();
  });

  it('treats admin provider requests as external requirement', () => {
    const required = requiresExternalWarehouseForFlow({
      requestedQty: 2,
      localQty: 2,
      isAdmin: true,
      provider: febiConstrainedProvider as any,
    });

    expect(required).toBeTrue();
  });

  it('uses provider stock as effective stock for admin provider flow', () => {
    const stock = resolveFlowStockQuantity({
      isAdmin: true,
      provider: febiConstrainedProvider as any,
      defaultStock: 999,
    });

    expect(stock).toBe(50);
  });
});

describe('formatDeliveryEstimate', () => {
  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-02-18T10:00:00+01:00'));
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('formats same-week expected delivery as weekday and time', () => {
    const label = formatDeliveryEstimate({
      expectedDelivery: '2026-02-20T13:00:00Z',
    } as any);

    expect(label).toBe('Petak 14:00');
  });

  it('formats next-week expected delivery as date and time', () => {
    const label = formatDeliveryEstimate({
      expectedDelivery: '2026-02-24T13:00:00Z',
    } as any);

    expect(label).toContain('14:00');
    expect(label).toMatch(/24\.\s*2\.\s*2026\./);
  });
});
