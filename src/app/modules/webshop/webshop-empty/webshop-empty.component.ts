import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs/operators';

// Models & Enums
import { Category } from '../../../shared/data-models/interface';
import { IconsEnum } from '../../../shared/data-models/enums';

// Services
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';
import { ConfigService } from '../../../shared/service/config.service';

// Components
import { ShowcaseComponent } from '../../../shared/components/showcase/showcase.component';

@Component({
  selector: 'webshop-empty',
  standalone: true,
  imports: [CommonModule, ShowcaseComponent],
  templateUrl: './webshop-empty.component.html',
  styleUrl: './webshop-empty.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class WebshopEmptyComponent implements OnInit {
  iconEnum = IconsEnum;

  brands: Category[] = [];

  constructor(
    private urlHelperService: UrlHelperService,
    private configService: ConfigService
  ) { }

  ngOnInit(): void {
    this.configService.getConfig().pipe(take(1)).subscribe(config => {
      this.brands = config.brands.filter(brand => brand.visible !== false);
    });
  }

  filterByBrand(id: string): void {
    this.urlHelperService.addOrUpdateQueryParams({ mandatoryproid: id });
  }
}