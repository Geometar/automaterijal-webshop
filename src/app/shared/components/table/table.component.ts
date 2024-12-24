import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

// Enums
import { ButtonThemes, ButtonTypes, ColorEnum, IconsEnum, SizeEnum } from '../../data-models/enums';
import { RsdCurrencyPipe } from '../../pipe/rsd-currency.pipe';

// Component imports
import { ButtonComponent } from '../button/button.component';


@Component({
  selector: 'autom-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, ButtonComponent, RsdCurrencyPipe],
  providers: [CurrencyPipe],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss'
})
export class TableComponent {

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  sizeEnum = SizeEnum;

  // Complete data source
  dataSource = [
    {
      imageUrl: 'https://via.placeholder.com/100',
      proizvodjac: 'MAHLE',
      naziv: 'ORIGINAL Oil filter',
      katbr: 'OX388D',
      specifications: [
        { key: 'Filter type', value: 'Filter Insert' },
        { key: 'Height [mm]', value: '140.7' },
        { key: 'Inner Diameter 2 [mm]', value: '29' },
        { key: 'Diameter [mm]', value: '71.5, 72' },
      ],
      stanje: 2,
      price: 6,
    },
    // Add more rows as needed...
  ];

  // Pagination variables
  pageSize = 5; // Default items per page
  currentPage = 0; // Current page index
  paginatedData: any[] = []; // Data to display on the current page

  ngOnInit() {
    this.updatePaginatedData();
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.updatePaginatedData();
  }

  updatePaginatedData() {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedData = this.dataSource.slice(startIndex, endIndex);
  }

}
