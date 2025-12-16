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
    return this.localStorage.retrieve(this.storageKey) || [];
  }

  addToCart(roba: any, quantity: number = 1): void {
    const status = getAvailabilityStatus(roba);
    const unitPrice = getPurchasableUnitPrice(roba);
    const currentStock = getPurchasableStock(roba);

    const qtyToAdd = Math.min(Math.max(1, Math.floor(quantity || 1)), currentStock || 0);
    if (unitPrice <= 0 || qtyToAdd <= 0) return;

    let cart = this.getAll();
    const existingItem = cart.find((item) => item.robaId === roba.robaid);
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
    if (!this.isBrowser) {
      return;
    }

    const cart = this.getAll();
    const removedItem = cart.find((item) => item.robaId === itemId);
    const updatedCart = cart.filter((item) => item.robaId !== itemId);
    this.localStorage.store(this.storageKey, updatedCart);
    this.updateCartSize();

    if (removedItem) {
      const account = this.accountStateService.get();
      const quantityRemoved = removedItem.quantity ?? 1;
      this.analytics.trackRemoveFromCart(removedItem, quantityRemoved, account);
    }
  }

  resetCart(): void {
    if (!this.isBrowser) {
      return;
    }

    this.localStorage.clear(this.storageKey);
    this.updateCartSize();
  }

  updateQuantity(itemId: number, quantity: number): void {
    if (!this.isBrowser) {
      return;
    }

    let cart = this.getAll();
    const item = cart.find((i) => i.robaId === itemId);

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
      const cartItem = cart.find((item) => item.robaId === roba.robaid);
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
    const cartItem = cart.find((item) => item.robaId === roba.robaid);

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
    return this.getAll().some((item) => item.robaId === itemId);
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

    return {
      discount: isProvider ? 0 : (roba.rabat || 0),
      image: roba.slika,
      manufacturer: roba.proizvodjac?.naziv || '',
      name: roba.naziv || '',
      partNumber: roba.katbr || '',
      quantity: roba.kolicina || 1,
      robaId: roba.robaid || 0,
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
      technicalDescription: roba.technicalDescription
    };
  }

  private mapToRoba(cartItem: CartItem): Roba {
    const retVal: Roba = {} as Roba;
    retVal.cena = cartItem.unitPrice;
    retVal.katbr = cartItem.partNumber;
    retVal.kolicina = cartItem.quantity;
    retVal.naziv = cartItem.name;
    retVal.proizvodjac = { naziv: cartItem.manufacturer } as Manufacture;
    retVal.rabat = cartItem.discount || 0;
    retVal.robaid = cartItem.robaId;
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
      };
    } else {
      retVal.stanje = cartItem.stock!;
    }
    retVal.tehnickiOpis = cartItem.technicalDescription;
    return retVal;
  }
}
