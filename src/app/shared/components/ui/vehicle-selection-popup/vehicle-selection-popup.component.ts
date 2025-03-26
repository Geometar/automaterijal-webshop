import {
  Component,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

// Component Imports
import { AutomIconComponent } from '../../autom-icon/autom-icon.component';
import { PopupComponent } from '../../popup/popup.component';
import { ButtonComponent } from '../../button/button.component';

// Data models
import {
  TDManufacture,
  TDModels,
  TDVehicleDetails,
  TecdocSearchHistory,
} from '../../../data-models/model/tecdoc';

// Enums
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  InputTypeEnum,
  PositionEnum,
  SizeEnum,
} from '../../../data-models/enums';

// Service
import { TecdocService } from '../../../service/tecdoc.service';
import { TecdocSearchHistoryService } from '../../../service/utils/tecdoc-search-history.service';
import { SelectComponent } from '../../select/select.component';
import { SelectModel } from '../../../data-models/interface';
import { CommonModule } from '@angular/common';
import { InputFieldsComponent, TypeaheadItem } from '../../input-fields/input-fields.component';

@Component({
  selector: 'vehicle-selection-popup',
  standalone: true,
  imports: [
    InputFieldsComponent,
    CommonModule,
    PopupComponent,
    AutomIconComponent,
    ButtonComponent,
    SelectComponent,
  ],
  templateUrl: './vehicle-selection-popup.component.html',
  styleUrl: './vehicle-selection-popup.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class VehicleSelectionPopupComponent implements OnInit, OnDestroy {
  @Output() closePopupModal = new EventEmitter<void>();
  @Output() emitVehicle = new EventEmitter<TDVehicleDetails>();

  constructor(
    private tecdocService: TecdocService,
    private searchHistoryService: TecdocSearchHistoryService
  ) { }

  title = 'Izaberite vozilo';

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconsEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  // Misc
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

  /** Start of: Angular lifecycle hooks */

  ngOnInit(): void {
    this.setManufactures();
    this.setSearchHistory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  /** End of: Angular lifecycle hooks */

  setSearchHistory(): void {
    this.vehicleSearchHistory = this.searchHistoryService.getVehiclesArray();
    this.vehicleSearchHistory.forEach((data: TecdocSearchHistory) => {
      this.vehicleSelectModel.push({
        key: data.id.toString(),
        value: data.description,
      } as SelectModel);
    });
  }

  setManufactures(): void {
    this.loadingManufactures = true;
    this.tecdocService
      .getManufactures()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingManufactures = false))
      )
      .subscribe({
        next: (response: TDManufacture[]) => {
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
      .getModels(manufactureId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingModels = false))
      )
      .subscribe({
        next: (response: TDModels[]) => {
          response.forEach((value: TDModels) => {
            const fromYear = value.constructedFrom?.toString().substring(0, 4);
            const fromMonth = value.constructedFrom
              ?.toString()
              .substring(4, 6)
              .padStart(2, '0');
            const toYear = value.constructedTo
              ? value.constructedTo.toString().substring(0, 4)
              : '';
            const toMonth = value.constructedTo
              ? value.constructedTo.toString().substring(4, 6).padStart(2, '0')
              : '';

            const dateRange = toYear
              ? `${fromMonth}.${fromYear} - ${toMonth}.${toYear}`
              : `${fromMonth}.${fromYear} - Trenutno`;

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
      .getTypeOfModel(manufactureId, modelId)
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
      linkageTargetType,
      kiloWattsTo,
    } = this.selectedVehicleDetails;
    const vehicleDescription =
      `${mfrName} ${vehicleModelSeriesName} ${description} ${engineType} ${kiloWattsTo}kw`.trim();

    this.searchHistoryService.saveVehicle({
      id: linkageTargetId!,
      type: linkageTargetType!,
      description: vehicleDescription,
    } as TecdocSearchHistory);
  }
}
