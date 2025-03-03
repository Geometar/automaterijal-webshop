import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { TecdocSearchHistory } from '../../data-models/model/tecdoc';

@Injectable({
  providedIn: 'root'
})
export class TecdocSearchHistoryService {
  private storageKey = 'searchedVehicles';

  constructor(private localStorage: LocalStorageService) { }

  // Add a vehicle to local storage
  saveVehicle(vehicle: TecdocSearchHistory): void {
    let vehicles = this.getVehiclesArray();

    // Prevent duplicate entries
    if (!vehicles.some(v => v.id === vehicle.id && v.type === vehicle.type)) {
      vehicles.push(vehicle);
      this.localStorage.store(this.storageKey, vehicles);
    }
  }

  // Get history as an array of TecdocVehicle objects
  getVehiclesArray(): TecdocSearchHistory[] {
    const data = this.localStorage.retrieve(this.storageKey) || [];
    return data.map((v: any) => new TecdocSearchHistory(v.id, v.type, v.description));
  }

  // Clear search history
  clearHistory(): void {
    this.localStorage.clear(this.storageKey);
  }
}