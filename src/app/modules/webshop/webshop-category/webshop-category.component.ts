import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

// Data models
import { Manufacture } from '../../../shared/data-models/model/proizvodjac';

export enum FilterEnum {
  CATEGORY, MANUFACTURE
}

@Component({
  selector: 'webshop-category',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './webshop-category.component.html',
  styleUrl: './webshop-category.component.scss'
})
export class WebshopCategoryComponent {
  @Input() categories: string[] | undefined = [];
  @Input() manufactures: Manufacture[] | undefined = [];

  // Misc
  openCategoriesFilters = true;
  openManufacturesFilters = true;

  // Enums
  filterEnum = FilterEnum;

  toggleSection(id: FilterEnum): void {
    switch (id) {
      case this.filterEnum.CATEGORY: {
        this.openCategoriesFilters = !this.openCategoriesFilters;
        break;
      }
      case this.filterEnum.MANUFACTURE: {
        this.openManufacturesFilters = !this.openManufacturesFilters;
        break;
      }
    }
  }
}
