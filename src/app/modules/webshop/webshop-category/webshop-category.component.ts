import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  ViewEncapsulation,
} from '@angular/core';

// Component imported
import { AvailabilityFilterComponent } from './availability-filter/availability-filter.component';
import { CategoryFilterComponent } from './category-filter/category-filter.component';
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';
import { ManufactureFilterComponent } from './manufacture-filter/manufacture-filter.component';

// Data models
import {
  CheckboxModel,
  RadioOption,
} from '../../../shared/data-models/interface';
import { Filter } from '../../../shared/data-models/model/roba';
import { Manufacture } from '../../../shared/data-models/model/proizvodjac';

// Enums
import {
  IconsEnum,
  InputTypeEnum,
  OrientationEnum,
  SizeEnum,
} from '../../../shared/data-models/enums';

// Service
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';

export enum FilterEnum {
  CATEGORY,
  MANUFACTURE,
}

@Component({
  selector: 'webshop-category',
  standalone: true,
  imports: [
    AvailabilityFilterComponent,
    CategoryFilterComponent,
    CommonModule,
    InputFieldsComponent,
    ManufactureFilterComponent,
  ],
  templateUrl: './webshop-category.component.html',
  styleUrl: './webshop-category.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class WebshopCategoryComponent {
  @Input() categories: any = null;
  @Input() filter: Filter = new Filter();
  @Input() manufactures: Manufacture[] | undefined = [];

  // Misc
  openCategoriesFilters = true;
  openManufacturesFilters = true;

  // Radio Models
  radioOptions: RadioOption[] = [];
  radioOptionKeys = ['Svi artikli', 'Ima na stanju'];

  // Pre Filters
  manufacturerPreFilter = '';

  // Enums
  filterEnum = FilterEnum;
  iconEnums = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  orientation = OrientationEnum;
  sizeEnum = SizeEnum;

  get manufacturesModels(): CheckboxModel[] {
    const selected = this.filter.proizvodjaci ?? [];
    return (this.manufactures ?? []).map((manufacture) => ({
      value: manufacture.naziv!,
      key: manufacture.proid,
      checked: selected.includes(manufacture.proid!),
    }));
  }

  constructor(private urlHelperService: UrlHelperService) { }

  // Start of: Emit handle

  onSubgroupsChanged(updatedIds: string[]): void {
    this.urlHelperService.addOrUpdateQueryParams({
      podgrupe: updatedIds
    });
  }

  onManufactureChanged(ids: (string | number)[]): void {
    this.urlHelperService.addOrUpdateQueryParams({
      proizvodjaci: ids,
    });
  }

  onAvailabilityChanged(isAvailable: boolean): void {
    this.urlHelperService.addOrUpdateQueryParams({
      naStanju: isAvailable,
    });
  }
  // End of: Emit handle

  preFilterManufactures(filterTerm: string): void {
    this.manufacturerPreFilter = filterTerm;
  }
}
