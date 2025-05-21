import { Component, HostListener, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { finalize, Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Component imports
import { AutomHeaderComponent } from '../../../shared/components/autom-header/autom-header.component';
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';
import { PopupComponent } from '../../../shared/components/popup/popup.component';
import { TableFlatComponent } from '../../../shared/components/table-flat/table-flat.component';

// Data models
import { HeaderData } from '../../../shared/data-models/interface/header.interface';
import {
  LogsLogin,
  LogWeb,
  PaginatedResponse,
  Partner,
} from '../../../shared/data-models/model';

// Enums
import { ColorEnum, IconsEnum, PositionEnum, SizeEnum } from '../../../shared/data-models/enums';
import { HeadingLevelEnum } from '../../../shared/data-models/enums/heading.enum';
import {
  AutomTableColumn,
  CellType,
} from '../../../shared/data-models/enums/table.enum';

// Services
import { LogService } from '../../../shared/service/log.service';
import { PartnerService } from '../../../shared/service/partner.service';
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';

export const LogHeader: HeaderData = {
  titleInfo: {
    title: 'Logovi',
  },
};
@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [
    AutomHeaderComponent,
    AutomIconComponent,
    CommonModule,
    PopupComponent,
    TableFlatComponent,
  ],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class LogsComponent implements OnInit, OnDestroy {
  headerData = LogHeader;
  // Data
  logId: number | null = null;
  salesPersons: Partner[] = [];

  // Enums
  colorEnum = ColorEnum;
  headingLevelEnum = HeadingLevelEnum;
  iconsEnum = IconsEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  // Misc
  loading = false;
  loadingDetails = false;
  showLogsPopup = false;

  // Paging and Sorting elements
  pageIndex = 0;
  pageIndexDetails = 0;
  rowsPerPage = 10;
  rowsPerPageDetails = 10;
  totalItems = 0;
  totalItemsDetails = 0;

  // Table config
  columns: AutomTableColumn[] = [
    {
      key: 'ppid',
      header: 'PPID',
      type: CellType.LINK,
      callback: (row) => this.onLogSelected(row.ppid),
      disableLink: (row) => this.isSalesPerson(row.ppid), // 👈 ovde
    },
    {
      key: 'naziv',
      header: 'Naziv',
      type: CellType.TEXT,
    },
    {
      key: 'poslednjeLogovanje',
      header: 'Poslednje logovanje',
      type: CellType.TEXT,
    },
  ];

  displayedColumns: string[] = this.columns.map((col) => col.key);
  dataSource = new MatTableDataSource<LogsLogin>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  columnsDetails: AutomTableColumn[] = [
    {
      key: 'ppid',
      header: 'PPID',
      type: CellType.TEXT,
    },
    {
      key: 'proizvodjac',
      header: 'Proizvodjac',
      type: CellType.TEXT,
    },
    {
      key: 'filter',
      header: 'Filter',
      type: CellType.TEXT,
    },
    {
      key: 'pretraga',
      header: 'Pretraga',
      type: CellType.LINK,
      callback: (row) => this.goToWebshopWithSearch(row.pretraga),
    },
    {
      key: 'vremePretrage',
      header: 'Vreme pretrage',
      type: CellType.DATE_ONLY,
    },
  ];

  displayedDetailsColumns: string[] = this.columnsDetails.map((col) => col.key);
  dataSourceDetails = new MatTableDataSource<LogWeb>();
  @ViewChild(MatPaginator) paginatorDetails!: MatPaginator;

  private destroy$ = new Subject<void>();

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.showLogsPopup = false;
    }
  }

  constructor(
    private logService: LogService,
    private partnerService: PartnerService,
    private router: Router,
    private urlHelperService: UrlHelperService
  ) { }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    this.initData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Angular lifecycle hooks end */

  /** Event start */
  initData(): void {
    this.loading = true;
    this.partnerService.getAllSalesPersons().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (salesPersons: Partner[]) => {
        this.salesPersons = salesPersons;
        this.getLogs();
      },
    });
  }

  getLogs(): void {
    this.urlHelperService.addOrUpdateQueryParams({
      pageIndex: this.pageIndex,
      rowsPerPage: this.rowsPerPage,
    });

    this.loading = true;
    this.logService
      .getLoginLogs(this.pageIndex, this.rowsPerPage)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: PaginatedResponse<LogsLogin>) => {
          this.dataSource.data = response.content;
          this.totalItems = response.totalElements;
          this.pageIndex = response.number;
          this.rowsPerPage = response.size;
        },
      });
  }

  getLogDetails(): void {
    this.loadingDetails = true;
    this.logService
      .getLoginDetails(this.logId!, this.pageIndexDetails, this.rowsPerPageDetails)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingDetails = false;
        })
      )
      .subscribe({
        next: (response: PaginatedResponse<LogWeb>) => {
          this.dataSourceDetails.data = response.content;
          this.totalItemsDetails = response.totalElements;
          this.pageIndexDetails = response.number;
          this.rowsPerPageDetails = response.size;
        },
      });
  }

  /** Event end */

  onLogSelected(logId: number): void {
    this.logId = logId;
    this.showLogsPopup = true;
    this.getLogDetails();
  }

  goToWebshopWithSearch(searchTerm: string) {
    this.router.navigate(['/webshop'], {
      queryParams: { searchTerm: searchTerm }
    });
  }

  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.rowsPerPage = event.pageSize;
    this.getLogs();
  }

  /** Popup details start */

  isSalesPerson(ppid: number): boolean {
    return this.salesPersons.some(person => person.ppid === ppid);
  }

  onPageChangeDetails(event: any): void {
    this.pageIndexDetails = event.pageIndex;
    this.rowsPerPageDetails = event.pageSize;
    this.getLogDetails();
  }

  closeLogDetails(): void {
    this.pageIndexDetails = 0;
    this.rowsPerPageDetails = 10;
    this.showLogsPopup = false;
  }

  /** Popup details end */
}
