import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

// Enums
import { ButtonThemes, ButtonTypes, ColorEnum, IconsEnum, InputTypeEnum, SizeEnum } from '../../data-models/enums';
import { RsdCurrencyPipe } from '../../pipe/rsd-currency.pipe';

// Component imports
import { ButtonComponent } from '../button/button.component';
import { InputFieldsComponent } from '../input-fields/input-fields.component';
import { Chip, ChipsComponent } from '../chips/chips.component';

// Data models
import { Filter, Roba } from '../../data-models/model/roba';
import { isPaginatedResponse, PaginatedResponse, TablePage } from '../../data-models/model/page';

// Services
import { UrlHelperService } from '../../service/utils/url-helper.service';


@Component({
  selector: 'autom-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, ButtonComponent, RsdCurrencyPipe, InputFieldsComponent, ChipsComponent],
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

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  sizeEnum = SizeEnum;

  // Complete data source
  dataSource = [];

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
    if (this.filter.grupe?.length) {
      this.filterChips.push({ label: 'Grupe', values: this.filter.grupe } as Chip)
    }
    if (this.filter.proizvodjaci?.length) {
      this.filterChips.push({ label: 'Proizvodjaci', values: this.filter.proizvodjaci } as Chip)
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
    this.urlHelperService.removeQueryParam(chip.label);
  }

}
