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

    // Prevent duplicates
    const alreadyExists = vehicles.some(v => v.id === vehicle.id && v.type === vehicle.type);
    if (alreadyExists) return;

    // Add new vehicle
    vehicles.push(vehicle);

    // Keep only the last 10
    if (vehicles.length > 10) {
      vehicles = vehicles.slice(vehicles.length - 10); // Keep last 10 items
    }

    this.localStorage.store(this.storageKey, vehicles);
  }

  // Get history as an array of TecdocVehicle objects
  getVehiclesArray(): TecdocSearchHistory[] {
    const data = this.localStorage.retrieve(this.storageKey) || [];
    return data.map((v: any) => new TecdocSearchHistory(v.id, v.type, v.description));
  }
}