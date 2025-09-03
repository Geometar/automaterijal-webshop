import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize, Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

// Components imports
import { WebshopEmptyComponent } from './webshop-empty/webshop-empty.component';
import { WebshopNavComponent } from './webshop-nav/webshop-nav.component';
import { WebshopRobaComponent } from './webshop-roba/webshop-roba.component';
import { WebshopVehiclesComponent } from './webshop-vehicles/webshop-vehicles.component';

// Data models
import { Filter, Magacin } from '../../shared/data-models/model/roba';
import { TablePage } from '../../shared/data-models/model/page';
import { TDVehicleDetails } from '../../shared/data-models/model/tecdoc';

// Services
import { CartStateService } from '../../shared/service/state/cart-state.service';
import { PictureService } from '../../shared/service/utils/picture.service';
import { RobaService } from '../../shared/service/roba.service';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { TecdocService } from '../../shared/service/tecdoc.service';
import { WebshopLogicService } from '../../shared/service/utils/webshop-logic.service';
import { WebshopStateService } from '../../shared/service/state/webshop-state.service';
import { SeoService } from '../../shared/service/seo.service';

export enum WebShopState {
  SHOW_ARTICLES_WITH_VEHICLE_DETAILS,
  SHOW_ARTICLES,
  SHOW_EMPTY_CONTAINER,
  SHOW_VEHICLE_DETAILS,
}
interface QueryParams {
  assembleGroupId?: string;
  assemblyGroupName?: string;
  grupe?: string;
  mandatoryproid?: string;
  naStanju?: string;
  podgrupe?: string;
  proizvodjaci?: string;
  searchTerm?: string;
  tecdocId?: string;
  tecdocType?: string;
}

@Component({
  selector: 'app-webshop',
  standalone: true,
  imports: [
    CommonModule,
    SpinnerComponent,
    WebshopEmptyComponent,
    WebshopNavComponent,
    WebshopRobaComponent,
    WebshopVehiclesComponent,
  ],
  templateUrl: './webshop.component.html',
  styleUrl: './webshop.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class WebshopComponent implements OnDestroy, OnInit {
  private destroy$ = new Subject<void>();

  // Enums
  state = WebShopState;
  currentState = WebShopState.SHOW_EMPTY_CONTAINER;

  // Paging and Sorting elements
  pageIndex = 0;
  rowsPerPage = 10;
  searchTerm = '';
  sort = null;
  filter: Filter = new Filter();

  // Data
  assembleGroupId: string = '';
  assemblyGroupName: string = '';
  magacinData: Magacin | null = null;
  selectedVehicleDetails: TDVehicleDetails | null = null;
  tecdocId: number | null = null;
  tecdocType: string | null = null;

  // Misc
  activeRequests = 0;
  internalLoading = false;
  loading = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private cartStateService: CartStateService,
    private logicService: WebshopLogicService,

    private pictureService: PictureService,
    private robaService: RobaService,
    private stateService: WebshopStateService,
    private tecdocService: TecdocService,
    private seoService: SeoService
  ) { }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    this.updateSeoTagsForState();

    let init = true;
    this.filter = new Filter();
    // Subscribe to queryParams observable
    this.activatedRoute.queryParams
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe((params) => {
        this.handleQueryParams(params, init);
        init = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  /** Angular lifecycle hooks end */

  /** Event start */

  getRoba(internalLoading = false): void {
    this.loading = !internalLoading;
    this.internalLoading = internalLoading;
    this.robaService
      .pronadjiSvuRobu(
        this.sort,
        this.rowsPerPage,
        this.pageIndex,
        this.searchTerm,
        this.filter
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.internalLoading = false;
        })
      )
      .subscribe({
        next: (response: Magacin) => {
          this.pictureService.convertByteToImageArray(
            response.robaDto!.content
          );
          this.cartStateService.updateStockFromCart(
            response?.robaDto?.content!
          );
          this.magacinData = response;
          this.currentState = this.state.SHOW_ARTICLES;
          this.updateSeoTagsForState();
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        },
      });
  }

  getArticlesByAssembleGroup(
    linkageTargetId: number,
    linkageTargetType: string,
    assembleGroupId: string,
    internalLoading = false
  ): void {
    this.loading = !internalLoading;
    this.internalLoading = internalLoading;
    this.activeRequests++; // Increase active requests count

    this.tecdocService
      .getAssociatedArticles(
        linkageTargetId,
        linkageTargetType,
        assembleGroupId,
        this.rowsPerPage,
        this.pageIndex,
        this.filter
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.finalizeLoading()) // Use shared finalize method
      )
      .subscribe({
        next: (response: Magacin) => {
          this.pictureService.convertByteToImageArray(
            response.robaDto!.content
          );
          this.magacinData = response;
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        },
      });
  }

  getTDVehicleDetails(tecdocId: number, tecdocType: string): void {
    this.loading = true;
    this.activeRequests++; // Increase active requests count
    this.tecdocService
      .getLinkageTargets(tecdocId, tecdocType)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.finalizeLoading()) // Use shared finalize method
      )
      .subscribe({
        next: (vehicleDetails: TDVehicleDetails[]) => {
          this.selectedVehicleDetails = vehicleDetails[0];
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        },
      });
  }

  /** Event end */

  // Setters start

  setRobaSearchTerm(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.getRoba();
  }
  setRobaPageData(tableEvent: TablePage): void {
    this.pageIndex = tableEvent.pageIndex;
    this.rowsPerPage = tableEvent.pageSize;
    this.currentState === this.state.SHOW_ARTICLES_WITH_VEHICLE_DETAILS
      ? this.getArticlesByAssembleGroup(
        this.tecdocId!,
        this.tecdocType!,
        this.assembleGroupId
      )
      : this.getRoba();
  }

  selectVehicleDetailsEventHandle(selectedVehicle: TDVehicleDetails): void {
    this.selectedVehicleDetails = selectedVehicle;
    this.currentState = this.state.SHOW_VEHICLE_DETAILS;
  }

  // Setters end

  // Start of: Private methods

  /**
   * Handles finalize logic, only setting loading = false when all requests complete.
   */
  private finalizeLoading(): void {
    this.activeRequests--; // Decrease active requests count
    if (this.activeRequests === 0) {
      this.loading = false;
      this.internalLoading = false;
    }
  }

  /**
   * Main logic
   * @param params The query parameters from the URL
   * @param isInitialLoad Flag indicating if this is the initial component load
   */
  private handleQueryParams(
    params: QueryParams,
    isInitialLoad: boolean = false
  ): void {
    // 1. Extract and store basic parameters into the component's state
    const searchChanged = this.searchTerm !== params.searchTerm;
    this.extractBaseParams(params);

    // 2. Build a new filter object based on query parameters
    const newFilter = this.logicService.createFilterFromParams(params);

    // 3. Compare with the previous filter to check for changes
    const filtersChanged = this.logicService.haveFiltersChanged(
      this.filter,
      newFilter
    );

    // 4. If filters have changed, reset to the first page
    if (filtersChanged || searchChanged) this.pageIndex = 0;

    // 5. If all params are effectively empty, show the empty container
    if (this.checkEmptyState(params)) {
      this.filter = newFilter;
      this.selectedVehicleDetails = null;
      this.updateState(WebShopState.SHOW_EMPTY_CONTAINER, this.searchTerm);
      return;
    }

    // 6. Update vehicle details if tecdocId/type changed
    this.updateVehicleIfNeeded(params);

    // 7. Determine which WebShop view state should be shown (articles, vehicle, empty)
    this.currentState = this.stateService.determineWebShopState(
      this.tecdocId,
      this.tecdocType!,
      this.assembleGroupId
    );

    // 8. Set filter with the new one
    this.filter = newFilter;

    // 9. Fetch data depending on current state (articles, vehicle, etc.)
    this.fetchBasedOnState(filtersChanged, isInitialLoad);
  }

  /**
   * Updates the current state and assigns a search term.
   */
  private updateState(newState: WebShopState, searchTerm: string): void {
    this.currentState = newState;
    this.searchTerm = searchTerm;
  }

  private extractBaseParams(params: QueryParams): void {
    this.searchTerm = params.searchTerm || '';
    this.tecdocType = params.tecdocType || '';
    this.tecdocId = params.tecdocId ? +params.tecdocId : null;
    this.assembleGroupId = params.assembleGroupId || '';
    this.assemblyGroupName = params.assemblyGroupName || '';
  }

  private checkEmptyState(params: QueryParams): boolean {
    return this.stateService.shouldShowEmptyContainer(
      this.searchTerm,
      params.mandatoryproid || '',
      params.grupe || '',
      this.tecdocId,
      this.tecdocType!
    );
  }

  private updateVehicleIfNeeded(params: QueryParams): void {
    if (!this.tecdocId) {
      this.selectedVehicleDetails = null;
      return;
    }

    const shouldFetch = this.stateService.shouldFetchVehicleDetails(
      this.selectedVehicleDetails,
      this.tecdocId,
      this.tecdocType!
    );

    if (shouldFetch) {
      this.getTDVehicleDetails(this.tecdocId, this.tecdocType!);
    }
  }

  private fetchBasedOnState(
    filtersChanged: boolean,
    isInitialLoad: boolean
  ): void {
    const shouldRefresh = filtersChanged || isInitialLoad;

    switch (this.currentState) {
      case WebShopState.SHOW_VEHICLE_DETAILS:
        // Vehicle details are already fetched in updateVehicleIfNeeded
        break;
      case WebShopState.SHOW_ARTICLES_WITH_VEHICLE_DETAILS:
        if (this.tecdocId) {
          this.getArticlesByAssembleGroup(
            this.tecdocId,
            this.tecdocType!,
            this.assembleGroupId,
            shouldRefresh
          );
        }
        break;
      case WebShopState.SHOW_ARTICLES:
        this.getRoba(shouldRefresh);
        break;
    }
  }
  private updateSeoTagsForState(): void {
    const baseUrl = 'https://www.automaterijal.com/webshop';
    const page = this.pageIndex ?? 0;
    const perPage = this.rowsPerPage ?? 10;

    // podaci iz state-a
    const brandName =
      this.magacinData?.proizvodjaci?.[0]?.naziv ||
      this.filter?.proizvodjaci?.[0] ||
      null;

    const groupLabels = this.magacinData?.categories
      ? Object.keys(this.magacinData.categories)
      : [];

    const searchTerm = (this.searchTerm || '').trim();
    const resultCount = this.magacinData?.robaDto?.totalElements ?? 0;

    // title/desc
    let title = 'Webshop | Automaterijal - Auto delovi, filteri i maziva';
    let description =
      'Kupite auto delove, filtere i maziva online putem našeg Webshopa. Pretraga po vozilu, brendu ili kategoriji. Brza isporuka širom Srbije.';

    if (this.filter.mandatoryProid && brandName) {
      title = `Webshop | ${brandName} delovi - Automaterijal`;
      description = `Kupite ${brandName} auto delove putem našeg webshopa. Brza dostava i proveren kvalitet.`;
    }

    if (this.filter.grupe?.length && groupLabels.length) {
      const allGroups = groupLabels.join(', ');
      title = `Webshop | ${allGroups} - Automaterijal`;
      description = `Istražite ponudu za kategorije: ${allGroups}. Delovi, filteri i maziva za sve potrebe.`;
    }

    if (searchTerm && resultCount > 0) {
      title = `Webshop pretraga: "${searchTerm}"${page ? ` (str. ${page + 1})` : ''} - Automaterijal`;
      description = `Pronađeno ${resultCount} rezultata za "${searchTerm}". Pogledajte delove, filtere i maziva dostupne za online porudžbinu.`;
    } else if (searchTerm) {
      title = `Webshop pretraga: "${searchTerm}" - Automaterijal`;
      description = `Nažalost, nema rezultata za "${searchTerm}". Pokušajte sa drugim nazivom ili kataloškim brojem.`;
    } else if (page > 0) {
      // bez searchTerm-a, ali na višoj strani
      title += ` (str. ${page + 1})`;
    }

    // canonical + prev/next
    const canonical = this.buildCanonicalUrl(baseUrl, {
      searchTerm,
      grupe: this.filter.grupe?.join(',') || '',
      proizvodjaci: this.filter.proizvodjaci?.join(',') || '',
      page: page > 0 ? String(page + 1) : '', // 1-based u URL-u, ali prazno za 1. stranu
      size: perPage !== 10 ? String(perPage) : '', // ne upisuj default
    });

    this.seoService.updateSeoTags({
      title,
      description,
      url: canonical,           // koristi canonical i kao og:url
      type: 'website',
      siteName: 'Automaterijal',
      locale: 'sr_RS',
      // kad je 0 rezultata – signalizuj crawleru
      robots: searchTerm && resultCount === 0 ? 'noindex,follow' : undefined,
      // po želji: image (može hero iz webshopa)
      image: 'https://www.automaterijal.com/images/logo/logo.svg',
      imageAlt: 'Automaterijal'
    });

    // rel=prev/next (ako si dodao helper u SeoService – vidi niže)
    this.setPaginationLinks(canonical, page, perPage, resultCount);

    // (opciono) JSON-LD za listing
    this.seoService.setJsonLd({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": title.replace(' - Automaterijal', ''),
      "isPartOf": { "@type": "WebSite", "name": "Automaterijal", "url": "https://www.automaterijal.com/" },
      "about": searchTerm ? `Rezultati pretrage za: ${searchTerm}` : 'Lista artikala',
      "url": canonical,
      "numberOfItems": resultCount
    }, 'seo-jsonld-webshop');
  }

  /** Sastavlja canonical sa samo bitnim parametrima; prazne izostavlja */
  private buildCanonicalUrl(base: string, params: Record<string, string>): string {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v); });
    const qp = sp.toString();
    return qp ? `${base}?${qp}` : base;
  }

  /** rel=prev/next – zahteva male izmene u SeoService (vidi ispod) */
  private setPaginationLinks(canonical: string, page: number, size: number, total: number) {
    const totalPages = Math.ceil((total || 0) / (size || 10));
    if (!totalPages || totalPages <= 1) {
      this.seoService.setLinkRel('prev', null);
      this.seoService.setLinkRel('next', null);
      return;
    }
    // canonical je već sa ?page=N (1-based) ako > 1
    const url = new URL(canonical);
    // prev
    if (page > 0) {
      url.searchParams.set('page', String(page)); // (pageIndex 1-based = pageIndex)
      this.seoService.setLinkRel('prev', url.toString());
    } else {
      this.seoService.setLinkRel('prev', null);
    }
    // next
    if (page + 1 < totalPages) {
      url.searchParams.set('page', String(page + 2));
      this.seoService.setLinkRel('next', url.toString());
    } else {
      this.seoService.setLinkRel('next', null);
    }
  }
}
