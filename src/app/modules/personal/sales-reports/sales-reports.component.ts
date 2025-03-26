import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { CommonModule, CurrencyPipe } from '@angular/common';

// Component imports
import { AutomHeaderComponent } from '../../../shared/components/autom-header/autom-header.component';
import { SalesReportsDetailsPopupComponent } from './sales-reports-details-popup/sales-reports-details-popup.component';
import { SelectComponent } from '../../../shared/components/select/select.component';
import { TableFlatComponent } from '../../../shared/components/table-flat/table-flat.component';

// Data models
import { HeaderData } from '../../../shared/data-models/interface/header.interface';
import {
  PaginatedResponse,
  Partner,
  SalesReport,
} from '../../../shared/data-models/model';
import { SelectModel } from '../../../shared/data-models/interface';

// Enums
import {
  AutomTableColumn,
  CellType,
} from '../../../shared/data-models/enums/table.enum';
import { HeadingLevelEnum } from '../../../shared/data-models/enums/heading.enum';
import { ButtonThemes, ButtonTypes, InputTypeEnum } from '../../../shared/data-models/enums';

// Services
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';
import { PartnerService } from '../../../shared/service/partner.service';
import { SalesReportsService } from '../../../shared/service/sales-reports.service';
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';

export const SalesReportsHeader: HeaderData = {
  titleInfo: {
    title: 'Izvestaji',
  },
  actions: {
    buttons: [
      {
        action: 'createReport',
        label: 'Kreiraj Izvestaj',
        theme: ButtonThemes.LIGHT_ORANGE,
        type: ButtonTypes.PRIMARY
      }
    ]
  }
};

@Component({
  selector: 'app-sales-reports',
  standalone: true,
  imports: [
    AutomHeaderComponent,
    CommonModule,
    InputFieldsComponent,
    SalesReportsDetailsPopupComponent,
    SelectComponent,
    TableFlatComponent,
  ],
  providers: [CurrencyPipe],
  templateUrl: './sales-reports.component.html',
  styleUrl: './sales-reports.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class SalesReportsComponent implements OnInit, OnDestroy {
  headerData = SalesReportsHeader;

  // Enums
  headingLevelEnum = HeadingLevelEnum;
  inputTypeEnum = InputTypeEnum;

  // Misc
  loading = false;
  showDetailsPopup = true;

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
      callback: (row) => this.onSalesReportClick(row.id),
    },
    {
      key: 'komentarDto.datumKreiranja',
      header: 'Datum kreiranja',
      type: CellType.DATE,
    },
    {
      key: 'komentarDto.komercijalista',
      header: 'Komercijalista',
      type: CellType.TEXT,
    },
    { key: 'firmaDto.ime', header: 'Ime Firme', type: CellType.TEXT },
    { key: 'firmaDto.mesto', header: 'Mesto', type: CellType.TEXT },
    { key: 'firmaDto.adresa', header: 'Adresa', type: CellType.TEXT },
  ];

  displayedColumns: string[] = this.columns.map((col) => col.key);
  dataSource = new MatTableDataSource<SalesReport>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  searchTerm = '';

  // Data
  salesPersonsSelectModel: SelectModel[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private partnerService: PartnerService,
    private salesReportService: SalesReportsService,
    private urlHelperService: UrlHelperService,
  ) { }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    this.getSalesPersons();
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
      selectedSalesPpid: this.selectedSalesPpid,
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

  getSalesPersons(): void {
    this.partnerService.getAllSalesPersons().pipe(
      takeUntil(this.destroy$)
    )
      .subscribe({
        next: (response: Partner[]) => {
          this.salesPersonsSelectModel = response.map((partner: Partner) => {
            return { key: partner.ppid, value: partner.naziv } as SelectModel;
          })
        },
      });
  }

  /** Event end */

  onFilterSalesPerson(selectModel: SelectModel): void {
    this.selectedSalesPpid = selectModel?.key ? +selectModel.key : null;
    this.getSalesReports();
  }

  onFilterDateFrom(date: Date): void {
    this.dateFrom = date;
    this.getSalesReports();
  }

  onFilterDateTo(date: Date): void {
    this.dateTo = date;
    this.getSalesReports();
  }

  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.rowsPerPage = event.pageSize;
    this.getSalesReports();
  }

  createSalesReport(): void {
    this.showDetailsPopup = true;
  }

  onSalesReportClick(invoiceId: number): void {
    this.showDetailsPopup = true;
  }
}
