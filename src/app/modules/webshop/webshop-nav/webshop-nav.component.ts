import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';

// Component Imports
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CategoriesPopupComponent } from '../../../shared/components/ui/categories-popup/categories-popup.component';
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';
import { VehicleSelectionPopupComponent } from '../../../shared/components/ui/vehicle-selection-popup/vehicle-selection-popup.component';

// Data models
import { Categories } from '../../../shared/data-models/model/webshop';
import { Filter } from '../../../shared/data-models/model/roba';
import { TDVehicleDetails } from '../../../shared/data-models/model/tecdoc';

// Enums
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  SizeEnum,
} from '../../../shared/data-models/enums';

// Service
import { CategoryPick } from '../../../shared/data-models/model';
import { ConfigService } from '../../../shared/service/config.service';
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';
import { VehicleUrlService } from '../../../shared/service/utils/vehicle-url.service';
import { WebshopPrimaryFilter } from '../../../shared/data-models/enums/webshop-primary-filter.enum';

export class NavTitles {
  title: string = '';
  svg: IconsEnum = IconsEnum.SEARCH;
}

export interface WebshopNavBreadcrumbs {
  second: string;
  secondLink?: string | any[];
  third?: string;
  thirdLink?: string | any[];
}

@Component({
  selector: 'webshop-nav',
  standalone: true,
  imports: [
    ButtonComponent,
    CommonModule,
    InputFieldsComponent,
    VehicleSelectionPopupComponent,
    CategoriesPopupComponent,
    RouterModule
  ],
  templateUrl: './webshop-nav.component.html',
  styleUrl: './webshop-nav.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class WebshopNavComponent implements OnChanges {
  @Input() assemblyGroupName: string = '';
  @Input() filter = new Filter();
  @Input() searchTerm = '';
  @Input() selectedVehicle: TDVehicleDetails | null = null;
  @Input() customBreadcrumbs: WebshopNavBreadcrumbs | null = null;
  @Output() selectedVehicleDetailsEmit = new EventEmitter<TDVehicleDetails>();

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  sizeEnum = SizeEnum;

  secondNavigation: string = '';
  thirdNavigation: string = '';
  secondBreadcrumbLink: string | any[] | null = null;
  thirdBreadcrumbLink: string | any[] | null = null;

  // Misc
  scrolled = false;
  chooseCategoryVisible = false;
  chooseVehicleVisible = false;

  // Consts
  categories: Categories[] = [];
  manufacturers: Categories[] = [];

  @HostListener('window:scroll')
  onScroll() {
    // tiny threshold da se senka ne “trese”
    this.scrolled = (window?.scrollY || document.documentElement.scrollTop || 0) > 4;
  }

  constructor(
    private configService: ConfigService,
    private urlHelperService: UrlHelperService,
    private vehicleUrlService: VehicleUrlService,
  ) {
    this.configService.getConfig().subscribe(config => {
      this.categories = config.categories;
      this.manufacturers = config.brands;
    });
  }

  /** Angular lifecycle hooks start */

  ngOnChanges(changes: SimpleChanges): void {
    this.secondBreadcrumbLink = null;
    this.thirdBreadcrumbLink = null;
    this.thirdNavigation = this.assemblyGroupName || '';

    let navigationSet = false;

    if (this.selectedVehicle?.linkageTargetId) {
      navigationSet = this.updateNavigationFromVehicle(this.selectedVehicle);
    }

    if (!navigationSet && changes['filter']) {
      navigationSet = this.updateNavigationFromFilter(
        changes['filter'].currentValue
      );
    }

    // Reset to empty string if nothing was set
    if (this.customBreadcrumbs) {
      this.secondNavigation = this.customBreadcrumbs.second || '';
      this.secondBreadcrumbLink = this.customBreadcrumbs.secondLink || null;
      this.thirdNavigation = this.customBreadcrumbs.third || this.thirdNavigation;
      this.thirdBreadcrumbLink = this.customBreadcrumbs.thirdLink || null;
    } else if (!navigationSet) {
      this.secondNavigation = '';
    }
  }

  /** Angular lifecycle hooks end */

  emitValue(searchTerm: any): void {
    this.searchTerm = searchTerm?.value ? searchTerm?.value.trim() : '';

    if (this.searchTerm) {
      this.urlHelperService.navigateTo(['/webshop'], {
        queryParams: {
          searchTerm: this.searchTerm,
          filterBy: WebshopPrimaryFilter.SearchTerm,
        },
      });
    } else {
      this.urlHelperService.clearWebshopFilters();
    }
  }

  openCategories(): void {
    this.chooseCategoryVisible = true;
    this.chooseVehicleVisible = false;
  }

  handleVehicleSearchRequest(): void {
    this.chooseVehicleVisible = true;
    this.chooseCategoryVisible = false;
  }

  handleSelectedVehicle(vehicleDetails: TDVehicleDetails): void {
    this.vehicleUrlService.navigateToVehicle(vehicleDetails);

    if (!vehicleDetails.description) {
      return;
    }
    this.selectedVehicleDetailsEmit.emit(vehicleDetails);
    this.chooseVehicleVisible = false;
  }

  categorySelected(ev: CategoryPick): void {
    if (ev.groupId === 'TECDOC') {
      this.chooseVehicleVisible = true;
      this.chooseCategoryVisible = false;
      return;
    }
    const current = this.urlHelperService.readQueryParams();

    const next = {
      ...current,
      tecdocId: null,
      tecdocType: null,
      assembleGroupId: null,
      assemblyGroupName: null,
      grupe: ev.groupId ?? null,
      podgrupe: ev.kind === 'subgroup' ? ev.subGroupId ?? null : null,
      page: 0,
      naStanju: true,
      searchTerm: null,
      filterBy: ev.groupId
        ? ev.kind === 'subgroup'
          ? WebshopPrimaryFilter.Subcategory
          : WebshopPrimaryFilter.Category
        : null,
    };

    this.urlHelperService.setQueryParams(next);
    this.chooseCategoryVisible = false;
  }

  goToMainPage(): void {
    this.urlHelperService.clearWebshopFilters();
  }

  goToSecondPage(): void {
    if (this.secondBreadcrumbLink) {
      return;
    }
    if (this.selectedVehicle?.linkageTargetId) {
      this.vehicleUrlService.navigateToVehicle(this.selectedVehicle);
      return;
    }
    this.urlHelperService.retainOnlyQueryParams(['tecdocType', 'tecdocId']);
  }

  handleSecondBreadcrumbClick(event: Event): void {
    if (this.secondBreadcrumbLink) {
      return;
    }
    event.preventDefault();
    this.goToSecondPage();
  }

  /**
   * Start of: private methods
   */
  private updateNavigationFromFilter(filter: Filter): boolean {
    if (filter.grupe && filter.grupe.length) {
      return this.updateNavigationFromGroups(filter.grupe);
    }

    if (filter.mandatoryProid && filter.mandatoryProid.length) {
      return this.updateNavigationFromManufacturers(filter.mandatoryProid);
    }

    return false;
  }

  private updateNavigationFromGroups(groups: string[]): boolean {
    const matchedCategories = this.categories.filter(
      (category: Categories) => groups.includes(category.id!)
    );

    if (!matchedCategories.length) return false;

    const mostCommonAlt = this.getMostCommonAlt(matchedCategories);

    if (mostCommonAlt) {
      const category = matchedCategories.find(
        (cat) => cat.alt === mostCommonAlt
      );
      if (category) {
        this.secondNavigation = category.alt!;
        return true;
      }
    }

    this.secondNavigation = matchedCategories[0].label!;
    return true;
  }

  private updateNavigationFromManufacturers(
    manufacturerIds: string[]
  ): boolean {
    const manufacturer = this.manufacturers.find(
      (category: Categories) => manufacturerIds.includes(category.id!)
    );

    if (manufacturer) {
      this.secondNavigation = manufacturer.label!;
      return true;
    }

    return false;
  }

  private getMostCommonAlt(categories: Categories[]): string | null {
    const altCounts = categories.reduce((acc, cat) => {
      const alt = cat.alt;
      if (alt) {
        acc[alt] = (acc[alt] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const repeatedAltEntry = Object.entries(altCounts).find(
      ([_, count]) => count > 1
    );
    return repeatedAltEntry ? repeatedAltEntry[0] : null;
  }

  private updateNavigationFromVehicle(vehicle: TDVehicleDetails): boolean {
    if (vehicle && vehicle.mfrId) {
      this.secondNavigation =
        `${vehicle.mfrName} ${vehicle.vehicleModelSeriesName} ${vehicle.description} ${vehicle.engineType} ${vehicle.kiloWattsTo}kw`.trim();
      return true;
    }

    return false;
  }

  /**
   * End of: private methods
   */
}
