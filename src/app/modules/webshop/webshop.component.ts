import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize, Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

// Components imports
import { WebshopEmptyComponent } from './webshop-empty/webshop-empty.component';
import { WebshopNavComponent } from './webshop-nav/webshop-nav.component';
import { WebshopRobaComponent } from './webshop-roba/webshop-roba.component';

// Data models
import { Filter, Magacin } from '../../shared/data-models/model/roba';
import { TablePage } from '../../shared/data-models/model/page';

// Services
import { PictureService } from '../../shared/service/utils/picture.service';
import { RobaService } from '../../shared/service/roba.service';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';

export enum WebShopState {
  SHOW_ARTICLES,
  SHOW_EMPTY_CONTAINER,
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
  magacinData: Magacin | null = null;

  // Misc
  loading = false;
  internalLoading = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private pictureService: PictureService,
    private robaService: RobaService
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
          this.pictureService.convertByteToImage(response.robaDto!.content);
          this.magacinData = response;
          this.currentState = this.state.SHOW_ARTICLES;
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
    this.getRoba();
  }

  // Setters end

  // Start of: Private methods

  /**
   * Handles query parameters and updates the component's state accordingly.
   * @param params The query parameters.
   * @param isInitialLoad Flag to determine if this is the initial load.
   */
  private handleQueryParams(params: any, isInitialLoad: boolean = false): void {
    const searchTerm = params['searchTerm'] || '';
    const mandatoryProid = params['mandatoryproid'] || '';
    const mandatoryOnInit = !!mandatoryProid && isInitialLoad;

    if (this.shouldShowEmptyContainer(searchTerm, mandatoryProid, mandatoryOnInit)) {
      this.currentState = WebShopState.SHOW_EMPTY_CONTAINER;
      return;
    }

    this.currentState = WebShopState.SHOW_ARTICLES;

    const newFilter = this.createFilterFromParams(params);
    const isSameSearchTerm = searchTerm === this.searchTerm;
    const filtersChanged = this.haveFiltersChanged(this.filter, newFilter);

    if (!isInitialLoad && isSameSearchTerm && !filtersChanged) {
      return;
    }

    this.updateState(searchTerm, newFilter, isInitialLoad, isSameSearchTerm, !!mandatoryProid);
    this.getRoba(isInitialLoad || filtersChanged);
  }

  /**
   * Updates the component's state based on query parameters.
   */
  private updateState(
    searchTerm: string,
    newFilter: Filter,
    isInitialLoad: boolean,
    isSameSearchTerm: boolean,
    isMandatoryFilterOn: boolean
  ): void {
    this.searchTerm = searchTerm;

    if (!isInitialLoad && !isMandatoryFilterOn && (!this.searchTerm || !isSameSearchTerm)) {
      this.filter = new Filter();
    } else {
      this.filter = newFilter;
      if (!isSameSearchTerm && isMandatoryFilterOn) {
        this.filter.podgrupe = [];
      }
    }
  }

  /**
   * Creates a filter object from the provided query parameters.
   * @param params The query parameters.
   * @returns A new Filter object.
   */
  private createFilterFromParams(params: any): Filter {
    const filter = new Filter();
    filter.podgrupe = this.splitParams(params['podgrupe']);
    filter.mandatoryProid = this.splitParams(params['mandatoryproid']);
    filter.naStanju = params['naStanju'] === 'true';
    filter.proizvodjaci = this.splitParams(params['proizvodjaci']);
    return filter;
  }

  /**
 * Compares two filter objects for equality.
 * @param oldFilter The existing filter.
 * @param newFilter The new filter to compare.
 * @returns True if the filters are different, otherwise false.
 */
  private haveFiltersChanged(oldFilter: Filter, newFilter: Filter): boolean {
    // Deep comparison to check for differences
    return !this.deepEqual(oldFilter, newFilter);
  }

  /**
  * Performs a deep equality check on two objects.
  * @param obj1 The first object to compare.
  * @param obj2 The second object to compare.
  * @returns True if objects are equal, otherwise false.
  */
  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) {
      return true; // Same reference or value
    }

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
      return false; // Primitive or one is null
    }

    const keys1 = Object.keys(obj1).sort();
    const keys2 = Object.keys(obj2).sort();

    if (keys1.length !== keys2.length) {
      return false; // Different number of keys
    }

    for (let key of keys1) {
      if (!keys2.includes(key) || !this.deepEqual(obj1[key], obj2[key])) {
        return false; // Key missing or values not equal
      }
    }

    return true;
  }

  private splitParams(param: string): string[] {
    if (!param) {
      return [];
    }

    return param.includes(',') ? param.split(',') : [param];
  }

  /**
   * Checks whether the component should display an empty container.
   */
  private shouldShowEmptyContainer(searchTerm: string, mandatoryProid: string, mandatoryOnInit: boolean): boolean {
    return !searchTerm && !mandatoryProid && !mandatoryOnInit;
  }

  // End of: Private methods
}
