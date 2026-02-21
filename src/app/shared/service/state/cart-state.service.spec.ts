import { CartStateService } from './cart-state.service';

class InMemoryLocalStorageService {
  private storeMap = new Map<string, any>();

  retrieve(key: string): any {
    return this.storeMap.get(key);
  }

  store(key: string, value: any): void {
    this.storeMap.set(key, value);
  }

  clear(key: string): void {
    this.storeMap.delete(key);
  }
}

describe('CartStateService (FEBI combined)', () => {
  let service: CartStateService;
  let localStorage: InMemoryLocalStorageService;

  beforeEach(() => {
    localStorage = new InMemoryLocalStorageService();
    service = new CartStateService(
      {
        isAdmin: () => false,
        isEmployee: () => false,
        get: () => ({ ppid: 1 }),
      } as any,
      {
        trackAddToCart: () => undefined,
        trackRemoveFromCart: () => undefined,
      } as any,
      localStorage as any,
      'browser' as any
    );
  });

  function febiRoba() {
    return {
      robaid: 101,
      cena: 100,
      kolicina: 1,
      stanje: 1,
      availabilityStatus: 'IN_STOCK',
      katbr: 'F-101',
      naziv: 'Test FEBI artikal',
      proizvodjac: { proid: 'FEBI', naziv: 'FEBI' },
      providerAvailability: {
        provider: 'febi-stock',
        available: true,
        articleNumber: 'A-101',
        warehouseQuantity: 50,
        totalQuantity: 50,
        packagingUnit: 20,
        minOrderQuantity: 20,
        price: 100,
      },
    };
  }

  function cityAwareRoba() {
    return {
      robaid: 202,
      cena: 100,
      kolicina: 1,
      stanje: 0,
      availabilityStatus: 'AVAILABLE',
      katbr: 'G-202',
      naziv: 'Test city-aware artikal',
      proizvodjac: { proid: 'BOSCH', naziv: 'BOSCH' },
      providerAvailability: {
        provider: 'gazela',
        available: true,
        articleNumber: 'A-202',
        cityBranchAware: true,
        cityWarehouseQuantity: 2,
        warehouseQuantity: 2,
        totalQuantity: 10,
        price: 100,
      },
    };
  }

  it('snaps first add to FEBI provider bucket without consuming local stock', () => {
    const roba = febiRoba();

    service.addToCart(roba, 2);
    const cart = service.getAll();

    expect(cart.length).toBe(1);
    expect(cart[0].quantity).toBe(20);
    expect(roba.stanje).toBe(1);
    expect(roba.providerAvailability.warehouseQuantity).toBe(30);
    expect(roba.providerAvailability.totalQuantity).toBe(30);
  });

  it('repeated add uses snapshot and reaches next valid FEBI bucket', () => {
    const roba = febiRoba();

    service.addToCart(roba, 2);
    service.addToCart(roba, 2);
    const cart = service.getAll();

    expect(cart.length).toBe(1);
    expect(cart[0].quantity).toBe(40);
  });

  it('decrements city warehouse quantity for city-aware providers', () => {
    const roba = cityAwareRoba();

    service.addToCart(roba, 3);

    expect(roba.providerAvailability.cityWarehouseQuantity).toBe(0);
    expect(roba.providerAvailability.warehouseQuantity).toBe(0);
    expect(roba.providerAvailability.totalQuantity).toBe(7);
  });

  it('updateStockFromCart decrements city-aware quantities using cart snapshot', () => {
    const roba = cityAwareRoba();
    const key = service.getItemKey(roba) as string;
    localStorage.store('cartItems', [
      {
        key,
        quantity: 2,
        unitPrice: 100,
        totalPrice: 200,
      },
    ]);

    service.updateStockFromCart([roba]);

    expect(roba.providerAvailability.cityWarehouseQuantity).toBe(0);
    expect(roba.providerAvailability.warehouseQuantity).toBe(0);
    expect(roba.providerAvailability.totalQuantity).toBe(8);
  });

  it('updateStockForItem decrements city-aware quantities for single item refresh', () => {
    const roba = cityAwareRoba();
    const key = service.getItemKey(roba) as string;
    localStorage.store('cartItems', [
      {
        key,
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
      },
    ]);

    service.updateStockForItem(roba);

    expect(roba.providerAvailability.cityWarehouseQuantity).toBe(1);
    expect(roba.providerAvailability.warehouseQuantity).toBe(1);
    expect(roba.providerAvailability.totalQuantity).toBe(9);
  });
});
