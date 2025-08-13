import { Injectable } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class UrlHelperService {

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) { }

  /**
   * Adds or updates query parameters in the current URL.
   * Passing null/undefined/'' will remove the parameter.
   */
  addOrUpdateQueryParams(params: { [key: string]: any }): void {
    const merged = { ...this.activatedRoute.snapshot.queryParams };

    Object.keys(params).forEach(key => {
      const v = params[key];
      if (v === null || v === undefined || v === '') {
        delete merged[key];
      } else if (Array.isArray(v)) {
        merged[key] = v.join(','); // join array to CSV
      } else {
        merged[key] = String(v);
      }
    });

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: merged,
      queryParamsHandling: ''
    });
  }

  /**
   * Clears all existing query parameters and sets new ones.
   * Passing null/undefined/'' will skip that param.
   */
  setQueryParams(params: { [key: string]: any }): void {
    const next: { [key: string]: string } = {};

    Object.keys(params).forEach(key => {
      const v = params[key];
      if (v !== null && v !== undefined && v !== '') {
        next[key] = Array.isArray(v) ? v.join(',') : String(v);
      }
    });

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: next,
      queryParamsHandling: ''
    });
  }

  /** Removes a single query parameter (case-insensitive). */
  removeQueryParam(paramName: string): void {
    this.removeQueryParams([paramName]);
  }

  /** Removes multiple query parameters (case-insensitive). */
  removeQueryParams(paramNames: string[]): void {
    const merged = { ...this.activatedRoute.snapshot.queryParams };
    const targets = paramNames.map(p => p.toLowerCase());

    Object.keys(merged).forEach(k => {
      if (targets.includes(k.toLowerCase())) {
        delete merged[k];
      }
    });

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: merged,
      queryParamsHandling: ''
    });
  }

  /** Keeps only the specified query parameters and removes all others. */
  retainOnlyQueryParams(paramNames: string[]): void {
    const current = this.activatedRoute.snapshot.queryParams;
    const retained: { [key: string]: string } = {};

    paramNames.forEach(k => {
      const v = current[k];
      if (v !== undefined) {
        retained[k] = v;
      }
    });

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: retained,
      queryParamsHandling: ''
    });
  }

  /** Reads query parameters from the current route snapshot. */
  readQueryParams(): Params {
    return this.activatedRoute.snapshot.queryParams;
  }

  /** Parses query parameters from a given URL string. */
  parseQueryParamsFromUrl(url: string): { [key: string]: string } {
    const params: { [key: string]: string } = {};
    const queryString = new URL(url, window.location.origin).search;
    new URLSearchParams(queryString).forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  /** Clears all query parameters from the current URL. */
  clearQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {},
      queryParamsHandling: ''
    });
  }

  /** Checks if a query parameter exists and is non-empty. */
  hasQueryParam(paramName: string): boolean {
    const v = this.activatedRoute.snapshot.queryParams[paramName];
    if (v === null || v === undefined) return false;
    return String(v).trim() !== '';
  }

  /** QoL helper: set category selection (group + optional subgroup). */
  setCategorySelection(groupId?: string, subGroupId?: number): void {
    this.addOrUpdateQueryParams({
      grupe: groupId ?? null,
      podgrupe: subGroupId ?? null
    });
  }
}