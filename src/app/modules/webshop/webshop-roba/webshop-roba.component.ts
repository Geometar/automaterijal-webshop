import { Component, EventEmitter, Input, Output } from '@angular/core';

// Data Models
import { Filter, Magacin } from '../../../shared/data-models/model/roba';
import { TablePage } from '../../../shared/data-models/model/page';

// Component imports
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { TableComponent } from '../../../shared/components/table/table.component';
import { WebshopCategoryComponent } from '../webshop-category/webshop-category.component';

@Component({
  selector: 'webshop-roba',
  standalone: true,
  imports: [CommonModule, TableComponent, WebshopCategoryComponent, SpinnerComponent],
  templateUrl: './webshop-roba.component.html',
  styleUrl: './webshop-roba.component.scss',
})
export class WebshopRobaComponent {
  @Input() filter: Filter = new Filter();
  @Input() loading = false;
  @Input() magacin: Magacin | null = null;
  @Input() pageIndex = 0;
  @Input() pageSize = 10;
  @Input() searchTerm = '';
  @Output() emitTablePage = new EventEmitter<TablePage>();

  handleTablePageEvent(tablePage: TablePage): void {
    this.emitTablePage.emit(tablePage);
  }
}
