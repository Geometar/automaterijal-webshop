import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { VehicleCategoryType } from '../../../../shared/data-models/enums/vehicle-category-type.enum';
import {
  VehicleCatalogService,
  VehicleManufacturerSummary,
  VehicleTypeDefinition,
} from '../../../../shared/service/utils/vehicle-catalog.service';
import { SeoService } from '../../../../shared/service/seo.service';
import { VehicleSelectionPopupComponent } from '../../../../shared/components/ui/vehicle-selection-popup/vehicle-selection-popup.component';
import { TDVehicleDetails } from '../../../../shared/data-models/model/tecdoc';
import { VehicleUrlService } from '../../../../shared/service/utils/vehicle-url.service';
import { WebshopNavBreadcrumbs, WebshopNavComponent } from '../../webshop-nav/webshop-nav.component';
import { Filter } from '../../../../shared/data-models/model/roba';
import { InputFieldsComponent } from '../../../../shared/components/input-fields/input-fields.component';
import { InputTypeEnum } from '../../../../shared/data-models/enums';
import { TecdocSearchHistory } from '../../../../shared/data-models/model/tecdoc';
import { TecdocSearchHistoryService } from '../../../../shared/service/utils/tecdoc-search-history.service';
import { TecdocService } from '../../../../shared/service/tecdoc.service';

@Component({
  selector: 'app-vehicle-catalog-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, InputFieldsComponent, RouterModule, VehicleSelectionPopupComponent, WebshopNavComponent],
  templateUrl: './vehicle-catalog-landing.component.html',
  styleUrl: './vehicle-catalog-landing.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class VehicleCatalogLandingComponent implements OnInit, OnDestroy {
  inputTypeEnum = InputTypeEnum;
  filter = new Filter();
  searchTerm = '';
  selectedVehicle: TDVehicleDetails | null = null;
  vehicleTypes: VehicleTypeDefinition[] = [];
  selectedType: VehicleCategoryType = VehicleCategoryType.PASSENGER;
  manufacturers: VehicleManufacturerSummary[] = [];
  visibleManufacturers: VehicleManufacturerSummary[] = [];
  loadingManufacturers = true;
  chooseVehicleVisible = false;
  manufacturerSearchTerm = '';
  garageVehicles: TecdocSearchHistory[] = [];
  workflowSteps = [
    {
      step: 'Korak 1',
      title: 'Tip vozila',
      description: 'Odaberite da li tražite delove za putnička, teretna, moto ili specijalna vozila.',
    },
    {
      step: 'Korak 2',
      title: 'Brend i model',
      description: 'Izaberite brend i model iz liste. Svaki ima stranicu sa detaljima i najčešćim kombinacijama.',
    },
    {
      step: 'Korak 3',
      title: 'Motor / karoserija',
      description: 'Potvrdite motor prema godini i snazi kako bismo prikazali tačno kompatibilne delove.',
    },
    {
      step: 'Korak 4',
      title: 'Delovi po grupama',
      description: 'Pregledajte filtere, kočnice, trap i ostalu opremu filtriranu prema izabranom vozilu.',
    },
  ];
  customBreadcrumbs: WebshopNavBreadcrumbs = {
    second: 'Korak 1: Tip vozila',
  };

  private destroy$ = new Subject<void>();

  constructor(
    private vehicleCatalogService: VehicleCatalogService,
    private vehicleUrlService: VehicleUrlService,
    private seoService: SeoService,
    private searchHistoryService: TecdocSearchHistoryService,
    private tecdocService: TecdocService
  ) {}

  ngOnInit(): void {
    this.vehicleTypes = this.vehicleCatalogService.getVehicleTypes();
    this.loadManufacturers(this.selectedType);
    this.updateSeoTags();
    this.loadGarage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectType(type: VehicleCategoryType): void {
    if (type === this.selectedType) {
      return;
    }
    this.selectedType = type;
    this.manufacturerSearchTerm = '';
    this.updateManufacturerView();
    this.loadManufacturers(type);
    this.loadGarage();
  }

  handleVehicleSelection(vehicle: TDVehicleDetails): void {
    this.chooseVehicleVisible = false;
    this.vehicleUrlService.navigateToVehicle(vehicle);
  }

  handleNavVehicleSelected(vehicle: TDVehicleDetails): void {
    this.vehicleUrlService.navigateToVehicle(vehicle);
  }

  handleGarageSelect(entry: TecdocSearchHistory): void {
    this.tecdocService
      .getLinkageTargets(entry.id, entry.type)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vehicles) => {
          const vehicle = vehicles?.[0];
          if (vehicle) {
            this.vehicleUrlService.navigateToVehicle(vehicle);
          }
        },
      });
  }

  private loadManufacturers(type: VehicleCategoryType): void {
    this.loadingManufacturers = true;
    this.vehicleCatalogService
      .getManufacturersByType(type)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (manufacturers) => {
          this.manufacturers = manufacturers;
          this.updateManufacturerView();
          this.loadingManufacturers = false;
        },
        error: () => {
          this.manufacturers = [];
          this.visibleManufacturers = [];
          this.loadingManufacturers = false;
        },
      });
  }

  private updateSeoTags(): void {
    const url = 'https://automaterijal.com/webshop/vozila';
    this.seoService.updateSeoTags({
      title: 'Delovi po vozilu | Automaterijal',
      description:
        'Vodič kroz izbor delova po tipu vozila. Odaberite automobil, kombi, kamion, motor ili traktor i pretražite modele i motore pre nego što uđete u katalog delova.',
      url,
      type: 'collection',
      robots: 'index, follow',
      canonical: url,
    });
  }

  get selectedTypeDefinition(): VehicleTypeDefinition | undefined {
    return this.vehicleTypes.find((type) => type.code === this.selectedType);
  }

  private updateManufacturerView(): void {
    const term = this.manufacturerSearchTerm.trim().toLowerCase();
    if (!term) {
      this.visibleManufacturers = [...this.manufacturers];
      return;
    }
    this.visibleManufacturers = this.manufacturers.filter((manufacturer) => {
      const normalizedName = (manufacturer.name || '').toLowerCase();
      return normalizedName.includes(term);
      });
  }

  openQuickChoose(): void {
    this.chooseVehicleVisible = true;
  }

  handleManufacturerSearch(rawValue: unknown): void {
    const value =
      rawValue === null || rawValue === undefined ? '' : String(rawValue);
    this.manufacturerSearchTerm = value;
    this.updateManufacturerView();
  }

  private loadGarage(): void {
    const entries = this.searchHistoryService.getVehiclesArray();
    const filteredByType = entries.filter(
      (entry) => !entry.vehicleType || entry.vehicleType === this.selectedType
    );
    this.garageVehicles = filteredByType.slice(-5).reverse();
  }
}
