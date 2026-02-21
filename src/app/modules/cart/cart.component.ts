import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RadioOption, SelectModel } from '../../shared/data-models/interface';
import { Router, RouterLink } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';

// Autom imports
import { AutomIconComponent } from '../../shared/components/autom-icon/autom-icon.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { InputFieldsComponent } from '../../shared/components/input-fields/input-fields.component';
import { MetaPillComponent } from '../../shared/components/meta-pill/meta-pill.component';
import { RadioButtonComponent } from '../../shared/components/radio-button/radio-button.component';
import { RowComponent } from '../../shared/components/table/row/row.component';
import { SelectComponent } from '../../shared/components/select/select.component';
import { TextAreaComponent } from '../../shared/components/text-area/text-area.component';

// Constants
import { EMAIL_ADDRESS } from '../../shared/data-models/constants/input.constants';

// Data models
import {
  Account,
  Cart,
  Invoice,
  InvoiceItem,
  ProviderOrderOption,
  ValueHelp,
} from '../../shared/data-models/model';
import { Roba } from '../../shared/data-models/model/roba';

// Enums
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  InputTypeEnum,
  OrientationEnum,
} from '../../shared/data-models/enums';

// Pipes
import { RsdCurrencyPipe } from '../../shared/pipe/rsd-currency.pipe';

// Service
import { AccountStateService } from '../../shared/service/state/account-state.service';
import { AnalyticsService } from '../../shared/service/analytics.service';
import { CartService } from '../../shared/service/cart.service';
import { CartStateService } from '../../shared/service/state/cart-state.service';
import { InvoiceService } from '../../shared/service/invoice.service';
import { PictureService } from '../../shared/service/utils/picture.service';
import { SeoService } from '../../shared/service/seo.service';
import { SnackbarPosition, SnackbarService } from '../../shared/service/utils/snackbar.service';
import {
  applySzakalRealtimeAvailability,
  formatDeliveryEstimate,
  formatDispatchCutoff,
  getAvailabilityStatus,
  isFebiProvider,
  isSzakalStockResultAvailable,
  requiresExternalWarehouseForFlow,
  splitWarehouseQuantityForFlow,
} from '../../shared/utils/availability-utils';
import { Slika } from '../../shared/data-models/model/slika';
import { SzakalStockService, SzakalStockCheckItem, SzakalStockCheckResult } from '../../shared/service/szakal-stock.service';

interface CheckoutConflictItemPayload {
  catalogNumber?: string;
  articleName?: string;
  requestedQuantity?: number;
  maxOrderableQuantity?: number;
  message?: string;
}

interface CheckoutConflictDetailsPayload {
  code?: string;
  items?: CheckoutConflictItemPayload[];
}


@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    AutomIconComponent,
    ButtonComponent,
    CommonModule,
    FormsModule,
    InputFieldsComponent,
    MetaPillComponent,
    RadioButtonComponent,
    ReactiveFormsModule,
    RouterLink,
    RowComponent,
    RsdCurrencyPipe,
    SelectComponent,
    TextAreaComponent,
  ],
  providers: [CurrencyPipe],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CartComponent implements OnInit, OnDestroy {
  // Data
  roba: Roba[] = [];

  // Data
  basket?: Cart;
  invoice?: Invoice;

  // Forms
  cartForm: UntypedFormGroup;
  userForm: UntypedFormGroup;

  // Enum
  buttonThemes = ButtonThemes;
  buttonTypes = ButtonTypes;
  colorEnum = ColorEnum;
  iconsEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  orientation = OrientationEnum;

  readonly febiProviderKey = 'febi-stock';
  readonly febiDeliveryPartyDefault = '0001001983';
  readonly febiDeliveryPartyPickup = '0001003023';

  // Misc
  account?: Account;
  bezPdv: number = 0;
  invoiceSubmitted = false;
  isAdmin = false;
  loggedIn = false;
  pdv: number = 0;
  total: number = 0;

  // Select config
  febiDeliveryOptions: RadioOption[] = [];
  payingChoices: SelectModel[] = [];
  transportChoices: SelectModel[] = [];

  // Validator patterns
  emailAddressPattern = EMAIL_ADDRESS;

  private destroy$ = new Subject<void>();
  private hasTrackedCartView = false;
  private submitRequestKey: string | null = null;

  constructor(
    private accountStateService: AccountStateService,
    private cartService: CartService,
    private cartStateService: CartStateService,
    private fb: UntypedFormBuilder,
    private invoiceService: InvoiceService,
    private szakalStockService: SzakalStockService,
    private router: Router,
    private pictureService: PictureService,
    private snackbarService: SnackbarService,
    private seo: SeoService,
    private analytics: AnalyticsService
  ) {
    this.cartForm = this.fb.group({
      address: ['', Validators.required],
      comment: [''],
      febiDeliveryParty: [this.febiDeliveryPartyDefault],
      payment: ['', Validators.required],
      transport: ['', Validators.required],
      vin: [''],
    });
    this.userForm = this.fb.group({
      city: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      name: ['', Validators.required],
      phone: ['', Validators.required],
      postalcode: ['', Validators.required],
      street: ['', Validators.required],
      surname: ['', Validators.required],
      pib: [''],
      vin: [''],
      comment: [''],
    });
  }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    this.account = this.accountStateService.get();
    this.loggedIn = this.accountStateService.isUserLoggedIn();
    this.isAdmin = this.accountStateService.isAdmin();
    this.buildFebiDeliveryOptions();
    this.getInformation();
    this.syncOnCartItemSize();
    this.setUpdateSeoTags();

    if (this.isAdmin) {
      const address = this.account?.adresa?.trim() || 'Automaterijal Magacin';
      this.cartForm.patchValue({ address });
    }
  }

  ngOnDestroy(): void {
    this.seo.clearJsonLd('seo-jsonld-cart');
    this.seo.setLinkRel('prev', null);
    this.seo.setLinkRel('next', null);
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Angular lifecycle hooks end */

  /** Init event: start */

  getInformation(): void {
    this.cartService
      .getInformationAboutPaying()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (valueHelps: ValueHelp[]) => {
          this.payingChoices = valueHelps.map((value: ValueHelp) => {
            return { key: value.id, value: value.naziv } as SelectModel;
          });
          if (this.isAdmin && this.payingChoices.length) {
            this.setCartSelectionValue('payment', String(this.payingChoices[0].key));
          }
        },
        error: () => {
          this.payingChoices = [];
        },
      });

    this.cartService
      .getInformationAboutTransport()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (valueHelps: ValueHelp[]) => {
          this.transportChoices = valueHelps.map((value: ValueHelp) => {
            return { key: value.id, value: value.naziv } as SelectModel;
          });
          if (this.isAdmin && this.transportChoices.length) {
            this.setCartSelectionValue('transport', String(this.transportChoices[0].key));
          }
        },
        error: () => {
          this.transportChoices = [];
        },
      });
  }

  syncOnCartItemSize(): void {
    this.cartStateService.roba$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (roba: Roba[]) => {
        this.pictureService.convertByteToImageArray(roba);
        this.roba = roba;
        this.sumTotal();

        if (this.roba.length) {
          const accountSnapshot = this.accountStateService.get();
          const cartSnapshot = this.cartStateService.getAll();
          if (!this.hasTrackedCartView) {
            this.analytics.trackViewCart(cartSnapshot, accountSnapshot);
            this.hasTrackedCartView = true;
          }
        } else {
          this.hasTrackedCartView = false;
        }
      },
      error: () => {
        this.roba = [];
      },
    });
  }

  /** Init event: end */

  setCartSelectionValue(control: string, value: string): void {
    this.cartForm.controls[control].setValue(value);
  }

  setUserSelectionValue(control: string, value: string): void {
    this.userForm.controls[control].setValue(value);
  }

  sumTotal(): void {
    let totalNet = 0;
    this.roba
      .map((roba: Roba) => (Number(roba.kolicina) || 0) * this.getUnitPriceForTotals(roba))
      .forEach((value: number) => (totalNet += value));

    if (this.isAdmin) {
      this.bezPdv = totalNet;
      this.pdv = totalNet * 0.2;
      this.total = totalNet + this.pdv;
      return;
    }

    this.total = totalNet;
    this.pdv = totalNet - totalNet / 1.2;
    this.bezPdv = totalNet / 1.2;
  }

  private getUnitPriceForTotals(roba: Roba): number {
    if (!this.isAdmin) {
      return Number(roba?.cena) || 0;
    }

    const purchase = Number(roba?.providerAvailability?.purchasePrice);
    if (Number.isFinite(purchase) && purchase > 0) {
      return purchase;
    }

    const fallback = Number(roba?.cena);
    return Number.isFinite(fallback) ? fallback : 0;
  }

  get hasProviderOnlyItems(): boolean {
    return (this.roba ?? []).some((item) => this.requiresExternalWarehouse(item));
  }

  get hasNonReturnableItems(): boolean {
    return (this.roba ?? []).some((item) => {
      const provider = (item?.providerAvailability?.provider || '').trim().toLowerCase();
      return provider === 'szakal' && !!item?.providerAvailability?.providerNoReturnable;
    });
  }

  get cartItemCount(): number {
    return this.roba?.length ?? 0;
  }

  get cartQuantityTotal(): number {
    return (this.roba ?? []).reduce(
      (sum, item) => sum + (Number(item.kolicina) || 0),
      0
    );
  }

  get cartProviderCount(): number {
    return (this.roba ?? []).filter((item) => this.requiresExternalWarehouse(item)).length;
  }

  get cartOutOfStockCount(): number {
    return (this.roba ?? []).filter(
      (r) => getAvailabilityStatus(r) === 'OUT_OF_STOCK'
    ).length;
  }

  get hasFebiProviderItems(): boolean {
    return (this.roba ?? []).some((item) => {
      const provider = (item?.providerAvailability?.provider || '').trim().toLowerCase();
      return (
        provider === this.febiProviderKey &&
        this.requiresExternalWarehouse(item)
      );
    });
  }

  get shouldShowFebiDeliveryOptions(): boolean {
    return this.isAdmin && this.hasFebiProviderItems;
  }

  get shouldShowMixedDeliveryInfo(): boolean {
    const items = this.roba ?? [];
    if (!items.length) {
      return false;
    }
    const hasExternalPart = items.some((item) => this.requiresExternalWarehouse(item));
    const hasSabacPart = items.some((item) => this.resolveSabacFulfillment(item) > 0);
    return hasExternalPart && hasSabacPart;
  }

  getMixedLocalQuantity(item: Roba | null | undefined): number {
    return splitWarehouseQuantityForFlow({
      requestedQty: Math.max(0, Number(item?.kolicina) || 0),
      localQty: Math.max(0, Number(item?.stanje) || 0),
      isAdmin: this.isAdmin,
      provider: item?.providerAvailability,
    }).localQuantity;
  }

  getMixedExternalQuantity(item: Roba | null | undefined): number {
    return splitWarehouseQuantityForFlow({
      requestedQty: Math.max(0, Number(item?.kolicina) || 0),
      localQty: Math.max(0, Number(item?.stanje) || 0),
      isAdmin: this.isAdmin,
      provider: item?.providerAvailability,
    }).externalQuantity;
  }

  isMixedWarehouseItem(item: Roba | null | undefined): boolean {
    if (!item?.providerAvailability?.available) {
      return false;
    }
    return splitWarehouseQuantityForFlow({
      requestedQty: Math.max(0, Number(item?.kolicina) || 0),
      localQty: Math.max(0, Number(item?.stanje) || 0),
      isAdmin: this.isAdmin,
      provider: item?.providerAvailability,
    }).hasMixed;
  }

  getMixedExternalLabel(item: Roba | null | undefined): string {
    if (this.isAdmin && isFebiProvider(item?.providerAvailability)) {
      return 'Magacin Beograd (FEBI)';
    }
    if (isFebiProvider(item?.providerAvailability)) {
      return 'Magacin Beograd';
    }
    if (this.isAdmin) {
      return 'Eksterni magacin';
    }
    return 'Eksterni magacin';
  }

  getMixedDeliveryHint(item: Roba | null | undefined): string | null {
    if (!this.requiresExternalWarehouse(item)) {
      return null;
    }
    const estimate = formatDeliveryEstimate(
      item?.providerAvailability,
      Math.max(1, Math.floor(Number(item?.kolicina) || 1))
    );
    const cutoff = formatDispatchCutoff(item?.providerAvailability?.nextDispatchCutoff);
    if (estimate && cutoff) {
      return `Isporuka: ${estimate} • Poruči do: ${cutoff}`;
    }
    if (estimate) {
      return `Isporuka: ${estimate}`;
    }
    if (cutoff) {
      return `Poruči do: ${cutoff}`;
    }
    return null;
  }

  get deliveryEstimateLabel(): string | null {
    const items = this.roba ?? [];
    if (!items.length) {
      return null;
    }

    // Baseline for in-stock items (internal warehouse).
    let maxMin = 1;
    let maxMax = 2;
    let hasAnyEstimate = true;

    for (const item of items) {
      const p = item?.providerAvailability;
      const isProvider = this.requiresExternalWarehouse(item);

      if (!isProvider) {
        continue;
      }

      const min = Number(p?.deliveryToCustomerBusinessDaysMin);
      const max = Number(p?.deliveryToCustomerBusinessDaysMax);
      const lead = Number(p?.leadTimeBusinessDays);

      if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > 0) {
        maxMin = Math.max(maxMin, min);
        maxMax = Math.max(maxMax, max);
        continue;
      }

      if (Number.isFinite(lead) && lead > 0) {
        maxMin = Math.max(maxMin, lead);
        maxMax = Math.max(maxMax, lead);
        continue;
      }

      hasAnyEstimate = false;
    }

    if (!hasAnyEstimate) {
      return null;
    }

    return this.formatBusinessDayRange(maxMin, maxMax);
  }

  private formatBusinessDayRange(min: number, max: number): string {
    if (min === max) {
      return `${min} ${this.pluralizeBusinessDays(min)}`;
    }
    return `${min}–${max} ${this.pluralizeBusinessDays(max)}`;
  }

  private pluralizeBusinessDays(n: number): string {
    const abs = Math.abs(n);
    if (abs === 1) return 'radni dan';
    if (
      abs % 10 >= 2 &&
      abs % 10 <= 4 &&
      (abs % 100 < 10 || abs % 100 >= 20)
    )
      return 'radna dana';
    return 'radnih dana';
  }

  private buildInvoiceItemImage(roba: Roba): Slika | undefined {
    const raw = (roba?.slika?.slikeUrl || '').trim();
    if (!raw) {
      return roba?.slika;
    }

    const isProvider =
      getAvailabilityStatus(roba) === 'AVAILABLE' &&
      !!roba?.providerAvailability?.available;

    if (!isProvider) {
      return roba?.slika;
    }

    const slika = new Slika();
    slika.slikeUrl = this.normalizeToRelativeUrl(raw);
    slika.isUrl = true;
    return slika;
  }

  private normalizeToRelativeUrl(url: string): string {
    const trimmed = (url || '').trim();
    if (!trimmed) {
      return trimmed;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const u = new URL(trimmed);
        return `${u.pathname}${u.search}`;
      } catch {
        return trimmed;
      }
    }

    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  removeFromBasketHandler(cartKey: string): void {
    this.cartStateService.removeFromCartByKey(cartKey);
  }

  onFebiDeliveryPartySelected(option?: RadioOption | null): void {
    const selected = option?.key?.trim() || this.febiDeliveryPartyDefault;
    this.setCartSelectionValue('febiDeliveryParty', selected);
  }

  /** Basket send: start */

  submitInvoice(): void {
    this.invoiceSubmitted = true;
    const cartItemsSnapshot = this.cartStateService.getAll();
    const accountSnapshot = this.accountStateService.get();

    if (cartItemsSnapshot.length) {
      this.analytics.trackBeginCheckout(
        cartItemsSnapshot,
        accountSnapshot,
        this.buildCheckoutMetadata()
      );
    }

    const szakalChecks = this.buildSzakalCheckItems();
    if (szakalChecks.length) {
      this.szakalStockService
        .check(szakalChecks)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (results) => {
            const primary = results || [];
            this.applySzakalResultsToCart(szakalChecks, primary);
            const failedRequests = this.resolveSzakalFailureRequests(szakalChecks, primary);
            if (!failedRequests.length) {
              this.submitInvoiceInternal(cartItemsSnapshot, accountSnapshot);
              return;
            }

            // Retry once for currently failing lines (token may have rotated moments ago).
            this.szakalStockService
              .check(failedRequests)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (retryResults) => {
                  const merged = this.mergeSzakalResults(primary, retryResults || []);
                  this.applySzakalResultsToCart(szakalChecks, merged);

                  const finalFailedRequests = this.resolveSzakalFailureRequests(szakalChecks, merged);
                  if (finalFailedRequests.length) {
                    const labels = finalFailedRequests.map((r) => r.token || r.glid || 'stavka');
                    const preview = labels.slice(0, 3).join(', ');
                    const more = labels.length > 3 ? ` (+${labels.length - 3})` : '';
                    this.snackbarService.showAutoClose(
                      this.buildSzakalUnavailableMessage(preview, more),
                      SnackbarPosition.TOP
                    );
                    this.invoiceSubmitted = false;
                    return;
                  }

                  this.submitInvoiceInternal(cartItemsSnapshot, accountSnapshot);
                },
                error: () => {
                  this.snackbarService.showAutoClose(
                    this.buildSzakalCheckFailedMessage(),
                    SnackbarPosition.TOP
                  );
                  this.invoiceSubmitted = false;
                },
              });
          },
          error: () => {
            this.snackbarService.showAutoClose(
              this.buildSzakalCheckFailedMessage(),
              SnackbarPosition.TOP
            );
            this.invoiceSubmitted = false;
          },
        });
      return;
    }

    this.submitInvoiceInternal(cartItemsSnapshot, accountSnapshot);
  }

  private submitInvoiceInternal(cartItemsSnapshot: any[], accountSnapshot: any): void {
    this.buildInvoiceFromForm(this.getOrCreateSubmitRequestKey());
    this.invoiceService
      .submit(this.invoice!)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.invoiceSubmitted = false;
        })
      )
      .subscribe({
        next: (outOfStockItems: Roba[]) => {
          if (cartItemsSnapshot.length) {
            this.analytics.trackPurchase(
              this.generateTransactionId(),
              cartItemsSnapshot,
              this.total,
              accountSnapshot,
              { tax: this.pdv, shipping: 0 }
            );
          }

          if (!outOfStockItems.length) {
            this.snackbarService.showAutoClose(
              'Porudžbina je uspešno poslata i uskoro će biti obrađena.',
              SnackbarPosition.TOP
            );
          } else {
            const preview = outOfStockItems
              .slice(0, 3)
              .map((r) => r?.katbr || r?.naziv)
              .filter(Boolean)
              .join(', ');
            const more =
              outOfStockItems.length > 3
                ? ` (+${outOfStockItems.length - 3})`
                : '';

            this.snackbarService.showAutoClose(
              preview
                ? `Porudžbina je uspešno poslata. Neke stavke nisu na stanju i biće obezbeđene iz eksternog magacina: ${preview}${more}.`
                : 'Porudžbina je uspešno poslata. Neke stavke nisu na stanju i biće obezbeđene iz eksternog magacina.',
              SnackbarPosition.TOP
            );
          }

          this.router.navigateByUrl('/webshop');
          this.hasTrackedCartView = false;
          this.cartStateService.resetCart();
          this.resetSubmitRequestKey();
        },
        error: (error: any) => {
          if (!this.shouldKeepSubmitRequestKey(error)) {
            this.resetSubmitRequestKey();
          }
          const persistentConflict = this.buildPersistentConflictToastMessage(error);
          if (persistentConflict) {
            this.snackbarService.showPersistentError(
              persistentConflict,
              SnackbarPosition.TOP
            );
            return;
          }
          this.snackbarService.showAutoClose(
            this.extractSubmitErrorMessage(error),
            SnackbarPosition.TOP
          );
        },
      });
  }

  private requiresExternalWarehouse(item: Roba | null | undefined): boolean {
    return requiresExternalWarehouseForFlow({
      requestedQty: Math.max(0, Number(item?.kolicina) || 0),
      localQty: Math.max(0, Number(item?.stanje) || 0),
      isAdmin: this.isAdmin,
      provider: item?.providerAvailability,
    });
  }

  private resolveSabacFulfillment(item: Roba | null | undefined): number {
    return splitWarehouseQuantityForFlow({
      requestedQty: Math.max(0, Number(item?.kolicina) || 0),
      localQty: Math.max(0, Number(item?.stanje) || 0),
      isAdmin: this.isAdmin,
      provider: item?.providerAvailability,
    }).localQuantity;
  }

  private extractSubmitErrorMessage(error: any): string {
    const structured = this.buildConflictMessageFromPayload(error?.error?.details);
    if (structured) {
      return structured;
    }

    const fallback = 'Porudžbinu trenutno nije moguće potvrditi. Proverite količine i pokušajte ponovo.';
    const reason = error?.error?.error;
    const message = error?.error?.message || error?.message;
    const raw =
      (typeof reason === 'string' && reason.trim()) ||
      (typeof message === 'string' && message.trim()) ||
      '';
    if (!raw) {
      return fallback;
    }

    const cleaned = raw
      .replace(/^\d+\s+[A-Z_]+\s+"?/i, '')
      .replace(/^Error:\s*/i, '')
      .replace(/^"+|"+$/g, '')
      .trim();

    return cleaned || fallback;
  }

  private buildPersistentConflictToastMessage(error: any): string | null {
    const status = Number(error?.status);
    const details = error?.error?.details as CheckoutConflictDetailsPayload | undefined;
    const hasConflictCode = details?.code === 'CHECKOUT_PROVIDER_UNAVAILABLE';
    if (status !== 409 && !hasConflictCode) {
      return null;
    }

    const items = Array.isArray(details?.items) ? details?.items : [];
    if (!items.length) {
      return (
        'Porudzbinu trenutno nije moguce potvrditi.\n' +
        'Neke stavke vise nisu dostupne u trazenoj kolicini.\n' +
        'Smanjite kolicinu ili uklonite stavku pa potvrdite ponovo.'
      );
    }

    const lines = items
      .slice(0, 4)
      .map((item) => this.formatConflictToastLine(item))
      .filter(Boolean)
      .map((line) => `- ${line}`);
    const moreLine =
      items.length > 4 ? `- +${items.length - 4} dodatnih stavki nije potvrdjeno.` : null;

    return [
      'Porudzbinu trenutno nije moguce potvrditi.',
      'Neke stavke vise nisu dostupne u trazenoj kolicini:',
      ...lines,
      ...(moreLine ? [moreLine] : []),
      'Predlog: smanjite kolicinu ili uklonite stavku, pa kliknite potvrdu ponovo.',
    ].join('\n');
  }

  private formatConflictToastLine(item: CheckoutConflictItemPayload | null | undefined): string {
    if (!item) {
      return 'stavka';
    }
    const label =
      (item.catalogNumber || '').toString().trim() ||
      (item.articleName || '').toString().trim() ||
      'stavka';
    const requested = Math.max(0, Number(item.requestedQuantity) || 0);
    const maxOrderable = Math.max(0, Number(item.maxOrderableQuantity) || 0);
    const reason = (item.message || '').toString().trim();

    if (reason && requested > 0) {
      return `${label}: ${reason} (trazeno ${requested}, dostupno ${maxOrderable})`;
    }
    if (requested > 0) {
      return `${label}: trazeno ${requested}, dostupno ${maxOrderable}`;
    }
    return reason ? `${label}: ${reason}` : label;
  }

  private buildConflictMessageFromPayload(rawDetails: any): string | null {
    const details = rawDetails as CheckoutConflictDetailsPayload | undefined;
    if (!details || details.code !== 'CHECKOUT_PROVIDER_UNAVAILABLE') {
      return null;
    }

    const items = Array.isArray(details.items) ? details.items : [];
    if (!items.length) {
      return null;
    }

    const preview = items
      .slice(0, 3)
      .map((item) => this.formatConflictItem(item))
      .filter(Boolean)
      .join(', ');
    const more = items.length > 3 ? ` (+${items.length - 3})` : '';
    if (!preview) {
      return null;
    }

    return `Neke stavke vise nisu dostupne u trazenoj kolicini: ${preview}${more}. Smanjite kolicinu ili uklonite stavku i potvrdite ponovo.`;
  }

  private formatConflictItem(item: CheckoutConflictItemPayload | null | undefined): string {
    if (!item) {
      return '';
    }
    const label =
      (item.catalogNumber || '').toString().trim() ||
      (item.articleName || '').toString().trim() ||
      'stavka';
    const requested = Math.max(0, Number(item.requestedQuantity) || 0);
    const maxOrderable = Math.max(0, Number(item.maxOrderableQuantity) || 0);
    const reason = (item.message || '').toString().trim();
    if (requested <= 0) {
      return reason ? `${label} (${reason})` : label;
    }
    if (reason) {
      return `${label} (${reason}; trazeno ${requested}, dostupno ${maxOrderable})`;
    }
    return `${label} (trazeno ${requested}, dostupno ${maxOrderable})`;
  }

  private buildSzakalCheckItems(): SzakalStockCheckItem[] {
    return (this.roba ?? [])
      .filter((item) => {
        const provider = (item?.providerAvailability?.provider || '').toString().trim().toLowerCase();
        return provider === 'szakal';
      })
      .map((item) => {
        return {
          token: item?.providerAvailability?.providerStockToken,
          glid: item?.providerAvailability?.providerProductId,
          quantity: Number(item?.kolicina) || 1,
          brand: item?.proizvodjac?.proid,
          group: item?.grupa,
        } as SzakalStockCheckItem;
      })
      .filter((item) => !!item.token || !!item.glid);
  }

  private mergeSzakalResults(
    primary: SzakalStockCheckResult[],
    retry: SzakalStockCheckResult[]
  ): SzakalStockCheckResult[] {
    const merged = [...(primary || [])];
    (retry || []).forEach((retryResult) => {
      const idx = merged.findIndex((existing) => {
        const sameToken = !!retryResult?.token && !!existing?.token && retryResult.token === existing.token;
        const sameGlid = !!retryResult?.glid && !!existing?.glid && retryResult.glid === existing.glid;
        return sameToken || sameGlid;
      });
      if (idx >= 0) {
        merged[idx] = retryResult;
      } else {
        merged.push(retryResult);
      }
    });
    return merged;
  }

  private applySzakalResultsToCart(
    requests: SzakalStockCheckItem[],
    results: SzakalStockCheckResult[]
  ): void {
    const byToken = new Map<string, SzakalStockCheckResult>();
    const byGlid = new Map<string, SzakalStockCheckResult>();
    (results || []).forEach((result) => {
      if (result?.token) {
        byToken.set(result.token, result);
      }
      if (result?.glid) {
        byGlid.set(result.glid, result);
      }
    });

    (this.roba ?? []).forEach((item) => {
      const token = item?.providerAvailability?.providerStockToken;
      const glid = item?.providerAvailability?.providerProductId;
      const result =
        (token ? byToken.get(token) : undefined) ||
        (glid ? byGlid.get(glid) : undefined);
      if (!result || !item?.providerAvailability) {
        return;
      }
      applySzakalRealtimeAvailability(item, result, {
        markRealtimeChecked: false,
        clearRealtimeChecking: false,
      });
    });
  }

  private resolveSzakalFailures(
    requests: SzakalStockCheckItem[],
    results: SzakalStockCheckResult[]
  ): string[] {
    const failures: string[] = [];
    const byToken = new Map<string, SzakalStockCheckResult>();
    const byGlid = new Map<string, SzakalStockCheckResult>();
    (results || []).forEach((result) => {
      if (result?.token) {
        byToken.set(result.token, result);
      }
      if (result?.glid) {
        byGlid.set(result.glid, result);
      }
    });

    (requests || []).forEach((req) => {
      const result =
        (req.token ? byToken.get(req.token) : undefined) ||
        (req.glid ? byGlid.get(req.glid) : undefined);
      const requested = Number(req.quantity) || 1;
      const ok = isSzakalStockResultAvailable(result, requested);
      if (!ok) {
        const label = req.token || req.glid || 'stavka';
        failures.push(label);
      }
    });

    return failures;
  }

  private resolveSzakalFailureRequests(
    requests: SzakalStockCheckItem[],
    results: SzakalStockCheckResult[]
  ): SzakalStockCheckItem[] {
    const failedKeys = new Set(this.resolveSzakalFailures(requests, results));
    return (requests || []).filter((req) => {
      const label = req.token || req.glid || 'stavka';
      return failedKeys.has(label);
    });
  }

  private buildSzakalUnavailableMessage(preview: string, more: string): string {
    if (this.isAdmin) {
      return preview
        ? `Szakal provera: trenutno nije dostupno ${preview}${more}.`
        : 'Szakal provera: artikli trenutno nisu dostupni.';
    }
    return preview
      ? `Provera eksternog magacina: trenutno nije dostupno ${preview}${more}.`
      : 'Provera eksternog magacina: artikli trenutno nisu dostupni.';
  }

  private buildSzakalCheckFailedMessage(): string {
    return this.isAdmin
      ? 'Szakal provera dostupnosti nije uspela, pokušajte ponovo.'
      : 'Provera eksternog magacina nije uspela, pokušajte ponovo.';
  }

  buildInvoiceFromForm(idempotencyKey?: string): void {
    this.invoice = new Invoice();

    const isAnon = !this.loggedIn;

    // Set fields
    this.invoice.adresa = this.createValueHelp(
      isAnon ? 850 : this.account?.ppid!
    );
    this.invoice.nacinPlacanja = this.createValueHelp(
      isAnon ? 2 : this.cartForm.get('payment')?.value
    );
    this.invoice.nacinPrevoza = this.createValueHelp(
      isAnon ? 2 : this.cartForm.get('transport')?.value
    );

    this.invoice.detalji = this.roba.map((r) =>
      new InvoiceItem({
        availabilityStatus: r.availabilityStatus,
        robaId: r.robaid,
        naziv: r.naziv,
        kataloskiBroj: r.katbr,
        proizvodjac: r.proizvodjac,
        kolicina: r.kolicina,
        cena: this.isAdmin ? this.getUnitPriceForTotals(r) : r.cena,
        rabat: this.isAdmin ? undefined : r.rabat,
        slika: this.buildInvoiceItemImage(r),
        providerAvailability: r.providerAvailability,
      })
    );

    this.invoice.iznosNarucen = this.isAdmin ? this.bezPdv : this.total;

    this.invoice.napomena = isAnon
      ? this.buildAnonymousNote()
      : this.buildLoggedUserNote();

    const providerOptions = this.buildProviderOptions();
    if (providerOptions.length) {
      this.invoice.providerOptions = providerOptions;
    }
    if (idempotencyKey) {
      this.invoice.idempotencyKey = idempotencyKey;
    }
  }

  private getOrCreateSubmitRequestKey(): string {
    if (this.submitRequestKey) {
      return this.submitRequestKey;
    }
    this.submitRequestKey = this.generateSubmitRequestKey();
    return this.submitRequestKey;
  }

  private resetSubmitRequestKey(): void {
    this.submitRequestKey = null;
  }

  private shouldKeepSubmitRequestKey(error: any): boolean {
    const status = Number(error?.status);
    return status === 0 || status === 408 || status === 429 || status >= 500;
  }

  private generateSubmitRequestKey(): string {
    const cryptoLike = (globalThis as any)?.crypto;
    if (cryptoLike?.randomUUID) {
      return cryptoLike.randomUUID();
    }
    const timestamp = Date.now().toString(36);
    const random = Math.floor(Math.random() * 1_000_000_000).toString(36);
    return `checkout-${timestamp}-${random}`;
  }

  createValueHelp(id: number): ValueHelp {
    const valueHelp = new ValueHelp();
    valueHelp.id = id;
    return valueHelp;
  }

  private buildCheckoutMetadata(): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      step: 'submit_invoice',
      logged_in: this.loggedIn,
    };

    const payment = this.cartForm.get('payment')?.value;
    if (payment) {
      metadata['payment_method'] = payment;
    }

    const transport = this.cartForm.get('transport')?.value;
    if (transport) {
      metadata['shipping_method'] = transport;
    }

    return metadata;
  }

  private buildProviderOptions(): ProviderOrderOption[] {
    if (!this.shouldShowFebiDeliveryOptions) {
      return [];
    }

    const selection =
      this.cartForm.get('febiDeliveryParty')?.value || this.febiDeliveryPartyDefault;
    const deliveryParty = selection?.toString().trim() || this.febiDeliveryPartyDefault;

    return [
      {
        providerKey: this.febiProviderKey,
        deliveryParty,
      },
    ];
  }

  private generateTransactionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.floor(Math.random() * 1_000_000).toString(36);
    return `order-${timestamp}-${random}`;
  }

  private buildAnonymousNote(): string {
    const f = this.userForm.controls;
    const parts: string[] = [];

    // full name
    if (f['name'].value || f['surname'].value) {
      parts.push(`Ime i Prezime: ${f['name'].value} ${f['surname'].value}`.trim());
    }

    // phone + email
    if (f['phone'].value || f['email'].value) {
      parts.push(`Telefon i Email: ${f['phone'].value} ${f['email'].value}`.trim());
    }

    // address
    if (f['street'].value) {
      parts.push(`Adresa: ${f['street'].value}`);
    }

    // city + postal
    if (f['city'].value || f['postalcode'].value) {
      parts.push(`Grad i Poštanski broj: ${f['city'].value} ${f['postalcode'].value}`.trim());
    }

    // PIB
    if (f['pib'].value) {
      parts.push(`Tax ID (PIB): ${f['pib'].value}`);
    }

    // VIN
    if (f['vin']?.value) {
      parts.push(`VIN: ${f['vin'].value}`);
    }

    // comment
    if (f['comment'].value) {
      parts.push(`Komentar: ${f['comment'].value}`);
    }

    return parts.join('; ') + ';';
  }

  private buildLoggedUserNote(): string {
    if (this.isAdmin) {
      const comment = this.cartForm.get('comment')?.value?.trim();
      return comment ? `Komentar: ${comment}` : '';
    }

    const formAddress = this.cartForm.get('address')?.value?.trim();
    const userAddress = this.account?.adresa?.trim();
    const comment = this.cartForm.get('comment')?.value?.trim();
    const vin = this.cartForm.get('vin')?.value?.trim();

    const addressChanged =
      formAddress && userAddress && formAddress !== userAddress;

    const noteParts: string[] = [];

    if (addressChanged) {
      noteParts.push(`Adresa je promenjena. Nova adresa: ${formAddress}`);
    }

    if (vin) {
      noteParts.push(`VIN: ${vin}`);
    }

    if (comment) {
      noteParts.push(`Komentar: ${comment}`);
    }

    if (noteParts.length === 0) {
      return '';
    }

    return noteParts.length === 1 ? noteParts[0] : noteParts.join('; ') + ';';
  }

  /** Basket send: end */

  /** Start of: seo */

  private setUpdateSeoTags(): void {
    const url = 'https://automaterijal.com/webshop/cart';

    this.seo.updateSeoTags({
      title: 'Korpa | Automaterijal',
      description: 'Pregled proizvoda u korpi i priprema porudžbine.',
      url,
      canonical: url,
      type: 'website',
      robots: 'noindex, nofollow',
      siteName: 'Automaterijal',
      locale: 'sr_RS',
      image: 'https://automaterijal.com/images/logo/logo.svg',
      imageAlt: 'Automaterijal logo',
    });

    // (opciono) JSON-LD: WebPage + Breadcrumbs
    this.seo.setJsonLd({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "name": "Korpa",
          "url": url,
          "isPartOf": { "@type": "WebSite", "name": "Automaterijal", "url": "https://automaterijal.com/" }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Početna", "item": "https://automaterijal.com/" },
            { "@type": "ListItem", "position": 2, "name": "Webshop", "item": "https://automaterijal.com/webshop" },
            { "@type": "ListItem", "position": 3, "name": "Korpa", "item": url }
          ]
        }
      ]
    }, 'seo-jsonld-cart');
  }

  private buildFebiDeliveryOptions(): void {
    this.febiDeliveryOptions = [
      {
        key: this.febiDeliveryPartyDefault,
        value: 'Brza pošta',
        checked: true,
      },
      {
        key: this.febiDeliveryPartyPickup,
        value: 'Naše dostavno vozilo',
        checked: false,
      },
    ];
  }
  /** End of: seo */
}
