import { Injectable } from '@angular/core';
import { Filter } from '../../data-models/model/roba';

@Injectable({
  providedIn: 'root'
})
export class WebshopLogicService {

  constructor() { }

  createFilterFromParams(params: any): Filter {
    const filter = new Filter();
    filter.grupe = this.parseArrayParam(params['grupe']);
    filter.mandatoryProid = this.parseArrayParam(params['mandatoryproid']);
    filter.naStanju = params['naStanju'] === 'true';
    filter.podgrupe = this.parseArrayParam(params['podgrupe']);
    filter.proizvodjaci = this.parseArrayParam(params['proizvodjaci']);
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

  private splitParams(param?: string): string[] {
    if (!param) {
      return [];
    }
    return param.includes(',') ? param.split(',') : [param];
  }

  private parseArrayParam(value: string | string[] | undefined): string[] | undefined {
    if (Array.isArray(value)) {
      const flattened = value
        .map((v) => (v ?? '').trim())
        .filter((v) => v.length > 0);
      return flattened.length ? flattened : undefined;
    }

    const parts = this.splitParams(value as string)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    return parts.length ? parts : undefined;
  }
}
