import { Component, EventEmitter, Input, Output } from '@angular/core';

// Data Models
import { Filter, Magacin } from '../../../shared/data-models/model/roba';
import { TablePage } from '../../../shared/data-models/model/page';
import { TDVehicleDetails } from '../../../shared/data-models/model/tecdoc';

// Component imports
import { ButtonComponent } from "../../../shared/components/button/button.component";
import { CommonModule } from '@angular/common';
import { TableComponent } from '../../../shared/components/table/table.component';
import { WebshopCategoryComponent } from '../webshop-category/webshop-category.component';

// Enums
import { ButtonThemes, ButtonTypes, IconsEnum } from '../../../shared/data-models/enums';

// Services
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';
import { MatIconModule } from '@angular/material/icon';
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';

@Component({
  selector: 'webshop-roba',
  standalone: true,
  imports: [AutomIconComponent, CommonModule, TableComponent, WebshopCategoryComponent, ButtonComponent],
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
  iconEnum = IconsEnum;
  readonly skeletonRows = Array.from({ length: 6 });

  constructor(private urlHelperService: UrlHelperService) { }

  handleTablePageEvent(tablePage: TablePage): void {
    this.emitTablePage.emit(tablePage);
  }

  resetSearchTerm(): void {
    this.urlHelperService.removeQueryParams(['searchTerm', 'podgrupe', 'proizvodjaci', 'naStanju', 'filterBy']);
  }

  // Build concise chips for active filters
  get activeChips(): string[] {
    const chips: string[] = [];

    if (this.searchTerm?.trim()) {
      chips.push(`Pretraga: “${this.searchTerm.trim()}”`);
    }
    if (this.vehicleDetails?.linkageTargetId) {
      const v = this.vehicleDetails;
      chips.push(`Vozilo: ${v.mfrName} ${v.vehicleModelSeriesName ?? v.hmdMfrModelName ?? ''} ${v.description ?? ''}`.trim());
    }
    if (this.assemblyGroupName) {
      chips.push(`Kategorija: ${this.assemblyGroupName}`);
    }
    if (this.filter?.mandatoryProid?.length) {
      chips.push(`Brend: ${this.filter.mandatoryProid.join(', ')}`);
    }
    if (this.filter?.proizvodjaci?.length) {
      chips.push(`Proizvođači: ${this.filter.proizvodjaci.length}`);
    }
    if (this.filter?.grupe?.length) {
      chips.push(`Grupe: ${this.filter.grupe.join(', ')}`);
    }
    if (this.filter?.podgrupe?.length) {
      chips.push(`Podgrupe: ${this.filter.podgrupe.join(', ')}`);
    }
    if (this.filter?.naStanju === true) {
      chips.push('Samo na stanju');
    }
    return chips;
  }

  // Clear all filters & search in one go (URL-based like ostatak)
  clearAllFilters(): void {
    this.urlHelperService.removeQueryParams(['podgrupe', 'proizvodjaci', 'naStanju', 'filterBy']);
  }

}
