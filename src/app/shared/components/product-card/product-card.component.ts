import { Component, Input, Output, EventEmitter, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Automaterijal imports
import { AutomIconComponent } from '../autom-icon/autom-icon.component';
import { ButtonComponent } from '../button/button.component';
import { InputFieldsComponent } from '../input-fields/input-fields.component';

// Data models
import { Roba } from '../../data-models/model/roba';

// Enums
import { ColorEnum, IconsEnum, InputTypeEnum, SizeEnum } from '../../data-models/enums';

// Pipes
import { RsdCurrencyPipe } from '../../pipe/rsd-currency.pipe';

@Component({
  selector: 'autom-product-card',
  standalone: true,
  imports: [
    CommonModule,
    AutomIconComponent,
    ButtonComponent,
    InputFieldsComponent,
    FormsModule,
    ReactiveFormsModule,
    RsdCurrencyPipe
  ],
  providers: [CurrencyPipe],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AutomProductCardComponent implements OnInit {
  @Input() roba!: Roba;
  @Output() onClick = new EventEmitter<number>();
  @Output() addToCart = new EventEmitter<{ roba: Roba; quantity: number }>();

  // UI enums
  iconEnum = IconsEnum;
  colorEnum = ColorEnum;
  inputTypeEnum = InputTypeEnum;
  sizeEnum = SizeEnum;

  // Quantity state
  quantity = 1;

  /* ---------------------------- Lifecycle ---------------------------- */

  ngOnInit(): void {
    // Initialize quantity from incoming data if present
    const incomingQty = this.roba?.kolicina ?? 0;
    if (incomingQty > 0) {
      this.quantity = this.clampQuantity(incomingQty);
    }
  }

  /* ----------------------------- Actions ----------------------------- */

  handleClick(): void {
    if (this.roba?.robaid != null) {
      this.onClick.emit(this.roba.robaid);
    }
  }

  handleAddToCart(): void {
    if (this.roba && this.quantity > 0) {
      this.addToCart.emit({ roba: this.roba, quantity: this.quantity });
    }
  }

  modifyQuantity(value: number): void {
    this.quantity = this.clampQuantity(value);
  }

  private clampQuantity(value: number): number {
    const min = 1;
    const max = this.roba?.stanje ?? 1;
    if (!Number.isFinite(value)) return min;
    if (value < min) return min;
    if (value > max) return max;
    return Math.floor(value); // ensure integer
  }

  /* ----------------------- Derived business flags -------------------- */

  // TecDoc-only article recognition (by business rule)
  get isTecDocOnly(): boolean {
    return this.roba?.podGrupa === 1000000;
  }

  // Is in cart indicator
  get isInCart(): boolean {
    return !!this.roba?.uKorpi;
  }

  // Stock logic
  get isOutOfStock(): boolean {
    // TecDoc-only is not treated as "out of stock" for the CTA visibility
    if (this.isTecDocOnly) return false;
    const stanje = this.roba?.stanje ?? 0;
    return stanje <= 0;
  }

  get stockLabel(): string {
    if (this.isTecDocOnly) return 'TecDoc artikal';
    const stanje = this.roba?.stanje ?? 0;
    if (stanje >= 5) return 'Na stanju';
    if (stanje > 0) return 'Ograničene količine';
    return 'Nema na stanju';
  }

  /* ---------------------------- Pricing ------------------------------ */

  get hasDiscount(): boolean {
    // Treat 0 or undefined as no discount; require valid price > 0
    const rabat = this.roba?.rabat ?? 0;
    const cena = this.roba?.cena ?? 0;
    return rabat > 0 && cena > 0 && rabat < 100;
  }

  get oldPrice(): number | null {
    if (!this.hasDiscount) return null;
    const cena = this.roba!.cena!;
    const rabat = this.roba!.rabat!;
    const denom = 1 - rabat / 100;
    if (denom <= 0) return null; // safety for 100% or invalid
    const val = cena / denom;
    return Math.round(val * 100) / 100;
  }

  get savings(): number | null {
    if (!this.hasDiscount || !this.oldPrice) return null;
    const s = this.oldPrice - (this.roba?.cena ?? 0);
    return s > 0 ? Math.round(s * 100) / 100 : null;
  }

  /* ------------------------- Unit price (L) -------------------------- */

  // Parse liters from item name (e.g., "5L", "1 L", "0.5 lit")
  private parseVolumeLiters(naziv?: string): number | null {
    if (!naziv) return null;
    const match = naziv.match(/(\d+(?:[.,]\d+)?)\s*(l|lit|litar|litara)/i);
    if (!match) return null;
    const val = parseFloat(match[1].replace(',', '.'));
    return Number.isFinite(val) ? val : null;
  }

  get unitPrice(): number | null {
    const liters = this.parseVolumeLiters(this.roba?.naziv);
    const cena = this.roba?.cena ?? 0;
    if (!liters || liters <= 0 || cena <= 0) return null;
    return Math.round((cena / liters) * 100) / 100;
  }

  /* ------------------------- Compatibility --------------------------- */

  // Works for Map<string, RobaAplikacija[]> or plain object
  get compatibilityCount(): number | null {
    const apps = this.roba?.aplikacije as unknown;
    if (!apps) return null;

    let total = 0;

    if (apps instanceof Map) {
      (apps as Map<string, any[]>).forEach(arr => (total += (arr?.length || 0)));
    } else if (typeof apps === 'object') {
      const values = Object.values(apps as Record<string, any[]>);
      for (const arr of values) total += (arr?.length || 0);
    }

    return total > 0 ? total : null;
  }
}