import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Data models
import { Category } from '../../../shared/data-models/interface';

// Enums
import { IconsEnum } from '../../../shared/data-models/enums';

// Service
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';
import { ConfigService } from '../../../shared/service/config.service';

@Component({
  selector: 'webshop-empty',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './webshop-empty.component.html',
  styleUrl: './webshop-empty.component.scss'
})
export class WebshopEmptyComponent {
  iconEnum = IconsEnum;

  brands: Category[] = [];
  categories: Category[] = [];

  constructor(private urlHelperService: UrlHelperService, private configService: ConfigService) {
    this.configService.getConfig().subscribe(config => {
      this.categories = config.categories.filter(b => b.visible !== false);
      this.brands = config.brands.filter(b => b.visible !== false);;
    });
  }

  filterByBrand(id: string): void {
    this.urlHelperService.addOrUpdateQueryParams({ "mandatoryproid": id });
  }

  filterByCategory(id: string): void {
    this.urlHelperService.addOrUpdateQueryParams({ "grupe": id });
  }
}
