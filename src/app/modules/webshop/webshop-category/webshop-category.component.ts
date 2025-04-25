import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  Inject,
  Input,
  OnChanges,
  PLATFORM_ID,
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
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  InputTypeEnum,
  OrientationEnum,
  PositionEnum,
  SizeEnum,
} from '../../../shared/data-models/enums';

// Service
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { PopupComponent } from '../../../shared/components/popup/popup.component';
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';

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
    ButtonComponent,
    PopupComponent,
    AutomIconComponent
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
  openFilterPopup = false;
  openManufacturesFilters = true;

  // Radio Models
  radioOptions: RadioOption[] = [];
  radioOptionKeys = ['Svi artikli', 'Ima na stanju'];

  // Checkbox Model
  manufacturesModels: CheckboxModel[] = [];

  // Pre Filters
  manufacturerPreFilter = '';

  // Enums
  buttonThemes = ButtonThemes;
  buttonTypes = ButtonTypes;
  colorEnum = ColorEnum;
  filterEnum = FilterEnum;
  iconEnums = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  orientation = OrientationEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private urlHelperService: UrlHelperService
  ) { }

  isMobileView(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return window.innerWidth < 991;
    }
    return false; // fallback za server-side render
  }

  /** Start of: Angular lifecycle hooks */

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['manufactures'] || changes['filter']) {
      this.buildManufactureModels();
    }
  }

  /** End of: Angular lifecycle hooks */

  // Start of: Emit handle

  onSubgroupsChanged(updatedIds: string[]): void {
    this.urlHelperService.addOrUpdateQueryParams({
      podgrupe: updatedIds,
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
