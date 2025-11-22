import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LocalStorageService } from 'ngx-webstorage';
import { TecdocSearchHistory } from '../../data-models/model/tecdoc';

@Injectable({
  providedIn: 'root'
})
export class TecdocSearchHistoryService {
  private storageKey = 'searchedVehicles';

  constructor(
    private localStorage: LocalStorageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  // Add a vehicle to local storage
  saveVehicle(vehicle: TecdocSearchHistory): void {
    let vehicles = this.getVehiclesArray();

    // Move existing entry to the end so last picked is shown first in UI
    vehicles = vehicles.filter(v => !(v.id === vehicle.id && v.type === vehicle.type));

    // Add new vehicle
    vehicles.push(vehicle);

    // Keep only the last 10
    if (vehicles.length > 10) {
      vehicles = vehicles.slice(vehicles.length - 10); // Keep last 10 items
    }

    if (!this.isBrowser) {
      return;
    }

    this.localStorage.store(this.storageKey, vehicles);
  }

  // Get history as an array of TecdocVehicle objects
  getVehiclesArray(): TecdocSearchHistory[] {
    if (!this.isBrowser) {
      return [];
    }
    const data = this.localStorage.retrieve(this.storageKey) || [];
    return data.map(
      (v: any) =>
        new TecdocSearchHistory(
          v.id,
          v.type,
          v.description,
          v.vehicleType
        )
    );
  }
}
