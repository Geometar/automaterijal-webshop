import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { finalize, Subject, takeUntil } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';

import { HeaderData } from '../../../shared/data-models/interface/header.interface';
import { PaginatedResponse, ProviderBacklogItem } from '../../../shared/data-models/model';
import { AutomTableColumn, CellType } from '../../../shared/data-models/enums/table.enum';
import { HeadingLevelEnum } from '../../../shared/data-models/enums/heading.enum';
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  PositionEnum,
  SizeEnum,
} from '../../../shared/data-models/enums';

import { AutomHeaderComponent } from '../../../shared/components/autom-header/autom-header.component';
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { PopupComponent } from '../../../shared/components/popup/popup.component';
import { TableFlatComponent } from '../../../shared/components/table-flat/table-flat.component';
import { TextAreaComponent } from '../../../shared/components/text-area/text-area.component';

import { InvoiceService } from '../../../shared/service/invoice.service';
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';
import { SnackbarService } from '../../../shared/service/utils/snackbar.service';

type ProviderBacklogStatusCode = 'NIJE_PREUZETA' | 'ZAVRSENA' | 'NEUSPESNA';

const ProviderBacklogHeader: HeaderData = {
  titleInfo: {
    title: 'Backlog provajder artikala',
  },
};

@Component({
  selector: 'app-provider-backlog',
  standalone: true,
  imports: [
    AutomHeaderComponent,
    AutomIconComponent,
    ButtonComponent,
    CommonModule,
    PopupComponent,
    TableFlatComponent,
    TextAreaComponent,
  ],
  providers: [CurrencyPipe],
  templateUrl: './provider-backlog.component.html',
  styleUrl: './provider-backlog.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ProviderBacklogComponent implements OnInit, OnDestroy {
  headerData = ProviderBacklogHeader;
  headingLevelEnum = HeadingLevelEnum;
  buttonThemes = ButtonThemes;
  buttonTypes = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  private readonly actionColumns: AutomTableColumn[] = [
    {
      key: 'providerActionCompleteLabel',
      header: 'Zavrsi',
      type: CellType.LINK,
      callback: (row) => this.onItemCompleted(row),
      disableLink: (row) => !this.canUpdateStatus(row),
    },
    {
      key: 'providerActionFailLabel',
      header: 'Neuspesno',
      type: CellType.LINK,
      callback: (row) => this.onItemFailed(row),
      disableLink: (row) => !this.canUpdateStatus(row),
    },
  ];

  private readonly coreColumns: AutomTableColumn[] = [
    {
      key: 'invoiceId',
      header: 'Porudzbenica',
      type: CellType.LINK,
      callback: (row) => this.onInvoiceClick(row),
      disableLink: (row) => row?.invoiceId == null,
    },
    { key: 'providerKey', header: 'Provider', type: CellType.TEXT },
    { key: 'catalogNumber', header: 'Kat br', type: CellType.TEXT },
    { key: 'articleName', header: 'Naziv', type: CellType.TEXT },
    { key: 'partnerName', header: 'Partner', type: CellType.TEXT },
    { key: 'orderedQuantity', header: 'Poruceno', type: CellType.NUMBER },
    { key: 'confirmedQuantity', header: 'Potvrdjeno', type: CellType.NUMBER },
    {
      key: 'orderedAt',
      header: 'Vreme porucivanja',
      type: CellType.DATE,
      dateFormat: 'dd-MMM-yyyy HH:mm',
    },
    { key: 'deliveryEtaLabel', header: 'Vreme isporuke', type: CellType.TEXT },
  ];

  private readonly auditCommonColumns: AutomTableColumn[] = [
    {
      key: 'providerStatusUpdatedAt',
      header: 'Azurirano',
      type: CellType.DATE,
      dateFormat: 'dd-MMM-yyyy HH:mm',
    },
    { key: 'providerStatusUpdatedByName', header: 'Azurirao', type: CellType.TEXT },
  ];

  private readonly providerReasonColumn: AutomTableColumn = {
    key: 'providerStatusReason',
    header: 'Razlog',
    type: CellType.TEXT,
  };

  private readonly providerMessageColumn: AutomTableColumn = {
    key: 'providerMessage',
    header: 'Poruka',
    type: CellType.TEXT,
  };

  columns: AutomTableColumn[] = [];
  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<ProviderBacklogItem>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  loading = false;
  pageIndex = 0;
  rowsPerPage = 20;
  totalItems = 0;
  statusFilter: ProviderBacklogStatusCode = 'NIJE_PREUZETA';
  updatingItemIds = new Set<number>();
  showStatusPopup = false;
  statusPopupLoading = false;
  pendingStatusRow: ProviderBacklogItem | null = null;
  pendingStatusAction: Exclude<ProviderBacklogStatusCode, 'NIJE_PREUZETA'> | null = null;
  pendingStatusReason = '';

  private destroy$ = new Subject<void>();

  constructor(
    private invoiceService: InvoiceService,
    private urlHelperService: UrlHelperService,
    private router: Router,
    private snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    const params = this.urlHelperService.readQueryParams();
    this.pageIndex = params['pageIndex'] ? +params['pageIndex'] : 0;
    this.rowsPerPage = params['rowsPerPage'] ? +params['rowsPerPage'] : 20;
    const status = (params['status'] || '').toString().trim().toUpperCase();
    if (status === 'NIJE_PREUZETA' || status === 'ZAVRSENA' || status === 'NEUSPESNA') {
      this.statusFilter = status as ProviderBacklogStatusCode;
    }

    this.rebuildColumns();
    this.getBacklog();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getBacklog(): void {
    this.urlHelperService.addOrUpdateQueryParams({
      pageIndex: this.pageIndex,
      rowsPerPage: this.rowsPerPage,
      status: this.statusFilter,
    });

    this.loading = true;
    this.invoiceService
      .getAdminProviderBacklog(this.pageIndex, this.rowsPerPage, this.statusFilter)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: PaginatedResponse<ProviderBacklogItem>) => {
          const rows = response?.content ?? [];
          this.decorateRows(rows);
          this.dataSource.data = rows;
          this.totalItems = response?.totalElements ?? 0;
          this.pageIndex = response?.number ?? this.pageIndex;
          this.rowsPerPage = response?.size ?? this.rowsPerPage;
        },
        error: () => {
          this.dataSource.data = [];
          this.totalItems = 0;
        },
      });
  }

  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.rowsPerPage = event.pageSize;
    this.getBacklog();
  }

  onStatusFilterChange(value: ProviderBacklogStatusCode): void {
    if (this.statusFilter === value) {
      return;
    }
    this.statusFilter = value;
    this.pageIndex = 0;
    this.rebuildColumns();
    this.getBacklog();
  }

  onInvoiceClick(row: ProviderBacklogItem): void {
    const invoiceId = Number(row?.invoiceId);
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
      return;
    }
    this.router.navigateByUrl(`/admin/invoices/${invoiceId}`);
  }

  onItemCompleted(row: ProviderBacklogItem): void {
    if (!this.canUpdateStatus(row)) {
      return;
    }
    this.openStatusPopup(row, 'ZAVRSENA');
  }

  onItemFailed(row: ProviderBacklogItem): void {
    if (!this.canUpdateStatus(row)) {
      return;
    }
    this.openStatusPopup(row, 'NEUSPESNA');
  }

  closeStatusPopup(force = false): void {
    if (this.statusPopupLoading && !force) {
      return;
    }
    this.showStatusPopup = false;
    this.pendingStatusRow = null;
    this.pendingStatusAction = null;
    this.pendingStatusReason = '';
  }

  confirmStatusPopup(): void {
    if (!this.pendingStatusRow || !this.pendingStatusAction) {
      return;
    }
    const reason =
      this.pendingStatusAction === 'NEUSPESNA'
        ? (this.pendingStatusReason || '').trim()
        : null;
    if (this.pendingStatusAction === 'NEUSPESNA' && !reason) {
      this.snackbarService.showError('Razlog je obavezan.');
      return;
    }
    this.updateStatus(this.pendingStatusRow, this.pendingStatusAction, reason);
  }

  private decorateRows(rows: ProviderBacklogItem[]): void {
    rows.forEach((row) => {
      const status = this.normalizeStatus(row?.providerItemStatus);
      row.providerItemStatus = status;
      row.providerItemStatusLabel = this.statusLabel(status);
      const pending = status === 'NIJE_PREUZETA';
      row.providerActionCompleteLabel = pending ? 'Zavrsi' : '-';
      row.providerActionFailLabel = pending ? 'Neuspesno' : '-';
      row.providerStatusUpdatedByName =
        (row.providerStatusUpdatedByName || '').trim() || '-';
      row.deliveryEtaLabel = (row.deliveryEtaLabel || '').trim() || '-';
    });
  }

  private rebuildColumns(): void {
    if (this.statusFilter === 'NIJE_PREUZETA') {
      this.columns = [...this.coreColumns, ...this.actionColumns];
    } else if (this.statusFilter === 'ZAVRSENA') {
      this.columns = [...this.coreColumns, ...this.auditCommonColumns, this.providerMessageColumn];
    } else {
      this.columns = [
        ...this.coreColumns,
        ...this.auditCommonColumns,
        this.providerReasonColumn,
        this.providerMessageColumn,
      ];
    }
    this.displayedColumns = this.columns.map((col) => col.key);
  }

  private openStatusPopup(
    row: ProviderBacklogItem,
    status: Exclude<ProviderBacklogStatusCode, 'NIJE_PREUZETA'>
  ): void {
    this.pendingStatusRow = row;
    this.pendingStatusAction = status;
    this.pendingStatusReason = '';
    this.showStatusPopup = true;
  }

  private normalizeStatus(
    status: ProviderBacklogItem['providerItemStatus'] | undefined
  ): ProviderBacklogStatusCode {
    if (status === 'ZAVRSENA' || status === 'NEUSPESNA' || status === 'NIJE_PREUZETA') {
      return status;
    }
    return 'NIJE_PREUZETA';
  }

  private statusLabel(status: ProviderBacklogStatusCode): string {
    if (status === 'ZAVRSENA') {
      return 'Zavrsena';
    }
    if (status === 'NEUSPESNA') {
      return 'Neuspesna';
    }
    return 'Nije preuzeta';
  }

  private canUpdateStatus(row: ProviderBacklogItem | null | undefined): boolean {
    const itemId = Number(row?.itemId);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return false;
    }
    if (this.updatingItemIds.has(itemId)) {
      return false;
    }
    return this.normalizeStatus(row?.providerItemStatus) === 'NIJE_PREUZETA';
  }

  private updateStatus(
    row: ProviderBacklogItem,
    status: Exclude<ProviderBacklogStatusCode, 'NIJE_PREUZETA'>,
    reason: string | null
  ): void {
    const itemId = Number(row?.itemId);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      this.snackbarService.showError('Nije moguce promeniti status stavke.');
      return;
    }

    this.statusPopupLoading = true;
    this.updatingItemIds.add(itemId);
    this.invoiceService
      .updateAdminProviderItemStatus(itemId, status, reason)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.updatingItemIds.delete(itemId);
          this.statusPopupLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.closeStatusPopup(true);
          this.snackbarService.showSuccess(
            status === 'ZAVRSENA'
              ? 'Stavka je oznacena kao Zavrsena.'
              : 'Stavka je oznacena kao Neuspesna.'
          );
          this.getBacklog();
        },
        error: (err: HttpErrorResponse) => {
          const details =
            (err?.error?.message as string) ||
            (err?.error?.details as string) ||
            'Promena statusa nije uspela.';
          this.snackbarService.showError(details);
        },
      });
  }

  get popupTitle(): string {
    return this.pendingStatusAction === 'NEUSPESNA'
      ? 'Označi stavku kao neuspešnu'
      : 'Označi stavku kao završenu';
  }

  get popupConfirmLabel(): string {
    return this.pendingStatusAction === 'NEUSPESNA'
      ? 'Potvrdi neuspešno'
      : 'Potvrdi završeno';
  }

  get popupDescription(): string {
    if (this.pendingStatusAction === 'NEUSPESNA') {
      return 'Unesi razlog zbog kog stavka nije uspešno realizovana.';
    }
    return 'Potvrdi da je stavka uspešno obrađena i završena.';
  }
}
