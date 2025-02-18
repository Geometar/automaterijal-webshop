import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Data models
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

// Component Imports
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';
import { VehicleSelectionPopupComponent } from '../../../shared/components/ui/vehicle-selection-popup/vehicle-selection-popup.component';

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
    AutomIconComponent,
    ButtonComponent,
    CommonModule,
    InputFieldsComponent,
    VehicleSelectionPopupComponent,
  ],
  templateUrl: './webshop-nav.component.html',
  styleUrl: './webshop-nav.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class WebshopNavComponent {
  @Input() searchTerm = '';
  @Input() filter = new Filter();
  @Output() selectedVehicleDetails = new EventEmitter<TDVehicleDetails>();

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  sizeEnum = SizeEnum;

  navigationTitles: NavTitles[] = [
    { title: 'Pretraga', svg: IconsEnum.SEARCH } as NavTitles,
    { title: 'Alati', svg: IconsEnum.TOOLS } as NavTitles,
    { title: 'Maziva', svg: IconsEnum.OIL } as NavTitles,
    { title: 'Aditivi', svg: IconsEnum.ADDITIVES } as NavTitles,
    { title: 'Odrzavanje Vozila', svg: IconsEnum.SPONGE } as NavTitles,
    { title: 'Enterijer', svg: IconsEnum.CAR_ENTERIER } as NavTitles,
  ];

  // Misc
  chooseVehicleVisible = false;

  constructor(private urlHelperService: UrlHelperService) { }

  emitValue(searchTerm: any): void {
    this.searchTerm = searchTerm?.value ? searchTerm?.value.trim() : '';
    this.searchTerm || !!this.filter.mandatoryProid
      ? this.urlHelperService.addOrUpdateQueryParams({
        searchTerm: this.searchTerm,
      })
      : this.urlHelperService.clearQueryParams();
  }

  handleSelectedVehicle(vehicleDetails: TDVehicleDetails): void {
    this.urlHelperService.setQueryParams({
      tecdocType: vehicleDetails.linkageTargetType,
      tecdocId: vehicleDetails.linkageTargetId,
    });
    this.selectedVehicleDetails.emit(vehicleDetails);
  }
}
