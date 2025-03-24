import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { finalize, Subject, takeUntil } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';

// Data models
import { HeaderData } from '../../../shared/data-models/interface/header.interface';
import { Invoice, PaginatedResponse } from '../../../shared/data-models/model';

// Enums
import { AutomTableColumn, CellType } from '../../../shared/data-models/enums/table.enum';
import { HeadingLevelEnum } from '../../../shared/data-models/enums/heading.enum';
import { InputTypeEnum } from '../../../shared/data-models/enums';

// Import components
import { AutomHeaderComponent } from '../../../shared/components/autom-header/autom-header.component';
import { InputFieldsComponent } from "../../../shared/components/input-fields/input-fields.component";
import { TableFlatComponent } from '../../../shared/components/table-flat/table-flat.component';

// Services
import { AccountStateService } from '../../../shared/service/utils/account-state.service';
import { InvoiceService } from '../../../shared/service/invoice.service';
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';


export const InvoicesHeader: HeaderData = {
  titleInfo: {
    title: 'Porudzbenice',
  },
};

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [
    AutomHeaderComponent,
    CommonModule,
    InputFieldsComponent,
    TableFlatComponent,
  ],
  providers: [CurrencyPipe],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class InvoicesComponent implements OnInit, OnDestroy {
  headerData = InvoicesHeader;

  // Table config
  columns: AutomTableColumn[] = [
    {
      key: 'id',
      header: 'Broj fakture',
      type: CellType.LINK,
      callback: (row) => this.onInvoiceClick(row.id)
    },
    { key: 'partner', header: 'Partner', type: CellType.TEXT },
    { key: 'brojStavki', header: 'Broj stavki', type: CellType.NUMBER },
    { key: 'iznosNarucen', header: 'Iznos naručen', type: CellType.CURRENCY },
    { key: 'iznosPotvrdjen', header: 'Iznos potvrđen', type: CellType.CURRENCY },
    {
      key: 'vremePorucivanja',
      header: 'Datum',
      type: CellType.DATE,
      dateFormat: 'dd-MMM-yyyy HH:mm'
    },
    { key: 'status.naziv', header: 'Status', type: CellType.TEXT }
  ];

  displayedColumns: string[] = this.columns.map(col => col.key);
  dataSource = new MatTableDataSource<Invoice>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Misc
  loading = false;

  // Paging and Sorting elements
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  pageIndex = 0;
  rowsPerPage = 10;
  totalItems = 0;

  // Enums
  headingLevelEnum = HeadingLevelEnum;
  inputTypeEnum = InputTypeEnum;
  private destroy$ = new Subject<void>();

  constructor(
    private accountStateService: AccountStateService,
    private invoiceService: InvoiceService,
    private urlHelperService: UrlHelperService,
    private router: Router
  ) { }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    const params = this.urlHelperService.readQueryParams();

    this.dateFrom = params['dateFrom'] ? new Date(params['dateFrom']) : null;
    this.dateTo = params['dateTo'] ? new Date(params['dateTo']) : null;
    this.pageIndex = params['pageIndex'] ? +params['pageIndex'] : 0;
    this.rowsPerPage = params['rowsPerPage'] ? +params['rowsPerPage'] : 10;

    this.getInvoices();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Angular lifecycle hooks end */

  getInvoices(): void {
    this.urlHelperService.addOrUpdateQueryParams({
      dateFrom: this.dateFrom ? this.dateFrom?.toISOString() : '',
      dateTo: this.dateTo ? this.dateTo?.toISOString() : '',
      pageIndex: this.pageIndex,
      rowsPerPage: this.rowsPerPage
    });

    this.loading = true;
    this.invoiceService
      .getInvoices(
        this.pageIndex,
        this.rowsPerPage,
        this.accountStateService.get().ppid!,
        this.dateFrom,
        this.dateTo
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: PaginatedResponse<Invoice>) => {
          this.dataSource.data = response.content;
          this.totalItems = response.totalElements;
          this.pageIndex = response.number;
          this.rowsPerPage = response.size;
        },
      });
  }

  onFilterDateFrom(date: Date): void {
    this.dateFrom = date;
    this.getInvoices();
  }

  onFilterDateTo(date: Date): void {
    this.dateTo = date;
    this.getInvoices();
  }

  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.rowsPerPage = event.pageSize;
    this.getInvoices();
  }

  onInvoiceClick(invoiceId: number): void {
    this.router.navigateByUrl('/invoices/' + invoiceId);
  }
}
