import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Input, Output, EventEmitter, ViewEncapsulation, OnChanges, OnInit, SimpleChanges } from '@angular/core';
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
import { AccountStateService } from '../../service/state/account-state.service';
import { CartStateService } from '../../service/state/cart-state.service';
import { SnackbarService } from '../../service/utils/snackbar.service';
import { StringUtils } from '../../utils/string-utils';
import { PictureService, ProductImageMeta } from '../../service/utils/picture.service';
import {
  AvailabilityVm,
  buildAvailabilityVm
} from '../../utils/availability-utils';

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
export class AutomProductCardComponent implements OnInit, OnChanges {
  @Input() roba!: Roba;
  @Output() onClick = new EventEmitter<number>();
  @Output() addToCart = new EventEmitter<{ roba: Roba; quantity: number }>();

  // UI enums
  iconEnum = IconsEnum;
  colorEnum = ColorEnum;
  inputTypeEnum = InputTypeEnum;
  sizeEnum = SizeEnum;

  isAdmin = false;
  isEmployee = false;

  // Quantity state
  quantity = 1;

  constructor(
    private accountStateService: AccountStateService,
    private cartStateService: CartStateService,
    private snackbarService: SnackbarService,
    private router: Router,
    private pictureService: PictureService
  ) { }

  /* ---------------------------- Lifecycle ---------------------------- */

  ngOnInit(): void {
    this.isAdmin = this.accountStateService.isAdmin();
    this.isEmployee = this.accountStateService.isEmployee();

    // Initialize quantity from incoming data if present
    const incomingQty = this.roba?.kolicina ?? 0;
    if (incomingQty > 0) {
      this.quantity = this.clampQuantity(incomingQty);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['roba']) {
      const incomingQty = this.roba?.kolicina ?? 0;
      if (incomingQty > 0) {
        this.quantity = this.clampQuantity(incomingQty);
      } else {
        this.quantity = 1;
      }
    }
  }

  /* ----------------------------- Actions ----------------------------- */

  handleClick(event?: MouseEvent): void {
    if (event?.defaultPrevented) {
      return;
    }

    event?.preventDefault();
    event?.stopPropagation();

    if (!this.canNavigateToDetails) {
      return;
    }

    const targetParam = this.getRouteParam(this.roba);
    if (!targetParam) {
      return;
    }

    this.router.navigate(['/webshop', targetParam]);
  }

  handleAddToCart(event?: Event): void {
    event?.stopPropagation();
    if (!this.canAddToCart) {
      return;
    }
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
    return this.availabilityVm.hasValidPrice;
  }

  get availableStock(): number {
    return this.availabilityVm.purchasableStock;
  }

  private clampQuantity(value: number): number {
    const min = this.quantityMin;
    const step = this.quantityStep;
    const max = this.availableStock || min;
    if (!Number.isFinite(value)) return min;
    if (value < min) return min;
    if (value > max) return max;
    const floored = Math.floor(value);
    if (step <= 1) return floored;
    const snapped = Math.ceil(floored / step) * step;
    if (snapped > max) return max;
    return snapped >= min ? snapped : min;
  }

  private get isProviderItem(): boolean {
    return (
      this.availabilityVm.status === 'AVAILABLE' && !!this.roba?.providerAvailability?.available
    );
  }

  get quantityStep(): number {
    if (!this.isProviderItem) {
      return 1;
    }
    const unit = Number(this.roba?.providerAvailability?.packagingUnit);
    return Number.isFinite(unit) && unit > 1 ? Math.floor(unit) : 1;
  }

  get quantityMin(): number {
    return this.quantityStep;
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

  get isExternalOnly(): boolean {
    return this.roba?.robaid == null && !!this.roba?.providerAvailability?.available;
  }

  // TecDoc-only article recognition (by business rule)
  get isTecDocOnly(): boolean {
    // Backend no longer guarantees magic `podGrupa===1000000` markers.
    // Treat items without internal ID and without provider availability as "TecDoc-only" (not purchasable).
    return this.roba?.robaid == null && !this.roba?.providerAvailability?.available;
  }

  get canNavigateToDetails(): boolean {
    return this.roba?.robaid != null || this.roba?.tecDocArticleId != null;
  }

  get cartKey(): string | null {
    return this.roba?.cartKey ?? this.cartStateService.getItemKey(this.roba);
  }

  get canAddToCart(): boolean {
    return !this.isTecDocOnly && !!this.cartKey;
  }

  // Is in cart indicator
  get isInCart(): boolean {
    const key = this.cartKey;
    return key ? this.cartStateService.isInCartKey(key) : false;

  }

  // Stock logic
  get isOutOfStock(): boolean {
    // TecDoc-only is not treated as "out of stock" for the CTA visibility
    if (this.isTecDocOnly) return false;
    return !this.hasValidPrice || this.availableStock <= 0;
  }

  get showDiscount(): boolean {
    return this.availabilityVm.showDiscount;
  }

  /* ---------------------------- Pricing ------------------------------ */

  get hasDiscount(): boolean {
    const rabat = this.getDiscountValue();
    const cena = this.getPriceValue();
    return rabat > 0 && cena > 0 && rabat < 100;
  }

  get oldPrice(): number | null {
    if (!this.availabilityVm.showDiscount) {
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
    if (!this.availabilityVm.showDiscount) {
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

  get availabilityVm(): AvailabilityVm {
    return buildAvailabilityVm(this.roba, {
      isTecDocOnly: this.isTecDocOnly,
      isAdmin: this.isAdmin,
      isStaff: this.isAdmin || this.isEmployee,
    });
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
    const slug = this.getProductSlug(data);
    const robaId = data?.robaid;
    if (robaId != null) {
      return slug ? `${robaId}-${slug}` : String(robaId);
    }

    const tecDocArticleId = data?.tecDocArticleId;
    if (tecDocArticleId != null) {
      const token = `td${tecDocArticleId}`;
      return slug ? `${token}-${slug}` : token;
    }

    return null;
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
