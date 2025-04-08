import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
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
export class WebshopCategoryComponent implements OnChanges {
  @Input() categories: any = null;
  @Input() filter: Filter = new Filter();
  @Input() manufactures: Manufacture[] | undefined = [];

  // Misc
  openCategoriesFilters = true;
  openManufacturesFilters = true;

  // Radio Models
  radioOptions: RadioOption[] = [];
  radioOptionKeys = ['Svi artikli', 'Ima na stanju'];

  // Checkbox Model
  manufacturesModels: CheckboxModel[] = [];

  // Pre Filters
  manufacturerPreFilter = '';

  // Enums
  filterEnum = FilterEnum;
  iconEnums = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  orientation = OrientationEnum;
  sizeEnum = SizeEnum;

  constructor(private urlHelperService: UrlHelperService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['manufactures'] || changes['filter']) {
      this.buildManufactureModels();
    }
  }

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

  buildManufactureModels(): void {
    const selected = this.filter.proizvodjaci ?? [];
    this.manufacturesModels = (this.manufactures ?? []).map((m) => ({
      value: m.naziv!,
      key: m.proid!,
      checked: selected.includes(m.proid!),
    }));
  }
}
