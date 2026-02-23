import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

// Component imports
import { AutomIconComponent } from '../../../../shared/components/autom-icon/autom-icon.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PopupComponent } from '../../../../shared/components/popup/popup.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { TableFlatComponent } from '../../../../shared/components/table-flat/table-flat.component';
import { TextAreaComponent } from '../../../../shared/components/text-area/text-area.component';
import { RsdCurrencyPipe } from '../../../../shared/pipe/rsd-currency.pipe';

// Data models
import { Invoice, InvoiceItem } from '../../../../shared/data-models/model';
import { AvailabilityStatus, ProviderAvailabilityDto } from '../../../../shared/data-models/model/availability';
import { StringUtils } from '../../../../shared/utils/string-utils';
import {
  EXTERNAL_WAREHOUSE_LABEL,
  isProviderSource
} from '../../../../shared/utils/availability-utils';
import { OrderOutcome, orderOutcomeIcon, resolveOrderOutcome } from '../../../../shared/utils/order-status-utils';

// Enums
import {
  AutomTableColumn,
  CellType,
} from '../../../../shared/data-models/enums/table.enum';
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  PositionEnum,
  SizeEnum,
} from '../../../../shared/data-models/enums';

// Service
import { AccountStateService } from '../../../../shared/service/state/account-state.service';
import { InvoiceService } from '../../../../shared/service/invoice.service';
import { PictureService } from '../../../../shared/service/utils/picture.service';
import { SnackbarService } from '../../../../shared/service/utils/snackbar.service';

type ProviderItemStatusCode = 'NIJE_PREUZETA' | 'ZAVRSENA' | 'NEUSPESNA';

@Component({
  selector: 'app-invoice-details',
  standalone: true,
  imports: [
    AutomIconComponent,
    ButtonComponent,
    CommonModule,
    PopupComponent,
    RsdCurrencyPipe,
    SpinnerComponent,
    TableFlatComponent,
    TextAreaComponent,
  ],
  providers: [CurrencyPipe],
  templateUrl: './invoice-details.component.html',
  styleUrl: './invoice-details.component.scss',
})
export class InvoiceDetailsComponent implements OnInit {
  id: number | null = null;
  ppid: number | null = null;

  // Table config
  columns: AutomTableColumn[] = [];
  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<InvoiceItem>();

  // Paging and Sorting elements
  pageIndex = 0;
  rowsPerPage = 10;
  totalItems = 0;


  // Data
  data: Invoice | null = null;
  noteHtml: string | null = null;
  statusOutcome: OrderOutcome | null = null;

  // Enums
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  buttonThemes = ButtonThemes;
  buttonTypes = ButtonTypes;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;
  isAdmin = false;
  isEmployee = false;
  readonly febiProviderKey = 'febi-stock';
  readonly febiDeliveryPartyDefault = '0001001983';
  readonly febiDeliveryPartyPickup = '0001003023';
  readonly gazelaProviderKey = 'gazela';
  readonly gazelaDocumentFaktura = '1';
  readonly gazelaDocumentRevers = '2';
  readonly gazelaDocumentReversLegacy = '3';

  // Misc loading
  loading = false;
  updatingProviderItems = new Set<number>();
  showProviderStatusPopup = false;
  providerStatusPopupLoading = false;
  popupProviderItem: InvoiceItem | null = null;
  popupProviderStatus: Exclude<ProviderItemStatusCode, 'NIJE_PREUZETA'> | null = null;
  popupProviderReason = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private destroy$ = new Subject<void>();

  constructor(
    private accountStateService: AccountStateService,
    private invoiceService: InvoiceService,
    private pictureService: PictureService,
    private snackbarService: SnackbarService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  /** Start of: Angular lifecycle hooks */
  ngOnInit(): void {
    this.isAdmin = this.accountStateService.isAdmin();
    this.isEmployee = this.accountStateService.isEmployee();
    this.configureColumns();

    const hasPpidParam = this.route.snapshot.paramMap.has('ppid');
    const rawPpid = this.route.snapshot.paramMap.get('ppid');
    const parsedPpid = rawPpid ? Number(rawPpid) : NaN;
    if (Number.isFinite(parsedPpid)) {
      this.ppid = parsedPpid;
    } else if (this.isAdmin && !hasPpidParam) {
      this.ppid = null;
    } else {
      this.ppid = this.accountStateService.get().ppid ?? null;
    }

    const rawId = this.route.snapshot.paramMap.get('id');
    const parsed = rawId ? Number(rawId) : NaN;
    this.id = Number.isFinite(parsed) ? parsed : null;

    if (this.id != null && this.isAdmin && !hasPpidParam) {
      this.fetchAdminData(this.id);
    } else if (this.id != null && this.ppid != null) {
      this.fetchData(this.id);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** End of: Angular lifecycle hooks */

  // Start of: Events

  fetchData(id: number): void {
    this.loading = true;
    this.invoiceService
      .fetchDetails(this.ppid!, id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (invoice: Invoice) => {
          this.data = invoice;
          this.statusOutcome = this.resolveInvoiceOutcome(invoice);
          this.noteHtml = this.buildNoteHtml(invoice?.napomena);
          const items: InvoiceItem[] = invoice.detalji ?? [];
          this.decorateInvoiceItems(items);
          this.configureColumns(invoice);

          this.dataSource.data = items;
          this.totalItems = items.length;
          this.pageIndex = 0;
          this.rowsPerPage = items.length;
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        },
      });
  }

  fetchAdminData(id: number): void {
    this.loading = true;
    this.invoiceService
      .fetchAdminDetails(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (invoice: Invoice) => {
          this.data = invoice;
          this.statusOutcome = this.resolveInvoiceOutcome(invoice);
          this.noteHtml = this.buildNoteHtml(invoice?.napomena);
          const items: InvoiceItem[] = invoice.detalji ?? [];
          this.decorateInvoiceItems(items);
          this.configureColumns(invoice);

          this.dataSource.data = items;
          this.totalItems = items.length;
          this.pageIndex = 0;
          this.rowsPerPage = items.length;
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        },
      });
  }

  onItemClicked(item: InvoiceItem): void {
    if (item.robaId != null) {
      const slug = StringUtils.productSlug(
        item?.proizvodjac?.naziv,
        item?.naziv,
        item?.kataloskiBroj
      );
      const idParam = slug ? `${item.robaId}-${slug}` : String(item.robaId);
      this.router.navigateByUrl('/webshop/' + idParam);
      return;
    }

    if (item.tecDocArticleId != null) {
      const slug = StringUtils.productSlug(
        item?.proizvodjac?.naziv,
        item?.naziv,
        item?.kataloskiBroj
      );
      const token = `td${item.tecDocArticleId}`;
      const idParam = slug ? `${token}-${slug}` : token;
      this.router.navigateByUrl('/webshop/' + idParam);
      return;
    }

    const searchTerm = (item.kataloskiBroj || item.naziv || '').trim();
    if (!searchTerm) {
      return;
    }

    this.router.navigate(['/webshop'], {
      queryParams: { searchTerm, filterBy: 'searchTerm' },
    });
  }

  onProviderItemCompleted(item: InvoiceItem): void {
    if (!this.canUpdateProviderItemStatus(item)) {
      return;
    }
    this.openProviderStatusPopup(item, 'ZAVRSENA');
  }

  onProviderItemFailed(item: InvoiceItem): void {
    if (!this.canUpdateProviderItemStatus(item)) {
      return;
    }
    this.openProviderStatusPopup(item, 'NEUSPESNA');
  }

  // End of: Events
  get isInternalOrderView(): boolean {
    return this.isInternalOrder(this.data);
  }

  get statusOutcomeLabel(): string {
    if (this.statusOutcome === 'pass') return 'Prošlo';
    if (this.statusOutcome === 'fail') return 'Neuspešno';
    return 'U toku';
  }

  get statusOutcomeIcon(): string {
    if (!this.statusOutcome) {
      return '…';
    }
    return orderOutcomeIcon(this.statusOutcome);
  }

  private configureColumns(invoice?: Invoice | null): void {
    const isInternal = this.isInternalOrder(invoice);
    const next: AutomTableColumn[] = [
      { key: 'slika.slikeUrl', header: 'Slika', type: CellType.IMG },
      {
        key: 'kataloskiBroj',
        header: 'Kat br',
        type: CellType.LINK,
        callback: (row) => this.onItemClicked(row),
      },
      { key: 'naziv', header: 'Naziv', type: CellType.TEXT },
      { key: 'proizvodjac.naziv', header: 'Proizvodjac', type: CellType.TEXT },
      { key: 'izvorLabel', header: 'Izvor', type: CellType.TEXT },
      { key: 'kolicina', header: 'Kolicina', type: CellType.TEXT },
    ];

    if (this.isAdmin) {
      next.push({ key: 'potvrdjenaKolicina', header: 'Potvrdjena', type: CellType.TEXT });
    }

    if (isInternal) {
      next.push({ key: 'nabavnaCena', header: 'Nabavna cena', type: CellType.CURRENCY });
    } else {
      next.push(
        { key: 'rabat', header: 'Rabat', type: CellType.PERCENTAGE },
        { key: 'cena', header: 'Cena', type: CellType.CURRENCY }
      );
    }

    if (this.isAdmin) {
      next.push(
        { key: 'status.naziv', header: 'Status stavke', type: CellType.TEXT },
        {
          key: 'providerActionCompleteLabel',
          header: 'Zavrsi',
          type: CellType.LINK,
          callback: (row) => this.onProviderItemCompleted(row),
          disableLink: (row) => !this.canUpdateProviderItemStatus(row),
        },
        {
          key: 'providerActionFailLabel',
          header: 'Neuspesno',
          type: CellType.LINK,
          callback: (row) => this.onProviderItemFailed(row),
          disableLink: (row) => !this.canUpdateProviderItemStatus(row),
        },
        { key: 'availabilityLabel', header: 'Dostupnost', type: CellType.TEXT },
        { key: 'providerInfo', header: 'Provider info', type: CellType.TEXT },
        { key: 'providerResponse', header: 'Odgovor providera', type: CellType.TEXT }
      );
    }

    this.columns = next;
    this.displayedColumns = next.map((col) => col.key);
  }

  private decorateInvoiceItems(items: InvoiceItem[]): void {
    items.forEach((invoiceArticle: InvoiceItem) =>
      this.pictureService.convertByteToImageInvoice(invoiceArticle)
    );

    items.forEach((invoiceArticle: InvoiceItem) => {
      this.syncProviderStatusPresentation(invoiceArticle);
      invoiceArticle.izvorLabel = this.resolveSourceLabel(invoiceArticle);
      invoiceArticle.availabilityLabel = this.buildAvailabilityLabel(
        invoiceArticle.availabilityStatus,
        invoiceArticle.izvor,
        invoiceArticle.providerAvailability
      );
      invoiceArticle.providerInfo = this.buildProviderInfo(invoiceArticle);
      invoiceArticle.providerResponse = this.buildProviderResponse(invoiceArticle);
      invoiceArticle.nabavnaCena = this.resolvePurchasePrice(invoiceArticle);
      const pendingProvider =
        this.isProviderItem(invoiceArticle) &&
        this.normalizeProviderStatus(invoiceArticle.providerItemStatus) === 'NIJE_PREUZETA';
      invoiceArticle.providerActionCompleteLabel = pendingProvider ? 'Zavrsi' : '—';
      invoiceArticle.providerActionFailLabel = pendingProvider ? 'Neuspesno' : '—';
    });
  }

  private syncProviderStatusPresentation(item: InvoiceItem): void {
    if (!this.isProviderItem(item)) {
      return;
    }
    const statusCode = this.normalizeProviderStatus(item?.providerItemStatus);
    item.providerItemStatus = statusCode;
    if (!item.status) {
      item.status = {};
    }
    item.status.naziv = this.providerStatusLabel(statusCode);
  }

  private normalizeProviderStatus(value: string | null | undefined): ProviderItemStatusCode {
    if (value === 'ZAVRSENA' || value === 'NEUSPESNA' || value === 'NIJE_PREUZETA') {
      return value;
    }
    return 'NIJE_PREUZETA';
  }

  private providerStatusLabel(status: ProviderItemStatusCode): string {
    if (status === 'ZAVRSENA') {
      return 'Zavrsena';
    }
    if (status === 'NEUSPESNA') {
      return 'Neuspesna';
    }
    return 'Nije preuzeta';
  }

  private isProviderItem(item: InvoiceItem | null | undefined): boolean {
    return isProviderSource(item?.izvor, item?.providerAvailability);
  }

  private canUpdateProviderItemStatus(item: InvoiceItem | null | undefined): boolean {
    if (!this.isAdmin || !this.isProviderItem(item)) {
      return false;
    }
    const itemId = Number(item?.webOrderItemId);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return false;
    }
    const status = this.normalizeProviderStatus(item?.providerItemStatus);
    if (status !== 'NIJE_PREUZETA') {
      return false;
    }
    return !this.updatingProviderItems.has(itemId);
  }

  private updateProviderItemStatus(
    item: InvoiceItem,
    status: Exclude<ProviderItemStatusCode, 'NIJE_PREUZETA'>,
    reason: string | null,
    onSuccess?: () => void,
    onComplete?: () => void
  ): void {
    const itemId = Number(item?.webOrderItemId);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      this.snackbarService.showError('Nije moguce promeniti status stavke.');
      onComplete?.();
      return;
    }

    this.updatingProviderItems.add(itemId);
    this.invoiceService
      .updateAdminProviderItemStatus(itemId, status, reason)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.updatingProviderItems.delete(itemId);
          onComplete?.();
        })
      )
      .subscribe({
        next: () => {
          item.providerItemStatus = status;
          this.syncProviderStatusPresentation(item);
          item.providerResponse = this.buildProviderResponse(item);
          const pendingProvider =
            this.isProviderItem(item) &&
            this.normalizeProviderStatus(item.providerItemStatus) === 'NIJE_PREUZETA';
          item.providerActionCompleteLabel = pendingProvider ? 'Zavrsi' : '—';
          item.providerActionFailLabel = pendingProvider ? 'Neuspesno' : '—';
          this.dataSource.data = [...this.dataSource.data];
          this.snackbarService.showSuccess(
            status === 'ZAVRSENA'
              ? 'Stavka je oznacena kao Zavrsena.'
              : 'Stavka je oznacena kao Neuspesna.'
          );
          onSuccess?.();
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

  openProviderStatusPopup(
    item: InvoiceItem,
    status: Exclude<ProviderItemStatusCode, 'NIJE_PREUZETA'>
  ): void {
    this.popupProviderItem = item;
    this.popupProviderStatus = status;
    this.popupProviderReason = '';
    this.showProviderStatusPopup = true;
  }

  closeProviderStatusPopup(force = false): void {
    if (this.providerStatusPopupLoading && !force) {
      return;
    }
    this.showProviderStatusPopup = false;
    this.popupProviderItem = null;
    this.popupProviderStatus = null;
    this.popupProviderReason = '';
  }

  confirmProviderStatusPopup(): void {
    if (!this.popupProviderItem || !this.popupProviderStatus) {
      return;
    }
    const reason =
      this.popupProviderStatus === 'NEUSPESNA'
        ? (this.popupProviderReason || '').trim()
        : null;
    if (this.popupProviderStatus === 'NEUSPESNA' && !reason) {
      this.snackbarService.showError('Razlog je obavezan.');
      return;
    }

    this.providerStatusPopupLoading = true;
    this.updateProviderItemStatus(
      this.popupProviderItem,
      this.popupProviderStatus,
      reason,
      () => {
        this.closeProviderStatusPopup(true);
      },
      () => {
        this.providerStatusPopupLoading = false;
      },
    );
  }

  get providerPopupTitle(): string {
    return this.popupProviderStatus === 'NEUSPESNA'
      ? 'Označi stavku kao neuspešnu'
      : 'Označi stavku kao završenu';
  }

  get providerPopupDescription(): string {
    if (this.popupProviderStatus === 'NEUSPESNA') {
      return 'Unesi razlog zbog kog stavka nije uspešno realizovana.';
    }
    return 'Potvrdi da je stavka uspešno obrađena i završena.';
  }

  get providerPopupConfirmLabel(): string {
    return this.popupProviderStatus === 'NEUSPESNA'
      ? 'Potvrdi neuspešno'
      : 'Potvrdi završeno';
  }

  private resolveSourceLabel(item: InvoiceItem): string {
    const warehouseName = (item?.providerAvailability?.warehouseName || '').trim();
    const isProvider = isProviderSource(item?.izvor, item?.providerAvailability);

    if (!this.isStaff && isProvider) {
      return EXTERNAL_WAREHOUSE_LABEL;
    }
    if (warehouseName) {
      return warehouseName;
    }

    return 'Automaterijal Magacin';
  }

  private get isStaff(): boolean {
    return this.isAdmin || this.isEmployee;
  }

  private resolvePurchasePrice(item: InvoiceItem): number | null {
    const purchase = item?.providerAvailability?.purchasePrice;
    return typeof purchase === 'number' ? purchase : null;
  }

  private isInternalOrder(invoice?: Invoice | null): boolean {
    if (typeof invoice?.internalOrder === 'boolean') {
      return invoice.internalOrder;
    }
    return Number(invoice?.internalOrder) === 1;
  }

  private resolveInvoiceOutcome(invoice?: Invoice | null): OrderOutcome {
    return resolveOrderOutcome({
      statusId: invoice?.status?.id,
      statusName: invoice?.status?.naziv,
      orderedAmount: invoice?.iznosNarucen,
      confirmedAmount: invoice?.iznosPotvrdjen,
    });
  }

  private buildProviderInfo(item: InvoiceItem): string {
    const pa = item?.providerAvailability;
    const isProvider = isProviderSource(item?.izvor, pa);
    if (!isProvider || !pa) {
      return '—';
    }

    const parts: string[] = [];

    const warehouse = (pa.warehouseName || pa.warehouse || '').trim();
    if (warehouse) {
      parts.push(`Mag: ${warehouse}`);
    }

    const qty =
      pa.totalQuantity != null
        ? pa.totalQuantity
        : pa.warehouseQuantity != null
          ? pa.warehouseQuantity
          : null;
    if (qty != null) {
      parts.push(`Kol: ${qty}`);
    }

    const packagingUnit = pa.packagingUnit;
    if (packagingUnit != null && Number.isFinite(packagingUnit) && packagingUnit > 1) {
      parts.push(`Pak: ${packagingUnit}`);
    }

    const eta = this.buildProviderEta(pa);
    if (eta) {
      parts.push(`ETA: ${eta}`);
    }

    const deliveryParty = this.resolveProviderDeliveryParty(item);
    if (deliveryParty) {
      parts.push(`${this.resolveProviderDeliveryLabel(item)}: ${deliveryParty}`);
    }

    return parts.length ? parts.join('\n') : '—';
  }

  private buildProviderResponse(item: InvoiceItem): string {
    const parts: string[] = [];
    if (typeof item?.providerBackorder === 'boolean') {
      parts.push(`Backorder: ${item.providerBackorder ? 'da' : 'ne'}`);
    }

    const message = (item?.providerMessage || '').trim();
    if (message) {
      parts.push(`Poruka: ${message}`);
    }

    return parts.length ? parts.join('\n') : '—';
  }

  private resolveProviderDeliveryParty(item: InvoiceItem): string | null {
    const code = (item?.providerDeliveryParty || '').trim();
    if (!code) {
      return null;
    }

    const provider = (item?.providerAvailability?.provider || '').trim().toLowerCase();
    if (provider === this.febiProviderKey) {
      if (code === this.febiDeliveryPartyPickup) {
        return 'Naše dostavno vozilo';
      }
      if (code === this.febiDeliveryPartyDefault) {
        return 'Brza pošta';
      }
    }
    if (provider === this.gazelaProviderKey) {
      if (code === this.gazelaDocumentFaktura) {
        return 'Faktura';
      }
      if (code === this.gazelaDocumentRevers || code === this.gazelaDocumentReversLegacy) {
        return 'Revers';
      }
    }

    return code;
  }

  private resolveProviderDeliveryLabel(item: InvoiceItem): string {
    const provider = (item?.providerAvailability?.provider || '').trim().toLowerCase();
    if (provider === this.gazelaProviderKey) {
      return 'Dokument';
    }
    return 'Isporuka';
  }

  private buildProviderEta(pa: ProviderAvailabilityDto): string | null {
    const min = Number(pa?.deliveryToCustomerBusinessDaysMin);
    const max = Number(pa?.deliveryToCustomerBusinessDaysMax);
    const lead = Number(pa?.leadTimeBusinessDays);

    if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > 0) {
      return this.formatBusinessDayRange(min, max);
    }

    if (Number.isFinite(lead) && lead > 0) {
      return `${lead} ${this.pluralizeBusinessDays(lead)}`;
    }

    return null;
  }

  private buildNoteHtml(note?: string | null): string | null {
    if (!note) {
      return null;
    }

    let cleaned = note.trim();
    const prefix = 'komentar:';
    while (cleaned.toLowerCase().startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length).trim();
    }

    if (!cleaned) {
      return null;
    }

    return cleaned.replaceAll(';', '<br>');
  }

  private formatBusinessDayRange(min: number, max: number): string {
    if (min === max) {
      return `${min} ${this.pluralizeBusinessDays(min)}`;
    }
    return `${min}-${max} ${this.pluralizeBusinessDays(max)}`;
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

  private buildAvailabilityLabel(
    status?: AvailabilityStatus,
    source?: 'STOCK' | 'PROVIDER',
    provider?: ProviderAvailabilityDto
  ): string {
    if (status === 'IN_STOCK') return 'Na stanju';
    if (status === 'AVAILABLE') return 'Dostupno';
    if (status === 'OUT_OF_STOCK') return 'Nema na stanju';
    if (source === 'STOCK') return 'Na stanju';
    if (isProviderSource(source, provider)) return 'Dostupno';
    return '—';
  }
}
