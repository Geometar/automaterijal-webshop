import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest, finalize, Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, ParamMap, Params } from '@angular/router';
import { debounceTime, take } from 'rxjs/operators';

// Components imports
import { WebshopEmptyComponent } from './webshop-empty/webshop-empty.component';
import { WebshopNavComponent } from './webshop-nav/webshop-nav.component';
import { WebshopRobaComponent } from './webshop-roba/webshop-roba.component';
import { WebshopVehiclesComponent } from './webshop-vehicles/webshop-vehicles.component';

// Data models
import { Filter, Magacin, Roba } from '../../shared/data-models/model/roba';
import { TablePage } from '../../shared/data-models/model/page';
import { TDVehicleDetails } from '../../shared/data-models/model/tecdoc';

// Enums
import { WebshopPrimaryFilter } from '../../shared/data-models/enums/webshop-primary-filter.enum';

// Services
import { AccountStateService } from '../../shared/service/state/account-state.service';
import { AnalyticsService } from '../../shared/service/analytics.service';
import { CartStateService } from '../../shared/service/state/cart-state.service';
import { CategoriesStateService } from '../../shared/service/state/categories-state.service';
import { ConfigService } from '../../shared/service/config.service';
import { ManufactureService } from '../../shared/service/manufacture.service';
import { PictureService } from '../../shared/service/utils/picture.service';
import { RobaService } from '../../shared/service/roba.service';
import { SeoService } from '../../shared/service/seo.service';
import { TecdocService } from '../../shared/service/tecdoc.service';
import { UrlHelperService } from '../../shared/service/utils/url-helper.service';
import { VehicleUrlService } from '../../shared/service/utils/vehicle-url.service';
import { WebshopConfig } from '../../shared/data-models/interface';
import { WebshopLogicService } from '../../shared/service/utils/webshop-logic.service';
import { WebshopStateService } from '../../shared/service/state/webshop-state.service';

// Utils
import {
  buildCanonicalFromPath,
  hasActiveFilterQuery,
  normalizeRobotsTag,
} from '../../shared/utils/seo-utils';
import { StringUtils } from '../../shared/utils/string-utils';

export enum WebShopState {
  SHOW_ARTICLES_WITH_VEHICLE_DETAILS,
  SHOW_ARTICLES,
  SHOW_EMPTY_CONTAINER,
  SHOW_VEHICLE_DETAILS,
}
interface QueryParams {
  assembleGroupId?: string;
  assemblyGroupName?: string;
  filterBy?: WebshopPrimaryFilter;
  grupe?: string;
  mandatoryproid?: string;
  pageIndex?: string;
  naStanju?: string;
  dostupno?: string;
  podgrupe?: string;
  proizvodjaci?: string;
  rowsPerPage?: string;
  searchTerm?: string;
  tecdocId?: string;
  tecdocType?: string;
}

@Component({
  selector: 'app-webshop',
  standalone: true,
  imports: [
    CommonModule,
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
  loading = true;

  private selectedBrandName: string | null = null;
  private config: WebshopConfig | null = null;
  private currentCategoryName: string | null = null;
  private currentSubcategoryName: string | null = null;
  private primaryFilter: WebshopPrimaryFilter | null = null;
  private lastRoutePageIndex = 0;
  private lastRouteRowsPerPage = 10;
  private hasProcessedRoute = false;
  private pendingSubgroupSelection: string[] | undefined;

  constructor(
    private accountStateService: AccountStateService,
    private activatedRoute: ActivatedRoute,
    private analytics: AnalyticsService,
    private cartStateService: CartStateService,
    private categoriesState: CategoriesStateService,
    private configService: ConfigService,
    private logicService: WebshopLogicService,
    private manufactureService: ManufactureService,
    private pictureService: PictureService,
    private robaService: RobaService,
    private seoService: SeoService,
    private stateService: WebshopStateService,
    private tecdocService: TecdocService,
    private urlHelperService: UrlHelperService,
    private vehicleUrlService: VehicleUrlService,
  ) { }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    this.filter = new Filter();

    this.configService
      .getConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe((cfg) => {
        this.config = cfg;
      });

    combineLatest([
      this.activatedRoute.paramMap,
      this.activatedRoute.queryParams,
    ])
      .pipe(takeUntil(this.destroy$), debounceTime(30))
      .subscribe(([paramMap, p]) => {
        const currentPath = this.activatedRoute.routeConfig?.path;
        const slug = paramMap.get('name');
        const vehicleSlug = paramMap.get('vehicleSlug');

        if (vehicleSlug) {
          const groupSlug = paramMap.get('groupSlug');
          this.handleVehicleSlugRoute(paramMap, p, groupSlug);
          return;
        }

        if (currentPath === 'webshop/manufacturers/:name' && slug) {
          this.handleManufactureSlug(slug, p);
        } else if (currentPath === 'webshop/category/:name' && slug) {
          this.handleCategorySlug(slug, null, p);
        } else if (
          currentPath === 'webshop/category/:name/:subcategory' &&
          slug
        ) {
          const subSlug = paramMap.get('subcategory');
          this.handleCategorySlug(slug, subSlug, p);
        } else {
          this.handleWebshopParams(p);
        }
      });
  }

  ngOnDestroy(): void {
    // očisti rel prev/next da ne curi u druge rute
    this.seoService.setLinkRel('prev', null);
    this.seoService.setLinkRel('next', null);

    this.seoService.clearJsonLd('seo-jsonld-webshop');

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
          this.emitListView(response.robaDto?.content);
          this.updateSeoTagsForState();
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error?.details || err.error;
          console.error('pronadjiSvuRobu error', error);
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
    this.activeRequests++;

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
        finalize(() => this.finalizeLoading())
      )
      .subscribe({
        next: (response: Magacin) => {
          this.pictureService.convertByteToImageArray(
            response.robaDto!.content
          );
          this.magacinData = response;
          this.emitListView(response.robaDto?.content);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error?.details || err.error;
          console.error('getAssociatedArticles error', error);
        },
      });
  }

  getTDVehicleDetails(tecdocId: number, tecdocType: string): void {
    this.loading = true;
    this.activeRequests++;
    this.tecdocService
      .getLinkageTargets(tecdocId, tecdocType)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.finalizeLoading())
      )
      .subscribe({
        next: (vehicleDetails: TDVehicleDetails[]) => {
          this.selectedVehicleDetails = vehicleDetails?.[0] || null;
          this.updateSeoTagsForState(); // osveži SEO kad znamo vozilo
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error?.details || err.error;
          console.error('getLinkageTargets error', error);
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
    const pageChanged = this.pageIndex !== tableEvent.pageIndex;
    const sizeChanged = this.rowsPerPage !== tableEvent.pageSize;

    if (!pageChanged && !sizeChanged) {
      return;
    }

    this.pageIndex = tableEvent.pageIndex;
    this.rowsPerPage = tableEvent.pageSize;
    this.syncPaginationQueryParams();
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

  private handleWebshopParams(p: Params): void {
    this.selectedBrandName = null;
    this.internalLoading = false;
    this.loading = true;
    const trimmedSearch = ((p['searchTerm'] || '') as string).trim();
    const params = {
      ...p,
      searchTerm: trimmedSearch,
      grupe: (p['grupe'] || '').toString(),
      proizvodjaci: (p['proizvodjaci'] || '').toString(),
      assembleGroupId: (p['assembleGroupId'] || '').toString(),
      assemblyGroupName: (p['assemblyGroupName'] || '').toString(),
      tecdocType: (p['tecdocType'] || '').toString(),
      tecdocId: p['tecdocId'] ? String(p['tecdocId']) : '',
      pageIndex: p['pageIndex'] !== undefined ? String(p['pageIndex']) : '',
      rowsPerPage:
        p['rowsPerPage'] !== undefined ? String(p['rowsPerPage']) : '',
    } as QueryParams;

    const explicitFilterBy = this.normalizeFilterBy(p['filterBy']);
    if (explicitFilterBy) {
      params.filterBy = explicitFilterBy;
    } else if (this.hasValue(p['podgrupe'])) {
      params.filterBy = WebshopPrimaryFilter.Subcategory;
    } else if (this.hasValue(p['grupe'])) {
      params.filterBy = WebshopPrimaryFilter.Category;
    } else if (this.hasValue(p['mandatoryproid']) || this.hasValue(p['proizvodjaci'])) {
      params.filterBy = WebshopPrimaryFilter.Manufacture;
    } else if (trimmedSearch) {
      params.filterBy = WebshopPrimaryFilter.SearchTerm;
    }

    this.handleQueryParams(params);
  }

  private handleManufactureSlug(slug: string, p: Params): void {
    this.loading = true;
    this.manufactureService.getBySlug(slug).subscribe({
      next: (m) => {
        if (m?.proid) {
          this.selectedBrandName = m.naziv!;
          const params = {
            ...p,
            searchTerm: ((p['searchTerm'] || '') as string).trim(),
            mandatoryproid: m.proid,
          } as QueryParams;
          params.filterBy = WebshopPrimaryFilter.Manufacture;
          this.handleQueryParams(params);
        } else {
          this.currentState = this.state.SHOW_EMPTY_CONTAINER;
          this.updateSeoTagsForState();
        }
      },
      error: () => {
        this.currentState = this.state.SHOW_EMPTY_CONTAINER;
        this.updateSeoTagsForState();
      },
    });
  }

  private handleCategorySlug(
    categorySlug: string,
    subSlug: string | null,
    p: Params
  ): void {
    this.categoriesState
      .getCategories$()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const group = this.categoriesState.getCategoryBySlug(categorySlug);
          if (!group) {
            this.currentState = this.state.SHOW_EMPTY_CONTAINER;
            this.updateSeoTagsForState();
            return;
          }

          let subGroupId = '';
          let subGroupValues: string[] = [];
          let subName: string | null = null;
          if (subSlug) {
            const sub = this.categoriesState.getSubCategoryBySlug(group.groupId!, subSlug);
            if (sub) {
              subGroupId = sub.subGroupId?.toString() || '';
              subName = sub.name || null;
              subGroupValues = subGroupId ? [subGroupId] : [];
            }
          } else {
            const rawSub = p['podgrupe'];
            const rawString = Array.isArray(rawSub)
              ? rawSub.join(',')
              : (rawSub ?? '').toString();
            const subValues = rawString
              .split(',')
              .map((value: string) => value.trim())
              .filter((value: string) => value.length > 0);

            if (subValues.length) {
              subGroupId = subValues.join(',');
              subGroupValues = subValues;
              const firstMatch = subValues
                .map((value: string) =>
                  group.articleSubGroups?.find((s) => String(s.subGroupId) === value)
                )
                .find((match: any) => !!match);

              if (firstMatch) {
                subName = firstMatch.name || null;
              }
            }
          }

          this.currentCategoryName = group.name || '';
          this.currentSubcategoryName = subName;
          this.pendingSubgroupSelection = subGroupValues.length ? subGroupValues : undefined;

          const params: QueryParams = {
            ...p,
            searchTerm: ((p['searchTerm'] || '') as string).trim(),
            grupe: group.groupId?.toString(),
            podgrupe: subGroupId,
          };
          params.filterBy = subSlug ? WebshopPrimaryFilter.Subcategory : WebshopPrimaryFilter.Category;
          this.handleQueryParams(params);
        },
      });
  }

  private handleVehicleSlugRoute(
    paramMap: ParamMap,
    p: Params,
    groupSlug?: string | null
  ): void {
    if (this.currentState !== WebShopState.SHOW_EMPTY_CONTAINER) {
      this.loading = true;
      this.internalLoading = false;
    }

    const slug = (paramMap.get('vehicleSlug') || '').trim();
    const segments = slug.split('-').filter(Boolean);

    let tecdocType = '';
    let tecdocId = '';

    if (segments.length >= 2 && /^[a-zA-Z]$/.test(segments[0]) && /^\d+$/.test(segments[1])) {
      tecdocType = segments[0].toUpperCase();
      tecdocId = segments[1];
    } else if (segments.length) {
      const identifier = segments[0];
      const match = identifier.match(/^([a-zA-Z])(\d+)$/);

      if (match) {
        tecdocType = match[1].toUpperCase();
        tecdocId = match[2];
      } else if (/^\d+$/.test(identifier)) {
        tecdocType = 'V';
        tecdocId = identifier;
      }
    }

    const params: QueryParams = {
      ...p,
    };

    if (tecdocType) {
      params.tecdocType = tecdocType;
    }

    if (tecdocId) {
      params.tecdocId = tecdocId;
    }

    if (groupSlug) {
      const group = this.parseAssemblyGroupSlug(groupSlug);
      if (group) {
        params.assembleGroupId = group.id;
        params.assemblyGroupName = group.name;
      }
    }

    this.handleWebshopParams(params);
  }

  private parseAssemblyGroupSlug(slug: string): { id: string; name: string } | null {
    if (!slug) {
      return null;
    }
    const match = slug.match(/-(\d+)$/);
    if (!match) {
      return null;
    }

    const id = match[1];
    const namePart = slug.slice(0, slug.length - (id.length + 1));
    const name = namePart ? StringUtils.deslugify(namePart) : '';

    return {
      id,
      name,
    };
  }

  private normalizeFilterBy(value: unknown): WebshopPrimaryFilter | undefined {
    if (!value) {
      return undefined;
    }

    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== 'string') {
      return undefined;
    }

    const normalized = raw.trim() as WebshopPrimaryFilter;
    return Object.values(WebshopPrimaryFilter).includes(normalized)
      ? normalized
      : undefined;
  }

  private hasValue(value: unknown): boolean {
    if (Array.isArray(value)) {
      return value.some((v) => this.hasValue(v));
    }
    if (value === null || value === undefined) {
      return false;
    }
    return String(value).trim().length > 0;
  }

  private finalizeLoading(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
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
    const isFirstRoutePass = !this.hasProcessedRoute;
    this.hasProcessedRoute = true;

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

    const shouldResetPage = (filtersChanged || searchChanged) && !isFirstRoutePass;
    let shouldSyncPagination = false;

    // 4. If filters have changed, reset to the first page
    if (shouldResetPage) {
      if (this.pageIndex !== 0) {
        this.pageIndex = 0;
        shouldSyncPagination = true;
      }
    }

    const paginationChanged =
      this.lastRoutePageIndex !== this.pageIndex || this.lastRouteRowsPerPage !== this.rowsPerPage;

    // 5. If all params are effectively empty, show the empty container
    if (this.checkEmptyState(params)) {
      this.filter = newFilter;
      this.selectedVehicleDetails = null;
      this.updateState(WebShopState.SHOW_EMPTY_CONTAINER, this.searchTerm);
      if (shouldSyncPagination) {
        this.syncPaginationQueryParams();
      }
      this.lastRoutePageIndex = this.pageIndex;
      this.lastRouteRowsPerPage = this.rowsPerPage;
      this.internalLoading = false;
      this.loading = false;
      this.updateSeoTagsForState();
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
    this.primaryFilter = newFilter.filterBy ?? null;
    if (this.pendingSubgroupSelection?.length) {
      this.filter.podgrupe = [...new Set(this.pendingSubgroupSelection.map((value) => value.trim()))].filter(Boolean);
    }
    this.pendingSubgroupSelection = undefined;

    if (shouldSyncPagination) {
      this.syncPaginationQueryParams();
    }

    // 9. Fetch data depending on current state (articles, vehicle, etc.)
    this.fetchBasedOnState(filtersChanged, paginationChanged, isInitialLoad);

    this.lastRoutePageIndex = this.pageIndex;
    this.lastRouteRowsPerPage = this.rowsPerPage;
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
    this.pageIndex = this.parseNumberParam(params.pageIndex, this.pageIndex, 0);
    this.rowsPerPage = this.parseNumberParam(
      params.rowsPerPage,
      this.rowsPerPage,
      1
    );
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
    paginationChanged: boolean,
    isInitialLoad: boolean
  ): void {
    const shouldRefresh = filtersChanged || paginationChanged || isInitialLoad;

    switch (this.currentState) {
      case WebShopState.SHOW_VEHICLE_DETAILS:
        // Vehicle details are already fetched in updateVehicleIfNeeded
        this.updateSeoTagsForState();
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
    const context = this.buildSeoContext();
    const queryParams = this.activatedRoute.snapshot.queryParams;
    const shouldNoIndex = hasActiveFilterQuery(queryParams);

    const baseCanonical = buildCanonicalFromPath(
      this.urlHelperService.getCurrentPath() || '/'
    );
    const canonical = shouldNoIndex
      ? baseCanonical
      : this.buildCanonicalUrlForContext(context);
    const jsonLd = this.buildJsonLdForContext(context, canonical);
    const robots = shouldNoIndex
      ? 'noindex, follow'
      : normalizeRobotsTag(context.robots);

    this.seoService.setCanonicalUrl(canonical);

    this.seoService.updateSeoTags({
      title: context.title,
      description: context.description,
      url: canonical,
      type: 'website',
      siteName: 'Automaterijal',
      locale: 'sr_RS',
      robots,
      image: 'https://automaterijal.com/images/logo/logo.svg',
      imageAlt: 'Automaterijal',
      canonical,
    });

    if (shouldNoIndex) {
      this.seoService.setLinkRel('prev', null);
      this.seoService.setLinkRel('next', null);
    } else {
      this.setPaginationLinks(
        canonical,
        context.page,
        context.perPage,
        context.resultCount
      );
    }

    this.seoService.setJsonLd(jsonLd, 'seo-jsonld-webshop');
  }

  private emitListView(items: Roba[] | undefined): void {
    if (!items?.length) {
      return;
    }

    const account = this.accountStateService.get();
    this.analytics.trackViewItemList(
      items,
      this.buildListName(),
      account,
      this.buildListMetadata()
    );
  }

  private buildListName(): string {
    if (this.searchTerm) {
      return 'Webshop Search Results';
    }

    if (this.selectedBrandName) {
      return 'Webshop Brand Listing';
    }

    if (this.currentCategoryName && this.currentSubcategoryName) {
      return `Webshop Category: ${this.currentCategoryName} > ${this.currentSubcategoryName}`;
    }

    if (this.currentCategoryName) {
      return `Webshop Category: ${this.currentCategoryName}`;
    }

    if (this.selectedVehicleDetails) {
      return 'Webshop Vehicle Parts';
    }

    return 'Webshop Catalog';
  }

  private buildListMetadata(): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      page_index: this.pageIndex,
      page_size: this.rowsPerPage,
    };

    if (this.searchTerm) {
      metadata['search_term'] = this.searchTerm;
    }

    if (this.selectedBrandName) {
      metadata['brand'] = this.selectedBrandName;
    }

    if (this.currentCategoryName) {
      metadata['category'] = this.currentCategoryName;
    }

    if (this.currentSubcategoryName) {
      metadata['subcategory'] = this.currentSubcategoryName;
    }

    if (this.selectedVehicleDetails?.mfrName) {
      metadata['vehicle_mfr'] = this.selectedVehicleDetails.mfrName;
    }

    if (this.selectedVehicleDetails?.vehicleModelSeriesName) {
      metadata['vehicle_model'] =
        this.selectedVehicleDetails.vehicleModelSeriesName;
    }

    if (this.selectedVehicleDetails?.description) {
      metadata['vehicle_description'] = this.selectedVehicleDetails.description;
    }

    if (this.primaryFilter) {
      metadata['primary_filter'] = this.primaryFilter;
    }

    return metadata;
  }

  private buildSeoContext() {
    const page = this.pageIndex ?? 0;
    const perPage = this.rowsPerPage ?? 10;

    const brandName = this.selectedBrandName;

    const groupLabels = this.magacinData?.categories
      ? Object.keys(this.magacinData.categories)
      : [];

    const searchTerm = (this.searchTerm || '').trim();
    const resultCount = this.magacinData?.robaDto?.totalElements ?? 0;

    const isVehicle = !!this.tecdocId && !!this.tecdocType;
    const isGroup = !!this.assembleGroupId && !!this.assemblyGroupName;
    const hasSearch = !!searchTerm;

    const isCategoryPage = this.urlHelperService
      .getCurrentPath()
      .startsWith('/webshop/category');
    const currentCategorySlug = isCategoryPage
      ? this.urlHelperService.getCurrentPath()
      : null;
    const isManufacturePage = this.urlHelperService
      .getCurrentPath()
      .startsWith('/webshop/manufacturers');
    const currentManufactureSlug = isManufacturePage
      ? this.urlHelperService.getCurrentPath()
      : null;

    let title = 'Webshop | Automaterijal - Auto delovi, filteri i maziva';
    let description =
      'Kupite auto delove, filtere i maziva online putem našeg Webshopa. Pretraga po vozilu, brendu ili kategoriji. Brza isporuka širom Srbije.';
    let robots: string | undefined;

    // Vozilo
    if (isVehicle && this.selectedVehicleDetails) {
      const v = this.selectedVehicleDetails;
      const vehicleLabel = [
        v.mfrName,
        v.hmdMfrModelName,
        v.description,
        v.engineType,
      ]
        .filter(Boolean)
        .join(' ');
      title = `Delovi za ${vehicleLabel}${page ? ` (str. ${page + 1})` : ''
        } - Automaterijal`;
      description = `Ponuda delova za ${vehicleLabel}${v.beginYearMonth
        ? ` (${v.beginYearMonth} - ${v.endYearMonth || 'trenutno'})`
        : ''
        }. Pretraga po kategoriji, brendu i OE broju.`;
    }

    // Kategorija
    if (isGroup && this.assemblyGroupName) {
      title = `Kategorija: ${this.assemblyGroupName}${page ? ` (str. ${page + 1})` : ''
        } - Automaterijal`;
      description = `Istražite ${this.assemblyGroupName}. Delovi i oprema, brza isporuka.`;
    }

    // Brend
    if (brandName) {
      title = `Webshop | ${brandName} proizvodi - Automaterijal`;
      description = `Kupite ${brandName} proizvode (delovi, filteri, maziva i oprema) putem našeg webshopa. Brza dostava i proveren kvalitet.`;
    }

    // Grupe
    if (this.filter.grupe?.length && groupLabels.length && !isGroup) {
      const allGroups = groupLabels.join(', ');
      title = `Webshop | ${allGroups} - Automaterijal`;
      description = `Istražite ponudu za kategorije: ${allGroups}. Delovi, filteri i maziva za sve potrebe.`;
    }

    // Search
    if (hasSearch && resultCount > 0) {
      title = `Webshop pretraga: "${searchTerm}"${page ? ` (str. ${page + 1})` : ''
        } - Automaterijal`;
      description = `Pronađeno ${resultCount} rezultata za "${searchTerm}". Pogledajte delove, filtere i maziva dostupne za online porudžbinu.`;
    } else if (hasSearch) {
      title = `Webshop pretraga: "${searchTerm}" - Automaterijal`;
      description = `Nažalost, nema rezultata za "${searchTerm}". Pokušajte sa drugim nazivom ili kataloškim brojem.`;
      robots = 'noindex, follow';
    } else if (page > 0 && !isVehicle && !isGroup) {
      title += ` (str. ${page + 1})`;
    }

    if (isCategoryPage && (this.currentCategoryName || this.currentSubcategoryName)) {
      const cat = this.currentCategoryName || '';
      const sub = this.currentSubcategoryName ? ` / ${this.currentSubcategoryName}` : '';
      title = `Kategorija: ${cat}${sub}${page ? ` (str. ${page + 1})` : ''} - Automaterijal`;
      description = `Istražite ponudu: ${cat}${sub}. Delovi i oprema, brza isporuka.`;
    }

    if (!robots) {
      robots = 'index, follow';
    }

    return {
      title,
      description,
      robots,
      brandName,
      page,
      perPage,
      searchTerm,
      resultCount,
      isVehicle,
      isGroup,
      isCategoryPage,
      currentCategorySlug,
      isManufacturePage,
      currentManufactureSlug,
    };
  }

  private buildCanonicalUrlForContext(ctx: any): string {
    if (ctx.isVehicle) {
      const currentPath = this.urlHelperService.getCurrentPath();
      if (currentPath?.includes('/webshop/vozila/')) {
        return buildCanonicalFromPath(currentPath);
      }

      if (this.selectedVehicleDetails) {
        if (ctx.isGroup && this.assembleGroupId) {
          const path = this.vehicleUrlService.buildVehicleGroupPath(
            this.selectedVehicleDetails,
            {
              assemblyGroupName: this.assemblyGroupName,
              assemblyGroupNodeId: this.assembleGroupId,
            }
          );
          return buildCanonicalFromPath(path);
        }

        const path = this.vehicleUrlService.buildVehiclePath(
          this.selectedVehicleDetails
        );
        return buildCanonicalFromPath(path);
      }
    }

    // 1) Brand page
    if (ctx.isManufacturePage) {
      return `https://automaterijal.com${ctx.currentManufactureSlug}`;
    }

    // 2) Category page
    if (ctx.isCategoryPage) {
      return `https://automaterijal.com${ctx.currentCategorySlug}`;
    }

    // 3) Generic search/filter webshop
    const baseUrl = 'https://automaterijal.com/webshop';
    return this.buildCanonicalUrl(baseUrl, {
      search: ctx.searchTerm,
      grupe: this.filter.grupe?.join(',') || '',
      podgrupe: this.filter.podgrupe?.join(',') || '',
      proizvodjaci: this.filter.proizvodjaci?.join(',') || '',
      tecdocId: this.tecdocId ? String(this.tecdocId) : '',
      tecdocType: this.tecdocType || '',
      page: ctx.page > 0 ? String(ctx.page + 1) : '',
      size: ctx.perPage !== 10 ? String(ctx.perPage) : '',
    });
  }

  private buildJsonLdForContext(ctx: any, canonical: string): any {
    if (ctx.isManufacturePage && ctx.brandName) {
      return {
        '@context': 'https://schema.org',
        '@type': 'Brand',
        name: ctx.brandName,
        url: canonical,
      };
    }

    const isCategoryPage = ctx.isCategoryPage;
    if (isCategoryPage && (this.currentCategoryName || this.currentSubcategoryName)) {
      const label = this.currentSubcategoryName
        ? `Kategorija: ${this.currentCategoryName} / ${this.currentSubcategoryName}`
        : `Kategorija: ${this.currentCategoryName}`;
      return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: ctx.title.replace(' - Automaterijal', ''),
        isPartOf: { '@type': 'WebSite', name: 'Automaterijal', url: 'https://automaterijal.com/' },
        about: label,
        url: canonical,
        numberOfItems: ctx.resultCount,
      };
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: ctx.title.replace(' - Automaterijal', ''),
      isPartOf: {
        '@type': 'WebSite',
        name: 'Automaterijal',
        url: 'https://automaterijal.com/',
      },
      about: ctx.searchTerm
        ? `Rezultati pretrage za: ${ctx.searchTerm}`
        : ctx.isVehicle && ctx.isGroup
          ? `Lista artikala - ${this.assemblyGroupName}`
          : ctx.isVehicle
            ? 'Lista artikala za vozilo'
            : ctx.isGroup
              ? `Kategorija: ${this.assemblyGroupName}`
              : 'Lista artikala',
      url: canonical,
      numberOfItems: ctx.resultCount,
    };
  }

  /** Sastavlja canonical sa samo bitnim parametrima; prazne izostavlja */
  private buildCanonicalUrl(
    base: string,
    params: Record<string, string>
  ): string {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    const qp = sp.toString();
    return qp ? `${base}?${qp}` : base;
  }

  private syncPaginationQueryParams(): void {
    const currentParams = this.activatedRoute.snapshot.queryParams;
    const nextPage = String(this.pageIndex);
    const nextRows = String(this.rowsPerPage);

    const needsPageUpdate = currentParams['pageIndex'] !== nextPage;
    const needsRowsUpdate = currentParams['rowsPerPage'] !== nextRows;

    if (!needsPageUpdate && !needsRowsUpdate) {
      return;
    }

    this.urlHelperService.addOrUpdateQueryParams({
      pageIndex: this.pageIndex,
      rowsPerPage: this.rowsPerPage,
    });
  }

  private parseNumberParam(
    value: string | undefined,
    fallback: number,
    min: number
  ): number {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min) {
      return fallback;
    }

    return Math.floor(parsed);
  }

  /** rel=prev/next – zahteva male izmene u SeoService (već koristiš setLinkRel) */
  private setPaginationLinks(
    canonical: string,
    page: number,
    size: number,
    total: number
  ) {
    const totalPages = Math.ceil((total || 0) / (size || 10));
    if (!totalPages || totalPages <= 1) {
      this.seoService.setLinkRel('prev', null);
      this.seoService.setLinkRel('next', null);
      return;
    }
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
