import {
  clampCombinedWarehouseQuantity,
  getPurchasableStock,
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
});
