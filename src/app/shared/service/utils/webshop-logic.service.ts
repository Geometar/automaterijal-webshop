import { Injectable } from '@angular/core';
import { Filter } from '../../data-models/model/roba';

@Injectable({
  providedIn: 'root'
})
export class WebshopLogicService {

  constructor() { }

  createFilterFromParams(params: any): Filter {
    const filter = new Filter();
    filter.grupe = this.splitParams(params['grupe']);
    filter.mandatoryProid = this.splitParams(params['mandatoryproid']);
    filter.naStanju = params['naStanju'] === 'true';
    filter.podgrupe = this.splitParams(params['podgrupe']);
    filter.proizvodjaci = this.splitParams(params['proizvodjaci']);
    return filter;
  }

  haveFiltersChanged(oldFilter: Filter, newFilter: Filter): boolean {
    return !this.deepEqual(oldFilter, newFilter);
  }

  deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;

    if (
      typeof obj1 !== 'object' ||
      typeof obj2 !== 'object' ||
      obj1 === null ||
      obj2 === null
    ) {
      return false;
    }

    const keys1 = Object.keys(obj1).sort();
    const keys2 = Object.keys(obj2).sort();

    if (keys1.length !== keys2.length) return false;

    for (let key of keys1) {
      if (!keys2.includes(key) || !this.deepEqual(obj1[key], obj2[key])) {
        return false;
      }
    }
    return true;
  }

  private splitParams(param: string): string[] {
    if (!param) {
      return [];
    }
    return param.includes(',') ? param.split(',') : [param];
  }
}
