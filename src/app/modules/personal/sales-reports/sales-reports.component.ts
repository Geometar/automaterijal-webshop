import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { CommonModule, CurrencyPipe } from '@angular/common';

// Component imports
import { AutomHeaderComponent } from '../../../shared/components/autom-header/autom-header.component';
import { TableFlatComponent } from '../../../shared/components/table-flat/table-flat.component';

// Data models
import { HeaderData } from '../../../shared/data-models/interface/header.interface';
import { PaginatedResponse, SalesReport } from '../../../shared/data-models/model';

// Enums
import { AutomTableColumn, CellType } from '../../../shared/data-models/enums/table.enum';
import { HeadingLevelEnum } from '../../../shared/data-models/enums/heading.enum';

// Services
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';
import { SalesReportsService } from '../../../shared/service/sales-reports.service';

export const SalesReportsHeader: HeaderData = {
  titleInfo: {
    title: 'Izvestaji',
  },
};

@Component({
  selector: 'app-sales-reports',
  standalone: true,
  imports: [AutomHeaderComponent, CommonModule, TableFlatComponent],
  providers: [CurrencyPipe],
  templateUrl: './sales-reports.component.html',
  styleUrl: './sales-reports.component.scss'
})
export class SalesReportsComponent implements OnInit, OnDestroy {
  headerData = SalesReportsHeader;

  // Enums
  headingLevelEnum = HeadingLevelEnum;

  // Misc
  loading = false;

  // Paging and Sorting elements
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  pageIndex = 0;
  rowsPerPage = 10;
  selectedSalesPpid: number | null = null;
  totalItems = 0;

  // Table config
  columns: AutomTableColumn[] = [
    {
      key: 'komentarDto.id',
      header: 'Id',
      type: CellType.LINK,
      callback: (row) => this.onSalesReportClick(row.id)
    },
    { key: 'komentarDto.datumKreiranja', header: 'Datum kreiranja', type: CellType.DATE },
    { key: 'komentarDto.komercijalista', header: 'Komercijalista', type: CellType.TEXT },
    { key: 'firmaDto.ime', header: 'Ime Firme', type: CellType.TEXT },
    { key: 'firmaDto.mesto', header: 'Mesto', type: CellType.TEXT },
    { key: 'firmaDto.adresa', header: 'Adresa', type: CellType.TEXT }
  ];

  displayedColumns: string[] = this.columns.map(col => col.key);
  dataSource = new MatTableDataSource<SalesReport>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  searchTerm = '';

  private destroy$ = new Subject<void>();

  constructor(private urlHelperService: UrlHelperService, private salesReportService: SalesReportsService, private router: Router) { }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    this.getSalesReports();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Angular lifecycle hooks end */

  /** Event start */

  getSalesReports(): void {
    this.urlHelperService.addOrUpdateQueryParams({
      dateFrom: this.dateFrom ? this.dateFrom?.toISOString() : '',
      dateTo: this.dateTo ? this.dateTo?.toISOString() : '',
      pageIndex: this.pageIndex,
      rowsPerPage: this.rowsPerPage,
      selectedSalesPpid: this.selectedSalesPpid
    });

    this.loading = true;
    this.salesReportService
      .getSalesReports(
        this.pageIndex,
        this.rowsPerPage,
        this.searchTerm,
        this.dateFrom,
        this.dateTo,
        this.selectedSalesPpid
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: PaginatedResponse<SalesReport>) => {
          this.dataSource.data = response.content;
          this.totalItems = response.totalElements;
          this.pageIndex = response.number;
          this.rowsPerPage = response.size;
        },
      });
  }

  /** Event end */

  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.rowsPerPage = event.pageSize;
    this.getSalesReports();
  }


  onSalesReportClick(invoiceId: number): void {
    this.router.navigateByUrl('/invoices/' + invoiceId);
  }
}
