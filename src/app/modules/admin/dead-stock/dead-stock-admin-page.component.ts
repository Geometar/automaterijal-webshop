import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { finalize, Subject, takeUntil } from 'rxjs';

import { Filter, Magacin, Roba } from '../../../shared/data-models/model/roba';
import { RobaService } from '../../../shared/service/roba.service';
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';
import { WebshopLogicService } from '../../../shared/service/utils/webshop-logic.service';
import { SnackbarService } from '../../../shared/service/utils/snackbar.service';
import { WebshopNavBreadcrumbs, WebshopNavComponent } from '../../webshop/webshop-nav/webshop-nav.component';
import { WebshopRobaComponent } from '../../webshop/webshop-roba/webshop-roba.component';
import { TablePage } from '../../../shared/data-models/model/page';

@Component({
  selector: 'app-dead-stock-admin-page',
  standalone: true,
  imports: [CommonModule, WebshopNavComponent, WebshopRobaComponent],
  templateUrl: './dead-stock-admin-page.component.html',
  styleUrl: './dead-stock-admin-page.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DeadStockAdminPageComponent implements OnInit, OnDestroy {
  filter: Filter = this.buildBaseFilter();
  loading = false;
  magacin: Magacin | null = null;
  pageIndex = 0;
  pageSize = 10;
  searchTerm = '';
  readonly customBreadcrumbs: WebshopNavBreadcrumbs = {
    second: 'Mrtav lager',
  };

  private readonly destroy$ = new Subject<void>();

  constructor(
    private activatedRoute: ActivatedRoute,
    private logicService: WebshopLogicService,
    private robaService: RobaService,
    private snackbarService: SnackbarService,
    private urlHelperService: UrlHelperService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.syncFromQueryParams(params);
        this.loadItems();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get items(): Roba[] {
    return this.magacin?.robaDto?.content ?? [];
  }

  get totalElements(): number {
    return this.magacin?.robaDto?.totalElements ?? 0;
  }

  handleTablePageEvent(tablePage: TablePage): void {
    this.urlHelperService.addOrUpdateQueryParams({
      pageIndex: tablePage.pageIndex,
      rowsPerPage: tablePage.pageSize,
    });
  }

  private loadItems(): void {
    this.loading = true;
    this.robaService
      .pronadjiSvuRobu(
        null,
        this.pageSize,
        this.pageIndex,
        this.searchTerm,
        this.filter
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (magacin) => {
          this.magacin = magacin;
        },
        error: () => {
          this.magacin = null;
          this.snackbarService.showError(
            'Učitavanje mrtvog lagera nije uspelo.'
          );
        },
      });
  }

  private syncFromQueryParams(params: Params): void {
    this.filter = this.buildBaseFilter();
    const parsed = this.logicService.createFilterFromParams(params);
    this.filter.proizvodjaci = parsed.proizvodjaci;
    this.filter.podgrupe = parsed.podgrupe;
    this.filter.filterBy = parsed.filterBy;

    this.searchTerm =
      typeof params['searchTerm'] === 'string' ? params['searchTerm'] : '';
    this.pageIndex = this.parseNonNegativeInt(params['pageIndex'], 0);
    this.pageSize = this.parsePositiveInt(params['rowsPerPage'], 10);
  }

  private buildBaseFilter(): Filter {
    const filter = new Filter();
    filter.deadStock = true;
    filter.naStanju = false;
    filter.filterBy = undefined;
    return filter;
  }

  private parseNonNegativeInt(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
  }

  private parsePositiveInt(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  }
}
