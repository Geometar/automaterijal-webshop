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
import { catchError, finalize, forkJoin, Observable, of, Subject, takeUntil } from 'rxjs';
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
  TecDocLinkedManufacturer,
  TecDocLinkedManufacturerTargets,
  TecDocLinkedModel,
  TecDocLinkedVariant,
} from '../../../shared/data-models/model/roba';
import { Slika } from '../../../shared/data-models/model/slika';
import { TooltipModel } from '../../../shared/data-models/interface';
import { ShowcaseComponent, ShowcaseSection } from '../../../shared/components/showcase/showcase.component';

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
import { YouTubePlayer } from '@angular/youtube-player';

// Services
import { AccountStateService } from '../../../shared/service/state/account-state.service';
import { AnalyticsService } from '../../../shared/service/analytics.service';
import { CartStateService } from '../../../shared/service/state/cart-state.service';
import { environment } from '../../../../environment/environment';
import { PictureService, ProductImageMeta } from '../../../shared/service/utils/picture.service';
import { RobaService } from '../../../shared/service/roba.service';
import { SeoService } from '../../../shared/service/seo.service';
import { SnackbarService } from '../../../shared/service/utils/snackbar.service';
import { TecdocService } from '../../../shared/service/tecdoc.service';
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';

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
    InputFieldsComponent,
    PopupComponent,
    RouterLink,
    RsdCurrencyPipe,
    SpinnerComponent,
    TextAreaComponent,
    YouTubePlayer,
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
  data: Roba = new Roba();

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  // Misc
  editingText = false;
  isAdmin = false;
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
  pdfToolTip: TooltipModel = {
    position: TooltipPositionEnum.TOP,
    subPosition: TooltipSubPositionsEnum.SUB_CENTER,
    theme: TooltipThemeEnum.DARK,
    tooltipText: 'PDF Document',
    type: TooltipTypesEnum.TEXT,
  };

  // Data
  documentKeys: string[] = [];
  oeNumbers: Map<string, string[]> = new Map();
  flatManufacturers: TecDocLinkedManufacturer[] = [];
  linkedTargets: TecDocLinkedManufacturerTargets[] = [];
  linkedTargetsLoading = false;
  private readonly collator: Intl.Collator | null =
    typeof Intl !== 'undefined' ? new Intl.Collator('sr', { sensitivity: 'base' }) : null;
  private manufacturerDetails = new Map<number, TecDocLinkedManufacturerTargets>();
  private filteredDetails = new Map<number, TecDocLinkedManufacturerTargets>();
  private expandedManufacturers = new Set<number>();
  private expandedModels = new Set<string>();
  private detailedTargetsLoaded = false;
  private requestedDetailedTargets = false;
  compatibilitySearchTerm = '';
  private displayedManufacturers: TecDocLinkedManufacturer[] = [];
  showcaseDataCategories: ShowcaseSection[] = [];
  showcaseDataManufactures: ShowcaseSection[] = [];
  youTubeIds: string[] = [];
  private showcaseTakenIds = new Set<number>();
  private routeSlug: string | null = null;
  private slugMatchesCanonical = true;
  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
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
    private pictureService: PictureService,
    private robaService: RobaService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private seoService: SeoService,
    private transferState: TransferState,
    private snackbarService: SnackbarService,
    private tecDocService: TecdocService,
    private urlHelperService: UrlHelperService,
    private analytics: AnalyticsService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) { }

  // ─────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        map((params) => params.get('id')),
        distinctUntilChanged()
      )
      .subscribe((raw) => {
        this.routeSlug = this.extractSlug(raw);
        this.applyRouteCanonical(raw);
        this.id = this.parseId(raw);
        if (this.id) {
          const hydrated = this.tryHydrateFromTransferState(this.id);
          if (!hydrated) {
            this.fetchData(this.id);
          }
        } else {
          console.warn('Nevažeći ID u ruti:', raw);
        }
      });

    this.isAdmin = this.accountStateService.isAdmin();
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

    this.manufacturerDetails.clear();
    this.expandedManufacturers.clear();
    this.expandedModels.clear();
    this.detailedTargetsLoaded = false;
    this.compatibilitySearchTerm = '';
    this.requestedDetailedTargets = false;

    this.data = response;
    this.shareLink = this.buildShareLink(response);
    this.shareTitle = this.buildShareTitle(response);
    this.fillDocumentation();
    this.fillOeNumbers();
    this.prepareSpecs(this.data);
    this.prepareLinkedTargets(this.data);
    this.fetchLinkedTargets(this.data);
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
  }

  fetchData(id: number): void {
    this.loading = true;
    this.shareLink = null;
    this.shareTitle = '';
    this.robaService
      .fetchDetails(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (response: Roba) => {
          this.handleProductLoad(response);
        },
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

  private fetchLinkedTargets(roba: Roba): void {
    if (!Number.isFinite(Number(roba?.robaid)) || this.requestedDetailedTargets) {
      return;
    }

    const id = Number(roba.robaid);
    this.requestedDetailedTargets = true;
    this.linkedTargetsLoading = true;

    this.tecDocService
      .getArticleLinkedTargets(id, 'VOLB')
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.linkedTargetsLoading = false;
          this.requestedDetailedTargets = false;
        })
      )
      .subscribe({
        next: (targets: TecDocLinkedManufacturerTargets[]) => {
          if (Array.isArray(targets) && targets.length) {
            this.applyDetailedTargets(targets);
            this.detailedTargetsLoaded = true;
            this.updateSeoTags(this.data);
          } else {
            this.detailedTargetsLoaded = true;
          }
        },
        error: (err) => {
          console.error('getArticleLinkedTargets error', err);
          this.detailedTargetsLoaded = false;
        },
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
          this.fetchData(this.id!);
        },
        error: () => {
          this.snackbarService.showError('Image upload failed');
        },
      });
  }

  removeAttributes(): void {
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

  fillDocumentation() {
    this.documentKeys = [];
    this.youTubeIds = [];

    if (!this.data.dokumentacija) return;

    for (const [key, docs] of Object.entries(this.data.dokumentacija)) {
      this.documentKeys.push(key);
      (docs as TecDocDokumentacija[]).forEach((value) => {
        // capture YouTube IDs for VideoObject
        if (
          value.docFileTypeName?.toUpperCase().includes('URL') &&
          value.docUrl
        ) {
          const m = value.docUrl.match(
            /(?:youtube(?:-nocookie)?\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/
          );
          if (m && m[1]) {
            this.youTubeIds.push(m[1]);
            value.saniraniUrl = m[1];
          };
        }
        // convert JPEG bytes for inline display
        if (
          value.docFileTypeName?.toUpperCase().includes('JPEG') &&
          value.dokument
        ) {
          value.dokument = this.pictureService.toDataUrl(value.dokument, 'image/jpeg') ?? undefined;
        }
      });
    }
  }

  fillOeNumbers(): void {
    this.oeNumbers.clear();
    if (!this.data.tdBrojevi?.length) return;

    this.data.tdBrojevi.forEach((v: RobaBrojevi) => {
      const list = this.oeNumbers.get(v.fabrBroj!) ?? [];
      list.push(v.proizvodjac!);
      this.oeNumbers.set(v.fabrBroj!, list);
    });
  }

  prepareLinkedTargets(roba: Roba): void {
    const raw = Array.isArray(roba?.linkedManufacturers)
      ? (roba.linkedManufacturers as TecDocLinkedManufacturer[])
      : [];

    const collator = this.getCollator();

    const unique = new Map<number, TecDocLinkedManufacturer>();
    raw
      .map((manufacturer) => {
        const id = Number((manufacturer as any)?.linkingTargetId ?? Number.NaN);
        const name = this.normalizeWhitespace((manufacturer as any)?.name ?? '');
        if (!Number.isFinite(id) || !name) {
          return null;
        }
        return { linkingTargetId: id, name };
      })
      .filter((item): item is TecDocLinkedManufacturer => !!item)
      .forEach((item) => unique.set(item.linkingTargetId, item));

    this.flatManufacturers = Array.from(unique.values()).sort((a, b) => {
      if (collator) {
        return collator.compare(a.name, b.name);
      }
      return a.name.localeCompare(b.name);
    });

    this.filteredDetails.clear();
    this.rebuildLinkedTargets();
    this.handleSearchFilters(false);
  }

  get filteredManufacturers(): TecDocLinkedManufacturer[] {
    return this.displayedManufacturers;
  }

  get manufacturerSearchSummary(): string {
    return this.compatibilitySearchTerm.trim();
  }

  setCompatibilitySearch(term: any): void {
    this.compatibilitySearchTerm =
      typeof term === 'string' ? term : term != null ? String(term) : '';
    this.handleSearchFilters();
  }

  onCompatibilityInput(raw: any): void {
    if (raw && typeof raw === 'object' && 'target' in raw) {
      const value = (raw.target as HTMLInputElement | null)?.value ?? '';
      this.setCompatibilitySearch(value);
    } else {
      this.setCompatibilitySearch(raw);
    }
  }

  private filterManufacturers(term: string): TecDocLinkedManufacturer[] {
    const tokens = this.buildSearchTokens(term);
    this.filteredDetails.clear();

    if (!tokens.length) {
      return this.flatManufacturers;
    }

    const result: TecDocLinkedManufacturer[] = [];

    this.flatManufacturers.forEach((manufacturer) => {
      const id = Number(manufacturer.linkingTargetId ?? Number.NaN);
      const detail = Number.isFinite(id) ? this.manufacturerDetails.get(id) : undefined;

      if (detail) {
        const filteredDetail = this.filterDetail(detail, tokens, manufacturer.name, id);
        if (filteredDetail) {
          const resolvedId = Number.isFinite(filteredDetail.manufacturerId ?? Number.NaN)
            ? (filteredDetail.manufacturerId as number)
            : id;
          this.filteredDetails.set(resolvedId, {
            ...filteredDetail,
            manufacturerId: resolvedId,
          });
          result.push(manufacturer);
        }
      } else {
        if (!tokens.length) {
          result.push(manufacturer);
          return;
        }

        const brandName = this.normalizeWhitespace(manufacturer.name).toLowerCase();
        const canMatchBrand = tokens.every((token) => brandName.includes(token));

        if (canMatchBrand || !this.detailedTargetsLoaded) {
          result.push(manufacturer);
        }
      }
    });

    return result;
  }

  private handleSearchFilters(requestDetails: boolean = true): void {
    const tokens = this.buildSearchTokens(this.compatibilitySearchTerm);

    if (
      requestDetails &&
      tokens.length &&
      !this.detailedTargetsLoaded &&
      !this.requestedDetailedTargets
    ) {
      this.fetchLinkedTargets(this.data);
    }

    const filtered = tokens.length ? this.filterManufacturers(this.compatibilitySearchTerm) : this.flatManufacturers;
    this.displayedManufacturers = filtered;
    const hasFilter = tokens.length > 0;

    if (hasFilter) {
      const ids = new Set<number>();
      const expandedModelKeys = new Set<string>();

      filtered.forEach((item) => {
        const id = Number(item.linkingTargetId ?? Number.NaN);
        if (!Number.isFinite(id)) return;
        ids.add(id);

        const detail =
          this.filteredDetails.get(id) ??
          (this.manufacturerDetails.has(id)
            ? this.filterDetail(this.manufacturerDetails.get(id)!, tokens, item.name, id)
            : null);

        if (!detail?.models) return;
        detail.models.forEach((model) => {
          const key = this.buildModelKey(id, model);
          if (key) {
            expandedModelKeys.add(key);
          }
        });
      });

      this.expandedManufacturers = ids;
      this.expandedModels = expandedModelKeys;
    } else {
      this.filteredDetails.clear();
      this.expandedManufacturers = new Set<number>();
      this.expandedModels = new Set<string>();
    }
  }

  private getCollator(): Intl.Collator | null {
    return this.collator;
  }

  private filterDetail(
    detail: TecDocLinkedManufacturerTargets | null,
    tokens: string[],
    manufacturerName: string,
    manufacturerId?: number
  ): TecDocLinkedManufacturerTargets | null {
    if (!detail) {
      return null;
    }
    if (!tokens.length) {
      return detail;
    }

    const filteredModels: TecDocLinkedModel[] = [];
    const models = Array.isArray(detail.models) ? detail.models : [];

    models.forEach((model) => {
      const variants = Array.isArray(model.variants) ? model.variants : [];
      const filteredVariants = variants.filter((variant) =>
        this.variantMatchesTokens(manufacturerName, model, variant, tokens)
      );

      if (filteredVariants.length) {
        filteredModels.push({
          ...model,
          variants: filteredVariants,
        });
      }
    });

    if (!filteredModels.length) {
      return null;
    }

    const resolvedIdCandidate = Number(detail.manufacturerId ?? manufacturerId ?? Number.NaN);
    const resolvedId = Number.isFinite(resolvedIdCandidate) ? resolvedIdCandidate : manufacturerId;

    return {
      ...detail,
      manufacturerId: resolvedId,
      manufacturerName: detail.manufacturerName ?? manufacturerName,
      models: filteredModels,
    };
  }

  private variantMatchesTokens(
    manufacturerName: string,
    model: TecDocLinkedModel,
    variant: TecDocLinkedVariant,
    tokens: string[]
  ): boolean {
    const combined = [
      this.normalizeWhitespace(manufacturerName).toLowerCase(),
      this.normalizeWhitespace(model.modelName).toLowerCase(),
      this.normalizeWhitespace(variant.engine).toLowerCase(),
      this.normalizeWhitespace(variant.constructionType).toLowerCase(),
      String(variant.cylinderCapacity ?? '').toLowerCase(),
      this.formatCylinderCapacity(variant.cylinderCapacity).toLowerCase(),
      this.formatNumericRange(variant.powerKwFrom, variant.powerKwTo, 'kW').toLowerCase(),
      this.formatNumericRange(variant.powerHpFrom, variant.powerHpTo, 'KS').toLowerCase(),
      this.formatProductionPeriod(variant).toLowerCase(),
    ].join(' ');

    return tokens.every((token) => combined.includes(token));
  }

  public getManufacturerDetailForDisplay(
    manufacturer: TecDocLinkedManufacturer
  ): TecDocLinkedManufacturerTargets | undefined {
    const id = Number(manufacturer?.linkingTargetId ?? Number.NaN);
    if (!Number.isFinite(id)) return undefined;
    return this.filteredDetails.get(id) ?? this.manufacturerDetails.get(id);
  }

  private buildSearchTokens(term: string): string[] {
    return term
      .toLowerCase()
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  private rebuildLinkedTargets(): void {
    const ordered: TecDocLinkedManufacturerTargets[] = [];
    const seen = new Set<number>();

    this.flatManufacturers.forEach((manufacturer) => {
      const id = Number(manufacturer.linkingTargetId ?? Number.NaN);
      if (!Number.isFinite(id)) {
        return;
      }
      seen.add(id);
      const detailed = this.manufacturerDetails.get(id);
      if (detailed) {
        const ensured =
          detailed.manufacturerName && detailed.manufacturerName.trim().length
            ? detailed
            : {
                ...detailed,
                manufacturerName: manufacturer.name,
              };
        if (ensured !== detailed) {
          this.manufacturerDetails.set(id, ensured);
        }
        ordered.push(ensured);
      } else {
        ordered.push({
          manufacturerId: id,
          manufacturerName: manufacturer.name,
          models: [],
        });
      }
    });

    const extras: TecDocLinkedManufacturerTargets[] = [];
    this.manufacturerDetails.forEach((detail, id) => {
      if (!seen.has(id)) {
        const name = this.normalizeWhitespace(detail.manufacturerName);
        if (!name) {
          return;
        }
        extras.push({
          ...detail,
          manufacturerName: name,
        });
      }
    });

    if (extras.length) {
      extras.sort((a, b) => {
        const nameA = this.normalizeWhitespace(a.manufacturerName);
        const nameB = this.normalizeWhitespace(b.manufacturerName);
        if (this.collator) {
          return this.collator.compare(nameA, nameB);
        }
        return nameA.localeCompare(nameB);
      });
      ordered.push(...extras);
    }

    this.linkedTargets = ordered;
    this.handleSearchFilters(false);
  }

  private applyDetailedTargets(targets: TecDocLinkedManufacturerTargets[]): void {
    targets.forEach((target) => {
      const normalized = this.normalizeDetailedTarget(target);
      if (!normalized || !Number.isFinite(normalized.manufacturerId ?? Number.NaN)) {
        return;
      }
      this.manufacturerDetails.set(normalized.manufacturerId as number, normalized);
    });

    this.rebuildLinkedTargets();
    this.handleSearchFilters(false);
  }

  private normalizeDetailedTarget(
    target: TecDocLinkedManufacturerTargets | undefined | null
  ): TecDocLinkedManufacturerTargets | null {
    if (!target) {
      return null;
    }
    const manufacturerId = Number(
      (target as any)?.manufacturerId ?? (target as any)?.linkingTargetId ?? Number.NaN
    );
    const manufacturerName = this.normalizeWhitespace(
      (target as any)?.manufacturerName ?? (target as any)?.name ?? ''
    );
    if (!Number.isFinite(manufacturerId) || !manufacturerName) {
      return null;
    }

    const models = Array.isArray(target.models) ? target.models : [];
    const normalizedModels: TecDocLinkedModel[] = models
      .map((model) => {
        const modelName = this.normalizeWhitespace((model as any)?.modelName ?? '');
        if (!modelName) {
          return null;
        }
        const modelId = Number((model as any)?.modelId ?? Number.NaN);
        const variants = Array.isArray(model.variants) ? model.variants : [];
        const normalizedVariants = variants
          .map((variant) => this.normalizeVariant(variant))
          .filter((variant): variant is TecDocLinkedVariant => !!variant)
          .sort((a, b) => {
            const fromA = Number(a.productionYearFrom ?? 0);
            const fromB = Number(b.productionYearFrom ?? 0);
            if (fromA && fromB && fromA !== fromB) {
              return fromA - fromB;
            }
            const engineA = this.normalizeWhitespace(a.engine);
            const engineB = this.normalizeWhitespace(b.engine);
            if (!engineA && !engineB) return 0;
            if (!engineA) return 1;
            if (!engineB) return -1;
            if (this.collator) {
              return this.collator.compare(engineA, engineB);
            }
            return engineA.localeCompare(engineB);
          });

        return {
          modelId: Number.isFinite(modelId) ? modelId : undefined,
          modelName,
          variants: normalizedVariants,
        } as TecDocLinkedModel;
      })
      .filter((model): model is TecDocLinkedModel => !!model)
      .sort((a, b) => {
        const nameA = this.normalizeWhitespace(a.modelName ?? '');
        const nameB = this.normalizeWhitespace(b.modelName ?? '');
        if (this.collator) {
          return this.collator.compare(nameA, nameB);
        }
        return nameA.localeCompare(nameB);
      });

    return {
      manufacturerId,
      manufacturerName,
      models: normalizedModels,
    };
  }

  private normalizeVariant(
    variant: TecDocLinkedVariant | undefined | null
  ): TecDocLinkedVariant | null {
    if (!variant) {
      return null;
    }
    const engine = this.normalizeWhitespace((variant as any)?.engine ?? '');
    const constructionType = this.normalizeWhitespace((variant as any)?.constructionType ?? '');
    const hasEngine = !!engine;
    const hasYears =
      Number.isFinite(variant?.productionYearFrom) || Number.isFinite(variant?.productionYearTo);
    const hasCapacity = Number.isFinite(variant?.cylinderCapacity);
    const hasPower =
      Number.isFinite(variant?.powerKwFrom) ||
      Number.isFinite(variant?.powerKwTo) ||
      Number.isFinite(variant?.powerHpFrom) ||
      Number.isFinite(variant?.powerHpTo);
    const hasBody = !!constructionType;

    if (!(hasEngine || hasYears || hasCapacity || hasPower || hasBody)) {
      return null;
    }

    return {
      ...variant,
      engine: engine || undefined,
      constructionType: constructionType || undefined,
    };
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

  public trackManufacturer = (_: number, manufacturer: TecDocLinkedManufacturer): number => {
    return Number(manufacturer?.linkingTargetId ?? 0);
  };

  public trackModel = (_: number, model: TecDocLinkedModel): string | number => {
    const id = Number(model?.modelId ?? Number.NaN);
    if (Number.isFinite(id)) {
      return id;
    }
    return this.normalizeWhitespace(model?.modelName ?? '');
  };

  public isManufacturerExpanded = (manufacturer: TecDocLinkedManufacturer): boolean => {
    const id = Number(manufacturer?.linkingTargetId ?? Number.NaN);
    return Number.isFinite(id) && this.expandedManufacturers.has(id);
  };

  public toggleManufacturer = (manufacturer: TecDocLinkedManufacturer): void => {
    const id = Number(manufacturer?.linkingTargetId ?? Number.NaN);
    if (!Number.isFinite(id)) return;
    if (this.expandedManufacturers.has(id)) {
      this.expandedManufacturers.delete(id);
      this.collapseModelsForManufacturer(id);
    } else {
      this.expandedManufacturers.add(id);
      if (!this.detailedTargetsLoaded && !this.linkedTargetsLoading && !this.requestedDetailedTargets) {
        this.fetchLinkedTargets(this.data);
      }
    }
  };

  public isModelExpanded = (manufacturerId: number, model: TecDocLinkedModel): boolean => {
    const key = this.buildModelKey(manufacturerId, model);
    return key ? this.expandedModels.has(key) : false;
  };

  public toggleModel = (manufacturerId: number, model: TecDocLinkedModel): void => {
    const key = this.buildModelKey(manufacturerId, model);
    if (!key) return;
    if (this.expandedModels.has(key)) {
      this.expandedModels.delete(key);
    } else {
      this.expandedModels.add(key);
    }
  };

  private buildModelKey(manufacturerId: number, model: TecDocLinkedModel): string {
    if (!Number.isFinite(manufacturerId)) return '';
    const modelId = Number(model?.modelId ?? Number.NaN);
    if (Number.isFinite(modelId)) {
      return `${manufacturerId}:model-${modelId}`;
    }
    const modelName = this.normalizeWhitespace(model?.modelName);
    return modelName ? `${manufacturerId}:model-${modelName.toLowerCase()}` : '';
  }

  private collapseModelsForManufacturer(manufacturerId: number): void {
    const prefix = `${manufacturerId}:model-`;
    Array.from(this.expandedModels)
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => this.expandedModels.delete(key));
  }

  public getManufacturerPanelId = (manufacturer: TecDocLinkedManufacturer, index: number): string => {
    const id = Number(manufacturer?.linkingTargetId ?? Number.NaN);
    if (Number.isFinite(id)) {
      return `manufacturer-${id}`;
    }
    const name = this.normalizeWhitespace(manufacturer?.name);
    return name ? `manufacturer-${name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}` : `manufacturer-${index}`;
  };

  public getModelPanelId = (manufacturerId: number, model: TecDocLinkedModel, index: number): string => {
    const rawKey = this.buildModelKey(manufacturerId, model);
    if (rawKey) {
      return rawKey.replace(/[^a-zA-Z0-9_-]/g, '-');
    }
    return `model-panel-${manufacturerId}-${index}`;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Cart / quantity
  // ─────────────────────────────────────────────────────────────────────────────

  modifyQuantity(quantity: number): void {
    if (quantity < 1) this.quantity = 1;
    else if (this.data.stanje && quantity > this.data.stanje)
      this.quantity = this.data.stanje;
    else this.quantity = quantity;
  }

  addToShopingCart(): void {
    this.cartStateService.addToCart(this.data, this.quantity);
    this.snackbarService.showSuccess('Artikal je dodat u korpu');
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
    if (this.id) this.fetchData(this.id);
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

  public formatVariantPower(variant: TecDocLinkedVariant): string {
    const kw = this.formatNumericRange(variant.powerKwFrom, variant.powerKwTo, 'kW');
    const hp = this.formatNumericRange(variant.powerHpFrom, variant.powerHpTo, 'KS');
    if (kw && hp) {
      return `${kw} / ${hp}`;
    }
    return kw || hp || '—';
  }

  public formatCylinderCapacity(value?: number | null): string {
    if (!Number.isFinite(value ?? NaN)) return '—';
    const formatter =
      typeof Intl !== 'undefined'
        ? new Intl.NumberFormat('sr-RS')
        : { format: (v: number) => String(v) };
    return `${formatter.format(Number(value))} cm³`;
  }

  public formatProductionPeriod(variant: TecDocLinkedVariant): string {
    const from = this.formatYearMonth(variant.productionYearFrom);
    const to = this.formatYearMonth(variant.productionYearTo);
    if (from && to) {
      if (from === to) return from;
      return `${from} – ${to}`;
    }
    if (from) return `od ${from}`;
    if (to) return `do ${to}`;
    return '—';
  }

  private formatYearMonth(value?: number | null): string {
    if (!Number.isFinite(value ?? NaN)) return '';
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (raw.length === 4) {
      return raw;
    }
    const padded = raw.padStart(6, '0');
    const year = padded.slice(0, 4);
    const month = padded.slice(4, 6);
    if (month === '00') {
      return year;
    }
    return `${month}/${year}`;
  }

  private formatNumericRange(
    from?: number | null,
    to?: number | null,
    unit?: string
  ): string {
    const start = Number(from ?? NaN);
    const end = Number(to ?? NaN);
    const hasStart = Number.isFinite(start);
    const hasEnd = Number.isFinite(end);
    if (!hasStart && !hasEnd) return '';
    const unitSuffix = unit ? ` ${unit}` : '';
    if (hasStart && hasEnd) {
      if (start === end) {
        return `${start}${unitSuffix}`;
      }
      return `${Math.min(start, end)} – ${Math.max(start, end)}${unitSuffix}`;
    }
    if (hasStart) return `od ${start}${unitSuffix}`;
    if (hasEnd) return `do ${end}${unitSuffix}`;
    return '';
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
    const id = roba.robaid ?? '';
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
    if (this.oeNumbers.size > 0) {
      const joined = Array.from(this.oeNumbers.entries())
        .map(([oe, prozv]) => `${oe} (${prozv.join(', ')})`)
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

  private buildVideoObjects(): any[] | undefined {
    if (!this.youTubeIds.length) return undefined;
    return this.youTubeIds.slice(0, 3).map((id) => ({
      '@type': 'VideoObject',
      name: 'Servisna informacija',
      embedUrl: `https://www.youtube.com/embed/${id}`,
      potentialAction: {
        '@type': 'WatchAction',
        target: `https://www.youtube.com/watch?v=${id}`,
      },
    }));
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
    const base = [brand, name].filter(Boolean).join(' ');
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

    // Description — robust fallback kad nema teksta
    const specsSnippet = (roba.tehnickiOpis || [])
      .slice(0, 4)
      .map((s) => [s.oznaka, s.vrednost, s.jedinica ? `(${s.jedinica})` : ''].filter(Boolean).join(' '))
      .join(' · ');
    const groupLine = [group, subgroup].filter(Boolean).join(' › ');
    const descCandidates = [
      roba.tekst?.trim(),
      `Kupite ${brand} ${name}${sku ? ` (${sku})` : ''} online. Dostupnost: ${inStock ? 'Na stanju' : 'Nema na stanju'}, brza dostava.${groupLine ? ' Kategorija: ' + groupLine + '.' : ''}`,
      specsSnippet,
      `${brand} ${name} — rezervni deo. Brza isporuka i podrška.`,
    ].filter(Boolean) as string[];
    let description =
      descCandidates[0] ||
      descCandidates[1] ||
      descCandidates[2] ||
      descCandidates[3] ||
      '';
    description = this.normalizeWhitespace(description);

    const manufacturerSnippet = this.getLinkedManufacturersSnippet();
    if (manufacturerSnippet) {
      if (!description) {
        description = `Kompatibilni proizvođači: ${manufacturerSnippet}.`;
      } else if (description.length < 120) {
        description = `${description.replace(/[.?!]+$/, '')}. Kompatibilni proizvođači: ${manufacturerSnippet}.`;
      }
    }
    description = description.slice(0, 158);

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
    const videoObjects = this.buildVideoObjects();
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
      ...(videoObjects ? { hasVideo: videoObjects } : {}),
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

    const idPart = this.parseId(raw);
    if (!idPart) {
      return;
    }

    const slug = this.extractSlug(raw);
    const idParam = slug ? `${idPart}-${slug}` : String(idPart);
    const canonical = `https://automaterijal.com/webshop/${idParam}`;
    this.seoService.setCanonicalUrl(canonical);
    this.seoService.setRobots('noindex, follow');
  }

  private parseId(raw: string | null): number | null {
    if (!raw) return null;
    const m = raw.match(/^\d+/);     // uzmi početne cifre pre prvog '-'
    return m ? Number(m[0]) : null;
  }
}
