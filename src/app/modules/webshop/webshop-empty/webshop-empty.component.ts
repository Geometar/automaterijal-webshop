import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs/operators';

// Models & Enums
import { TDVehicleDetails } from '../../../shared/data-models/model';
import { Category } from '../../../shared/data-models/interface';
import { IconsEnum } from '../../../shared/data-models/enums';

// Services
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';
import { ConfigService } from '../../../shared/service/config.service';

// Autom Imports
import { ShowcaseComponent } from '../../../shared/components/showcase/showcase.component';
import { VehicleSelectionPopupComponent } from '../../../shared/components/ui/vehicle-selection-popup/vehicle-selection-popup.component';

@Component({
  selector: 'webshop-empty',
  standalone: true,
  imports: [CommonModule, ShowcaseComponent, VehicleSelectionPopupComponent],
  templateUrl: './webshop-empty.component.html',
  styleUrl: './webshop-empty.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class WebshopEmptyComponent implements OnInit {
  @Output() selectedVehicleDetailsEmit = new EventEmitter<TDVehicleDetails>();
  iconEnum = IconsEnum;

  brands: Category[] = [];

  // Misc
  chooseVehicleVisible = false;

  constructor(
    private urlHelperService: UrlHelperService,
    private configService: ConfigService
  ) { }

  ngOnInit(): void {
    this.configService
      .getConfig()
      .pipe(take(1))
      .subscribe((config) => {
        this.brands = config.brands.filter((brand) => brand.visible !== false);
      });
  }

  filterByBrand(id: string, label: string): void {
    const brandName = label
      .toLowerCase()
      .replace(/\s+/g, '-')   // zameni razmake crticom
      .replace(/[^\w-]+/g, ''); // ukloni specijalne znakove

    this.urlHelperService.navigateTo(['/webshop/manufactures', brandName], {
      queryParams: { mandatoryproid: id }
    });
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

  scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
