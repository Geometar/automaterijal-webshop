import { Component, EventEmitter, Input, Output } from '@angular/core';

// Data Models
import { Filter, Magacin } from '../../../shared/data-models/model/roba';
import { TablePage } from '../../../shared/data-models/model/page';
import { TDVehicleDetails } from '../../../shared/data-models/model/tecdoc';

// Component imports
import { ButtonComponent } from "../../../shared/components/button/button.component";
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { TableComponent } from '../../../shared/components/table/table.component';
import { WebshopCategoryComponent } from '../webshop-category/webshop-category.component';

// Enums
import { ButtonThemes, ButtonTypes } from '../../../shared/data-models/enums';

// Services
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';

@Component({
  selector: 'webshop-roba',
  standalone: true,
  imports: [CommonModule, TableComponent, WebshopCategoryComponent, SpinnerComponent, ButtonComponent],
  templateUrl: './webshop-roba.component.html',
  styleUrl: './webshop-roba.component.scss',
})
export class WebshopRobaComponent {
  @Input() assemblyGroupName: string = '';
  @Input() filter: Filter = new Filter();
  @Input() loading = false;
  @Input() magacin: Magacin | null = null;
  @Input() pageIndex = 0;
  @Input() pageSize = 10;
  @Input() searchTerm = '';
  @Input() vehicleDetails: TDVehicleDetails | null = null;
  @Output() emitTablePage = new EventEmitter<TablePage>();

  // Enums
  buttonThemes = ButtonThemes;
  buttonTypes = ButtonTypes;

  constructor(private urlHelperService: UrlHelperService) { }

  handleTablePageEvent(tablePage: TablePage): void {
    this.emitTablePage.emit(tablePage);
  }

  resetSearchTerm(): void {
    this.urlHelperService.removeQueryParams(['searchTerm', 'assembleGroupId', 'assemblyGroupName']);
  }
}
