import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  Inject,
  Input,
  OnChanges,
  OnInit,
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
export class WebshopCategoryComponent implements OnChanges, OnInit {
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

  get isMobileView(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return window.innerWidth < 991;
    }
    return false; // fallback za server-side render
  }

  get isCategoryPage(): boolean {
    return this.urlHelperService.getCurrentPath().startsWith('/webshop/category');
  }

  /** Start of: Angular lifecycle hooks */
  ngOnInit(): void {
    const saved = localStorage.getItem(this.collapseKey);
    if (saved) {
      try { this.collapseState = { ...this.collapseState, ...JSON.parse(saved) }; } catch { }
    }
  }

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

  // --- Accordion state (persist to localStorage) ---
  private readonly collapseKey = 'ws_filters_collapse';
  collapseState: Record<'availability' | 'categories' | 'manufacturers', boolean> = {
    availability: false,
    categories: false,
    manufacturers: false
  };

  // Restore persisted collapse on init

  // Toggle helpers
  toggleSection(name: 'availability' | 'categories' | 'manufacturers') {
    this.collapseState[name] = !this.collapseState[name];
    localStorage.setItem(this.collapseKey, JSON.stringify(this.collapseState));
  }
  isCollapsed(name: 'availability' | 'categories' | 'manufacturers') {
    return !!this.collapseState[name];
  }

  // Optional counters for chips (safe if arrays are missing)
  get selectedSubgroupsCount(): number { return this.filter?.podgrupe?.length || 0; }
  get selectedManufacturersCount(): number { return this.filter?.proizvodjaci?.length || 0; }

  // Reset (atomic URL update; zatvori mobilni popup)
  resetFilters(): void {
    this.filter = new Filter();
    this.urlHelperService.setQueryParams({
      naStanju: null,
      podgrupe: null,
      proizvodjaci: null
    });
    this.manufacturerPreFilter = '';
    this.buildManufactureModels();
    this.openFilterPopup = false;
  }
}
