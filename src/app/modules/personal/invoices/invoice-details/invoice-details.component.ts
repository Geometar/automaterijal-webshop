import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

// Component imports
import { AutomIconComponent } from '../../../../shared/components/autom-icon/autom-icon.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { TableFlatComponent } from '../../../../shared/components/table-flat/table-flat.component';
import { RsdCurrencyPipe } from '../../../../shared/pipe/rsd-currency.pipe';

// Data models
import { Invoice, InvoiceItem } from '../../../../shared/data-models/model';
import { AvailabilityStatus, ProviderAvailabilityDto } from '../../../../shared/data-models/model/availability';
import { StringUtils } from '../../../../shared/utils/string-utils';
import {
  EXTERNAL_WAREHOUSE_LABEL,
  isProviderSource
} from '../../../../shared/utils/availability-utils';

// Enums
import {
  AutomTableColumn,
  CellType,
} from '../../../../shared/data-models/enums/table.enum';
import { ColorEnum, IconsEnum } from '../../../../shared/data-models/enums';

// Service
import { AccountStateService } from '../../../../shared/service/state/account-state.service';
import { InvoiceService } from '../../../../shared/service/invoice.service';
import { PictureService } from '../../../../shared/service/utils/picture.service';

@Component({
  selector: 'app-invoice-details',
  standalone: true,
  imports: [
    AutomIconComponent,
    CommonModule,
    RsdCurrencyPipe,
    SpinnerComponent,
    TableFlatComponent,
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

  // Enums
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  isAdmin = false;
  isEmployee = false;
  readonly febiProviderKey = 'febi-stock';
  readonly febiDeliveryPartyDefault = '0001001983';
  readonly febiDeliveryPartyPickup = '0001003023';

  // Misc loading
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private destroy$ = new Subject<void>();

  constructor(
    private accountStateService: AccountStateService,
    private invoiceService: InvoiceService,
    private pictureService: PictureService,
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
          this.noteHtml = this.buildNoteHtml(invoice?.napomena);
          const items: InvoiceItem[] = invoice.detalji!;
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
          this.noteHtml = this.buildNoteHtml(invoice?.napomena);
          const items: InvoiceItem[] = invoice.detalji!;
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

  // End of: Events
  get isInternalOrderView(): boolean {
    return this.isInternalOrder(this.data);
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
      invoiceArticle.izvorLabel = this.resolveSourceLabel(invoiceArticle);
      invoiceArticle.availabilityLabel = this.buildAvailabilityLabel(
        invoiceArticle.availabilityStatus,
        invoiceArticle.izvor,
        invoiceArticle.providerAvailability
      );
      invoiceArticle.providerInfo = this.buildProviderInfo(invoiceArticle);
      invoiceArticle.providerResponse = this.buildProviderResponse(invoiceArticle);
      invoiceArticle.nabavnaCena = this.resolvePurchasePrice(invoiceArticle);
    });
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

    const eta = this.buildProviderEta(pa);
    if (eta) {
      parts.push(`ETA: ${eta}`);
    }

    const deliveryParty = this.resolveProviderDeliveryParty(item);
    if (deliveryParty) {
      parts.push(`Isporuka: ${deliveryParty}`);
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

    return code;
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
