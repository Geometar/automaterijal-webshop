import { Injectable } from '@angular/core';
import { SessionStorageService } from 'ngx-webstorage';
import { CartItem } from '../../data-models/model/roba';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CartStateService {
  private storageKey = 'cartItems';
  cartSize$: BehaviorSubject<number> = new BehaviorSubject(0);

  constructor(private sessionStorage: SessionStorageService) {
    this.updateCartSize();
  }

  getAll(): CartItem[] {
    return this.sessionStorage.retrieve(this.storageKey) || [];
  }

  addToCart(roba: any, quantity: number = 1): void {
    let cart = this.getAll();
    const existingItem = cart.find((item) => item.robaId === roba.robaid);

    if (existingItem) {
      existingItem.quantity! += quantity;
      existingItem.totalPrice = (existingItem.unitPrice ?? 1) * existingItem.quantity!;
    } else {
      const newItem: CartItem = this.mapToCartItem(roba);
      newItem.quantity = quantity;
      newItem.totalPrice = (newItem.unitPrice ?? 1) * quantity;
      cart.push(newItem);
    }

    // ✅ Smanjuje stanje robe
    roba.stanje = this.calculateNewStock(roba.stanje, quantity);

    this.sessionStorage.store(this.storageKey, cart);
    this.updateCartSize();
  }

  removeFromCart(itemId: number): void {
    const updatedCart = this.getAll().filter((item) => item.robaId !== itemId);
    this.sessionStorage.store(this.storageKey, updatedCart);
    this.updateCartSize();
  }

  resetCart(): void {
    this.sessionStorage.clear(this.storageKey);
    this.updateCartSize();
  }

  updateQuantity(itemId: number, quantity: number): void {
    let cart = this.getAll();
    const item = cart.find((i) => i.robaId === itemId);

    if (item) {
      item.quantity = quantity;
      item.totalPrice = (item.unitPrice ?? 1) * quantity;
    }

    this.sessionStorage.store(this.storageKey, cart);
    this.updateCartSize();
  }

  updateStockFromCart(robaList: any[]): void {
    let cart = this.getAll();

    robaList.forEach((roba) => {
      const cartItem = cart.find((item) => item.robaId === roba.robaid);
      if (cartItem) {
        roba.stanje = this.calculateNewStock(roba.stanje, cartItem.quantity!);
      }
    });
  }

  updateStockForItem(roba: any): void {
    let cart = this.getAll();
    const cartItem = cart.find((item) => item.robaId === roba.robaid);

    if (cartItem) {
      roba.stanje = this.calculateNewStock(roba.stanje, cartItem.quantity!);
    }
  }

  private calculateNewStock(
    currentStock: number | undefined,
    quantity: number
  ): number {
    return Math.max((currentStock || 0) - quantity, 0);
  }

  isInCart(itemId: number): boolean {
    return this.getAll().some((item) => item.robaId === itemId);
  }

  private updateCartSize(): void {
    this.cartSize$.next(this.getAll().length)
  }

  private mapToCartItem(roba: any): CartItem {
    return {
      discount: roba.rabat || 0,
      image: roba.proizvodjacLogo || '',
      manufacturer: roba.proizvodjac?.naziv || '',
      name: roba.naziv || '',
      partNumber: roba.katbr || '',
      quantity: roba.kolicina || 1,
      robaId: roba.robaid || 0,
      stock: roba.stanje || 0,
      totalPrice: (roba.cena || 0) * (roba.kolicina || 1),
      unitPrice: roba.cena || 0,
    };
  }
}
