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
import {
  TypeaheadComponent,
  TypeaheadItem,
} from '../../typeahead/typeahead.component';
import { AutomIconComponent } from '../../autom-icon/autom-icon.component';
import { PopupComponent } from '../../popup/popup.component';
import { ButtonComponent } from '../../button/button.component';

// Data models
import { TDManufacture, TDModels, TDVehicleDetails } from '../../../data-models/model/tecdoc';

// Enums
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  PositionEnum,
  SizeEnum,
} from '../../../data-models/enums';

// Service
import { TecdocService } from '../../../service/tecdoc.service';

@Component({
  selector: 'vehicle-selection-popup',
  standalone: true,
  imports: [PopupComponent, TypeaheadComponent, AutomIconComponent, ButtonComponent],
  templateUrl: './vehicle-selection-popup.component.html',
  styleUrl: './vehicle-selection-popup.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class VehicleSelectionPopupComponent implements OnInit, OnDestroy {
  @Output() closePopupModal = new EventEmitter<void>();
  @Output() emitVehicle = new EventEmitter<TDVehicleDetails>();

  constructor(private tecdocService: TecdocService) { }

  title = 'Izaberite vozilo';

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconsEnum = IconsEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  // Misc
  loadingManufactures = true;
  loadingModels = true;
  loadingType = true;

  // Typeahead data
  typeaheadManufactures: TypeaheadItem[] = [];
  typeaheadModels: TypeaheadItem[] = [];
  typeaheadType: TypeaheadItem[] = [];

  selectedManufacture: number | null = null;
  selectedModel: number | null = null;
  selectedVehicleId: number | null = null;

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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  /** End of: Angular lifecycle hooks */

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
            const fromMonth = value.constructedFrom?.toString().substring(4, 6).padStart(2, '0');
            const toYear = value.constructedTo ? value.constructedTo.toString().substring(0, 4) : '';
            const toMonth = value.constructedTo ? value.constructedTo.toString().substring(4, 6).padStart(2, '0') : '';

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

  resetModels(): void {
    this.selectedModel = null;
    this.typeaheadModels = [];
    this.loadingModels = true;
  }

  resetType(): void {
    this.selectedVehicleId = null;
    this.typeaheadType = [];
    this.loadingType = true;
  }

  selectedManufacturer(typeaheadItem: TypeaheadItem): void {
    this.selectedManufacture = +typeaheadItem.key!;
    this.setModels(+typeaheadItem.key!);
  }

  selectedModels(typeaheadItem: TypeaheadItem): void {
    this.selectedModel = +typeaheadItem.key!;
    this.setType(this.selectedManufacture!, this.selectedModel);
  }


  selectedType(typeaheadItem: TypeaheadItem): void {
    this.selectedVehicleId = +typeaheadItem.key!;
    this.selectedVehicleDetails = this.vehicleDetailsOptions.filter((value: TDVehicleDetails) => value.linkageTargetId === typeaheadItem.key)[0];
  }

  selectedVehicle(): void {
    this.emitVehicle.emit(this.selectedVehicleDetails!);
    this.closePopupModal.emit();
  }
}
