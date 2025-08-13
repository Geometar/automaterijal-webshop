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

// Data models
import { Invoice, InvoiceItem } from '../../../../shared/data-models/model';

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
    SpinnerComponent,
    TableFlatComponent,
  ],
  providers: [CurrencyPipe],
  templateUrl: './invoice-details.component.html',
  styleUrl: './invoice-details.component.scss',
})
export class InvoiceDetailsComponent implements OnInit {
  id: number | null = null;

  // Table config
  columns: AutomTableColumn[] = [
    { key: 'slika.slikeUrl', header: 'SLika', type: CellType.IMG },
    {
      key: 'kataloskiBroj',
      header: 'Kat br',
      type: CellType.LINK,
      callback: (row) => this.onItemClicked(row),
    },
    { key: 'naziv', header: 'Naziv', type: CellType.TEXT },
    { key: 'proizvodjac.naziv', header: 'Proizvodjac', type: CellType.TEXT },
    { key: 'kolicina', header: 'Kolicina', type: CellType.TEXT },
    { key: 'rabat', header: 'Rabat', type: CellType.PERCENTAGE },
    { key: 'cena', header: 'Cena', type: CellType.CURRENCY },
  ];

  displayedColumns: string[] = this.columns.map((col) => col.key);
  dataSource = new MatTableDataSource<Invoice>();

  // Paging and Sorting elements
  pageIndex = 0;
  rowsPerPage = 10;
  totalItems = 0;


  // Data
  data: Invoice | null = null;

  // Enums
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;

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
    this.id = +this.route.snapshot.paramMap.get('id')!;
    this.fetchData(this.id);
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
      .fetchDetails(this.accountStateService.get().ppid!, id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (invoice: Invoice) => {
          this.data = invoice;
          const items: InvoiceItem[] = invoice.detalji!;
          items.forEach((invoiceArticle: InvoiceItem) =>
            this.pictureService.convertByteToImageInvoice(invoiceArticle)
          );

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
    this.router.navigateByUrl('/webshop/' + item.robaId);
  }

  // End of: Events
}
