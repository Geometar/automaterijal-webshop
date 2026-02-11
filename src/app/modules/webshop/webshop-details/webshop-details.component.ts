import {
  Component,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  TransferState,
  ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, finalize, forkJoin, Observable, of, Subject, take, takeUntil } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Enums
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  InputTypeEnum,
  PositionEnum,
  SizeEnum,
  TooltipPositionEnum,
  TooltipSubPositionsEnum,
  TooltipThemeEnum,
  TooltipTypesEnum,
} from '../../../shared/data-models/enums';

// Data Models
import {
  Filter,
  Magacin,
  Roba,
  RobaBrojevi,
  RobaTehnickiOpis,
  TecDocDokumentacija,
  TecDocLinkedManufacturerTargets,
} from '../../../shared/data-models/model/roba';
import { AvailabilityStatus } from '../../../shared/data-models/model/availability';
import { Slika } from '../../../shared/data-models/model/slika';
import { TooltipModel } from '../../../shared/data-models/interface';
import { ShowcaseComponent, ShowcaseSection } from '../../../shared/components/showcase/showcase.component';
import { VehicleCompatibilityComponent } from './components/vehicle-compatibility/vehicle-compatibility.component';
import { ProductDocumentationComponent, DocumentationGroup } from './components/product-documentation/product-documentation.component';
import { ProductOeNumbersComponent, OeNumberEntry } from './components/product-oe-numbers/product-oe-numbers.component';

// Autom Components
import { AddAttributesComponent } from './add-atributes/add-atributes.component';
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CommonModule, CurrencyPipe, isPlatformBrowser } from '@angular/common';
import { DividerComponent } from '../../../shared/components/divider/divider.component';
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';
import { PopupComponent } from '../../../shared/components/popup/popup.component';
import { RsdCurrencyPipe } from '../../../shared/pipe/rsd-currency.pipe';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { TextAreaComponent } from '../../../shared/components/text-area/text-area.component';
import { ProviderAvailabilityComponent } from '../../../shared/components/provider-availability/provider-availability.component';
import { EmailService } from '../../../shared/service/email.service';
import {
  AvailabilityTone,
  AvailabilityVm,
  buildAvailabilityVm,
  clampCombinedWarehouseQuantity,
  resolveCombinedAvailabilityLabel,
  resolveCombinedAvailabilityTone,
  resolveMinOrderQuantity,
  resolvePackagingUnit,
  splitCombinedWarehouseQuantity,
  shouldForceCombinedProviderAvailabilityBox,
} from '../../../shared/utils/availability-utils';

// Services
import { AccountStateService } from '../../../shared/service/state/account-state.service';
import { AnalyticsService } from '../../../shared/service/analytics.service';
import { CartStateService } from '../../../shared/service/state/cart-state.service';
import { environment } from '../../../../environment/environment';
import { PictureService, ProductImageMeta } from '../../../shared/service/utils/picture.service';
import { RobaService } from '../../../shared/service/roba.service';
import { SeoService } from '../../../shared/service/seo.service';
import { TecdocService } from '../../../shared/service/tecdoc.service';
import { SnackbarService } from '../../../shared/service/utils/snackbar.service';
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';
import { SzakalStockCheckResult, SzakalStockService } from '../../../shared/service/szakal-stock.service';

// Utils
import { StringUtils } from '../../../shared/utils/string-utils';
import { SITE_ORIGIN, hasActiveFilterQuery, normalizeRobotsTag } from '../../../shared/utils/seo-utils';
import { SSR_PRODUCT_STATE_KEY } from '../../../shared/tokens/ssr-product.token';

interface SpecEntry {
  id: string;
  oznaka: string;
  vrednost: string;
  jedinica?: string;
  highlight: boolean;
}

@Component({
  selector: 'app-webshop-details',
  standalone: true,
  imports: [
    AddAttributesComponent,
    AutomIconComponent,
    ButtonComponent,
    CommonModule,
    VehicleCompatibilityComponent,
    ProductDocumentationComponent,
    ProductOeNumbersComponent,
    InputFieldsComponent,
    PopupComponent,
    RouterLink,
    RsdCurrencyPipe,
    SpinnerComponent,
    TextAreaComponent,
    ProviderAvailabilityComponent,
    DividerComponent,
    ShowcaseComponent
  ],
  providers: [CurrencyPipe],
  templateUrl: './webshop-details.component.html',
  styleUrls: ['./webshop-details.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class WebshopDetailsComponent implements OnInit, OnDestroy {
  id: number | null = null;
  private routeRef: { kind: 'ROBA' | 'TECDOC'; id: number; token: string } | null = null;
  data: Roba = new Roba();

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  inquiryContact = '';
  inquiryNote = '';
  inquiryPhone = '';
  inquirySending = false;
  inquirySent = false;

  // Misc
  editingText = false;
  isAdmin = false;
  isEmployee = false;
  loggedIn = false;
  loading = true;
  quantity: number = 1;
  sanitizedText: SafeHtml = '';
  showAddAttributes = false;
  showDeleteWarningPopup = false;
  showImageDeleteWarningPopup = false;
  shareLink: string | null = null;
  private shareTitle: string = '';
  readonly skeletonRows = Array.from({ length: 5 });

  // Tooltip
  pdfTooltip: TooltipModel = {
    position: TooltipPositionEnum.TOP,
    subPosition: TooltipSubPositionsEnum.SUB_CENTER,
    theme: TooltipThemeEnum.DARK,
    tooltipText: 'PDF Document',
    type: TooltipTypesEnum.TEXT,
  };

  // Data
  documentationGroups: DocumentationGroup[] = [];
  oeNumberEntries: OeNumberEntry[] = [];
  linkedTargets: TecDocLinkedManufacturerTargets[] = [];
  showcaseDataCategories: ShowcaseSection[] = [];
  showcaseDataManufactures: ShowcaseSection[] = [];
  youTubeIds: string[] = [];
  private showcaseTakenIds = new Set<number>();
  private routeSlug: string | null = null;
  private slugMatchesCanonical = true;
  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  get availabilityVm(): AvailabilityVm {
    return buildAvailabilityVm(this.data, {
      isAdmin: this.isAdmin,
      isStaff: this.isStaff,
    });
  }

  get hasDiscount(): boolean {
    return this.availabilityVm.showDiscount;
  }

  get discountValue(): number {
    return this.getDiscountValue();
  }

  get oldPrice(): number | null {
    if (!this.hasDiscount) return null;
    const price = this.getPrice();
    const rabat = this.getDiscountValue();
    const denom = 1 - rabat / 100;
    if (price <= 0 || denom <= 0) {
      return null;
    }
    return price / denom;
  }

  get savings(): number | null {
    if (!this.hasDiscount) return null;
    const price = this.getPrice();
    const oldPrice = this.oldPrice;
    if (!oldPrice || price <= 0) {
      return null;
    }
    return oldPrice - price;
  }

  private getPrice(): number {
    return this.displayPrice;
  }

  private getDiscountValue(): number {
    const raw = (this.data as any)?.rabat;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  // Specs
  displayedSpecs: SpecEntry[] = [];
  private allSpecs: SpecEntry[] = [];
  hasSpecs = false;
  showAllSpecs = false;
  specOverflow = 0;
  private readonly specDisplayLimit = 10;

  private destroy$ = new Subject<void>();

  get specTitleId(): string {
    return `specs-${this.data?.robaid ?? 'product'}`;
  }

  get categoryLabel(): string {
    const parts = [
      this.normalizeWhitespace(this.data?.grupaNaziv),
      this.normalizeWhitespace(this.data?.podGrupaNaziv),
    ].filter(Boolean);
    return parts.join(' › ');
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.showDeleteWarningPopup = false;
    this.showImageDeleteWarningPopup = false;
  }

  constructor(
    private accountStateService: AccountStateService,
    private cartStateService: CartStateService,
    private emailService: EmailService,
    private pictureService: PictureService,
    private robaService: RobaService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private seoService: SeoService,
    private tecDocService: TecdocService,
    private transferState: TransferState,
    private snackbarService: SnackbarService,
    private urlHelperService: UrlHelperService,
    private szakalStockService: SzakalStockService,
    private analytics: AnalyticsService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) { }

  // ─────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.isAdmin = this.accountStateService.isAdmin();
    this.isEmployee = this.accountStateService.isEmployee();
    this.loggedIn = this.accountStateService.isUserLoggedIn();

    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        map((params) => params.get('id')),
        distinctUntilChanged()
      )
      .subscribe((raw) => {
        this.routeSlug = this.extractSlug(raw);
        this.applyRouteCanonical(raw);
        this.routeRef = this.parseRouteRef(raw);
        this.id = this.routeRef?.kind === 'ROBA' ? this.routeRef.id : null;

        if (!this.routeRef) {
          console.warn('Nevažeći ID u ruti:', raw);
          return;
        }

        const hydrated =
          this.routeRef.kind === 'ROBA'
            ? this.tryHydrateFromTransferState(this.routeRef.id)
            : false;
        if (!hydrated) {
          this.fetchData(this.routeRef);
        }
      });
  }

  ngOnDestroy(): void {
    this.seoService.clearJsonLd('jsonld-product');
    this.seoService.clearJsonLd('jsonld-breadcrumbs');
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // API
  // ─────────────────────────────────────────────────────────────────────────────

  private tryHydrateFromTransferState(id: number): boolean {
    if (!this.transferState.hasKey(SSR_PRODUCT_STATE_KEY)) {
      return false;
    }

    const payload = this.transferState.get<Roba | null>(SSR_PRODUCT_STATE_KEY, null);
    if (this.isBrowser) {
      this.transferState.remove(SSR_PRODUCT_STATE_KEY);
    }

    if (!payload) {
      return false;
    }

    const payloadId = Number((payload as any)?.robaid ?? (payload as any)?.robaId);
    if (!Number.isFinite(payloadId) || payloadId !== id) {
      return false;
    }

    const hydrated = Object.assign(new Roba(), payload);
    this.loading = false;
    this.handleProductLoad(hydrated);
    return true;
  }

  private handleProductLoad(response: Roba): void {
    this.pictureService.convertByteToImage(response);

    if (this.routeRef?.kind === 'TECDOC' && response.tecDocArticleId == null) {
      response.tecDocArticleId = this.routeRef.id;
    }

    this.data = response;
    this.shareLink = this.buildShareLink(response);
    this.shareTitle = this.buildShareTitle(response);
    this.fillDocumentation();
    this.fillOeNumbers();
    this.prepareSpecs(this.data);
    this.initializeLinkedTargets(this.data);
    this.setSanitizedText();

    const { idParam, url } = this.buildCanonical(this.data);
    this.updateSlugState(idParam);
    if (typeof (this.seoService as any).ensureCanonical === 'function') {
      (this.seoService as any).ensureCanonical(url);
    }

    this.updateSeoTags(this.data);
    this.applyOgImageMeta(this.data);
    this.loadShowcase(this.data);
    this.analytics.trackViewItem(
      this.data,
      this.accountStateService.get()
    );
    this.prefillInquiryFields();
    this.inquirySent = false;
    this.refreshSzakalRealtimeDetails();
  }

  fetchData(ref: { kind: 'ROBA' | 'TECDOC'; id: number; token: string }): void {
    this.loading = true;
    this.shareLink = null;
    this.shareTitle = '';

    const request$ =
      ref.kind === 'ROBA'
        ? this.robaService.fetchDetails(ref.id)
        : this.tecDocService.fetchTecDocRobaDetails(ref.id);

    request$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (response: Roba) => this.handleProductLoad(response),
        error: (err: HttpErrorResponse) => {
          console.error('fetchDetails error', err.error?.details || err.error);
        },
      });
  }

  private loadShowcase(roba: Roba): void {
    this.showcaseTakenIds.clear();
    this.showcaseDataCategories = [];
    this.showcaseDataManufactures = [];

    const hasImage = (a: Roba) => this.pictureService.hasImage(a?.slika);
    const uniqById = (list: Roba[]) => {
      const seen = new Set<number>();
      return list.filter(x => {
        const id = Number(x.robaid);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    };
    const pick = (list: Roba[], max = 5) =>
      uniqById(list)
        .filter(a => a.robaid !== roba.robaid)
        .filter(hasImage)
        .filter(a => !this.showcaseTakenIds.has(Number(a.robaid)))
        .map(item => {
          this.pictureService.convertByteToImage(item);
          return item;
        })
        .slice(0, max);

    // --- pripremi observables
    let cat$: Observable<Magacin | null> = of<Magacin | null>(null);
    if (roba.grupa && roba.podGrupa) {
      const f = new Filter();
      f.naStanju = true;
      f.paged = true;
      f.showcase = true;
      f.grupe = [roba.grupa];
      f.podgrupe = [String(roba.podGrupa)];
      cat$ = this.robaService.pronadjiSvuRobu(null, 10, 0, '', f).pipe(catchError(() => of(null)));
    }


    let brand$: Observable<Magacin | null> = of<Magacin | null>(null);
    if (roba?.proizvodjac?.proid || roba?.proizvodjac?.naziv) {
      const f = new Filter();
      // koristi ono što tvoj API očekuje:
      if (roba.proizvodjac?.proid) f.proizvodjaci = [roba.proizvodjac.proid];
      else f.proizvodjaci = [roba.proizvodjac!.naziv!];
      f.naStanju = true;
      f.paged = true;
      f.showcase = true;
      brand$ = this.robaService.pronadjiSvuRobu(null, 10, 0, '', f);
    }

    // --- paralelno povuci, pa deterministički obradi (kategorija -> brend)
    forkJoin({ cat: cat$, brand: brand$ })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ cat, brand }) => {
        // 1) KATEGORIJA
        if (cat?.robaDto?.content?.length) {
          const candidates = cat?.robaDto?.content as Roba[];
          const picked = pick(candidates, 5);
          picked.forEach(p => this.showcaseTakenIds.add(Number(p.robaid)));

          if (picked.length) {
            const titleUrl = this.urlHelperService.buildCategoryUrl(roba.grupaNaziv, roba.podGrupaNaziv);
            this.showcaseDataCategories = [{
              title: `Još iz kategorije: ${roba.podGrupaNaziv ?? roba.grupaNaziv}`,
              titleUrl,
              artikli: picked
            }];
            this.analytics.trackViewItemList(
              picked,
              'Related Category Items',
              this.accountStateService.get(),
              {
                list_context: 'related_category',
                base_item: roba.robaid,
              }
            );
          }
        }

        // 2) PROIZVOĐAČ
        if (brand?.robaDto?.content?.length) {
          const candidates = brand.robaDto.content as Roba[];
          const picked = pick(candidates, 5);
          picked.forEach(p => this.showcaseTakenIds.add(Number(p.robaid)));

          if (picked.length) {
            const titleUrl = `/webshop/manufacturers/${StringUtils.slugify(roba.proizvodjac!.naziv! ?? '')}`;
            this.showcaseDataManufactures = [{
              title: `Još od proizvođača: ${roba.proizvodjac?.naziv}`,
              titleUrl,
              artikli: picked
            }];
            this.analytics.trackViewItemList(
              picked,
              'Related Brand Items',
              this.accountStateService.get(),
              {
                list_context: 'related_brand',
                base_item: roba.robaid,
              }
            );
          }
        }
      });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UI actions
  // ─────────────────────────────────────────────────────────────────────────────

  openPdf(doc: TecDocDokumentacija) {
    if (!this.isBrowser) {
      return;
    }

    this.tecDocService
      .getDocumentBytes(doc.docId!)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: ArrayBuffer) => {
        if (res) {
          const blob = new Blob([res], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          window.open(url);
        }
      });
  }

  openLink(doc: TecDocDokumentacija) {
    if (!this.isBrowser) {
      return;
    }
    window.open(doc.docUrl!, '_blank');
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.id) return;

    const file = input.files[0];
    this.loading = true;
    this.robaService
      .uploadImage(this.id, file)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess('Image uploaded successfully');
          if (this.routeRef?.kind === 'ROBA') {
            this.fetchData(this.routeRef);
          }
        },
        error: () => {
          this.snackbarService.showError('Image upload failed');
        },
      });
  }

  removeAttributes(): void {
    if (!this.data?.robaid) {
      this.snackbarService.showError('Ova akcija je dostupna samo za interne artikle.');
      return;
    }
    this.robaService
      .removeTecDocAttributes(this.data.robaid!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess('Atributi uspešno izbrisani');
          this.showDeleteWarningPopup = false;
          this.refreshDetails();
        },
        error: () => {
          this.snackbarService.showError('Greška pri brisanju atributa');
          this.showDeleteWarningPopup = false;
        },
      });
  }

  removeImage(): void {
    if (!this.data?.robaid) {
      this.snackbarService.showError('Ova akcija je dostupna samo za interne artikle.');
      return;
    }
    this.robaService
      .removeImage(this.data.robaid!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess('Slika uspešno izbrisana');
          this.showImageDeleteWarningPopup = false;
          this.refreshDetails();
        },
        error: () => {
          this.snackbarService.showError('Greška pri brisanju slike');
          this.showImageDeleteWarningPopup = false;
        },
      });
  }

  private pickMainImage(roba: Roba): string {
    return this.collectProductImages(roba)[0] ?? this.absoluteImage(null);
  }

  saveTextDescription(): void {
    if (!this.data?.robaid) {
      this.snackbarService.showError('Ova akcija je dostupna samo za interne artikle.');
      return;
    }
    this.robaService
      .saveText(this.data.robaid!, this.data.tekst!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess('Opis uspešno sačuvan');
          this.editingText = false;
          this.refreshDetails();
        },
        error: () => {
          this.snackbarService.showError('Greška pri čuvanju opisa');
          this.editingText = false;
        },
      });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Mappers
  // ─────────────────────────────────────────────────────────────────────────────

  fillDocumentation(): void {
    this.documentationGroups = [];
    this.youTubeIds = [];

    if (!this.data.dokumentacija) {
      return;
    }

    const groups: DocumentationGroup[] = [];

    for (const [title, docs] of Object.entries(this.data.dokumentacija)) {
      const documents = (docs as TecDocDokumentacija[]).map((value) => {
        if (value.docFileTypeName?.toUpperCase().includes('URL') && value.docUrl) {
          const m = value.docUrl.match(
            /(?:youtube(?:-nocookie)?\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/
          );
          if (m && m[1]) {
            this.youTubeIds.push(m[1]);
            value.saniraniUrl = m[1];
          }
        }

        if (value.docFileTypeName?.toUpperCase().includes('JPEG') && value.dokument) {
          value.dokument = this.pictureService.toDataUrl(value.dokument, 'image/jpeg') ?? undefined;
        }

        return value;
      });

      groups.push({ title, documents });
    }

    this.documentationGroups = groups;
  }

  fillOeNumbers(): void {
    this.oeNumberEntries = [];
    if (!this.data.tdBrojevi?.length) {
      return;
    }

    const map = new Map<string, Set<string>>();

    this.data.tdBrojevi.forEach((v: RobaBrojevi) => {
      const code = v.fabrBroj;
      const producer = v.proizvodjac;
      if (!code || !producer) return;
      const set = map.get(code) ?? new Set<string>();
      set.add(producer);
      map.set(code, set);
    });

    this.oeNumberEntries = Array.from(map.entries()).map(([code, producers]) => ({
      code,
      labels: Array.from(producers.values()),
    }));
  }

  private initializeLinkedTargets(roba: Roba): void {
    const raw = Array.isArray(roba?.linkedManufacturers) ? roba.linkedManufacturers : [];
    const byId = new Map<number, TecDocLinkedManufacturerTargets>();
    const byName = new Map<string, TecDocLinkedManufacturerTargets>();

    raw.forEach((manufacturer: any) => {
      const id = Number(manufacturer?.linkingTargetId ?? Number.NaN);
      const name = this.normalizeWhitespace(manufacturer?.name);
      if (!name) return;

      if (Number.isFinite(id)) {
        if (!byId.has(id)) {
          byId.set(id, {
            manufacturerId: id,
            manufacturerName: name,
            models: [],
          });
        }
        return;
      }

      const key = name.toLowerCase();
      if (!byName.has(key)) {
        byName.set(key, {
          manufacturerId: undefined,
          manufacturerName: name,
          models: [],
        });
      }
    });

    const compare = (a: TecDocLinkedManufacturerTargets, b: TecDocLinkedManufacturerTargets) =>
      (a.manufacturerName || '').localeCompare(b.manufacturerName || '', 'sr', { sensitivity: 'base' });

    this.linkedTargets = [
      ...Array.from(byId.values()).sort(compare),
      ...Array.from(byName.values()).sort(compare),
    ];
  }

  onCompatibilityTargetsChange(targets: TecDocLinkedManufacturerTargets[]): void {
    this.linkedTargets = Array.isArray(targets) ? targets : [];
    this.updateSeoTags(this.data);
  }

  prepareSpecs(roba: Roba): void {
    const linkage = this.mapSpecs(roba.tdLinkageCriteria, 'linkage');
    const tehnicki = this.mapSpecs(roba.tehnickiOpis, 'tehnicki');

    this.allSpecs = [...linkage, ...tehnicki];
    this.hasSpecs = this.allSpecs.length > 0;
    this.specOverflow = Math.max(this.allSpecs.length - this.specDisplayLimit, 0);
    this.showAllSpecs = this.specOverflow === 0;
    this.syncDisplayedSpecs();
  }

  setSanitizedText(): void {
    if (this.data?.tekst) {
      const textWithBreaks = this.data.tekst.replace(/\n/g, '<br>');
      this.sanitizedText = this.sanitizer.bypassSecurityTrustHtml(textWithBreaks);
    } else {
      this.sanitizedText = '';
    }
  }

  getDocumentByKey(key: string): TecDocDokumentacija[] {
    return this.fetchDocument(key);
  }

  fetchDocument(key: string): TecDocDokumentacija[] {
    if (!this.data.dokumentacija) return [];
    for (const [k, list] of Object.entries(this.data.dokumentacija)) {
      if (k === key) return list as TecDocDokumentacija[];
    }
    return [];
  }

  toggleSpecs(): void {
    this.showAllSpecs = !this.showAllSpecs;
    this.syncDisplayedSpecs();
  }

  trackSpec(_: number, spec: SpecEntry): string {
    return spec.id;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cart / quantity
  // ─────────────────────────────────────────────────────────────────────────────

  modifyQuantity(quantity: number): void {
    const min = this.quantityMin;
    const step = this.quantityStep;
    const max = this.availableStock || min;
    const localQty = Math.max(0, Number(this.availabilityVm.provider.warehouseSplit.sabacQuantity) || 0);
    const isCombined = this.availabilityVm.provider.warehouseSplit.enabled;
    if (!Number.isFinite(quantity)) {
      this.quantity = min;
      return;
    }

    if (isCombined) {
      this.quantity = clampCombinedWarehouseQuantity({
        requestedQty: quantity,
        maxStock: max,
        localQty,
        provider: this.data?.providerAvailability,
        minQuantity: min,
      });
      return;
    }

    let next = quantity;
    if (next < min) next = min;
    else if (next > max) next = max;
    else next = quantity;
    next = Math.floor(next);
    if (step > 1) {
      next = Math.ceil(next / step) * step;
      if (next > max) next = max;
      if (next < min) next = min;
    }
    this.quantity = next;
  }

  addToShopingCart(): void {
    if (this.requiresLoginForOrder) {
      this.snackbarService.showError('Za ovaj artikal je potrebna prijava');
      return;
    }
    if (this.isOutOfStock) {
      this.snackbarService.showError('Artikal trenutno nije dostupan za poručivanje');
      return;
    }

    const providerKey = (this.data?.providerAvailability?.provider || '').toString().trim().toLowerCase();
    if (providerKey === 'szakal') {
      const token = this.data?.providerAvailability?.providerStockToken;
      const glid = this.data?.providerAvailability?.providerProductId;
      if (token || glid) {
        this.szakalStockService
          .check([{
            token,
            glid,
            quantity: this.quantity,
            brand: this.data?.proizvodjac?.proid,
            group: this.data?.grupa,
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
              this.applySzakalRealtime(this.data, result);
              this.cartStateService.addToCart(this.data, this.quantity);
              this.snackbarService.showSuccess('Artikal je dodat u korpu');
            },
            error: () => {
              this.snackbarService.showError('Provera dostupnosti nije uspela, pokušajte ponovo');
            },
          });
        return;
      }
    }

    this.cartStateService.addToCart(this.data, this.quantity);
    this.snackbarService.showSuccess('Artikal je dodat u korpu');
  }

  private refreshSzakalRealtimeDetails(): void {
    const providerKey = (this.data?.providerAvailability?.provider || '').toString().trim().toLowerCase();
    if (providerKey !== 'szakal') {
      return;
    }
    if (this.data?.providerAvailability?.realtimeChecked) {
      return;
    }
    const token = this.data?.providerAvailability?.providerStockToken;
    const glid = this.data?.providerAvailability?.providerProductId;
    if (!token && !glid) {
      return;
    }

    this.szakalStockService
      .check([{
        token,
        glid,
        quantity: Math.max(1, this.quantity || 1),
        brand: this.data?.proizvodjac?.proid,
        group: this.data?.grupa,
      }])
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          const result = Array.isArray(results) ? results[0] : null;
          this.applySzakalRealtime(this.data, result);
        },
      });
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

  get hasValidPrice(): boolean {
    return this.availabilityVm.hasValidPrice;
  }

  get displayPrice(): number {
    return this.availabilityVm.displayPrice;
  }

  get availabilityStatus(): AvailabilityStatus {
    return this.availabilityVm.status;
  }

  get availabilityLabel(): string {
    return this.availabilityVm.label;
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
      isOutOfStock: this.isOutOfStock,
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

  get isStaff(): boolean {
    return this.isAdmin || this.isEmployee;
  }

  get showProviderAvailability(): boolean {
    return this.availabilityVm.showProviderBox;
  }

  get showRealtimeCheckingHint(): boolean {
    const provider = this.data?.providerAvailability;
    const providerKey = (provider?.provider || '').toString().trim().toLowerCase();
    return providerKey === 'szakal' && !!provider?.realtimeChecking;
  }

  get providerDeliveryLabel(): string | null {
    return this.availabilityVm.provider.deliveryLabel;
  }

  get availableStock(): number {
    return this.availabilityVm.purchasableStock;
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

  get quantityMin(): number {
    if (!this.isProviderItem) {
      return 1;
    }
    return resolveMinOrderQuantity(this.data?.providerAvailability);
  }

  get totalPrice(): number {
    return this.displayPrice * (this.quantity || 0);
  }

  get isOutOfStock(): boolean {
    return this.availableStock <= 0;
  }

  get requiresLoginForOrder(): boolean {
    if (this.loggedIn) return false;
    const provider = this.data?.providerAvailability;
    if (!provider?.available) return false;
    return !!provider?.providerNoReturnable || (Number(provider?.coreCharge) || 0) > 0;
  }

  get inquiryContactTrim(): string {
    return (this.inquiryContact ?? '').trim();
  }

  onInquiryContactChange(value: string): void {
    this.inquiryContact = (value ?? '').trimStart();
  }

  onInquiryNoteChange(value: string): void {
    this.inquiryNote = value ?? '';
  }

  onInquiryPhoneChange(value: string): void {
    this.inquiryPhone = (value ?? '').trim();
  }

  sendInquiry(): void {
    const account = this.accountStateService.get();
    const contact = this.inquiryContactTrim || account?.email || '';
    if (!contact && !this.loggedIn) {
      this.snackbarService.showError('Unesi email da bismo te kontaktirali.');
      return;
    }
    if (contact && !this.isValidEmail(contact)) {
      this.snackbarService.showError('Unesi ispravan email.');
      return;
    }

    this.inquirySending = true;
    const payload = this.buildInquiryPayload(contact || null);

    this.emailService
      .posaljiPoruku(payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.inquirySending = false))
      )
      .subscribe({
        next: () => {
          this.inquirySent = true;
          this.snackbarService.showSuccess('Upit je poslat. Javićemo ti se uskoro.');
        },
        error: () => {
          this.snackbarService.showError('Slanje upita nije uspelo. Pokušaj ponovo.');
        }
      });
  }

  private prefillInquiryFields(): void {
    const account = this.accountStateService.get();
    if (!this.inquiryContact && account?.email) {
      this.inquiryContact = account.email;
    }
    if (!this.inquiryNote) {
      const name = this.data?.naziv ?? 'artikal';
      const kat = this.data?.katbr ? ` (kat.br. ${this.data.katbr})` : '';
      const manufacturer = this.data?.proizvodjac?.naziv ? ` | Proizvođač: ${this.data.proizvodjac.naziv}` : '';
      const idPart = this.data?.robaid ? ` | ID: ${this.data.robaid}` : '';
      this.inquiryNote = `Zanima me dostupnost / nabavka za ${name}${kat}${manufacturer}${idPart}.`;
    }
  }

  private buildInquiryPayload(contact: string | null) {
    const account = this.accountStateService.get();
    const note = this.inquiryNote?.trim();
    const phone = this.loggedIn ? undefined : this.inquiryPhone?.trim();
    const message = this.buildInquiryMessage(note, contact, account, phone);

    return {
      ime: account?.naziv || 'Web kupac',
      prezime: '',
      firma: account?.naziv || undefined,
      posta: contact || undefined,
      telefon: phone || undefined,
      poruka: message
    };
  }

  private buildInquiryMessage(
    note: string | undefined,
    contact: string | null,
    account: any,
    phone?: string | null
  ): string {
    const contactLine = contact
      ? `Email za odgovor: ${contact}`
      : this.loggedIn && account?.ppid
        ? `Email nije na nalogu (PPID: ${account.ppid})`
        : null;

    const parts = [
      'Upit za nabavku artikla',
      this.data?.naziv ? `${this.data.naziv}` : null,
      this.data?.proizvodjac?.naziv ? `Proizvođač: ${this.data.proizvodjac.naziv}` : null,
      this.data?.katbr ? `Kat.br: ${this.data.katbr}` : null,
      this.data?.robaid ? `ID: ${this.data.robaid}` : null,
      account?.naziv ? `Korisnik: ${account.naziv}` : null,
      account?.ppid ? `PPID: ${account.ppid}` : null,
      contactLine,
      phone ? `Telefon: ${phone}` : null,
      note ? `Napomena: ${note}` : null
    ].filter(Boolean);

    return parts.join(' | ');
  }

  private isValidEmail(value: string): boolean {
    const email = value?.trim();
    if (!email) {
      return false;
    }
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Admin actions
  // ─────────────────────────────────────────────────────────────────────────────

  triggerImageUpload(): void {
    if (!this.isBrowser) {
      return;
    }

    const input = document.getElementById('imageUpload') as HTMLInputElement | null;
    input?.click();
  }
  editAttributes(): void {
    this.showAddAttributes = true;
  }
  editDescription(): void {
    this.editingText = !this.editingText;
  }
  refreshDetails(): void {
    this.showAddAttributes = false;
    this.showDeleteWarningPopup = false;
    this.showImageDeleteWarningPopup = false;
    if (this.routeRef) {
      this.fetchData(this.routeRef);
    }
  }
  toggleTextEdit(): void {
    this.editingText = !this.editingText;
  }
  textChanged(event: string): void {
    this.data.tekst = event;
  }
  cancelTextEdit(): void {
    this.editingText = false;
  }

  shareProduct(): void {
    if (!this.shareLink || !this.isBrowser) {
      return;
    }

    const shareUrl = this.shareLink!;
    const sharePayload = {
      title: this.shareTitle,
      text: this.shareTitle,
      url: shareUrl,
    };

    const navigatorRef = typeof navigator !== 'undefined' ? (navigator as any) : null;
    if (navigatorRef && 'share' in navigatorRef) {
      this.copyShareLink(shareUrl, false);
      navigatorRef
        .share(sharePayload)
        .then(() => {
          this.snackbarService.showSuccess('Link je kopiran – možete ga nalepiti gde god želite.');
        })
        .catch((err: any) => {
          if (!err || err?.name === 'AbortError') {
            return;
          }
          this.copyShareLink(shareUrl);
        });
    } else {
      this.copyShareLink(shareUrl);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SEO helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private normalizeWhitespace(v: string | undefined | null): string {
    return (v ?? '').replace(/\s+/g, ' ').trim();
  }

  private getLinkedManufacturersSnippet(limit: number = 6): string {
    if (!this.linkedTargets?.length) {
      return '';
    }

    const uniqueNames: string[] = [];
    const seen = new Set<string>();
    this.linkedTargets.forEach((manufacturer) => {
      const name = this.normalizeWhitespace(manufacturer?.manufacturerName);
      if (!name) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      uniqueNames.push(name);
    });

    if (!uniqueNames.length) {
      return '';
    }

    const displayed = uniqueNames.slice(0, limit);
    const remainder = uniqueNames.length - displayed.length;
    let snippet = displayed.join(', ');
    if (remainder > 0) {
      snippet += ` i još ${remainder}`;
    }
    return snippet;
  }

  private copyShareLink(url: string, showMessage: boolean = true): void {
    if (!this.isBrowser) {
      return;
    }
    const navigatorRef = typeof navigator !== 'undefined' ? (navigator as any) : null;
    if (navigatorRef?.clipboard?.writeText) {
      navigatorRef.clipboard
        .writeText(url)
        .then(() => {
          if (showMessage) {
            this.snackbarService.showSuccess('Link za deljenje je kopiran u klipbord.');
          }
        })
        .catch(() => this.legacyCopyShare(url, showMessage));
    } else {
      this.legacyCopyShare(url, showMessage);
    }
  }

  private legacyCopyShare(url: string, showMessage: boolean = true): void {
    if (!this.isBrowser || typeof document === 'undefined') {
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      const successful = document.execCommand('copy');
      if (showMessage) {
        if (successful) {
          this.snackbarService.showSuccess('Link za deljenje je kopiran u klipbord.');
        } else {
          this.snackbarService.showError('Link nije moguće kopirati. Pokušajte ručno.');
        }
      }
    } catch {
      if (showMessage) {
        this.snackbarService.showError('Link nije moguće kopirati. Pokušajte ručno.');
      }
    } finally {
      document.body.removeChild(textarea);
    }
  }

  private buildShareTitle(roba: Roba): string {
    const brand = this.normalizeWhitespace(roba?.proizvodjac?.naziv);
    const name = this.normalizeWhitespace(roba?.naziv);
    const sku = this.normalizeWhitespace(roba?.katbr);
    const baseTitle = [brand, name].filter(Boolean).join(' ').trim();
    if (baseTitle && sku) {
      return `${baseTitle} (${sku})`;
    }
    return baseTitle || sku || 'Automaterijal proizvod';
  }

  private buildShareLink(roba: Roba): string | null {
    const id = roba?.robaid;
    if (!id) {
      return null;
    }
    const origin = this.getShareOrigin();
    return `${origin}/share/webshop/${id}`;
  }

  private getShareOrigin(): string {
    if (environment.production) {
      return SITE_ORIGIN;
    }

    if (this.isBrowser && typeof window !== 'undefined' && window.location?.origin) {
      const origin = window.location.origin;
      if (!origin.includes('localhost:4200')) {
        return origin;
      }
    }

    const apiBase = (environment.apiUrl || '').replace(/\/$/, '');
    return apiBase || SITE_ORIGIN;
  }

  private syncDisplayedSpecs(): void {
    this.displayedSpecs = this.showAllSpecs
      ? this.allSpecs
      : this.allSpecs.slice(0, this.specDisplayLimit);
  }

  private mapSpecs(list: unknown, source: string): SpecEntry[] {
    if (!Array.isArray(list)) {
      return [];
    }

    const seen = new Set<string>();
    const specs: SpecEntry[] = [];

    list.forEach((item: any, index: number) => {
      const rawName = item?.oznaka ?? item?.naziv ?? item?.label;
      const rawValue = item?.vrednost ?? item?.value ?? item?.opis ?? item?.text;
      const rawUnit = item?.jedinica ?? item?.unit;
      const type = String(item?.type ?? item?.oznakaTip ?? '').toUpperCase();

      const name = this.normalizeWhitespace(
        typeof rawName === 'number' ? String(rawName) : rawName
      );
      const value = this.normalizeWhitespace(
        typeof rawValue === 'number' ? String(rawValue) : rawValue
      );
      const unit = this.normalizeWhitespace(
        typeof rawUnit === 'number' ? String(rawUnit) : rawUnit
      );

      if (!name && !value) {
        return;
      }

      const key = `${name}|${value}|${unit}`.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);

      specs.push({
        id: `${source}-${index}-${key || 'spec'}`,
        oznaka: name || 'Specifikacija',
        vrednost: value || (unit ? unit : '—'),
        ...(unit ? { jedinica: unit } : {}),
        highlight: type === 'A',
      });
    });

    return specs;
  }

  private buildCanonical(roba: Roba): { idParam: string; url: string } {
    const id =
      roba.robaid != null
        ? String(roba.robaid)
        : roba.tecDocArticleId != null
          ? `td${roba.tecDocArticleId}`
          : '';
    const slug = this.buildSlug(roba);
    const idParam = slug ? `${id}-${slug}` : String(id);
    const url = `https://automaterijal.com/webshop/${idParam}`;
    return { idParam, url };
  }

  private buildSlug(roba: Roba): string {
    const brand = this.normalizeWhitespace(roba.proizvodjac?.naziv);
    const name = this.normalizeWhitespace(roba.naziv);
    const sku = this.normalizeWhitespace(roba.katbr);

    if (!sku) {
      return '';
    }

    return StringUtils.productSlug(brand, name, sku);
  }

  private isThin(roba: Roba): boolean {
    const hasImg = this.pictureService.hasImage(roba.slika) || !!roba.proizvodjacLogo;
    const hasPrice = typeof roba.cena === 'number' && roba.cena > 0;
    const hasSpecs = !!roba.tehnickiOpis?.length;
    const hasText = !!(roba.tekst && roba.tekst.trim().length > 0);
    return !(hasImg || hasPrice || hasSpecs || hasText);
  }

  private absoluteImage(candidate?: string | null): string {
    const logoFallback = 'https://automaterijal.com/images/logo/logo.svg';
    if (!candidate) return logoFallback;
    if (candidate.startsWith('http')) return candidate;
    // data:image... is allowed in <img>, ali za og:image je bolje absolutni URL;
    // ako je data URL ili relativno prazno → vrati fallback logo:
    if (candidate.startsWith('data:') || candidate === '') return logoFallback;
    return `https://automaterijal.com/${candidate.replace(/^\/?/, '')}`;
  }

  private collectProductImages(roba: Roba): string[] {
    const urls = new Set<string>();

    const addImage = (candidate?: string | null) => {
      const normalised = this.normalizeStructuredImageUrl(candidate);
      if (
        normalised &&
        this.pictureService.hasImage({ slikeUrl: normalised, isUrl: true } as Slika)
      ) {
        urls.add(normalised);
      }
    };

    if (this.pictureService.hasImage(roba.slika)) {
      addImage(roba.slika?.slikeUrl ?? null);
    }

    const gallery = (roba as any)?.slikeUrls;
    if (Array.isArray(gallery)) {
      gallery.forEach((url: unknown) => {
        addImage(typeof url === 'string' ? url : null);
      });
    }

    const slikaGallery = (roba.slika as any)?.galerija;
    if (Array.isArray(slikaGallery)) {
      slikaGallery.forEach((url: unknown) => {
        addImage(typeof url === 'string' ? url : null);
      });
    }

    const logoCandidate = typeof roba.proizvodjacLogo === 'string' ? roba.proizvodjacLogo : null;
    if (logoCandidate) {
      addImage(logoCandidate);
    }

    if (!urls.size) {
      urls.add(this.absoluteImage(null));
    }

    return Array.from(urls);
  }

  private normalizeStructuredImageUrl(candidate?: string | null): string | null {
    if (!candidate) return null;
    const trimmed = candidate.trim();
    if (!trimmed || trimmed.startsWith('data:')) return null;
    return this.absoluteImage(trimmed);
  }

  private buildAdditionalProperties(roba: Roba): any[] {
    const props: any[] = [];
    const specProperties = this.collectStructuredSpecs(roba);

    for (const { name, value } of specProperties) {
      props.push({
        '@type': 'PropertyValue',
        name,
        value,
      });
    }

    // OE brojevi kao jedan property (ili više, ali ovde grupujemo)
    if (this.oeNumberEntries.length > 0) {
      const joined = this.oeNumberEntries
        .map((entry) => {
          const labels = entry.labels.length ? ` (${entry.labels.join(', ')})` : '';
          return `${entry.code}${labels}`;
        })
        .join(' | ');
      props.push({
        '@type': 'PropertyValue',
        name: 'OE / OEM brojevi',
        value: joined.slice(0, 5000), // safety cutoff
      });
    }

    if (this.linkedTargets.length > 0) {
      const manufacturerList = this.linkedTargets
        .map((m) => this.normalizeWhitespace(m.manufacturerName))
        .filter(Boolean)
        .join(', ');
      if (manufacturerList) {
        props.push({
          '@type': 'PropertyValue',
          name: 'Kompatibilni proizvođači',
          value: manufacturerList.slice(0, 5000),
        });
      }
    }
    return props;
  }

  private collectStructuredSpecs(roba: Roba): Array<{ name: string; value: string }> {
    const specs: Array<{ name: string; value: string }> = [];
    const seen = new Set<string>();
    const invalidTokens = new Set(['—', '-', '–', 'n/a', 'nije dostupno']);

    const mergeSources = (
      source: RobaTehnickiOpis[] | undefined
    ): RobaTehnickiOpis[] => (Array.isArray(source) ? source : []);

    const sources: RobaTehnickiOpis[] = [
      ...mergeSources(roba.tehnickiOpis),
      ...mergeSources(roba.tdLinkageCriteria),
    ];

    sources.forEach((item) => {
      if (!item) {
        return;
      }

      const name = this.normalizeWhitespace(
        typeof item.oznaka === 'number' ? String(item.oznaka) : item.oznaka
      );

      const valueRaw = this.normalizeWhitespace(
        typeof item.vrednost === 'number' ? String(item.vrednost) : item.vrednost
      );

      if (!name || !valueRaw) {
        return;
      }

      const unit = this.normalizeWhitespace(
        typeof item.jedinica === 'number' ? String(item.jedinica) : item.jedinica
      );

      const lowerValue = valueRaw.toLowerCase();
      if (invalidTokens.has(lowerValue)) {
        return;
      }

      const valueWithUnit = unit && !lowerValue.includes(unit.toLowerCase())
        ? `${valueRaw} ${unit}`.trim()
        : valueRaw;

      if (!valueWithUnit) {
        return;
      }

      const normalizedValue = valueWithUnit.trim();
      if (!normalizedValue || invalidTokens.has(normalizedValue.toLowerCase())) {
        return;
      }

      const key = `${name}|${normalizedValue}`.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      specs.push({ name, value: normalizedValue });
    });

    return specs;
  }

  private buildRelatedProducts(roba: Roba): any[] | undefined {
    if (!roba.asociraniArtikli?.length) return undefined;
    const related = roba.asociraniArtikli.slice(0, 10).map((r) => {
      this.pictureService.convertByteToImage(r);
      const brand = this.normalizeWhitespace(r.proizvodjac?.naziv);
      const name = this.normalizeWhitespace(r.naziv);
      const sku = this.normalizeWhitespace(r.katbr);
      const id = r.robaid ?? '';
      const slug = this.buildSlug(r);
      const url = `https://automaterijal.com/webshop/${id}${slug ? '-' + slug : ''}`;
      const img = this.absoluteImage(r.slika?.slikeUrl);
      return {
        '@type': 'Product',
        name: [brand, name].filter(Boolean).join(' ') || name || brand || 'Proizvod',
        sku: sku || String(id),
        url,
        ...(img ? { image: img } : {}),
        ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
      };
    });
    return related.length ? related : undefined;
  }

  private resolvePrice(roba: Roba): number | undefined {
    const raw = roba.cena as unknown;
    if (typeof raw === 'number') {
      return Number.isFinite(raw) ? raw : undefined;
    }
    if (typeof raw === 'string') {
      const normalized = Number(raw.replace(',', '.'));
      return Number.isFinite(normalized) ? normalized : undefined;
    }
    return undefined;
  }

  private buildOffer(roba: Roba, price: number | undefined, inStock: boolean, url: string) {
    if (price === undefined) {
      return undefined;
    }
    const currency = this.normalizeWhitespace((roba as any)?.valuta) || 'RSD';
    const offer: any = {
      '@type': 'Offer',
      priceCurrency: currency,
      url,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Automaterijal' },
    };

    if (typeof price === 'number') {
      offer.price = Number(price.toFixed(2));
    }

    return offer;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SEO main
  // ─────────────────────────────────────────────────────────────────────────────

  private buildOgImageAlt(roba: Roba): string {
    const brand = this.normalizeWhitespace(roba.proizvodjac?.naziv);
    const name = this.normalizeWhitespace(roba.naziv);
    const sku = this.normalizeWhitespace(roba.katbr);
    const base = [brand, name, sku ? `(kat. ${sku})` : ''].filter(Boolean).join(' ');
    return base || 'Automaterijal proizvod';
  }

  private applyOgImageMeta(roba: Roba): void {
    const imageMeta: ProductImageMeta = this.pictureService.buildProductImageMeta(roba);
    const url = this.absoluteImage(imageMeta?.src ?? null);
    const alt = this.normalizeWhitespace(imageMeta?.alt) || this.buildOgImageAlt(roba);

    this.seoService.setOgImageMeta({
      url,
      alt,
    });
  }

  private updateSeoTags(roba: Roba): void {
    const brand = this.normalizeWhitespace(roba.proizvodjac?.naziv);
    const name = this.normalizeWhitespace(roba.naziv);
    const sku = this.normalizeWhitespace(roba.katbr);       // merchant SKU
    const mpn = this.normalizeWhitespace(roba.katbrpro);    // manufacturer part number
    const id = roba.robaid ?? '';
    const price = this.resolvePrice(roba);
    const inStock = (roba.stanje ?? 0) > 0;
    const group = this.normalizeWhitespace(roba.grupaNaziv);
    const subgroup = this.normalizeWhitespace(roba.podGrupaNaziv);

    // Title
    const baseTitle = [brand, name].filter(Boolean).join(' ');
    const title = sku ? `${baseTitle} (${sku}) | Automaterijal` : `${baseTitle} | Automaterijal`;

    const description = this.buildMetaDescription({
      brand,
      name,
      sku,
      group,
      subgroup,
      inStock,
      tekst: roba.tekst,
      specs: roba.tehnickiOpis || [],
      linkedManufacturers: this.getLinkedManufacturersSnippet(),
    });

    const { url } = this.buildCanonical(roba);

    const images = this.collectProductImages(roba);
    const ogImage = images[0];

    const ogImageAlt = this.buildOgImageAlt(roba);

    // Robots (index thin=off)
    let robots = this.isThin(roba) ? 'noindex, follow' : 'index, follow';
    if (hasActiveFilterQuery(this.route.snapshot.queryParams)) {
      robots = 'noindex, follow';
    }
    if (!this.slugMatchesCanonical) {
      robots = 'noindex, follow';
    }
    robots = normalizeRobotsTag(robots);

    // Update metas & canonical
    this.seoService.updateSeoTags({
      title,
      description,
      url,
      type: 'product',
      image: ogImage,
      siteName: 'Automaterijal',
      locale: 'sr_RS',
      imageAlt: ogImageAlt,
      robots,
      canonical: url,
    });

    // Optionally preload the main image if service supports it
    if (typeof (this.seoService as any).preloadImage === 'function') {
      (this.seoService as any).preloadImage(ogImage);
    }

    // Build JSON-LD Product
    const additionalProps = this.buildAdditionalProperties(roba);
    const related = this.buildRelatedProducts(roba);

    const offer = this.buildOffer(roba, price, inStock, url);

    const productJsonLd: any = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: baseTitle || name || brand || 'Proizvod',
      sku: sku || String(id),
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': url,
      },
      ...(mpn ? { mpn } : {}),
      ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
      image: images,
      url,
      description: description || `${brand} ${name}`,
      ...(additionalProps.length ? { additionalProperty: additionalProps } : {}),
      ...(related ? { isRelatedTo: related } : {}),
      ...(offer ? { offers: offer } : {}),
    };
    this.seoService.updateJsonLd(productJsonLd, 'jsonld-product');

    // Build JSON-LD Breadcrumbs (Webshop → Grupa → Podgrupa → Proizvod)
    const base = 'https://automaterijal.com';
    const items: any[] = [
      { '@type': 'ListItem', position: 1, name: 'Webshop', item: `${base}/webshop` },
    ];
    if (group) {
      items.push({
        '@type': 'ListItem',
        position: items.length + 1,
        name: group,
        item: `${base}/webshop?grupa=${encodeURIComponent(group)}`,
      });
    }
    if (subgroup) {
      items.push({
        '@type': 'ListItem',
        position: items.length + 1,
        name: subgroup,
        item: `${base}/webshop?grupa=${encodeURIComponent(group || '')}&podgrupa=${encodeURIComponent(subgroup)}`,
      });
    }
    items.push({
      '@type': 'ListItem',
      position: items.length + 1,
      name: baseTitle || name || 'Proizvod',
      item: url,
    });

    const breadcrumbsJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items,
    };
    this.seoService.updateJsonLd(breadcrumbsJsonLd, 'jsonld-breadcrumbs');
  }

  get primaryImageMeta(): ProductImageMeta {
    return this.pictureService.buildProductImageMeta(this.data ?? null);
  }

  getPrimaryImageSrc(): string {
    return this.primaryImageMeta.src;
  }

  getPrimaryImageAlt(): string {
    return this.primaryImageMeta.alt;
  }

  getPrimaryImageTitle(): string {
    return this.primaryImageMeta.title;
  }

  private updateSlugState(idParam: string): void {
    const canonicalSlug = this.extractSlug(idParam);
    if (!canonicalSlug) {
      this.slugMatchesCanonical = true;
      return;
    }

    const currentSlug = this.routeSlug;
    this.slugMatchesCanonical = currentSlug === canonicalSlug;

    if (!this.slugMatchesCanonical && typeof window !== 'undefined') {
      const targetPath = `/webshop/${idParam}`;
      const search = window.location.search || '';
      const targetUrl = `${targetPath}${search}`;
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl !== targetUrl) {
        window.location.replace(targetUrl);
      }
    }
  }

  private extractSlug(raw: string | null): string | null {
    if (!raw) return null;
    const dashIndex = raw.indexOf('-');
    if (dashIndex === -1) return null;
    const slug = raw.slice(dashIndex + 1).trim();
    return slug.length ? slug : null;
  }

  private applyRouteCanonical(raw: string | null): void {
    if (!raw) {
      return;
    }

    const ref = this.parseRouteRef(raw);
    if (!ref) {
      return;
    }

    const slug = this.extractSlug(raw);
    const idParam = slug ? `${ref.token}-${slug}` : ref.token;
    const canonical = `https://automaterijal.com/webshop/${idParam}`;
    this.seoService.setCanonicalUrl(canonical);
    this.seoService.setRobots('noindex, follow');
  }

  private parseRouteRef(raw: string | null): { kind: 'ROBA' | 'TECDOC'; id: number; token: string } | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // TecDoc: `td<digits>[-slug]`
    const td = trimmed.match(/^td(\d+)/i);
    if (td && td[1]) {
      const id = Number(td[1]);
      return Number.isFinite(id) ? { kind: 'TECDOC', id, token: `td${id}` } : null;
    }

    // Internal roba: `<digits>[-slug]`
    const m = trimmed.match(/^(\d+)/);
    if (!m || !m[1]) return null;
    const id = Number(m[1]);
    return Number.isFinite(id) ? { kind: 'ROBA', id, token: String(id) } : null;
  }



  private buildMetaDescription(input: {
    brand?: string;
    name?: string;
    sku?: string;
    group?: string;
    subgroup?: string;
    inStock: boolean;
    tekst?: string | null;
    specs: { oznaka?: string | null; vrednost?: string | null; jedinica?: string | null }[];
    linkedManufacturers?: string;
  }): string {
    const { brand, name, sku, group, subgroup, inStock, tekst, specs, linkedManufacturers } = input;
    const groupLine = [group, subgroup].filter(Boolean).join(' › ');

    const specsSnippet = (specs || [])
      .slice(0, 3)
      .map((s) =>
        [s.oznaka, s.vrednost, s.jedinica ? `(${s.jedinica})` : '']
          .filter(Boolean)
          .join(' ')
      )
      .filter(Boolean)
      .join(' · ');

    const base = [brand, name].filter(Boolean).join(' ');
    const skuPart = sku ? ` (${sku})` : '';
    const stockPart = inStock ? 'Na stanju, isporuka 1–2 dana.' : 'Proverite dostupnost.';

    // Kompatibilnost: uzmi prva 3 brenda i skrati
    let compat = '';
    if (linkedManufacturers) {
      const parts = linkedManufacturers
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      const unique = Array.from(new Set(parts)).sort((a, b) => a.localeCompare(b));
      if (unique.length) {
        const limit = 4;
        const sliced = unique.slice(0, limit);
        const shortList = unique.length > limit ? `${sliced.join(', ')} i dr.` : sliced.join(', ');
        compat = `Kompatibilno: ${shortList}.`;
      }
    }

    const descCandidates = [
      tekst?.trim(),
      `${base || name || 'Proizvod'}${skuPart}. ${stockPart} ${groupLine ? groupLine + '. ' : ''}${compat}`,
      `${base}${skuPart} — ${groupLine || 'auto deo'}. ${stockPart}`,
      specsSnippet,
    ].filter(Boolean) as string[];

    let description =
      descCandidates[0] ||
      descCandidates[1] ||
      descCandidates[2] ||
      descCandidates[3] ||
      '';

    if (linkedManufacturers && description.length < 140) {
      description = `${description.replace(/[.?!]+$/, '')}. Kompatibilno: ${linkedManufacturers}.`;
    }

    description = this.normalizeWhitespace(description).slice(0, 158);
    return description;
  }
}
