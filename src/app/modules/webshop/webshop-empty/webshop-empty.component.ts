import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Enums
import { IconsEnum } from '../../../shared/data-models/enums';

// Component Imports
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';

// Constants
import { CATEGORIES_EMPTY_CONTAINER, MANUFACTURES_EMPTY_CONTAINER } from '../../../shared/data-models/constants/webshop.constants';

// Service
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';

@Component({
  selector: 'webshop-empty',
  standalone: true,
  imports: [AutomIconComponent, CommonModule],
  templateUrl: './webshop-empty.component.html',
  styleUrl: './webshop-empty.component.scss'
})
export class WebshopEmptyComponent {
  iconEnum = IconsEnum;

  constructor(private urlHelperService: UrlHelperService) { }

  brands = MANUFACTURES_EMPTY_CONTAINER;
  categories = CATEGORIES_EMPTY_CONTAINER;

  filterByBrand(id: string): void {
    this.urlHelperService.addOrUpdateQueryParams({ "mandatoryproid": id });
  }

  filterByCategory(id: string): void {
    this.urlHelperService.addOrUpdateQueryParams({ "grupe": id });
  }
}
