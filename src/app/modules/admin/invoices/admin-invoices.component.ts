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

import { HeaderData } from '../../../shared/data-models/interface/header.interface';
import { Invoice, isPaginatedResponse, PaginatedResponse } from '../../../shared/data-models/model';

import { AutomTableColumn, CellType } from '../../../shared/data-models/enums/table.enum';
import { HeadingLevelEnum } from '../../../shared/data-models/enums/heading.enum';
import { InputTypeEnum } from '../../../shared/data-models/enums';

import { AutomHeaderComponent } from '../../../shared/components/autom-header/autom-header.component';
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';
import { TableFlatComponent } from '../../../shared/components/table-flat/table-flat.component';

import { InvoiceService } from '../../../shared/service/invoice.service';
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';

export const AdminInvoicesHeader: HeaderData = {
  titleInfo: {
    title: 'Sve porudžbenice',
  },
};

@Component({
  selector: 'app-admin-invoices',
  standalone: true,
  imports: [AutomHeaderComponent, CommonModule, InputFieldsComponent, TableFlatComponent],
  providers: [CurrencyPipe],
  templateUrl: './admin-invoices.component.html',
  styleUrl: './admin-invoices.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AdminInvoicesComponent implements OnInit, OnDestroy {
  headerData = AdminInvoicesHeader;

  columns: AutomTableColumn[] = [
    {
      key: 'id',
      header: 'ID porudžbenice',
      type: CellType.LINK,
      callback: (row) => this.onInvoiceClick(row),
      disableLink: (row) => row?.ppid == null || row?.id == null,
    },
    { key: 'ppid', header: 'PPID', type: CellType.NUMBER },
    { key: 'partner', header: 'Partner', type: CellType.TEXT },
    { key: 'brojStavki', header: 'Broj stavki', type: CellType.NUMBER },
    { key: 'iznosNarucen', header: 'Iznos naručen', type: CellType.CURRENCY },
    { key: 'iznosPotvrdjen', header: 'Iznos potvrđen', type: CellType.CURRENCY },
    {
      key: 'vremePorucivanja',
      header: 'Datum',
      type: CellType.DATE,
      dateFormat: 'dd-MMM-yyyy HH:mm',
    },
    { key: 'status.naziv', header: 'Status', type: CellType.TEXT },
  ];

  displayedColumns: string[] = this.columns.map((col) => col.key);
  dataSource = new MatTableDataSource<Invoice>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  loading = false;

  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  pageIndex = 0;
  rowsPerPage = 10;
  totalItems = 0;

  headingLevelEnum = HeadingLevelEnum;
  inputTypeEnum = InputTypeEnum;
  private destroy$ = new Subject<void>();

  private allInvoices: Invoice[] = [];
  private clientPaged = false;

  constructor(
    private invoiceService: InvoiceService,
    private urlHelperService: UrlHelperService,
    private router: Router
  ) { }

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

  getInvoices(): void {
    this.urlHelperService.addOrUpdateQueryParams({
      dateFrom: this.dateFrom ? this.dateFrom?.toISOString() : '',
      dateTo: this.dateTo ? this.dateTo?.toISOString() : '',
      pageIndex: this.pageIndex,
      rowsPerPage: this.rowsPerPage,
    });

    this.loading = true;
    this.invoiceService
      .getAdminInvoices(this.pageIndex, this.rowsPerPage, this.dateFrom, this.dateTo)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: PaginatedResponse<Invoice> | Invoice[]) => {
          if (isPaginatedResponse<Invoice>(response)) {
            this.clientPaged = false;
            this.allInvoices = [];
            this.dataSource.data = response.content;
            this.totalItems = response.totalElements;
            this.pageIndex = response.number;
            this.rowsPerPage = response.size;
            return;
          }

          this.clientPaged = true;
          this.allInvoices = response;
          this.totalItems = response.length;
          this.applyClientPaging();
        },
      });
  }

  onFilterDateFrom(date: Date): void {
    this.dateFrom = date;
    this.pageIndex = 0;
    this.getInvoices();
  }

  onFilterDateTo(date: Date): void {
    this.dateTo = date;
    this.pageIndex = 0;
    this.getInvoices();
  }

  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.rowsPerPage = event.pageSize;

    if (this.clientPaged) {
      this.urlHelperService.addOrUpdateQueryParams({
        pageIndex: this.pageIndex,
        rowsPerPage: this.rowsPerPage,
      });
      this.applyClientPaging();
      return;
    }

    this.getInvoices();
  }

  onInvoiceClick(row: Invoice): void {
    if (row?.ppid == null || row?.id == null) {
      return;
    }

    this.router.navigateByUrl(`/admin/invoices/${row.ppid}/${row.id}`);
  }

  private applyClientPaging(): void {
    const start = this.pageIndex * this.rowsPerPage;
    const end = start + this.rowsPerPage;
    this.dataSource.data = (this.allInvoices ?? []).slice(start, end);
  }
}

