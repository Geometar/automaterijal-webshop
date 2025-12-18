import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';

// Data models
import { Manufacture } from '../../data-models/model/proizvodjac';
import { CartItem, Roba } from '../../data-models/model/roba';

// Services
import { AccountStateService } from './account-state.service';
import { AnalyticsService } from '../analytics.service';
import { getAvailabilityStatus, getPurchasableStock, getPurchasableUnitPrice } from '../../utils/availability-utils';

@Injectable({
  providedIn: 'root',
})
export class CartStateService {
  private storageKey = 'cartItems';
  cartSize$: BehaviorSubject<number> = new BehaviorSubject(0);
  roba$: BehaviorSubject<Roba[]> = new BehaviorSubject([] as Roba[]);

  constructor(
    private accountStateService: AccountStateService,
    private analytics: AnalyticsService,
    private localStorage: LocalStorageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (this.isBrowser) {
      this.updateCartSize();
    }
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  getAll(): CartItem[] {
    if (!this.isBrowser) {
      return [];
    }
    const raw = (this.localStorage.retrieve(this.storageKey) || []) as CartItem[];
    return this.normalizeCart(raw);
  }

  /** Stable cart key used across local + provider-only items. */
  getItemKey(roba: any): string | null {
    const robaId = roba?.robaid;
    if (robaId !== null && robaId !== undefined && robaId !== '') {
      const n = Number(robaId);
      if (Number.isFinite(n) && n > 0) {
        return `ROBA:${n}`;
      }
      return `ROBA:${String(robaId)}`;
    }

    const provider = (roba?.providerAvailability?.provider ?? '').toString().trim();
    const proid = (roba?.proizvodjac?.proid ?? '').toString().trim().toUpperCase();
    const articleNumber = (roba?.providerAvailability?.articleNumber ?? roba?.katbr ?? '')
      .toString()
      .trim()
      .toUpperCase();

    if (!articleNumber) {
      return null;
    }

    return `PROVIDER:${provider || 'UNKNOWN'}:${proid || 'UNKNOWN'}:${articleNumber}`;
  }

  removeFromCartByKey(key: string): void {
    if (!this.isBrowser) {
      return;
    }
    const cart = this.getAll();
    const removedItem = cart.find((item) => item.key === key);
    const updatedCart = cart.filter((item) => item.key !== key);
    this.localStorage.store(this.storageKey, updatedCart);
    this.updateCartSize();

    if (removedItem) {
      const account = this.accountStateService.get();
      const quantityRemoved = removedItem.quantity ?? 1;
      this.analytics.trackRemoveFromCart(removedItem, quantityRemoved, account);
    }
  }

  addToCart(roba: any, quantity: number = 1): void {
    const key = this.getItemKey(roba);
    if (!key) return;

    const status = getAvailabilityStatus(roba);
    const unitPrice = getPurchasableUnitPrice(roba);
    const currentStock = getPurchasableStock(roba);

    const qtyToAdd = Math.min(Math.max(1, Math.floor(quantity || 1)), currentStock || 0);
    if (unitPrice <= 0 || qtyToAdd <= 0) return;

    let cart = this.getAll();
    const existingItem = cart.find((item) => item.key === key);
    let trackedItem: CartItem;

    if (existingItem) {
      const max = Number(existingItem.stock) || (existingItem.quantity ?? 0) + qtyToAdd;
      existingItem.quantity = Math.min((existingItem.quantity ?? 0) + qtyToAdd, max);
      existingItem.totalPrice = (existingItem.unitPrice ?? 0) * (existingItem.quantity ?? 0);
      trackedItem = existingItem;
    } else {
      const newItem: CartItem = this.mapToCartItem(roba);
      newItem.quantity = qtyToAdd;
      newItem.totalPrice = (newItem.unitPrice ?? 0) * qtyToAdd;
      cart.push(newItem);
      trackedItem = newItem;
    }

    // ✅ Smanjuje stanje (lokalno u UI)
    if (status === 'IN_STOCK') {
      roba.stanje = this.calculateNewStock(roba.stanje, qtyToAdd);
    } else if (status === 'AVAILABLE' && roba?.providerAvailability) {
      const pa = roba.providerAvailability;
      if (pa.warehouseQuantity != null) {
        pa.warehouseQuantity = this.calculateNewStock(pa.warehouseQuantity, qtyToAdd);
      }
      if (pa.totalQuantity != null) {
        pa.totalQuantity = this.calculateNewStock(pa.totalQuantity, qtyToAdd);
      }
    }

    if (!this.isBrowser) {
      return;
    }

    this.localStorage.store(this.storageKey, cart);
    this.updateCartSize();

    const account = this.accountStateService.get();
    this.analytics.trackAddToCart(trackedItem, qtyToAdd, account);
  }

  removeFromCart(itemId: number): void {
    this.removeFromCartByKey(`ROBA:${itemId}`);
  }

  resetCart(): void {
    if (!this.isBrowser) {
      return;
    }

    this.localStorage.clear(this.storageKey);
    this.updateCartSize();
  }

  updateQuantity(itemId: number, quantity: number): void {
    this.updateQuantityByKey(`ROBA:${itemId}`, quantity);
  }

  updateQuantityByKey(key: string, quantity: number): void {
    if (!this.isBrowser) {
      return;
    }

    let cart = this.getAll();
    const item = cart.find((i) => i.key === key);

    if (item) {
      item.quantity = quantity;
      item.totalPrice = (item.unitPrice ?? 1) * quantity;
    }

    this.localStorage.store(this.storageKey, cart);
    this.updateCartSize();
  }

  updateStockFromCart(robaList: any[]): void {
    if (!this.isBrowser) {
      return;
    }
    let cart = this.getAll();

    robaList.forEach((roba) => {
      const key = this.getItemKey(roba);
      const cartItem = key ? cart.find((item) => item.key === key) : undefined;
      if (cartItem) {
        const status = getAvailabilityStatus(roba);
        const qty = cartItem.quantity ?? 0;
        if (status === 'AVAILABLE' && roba?.providerAvailability) {
          const pa = roba.providerAvailability;
          if (pa.warehouseQuantity != null) {
            pa.warehouseQuantity = this.calculateNewStock(pa.warehouseQuantity, qty);
          }
          if (pa.totalQuantity != null) {
            pa.totalQuantity = this.calculateNewStock(pa.totalQuantity, qty);
          }
        } else {
          roba.stanje = this.calculateNewStock(roba.stanje, qty);
        }
      }
    });
  }

  updateStockForItem(roba: any): void {
    if (!this.isBrowser) {
      return;
    }
    let cart = this.getAll();
    const key = this.getItemKey(roba);
    const cartItem = key ? cart.find((item) => item.key === key) : undefined;

    if (cartItem) {
      const status = getAvailabilityStatus(roba);
      const qty = cartItem.quantity ?? 0;
      if (status === 'AVAILABLE' && roba?.providerAvailability) {
        const pa = roba.providerAvailability;
        if (pa.warehouseQuantity != null) {
          pa.warehouseQuantity = this.calculateNewStock(pa.warehouseQuantity, qty);
        }
        if (pa.totalQuantity != null) {
          pa.totalQuantity = this.calculateNewStock(pa.totalQuantity, qty);
        }
      } else {
        roba.stanje = this.calculateNewStock(roba.stanje, qty);
      }
    }
  }

  isInCart(itemId: number): boolean {
    return this.isInCartKey(`ROBA:${itemId}`);
  }

  isInCartKey(key: string): boolean {
    return this.getAll().some((item) => item.key === key);
  }

  getRobaFromCart(): Roba[] {
    return this.getAll().map((cartItem: CartItem) => this.mapToRoba(cartItem));
  }

  private calculateNewStock(
    currentStock: number | undefined,
    quantity: number
  ): number {
    return Math.max((currentStock || 0) - quantity, 0);
  }

  private updateCartSize(): void {
    if (!this.isBrowser) {
      this.cartSize$.next(0);
      this.roba$.next([]);
      return;
    }
    const cartItems = this.getAll();
    this.cartSize$.next(cartItems.length);
    this.roba$.next(cartItems.map((cartItem: CartItem) => this.mapToRoba(cartItem)));
  }

  private mapToCartItem(roba: any): CartItem {
    const status = getAvailabilityStatus(roba);
    const provider = roba?.providerAvailability;
    const isProvider = status === 'AVAILABLE' && !!provider?.available;
    const unitPrice = getPurchasableUnitPrice(roba);
    const stock = getPurchasableStock(roba);
    const isAdmin = this.accountStateService.isAdmin();
    const key = this.getItemKey(roba);

    return {
      key: key ?? undefined,
      discount: Number(roba?.rabat) || 0,
      image: roba.slika,
      manufacturer: roba.proizvodjac?.naziv || '',
      manufacturerProid: roba?.proizvodjac?.proid,
      name: roba.naziv || '',
      partNumber: roba.katbr || '',
      quantity: roba.kolicina || 1,
      robaId: roba?.robaid ?? null,
      stock: stock || 0,
      totalPrice: unitPrice * (roba.kolicina || 1),
      unitPrice,
      source: isProvider ? 'PROVIDER' : 'STOCK',
      provider: isProvider ? provider?.provider : undefined,
      providerArticleNumber: isProvider ? provider?.articleNumber : undefined,
      providerWarehouse: isProvider ? provider?.warehouse : undefined,
      providerWarehouseName: isProvider ? provider?.warehouseName : undefined,
      providerCurrency: isProvider ? provider?.currency : undefined,
      providerCustomerPrice: isProvider ? provider?.price : undefined,
      providerPurchasePrice: isProvider && isAdmin ? provider?.purchasePrice : undefined,
      providerLeadTimeBusinessDays: isProvider ? provider?.leadTimeBusinessDays : undefined,
      providerDeliveryToCustomerBusinessDaysMin: isProvider ? provider?.deliveryToCustomerBusinessDaysMin : undefined,
      providerDeliveryToCustomerBusinessDaysMax: isProvider ? provider?.deliveryToCustomerBusinessDaysMax : undefined,
      providerNextDispatchCutoff: isProvider ? provider?.nextDispatchCutoff : undefined,
      technicalDescription: roba.technicalDescription
    };
  }

  private mapToRoba(cartItem: CartItem): Roba {
    const retVal: Roba = {} as Roba;
    retVal.cartKey = cartItem.key;
    retVal.cena = cartItem.unitPrice;
    retVal.katbr = cartItem.partNumber;
    retVal.kolicina = cartItem.quantity;
    retVal.naziv = cartItem.name;
    const manufacturerName =
      typeof cartItem.manufacturer === 'string'
        ? cartItem.manufacturer
        : cartItem.manufacturer?.naziv;
    retVal.proizvodjac = {
      naziv: manufacturerName,
      proid: cartItem.manufacturerProid,
    } as Manufacture;
    retVal.rabat = cartItem.discount || 0;
    retVal.robaid = (cartItem.robaId ?? undefined) as any;
    retVal.slika = cartItem.image;
    if (cartItem.source === 'PROVIDER') {
      retVal.stanje = 0;
      retVal.availabilityStatus = 'AVAILABLE';
      retVal.providerAvailability = {
        available: true,
        provider: cartItem.provider,
        articleNumber: cartItem.providerArticleNumber,
        warehouse: cartItem.providerWarehouse,
        warehouseName: cartItem.providerWarehouseName,
        warehouseQuantity: cartItem.stock ?? 0,
        totalQuantity: cartItem.stock ?? 0,
        price: cartItem.providerCustomerPrice ?? cartItem.unitPrice,
        purchasePrice: cartItem.providerPurchasePrice,
        currency: cartItem.providerCurrency ?? 'RSD',
        leadTimeBusinessDays: cartItem.providerLeadTimeBusinessDays,
        deliveryToCustomerBusinessDaysMin: cartItem.providerDeliveryToCustomerBusinessDaysMin,
        deliveryToCustomerBusinessDaysMax: cartItem.providerDeliveryToCustomerBusinessDaysMax,
        nextDispatchCutoff: cartItem.providerNextDispatchCutoff,
      };
    } else {
      retVal.stanje = cartItem.stock!;
    }
    retVal.tehnickiOpis = cartItem.technicalDescription;
    return retVal;
  }

  private normalizeCart(cart: CartItem[]): CartItem[] {
    // Backward compatibility: older stored items don't have `key`.
    return (cart ?? []).map((item) => {
      if (item?.key) {
        return item;
      }
      const robaId = item?.robaId;
      if (robaId != null) {
        return { ...item, key: `ROBA:${robaId}` };
      }
      const provider = (item?.provider ?? '').toString().trim();
      const proid = (item?.manufacturerProid ?? '').toString().trim().toUpperCase();
      const articleNumber = (item?.providerArticleNumber ?? item?.partNumber ?? '')
        .toString()
        .trim()
        .toUpperCase();
      const fallbackKey = articleNumber
        ? `PROVIDER:${provider || 'UNKNOWN'}:${proid || 'UNKNOWN'}:${articleNumber}`
        : undefined;
      return { ...item, key: fallbackKey };
    });
  }
}
