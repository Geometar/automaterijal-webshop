import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

// Component imports
import { Chip, ChipsComponent } from '../chips/chips.component';
import { RowComponent } from './row/row.component';

// Constants 
import { CATEGORIES_EMPTY_CONTAINER } from '../../data-models/constants/webshop.constants';

// Data models
import { Filter, Roba } from '../../data-models/model/roba';
import { Categories } from '../../data-models/model/webshop';
import { isPaginatedResponse, PaginatedResponse, TablePage } from '../../data-models/model/page';

// Services
import { UrlHelperService } from '../../service/utils/url-helper.service';


@Component({
  selector: 'autom-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, ChipsComponent, RowComponent],
  providers: [CurrencyPipe],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class TableComponent implements OnChanges {
  @Input() data: PaginatedResponse<Roba> | Roba[] | null = null;
  @Input() filter: Filter = new Filter();
  @Input() pageIndex = 0;
  @Input() pageSize = 10;
  @Output() emitTablePage = new EventEmitter<TablePage>();

  // Complete data source
  dataSource = [];

  // Misc
  categories = CATEGORIES_EMPTY_CONTAINER;

  // Pagination variables
  totalElements = 0; // Default total items
  paginatedData: Roba[] = []; // Data to display on the current page

  filterChips: Chip[] = [];

  constructor(private urlHelperService: UrlHelperService) { }

  ngOnInit() {
    this.updatePaginatedData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.updatePaginationVariables();
      this.updatePaginatedData();
    }
    if (changes['filter']) {
      this.processFilter();
    }
  }

  processFilter(): void {
    if (this.filter.mandatoryProid?.length) {
      this.filterChips.push({ label: 'Proizvodjaci', values: this.filter.mandatoryProid } as Chip)
    }
    if (this.filter.podgrupe?.length) {
      this.filterChips.push({ label: 'Podgrupe', values: this.filter.podgrupe } as Chip)
    }
    if (this.filter.proizvodjaci?.length) {
      this.filterChips.push({ label: 'Proizvodjaci', values: this.filter.proizvodjaci } as Chip)
    }
    if (this.filter.grupe?.length) {
      const chosenCategories = this.categories.filter((data: Categories) => this.filter.grupe!.includes(data.id!)).map((data: Categories) => data.label);
      this.filterChips.push({ label: 'Grupe', values: chosenCategories } as Chip)
    }
  }

  updatePaginationVariables(): void {
    if (!this.isAlreadyPaginated()) {
      return;
    }

    const responseEntity = this.data as PaginatedResponse<Roba>;
    this.pageSize = responseEntity.size;
    this.totalElements = responseEntity.totalElements;
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.emitTablePage.emit(
      {
        pageIndex: this.pageIndex,
        pageSize: this.pageSize
      } as TablePage
    )
    this.updatePaginatedData();
  }

  updatePaginatedData() {
    if (!this.data) {
      this.paginatedData = [];
      return;
    }

    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedData = this.isAlreadyPaginated() ? (this.data as PaginatedResponse<Roba>).content : (this.data as Roba[]).slice(startIndex, endIndex);
  }

  private isAlreadyPaginated(): boolean {
    return isPaginatedResponse<Roba>(this.data);
  }

  removeFilter(chip: Chip): void {
    // If Grupe or Mandatory Proid is removed, cleare all filters
    if (chip.label === 'Grupe' || (chip.label === 'Proizvodjaci' && this.urlHelperService.hasQueryParam('mandatoryproid'))) {
      this.urlHelperService.clearQueryParams();
      return;
    }

    if (chip.label === 'Proizvodjaci') {
      this.urlHelperService.removeQueryParam('proizvodjaci');
      this.urlHelperService.removeQueryParam('mandatoryproid');
    } else {
      this.urlHelperService.removeQueryParam(chip.label.toLowerCase());
    }
  }
}
