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
import {
  clampCombinedWarehouseQuantity,
  getAvailabilityStatus,
  getProviderAvailableQuantity,
  getPurchasableStock,
  getPurchasableUnitPrice,
  isFebiProvider,
  resolveMinOrderQuantity,
  resolvePackagingUnit,
  splitCombinedWarehouseQuantity,
} from '../../utils/availability-utils';

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
    const isFebiCombined = isFebiProvider(roba?.providerAvailability);
    const unitPrice = getPurchasableUnitPrice(roba, {
      isAdmin: this.accountStateService.isAdmin(),
      isStaff: this.accountStateService.isEmployee(),
    });
    const currentStock = getPurchasableStock(roba);

    let requested = Math.floor(quantity || 1);
    if (requested < 1) {
      requested = 1;
    }

    if (!isFebiCombined) {
      const step =
        status === 'AVAILABLE' ? resolvePackagingUnit(roba?.providerAvailability) : 1;
      const minOrder =
        status === 'AVAILABLE' ? resolveMinOrderQuantity(roba?.providerAvailability) : 1;

      if (requested < minOrder) {
        requested = minOrder;
      }
      if (step > 1) {
        requested = Math.ceil(requested / step) * step;
        if (requested < step) requested = step;
      }
    }

    let cart = this.getAll();
    const existingItem = cart.find((item) => item.key === key);
    const existingQuantity = Math.max(0, Number(existingItem?.quantity) || 0);
    let targetQuantity = existingQuantity;

    if (isFebiCombined) {
      targetQuantity = this.clampCombinedTargetQuantity(
        roba,
        existingItem,
        existingQuantity + requested
      );
    } else {
      const qtyToAdd = Math.min(requested, currentStock || 0);
      const max = existingQuantity + (currentStock || 0);
      targetQuantity = Math.min(existingQuantity + qtyToAdd, max);
    }

    const qtyToAdd = Math.max(0, targetQuantity - existingQuantity);
    if (unitPrice <= 0 || qtyToAdd <= 0) return;

    let trackedItem: CartItem;

    if (existingItem) {
      existingItem.quantity = targetQuantity;
      existingItem.totalPrice = (existingItem.unitPrice ?? 0) * (existingItem.quantity ?? 0);
      trackedItem = existingItem;
    } else {
      const newItem: CartItem = this.mapToCartItem(roba);
      newItem.quantity = targetQuantity;
      newItem.totalPrice = (newItem.unitPrice ?? 0) * (newItem.quantity ?? 0);
      cart.push(newItem);
      trackedItem = newItem;
    }

    // ✅ Smanjuje stanje (lokalno u UI)
    if (isFebiProvider(roba?.providerAvailability)) {
      this.reduceFromCombinedWarehouses(
        roba,
        qtyToAdd,
        this.accountStateService.isAdmin()
      );
    } else if (status === 'IN_STOCK') {
      roba.stanje = this.calculateNewStock(roba.stanje, qtyToAdd);
    } else if (status === 'AVAILABLE' && roba?.providerAvailability) {
      const pa = roba.providerAvailability;
      if (pa.warehouseQuantity != null) {
        pa.warehouseQuantity = this.calculateNewStock(pa.warehouseQuantity, qtyToAdd);
      }
      if (pa.totalQuantity != null) {
        pa.totalQuantity = this.calculateNewStock(pa.totalQuantity, qtyToAdd);
      }
      this.reduceCityWarehouseQuantity(pa, qtyToAdd);
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
        if (isFebiProvider(roba?.providerAvailability)) {
          this.reduceFromCombinedWarehouses(
            roba,
            qty,
            this.accountStateService.isAdmin()
          );
        } else if (status === 'AVAILABLE' && roba?.providerAvailability) {
          const pa = roba.providerAvailability;
          if (pa.warehouseQuantity != null) {
            pa.warehouseQuantity = this.calculateNewStock(pa.warehouseQuantity, qty);
          }
          if (pa.totalQuantity != null) {
            pa.totalQuantity = this.calculateNewStock(pa.totalQuantity, qty);
          }
          this.reduceCityWarehouseQuantity(pa, qty);
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
      if (isFebiProvider(roba?.providerAvailability)) {
        this.reduceFromCombinedWarehouses(
          roba,
          qty,
          this.accountStateService.isAdmin()
        );
      } else if (status === 'AVAILABLE' && roba?.providerAvailability) {
        const pa = roba.providerAvailability;
        if (pa.warehouseQuantity != null) {
          pa.warehouseQuantity = this.calculateNewStock(pa.warehouseQuantity, qty);
        }
        if (pa.totalQuantity != null) {
          pa.totalQuantity = this.calculateNewStock(pa.totalQuantity, qty);
        }
        this.reduceCityWarehouseQuantity(pa, qty);
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
    const isFebi = isFebiProvider(provider);
    const isProvider = status === 'AVAILABLE' && !!provider?.available;
    const hasProviderSnapshot = !!provider?.available && (isProvider || isFebi);
    const unitPrice = getPurchasableUnitPrice(roba, {
      isAdmin: this.accountStateService.isAdmin(),
      isStaff: this.accountStateService.isEmployee(),
    });
    const stock = getPurchasableStock(roba);
    const isAdmin = this.accountStateService.isAdmin();
    const key = this.getItemKey(roba);
    const localStock = Math.max(0, Number(roba?.stanje) || 0);
    const providerAvailableQuantity = hasProviderSnapshot
      ? getProviderAvailableQuantity(provider)
      : 0;

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
      localStock,
      providerAvailableQuantity: hasProviderSnapshot ? providerAvailableQuantity : undefined,
      tecDocArticleId: roba?.tecDocArticleId ?? undefined,
      stock: stock || 0,
      totalPrice: unitPrice * (roba.kolicina || 1),
      unitPrice,
      source: isProvider ? 'PROVIDER' : 'STOCK',
      provider: hasProviderSnapshot ? provider?.provider : undefined,
      providerArticleNumber: hasProviderSnapshot ? provider?.articleNumber : undefined,
      providerProductId: hasProviderSnapshot ? provider?.providerProductId : undefined,
      providerStockToken: hasProviderSnapshot ? provider?.providerStockToken : undefined,
      providerWarehouse: hasProviderSnapshot ? provider?.warehouse : undefined,
      providerWarehouseName: hasProviderSnapshot ? provider?.warehouseName : undefined,
      providerCurrency: hasProviderSnapshot ? provider?.currency : undefined,
      providerCustomerPrice: hasProviderSnapshot ? provider?.price : undefined,
      providerPurchasePrice: hasProviderSnapshot && isAdmin ? provider?.purchasePrice : undefined,
      providerNoReturnable: hasProviderSnapshot ? provider?.providerNoReturnable : undefined,
      providerPackagingUnit: hasProviderSnapshot ? provider?.packagingUnit : undefined,
      providerMinOrderQuantity: hasProviderSnapshot ? provider?.minOrderQuantity : undefined,
      providerLeadTimeBusinessDays: hasProviderSnapshot ? provider?.leadTimeBusinessDays : undefined,
      providerDeliveryToCustomerBusinessDaysMin: hasProviderSnapshot ? provider?.deliveryToCustomerBusinessDaysMin : undefined,
      providerDeliveryToCustomerBusinessDaysMax: hasProviderSnapshot ? provider?.deliveryToCustomerBusinessDaysMax : undefined,
      providerCityBranchAware: hasProviderSnapshot ? provider?.cityBranchAware : undefined,
      providerCityWarehouseQuantity: hasProviderSnapshot ? provider?.cityWarehouseQuantity : undefined,
      providerFallbackDeliveryBusinessDaysMin: hasProviderSnapshot ? provider?.fallbackDeliveryBusinessDaysMin : undefined,
      providerFallbackDeliveryBusinessDaysMax: hasProviderSnapshot ? provider?.fallbackDeliveryBusinessDaysMax : undefined,
      providerNextDispatchCutoff: hasProviderSnapshot ? provider?.nextDispatchCutoff : undefined,
      providerExpectedDelivery: hasProviderSnapshot ? provider?.expectedDelivery : undefined,
      providerCoreCharge: hasProviderSnapshot ? provider?.coreCharge : undefined,
      providerRealtimeChecked: hasProviderSnapshot ? provider?.realtimeChecked : undefined,
      providerRealtimeCheckedAt: hasProviderSnapshot ? provider?.realtimeCheckedAt : undefined,
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
    retVal.tecDocArticleId = cartItem.tecDocArticleId ?? undefined;
    retVal.slika = cartItem.image;
    const hasProviderSnapshot =
      !!cartItem.provider ||
      !!cartItem.providerArticleNumber ||
      !!cartItem.providerProductId ||
      !!cartItem.providerStockToken ||
      !!cartItem.providerWarehouse ||
      !!cartItem.providerWarehouseName;
    const providerAvailableQuantity = Math.max(
      0,
      Number(cartItem.providerAvailableQuantity) || 0
    );
    const providerStillAvailable =
      providerAvailableQuantity > 0 ||
      (cartItem.source === 'PROVIDER' && (Number(cartItem.stock) || 0) > 0);
    if (cartItem.source === 'PROVIDER') {
      retVal.stanje = 0;
      retVal.availabilityStatus = 'AVAILABLE';
      retVal.providerAvailability = {
        available: providerStillAvailable,
        provider: cartItem.provider,
        articleNumber: cartItem.providerArticleNumber,
        providerProductId: cartItem.providerProductId,
        providerStockToken: cartItem.providerStockToken,
        warehouse: cartItem.providerWarehouse,
        warehouseName: cartItem.providerWarehouseName,
        warehouseQuantity: providerAvailableQuantity || cartItem.stock || 0,
        totalQuantity: providerAvailableQuantity || cartItem.stock || 0,
        price: cartItem.providerCustomerPrice ?? cartItem.unitPrice,
        purchasePrice: cartItem.providerPurchasePrice,
        currency: cartItem.providerCurrency ?? 'RSD',
        packagingUnit: cartItem.providerPackagingUnit,
        minOrderQuantity: cartItem.providerMinOrderQuantity,
        providerNoReturnable: cartItem.providerNoReturnable,
        leadTimeBusinessDays: cartItem.providerLeadTimeBusinessDays,
        deliveryToCustomerBusinessDaysMin: cartItem.providerDeliveryToCustomerBusinessDaysMin,
        deliveryToCustomerBusinessDaysMax: cartItem.providerDeliveryToCustomerBusinessDaysMax,
        cityBranchAware: cartItem.providerCityBranchAware,
        cityWarehouseQuantity: cartItem.providerCityWarehouseQuantity,
        fallbackDeliveryBusinessDaysMin: cartItem.providerFallbackDeliveryBusinessDaysMin,
        fallbackDeliveryBusinessDaysMax: cartItem.providerFallbackDeliveryBusinessDaysMax,
        nextDispatchCutoff: cartItem.providerNextDispatchCutoff,
        expectedDelivery: cartItem.providerExpectedDelivery,
        coreCharge: cartItem.providerCoreCharge,
        realtimeChecked: cartItem.providerRealtimeChecked,
        realtimeCheckedAt: cartItem.providerRealtimeCheckedAt,
      };
    } else {
      retVal.stanje = Math.max(0, Number(cartItem.localStock) || Number(cartItem.stock) || 0);
      if (hasProviderSnapshot) {
        retVal.providerAvailability = {
          available: providerStillAvailable,
          provider: cartItem.provider,
          articleNumber: cartItem.providerArticleNumber,
          providerProductId: cartItem.providerProductId,
          providerStockToken: cartItem.providerStockToken,
          warehouse: cartItem.providerWarehouse,
          warehouseName: cartItem.providerWarehouseName,
          warehouseQuantity: providerAvailableQuantity,
          totalQuantity: providerAvailableQuantity,
          price: cartItem.providerCustomerPrice,
          purchasePrice: cartItem.providerPurchasePrice,
          currency: cartItem.providerCurrency ?? 'RSD',
          packagingUnit: cartItem.providerPackagingUnit,
          minOrderQuantity: cartItem.providerMinOrderQuantity,
          providerNoReturnable: cartItem.providerNoReturnable,
          leadTimeBusinessDays: cartItem.providerLeadTimeBusinessDays,
          deliveryToCustomerBusinessDaysMin: cartItem.providerDeliveryToCustomerBusinessDaysMin,
          deliveryToCustomerBusinessDaysMax: cartItem.providerDeliveryToCustomerBusinessDaysMax,
          cityBranchAware: cartItem.providerCityBranchAware,
          cityWarehouseQuantity: cartItem.providerCityWarehouseQuantity,
          fallbackDeliveryBusinessDaysMin: cartItem.providerFallbackDeliveryBusinessDaysMin,
          fallbackDeliveryBusinessDaysMax: cartItem.providerFallbackDeliveryBusinessDaysMax,
          nextDispatchCutoff: cartItem.providerNextDispatchCutoff,
          expectedDelivery: cartItem.providerExpectedDelivery,
          coreCharge: cartItem.providerCoreCharge,
          realtimeChecked: cartItem.providerRealtimeChecked,
          realtimeCheckedAt: cartItem.providerRealtimeCheckedAt,
        };
      }
    }
    retVal.tehnickiOpis = cartItem.technicalDescription;
    return retVal;
  }

  private clampCombinedTargetQuantity(
    roba: any,
    existingItem: CartItem | undefined,
    target: number
  ): number {
    const localSnapshot = Math.max(
      0,
      Number(existingItem?.localStock ?? roba?.stanje) || 0
    );
    const providerSnapshotQuantity = Math.max(
      0,
      Number(existingItem?.providerAvailableQuantity) ||
        getProviderAvailableQuantity(roba?.providerAvailability)
    );
    const providerSnapshot = roba?.providerAvailability
      ? {
          ...roba.providerAvailability,
          warehouseQuantity: providerSnapshotQuantity,
          totalQuantity: providerSnapshotQuantity,
        }
      : undefined;
    const snapshotRoba = {
      ...roba,
      stanje: localSnapshot,
      providerAvailability: providerSnapshot,
    };
    const snapshotMax = Math.max(0, getPurchasableStock(snapshotRoba));

    return clampCombinedWarehouseQuantity({
      requestedQty: target,
      maxStock: snapshotMax,
      localQty: localSnapshot,
      provider: providerSnapshot,
      minQuantity: 1,
    });
  }

  private reduceFromCombinedWarehouses(
    roba: any,
    quantity: number,
    adminExternalOnly = false
  ): void {
    const requested = Math.max(0, Number(quantity) || 0);
    if (requested <= 0) {
      return;
    }

    const local = Math.max(0, Number(roba?.stanje) || 0);
    const split = splitCombinedWarehouseQuantity(requested, local, roba?.providerAvailability);
    if (!adminExternalOnly) {
      roba.stanje = Math.max(0, local - split.localQuantity);
    }
    const externalTaken = adminExternalOnly ? requested : split.externalQuantity;
    if (externalTaken <= 0) {
      return;
    }

    if (!roba?.providerAvailability) {
      return;
    }
    const providerQty = getProviderAvailableQuantity(roba.providerAvailability);
    const nextQty = Math.max(0, providerQty - externalTaken);
    roba.providerAvailability.warehouseQuantity = nextQty;
    roba.providerAvailability.totalQuantity = nextQty;
    this.reduceCityWarehouseQuantity(roba.providerAvailability, externalTaken);
  }

  private reduceCityWarehouseQuantity(provider: any, quantity: number): void {
    if (!provider?.cityBranchAware) {
      return;
    }
    const current = Math.max(
      0,
      Number(provider.cityWarehouseQuantity ?? provider.warehouseQuantity) || 0
    );
    provider.cityWarehouseQuantity = this.calculateNewStock(current, quantity);
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
