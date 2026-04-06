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
  @Input() disableCategoryNavigation = false;
  @Output() emitTablePage = new EventEmitter<TablePage>();

  // Enums
  buttonThemes = ButtonThemes;
  buttonTypes = ButtonTypes;
  iconEnum = IconsEnum;
  readonly skeletonRows = Array.from({ length: 6 });

  constructor(private urlHelperService: UrlHelperService) { }

  get resultCount(): number {
    return this.magacin?.robaDto?.totalElements ?? 0;
  }

  get hasAppliedFilters(): boolean {
    return !!(
      this.filter?.mandatoryProid?.length ||
      this.filter?.proizvodjaci?.length ||
      this.filter?.grupe?.length ||
      this.filter?.podgrupe?.length ||
      this.filter?.naStanju
    );
  }

  get hasResultsContext(): boolean {
    return !this.loading && (this.resultCount > 0 || this.activeChips.length > 0);
  }

  handleTablePageEvent(tablePage: TablePage): void {
    this.emitTablePage.emit(tablePage);
  }

  resetSearchTerm(): void {
    this.urlHelperService.removeQueryParams([
      'searchTerm',
      'podgrupe',
      'proizvodjaci',
      'naStanju',
      'filterBy'
    ]);
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
      chips.push(this.buildLabelChip('Brendovi', this.resolveManufacturerLabels(this.filter.mandatoryProid)));
    }
    if (this.filter?.proizvodjaci?.length) {
      chips.push(this.buildLabelChip('Proizvođači', this.resolveManufacturerLabels(this.filter.proizvodjaci)));
    }
    if (this.filter?.grupe?.length) {
      chips.push(`Grupe: ${this.filter.grupe.join(', ')}`);
    }
    if (this.filter?.podgrupe?.length) {
      chips.push(this.buildLabelChip('Podkategorije', this.resolveSubgroupLabels(this.filter.podgrupe)));
    }
    if (this.filter?.naStanju === true) {
      chips.push('Samo na stanju');
    }
    return chips;
  }

  // Clear all filters & search in one go (URL-based like ostatak)
  clearAllFilters(): void {
    this.urlHelperService.removeQueryParams([
      'podgrupe',
      'proizvodjaci',
      'naStanju',
      'filterBy'
    ]);
  }

  private resolveManufacturerLabels(ids: (string | number)[] = []): string[] {
    const manufacturerMap = new Map(
      (this.magacin?.proizvodjaci ?? []).map((manufacturer) => [
        String(manufacturer.proid),
        manufacturer.naziv ?? String(manufacturer.proid),
      ])
    );

    return ids.map((id) => manufacturerMap.get(String(id)) ?? String(id));
  }

  private resolveSubgroupLabels(ids: string[] = []): string[] {
    const entries = Object.values(this.magacin?.categories ?? {}).flat() as Array<{
      id?: string | number;
      naziv?: string;
    }>;
    const subgroupMap = new Map(
      entries.map((entry) => [String(entry.id), entry.naziv ?? String(entry.id)])
    );

    return ids.map((id) => subgroupMap.get(String(id)) ?? String(id));
  }

  private buildLabelChip(label: string, values: string[]): string {
    if (!values.length) {
      return `${label}: 0`;
    }

    if (values.length <= 2) {
      return `${label}: ${values.join(', ')}`;
    }

    return `${label}: ${values.slice(0, 2).join(', ')} +${values.length - 2}`;
  }

}
