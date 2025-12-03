import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Input, Output, EventEmitter, ViewEncapsulation, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

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

// Services
import { CartStateService } from '../../service/state/cart-state.service';
import { SnackbarService } from '../../service/utils/snackbar.service';
import { StringUtils } from '../../utils/string-utils';
import { PictureService, ProductImageMeta } from '../../service/utils/picture.service';

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
    RsdCurrencyPipe,
    RouterModule
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

  constructor(
    private cartStateService: CartStateService,
    private snackbarService: SnackbarService,
    private router: Router,
    private pictureService: PictureService
  ) { }

  /* ---------------------------- Lifecycle ---------------------------- */

  ngOnInit(): void {
    // Initialize quantity from incoming data if present
    const incomingQty = this.roba?.kolicina ?? 0;
    if (incomingQty > 0) {
      this.quantity = this.clampQuantity(incomingQty);
    }
  }

  /* ----------------------------- Actions ----------------------------- */

  handleClick(event?: MouseEvent): void {
    if (event?.defaultPrevented) {
      return;
    }

    event?.preventDefault();
    event?.stopPropagation();

    const targetParam = this.getRouteParam(this.roba);
    if (!targetParam) {
      return;
    }

    this.router.navigate(['/webshop', targetParam]);
  }

  handleAddToCart(event?: Event): void {
    event?.stopPropagation();
    if (this.roba && this.quantity > 0) {
      if (!this.hasValidPrice || this.isOutOfStock) {
        this.snackbarService.showError('Artikal trenutno nije dostupan za poručivanje');
        return;
      }
      this.cartStateService.addToCart(this.roba, this.quantity);
      this.snackbarService.showSuccess('Artikal je dodat u korpu');
    }
  }

  modifyQuantity(value: number): void {
    this.quantity = this.clampQuantity(value);
  }

  private get hasValidPrice(): boolean {
    return this.getPriceValue() > 0;
  }

  get availableStock(): number {
    return this.hasValidPrice ? this.roba?.stanje ?? 0 : 0;
  }

  private clampQuantity(value: number): number {
    const min = 1;
    const max = this.availableStock || 1;
    if (!Number.isFinite(value)) return min;
    if (value < min) return min;
    if (value > max) return max;
    return Math.floor(value); // ensure integer
  }

  private parseNumber(raw: unknown): number {
    if (typeof raw === 'number') {
      return Number.isFinite(raw) ? raw : 0;
    }

    if (typeof raw === 'string') {
      const normalized = raw
        .replace('%', '')
        .replace(/\s+/g, '')
        .replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private getDiscountValue(): number {
    return this.parseNumber((this.roba as any)?.rabat);
  }

  private getPriceValue(): number {
    return this.parseNumber(this.roba?.cena);
  }

  /* ----------------------- Derived business flags -------------------- */

  // TecDoc-only article recognition (by business rule)
  get isTecDocOnly(): boolean {
    return this.roba?.robaid == null || this.roba?.podGrupa === 1000000;
  }

  // Is in cart indicator
  get isInCart(): boolean {
    const id = this.roba?.robaid;
    return id != null && this.cartStateService.isInCart(id);

  }

  // Stock logic
  get isOutOfStock(): boolean {
    // TecDoc-only is not treated as "out of stock" for the CTA visibility
    if (this.isTecDocOnly) return false;
    return !this.hasValidPrice || this.availableStock <= 0;
  }

  get stockLabel(): string {
    if (this.isTecDocOnly) return 'TecDoc artikal';
    if (!this.hasValidPrice) return 'Nema na stanju';
    const stanje = this.availableStock;
    if (stanje >= 5) return 'Na stanju';
    if (stanje > 0) return 'Ograničene količine';
    return 'Nema na stanju';
  }

  /* ---------------------------- Pricing ------------------------------ */

  get hasDiscount(): boolean {
    const rabat = this.getDiscountValue();
    const cena = this.getPriceValue();
    return rabat > 0 && cena > 0 && rabat < 100;
  }

  get oldPrice(): number | null {
    if (!this.hasDiscount) {
      return null;
    }

    const rabat = this.getDiscountValue();
    const cena = this.getPriceValue();
    const denom = 1 - rabat / 100;
    if (denom <= 0) {
      return null;
    }

    const val = cena / denom;
    return Math.round(val * 100) / 100;
  }

  get savings(): number | null {
    if (!this.hasDiscount) {
      return null;
    }

    const oldPrice = this.oldPrice;
    if (!oldPrice) {
      return null;
    }

    const cena = this.getPriceValue();
    const savings = oldPrice - cena;
    return savings > 0 ? Math.round(savings * 100) / 100 : null;
  }

  get discountLabel(): string {
    const raw = (this.roba as any)?.rabat;
    if (raw === null || raw === undefined) {
      return '';
    }

    if (typeof raw === 'number') {
      return String(raw);
    }

    return String(raw).trim();
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

  getProductSlug(data: any): string {
    return StringUtils.productSlug(data?.proizvodjac?.naziv, data?.naziv, data?.katbr);
  }

  getRouteParam(data: any): string | null {
    const id = data?.robaid;
    if (id == null) {
      return null;
    }
    const slug = this.getProductSlug(data);
    return slug ? `${id}-${slug}` : String(id);
  }

  get productImageMeta(): ProductImageMeta {
    return this.pictureService.buildProductImageMeta(this.roba);
  }

  getProductImageSrc(): string {
    return this.productImageMeta.src;
  }

  getProductImageAlt(): string {
    return this.productImageMeta.alt;
  }

  getProductImageTitle(): string {
    return this.productImageMeta.title;
  }
}
