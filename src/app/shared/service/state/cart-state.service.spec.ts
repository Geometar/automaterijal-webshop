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
});
