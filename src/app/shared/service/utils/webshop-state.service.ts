import { Injectable } from '@angular/core';
import { Filter } from '../../data-models/model/roba';

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

  updateState(
    searchTerm: string,
    newFilter: Filter,
    isInitialLoad: boolean,
    isSameSearchTerm: boolean,
    isMandatoryFilterOn: boolean,
    assembleGroupId: string,
    filterChanged: boolean
  ): Filter {
    // If it's the initial load, keep the new filter as is
    if (isInitialLoad) {
      return newFilter;
    }

    // If no mandatory filters are active and conditions suggest a reset, return a new empty Filter
    const shouldResetFilter =
      !isMandatoryFilterOn &&
      (!searchTerm || !isSameSearchTerm || (!assembleGroupId && filterChanged));

    if (shouldResetFilter) {
      return new Filter();
    }

    // If the search term changed but mandatory filters are active, reset `podgrupe`
    if (!isSameSearchTerm && isMandatoryFilterOn) {
      newFilter.podgrupe = [];
    }

    return newFilter;
  }
}
