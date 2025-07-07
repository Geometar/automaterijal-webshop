import {
  Component,
  EventEmitter,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  ViewEncapsulation,
} from '@angular/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule, isPlatformBrowser } from '@angular/common';

// Automaterijal Imports
import { AutomIconComponent } from '../../autom-icon/autom-icon.component';
import { ButtonComponent } from '../../button/button.component';
import { InputFieldsComponent, TypeaheadItem } from '../../input-fields/input-fields.component';
import { PopupComponent } from '../../popup/popup.component';

// Data models
import {
  TDManufacture,
  TDModels,
  TDVehicleDetails,
  TecdocSearchHistory,
} from '../../../data-models/model/tecdoc';

// Directive
import { AutomTooltipDirective } from '../../autom-tooltip/autom-tooltip.directive';

// Enums
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  InputTypeEnum,
  PositionEnum,
  SizeEnum,
  TooltipPositionEnum,
  TooltipThemeEnum,
  TooltipTypesEnum,
} from '../../../data-models/enums';

// Service
import { TecdocService } from '../../../service/tecdoc.service';
import { TecdocSearchHistoryService } from '../../../service/utils/tecdoc-search-history.service';
import { SelectComponent } from '../../select/select.component';
import { SelectModel } from '../../../data-models/interface';

enum VehicleCategoryType {
  PASSENGER = 'V',         // Putničko vozilo
  LIGHT_COMMERCIAL = 'L',  // Kombi
  TRUCK = 'C',  // Kombi
  MOTORCYCLE = 'B',        // Motor,
  TRACTOR = 'T',        // Motor
}

@Component({
  selector: 'vehicle-selection-popup',
  standalone: true,
  imports: [
    AutomIconComponent,
    AutomTooltipDirective,
    ButtonComponent,
    CommonModule,
    InputFieldsComponent,
    PopupComponent,
    SelectComponent,
  ],
  templateUrl: './vehicle-selection-popup.component.html',
  styleUrl: './vehicle-selection-popup.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class VehicleSelectionPopupComponent implements OnInit, OnDestroy {
  @Output() closePopupModal = new EventEmitter<void>();
  @Output() emitVehicle = new EventEmitter<TDVehicleDetails>();

  title = 'Izaberite vozilo';

  // Consts
  vehicleTypes = [
    {
      value: VehicleCategoryType.PASSENGER, icon: IconsEnum.CAR_TAB, toolTip: {
        position: TooltipPositionEnum.BOTTOM,
        theme: TooltipThemeEnum.DARK,
        tooltipText: 'Putničko vozilo',
        type: TooltipTypesEnum.TEXT,
      }
    },
    {
      value: VehicleCategoryType.LIGHT_COMMERCIAL, icon: IconsEnum.LIGHT_COMMERCIAL_TAB, toolTip: {
        position: TooltipPositionEnum.BOTTOM,
        theme: TooltipThemeEnum.DARK,
        tooltipText: 'Komercijalno vozilo',
        type: TooltipTypesEnum.TEXT,
      }
    },
    {
      value: VehicleCategoryType.TRUCK, icon: IconsEnum.TRUCK_TAB, toolTip: {
        position: TooltipPositionEnum.BOTTOM,
        theme: TooltipThemeEnum.DARK,
        tooltipText: 'Transporter',
        type: TooltipTypesEnum.TEXT,
      }
    },
    {
      value: VehicleCategoryType.MOTORCYCLE, icon: IconsEnum.MOTORCYCLE_TAB, toolTip: {
        position: TooltipPositionEnum.BOTTOM,
        theme: TooltipThemeEnum.DARK,
        tooltipText: 'Motocikl',
        type: TooltipTypesEnum.TEXT,
      }
    },
    {
      value: VehicleCategoryType.TRACTOR, icon: IconsEnum.TRACTOR_TAB, toolTip: {
        position: TooltipPositionEnum.BOTTOM,
        theme: TooltipThemeEnum.DARK,
        tooltipText: 'Traktor',
        type: TooltipTypesEnum.TEXT,
      }
    },
  ];

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconsEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;
  tooltipPosition = TooltipPositionEnum;
  tooltipTheme = TooltipThemeEnum;
  tooltipType = TooltipTypesEnum;

  // Misc
  isMobile = false;
  loadingManufactures = true;
  loadingModels = true;
  loadingType = true;

  // Select setup
  vehicleSearchHistory: TecdocSearchHistory[] = [];
  vehicleSelectModel: SelectModel[] = [];
  searchHistorySelected: SelectModel | null = null

  // Typeahead data
  typeaheadManufactures: TypeaheadItem[] = [];
  typeaheadModels: TypeaheadItem[] = [];
  typeaheadType: TypeaheadItem[] = [];

  // Tab configuration
  selectedVehicleCategory: VehicleCategoryType = VehicleCategoryType.PASSENGER;

  selectedManufacture: number | null = null;
  selectedModel: number | null = null;
  selectedVehicleId: number | null = null;

  taSelectedManufacture: TypeaheadItem | null = null;
  taSelectedModel: TypeaheadItem | null = null;
  taSelectedType: TypeaheadItem | null = null;

  private selectedVehicleDetails: TDVehicleDetails | null = null;
  private vehicleDetailsOptions: TDVehicleDetails[] = [];

  private destroy$ = new Subject<void>();

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closePopupModal.emit();
    }
  }

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private searchHistoryService: TecdocSearchHistoryService,
    private tecdocService: TecdocService,
  ) { }

  /** Start of: Angular lifecycle hooks */

  ngOnInit(): void {
    this.initManufactures();
    this.setSearchHistory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  /** End of: Angular lifecycle hooks */

  isMobileView(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return window.innerWidth < 991;
    }
    return false; // fallback za server-side render
  }

  setSearchHistory(): void {
    this.vehicleSearchHistory = this.searchHistoryService.getVehiclesArray();
    this.vehicleSelectModel = [];
    this.vehicleSearchHistory.forEach((data: TecdocSearchHistory) => {
      if (data.type === this.selectedVehicleCategory) {
        this.vehicleSelectModel.push({
          key: data.id.toString(),
          value: data.description,
        } as SelectModel);
      }
    });
  }

  selectVehicleCategory(category: VehicleCategoryType): void {
    this.selectedVehicleCategory = category;
    this.resetManufactures();
    this.resetModels();
    this.resetType();
    this.initManufactures();
    this.setSearchHistory();
  }

  initManufactures(): void {
    this.loadingManufactures = true;
    this.tecdocService
      .getManufactures(this.selectedVehicleCategory)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingManufactures = false))
      )
      .subscribe({
        next: (response: TDManufacture[]) => {
          this.typeaheadManufactures = [];
          response.forEach((value: TDManufacture) => {
            const taItem = {
              key: value.id,
              value: value.name,
            } as TypeaheadItem;
            this.typeaheadManufactures.push(taItem);
          });
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        },
      });
  }

  setModels(manufactureId: number): void {
    this.resetModels();
    this.resetType();
    this.loadingModels = true;
    this.tecdocService
      .getModels(manufactureId, this.selectedVehicleCategory)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingModels = false))
      )
      .subscribe({
        next: (response: TDModels[]) => {
          response.forEach((value: TDModels) => {
            const fromRaw = value.constructedFrom?.toString() ?? '';
            const toRaw = value.constructedTo?.toString() ?? '';

            const fromYear = fromRaw.substring(0, 4);
            const fromMonth = fromRaw.substring(4, 6).padStart(2, '0');

            const toYear = toRaw.substring(0, 4);
            const toMonth = toRaw.substring(4, 6).padStart(2, '0');

            let dateRange = 'Datum proizvodnje nepoznat';

            if (fromYear && fromMonth) {
              dateRange = toYear && toMonth
                ? `${fromMonth}.${fromYear} - ${toMonth}.${toYear}`
                : `${fromMonth}.${fromYear} - Trenutno`;
            } else if (toYear && toMonth) {
              dateRange = `Nepoznat početak - ${toMonth}.${toYear}`;
            }

            const taItem = {
              key: value.modelId,
              value: `${value.name} | ${dateRange}`,
            } as TypeaheadItem;

            this.typeaheadModels.push(taItem);
          });
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        },
      });
  }

  setType(manufactureId: number, modelId: number): void {
    this.resetType();
    this.loadingType = true;
    this.tecdocService
      .getTypeOfModel(manufactureId, modelId, this.selectedVehicleCategory)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingType = false))
      )
      .subscribe({
        next: (response: TDVehicleDetails[]) => {
          this.vehicleDetailsOptions = response;
          response.forEach((details: TDVehicleDetails) => {
            const description = details.description;
            const kiloWatts = `${details.kiloWattsTo} kw`;
            const hp = `${details.horsePowerTo} hp`;
            const fromMonth = details.beginYearMonth;
            const toMonth = details.endYearMonth ?? 'Trenutno';

            const value = `${description} | ${kiloWatts} | ${hp} | ${fromMonth} - ${toMonth}`;

            const taItem = {
              key: details.linkageTargetId,
              value: value,
            } as TypeaheadItem;

            this.typeaheadType.push(taItem);
          });
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        },
      });
  }

  resetManufactures(): void {
    this.taSelectedManufacture = null;
    this.selectedManufacture = null;
  }

  resetModels(): void {
    this.taSelectedModel = null;
    this.selectedModel = null;
    this.typeaheadModels = [];
    this.loadingModels = true;
  }

  resetType(): void {
    this.taSelectedType = null;
    this.selectedVehicleId = null;
    this.typeaheadType = [];
    this.loadingType = true;
  }

  selectedManufacturer(typeaheadItem: TypeaheadItem | null): void {
    this.taSelectedManufacture = typeaheadItem;
    this.selectedManufacture = typeaheadItem?.key ? +typeaheadItem.key : null;
    if (!typeaheadItem) {
      this.resetModels();
      this.resetType();
      return;
    }
    this.setModels(+typeaheadItem.key!);
  }

  selectedModels(typeaheadItem: TypeaheadItem | null): void {
    this.taSelectedModel = typeaheadItem;
    this.selectedModel = typeaheadItem?.key ? +typeaheadItem.key : null;
    if (!typeaheadItem) {
      this.resetType();
      return;
    }
    this.setType(this.selectedManufacture!, this.selectedModel!);
  }

  selectedType(typeaheadItem: TypeaheadItem | null): void {
    this.taSelectedType = typeaheadItem;
    this.selectedVehicleId = typeaheadItem?.key ? +typeaheadItem.key : null;

    if (!typeaheadItem) {
      return;
    }
    this.selectedVehicleDetails = this.vehicleDetailsOptions.filter(
      (value: TDVehicleDetails) => value.linkageTargetId === typeaheadItem.key
    )[0];
  }

  selectVehicleFromHistory(selectedHistory: SelectModel): void {
    this.resetManufactures();
    this.resetModels();
    this.resetType();
    this.searchHistorySelected = selectedHistory;
  }

  selectedVehicle(): void {
    if (this.searchHistorySelected?.key) {
      const selectedFromHistory: TecdocSearchHistory | undefined = this.vehicleSearchHistory.find(
        (data: TecdocSearchHistory) => data.id === +this.searchHistorySelected!.key!
      );

      if (selectedFromHistory) {
        this.emitVehicleEvent({
          linkageTargetId: selectedFromHistory.id,
          linkageTargetType: selectedFromHistory.type
        });
        return; // Ensure we don't proceed further if history selection is used
      }
    }

    if (this.selectedVehicleDetails) {
      this.setToWebStorage();
      this.emitVehicleEvent(this.selectedVehicleDetails);
    }
  }

  private emitVehicleEvent(data: TDVehicleDetails): void {
    this.emitVehicle.emit(data);
    this.closePopupModal.emit();
  }

  private setToWebStorage(): void {
    if (!this.selectedVehicleDetails) {
      return;
    }

    const {
      mfrName,
      vehicleModelSeriesName,
      description,
      engineType,
      linkageTargetId,
      subLinkageTargetType,
      kiloWattsTo,
    } = this.selectedVehicleDetails;
    const vehicleDescription =
      `${mfrName} ${vehicleModelSeriesName} ${description} ${engineType} ${kiloWattsTo}kw`.trim();

    this.searchHistoryService.saveVehicle({
      id: linkageTargetId!,
      type: subLinkageTargetType!,
      description: vehicleDescription,
    } as TecdocSearchHistory);
  }
}
