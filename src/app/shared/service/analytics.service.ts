import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Data models
import { Account } from '../data-models/model/account';
import { CartItem, Roba } from '../data-models/model/roba';

type DataLayerEvent = Record<string, unknown>;

const DEFAULT_CURRENCY = 'RSD';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object) { }

  trackPageView(
    url: string,
    title: string | null = null,
    account: Account | null = null
  ): void {
    const payload: DataLayerEvent = {
      event: 'page_view',
      page_location: url,
    };

    if (title) {
      payload['page_title'] = title;
    }

    this.pushWithUser(payload, account);
  }

  trackViewItemList(
    items: Roba[] | undefined,
    listName: string,
    account: Account | null,
    metadata?: Record<string, unknown>
  ): void {
    if (!items?.length) {
      return;
    }

    const analyticsItems = items.map((roba, index) =>
      this.mapRobaToAnalyticsItem(roba, index, listName)
    );

    const payload: DataLayerEvent = {
      event: 'view_item_list',
      ecommerce: {
        currency: DEFAULT_CURRENCY,
        items: analyticsItems,
      },
    };

    if (metadata) {
      Object.assign(payload, metadata);
    }

    this.pushWithUser(payload, account);
  }

  trackViewItem(item: Roba | null | undefined, account: Account | null): void {
    if (!item?.robaid) {
      return;
    }

    const price = this.toNumber(item.cena);
    const payload: DataLayerEvent = {
      event: 'view_item',
      ecommerce: {
        currency: DEFAULT_CURRENCY,
        value: price,
        items: [this.mapRobaToAnalyticsItem(item)],
      },
    };

    this.pushWithUser(payload, account);
  }

  trackAddToCart(
    item: CartItem,
    quantityAdded: number,
    account: Account | null
  ): void {
    const payload: DataLayerEvent = {
      event: 'add_to_cart',
      ecommerce: {
        currency: DEFAULT_CURRENCY,
        value: this.calculateLineValue(item, quantityAdded),
        items: [this.mapCartItemToAnalyticsItem(item, quantityAdded)],
      },
    };

    this.pushWithUser(payload, account);
  }

  trackRemoveFromCart(
    item: CartItem,
    quantityRemoved: number,
    account: Account | null
  ): void {
    const payload: DataLayerEvent = {
      event: 'remove_from_cart',
      ecommerce: {
        currency: DEFAULT_CURRENCY,
        value: this.calculateLineValue(item, quantityRemoved),
        items: [this.mapCartItemToAnalyticsItem(item, quantityRemoved)],
      },
    };

    this.pushWithUser(payload, account);
  }

  trackViewCart(items: CartItem[], account: Account | null): void {
    if (!items.length) {
      return;
    }

    const payload: DataLayerEvent = {
      event: 'view_cart',
      ecommerce: {
        currency: DEFAULT_CURRENCY,
        value: this.calculateCartValue(items),
        items: items.map((item) => this.mapCartItemToAnalyticsItem(item)),
      },
    };

    this.pushWithUser(payload, account);
  }

  trackBeginCheckout(
    items: CartItem[],
    account: Account | null,
    metadata?: Record<string, unknown>
  ): void {
    if (!items.length) {
      return;
    }

    const payload: DataLayerEvent = {
      event: 'begin_checkout',
      ecommerce: {
        currency: DEFAULT_CURRENCY,
        value: this.calculateCartValue(items),
        items: items.map((item) => this.mapCartItemToAnalyticsItem(item)),
      },
    };

    if (metadata) {
      Object.assign(payload, metadata);
    }

    this.pushWithUser(payload, account);
  }

  trackPurchase(
    transactionId: string,
    items: CartItem[],
    total: number,
    account: Account | null,
    params?: { tax?: number; shipping?: number; currency?: string }
  ): void {
    if (!items.length || !transactionId) {
      return;
    }

    const payload: DataLayerEvent = {
      event: 'purchase',
      ecommerce: {
        transaction_id: transactionId,
        currency: params?.currency ?? DEFAULT_CURRENCY,
        value: this.toNumber(total),
        tax: this.toNumber(params?.tax),
        shipping: this.toNumber(params?.shipping),
        items: items.map((item) => this.mapCartItemToAnalyticsItem(item)),
      },
    };

    this.pushWithUser(payload, account);
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private calculateLineValue(item: CartItem, quantity: number): number {
    const price = this.toNumber(item.unitPrice);
    const qty = this.normalizeQuantity(quantity);
    return +(price * qty).toFixed(2);
  }

  private calculateCartValue(items: CartItem[]): number {
    const total = items.reduce((acc, item) => {
      const price = this.toNumber(item.unitPrice);
      const quantity = this.normalizeQuantity(item.quantity ?? 1);
      return acc + price * quantity;
    }, 0);
    return +total.toFixed(2);
  }

  private mapCartItemToAnalyticsItem(
    item: CartItem,
    quantityOverride?: number
  ): Record<string, unknown> {
    const manufacturer =
      typeof item.manufacturer === 'string'
        ? item.manufacturer
        : item.manufacturer?.naziv ?? '';

    const analyticsItem: Record<string, unknown> = {
      item_id: item.robaId ?? '',
      item_name: item.name ?? '',
      item_brand: manufacturer,
      item_variant: item.partNumber ?? '',
      price: this.toNumber(item.unitPrice),
      quantity: this.normalizeQuantity(
        quantityOverride ?? item.quantity ?? 1
      ),
    };

    if (item.discount != null) {
      analyticsItem['discount'] = this.toNumber(item.discount);
    }

    return analyticsItem;
  }

  private mapRobaToAnalyticsItem(
    roba: Roba,
    index?: number,
    listName?: string
  ): Record<string, unknown> {
    const analyticsItem: Record<string, unknown> = {
      item_id: roba.robaid ?? '',
      item_name: roba.naziv ?? '',
      item_brand: roba.proizvodjac?.naziv ?? '',
      item_category: roba.grupaNaziv ?? roba.grupa ?? '',
      item_variant: roba.katbr ?? roba.katbrpro ?? '',
      price: this.toNumber(roba.cena),
      quantity: this.normalizeQuantity(roba.kolicina ?? 1),
    };

    const category2 =
      roba.podGrupaNaziv ??
      (roba.podGrupa != null ? String(roba.podGrupa) : undefined);
    if (category2) {
      analyticsItem['item_category2'] = category2;
    }

    if (listName) {
      analyticsItem['item_list_name'] = listName;
    }
    if (index != null) {
      analyticsItem['index'] = index + 1;
    }

    return analyticsItem;
  }

  private normalizeQuantity(value: unknown): number {
    const num = Math.floor(this.toNumber(value));
    return num > 0 ? num : 1;
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
      const normalized = value.replace(/[^\d.,-]/g, '').replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private resolveUserType(account: Account | null | undefined): string {
    if (!account || !account.ppid) {
      return 'webshop_korisnik';
    }

    if (account.isAdmin) {
      return 'admin';
    }

    if (account.isSubAdmin) {
      return 'subadmin';
    }

    return 'partner';
  }

  private resolveUserLabel(account: Account | null | undefined): string | null {
    if (!account || !account.ppid) {
      return 'webshop_korisnik';
    }

    return account.naziv ?? account.email ?? String(account.ppid);
  }

  private buildUserContext(account: Account | null | undefined): DataLayerEvent {
    const context: DataLayerEvent = {};

    const userId = account?.ppid;
    if (userId) {
      context['user_id'] = userId;
    }

    const userType = this.resolveUserType(account);
    if (userType) {
      context['user_type'] = userType;
    }

    const userLabel = this.resolveUserLabel(account);
    if (userLabel) {
      context['user_label'] = userLabel;
    }

    return context;
  }

  private pushWithUser(
    payload: DataLayerEvent,
    account: Account | null | undefined
  ): void {
    Object.assign(payload, this.buildUserContext(account));
    this.pushToDataLayer(payload);
  }

  private pushToDataLayer(event: DataLayerEvent): void {
    if (!this.isBrowser) {
      return;
    }

    const win = window as typeof window & {
      dataLayer?: DataLayerEvent[];
      gtag?: (...args: unknown[]) => void;
    };

    if (Array.isArray(win.dataLayer)) {
      win.dataLayer.push(event);
      return;
    }

    if (typeof win.gtag === 'function') {
      win.gtag('event', event['event'] as string, event);
    }
  }
}
