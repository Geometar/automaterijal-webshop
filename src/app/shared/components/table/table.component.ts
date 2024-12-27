import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

// Enums
import { ButtonThemes, ButtonTypes, ColorEnum, IconsEnum, InputTypeEnum, SizeEnum } from '../../data-models/enums';
import { RsdCurrencyPipe } from '../../pipe/rsd-currency.pipe';

// Component imports
import { ButtonComponent } from '../button/button.component';
import { InputFieldsComponent } from '../input-fields/input-fields.component';

// Data models
import { Roba } from '../../data-models/model/roba';
import { isPaginatedResponse, PaginatedResponse } from '../../data-models/model/page';


@Component({
  selector: 'autom-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, ButtonComponent, RsdCurrencyPipe, InputFieldsComponent],
  providers: [CurrencyPipe],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss'
})
export class TableComponent implements OnChanges {
  @Input() data: PaginatedResponse<Roba> | Roba[] | null = null;

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
  pageSize = 5; // Default items per page
  currentPage = 0; // Current page index
  totalElements = 0; // Default total items
  paginatedData: Roba[] = []; // Data to display on the current page

  ngOnInit() {
    this.updatePaginatedData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.updatePaginationVariables();
      this.updatePaginatedData();
    }
  }

  updatePaginationVariables(): void {
    if (!this.isAlreadyPaginated()) {
      return;
    }

    const responseEntity = this.data as PaginatedResponse<Roba>;
    this.pageSize = responseEntity.size;
    this.currentPage = responseEntity.number;
    this.totalElements = responseEntity.numberOfElements;
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.updatePaginatedData();
  }

  updatePaginatedData() {
    if (!this.data) {
      this.paginatedData = [];
      return;
    }

    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedData = this.isAlreadyPaginated() ? (this.data as PaginatedResponse<Roba>).content : (this.data as Roba[]).slice(startIndex, endIndex);
  }

  private isAlreadyPaginated(): boolean {
    return isPaginatedResponse<Roba>(this.data);
  }

}
// Type helper to check if a type extends an interface
type IsAssignable<T, U> = T extends U ? true : false;
