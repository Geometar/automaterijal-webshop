import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';

// Data models
import { Manufacture } from '../../data-models/model/proizvodjac';
import { CartItem, Roba } from '../../data-models/model/roba';

@Injectable({
  providedIn: 'root',
})
export class CartStateService {
  private storageKey = 'cartItems';
  cartSize$: BehaviorSubject<number> = new BehaviorSubject(0);
  roba$: BehaviorSubject<Roba[]> = new BehaviorSubject([] as Roba[]);

  constructor(private localStorage: LocalStorageService) {
    this.updateCartSize();
  }

  getAll(): CartItem[] {
    return this.localStorage.retrieve(this.storageKey) || [];
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

    this.localStorage.store(this.storageKey, cart);
    this.updateCartSize();
  }

  removeFromCart(itemId: number): void {
    const updatedCart = this.getAll().filter((item) => item.robaId !== itemId);
    this.localStorage.store(this.storageKey, updatedCart);
    this.updateCartSize();
  }

  resetCart(): void {
    this.localStorage.clear(this.storageKey);
    this.updateCartSize();
  }

  updateQuantity(itemId: number, quantity: number): void {
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
    const cartItems = this.getAll();
    this.cartSize$.next(cartItems.length)
    this.roba$.next(cartItems.map((cartItem: CartItem) => this.mapToRoba(cartItem)));
  }

  private mapToCartItem(roba: any): CartItem {
    return {
      discount: roba.rabat || 0,
      image: roba.slika,
      manufacturer: roba.proizvodjac?.naziv || '',
      name: roba.naziv || '',
      partNumber: roba.katbr || '',
      quantity: roba.kolicina || 1,
      robaId: roba.robaid || 0,
      stock: roba.stanje || 0,
      totalPrice: (roba.cena || 0) * (roba.kolicina || 1),
      unitPrice: roba.cena || 0,
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
    retVal.stanje = cartItem.stock!;
    retVal.tehnickiOpis = cartItem.technicalDescription;
    return retVal;
  }
}
