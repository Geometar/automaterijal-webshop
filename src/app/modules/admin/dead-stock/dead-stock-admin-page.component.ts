import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, Subject, takeUntil } from 'rxjs';

import {
  AdminDeadStockItem,
  AdminDeadStockItemsPage,
  AdminDeadStockService
} from '../../../shared/service/admin-dead-stock.service';
import { DeadStockOverridePopupComponent } from '../../../shared/components/dead-stock-override-popup/dead-stock-override-popup.component';
import { SnackbarService } from '../../../shared/service/utils/snackbar.service';
import { formatDeadStockDate } from '../../../shared/utils/dead-stock-ui';
import { AutomTableColumn, CellType } from '../../../shared/data-models/enums/table.enum';
import { TableFlatComponent } from '../../../shared/components/table-flat/table-flat.component';

type DeadStockAdminFilter = 'all' | 'visible' | 'suppressed' | 'no-rule';
type DeadStockAdminTableRow = AdminDeadStockItem & {
  actionLabel: string;
  articleLabel: string;
  articleMeta: string;
  overrideReasonDisplay: string;
  overrideUpdatedByDisplay: string;
  ruleLabel: string;
};

@Component({
  selector: 'app-dead-stock-admin-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableFlatComponent,
    DeadStockOverridePopupComponent,
  ],
  templateUrl: './dead-stock-admin-page.component.html',
  styleUrl: './dead-stock-admin-page.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DeadStockAdminPageComponent implements OnInit, OnDestroy {
  items: DeadStockAdminTableRow[] = [];
  availableBuckets: string[] = [];
  dataSource = new MatTableDataSource<DeadStockAdminTableRow>([]);
  loading = false;
  overridePopupLoading = false;
  updatingIds = new Set<number>();
  searchTerm = '';
  statusFilter: DeadStockAdminFilter = 'all';
  bucketFilter = 'all';
  page = 0;
  pageSize = 50;
  pendingOverrideItem: DeadStockAdminTableRow | null = null;
  pendingOverrideReason = '';
  pendingOverrideSuppressed = false;
  showOverridePopup = false;
  totalElements = 0;
  totalPages = 0;

  private destroy$ = new Subject<void>();
  private searchChanged$ = new Subject<string>();

  columns: AutomTableColumn[] = [
    {
      key: 'articleLabel',
      header: 'Artikal',
      type: CellType.LINK,
      callback: (row) => this.openArticle(row),
    },
    {
      key: 'articleMeta',
      header: 'Šifra',
      type: CellType.TEXT,
    },
    {
      key: 'bucket',
      header: 'Bucket',
      type: CellType.TEXT,
    },
    {
      key: 'daysInDeadStock',
      header: 'Dani',
      type: CellType.NUMBER,
    },
    {
      key: 'lastSaleDate',
      header: 'Poslednja prodaja',
      type: CellType.DATE_ONLY,
      dateFormat: 'dd.MM.yyyy.',
    },
    {
      key: 'ruleLabel',
      header: 'Rule',
      type: CellType.TEXT,
    },
    {
      key: 'customerVisible',
      header: 'Kupac vidi',
      type: CellType.BADGE,
      badgeLabels: {
        trueLabel: 'Da',
        falseLabel: 'Ne',
      },
    },
    {
      key: 'suppressedForCustomer',
      header: 'Suppressed',
      type: CellType.BADGE,
      badgeLabels: {
        trueLabel: 'Da',
        falseLabel: 'Ne',
      },
    },
    {
      key: 'overrideUpdatedByDisplay',
      header: 'Ko je menjao',
      type: CellType.TEXT,
    },
    {
      key: 'overrideUpdatedAt',
      header: 'Kada',
      type: CellType.DATE,
      dateFormat: 'dd.MM.yyyy. HH:mm',
    },
    {
      key: 'overrideReasonDisplay',
      header: 'Razlog',
      type: CellType.TEXT,
    },
    {
      key: 'actionLabel',
      header: 'Akcija',
      type: CellType.LINK,
      callback: (row) => this.openOverridePopup(row),
      disableLink: (row) => this.isUpdating(row.robaId),
    },
  ];
  displayedColumns = this.columns.map((column) => column.key);

  constructor(
    private adminDeadStockService: AdminDeadStockService,
    private router: Router,
    private snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    this.searchChanged$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.page = 0;
        this.loadItems();
      });

    this.loadItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get buckets(): string[] {
    return this.availableBuckets;
  }

  get pagination() {
    return {
      length: this.totalElements,
      pageIndex: this.page,
      pageSize: this.pageSize,
      pageSizeOptions: [25, 50, 100],
    };
  }

  get fromRow(): number {
    return this.totalElements === 0 ? 0 : this.page * this.pageSize + 1;
  }

  get toRow(): number {
    return Math.min((this.page + 1) * this.pageSize, this.totalElements);
  }

  get canGoPrev(): boolean {
    return this.page > 0;
  }

  get canGoNext(): boolean {
    return this.page + 1 < this.totalPages;
  }

  onSearchChanged(term: string): void {
    this.searchTerm = term;
    this.searchChanged$.next(term.trim());
  }

  formatDate(raw?: string | null): string {
    return formatDeadStockDate(raw) ?? '-';
  }

  isUpdating(robaId: number): boolean {
    return this.updatingIds.has(robaId);
  }

  onFiltersChanged(): void {
    this.page = 0;
    this.loadItems();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadItems();
  }

  openOverridePopup(item: DeadStockAdminTableRow): void {
    if (!item?.robaId || this.isUpdating(item.robaId)) {
      return;
    }

    this.pendingOverrideItem = item;
    this.pendingOverrideSuppressed = !item.suppressedForCustomer;
    this.pendingOverrideReason = item.overrideReason ?? '';
    this.showOverridePopup = true;
  }

  closeOverridePopup(): void {
    if (this.overridePopupLoading) {
      return;
    }

    this.pendingOverrideItem = null;
    this.pendingOverrideReason = '';
    this.pendingOverrideSuppressed = false;
    this.showOverridePopup = false;
  }

  confirmOverridePopup(reason: string): void {
    const item = this.pendingOverrideItem;
    if (!item?.robaId || this.overridePopupLoading) {
      return;
    }

    const nextSuppressed = this.pendingOverrideSuppressed;
    this.overridePopupLoading = true;
    this.updatingIds.add(item.robaId);
    this.adminDeadStockService
      .updateOverride(item.robaId, {
        suppressedForCustomer: nextSuppressed,
        reason,
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.overridePopupLoading = false;
          this.updatingIds.delete(item.robaId);
        })
      )
      .subscribe({
        next: () => {
          this.pendingOverrideItem = null;
          this.pendingOverrideReason = '';
          this.pendingOverrideSuppressed = false;
          this.showOverridePopup = false;
          this.loadItems();
          this.snackbarService.showSuccess(
            nextSuppressed
              ? 'Artikal je sakriven za kupca'
              : 'Artikal je vracen kupcu'
          );
        },
        error: () => {
          this.snackbarService.showError('Promena dead stock override nije uspela');
        },
      });
  }

  private openArticle(item: DeadStockAdminTableRow): void {
    if (!item?.robaId) {
      return;
    }

    this.router.navigate(['/webshop', item.robaId]);
  }

  private loadItems(): void {
    this.loading = true;
    this.adminDeadStockService
      .fetchItems({
        page: this.page,
        size: this.pageSize,
        search: this.searchTerm,
        status: this.statusFilter,
        bucket: this.bucketFilter === 'all' ? null : this.bucketFilter,
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (response: AdminDeadStockItemsPage) => {
          this.items = (response?.items ?? []).map((item) => this.toTableRow(item));
          this.dataSource.data = this.items;
          this.totalElements = response?.totalElements ?? 0;
          this.totalPages = response?.totalPages ?? 0;
          this.availableBuckets = response?.availableBuckets ?? [];
        },
        error: () => {
          this.items = [];
          this.dataSource.data = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.availableBuckets = [];
          this.snackbarService.showError('Ucitavanje dead stock kandidata nije uspelo');
        },
      });
  }

  private toTableRow(item: AdminDeadStockItem): DeadStockAdminTableRow {
    const articleLabel = [item.proizvodjacNaziv, item.naziv].filter(Boolean).join(' ').trim();
    const articleMeta = [item.katbr ? `#${item.katbr}` : null, item.proid].filter(Boolean).join(' • ');

    return {
      ...item,
      actionLabel: item.suppressedForCustomer ? 'Vrati kupcu' : 'Sakrij za kupca',
      articleLabel: articleLabel || `Artikal ${item.robaId}`,
      articleMeta: articleMeta || '-',
      overrideReasonDisplay: item.overrideReason || '-',
      overrideUpdatedByDisplay: item.overrideUpdatedByName || '-',
      ruleLabel: item.hasRule ? (item.badgeLabel || 'Da') : 'Ne',
    };
  }
}
