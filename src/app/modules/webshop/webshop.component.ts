import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { PictureService } from '../../shared/service/utils/picture.service';
import { RobaService } from '../../shared/service/roba.service';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { TecdocService } from '../../shared/service/tecdoc.service';
import { WebshopLogicService } from '../../shared/service/utils/webshop-logic.service';
import { WebshopStateService } from '../../shared/service/utils/webshop-state.service';

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
    private logicService: WebshopLogicService,
    private pictureService: PictureService,
    private robaService: RobaService,
    private stateService: WebshopStateService,
    private tecdocService: TecdocService,
  ) { }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
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
          this.magacinData = response;
          this.currentState = this.state.SHOW_ARTICLES;
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
    this.currentState === this.state.SHOW_ARTICLES_WITH_VEHICLE_DETAILS ? this.getArticlesByAssembleGroup(this.tecdocId!, this.tecdocType!, this.assembleGroupId) :
      this.getRoba();
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
   * Handles query parameters and updates the component's state accordingly.
   * @param params The query parameters.
   * @param isInitialLoad Flag to determine if this is the initial load.
   */
  private handleQueryParams(params: QueryParams, isInitialLoad: boolean = false): void {
    // Extract and safely parse all parameters
    const searchTerm = params.searchTerm || '';
    const tecdocType = params.tecdocType || '';
    const tecdocId = params.tecdocId ? +params.tecdocId : null;
    const assembleGroupId = params.assembleGroupId || '';

    const mandatoryProid = params.mandatoryproid || '';
    const mandatoryGrupe = params.grupe || '';

    this.assemblyGroupName = params.assemblyGroupName || '';

    // Create a filter object from parameters
    const filter = this.logicService.createFilterFromParams(params);
    const filtersChanged = this.logicService.haveFiltersChanged(this.filter, filter);

    // Determine if parameters are empty and an empty container should be shown
    const isEmptyParams = this.stateService.shouldShowEmptyContainer(
      searchTerm,
      mandatoryProid,
      mandatoryGrupe,
      tecdocId,
      tecdocType,
    );

    if (isEmptyParams) {
      this.updateState(WebShopState.SHOW_EMPTY_CONTAINER, searchTerm);
      return;
    }

    // Determine if we need to fetch new vehicle details
    const shouldFetchNewVehicleDetails = this.shouldFetchVehicleDetails(tecdocType, tecdocId);

    if (shouldFetchNewVehicleDetails && tecdocId !== null) {
      this.getTDVehicleDetails(tecdocId, tecdocType);
    }

    // Determine if an assemble group is selected
    const assembleGroupSelected = !!assembleGroupId;

    // Determine the state of the webshop
    this.currentState = this.determineWebShopState({
      showVehicleDetails: !!tecdocId && !!tecdocType,
      assembleGroupSelected
    });

    // Update state based on new parameters
    this.updateStateBasedOnQueryParams({
      searchTerm,
      filter,
      isInitialLoad,
      filtersChanged,
      assembleGroupId,
    });

    // Fetch data based on the current state
    this.fetchDataBasedOnCurrentState({
      tecdocType,
      tecdocId,
      assembleGroupId,
      filtersChanged,
      isInitialLoad,
    });
  }

  /**
   * Updates the component's state based on query parameters.
   */
  private updateStateBasedOnQueryParams({
    searchTerm,
    filter,
    isInitialLoad,
    filtersChanged,
    assembleGroupId,
  }: {
    searchTerm: string;
    filter: Filter;
    isInitialLoad: boolean;
    filtersChanged: boolean;
    assembleGroupId: string;
  }): void {
    const isSearchTermChanged = searchTerm !== this.searchTerm;
    const isMandatoryFilterActive = !!filter.mandatoryProid!.length || !!filter.grupe!.length;
    const isResetNeeded = this.currentState === this.state.SHOW_ARTICLES ? isSearchTermChanged : false;
    if (!isInitialLoad && !isMandatoryFilterActive && isResetNeeded) {
      this.filter = new Filter();
    } else {
      this.filter = filter;
    }

    this.searchTerm = searchTerm;
    this.assembleGroupId = assembleGroupId;
  }

  /**
   * Fetches data based on the current component state.
   */
  private fetchDataBasedOnCurrentState({
    tecdocType,
    tecdocId,
    assembleGroupId,
    filtersChanged,
    isInitialLoad,
  }: {
    tecdocType: string;
    tecdocId: number | null;
    assembleGroupId: string;
    filtersChanged: boolean;
    isInitialLoad: boolean;
  }): void {
    switch (this.currentState) {
      case WebShopState.SHOW_VEHICLE_DETAILS:
        if (tecdocId !== null && (!this.selectedVehicleDetails || this.selectedVehicleDetails.linkageTargetId !== tecdocId)) {
          this.getTDVehicleDetails(tecdocId, tecdocType);
        }
        break;
      case WebShopState.SHOW_ARTICLES_WITH_VEHICLE_DETAILS:
        if (tecdocId !== null) {
          this.getArticlesByAssembleGroup(tecdocId, tecdocType, assembleGroupId, isInitialLoad || filtersChanged);
        }
        break;
      case WebShopState.SHOW_ARTICLES:
        this.getRoba(isInitialLoad || filtersChanged);
        break;
    }
  }

  /**
   * Determines if a new vehicle detail fetch is required.
   */
  private shouldFetchVehicleDetails(tecdocType: string, tecdocId: number | null): boolean {
    return (
      tecdocId !== null &&
      (!this.selectedVehicleDetails ||
        this.selectedVehicleDetails.linkageTargetType !== tecdocType ||
        this.selectedVehicleDetails.linkageTargetId !== tecdocId)
    );
  }

  /**
   * Determines the correct state for the WebShop based on conditions.
   */
  private determineWebShopState({
    showVehicleDetails,
    assembleGroupSelected
  }: {
    showVehicleDetails: boolean;
    assembleGroupSelected: boolean
  }): WebShopState {
    if (assembleGroupSelected) {
      return WebShopState.SHOW_ARTICLES_WITH_VEHICLE_DETAILS;
    }
    if (showVehicleDetails) {
      return WebShopState.SHOW_VEHICLE_DETAILS;
    }
    return WebShopState.SHOW_ARTICLES;
  }

  /**
   * Updates the current state and assigns a search term.
   */
  private updateState(newState: WebShopState, searchTerm: string): void {
    this.currentState = newState;
    this.searchTerm = searchTerm;
  }

  // End of: Private methods
}
