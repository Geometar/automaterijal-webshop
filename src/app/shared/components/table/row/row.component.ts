import { Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { take } from 'rxjs';

// Component imports
import { AutomIconComponent } from '../../autom-icon/autom-icon.component';
import { ButtonComponent } from '../../button/button.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputFieldsComponent } from '../../input-fields/input-fields.component';
import { MetaPillComponent } from '../../meta-pill/meta-pill.component';
import { InquiryDialogComponent } from '../../inquiry-dialog/inquiry-dialog.component';
import { ProviderAvailabilityComponent } from '../../provider-availability/provider-availability.component';

// Data models
import { Roba } from '../../../data-models/model/roba';

// Enums
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  InputTypeEnum,
  SizeEnum,
  WebshopPrimaryFilter
} from '../../../data-models/enums';

// Pipes
import { RsdCurrencyPipe } from '../../../pipe/rsd-currency.pipe';

// Services
import { AccountStateService } from '../../../service/state/account-state.service';
import { CartStateService } from '../../../service/state/cart-state.service';
import { PictureService, ProductImageMeta } from '../../../service/utils/picture.service';
import { SnackbarService } from '../../../service/utils/snackbar.service';
import { StringUtils } from '../../../utils/string-utils';
import { UrlHelperService } from '../../../service/utils/url-helper.service';
import { SzakalStockCheckResult, SzakalStockService } from '../../../service/szakal-stock.service';
import {
  AvailabilityTone,
  AvailabilityVm,
  buildAvailabilityVm,
  clampCombinedWarehouseQuantity,
  EXTERNAL_WAREHOUSE_LABEL,
  resolveCombinedAvailabilityLabel,
  resolveCombinedAvailabilityTone,
  resolveMinOrderQuantity,
  resolvePackagingUnit,
  splitCombinedWarehouseQuantity,
  shouldForceCombinedProviderAvailabilityBox,
} from '../../../utils/availability-utils';

@Component({
  selector: 'row',
  standalone: true,
  imports: [
    AutomIconComponent,
    ButtonComponent,
    CommonModule,
    FormsModule,
    InputFieldsComponent,
    MetaPillComponent,
    InquiryDialogComponent,
    ProviderAvailabilityComponent,
    ReactiveFormsModule,
    RouterModule,
    RsdCurrencyPipe,
  ],
  providers: [CurrencyPipe],
  templateUrl: './row.component.html',
  styleUrl: './row.component.scss',
})
export class RowComponent implements OnInit, OnChanges {
  @Input() data!: Roba;
  @Input() showAddToBasket = false;
  @Input() showCloseBtn = false;
  @Input() showPriceOnly = false;
  @Input() disableCategoryNavigation = false;
  @Output() removeEvent = new EventEmitter<string>();

  quantity: number = 1;

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  sizeEnum = SizeEnum;

  // Data
  displayedLinkageCriteria: any[] = [];
  displayedTehnickiOpis: any[] = [];
  displayedSpecs: any[] = [];
  zoomedImageUrl: string | null = null;
  readonly categorySuffix = '›';

  // Misc
  inquiryContact = '';
  inquiryPopupOpen = false;
  inquirySent = false;
  hasMoreThanFiveSpecs = false;
  isEmployee = false;
  isAdmin = false;
  loggedIn = false;
  showAllSpecs = false;
  categoryHref: string | null = null;
  categoryLinkSegments: string[] | null = null;
  externalWarehouseLabel = EXTERNAL_WAREHOUSE_LABEL;

  stringUtils = StringUtils;

  get specTableId(): string {
    const idPart =
      this.data?.robaid != null
        ? String(this.data.robaid)
        : `${this.data?.proizvodjac?.proid ?? 'ext'}-${this.data?.katbr ?? 'row'}`;
    return `spec-${this.sanitizeDomId(idPart)}`;
  }

  get nameWithoutManufacturer(): string {
    const manufacturer = this.data.proizvodjac?.naziv?.trim();
    const name = this.data.naziv?.trim();

    if (!manufacturer || !name) return name ?? '';

    const regex = new RegExp(`^${manufacturer}\\s+`, 'i'); // starts with manufacturer + space
    return name.replace(regex, '');
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape() {
    this.zoomedImageUrl = null;
    this.inquiryPopupOpen = false;
  }

  constructor(
    private cartStateService: CartStateService,
    private snackbarService: SnackbarService,
    private accountStateService: AccountStateService,
    private pictureService: PictureService,
    private szakalStockService: SzakalStockService,
    private urlHelperService: UrlHelperService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.computeCategoryLink();
      this.quantity = this.clampQuantity(this.data?.kolicina ?? this.quantity);
      this.inquirySent = false;
      this.prefillInquiryFields();
    }
  }

  ngOnInit() {
    this.isEmployee = this.accountStateService.isEmployee();
    this.isAdmin = this.accountStateService.isAdmin();
    this.loggedIn = this.accountStateService.isUserLoggedIn();
    this.quantity = this.clampQuantity(this.data.kolicina ?? this.quantity);
    this.updateDisplayedSpecs();
    this.computeCategoryLink();
    this.prefillInquiryFields();
  }

  updateDisplayedSpecs() {
    const linkage = this.data.tdLinkageCriteria ?? [];
    const tehnickiOpis = this.data.tehnickiOpis ?? [];

    this.displayedLinkageCriteria = linkage;

    const totalSpecs = linkage.length + tehnickiOpis.length;
    this.hasMoreThanFiveSpecs = totalSpecs > 5;

    if (!this.hasMoreThanFiveSpecs) {
      this.showAllSpecs = false;
    }

    if (this.showAllSpecs || !this.hasMoreThanFiveSpecs) {
      this.displayedTehnickiOpis = tehnickiOpis;
    } else {
      const remainingSlots = Math.max(0, 5 - linkage.length);
      this.displayedTehnickiOpis = tehnickiOpis.slice(0, remainingSlots);
    }

    this.displayedSpecs = [...this.displayedLinkageCriteria, ...this.displayedTehnickiOpis];
  }

  toggleSpecifications() {
    this.showAllSpecs = !this.showAllSpecs;
    this.updateDisplayedSpecs();
  }

  modifyQuantity(quantity: number): void {
    if (this.isUnavailable) {
      this.quantity = this.quantityMin;
      return;
    }

    const next = this.clampQuantity(quantity);
    if (this.quantity === next) {
      return;
    }

    this.quantity = next;
    const key = this.cartKey;
    if (key) {
      this.cartStateService.updateQuantityByKey(key, this.quantity);
    }
  }

  addToShoppingCart(data: Roba): void {
    if (this.requiresLoginForOrder) {
      this.snackbarService.showError('Za ovaj artikal je potrebna prijava');
      return;
    }
    const allowWithoutPrice = this.isSzakalUnverified;
    if (!this.canAddToCart || this.isUnavailable || (!this.availabilityVm.hasValidPrice && !allowWithoutPrice)) {
      this.snackbarService.showError('Artikal trenutno nije dostupan za poručivanje');
      return;
    }

    const providerKey = (data?.providerAvailability?.provider || '').toString().trim().toLowerCase();
    if (providerKey === 'szakal') {
      const token = data?.providerAvailability?.providerStockToken;
      const glid = data?.providerAvailability?.providerProductId;
      if (token || glid) {
        this.szakalStockService
          .check([{
            token,
            glid,
            quantity: this.quantity,
            brand: data?.proizvodjac?.proid,
            group: data?.grupa,
          }])
          .pipe(take(1))
          .subscribe({
            next: (results) => {
              const result = Array.isArray(results) ? results[0] : null;
              if (!this.isSzakalResultAvailable(result, this.quantity)) {
                const availableQty = Number(result?.availableQuantity) || 0;
                const message = availableQty > 0
                  ? `Trenutno dostupno: ${availableQty}`
                  : 'Artikal trenutno nije dostupan za poručivanje';
                this.snackbarService.showError(message);
                return;
              }
              this.applySzakalRealtime(data, result);
              this.cartStateService.addToCart(data, this.quantity);
              this.snackbarService.showSuccess('Artikal je dodat u korpu');
            },
            error: () => {
              this.snackbarService.showError('Provera dostupnosti nije uspela, pokušajte ponovo');
            },
          });
        return;
      }
    }

    this.cartStateService.addToCart(data, this.quantity);
    this.snackbarService.showSuccess('Artikal je dodat u korpu');
  }

  private isSzakalResultAvailable(result: SzakalStockCheckResult | null, requested: number): boolean {
    if (!result || !result.available) {
      return false;
    }
    const qty = Number(result.availableQuantity) || 0;
    const req = Number(requested) || 1;
    return qty >= req;
  }

  private applySzakalRealtime(data: Roba, result: SzakalStockCheckResult | null): void {
    if (!data?.providerAvailability || !result) {
      return;
    }
    data.providerAvailability.realtimeChecked = true;
    data.providerAvailability.realtimeCheckedAt = new Date().toISOString();
    data.providerAvailability.realtimeChecking = false;
    if (typeof result.available === 'boolean') {
      data.providerAvailability.available = result.available;
    }
    if (result.availableQuantity != null) {
      data.providerAvailability.totalQuantity = result.availableQuantity;
      data.providerAvailability.warehouseQuantity = result.availableQuantity;
    }
    if (result.orderQuantum != null && result.orderQuantum > 0) {
      data.providerAvailability.packagingUnit = result.orderQuantum;
    }
    if (result.moq != null && result.moq > 0) {
      data.providerAvailability.minOrderQuantity = result.moq;
    }
    if (result.noReturnable != null) {
      data.providerAvailability.providerNoReturnable = result.noReturnable;
    }
    if (result.stockToken) {
      data.providerAvailability.providerStockToken = result.stockToken;
    }
    if (result.purchasePrice != null) {
      data.providerAvailability.purchasePrice = result.purchasePrice;
    }
    if (result.customerPrice != null) {
      data.providerAvailability.price = result.customerPrice;
      data.cena = result.customerPrice;
    }
    if (result.currency) {
      data.providerAvailability.currency = result.currency;
    }
    if (result.expectedDelivery) {
      data.providerAvailability.expectedDelivery = result.expectedDelivery;
    }
    if (result.coreCharge != null) {
      data.providerAvailability.coreCharge = result.coreCharge;
    }
  }

  isInCart(robaId: number): boolean {
    return this.cartStateService.isInCart(robaId);
  }

  get isInCartItem(): boolean {
    const key = this.cartKey;
    if (key) {
      return this.cartStateService.isInCartKey(key);
    }
    const id = this.data?.robaid;
    return id != null ? this.cartStateService.isInCart(id) : false;
  }

  get requiresLoginForOrder(): boolean {
    if (this.loggedIn) return false;
    const provider = this.data?.providerAvailability;
    if (!provider?.available) return false;
    return !!provider?.providerNoReturnable || (Number(provider?.coreCharge) || 0) > 0;
  }

  openImageZoom(url: string) {
    this.zoomedImageUrl = url;
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
    return this.pictureService.buildProductImageMeta(this.data);
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

  get categoryLabel(): string | null {
    const groupName = this.data?.grupaNaziv?.trim();
    const subName = this.data?.podGrupaNaziv?.trim();
    return subName || groupName || null;
  }

  get categoryAriaLabel(): string | null {
    const groupName = this.data?.grupaNaziv?.trim();
    const subName = this.data?.podGrupaNaziv?.trim();

    if (!groupName && !subName) {
      return null;
    }

    if (groupName && subName) {
      return `Prikaži kategoriju ${groupName} / ${subName}`;
    }

    return `Prikaži kategoriju ${groupName ?? subName}`;
  }

  get effectiveStock(): number {
    return this.availabilityVm.purchasableStock;
  }

  get isAdminCartView(): boolean {
    return this.isAdmin && this.showPriceOnly;
  }

  get isStaff(): boolean {
    return this.isAdmin || this.isEmployee;
  }

  get unitPrice(): number {
    if (!this.isAdminCartView) {
      return this.availabilityVm.displayPrice || 0;
    }

    const purchase = Number(this.data?.providerAvailability?.purchasePrice);
    if (Number.isFinite(purchase) && purchase > 0) {
      return purchase;
    }

    const fallback = Number(this.data?.cena);
    return Number.isFinite(fallback) ? fallback : 0;
  }

  get totalPrice(): number {
    return this.unitPrice * (this.data?.kolicina || 0);
  }

  get warehouseLabel(): string | null {
    if (!this.isAdminCartView) {
      return null;
    }

    const warehouse = (this.data?.providerAvailability?.warehouseName || '').trim();
    return warehouse || 'Automaterijal Magacin';
  }

  private get isProviderItem(): boolean {
    return (
      this.availabilityVm.status === 'AVAILABLE' && !!this.data?.providerAvailability?.available
    );
  }

  get quantityStep(): number {
    if (!this.isProviderItem) {
      return 1;
    }
    return resolvePackagingUnit(this.data?.providerAvailability);
  }

  get selectedTotalPrice(): number {
    return this.unitPrice * (this.quantity || 0);
  }

  get quantityMin(): number {
    if (!this.isProviderItem) {
      return 1;
    }
    return resolveMinOrderQuantity(this.data?.providerAvailability);
  }

  get cartKey(): string | null {
    return this.data?.cartKey ?? this.cartStateService.getItemKey(this.data);
  }

  get isExternalOnly(): boolean {
    return this.data?.robaid == null && !!this.data?.providerAvailability?.available;
  }

  get isTecDocOnly(): boolean {
    // Backend no longer guarantees magic `podGrupa===1000000` markers.
    // Treat items without internal ID and without provider availability as "TecDoc-only" (not purchasable).
    return this.data?.robaid == null && !this.data?.providerAvailability?.available;
  }

  get canAddToCart(): boolean {
    return !this.isTecDocOnly && !!this.cartKey;
  }

  get canNavigateToDetails(): boolean {
    return this.data?.robaid != null || this.data?.tecDocArticleId != null;
  }

  get isUnavailable(): boolean {
    return !this.isTecDocOnly && this.effectiveStock <= 0;
  }

  get shouldShowInquiry(): boolean {
    return this.isUnavailable || this.isTecDocOnly;
  }

  openInquiryPopup(): void {
    this.inquiryPopupOpen = true;
  }

  closeInquiryPopup(): void {
    this.inquiryPopupOpen = false;
  }
  private prefillInquiryFields(): void {
    const account = this.accountStateService.get();
    if (!this.inquiryContact && account?.email) {
      this.inquiryContact = account.email;
    }
  }
  private computeCategoryLink(): void {
    const groupName = this.data?.grupaNaziv?.trim();
    const subName = this.data?.podGrupaNaziv?.trim();

    if (!groupName || this.disableCategoryNavigation) {
      this.categoryHref = null;
      this.categoryLinkSegments = null;
      return;
    }

    const segments = ['/webshop', 'category', StringUtils.slugify(groupName)];

    if (subName) {
      segments.push(StringUtils.slugify(subName));
    }

    this.categoryLinkSegments = segments;
    this.categoryHref = segments.join('/');
  }

  onCategoryClick(event: MouseEvent): void {
    if (!this.disableCategoryNavigation) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const subGroupId = this.data?.podGrupa;
    if (subGroupId === null || subGroupId === undefined) {
      return;
    }

    this.urlHelperService.addOrUpdateQueryParams({
      podgrupe: [subGroupId],
      filterBy: WebshopPrimaryFilter.Subcategory,
    });
  }

  private clampQuantity(value: number): number {
    const min = this.quantityMin;
    const step = this.quantityStep;
    if (!Number.isFinite(value)) return min;
    const max = this.effectiveStock || min;
    const localQty = Math.max(0, Number(this.availabilityVm.provider.warehouseSplit.sabacQuantity) || 0);
    const isCombined = this.availabilityVm.provider.warehouseSplit.enabled;
    if (isCombined) {
      return clampCombinedWarehouseQuantity({
        requestedQty: value,
        maxStock: max,
        localQty,
        provider: this.data?.providerAvailability,
        minQuantity: min,
      });
    }

    if (value < min) return min;
    if (value > max) return max;
    const floored = Math.floor(value);
    if (step <= 1) return floored;
    const snapped = Math.ceil(floored / step) * step;
    if (snapped > max) return max;
    return snapped >= min ? snapped : min;
  }

  get availabilityVm(): AvailabilityVm {
    return buildAvailabilityVm(this.data, {
      isAdmin: this.isAdmin,
      isTecDocOnly: this.isTecDocOnly,
      isStaff: this.isStaff,
    });
  }

  private get localWarehouseQuantity(): number {
    return Math.max(
      0,
      Number(this.availabilityVm.provider.warehouseSplit.sabacQuantity) || 0
    );
  }

  get currentAvailabilityTone(): AvailabilityTone {
    return resolveCombinedAvailabilityTone({
      combinedEnabled: this.availabilityVm.provider.warehouseSplit.enabled,
      requestedQty: this.quantity,
      localQty: this.localWarehouseQuantity,
      isOutOfStock: this.isUnavailable,
      defaultTone: this.availabilityVm.tone,
    });
  }

  get currentAvailabilityLabel(): string {
    return resolveCombinedAvailabilityLabel({
      combinedEnabled: this.availabilityVm.provider.warehouseSplit.enabled,
      tone: this.currentAvailabilityTone,
      defaultLabel: this.availabilityVm.label,
    });
  }

  get shouldForceProviderAvailabilityBox(): boolean {
    return shouldForceCombinedProviderAvailabilityBox({
      combinedEnabled: this.availabilityVm.provider.warehouseSplit.enabled,
      hasProviderDeliveryLabel: !!this.availabilityVm.provider.deliveryLabel,
      tone: this.currentAvailabilityTone,
    });
  }

  get mixedLocalSelectionQuantity(): number {
    const requested = Math.max(1, Number(this.quantity) || 1);
    return splitCombinedWarehouseQuantity(
      requested,
      this.localWarehouseQuantity,
      this.data?.providerAvailability
    ).localQuantity;
  }

  get mixedExternalSelectionQuantity(): number {
    const requested = Math.max(1, Number(this.quantity) || 1);
    return splitCombinedWarehouseQuantity(
      requested,
      this.localWarehouseQuantity,
      this.data?.providerAvailability
    ).externalQuantity;
  }

  get showMixedWarehouseSplitHint(): boolean {
    if (!this.availabilityVm.provider.warehouseSplit.enabled) {
      return false;
    }
    const requested = Math.max(1, Number(this.quantity) || 1);
    return splitCombinedWarehouseQuantity(
      requested,
      this.localWarehouseQuantity,
      this.data?.providerAvailability
    ).hasMixed;
  }

  get mixedWarehouseExternalLabel(): string {
    return 'Magacin Beograd';
  }

  private get isSzakalUnverified(): boolean {
    const providerKey = (this.data?.providerAvailability?.provider || '').toString().trim().toLowerCase();
    return providerKey === 'szakal' && !this.availabilityVm.priceVerified;
  }

  get showRealtimeCheckingHint(): boolean {
    const provider = this.data?.providerAvailability;
    const providerKey = (provider?.provider || '').toString().trim().toLowerCase();
    return providerKey === 'szakal' && !!provider?.realtimeChecking;
  }

  private sanitizeDomId(value: string): string {
    return String(value)
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9\-_:.]/g, '-');
  }
}
