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

// Component Imports
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';
import { VehicleSelectionPopupComponent } from '../../../shared/components/ui/vehicle-selection-popup/vehicle-selection-popup.component';

// Constants
import {
  CATEGORIES_EMPTY_CONTAINER,
  MANUFACTURES_EMPTY_CONTAINER,
} from '../../../shared/data-models/constants/webshop.constants';

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
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';

export class NavTitles {
  title: string = '';
  svg: IconsEnum = IconsEnum.SEARCH;
}

@Component({
  selector: 'webshop-nav',
  standalone: true,
  imports: [
    ButtonComponent,
    CommonModule,
    InputFieldsComponent,
    VehicleSelectionPopupComponent,
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
  @Output() selectedVehicleDetailsEmit = new EventEmitter<TDVehicleDetails>();

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  sizeEnum = SizeEnum;

  secondNavigation: string = '';
  thirdNavigation: string = '';

  // Misc
  chooseVehicleVisible = false;

  constructor(private urlHelperService: UrlHelperService) { }

  /** Angular lifecycle hooks start */

  ngOnChanges(changes: SimpleChanges): void {
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
    if (!navigationSet) {
      this.secondNavigation = '';
    }
  }

  /** Angular lifecycle hooks end */

  emitValue(searchTerm: any): void {
    this.searchTerm = searchTerm?.value ? searchTerm?.value.trim() : '';

    if (this.searchTerm) {
      if (!this.urlHelperService.hasQueryParam('mandatoryproid') && !this.urlHelperService.hasQueryParam('grupe')) {
        this.urlHelperService.setQueryParams({ searchTerm: this.searchTerm });
      } else {
        this.urlHelperService.addOrUpdateQueryParams({
          searchTerm: this.searchTerm
        });
      }
    } else {
      this.urlHelperService.clearQueryParams();
    }
  }

  handleSelectedVehicle(vehicleDetails: TDVehicleDetails): void {
    this.urlHelperService.setQueryParams({
      tecdocType: vehicleDetails.linkageTargetType,
      tecdocId: vehicleDetails.linkageTargetId,
    });

    if (!vehicleDetails.description) {
      return;
    }
    this.selectedVehicleDetailsEmit.emit(vehicleDetails);
  }

  goToMainPage(): void {
    this.urlHelperService.clearQueryParams();
  }

  goToSecondPage(): void {
    this.urlHelperService.removeQueryParams([
      'assemblyGroupName',
      'assembleGroupId',
    ]);
  }

  /**
   * Start of: private methods
   */

  private updateNavigationFromFilter(filter: Filter): boolean {
    if (filter.grupe && filter.grupe.length) {
      const category = CATEGORIES_EMPTY_CONTAINER.find((value: Categories) =>
        filter.grupe!.includes(value.id!)
      );
      if (category) {
        this.secondNavigation = category.label!;
        return true;
      }
    }

    if (filter.mandatoryProid && filter.mandatoryProid.length) {
      const manufacturer = MANUFACTURES_EMPTY_CONTAINER.find(
        (value: Categories) => filter.mandatoryProid!.includes(value.id!)
      );
      if (manufacturer) {
        this.secondNavigation = manufacturer.label!;
        return true;
      }
    }

    return false;
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
