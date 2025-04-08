import { Injectable } from '@angular/core';
import { TDVehicleDetails } from '../../data-models/model';
import { WebShopState } from '../../../modules/webshop/webshop.component';

@Injectable({
  providedIn: 'root'
})
export class WebshopStateService {

  shouldShowEmptyContainer(
    searchTerm: string,
    mandatoryProid: string,
    mandatoryGrupe: string,
    tecdocTargetId: number | null,
    vehicleModelType: string
  ): boolean {
    return (
      !searchTerm &&
      !mandatoryProid &&
      !mandatoryGrupe &&
      !tecdocTargetId &&
      !vehicleModelType
    );
  }

  shouldFetchVehicleDetails(
    currentDetails: TDVehicleDetails | null,
    tecdocId: number | null,
    tecdocType: string
  ): boolean {
    return (
      tecdocId !== null &&
      (!currentDetails ||
        currentDetails.linkageTargetId !== tecdocId ||
        currentDetails.linkageTargetType !== tecdocType)
    );
  }


  determineWebShopState(
    tecdocId: number | null,
    tecdocType: string,
    assembleGroupId: string
  ): WebShopState {
    if (assembleGroupId) {
      return WebShopState.SHOW_ARTICLES_WITH_VEHICLE_DETAILS;
    }
    if (tecdocId && tecdocType) {
      return WebShopState.SHOW_VEHICLE_DETAILS;
    }
    return WebShopState.SHOW_ARTICLES;
  }
}
